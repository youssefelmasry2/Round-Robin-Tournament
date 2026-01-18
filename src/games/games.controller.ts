import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    NotFoundException,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { GamesService } from './games.service';
import { RecordGameResultDto } from './dto';
import { GameWithPlayers } from './game.entity';

@ApiTags('games')
@Controller('games')
export class GamesController {
    constructor(private readonly gamesService: GamesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all games or filter by tournament' })
    @ApiQuery({
        name: 'tournament_id',
        required: false,
        description: 'Filter games by tournament ID',
    })
    @ApiResponse({ status: 200, description: 'List of games' })
    findAll(@Query('tournament_id') tournamentId?: string): GameWithPlayers[] {
        if (tournamentId) {
            return this.gamesService.findByTournament(tournamentId);
        }
        return this.gamesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a game by ID' })
    @ApiParam({ name: 'id', description: 'Game ID' })
    @ApiResponse({ status: 200, description: 'Game found' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    findOne(@Param('id') id: string): GameWithPlayers {
        const game = this.gamesService.findOne(id);
        if (!game) {
            throw new NotFoundException(`Game with ID "${id}" not found`);
        }
        return game;
    }

    @Put(':id/result')
    @ApiOperation({
        summary: 'Record the result of a game',
        description: 'Set the scores for a pending game. Games are created when generating the tournament schedule.'
    })
    @ApiParam({ name: 'id', description: 'Game ID' })
    @ApiResponse({ status: 200, description: 'Game result recorded successfully' })
    @ApiResponse({ status: 400, description: 'Game has already been played' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    recordResult(
        @Param('id') id: string,
        @Body() recordResultDto: RecordGameResultDto,
    ): GameWithPlayers {
        return this.gamesService.recordResult(id, recordResultDto);
    }

    @Put(':id/reset')
    @ApiOperation({
        summary: 'Reset a game result',
        description: 'Reset a completed game back to pending status, clearing its scores.'
    })
    @ApiParam({ name: 'id', description: 'Game ID' })
    @ApiResponse({ status: 200, description: 'Game reset successfully' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    resetGame(@Param('id') id: string): GameWithPlayers {
        return this.gamesService.resetGame(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a game' })
    @ApiParam({ name: 'id', description: 'Game ID' })
    @ApiResponse({ status: 204, description: 'Game deleted successfully' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    delete(@Param('id') id: string): void {
        this.gamesService.delete(id);
    }
}
