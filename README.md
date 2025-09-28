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

### 🎮 AI Game Mode
- **AI vs Human**: Play against intelligent AI opponents with different skill levels (Beginner, Skilled, Expert)

### 🤖 AI Features
- **Counterfactual Regret Minimization (CFR)**: Advanced poker strategy algorithm
- **Opponent Modeling**: AI learns and adapts to player behavior
- **Bluffing Detection**: Intelligent bluffing and counter-bluffing strategies
- **Risk Management**: Dynamic bet sizing based on hand strength and position

### 🎯 AI Game Features
- **Complete Poker Rules**: Texas Hold'em with all standard rules
- **Real-time AI Updates**: Live AI decision making and game state synchronization
- **Advanced Hand Evaluation**: AI hand ranking and comparison algorithms
- **Position Tracking**: Dealer, small blind, big blind positions with AI awareness
- **Intelligent Betting**: AI-driven betting rounds with strategic decision making

### 🎨 AI Game UI/UX Features
- **Professional Poker Table**: Glass-morphism effects and casino-quality aesthetics
- **AI Player Visualization**: Clear positioning of AI opponents around the table
- **Real-time AI Notifications**: AI move announcements and game state updates
- **Interactive Card System**: Animated card dealing with AI vs human distinction
- **Community Cards Area**: Strategically positioned between AI players and human player

## 🛠 AI Game Tech Stack

### Backend AI Stack
- **Node.js** with **TypeScript** - AI game server
- **Express.js** - AI game API framework
- **Socket.IO** - Real-time AI game communication
- **MongoDB** with **Mongoose** - AI game data storage
- **CFR Algorithm** - Counterfactual Regret Minimization
- **Opponent Modeling** - AI behavior analysis

### Frontend AI Stack
- **React 18** with **TypeScript** - AI game interface
- **Vite** - AI game build tool
- **Tailwind CSS** - AI game styling
- **Framer Motion** - AI game animations
- **Socket.IO Client** - Real-time AI communication
- **React Context** - AI game state management

## 📁 AI Game Project Structure

```
ai-poker-agent/
├── backend/                    # AI Game Backend
│   ├── src/                   # AI Game Source Code
│   │   ├── routes/           # AI Game API routes
│   │   │   ├── ai.ts         # AI game routes
│   │   │   └── aiGame.ts     # AI game specific routes
│   │   ├── services/         # AI Game Logic
│   │   │   ├── GameEngine.ts # Core AI game logic
│   │   │   ├── pokerAI.ts    # AI decision making
│   │   │   ├── cfrAgent.ts   # CFR algorithm
│   │   │   ├── opponentModel.ts # AI opponent modeling
│   │   │   └── AIManager.ts  # AI coordination
│   │   ├── sockets/          # AI Game Sockets
│   │   │   └── gameSockets.ts # AI game socket handling
│   │   ├── utils/            # AI Game Utilities
│   │   │   ├── cards.ts      # Card utilities
│   │   │   └── handEvaluator.ts # Hand evaluation
│   │   └── types/            # AI Game Types
│   │       ├── index.ts      # AI game type definitions
│   │       └── game.types.ts # AI game-specific types
│   └── package.json          # AI Game Dependencies
├── frontend/                 # AI Game Frontend
│   ├── src/                 # AI Game Source Code
│   │   ├── components/      # AI Game Components
│   │   │   ├── PokerGame.tsx # Main AI game interface
│   │   │   ├── AIGameSetup.tsx # AI game setup
│   │   │   ├── PokerGame.css # AI game styling
│   │   │   └── AIGameSetup.css # AI setup styling
│   │   ├── contexts/        # AI Game Contexts
│   │   │   └── AIGameContext.tsx # AI game state management
│   │   └── config/          # AI Game Configuration
│   │       └── index.ts     # AI game API configuration
│   └── package.json         # AI Game Dependencies
└── README.md                # AI Game Documentation
```

## 🚀 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### AI Game Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install AI game dependencies**
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

4. **Build the AI game project**
   ```bash
   npm run build
   ```

### AI Game Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install AI game dependencies**
   ```bash
   npm install
   ```

## ⚙️ Configuration

### AI Game Configuration

#### AI Game API Configuration (`frontend/src/config/index.ts`)
- AI game API endpoints
- Socket.IO connection settings for AI games
- AI difficulty configurations
- Game parameters and settings

## 🏃‍♂️ Running the Application

### AI Game Development Mode

1. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

2. **Start AI Game Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   AI game server will run on `http://localhost:5000`

3. **Start AI Game Frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   AI game frontend will run on `http://localhost:3000`

### AI Game Production Mode

1. **Build AI Game Backend**
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **Build AI Game Frontend**
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

## 📚 API Documentation

### AI Game Endpoints

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

### AI Game Socket.IO Events

#### AI Namespace (`/ai`)
- `connect` - Connect to AI game
- `create-game` - Create AI game
- `make-move` - Make move in AI game
- `aiMove` - AI opponent move
- `gameState` - Game state updates

## 📁 File Structure & Documentation

### Backend AI Files

#### AI Game Routes

**`routes/ai.ts`** - AI game routes
- AI game creation
- Move processing
- AI opponent management

**`routes/aiGame.ts`** - AI game specific routes
- Game state retrieval
- Move validation
- AI decision making

#### AI Services

**`services/GameEngine.ts`** - Core AI game logic
- Poker rules implementation for AI games
- Hand evaluation and AI decision making
- Betting round management with AI opponents
- Game state transitions and winner determination

**`services/pokerAI.ts`** - AI decision making
- Hand strength evaluation
- Betting strategy algorithms
- Bluffing and counter-bluffing
- Risk assessment and position play

**`services/cfrAgent.ts`** - CFR algorithm implementation
- Counterfactual regret minimization
- Strategy learning through self-play
- Nash equilibrium approximation
- Game tree traversal and optimization

**`services/opponentModel.ts`** - AI opponent modeling
- Human player behavior analysis
- Tendency detection and pattern recognition
- Adaptive strategy adjustment
- Bluffing frequency analysis

**`services/AIManager.ts`** - AI coordination
- Multiple AI opponent management
- Difficulty level handling (Beginner, Skilled, Expert)
- AI decision coordination and timing
- Performance optimization

#### AI Game Sockets

**`sockets/gameSockets.ts`** - AI game socket handling
- AI game connections and management
- Human player move processing
- AI move broadcasting and notifications
- Real-time AI opponent management

#### AI Game Utils

**`utils/cards.ts`** - Card utilities for AI games
- Card representation and deck management
- Card comparison for AI decision making
- Hand formatting and display

**`utils/handEvaluator.ts`** - AI hand evaluation
- Poker hand ranking algorithms
- Hand strength calculation for AI
- Hand comparison and winning determination
- Pot odds and expected value calculations

#### AI Game Types

**`types/index.ts`** - AI game type definitions
- AI game state interfaces
- AI player interfaces and actions
- AI decision types and events

**`types/game.types.ts`** - AI game-specific types
- AI game state types
- AI action definitions and results
- AI opponent behavior types

### Frontend Files (AI-Focused)

#### Main AI Components

**`components/PokerGame.tsx`** - Main AI game interface
- AI vs Human game table rendering
- Player cards display with AI opponents
- Community cards and pot display
- Action buttons for human player
- Real-time game state visualization
- AI move notifications and game progression

**`components/AIGameSetup.tsx`** - AI game configuration
- AI difficulty selection (Beginner, Skilled, Expert)
- Buy-in configuration
- AI opponent setup and initialization
- Game parameters configuration

#### AI Game Context

**`contexts/AIGameContext.tsx`** - AI game state management
- AI game state management and synchronization
- Human player actions and AI responses
- Game progression and turn management
- AI opponent behavior and decision tracking
- Real-time game state updates

#### AI Game Configuration

**`config/index.ts`** - AI game configuration
- AI game API endpoints
- Socket.IO settings for AI games
- AI difficulty configurations
- Game parameters and settings

#### AI Game Styling

**`components/PokerGame.css`** - AI game interface styling
- Professional poker table design with glass-morphism effects
- AI player positioning around the table
- Community cards area between AI players and human player
- Card animations and transitions
- Responsive layout for different screen sizes
- Modern casino-style aesthetics with gradients and shadows

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

## 🎮 AI Game Features

### AI vs Human Poker
- **Complete Texas Hold'em**: Full poker rule implementation
- **AI Opponents**: Multiple difficulty levels (Beginner, Skilled, Expert)
- **Real-time Gameplay**: Live AI decision making and responses
- **Advanced AI**: CFR algorithm with opponent modeling
- **Professional Interface**: Casino-quality poker table design

### AI Game Mechanics
- **Betting Rounds**: Preflop, flop, turn, river with AI decision making
- **Hand Evaluation**: AI hand strength assessment and betting strategy
- **Bluffing**: Intelligent AI bluffing and counter-bluffing
- **Position Play**: AI considers dealer, small blind, big blind positions
- **Adaptive Strategy**: AI learns and adapts to human player behavior

## 🚀 Getting Started with AI Game

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai_poker_agent
   ```

2. **Set up the AI game backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Set up the AI game frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the AI game application**
   - AI Game Frontend: `http://localhost:3000`
   - AI Game Backend API: `http://localhost:5000`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **CFR Algorithm**: Counterfactual Regret Minimization based on academic research
- **AI Poker Strategy**: Advanced poker AI algorithms and opponent modeling
- **Professional UI**: Casino-quality poker table design and animations
- **Real-time AI**: Socket.IO powered AI game communication
- **Modern Tech Stack**: React, TypeScript, and Node.js for robust AI game development

---

**Happy AI Poker Playing! 🃏🤖🎉**
