import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { PlayersModule } from './players/players.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { GamesModule } from './games/games.module';

@Module({
  imports: [
    DatabaseModule,
    PlayersModule,
    TournamentsModule,
    GamesModule,
  ],
})
export class AppModule { }
