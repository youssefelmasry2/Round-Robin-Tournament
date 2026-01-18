import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum GameResult {
    PLAYER1_WIN = 'player1',
    PLAYER2_WIN = 'player2',
    DRAW = 'draw',
}

export class RecordGameResultDto {
    @ApiProperty({
        description: 'The result of the game. Use "player1" if player 1 won, "player2" if player 2 won, or "draw" for a tie.',
        example: 'player1',
        enum: GameResult,
    })
    @IsEnum(GameResult)
    result: GameResult;
}
