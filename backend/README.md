# AI Poker Agent Backend

A sophisticated poker game backend featuring an AI opponent powered by advanced algorithms and real-time gameplay mechanics.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts         # Database configuration and connection setup
│   ├── middleware/
│   │   ├── auth.ts            # Authentication middleware
│   │   └── validation.ts      # Request validation middleware
│   ├── models/
│   │   ├── Game.ts           # Game model schema
│   │   └── User.ts           # User model schema
│   ├── routes/
│   │   ├── ai.ts             # AI-related endpoints
│   │   ├── auth.ts           # Authentication endpoints
│   │   └── game.ts           # Game management endpoints
│   ├── services/
│   │   ├── cfrAgent.ts       # Counterfactual Regret Minimization agent
│   │   ├── GameEngine.ts     # Core game logic
│   │   ├── opponentModel.ts  # Opponent modeling system
│   │   └── pokerAI.ts        # Main AI decision making
│   ├── sockets/
│   │   └── gameSockets.ts    # Real-time game communication
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── utils/
│   │   ├── cards.ts          # Card utilities
│   │   └── handEvaluator.ts  # Poker hand evaluation
│   └── server.ts             # Main application entry point
```

## API Documentation

### Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/register`
- Creates a new user account
- Body: `{ username, email, password }`

#### `POST /api/auth/login`
- Authenticates a user
- Body: `{ email, password }`
- Returns: Auth token and user data

#### `POST /api/auth/logout`
- Logs out the current user
- Requires: Authentication

#### `GET /api/auth/profile`
- Retrieves current user's profile
- Requires: Authentication

#### `GET /api/auth/stats`
- Gets user's gaming statistics
- Requires: Authentication

### Game Endpoints (`/api/game`)

#### `POST /api/game/create`
- Creates a new game session
- Body: `{ gameType, aiDifficulty?, buyIn? }`
- Requires: Authentication

#### `POST /api/game/join`
- Joins an existing game
- Body: `{ gameId }`
- Requires: Authentication

#### `GET /api/game/:gameId`
- Gets current game state
- Requires: Authentication

#### `POST /api/game/action`
- Makes a game move (fold, call, raise, check)
- Body: `{ gameId, action, amount? }`
- Requires: Authentication

#### `GET /api/game/user/active`
- Lists user's active games
- Requires: Authentication

#### `GET /api/game/user/history`
- Retrieves user's game history
- Query params: `page, limit`
- Requires: Authentication

### AI Endpoints (`/api/ai`)

#### `POST /api/ai/train`
- Initiates AI training
- Body: `{ difficulty, iterations?, gameScenarios? }`
- Requires: Authentication

#### `POST /api/ai/decision`
- Gets AI's next move
- Body: `{ gameId, difficulty? }`
- Requires: Authentication

#### `GET /api/ai/stats/:difficulty`
- Retrieves AI performance statistics
- Requires: Authentication

#### `GET /api/ai/opponent-profile/:gameId`
- Gets AI's model of the opponent
- Requires: Authentication

#### `GET /api/ai/analytics/:gameId`
- Retrieves advanced AI game analytics
- Requires: Authentication

#### `PUT /api/ai/difficulty`
- Updates AI difficulty level
- Body: `{ gameId, difficulty }`
- Requires: Authentication

## WebSocket Events

### Client Events
- `createGame`: Creates a new game session
- `makeMove`: Executes a player's move
- `joinGame`: Joins an existing game

### Server Events
- `gameState`: Updates game state
- `playerAction`: Notifies of player actions
- `gameError`: Communicates game errors
- `gameResult`: Sends game outcome

## Environment Variables

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:3000
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in:
- Request headers: `Authorization: Bearer <token>`
- Cookie: `authToken=<token>`

## Error Handling

All endpoints return standardized error responses:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Limits vary by endpoint type:
- Authentication: 5 requests per minute
- Game actions: 60 requests per minute
- AI operations: 30 requests per minute

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configurations
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## License

MIT License - Copyright (c) 2025 ridhamxdev