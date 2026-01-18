export enum TournamentStatus {
    PLANNING = 'planning',
    STARTED = 'started',
    FINISHED = 'finished',
}

export interface Tournament {
    id: string;
    name: string;
    max_participants: number;
    created_at: string;
}

export interface TournamentParticipant {
    tournament_id: string;
    player_id: string;
    joined_at: string;
}

export interface LeaderboardEntry {
    player_id: string;
    player_name: string;
    points: number;
    wins: number;
    draws: number;
    losses: number;
    games_played: number;
}

export interface TournamentStatusResponse {
    tournament: Tournament;
    status: TournamentStatus;
    participants_count: number;
    total_games: number;
    played_games: number;
    remaining_games: number;
    leaderboard: LeaderboardEntry[];
}

export interface ScheduledMatch {
    game_id: string;
    match_number: number;
    player1_id: string;
    player1_name: string;
    player2_id: string;
    player2_name: string;
    status: 'pending' | 'completed';
    result?: {
        player1_score: number;
        player2_score: number;
        winner: string | null; // null for draw
    };
}

export interface TournamentSchedule {
    tournament: Tournament;
    total_matches: number;
    completed_matches: number;
    pending_matches: number;
    schedule: ScheduledMatch[];
}

