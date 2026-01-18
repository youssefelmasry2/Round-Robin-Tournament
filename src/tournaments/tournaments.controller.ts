import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    NotFoundException,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto, AddParticipantDto } from './dto';
import { Tournament, TournamentStatusResponse, TournamentSchedule } from './tournament.entity';
import { Player } from '../players/player.entity';

@ApiTags('tournaments')
@Controller('tournaments')
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new tournament' })
    @ApiResponse({ status: 201, description: 'Tournament created successfully' })
    create(@Body() createTournamentDto: CreateTournamentDto): Tournament {
        return this.tournamentsService.create(createTournamentDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tournaments' })
    @ApiResponse({ status: 200, description: 'List of all tournaments' })
    findAll(): Tournament[] {
        return this.tournamentsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a tournament by ID' })
    @ApiParam({ name: 'id', description: 'Tournament ID' })
    @ApiResponse({ status: 200, description: 'Tournament found' })
    @ApiResponse({ status: 404, description: 'Tournament not found' })
    findOne(@Param('id') id: string): Tournament {
        const tournament = this.tournamentsService.findOne(id);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID "${id}" not found`);
        }
        return tournament;
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a tournament' })
    @ApiParam({ name: 'id', description: 'Tournament ID' })
    @ApiResponse({ status: 204, description: 'Tournament deleted successfully' })
    @ApiResponse({ status: 404, description: 'Tournament not found' })
    delete(@Param('id') id: string): void {
        this.tournamentsService.delete(id);
    }

    @Post(':id/participants')
    @ApiOperation({ summary: 'Add a participant to a tournament' })
    @ApiParam({ name: 'id', description: 'Tournament ID' })
    @ApiResponse({ status: 201, description: 'Participant added successfully' })
    @ApiResponse({ status: 400, description: 'Tournament is full or has started' })
    @ApiResponse({ status: 404, description: 'Tournament or player not found' })
    @ApiResponse({ status: 409, description: 'Player is already in the tournament' })
    addParticipant(
        @Param('id') id: string,
        @Body() addParticipantDto: AddParticipantDto,
    ): { message: string; tournament: Tournament; player: Player } {
        const result = this.tournamentsService.addParticipant(id, addParticipantDto);
        return {
            message: 'Participant added successfully',
            ...result,
        };
    }

    @Delete(':id/participants/:playerId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove a participant from a tournament' })
    @ApiParam({ name: 'id', description: 'Tournament ID' })
    @ApiParam({ name: 'playerId', description: 'Player ID' })
    @ApiResponse({ status: 204, description: 'Participant removed successfully' })
    @ApiResponse({ status: 400, description: 'Tournament has already started' })
    @ApiResponse({ status: 404, description: 'Tournament or participant not found' })
    removeParticipant(
        @Param('id') id: string,
        @Param('playerId') playerId: string,
    ): void {
        this.tournamentsService.removeParticipant(id, playerId);
    }

    @Get(':id/participants')
    @ApiOperation({ summary: 'Get all participants of a tournament' })
    @ApiParam({ name: 'id', description: 'Tournament ID' })
    @ApiResponse({ status: 200, description: 'List of tournament participants' })
    @ApiResponse({ status: 404, description: 'Tournament not found' })
    getParticipants(@Param('id') id: string): Player[] {
        return this.tournamentsService.getParticipants(id);
    }

    @Get(':id/status')
    @ApiOperation({
        summary: 'Get tournament status and leaderboard',
        description:
            'Returns the tournament status (planning, started, finished) and the current leaderboard sorted by points',
    })
    @ApiParam({ name: 'id', description: 'Tournament ID' })
    @ApiResponse({
        status: 200,
        description: 'Tournament status and leaderboard',
    })
    @ApiResponse({ status: 404, description: 'Tournament not found' })
    getStatus(@Param('id') id: string): TournamentStatusResponse {
        return this.tournamentsService.getStatus(id);
    }

    @Post(':id/start')
    @ApiOperation({
        summary: 'Generate round-robin tournament schedule',
        description:
            'Creates all game records for the tournament. Each participant will play every other participant exactly once. ' +
            'This can only be called once per tournament and requires at least 2 participants. ' +
            'After generating the schedule, use PUT /games/:id/result to record game results.',
    })
    @ApiParam({ name: 'id', description: 'Tournament ID' })
    @ApiResponse({
        status: 201,
        description: 'Schedule generated successfully with all game records created',
    })
    @ApiResponse({ status: 400, description: 'Not enough participants' })
    @ApiResponse({ status: 404, description: 'Tournament not found' })
    @ApiResponse({ status: 409, description: 'Schedule already generated' })
    generateSchedule(@Param('id') id: string): TournamentSchedule {
        return this.tournamentsService.generateSchedule(id);
    }

    @Get(':id/schedule')
    @ApiOperation({
        summary: 'Get round-robin tournament schedule',
        description:
            'Returns all matchups for the tournament showing which games have been played and which are pending. ' +
            'Each game includes a game_id that can be used to record results via PUT /games/:id/result.',
    })
    @ApiParam({ name: 'id', description: 'Tournament ID' })
    @ApiResponse({
        status: 200,
        description: 'Tournament schedule with all matchups',
    })
    @ApiResponse({ status: 404, description: 'Tournament not found' })
    getSchedule(@Param('id') id: string): TournamentSchedule {
        return this.tournamentsService.getSchedule(id);
    }
}
