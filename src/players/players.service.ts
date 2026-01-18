import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DbService } from '../database/db.service';
import { Player } from './player.entity';
import { CreatePlayerDto } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PlayersService {
    constructor(private readonly db: DbService) { }

    create(createPlayerDto: CreatePlayerDto): Player {
        const id = uuidv4();

        try {
            this.db.run(
                'INSERT INTO players (id, name) VALUES (?, ?)',
                [id, createPlayerDto.name]
            );
        } catch (error: any) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new ConflictException(`Player with name "${createPlayerDto.name}" already exists`);
            }
            throw error;
        }

        return this.findOne(id)!;
    }

    findAll(): Player[] {
        return this.db.query<Player>('SELECT * FROM players ORDER BY created_at DESC');
    }

    findOne(id: string): Player | undefined {
        return this.db.queryOne<Player>('SELECT * FROM players WHERE id = ?', [id]);
    }

    findByName(name: string): Player | undefined {
        return this.db.queryOne<Player>('SELECT * FROM players WHERE name = ?', [name]);
    }

    delete(id: string): void {
        const player = this.findOne(id);
        if (!player) {
            throw new NotFoundException(`Player with ID "${id}" not found`);
        }
        this.db.run('DELETE FROM players WHERE id = ?', [id]);
    }
}
