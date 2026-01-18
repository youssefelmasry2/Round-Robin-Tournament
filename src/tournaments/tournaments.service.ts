import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { DbService } from '../database/db.service';
import { PlayersService } from '../players/players.service';
import {
    Tournament,
    TournamentParticipant,
    TournamentStatus,
    TournamentStatusResponse,
    LeaderboardEntry,
    TournamentSchedule,
    ScheduledMatch,
} from './tournament.entity';
import { CreateTournamentDto, AddParticipantDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import { Player } from '../players/player.entity';

@Injectable()
export class TournamentsService {
    constructor(
        private readonly db: DbService,
        private readonly playersService: PlayersService,
    ) { }

    create(createTournamentDto: CreateTournamentDto): Tournament {
        const id = uuidv4();
        const maxParticipants = createTournamentDto.max_participants ?? 5;

        this.db.run(
            'INSERT INTO tournaments (id, name, max_participants) VALUES (?, ?, ?)',
            [id, createTournamentDto.name, maxParticipants],
        );

        return this.findOne(id)!;
    }

    findAll(): Tournament[] {
        return this.db.query<Tournament>(
            'SELECT * FROM tournaments ORDER BY created_at DESC',
        );
    }

    findOne(id: string): Tournament | undefined {
        return this.db.queryOne<Tournament>(
            'SELECT * FROM tournaments WHERE id = ?',
            [id],
        );
    }

    delete(id: string): void {
        const tournament = this.findOne(id);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID "${id}" not found`);
        }
        this.db.run('DELETE FROM tournaments WHERE id = ?', [id]);
    }

    addParticipant(
        tournamentId: string,
        addParticipantDto: AddParticipantDto,
    ): { tournament: Tournament; player: Player } {
        const tournament = this.findOne(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID "${tournamentId}" not found`);
        }

        const player = this.playersService.findOne(addParticipantDto.player_id);
        if (!player) {
            throw new NotFoundException(
                `Player with ID "${addParticipantDto.player_id}" not found`,
            );
        }

        // Check if tournament has started (has any games played)
        const gamesPlayed = this.db.queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM games WHERE tournament_id = ?',
            [tournamentId],
        );
        if (gamesPlayed && gamesPlayed.count > 0) {
            throw new BadRequestException(
                'Cannot add participants to a tournament that has already started',
            );
        }

        // Check participant limit
        const participantCount = this.db.queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?',
            [tournamentId],
        );
        if (participantCount && participantCount.count >= tournament.max_participants) {
            throw new BadRequestException(
                `Tournament has reached its maximum capacity of ${tournament.max_participants} participants`,
            );
        }

        // Check if player is already in the tournament
        const existing = this.db.queryOne<TournamentParticipant>(
            'SELECT * FROM tournament_participants WHERE tournament_id = ? AND player_id = ?',
            [tournamentId, addParticipantDto.player_id],
        );
        if (existing) {
            throw new ConflictException('Player is already registered in this tournament');
        }

        this.db.run(
            'INSERT INTO tournament_participants (tournament_id, player_id) VALUES (?, ?)',
            [tournamentId, addParticipantDto.player_id],
        );

        return { tournament, player };
    }

    removeParticipant(tournamentId: string, playerId: string): void {
        const tournament = this.findOne(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID "${tournamentId}" not found`);
        }

        // Check if tournament has started
        const gamesPlayed = this.db.queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM games WHERE tournament_id = ?',
            [tournamentId],
        );
        if (gamesPlayed && gamesPlayed.count > 0) {
            throw new BadRequestException(
                'Cannot remove participants from a tournament that has already started',
            );
        }

        const result = this.db.run(
            'DELETE FROM tournament_participants WHERE tournament_id = ? AND player_id = ?',
            [tournamentId, playerId],
        );

        if (result.changes === 0) {
            throw new NotFoundException('Player is not registered in this tournament');
        }
    }

    getParticipants(tournamentId: string): Player[] {
        const tournament = this.findOne(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID "${tournamentId}" not found`);
        }

        return this.db.query<Player>(
            `SELECT p.* FROM players p
       INNER JOIN tournament_participants tp ON p.id = tp.player_id
       WHERE tp.tournament_id = ?
       ORDER BY tp.joined_at ASC`,
            [tournamentId],
        );
    }

    getStatus(tournamentId: string): TournamentStatusResponse {
        const tournament = this.findOne(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID "${tournamentId}" not found`);
        }

        const participants = this.getParticipants(tournamentId);
        const participantsCount = participants.length;

        // Calculate total games needed for round-robin: n * (n-1) / 2
        const totalGames =
            participantsCount > 1 ? (participantsCount * (participantsCount - 1)) / 2 : 0;

        // Get completed games count (games that have results recorded)
        const completedGamesResult = this.db.queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM games WHERE tournament_id = ? AND status = 'completed'`,
            [tournamentId],
        );
        const completedGames = completedGamesResult?.count ?? 0;

        // Check if schedule has been generated
        const totalGamesInDb = this.db.queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM games WHERE tournament_id = ?',
            [tournamentId],
        );
        const scheduleGenerated = (totalGamesInDb?.count ?? 0) > 0;

        // Determine status
        let status: TournamentStatus;
        if (!scheduleGenerated) {
            status = TournamentStatus.PLANNING;
        } else if (completedGames >= totalGames && totalGames > 0) {
            status = TournamentStatus.FINISHED;
        } else {
            status = TournamentStatus.STARTED;
        }

        // Calculate leaderboard
        const leaderboard = this.calculateLeaderboard(tournamentId, participants);

        return {
            tournament,
            status,
            participants_count: participantsCount,
            total_games: totalGames,
            played_games: completedGames,
            remaining_games: totalGames - completedGames,
            leaderboard,
        };
    }

    private calculateLeaderboard(
        tournamentId: string,
        participants: Player[],
    ): LeaderboardEntry[] {
        const leaderboard: LeaderboardEntry[] = participants.map((player) => ({
            player_id: player.id,
            player_name: player.name,
            points: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            games_played: 0,
        }));

        // Get only completed games for this tournament
        const games = this.db.query<{
            player1_id: string;
            player2_id: string;
            player1_score: number;
            player2_score: number;
        }>(
            `SELECT player1_id, player2_id, player1_score, player2_score 
             FROM games 
             WHERE tournament_id = ? AND status = 'completed'`,
            [tournamentId],
        );

        // Calculate stats for each player
        for (const game of games) {
            const player1Entry = leaderboard.find(
                (e) => e.player_id === game.player1_id,
            );
            const player2Entry = leaderboard.find(
                (e) => e.player_id === game.player2_id,
            );

            if (player1Entry) {
                player1Entry.games_played++;
                if (game.player1_score > game.player2_score) {
                    player1Entry.wins++;
                    player1Entry.points += 2;
                } else if (game.player1_score === game.player2_score) {
                    player1Entry.draws++;
                    player1Entry.points += 1;
                } else {
                    player1Entry.losses++;
                }
            }

            if (player2Entry) {
                player2Entry.games_played++;
                if (game.player2_score > game.player1_score) {
                    player2Entry.wins++;
                    player2Entry.points += 2;
                } else if (game.player1_score === game.player2_score) {
                    player2Entry.draws++;
                    player2Entry.points += 1;
                } else {
                    player2Entry.losses++;
                }
            }
        }

        // Sort by points (descending), then by wins (descending)
        leaderboard.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            return b.wins - a.wins;
        });

        return leaderboard;
    }

    /**
     * Generate the round-robin schedule by creating all game records in the database.
     * This should be called once when the tournament is ready to start.
     */
    generateSchedule(tournamentId: string): TournamentSchedule {
        const tournament = this.findOne(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID "${tournamentId}" not found`);
        }

        const participants = this.getParticipants(tournamentId);

        if (participants.length < 2) {
            throw new BadRequestException('Tournament needs at least 2 participants to generate a schedule');
        }

        // Check if games already exist for this tournament
        const existingGames = this.db.queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM games WHERE tournament_id = ?',
            [tournamentId],
        );

        if (existingGames && existingGames.count > 0) {
            throw new ConflictException('Schedule has already been generated for this tournament. Use GET /tournaments/:id/schedule to view it.');
        }

        // Generate all possible matchups (round-robin) and create game records
        for (let i = 0; i < participants.length; i++) {
            for (let j = i + 1; j < participants.length; j++) {
                const player1 = participants[i];
                const player2 = participants[j];
                const gameId = uuidv4();

                this.db.run(
                    `INSERT INTO games (id, tournament_id, player1_id, player2_id, status)
                     VALUES (?, ?, ?, ?, 'pending')`,
                    [gameId, tournamentId, player1.id, player2.id],
                );
            }
        }

        // Return the generated schedule
        return this.getSchedule(tournamentId);
    }

    /**
     * Get the current schedule for a tournament, showing all games and their status.
     */
    getSchedule(tournamentId: string): TournamentSchedule {
        const tournament = this.findOne(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID "${tournamentId}" not found`);
        }

        // Get all games for this tournament
        const games = this.db.query<{
            id: string;
            player1_id: string;
            player2_id: string;
            player1_score: number | null;
            player2_score: number | null;
            status: string;
        }>(
            `SELECT g.id, g.player1_id, g.player2_id, g.player1_score, g.player2_score, g.status
             FROM games g
             WHERE g.tournament_id = ?
             ORDER BY g.created_at ASC`,
            [tournamentId],
        );

        // Get player names
        const participants = this.getParticipants(tournamentId);
        const playerMap = new Map(participants.map(p => [p.id, p.name]));

        // Build the schedule
        const schedule: ScheduledMatch[] = games.map((game, index) => {
            const player1Name = playerMap.get(game.player1_id) || 'Unknown';
            const player2Name = playerMap.get(game.player2_id) || 'Unknown';

            const match: ScheduledMatch = {
                game_id: game.id,
                match_number: index + 1,
                player1_id: game.player1_id,
                player1_name: player1Name,
                player2_id: game.player2_id,
                player2_name: player2Name,
                status: game.status as 'pending' | 'completed',
            };

            if (game.status === 'completed' && game.player1_score !== null && game.player2_score !== null) {
                let winner: string | null = null;
                if (game.player1_score > game.player2_score) {
                    winner = player1Name;
                } else if (game.player2_score > game.player1_score) {
                    winner = player2Name;
                }
                match.result = {
                    player1_score: game.player1_score,
                    player2_score: game.player2_score,
                    winner,
                };
            }

            return match;
        });

        const completedMatches = schedule.filter(m => m.status === 'completed').length;

        return {
            tournament,
            total_matches: schedule.length,
            completed_matches: completedMatches,
            pending_matches: schedule.length - completedMatches,
            schedule,
        };
    }
}
