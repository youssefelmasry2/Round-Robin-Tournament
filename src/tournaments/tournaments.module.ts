import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { PlayersModule } from '../players/players.module';

@Module({
    imports: [PlayersModule],
    controllers: [TournamentsController],
    providers: [TournamentsService],
    exports: [TournamentsService],
})
export class TournamentsModule { }
