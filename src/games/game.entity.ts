export type GameStatus = 'pending' | 'completed';

export interface Game {
    id: string;
    tournament_id: string;
    player1_id: string;
    player2_id: string;
    player1_score: number | null;
    player2_score: number | null;
    status: GameStatus;
    created_at: string;
    played_at: string | null;
}

export interface GameWithPlayers extends Game {
    player1_name: string;
    player2_name: string;
    winner?: string | null; // player name or null for draw, undefined if pending
}
