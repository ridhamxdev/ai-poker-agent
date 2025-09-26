# AI Poker Agent Backend

A sophisticated poker game backend featuring an AI opponent powered by advanced algorithms, game theory optimization, and real-time gameplay mechanics.

## Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Game Theory Implementation](#game-theory-implementation)
4. [API Documentation](#api-documentation)
5. [WebSocket Integration](#websocket-integration)
6. [Setup and Configuration](#setup-and-configuration)
7. [Authentication](#authentication)
8. [Error Handling](#error-handling)

## Overview

The AI Poker Agent Backend is a state-of-the-art implementation of poker artificial intelligence using:
- Counterfactual Regret Minimization (CFR) for strategy optimization
- Advanced opponent modeling and adaptation
- Real-time decision making and gameplay
- Sophisticated hand evaluation algorithms
- WebSocket-based multiplayer support

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

Key Components:
- **AI Services**: Advanced poker AI implementation using CFR and opponent modeling
- **Game Engine**: Core game logic and state management
- **API Routes**: RESTful endpoints for game interactions
- **WebSocket Handler**: Real-time game communications
- **Utilities**: Card management and hand evaluation tools

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

## WebSocket Integration

### Event System Overview
The real-time game communication is handled through WebSocket connections using Socket.IO.

### Client Events
| Event | Description | Payload |
|-------|-------------|---------|
| `createGame` | Creates new game session | `{ gameType: 'pvp'｜'ai-training'｜'ai-vs-human', aiDifficulty?: Difficulty }` |
| `makeMove` | Executes player's move | `{ gameId: string, action: ActionType, amount?: number }` |
| `joinGame` | Joins existing game | `{ gameId: string }` |
| `trainAI` | Initiates AI training | `{ gameId: string, iterations?: number }` |

### Server Events
| Event | Description | Payload Type |
|-------|-------------|--------------|
| `gameState` | Game state updates | `GameState` |
| `playerAction` | Player action notifications | `GameAction` |
| `gameError` | Error communications | `ErrorResponse` |
| `gameResult` | Game outcome | `GameResult` |
| `aiStatus` | AI training status | `AIStatus` |

### Example Usage
```typescript
// Client-side connection
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});

// Event handling
socket.on('gameState', (state: GameState) => {
  // Handle game state update
});

// Making a move
socket.emit('makeMove', {
  gameId: 'game123',
  action: 'raise',
  amount: 100
});

## Setup and Configuration

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- TypeScript (v4.5 or higher)

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/ridhamxdev/ai-poker-agent.git
cd ai-poker-agent/backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configurations
```

4. Start the server:
```bash
# Development mode with hot reload
npm run dev

# Production build and start
npm run build
npm start
```

### Environment Configuration

Required variables in `.env`:
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGO_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# AI Configuration
AI_TRAINING_ITERATIONS=1000
MAX_TRAINING_ITERATIONS=50000
```

### Security and Authentication

The API uses JWT (JSON Web Tokens) for secure authentication:
- Token Location:
  - Headers: `Authorization: Bearer <token>`
  - Cookie: `authToken=<token>`
- Token Features:
  - 7-day expiration
  - Automatic refresh mechanism
  - Blacklist support for revocation

### Rate Limiting and Error Handling

#### Rate Limits
- Authentication endpoints: 5 requests/minute
- Game actions: 60 requests/minute
- AI operations: 30 requests/minute

#### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-09-26T10:00:00Z"
}
```

### Production Deployment Recommendations

1. Database:
   - Use MongoDB Atlas or equivalent managed service
   - Enable database replication
   - Regular backup schedule

2. Server:
   - Deploy behind reverse proxy (Nginx/Apache)
   - Enable SSL/TLS
   - Set up proper firewall rules

3. Performance:
   - Enable Node.js clustering
   - Implement Redis for caching
   - Use PM2 for process management

## License

## Game Theory Implementation

The poker AI implementation is based on advanced game theory concepts and incorporates several sophisticated algorithms:

### 1. Counterfactual Regret Minimization (CFR)
Located in `services/cfrAgent.ts`, the CFR implementation uses an iterative self-play algorithm to approximate Nash equilibrium strategies.

#### Key Formulas:
- **Counterfactual Regret**: For action $a$ at information set $I$:
  $$ R^T(I,a) = \sum_{t=1}^T [v(I,a) - v(I,\sigma^t)] $$

- **Strategy Update**:
  $$ \sigma^{T+1}(I,a) = \frac{\max(R^T(I,a),0)}{\sum_{a'}\max(R^T(I,a'),0)} $$

- **Average Strategy**:
  $$ \bar{\sigma}^T(I,a) = \frac{\sum_{t=1}^T \pi^t(I)\sigma^t(I,a)}{\sum_{t=1}^T \pi^t(I)} $$

Implementation features:
- Information set abstraction combining cards, betting history, and position
- Regret-matched strategy updates
- Iterative strategy improvement
- Nash equilibrium convergence

### 2. Opponent Modeling
Implemented in `services/opponentModel.ts`, the system uses Bayesian inference and statistical modeling.

#### Key Metrics:
- **VPIP (Voluntarily Put Money in Pot)**:
  $$ VPIP = \frac{\text{# of times player puts money in pot voluntarily}}{\text{total # of hands}} \times 100\% $$

- **PFR (Pre-Flop Raise)**:
  $$ PFR = \frac{\text{# of times player raises pre-flop}}{\text{total # of hands}} \times 100\% $$

- **Aggression Factor**:
  $$ AF = \frac{\text{# of bets + raises}}{\text{# of calls}} $$

- **Fold to Continuation Bet**:
  $$ FCB = \frac{\text{# of folds to continuation bet}}{\text{total # of continuation bets faced}} $$

### 3. Hand Evaluation
The `utils/handEvaluator.ts` module implements the following algorithms:

#### Hand Strength Calculation:
$$ HS = \frac{\text{# of hands we beat}}{\text{total # of possible opponent hands}} $$

#### Potential Hand Strength:
$$ PPot = \sum_{turn,river} P(win|cards) \times P(turn,river|board) $$

#### Effective Hand Strength:
$$ EHS = HS \times (1 - NPot) + (1 - HS) \times PPot $$

### 4. Core Game Engine
`services/GameEngine.ts` manages game state using a finite state machine with probabilistic transitions.

#### Pot Odds Calculation:
$$ \text{Pot Odds} = \frac{\text{call amount}}{\text{call amount + pot size}} $$

#### Expected Value:
$$ EV = (P_{win} \times \text{Pot Size}) - ((1 - P_{win}) \times \text{Call Amount}) $$

### 5. AI Decision Making
The main AI logic in `services/pokerAI.ts` uses a multi-factor decision model:

#### Decision Weight Formula:
$$ W = \alpha EHS + \beta PotOdds + \gamma OpponentModel + \delta PositionValue $$
Where:
- $\alpha, \beta, \gamma, \delta$ are difficulty-dependent weights
- $EHS$ is Effective Hand Strength
- $PotOdds$ is the pot odds ratio
- $OpponentModel$ is the opponent tendency factor
- $PositionValue$ is position-based adjustment

#### Bluff Frequency Optimization:
$$ BluffFreq = \frac{\text{Pot Size}}{\text{Pot Size + Bet Size}} $$

#### Risk Assessment:
$$ Risk = \frac{\text{Bet Amount}}{\text{Effective Stack}} \times \text{Stage Multiplier} $$

### 6. Real-time Gameplay
Implemented through WebSocket connections in `sockets/gameSockets.ts`:

#### Performance Metrics:
- Response Time: < 200ms for decisions
- State Synchronization: Real-time with optimistic updates
- Concurrency: Supports multiple simultaneous games
- Training Performance: Up to 10,000 hands/second during learning

The implementation achieves theoretically sound gameplay through:
1. Nash Equilibrium approximation via CFR
2. Bayesian opponent modeling
3. Multi-agent reinforcement learning
4. Real-time strategy adaptation
5. Exploitative play against non-optimal opponents

MIT License - Copyright (c) 2025 ridhamxdev