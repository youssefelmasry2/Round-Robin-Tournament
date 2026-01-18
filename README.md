# Round-Robin Tournament Service

A RESTful API service for managing round-robin sports tournaments built with NestJS and SQLite.

## Overview

In a round-robin tournament, each participant must play against every other participant exactly once. This service allows you to:

- Create and manage players
- Create tournaments with up to 5 participants
- Add/remove players from tournaments
- Record game results
- View tournament status and leaderboard

## Scoring System

- **Win**: 2 points
- **Draw**: 1 point
- **Loss**: 0 points

## Tournament Status

- **Planning**: No games have been played yet
- **Started**: At least one game has been played, but the tournament is not complete
- **Finished**: All possible games have been played (everyone has played against everyone)

## Prerequisites

- Node.js (v14.x or later)
- npm (v6.x or later)

## Installation

```bash
npm install
```

## Running the Application

### Development mode (with hot reload)

```bash
npm run start:dev
```

### Production mode

```bash
npm run build
npm run start:prod
```

The application will be accessible at http://localhost:3000

## API Documentation

Once the application is running, you can access the Swagger API documentation at:

http://localhost:3000/api

## Database

The application uses SQLite for data persistence. The database file (tournament.db) is automatically created in the project root when the application starts.

## API Endpoints

### Players

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /players | Create a new player |
| GET | /players | Get all players |
| GET | /players/:id | Get a player by ID |
| DELETE | /players/:id | Delete a player |

### Tournaments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /tournaments | Create a new tournament |
| GET | /tournaments | Get all tournaments |
| GET | /tournaments/:id | Get a tournament by ID |
| DELETE | /tournaments/:id | Delete a tournament |
| POST | /tournaments/:id/participants | Add a participant to a tournament |
| DELETE | /tournaments/:id/participants/:playerId | Remove a participant |
| GET | /tournaments/:id/participants | Get all participants of a tournament |
| GET | /tournaments/:id/status | Get tournament status and leaderboard |
| POST | /tournaments/:id/start | **Generate round-robin schedule (creates all games)** |
| GET | /tournaments/:id/schedule | Get round-robin schedule with all matchups |

### Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /games | Get all games (optional: filter by tournament_id) |
| GET | /games/:id | Get a game by ID |
| PUT | /games/:id/result | **Record the result of a game** |
| PUT | /games/:id/reset | Reset a game back to pending status |
| DELETE | /games/:id | Delete a game |

## Usage Examples

### 1. Create Players

```bash
curl -X POST http://localhost:3000/players -H "Content-Type: application/json" -d '{"name": "Alice"}'
curl -X POST http://localhost:3000/players -H "Content-Type: application/json" -d '{"name": "Bob"}'
curl -X POST http://localhost:3000/players -H "Content-Type: application/json" -d '{"name": "Charlie"}'
```

### 2. Create a Tournament

```bash
curl -X POST http://localhost:3000/tournaments -H "Content-Type: application/json" -d '{"name": "Summer Championship 2024", "max_participants": 5}'
```

### 3. Add Participants to Tournament

```bash
curl -X POST http://localhost:3000/tournaments/{tournament_id}/participants -H "Content-Type: application/json" -d '{"player_id": "{player_id}"}'
```

### 4. Generate Tournament Schedule (Creates All Games)

```bash
curl -X POST http://localhost:3000/tournaments/{tournament_id}/start
```

This creates all the round-robin game matchups. After this, you can record results for each game.

### 5. Record Game Results

Use `result` to specify the outcome: `"player1"` (player 1 wins), `"player2"` (player 2 wins), or `"draw"`.

```bash
# Player 1 wins
curl -X PUT http://localhost:3000/games/{game_id}/result -H "Content-Type: application/json" -d '{"result": "player1"}'

# Player 2 wins
curl -X PUT http://localhost:3000/games/{game_id}/result -H "Content-Type: application/json" -d '{"result": "player2"}'

# Draw
curl -X PUT http://localhost:3000/games/{game_id}/result -H "Content-Type: application/json" -d '{"result": "draw"}'
```

### 6. Get Tournament Status and Leaderboard

```bash
curl http://localhost:3000/tournaments/{tournament_id}/status
```

Example Response:

```json
{
  "tournament": {
    "id": "abc123",
    "name": "Summer Championship 2024",
    "max_participants": 5,
    "created_at": "2024-01-15T10:00:00.000Z"
  },
  "status": "started",
  "participants_count": 3,
  "total_games": 3,
  "played_games": 1,
  "remaining_games": 2,
  "leaderboard": [
    {
      "player_id": "player1",
      "player_name": "Alice",
      "points": 2,
      "wins": 1,
      "draws": 0,
      "losses": 0,
      "games_played": 1
    }
  ]
}
```

### 7. Get Round-Robin Schedule

```bash
curl http://localhost:3000/tournaments/{tournament_id}/schedule
```

**Example Response:**

```json
{
  "tournament": {
    "id": "abc123",
    "name": "Summer Championship 2024"
  },
  "total_matches": 3,
  "completed_matches": 1,
  "pending_matches": 2,
  "schedule": [
    {
      "game_id": "game-uuid-1",
      "match_number": 1,
      "player1_id": "p1",
      "player1_name": "Alice",
      "player2_id": "p2",
      "player2_name": "Bob",
      "status": "completed",
      "result": {
        "player1_score": 3,
        "player2_score": 1,
        "winner": "Alice"
      }
    },
    {
      "game_id": "game-uuid-2",
      "match_number": 2,
      "player1_id": "p1",
      "player1_name": "Alice",
      "player2_id": "p3",
      "player2_name": "Charlie",
      "status": "pending"
    },
    {
      "game_id": "game-uuid-3",
      "match_number": 3,
      "player1_id": "p2",
      "player1_name": "Bob",
      "player2_id": "p3",
      "player2_name": "Charlie",
      "status": "pending"
    }
  ]
}
```

## Business Rules

1. Maximum 5 participants per tournament
2. Players must be registered in a tournament before they can play games
3. Each pair of players can only play once per tournament
4. Cannot add/remove participants after a tournament has started (games played)
5. A player cannot play against themselves
6. Player names must be unique



## Project Structure

```
src/
  database/
    database.module.ts
    db.service.ts
  players/
    dto/
    player.entity.ts
    players.controller.ts
    players.module.ts
    players.service.ts
  tournaments/
    dto/
    tournament.entity.ts
    tournaments.controller.ts
    tournaments.module.ts
    tournaments.service.ts
  games/
    dto/
    game.entity.ts
    games.controller.ts
    games.module.ts
    games.service.ts
  app.module.ts
  main.ts
```


## License

UNLICENSED
