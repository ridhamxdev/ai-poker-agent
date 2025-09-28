# 🃏 Poker AI Backend & Frontend

A comprehensive poker game application featuring AI opponents, real-time multiplayer functionality, and advanced poker AI algorithms including Counterfactual Regret Minimization (CFR).

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [File Structure & Documentation](#file-structure--documentation)
- [AI Algorithms](#ai-algorithms)
- [Game Features](#game-features)
- [Contributing](#contributing)

## 🚀 Features

### 🎮 Game Modes
- **AI vs Human**: Play against intelligent AI opponents with different skill levels
- **Multiplayer**: Real-time multiplayer poker with live player updates
- **Tournament Mode**: Competitive gameplay with multiple players

### 🤖 AI Features
- **Counterfactual Regret Minimization (CFR)**: Advanced poker strategy algorithm
- **Opponent Modeling**: AI learns and adapts to player behavior
- **Bluffing Detection**: Intelligent bluffing and counter-bluffing strategies
- **Risk Management**: Dynamic bet sizing based on hand strength and position

### 🎯 Game Features
- **Complete Poker Rules**: Texas Hold'em with all standard rules
- **Real-time Updates**: Live game state synchronization
- **Hand Evaluation**: Advanced hand ranking and comparison
- **Position Tracking**: Dealer, small blind, big blind positions
- **Betting Rounds**: Preflop, flop, turn, river with proper betting logic

### 🎨 UI/UX Features
- **Modern Design**: Glass-morphism effects and professional casino aesthetics
- **Responsive Layout**: Optimized for different screen sizes
- **Real-time Notifications**: Game events and player actions
- **Interactive Cards**: Animated card dealing and revealing
- **Live Statistics**: Player stats and game history

## 🛠 Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** with **Mongoose** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Joi** - Input validation

### Frontend
- **React 18** with **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Socket.IO Client** - Real-time communication
- **React Router** - Navigation
- **Axios** - HTTP client

## 📁 Project Structure

```
Poker_ai_backend/
├── backend/                    # Backend application
│   ├── src/                   # Source code
│   │   ├── config/           # Configuration files
│   │   ├── middleware/       # Express middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── sockets/         # Socket.IO handlers
│   │   ├── types/           # TypeScript definitions
│   │   ├── utils/           # Utility functions
│   │   └── server.ts        # Main server file
│   ├── dist/                # Compiled JavaScript
│   ├── package.json         # Dependencies
│   └── tsconfig.json        # TypeScript config
├── frontend/                 # Frontend application
│   ├── src/                 # Source code
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── config/          # Configuration
│   │   ├── utils/           # Utility functions
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   ├── package.json         # Dependencies
│   └── vite.config.ts       # Vite configuration
└── README.md                # This file
```

## 🚀 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/poker_ai
   JWT_SECRET=your_jwt_secret_here
   NODE_ENV=development
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## ⚙️ Configuration

### Backend Configuration

#### Database Configuration (`backend/src/config/database.ts`)
- MongoDB connection setup
- Connection options and error handling
- Database initialization

#### Server Configuration (`backend/src/server.ts`)
- Express server setup
- CORS configuration
- Socket.IO namespaces (`/ai` and `/multiplayer`)
- Route mounting
- Error handling middleware

### Frontend Configuration

#### API Configuration (`frontend/src/config/index.ts`)
- Backend API endpoints
- Socket.IO connection settings
- Environment-specific configurations

#### Vite Configuration (`frontend/vite.config.ts`)
- Development server settings
- Build optimization
- Proxy configuration for API calls

## 🏃‍♂️ Running the Application

### Development Mode

1. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

2. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server will run on `http://localhost:5000`

3. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:3000`

### Production Mode

1. **Build Backend**
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### POST `/api/auth/login`
Login user
```json
{
  "email": "string",
  "password": "string"
}
```

### Game Endpoints

#### POST `/api/game/create`
Create a new multiplayer game
```json
{
  "gameType": "multiplayer",
  "maxPlayers": 6,
  "buyIn": 1000
}
```

#### POST `/api/ai-game/create`
Create a new AI game
```json
{
  "difficulty": "expert",
  "buyIn": 1000
}
```

#### POST `/api/ai-game/move`
Make a move in AI game
```json
{
  "gameId": "string",
  "action": "call|raise|fold|check",
  "amount": 50
}
```

### Socket.IO Events

#### Multiplayer Namespace (`/multiplayer`)
- `connect` - User connects
- `disconnect` - User disconnects
- `join-game` - Join a game room
- `leave-game` - Leave a game room
- `make-move` - Make a game move
- `users:update` - Online users list
- `games:list` - Available games list

#### AI Namespace (`/ai`)
- `connect` - Connect to AI game
- `create-game` - Create AI game
- `make-move` - Make move in AI game
- `aiMove` - AI opponent move
- `gameState` - Game state updates

## 📁 File Structure & Documentation

### Backend Files

#### Core Server Files

**`server.ts`** - Main server entry point
- Express server configuration
- Socket.IO setup with namespaces
- Middleware configuration
- Route mounting
- Error handling

**`config/database.ts`** - Database configuration
- MongoDB connection setup
- Connection options
- Error handling and reconnection logic

#### Models

**`models/User.ts`** - User data model
- User schema with validation
- Password hashing middleware
- Authentication methods
- Profile and statistics fields

**`models/Game.ts`** - Game data model
- Game state schema
- Player information
- Game actions and history
- Hand and betting round data

#### Middleware

**`middleware/auth.ts`** - Authentication middleware
- JWT token verification
- User authentication
- Protected route access

**`middleware/validation.ts`** - Input validation
- Request validation using Joi
- Error handling for invalid inputs
- Sanitization of user inputs

#### Routes

**`routes/auth.ts`** - Authentication routes
- User registration and login
- Password reset functionality
- Profile management

**`routes/game.ts`** - Multiplayer game routes
- Game creation and joining
- Game state management
- Player management

**`routes/ai.ts`** - AI game routes
- AI game creation
- Move processing
- AI opponent management

**`routes/aiGame.ts`** - AI game specific routes
- Game state retrieval
- Move validation
- AI decision making

#### Services

**`services/GameEngine.ts`** - Core game logic
- Poker rules implementation
- Hand evaluation
- Betting round management
- Game state transitions
- Winner determination

**`services/MultiplayerGameEngine.ts`** - Multiplayer game logic
- Multi-player game management
- Turn-based gameplay
- Real-time synchronization
- Game room management

**`services/pokerAI.ts`** - AI decision making
- Hand strength evaluation
- Betting strategy
- Bluffing algorithms
- Risk assessment

**`services/cfrAgent.ts`** - CFR algorithm implementation
- Counterfactual regret minimization
- Strategy learning
- Nash equilibrium approximation
- Game tree traversal

**`services/opponentModel.ts`** - Opponent modeling
- Player behavior analysis
- Tendency detection
- Adaptive strategy adjustment
- Pattern recognition

**`services/AIManager.ts`** - AI coordination
- Multiple AI opponent management
- Difficulty level handling
- AI decision coordination
- Performance optimization

#### Sockets

**`sockets/gameSockets.ts`** - AI game socket handling
- AI game connections
- Move processing
- Game state broadcasting
- AI opponent management

**`sockets/multiplayerSockets.ts`** - Multiplayer socket handling
- Player connections
- Game room management
- Real-time updates
- Player list management

#### Utils

**`utils/cards.ts`** - Card utilities
- Card representation
- Deck management
- Card comparison
- Hand formatting

**`utils/handEvaluator.ts`** - Hand evaluation
- Poker hand ranking
- Hand strength calculation
- Hand comparison
- Winning hand determination

#### Types

**`types/index.ts`** - Main type definitions
- Game state interfaces
- Player interfaces
- Action types
- Socket event types

**`types/game.types.ts`** - Game-specific types
- Game state types
- Action definitions
- Result types
- Event types

### Frontend Files

#### Core Application Files

**`main.tsx`** - Application entry point
- React app initialization
- Router setup
- Global providers

**`App.tsx`** - Main application component
- Route definitions
- Global layout
- Navigation setup

#### Components

**`components/LandingPage.tsx`** - Landing page
- Welcome screen
- Game mode selection
- User authentication prompts

**`components/GameSelection.tsx`** - Game mode selection
- AI vs Multiplayer choice
- Game configuration
- Player setup

**`components/PokerGame.tsx`** - Main game interface
- Game table rendering
- Player cards display
- Community cards
- Action buttons
- Game state visualization

**`components/PokerLobby.tsx`** - Multiplayer lobby
- Online players list
- Available games
- Game creation and joining
- Real-time updates

**`components/AIGameSetup.tsx`** - AI game setup
- AI difficulty selection
- Buy-in configuration
- Game initialization

**`components/SignIn.tsx`** - User authentication
- Login form
- Input validation
- Authentication handling

**`components/SignUp.tsx`** - User registration
- Registration form
- Validation
- Account creation

**`components/Profile.tsx`** - User profile
- User statistics
- Game history
- Profile management

**`components/Stats.tsx`** - Game statistics
- Performance metrics
- Win/loss records
- Hand analysis

**`components/WaitingRoom.tsx`** - Game waiting room
- Player waiting area
- Game preparation
- Ready state management

**`components/Navigation.tsx`** - Navigation bar
- Menu items
- User authentication status
- Navigation links

**`components/RequireAuth.tsx`** - Authentication guard
- Protected route wrapper
- Authentication checking
- Redirect handling

**`components/Loading.tsx`** - Loading component
- Loading states
- Spinner animations
- Progress indicators

#### Contexts

**`contexts/AuthContext.tsx`** - Authentication context
- User authentication state
- Login/logout functions
- Token management
- User profile data

**`contexts/SocketContext.tsx`** - Socket.IO context
- Socket connection management
- Real-time event handling
- Multiplayer game state
- Connection status

**`contexts/AIGameContext.tsx`** - AI game context
- AI game state management
- Game actions
- AI opponent handling
- Game progression

#### Configuration

**`config/index.ts`** - Application configuration
- API endpoints
- Socket.IO settings
- Environment variables
- Feature flags

#### Utils

**`utils/apiTest.ts`** - API testing utilities
- API endpoint testing
- Mock data generation
- Test helpers

**`api.ts`** - API client
- HTTP request handling
- Authentication headers
- Error handling
- Response processing

#### Styling

**`components/PokerGame.css`** - Game interface styling
- Poker table design
- Card animations
- Player positioning
- Responsive layout

**`components/PokerLobby.css`** - Lobby styling
- Player list design
- Game room cards
- Interactive elements

**`components/AIGameSetup.css`** - AI setup styling
- Configuration forms
- Difficulty selection
- Setup interface

**`components/Profile.css`** - Profile styling
- User profile layout
- Statistics display
- Profile management

**`components/Stats.css`** - Statistics styling
- Data visualization
- Charts and graphs
- Performance metrics

**`components/WaitingRoom.css`** - Waiting room styling
- Waiting interface
- Player status
- Game preparation

**`components/GameSelection.css`** - Game selection styling
- Mode selection interface
- Configuration options
- Selection animations

## 🤖 AI Algorithms

### Counterfactual Regret Minimization (CFR)
- **Purpose**: Learn optimal poker strategies through self-play
- **Implementation**: `services/cfrAgent.ts`
- **Features**:
  - Game tree traversal
  - Regret calculation
  - Strategy updates
  - Nash equilibrium approximation

### Opponent Modeling
- **Purpose**: Adapt AI strategy based on opponent behavior
- **Implementation**: `services/opponentModel.ts`
- **Features**:
  - Betting pattern analysis
  - Bluffing frequency detection
  - Aggression level assessment
  - Adaptive strategy adjustment

### Hand Evaluation
- **Purpose**: Assess hand strength and make betting decisions
- **Implementation**: `utils/handEvaluator.ts`
- **Features**:
  - Hand ranking (High Card to Royal Flush)
  - Hand strength calculation
  - Pot odds evaluation
  - Expected value calculation

### Bluffing Strategy
- **Purpose**: Implement intelligent bluffing and counter-bluffing
- **Implementation**: `services/pokerAI.ts`
- **Features**:
  - Bluff frequency calculation
  - Board texture analysis
  - Opponent fold equity
  - Bluff sizing optimization

## 🎮 Game Features

### Poker Rules Implementation
- **Texas Hold'em**: Complete rule implementation
- **Betting Rounds**: Preflop, flop, turn, river
- **Hand Rankings**: All standard poker hands
- **Position Play**: Dealer, small blind, big blind
- **Side Pots**: Multiple player all-in scenarios

### Real-time Features
- **Live Updates**: Real-time game state synchronization
- **Player Actions**: Instant move broadcasting
- **Chat System**: Player communication
- **Spectator Mode**: Watch ongoing games

### Game Statistics
- **Hand History**: Complete game records
- **Performance Metrics**: Win rate, profit/loss
- **Player Analysis**: Tendency tracking
- **Session Statistics**: Current session performance

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Poker_ai_backend
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Poker strategy algorithms based on academic research
- UI/UX design inspired by modern casino applications
- Real-time communication powered by Socket.IO
- AI algorithms implemented using CFR and opponent modeling techniques

---

**Happy Playing! 🃏🎉**
