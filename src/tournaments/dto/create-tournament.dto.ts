import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTournamentDto {
    @ApiProperty({
        description: 'The name of the tournament',
        example: 'Summer Championship 2024',
        minLength: 2,
        maxLength: 200,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(200)
    name: string;

    @ApiPropertyOptional({
        description: 'Maximum number of participants (default: 5, max: 5)',
        example: 5,
        minimum: 2,
        maximum: 5,
        default: 5,
    })
    @IsOptional()
    @IsInt()
    @Min(2)
    @Max(5)
    max_participants?: number = 5;
}
