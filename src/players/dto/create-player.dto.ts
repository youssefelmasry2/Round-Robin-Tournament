import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlayerDto {
    @ApiProperty({
        description: 'The name of the player',
        example: 'John Doe',
        minLength: 2,
        maxLength: 100,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(100)
    name: string;
}
