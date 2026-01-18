import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { DbService } from '../database/db.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { Game, GameWithPlayers } from './game.entity';
import { RecordGameResultDto, GameResult } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GamesService {
    constructor(
        private readonly db: DbService,
        private readonly tournamentsService: TournamentsService,
    ) { }

    /**
     * Record the result of an existing game by its ID
     */
    recordResult(gameId: string, recordResultDto: RecordGameResultDto): GameWithPlayers {
        const game = this.findOne(gameId);
        if (!game) {
            throw new NotFoundException(`Game with ID "${gameId}" not found`);
        }

        if (game.status === 'completed') {
            throw new BadRequestException('This game has already been played. Use PUT /games/:id/reset first to record a new result.');
        }

        // Convert result to scores
        let player1_score: number;
        let player2_score: number;

        switch (recordResultDto.result) {
            case GameResult.PLAYER1_WIN:
                player1_score = 2;
                player2_score = 0;
                break;
            case GameResult.PLAYER2_WIN:
                player1_score = 0;
                player2_score = 2;
                break;
            case GameResult.DRAW:
                player1_score = 1;
                player2_score = 1;
                break;
        }

        this.db.run(
            `UPDATE games 
             SET player1_score = ?, player2_score = ?, status = 'completed', played_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [player1_score, player2_score, gameId],
        );

        return this.findOne(gameId)!;
    }

    findAll(): GameWithPlayers[] {
        const games = this.db.query<GameWithPlayers>(
            `SELECT g.*, p1.name as player1_name, p2.name as player2_name
             FROM games g
             INNER JOIN players p1 ON g.player1_id = p1.id
             INNER JOIN players p2 ON g.player2_id = p2.id
             ORDER BY g.created_at ASC`,
        );
        return games.map(this.addWinnerToGame);
    }

    findByTournament(tournamentId: string): GameWithPlayers[] {
        const tournament = this.tournamentsService.findOne(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID "${tournamentId}" not found`);
        }

        const games = this.db.query<GameWithPlayers>(
            `SELECT g.*, p1.name as player1_name, p2.name as player2_name
             FROM games g
             INNER JOIN players p1 ON g.player1_id = p1.id
             INNER JOIN players p2 ON g.player2_id = p2.id
             WHERE g.tournament_id = ?
             ORDER BY g.created_at ASC`,
            [tournamentId],
        );
        return games.map(this.addWinnerToGame);
    }

    findOne(id: string): GameWithPlayers | undefined {
        const game = this.db.queryOne<GameWithPlayers>(
            `SELECT g.*, p1.name as player1_name, p2.name as player2_name
             FROM games g
             INNER JOIN players p1 ON g.player1_id = p1.id
             INNER JOIN players p2 ON g.player2_id = p2.id
             WHERE g.id = ?`,
            [id],
        );
        return game ? this.addWinnerToGame(game) : undefined;
    }

    delete(id: string): void {
        const game = this.findOne(id);
        if (!game) {
            throw new NotFoundException(`Game with ID "${id}" not found`);
        }
        this.db.run('DELETE FROM games WHERE id = ?', [id]);
    }

    /**
     * Reset a game result back to pending status
     */
    resetGame(id: string): GameWithPlayers {
        const game = this.findOne(id);
        if (!game) {
            throw new NotFoundException(`Game with ID "${id}" not found`);
        }

        this.db.run(
            `UPDATE games 
             SET player1_score = NULL, player2_score = NULL, status = 'pending', played_at = NULL
             WHERE id = ?`,
            [id],
        );

        return this.findOne(id)!;
    }

    private addWinnerToGame(game: GameWithPlayers): GameWithPlayers {
        if (game.status === 'completed' && game.player1_score !== null && game.player2_score !== null) {
            if (game.player1_score > game.player2_score) {
                game.winner = game.player1_name;
            } else if (game.player2_score > game.player1_score) {
                game.winner = game.player2_name;
            } else {
                game.winner = null; // Draw
            }
        }
        return game;
    }
}
