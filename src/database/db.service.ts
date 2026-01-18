import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as Database from 'better-sqlite3';
import { join } from 'path';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
    private db: Database.Database;

    onModuleInit() {
        const dbPath = join(process.cwd(), 'tournament.db');
        this.db = new (Database as any)(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initializeTables();
    }

    onModuleDestroy() {
        if (this.db) {
            this.db.close();
        }
    }

    private initializeTables() {
        // Players table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Tournaments table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        max_participants INTEGER DEFAULT 5,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Tournament participants (many-to-many relationship)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        tournament_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tournament_id, player_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

        // Games table (match results)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        player1_id TEXT NOT NULL,
        player2_id TEXT NOT NULL,
        player1_score INTEGER,
        player2_score INTEGER,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        played_at TEXT,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (player1_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (player2_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE(tournament_id, player1_id, player2_id)
      )
    `);
    }

    query<T = any>(sql: string, params: any[] = []): T[] {
        const stmt = this.db.prepare(sql);
        return stmt.all(...params) as T[];
    }

    queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
        const stmt = this.db.prepare(sql);
        return stmt.get(...params) as T | undefined;
    }

    run(sql: string, params: any[] = []): Database.RunResult {
        const stmt = this.db.prepare(sql);
        return stmt.run(...params);
    }

    transaction<T>(fn: () => T): T {
        return this.db.transaction(fn)();
    }
}
