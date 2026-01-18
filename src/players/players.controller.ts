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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto';
import { Player } from './player.entity';

@ApiTags('players')
@Controller('players')
export class PlayersController {
    constructor(private readonly playersService: PlayersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new player' })
    @ApiResponse({ status: 201, description: 'Player created successfully' })
    @ApiResponse({ status: 409, description: 'Player with this name already exists' })
    create(@Body() createPlayerDto: CreatePlayerDto): Player {
        return this.playersService.create(createPlayerDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all players' })
    @ApiResponse({ status: 200, description: 'List of all players' })
    findAll(): Player[] {
        return this.playersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a player by ID' })
    @ApiParam({ name: 'id', description: 'Player ID' })
    @ApiResponse({ status: 200, description: 'Player found' })
    @ApiResponse({ status: 404, description: 'Player not found' })
    findOne(@Param('id') id: string): Player {
        const player = this.playersService.findOne(id);
        if (!player) {
            throw new NotFoundException(`Player with ID "${id}" not found`);
        }
        return player;
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a player' })
    @ApiParam({ name: 'id', description: 'Player ID' })
    @ApiResponse({ status: 204, description: 'Player deleted successfully' })
    @ApiResponse({ status: 404, description: 'Player not found' })
    delete(@Param('id') id: string): void {
        this.playersService.delete(id);
    }
}
