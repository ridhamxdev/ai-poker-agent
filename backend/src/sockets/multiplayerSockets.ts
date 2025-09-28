import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import MultiplayerGameEngine from '../services/MultiplayerGameEngine';
import { verifyToken } from '../middleware/auth';
import { AuthenticatedUser } from '../types';
import { Player, GameState, GameAction, GameRoom as IGameRoom } from '../types/game.types';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

interface AuthenticatedSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap> {
  user: AuthenticatedUser;
  gameId?: string;
}

interface ExtendedGameRoom extends IGameRoom {
  engine: MultiplayerGameEngine;
}

// Active games and connected users management
const gameRooms = new Map<string, ExtendedGameRoom>();
const connectedUsers = new Map<string, { id: string; username: string; socketId: string }>();

export default (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>): void => {
  // Authentication middleware for socket connections
  io.use((socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>, next) => {
    const token = socket.handshake.auth.token || 
                 socket.handshake.headers.cookie?.match(/authToken=([^;]+)/)?.[1];
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        (socket as AuthenticatedSocket).user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    } else {
      next(new Error('No token provided'));
    }
  });

  io.on('connection', (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>) => {
    const authenticatedSocket = socket as AuthenticatedSocket;
    const { user } = authenticatedSocket;
    console.log(`🎮 Multiplayer: User connected: ${user.username} (${user.id})`);

    // Add user to connected users
    connectedUsers.set(user.id, {
      id: user.id,
      username: user.username,
      socketId: socket.id
    });

    // Send current user list and game list to the newly connected user
    const usersList = Array.from(connectedUsers.values());
    const gamesList = Array.from(gameRooms.values()).map(room => ({
      id: room.id,
      players: room.players,
      maxPlayers: room.maxPlayers,
      state: room.state,
      pot: room.pot,
      currentBet: room.currentBet,
      currentTurn: room.currentTurn
    }));
    
    console.log(`📊 Sending to ${user.username}: ${usersList.length} users, ${gamesList.length} games`);
    socket.emit('users:update', usersList);
    socket.emit('games:list', gamesList);

    // Broadcast updated user list to all other users
    socket.broadcast.emit('user:joined', {
      id: user.id,
      username: user.username,
      socketId: socket.id
    });
    
    // Broadcast updated user list
    io.emit('users:update', Array.from(connectedUsers.values()));

    // Create a new game room
    socket.on('game:create', () => {
      // Check if there are enough available players to create a game
      const availablePlayersCount = Array.from(connectedUsers.values()).filter(connectedUser => {
        // Check if user is not already in a game
        const isInGame = Array.from(gameRooms.values()).some(room => 
          room.players.some(player => player.id === connectedUser.id)
        );
        return !isInGame;
      }).length;

      if (availablePlayersCount < 3) {
        socket.emit('game:error', `Need at least 3 players online to create a game. Currently ${availablePlayersCount} available players.`);
        return;
      }

      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const player: Player = {
        id: user.id,
        username: user.username,
        chips: 5000,
        socketId: socket.id,
        bet: 0,
        folded: false
      };

      const engine = new MultiplayerGameEngine(gameId);

      const gameRoom: ExtendedGameRoom = {
        id: gameId,
        players: [player],
        state: 'waiting',
        maxPlayers: 6,
        currentTurn: 0,
        pot: 0,
        communityCards: [],
        currentBet: 0,
        engine
      };

      gameRooms.set(gameId, gameRoom);
      socket.join(gameId);
      authenticatedSocket.gameId = gameId;

      // Broadcast updated game list
      io.emit('games:list', Array.from(gameRooms.values()).map(room => ({
        id: room.id,
        players: room.players,
        maxPlayers: room.maxPlayers,
        state: room.state,
        pot: room.pot,
        currentBet: room.currentBet,
        currentTurn: room.currentTurn
      })));

      // Broadcast game creation to all users
      socket.broadcast.emit('game:created', {
        gameId,
        createdBy: user.username,
        players: [player],
        maxPlayers: gameRoom.maxPlayers
      });

      socket.emit('game:created', { gameId, success: true });
      console.log(`Game created: ${gameId} by ${user.username}`);
    });

    // Join an existing game room
    socket.on('game:join', async (gameId: string) => {
      const gameRoom = gameRooms.get(gameId);
      
      if (!gameRoom) {
        socket.emit('game:error', 'Game room not found');
        return;
      }

      if (gameRoom.players.length >= gameRoom.maxPlayers) {
        socket.emit('game:error', 'Game room is full');
        return;
      }

      if (gameRoom.state !== 'waiting') {
        socket.emit('game:error', 'Game has already started');
        return;
      }

      // Add player to room
      const player: Player = {
        id: user.id,
        username: user.username,
        chips: 5000,
        socketId: socket.id,
        bet: 0,
        folded: false
      };

      gameRoom.players.push(player);
      socket.join(gameId);
      authenticatedSocket.gameId = gameId;

      // Only start the game when we have at least 3 players
      if (gameRoom.players.length >= 3) {
        gameRoom.state = 'playing';
        await gameRoom.engine.initializeMultiplayerGame(gameRoom.players);
        
        // Notify all players in the room that the game is starting
        io.to(gameId).emit('game:started', {
          gameId,
          players: gameRoom.players,
          state: gameRoom.engine.getGameState()
        });
        
        console.log(`Game ${gameId} started with ${gameRoom.players.length} players`);
      } else {
        // Notify that more players are needed
        io.to(gameId).emit('game:waiting', {
          gameId,
          players: gameRoom.players,
          message: `Waiting for ${3 - gameRoom.players.length} more players to start the game.`,
          playersNeeded: 3 - gameRoom.players.length
        });
      }

      // Broadcast updated game list
      io.emit('games:list', Array.from(gameRooms.values()).map(room => ({
        id: room.id,
        players: room.players,
        maxPlayers: room.maxPlayers,
        state: room.state,
        pot: room.pot,
        currentBet: room.currentBet,
        currentTurn: room.currentTurn
      })));

      // Broadcast player joined to all users
      socket.broadcast.emit('player:joined', {
        gameId,
        player: {
          id: user.id,
          username: user.username
        },
        totalPlayers: gameRoom.players.length,
        maxPlayers: gameRoom.maxPlayers
      });
    });

    // Handle player leaving game
    socket.on('game:leave', (data: { gameId: string }) => {
      const { gameId } = data;
      const gameRoom = gameRooms.get(gameId);

      if (!gameRoom) {
        return;
      }

      // Remove player from room
      gameRoom.players = gameRoom.players.filter(p => p.id !== user.id);
      socket.leave(gameId);
      authenticatedSocket.gameId = undefined;

      if (gameRoom.players.length === 0) {
        // If no players left, remove the room
        gameRooms.delete(gameId);
      } else if (gameRoom.state === 'playing' && gameRoom.players.length < 3) {
        // End game if not enough players to continue
        gameRoom.state = 'waiting';
        io.to(gameId).emit('game:ended', {
          message: 'Not enough players to continue the game'
        });
      } else {
        // Notify remaining players
        io.to(gameId).emit('player:left', {
          playerId: user.id,
          username: user.username
        });

        // If in waiting state, update waiting room info
        if (gameRoom.state === 'waiting') {
          io.to(gameId).emit('game:waiting', {
            gameId,
            players: gameRoom.players,
            message: `Waiting for ${Math.max(0, 3 - gameRoom.players.length)} more players to start the game.`,
            playersNeeded: Math.max(0, 3 - gameRoom.players.length)
          });
        }
      }

      // Broadcast updated game list
      io.emit('games:list', Array.from(gameRooms.values()).map(room => ({
        id: room.id,
        players: room.players,
        maxPlayers: room.maxPlayers,
        state: room.state,
        pot: room.pot,
        currentBet: room.currentBet,
        currentTurn: room.currentTurn
      })));

      // Broadcast player left to all users
      socket.broadcast.emit('player:left', {
        gameId,
        player: {
          id: user.id,
          username: user.username
        },
        totalPlayers: gameRoom ? gameRoom.players.length : 0,
        maxPlayers: gameRoom ? gameRoom.maxPlayers : 0
      });

      console.log(`Player ${user.username} left game ${gameId}`);
    });

    // Handle player actions (bet, call, fold, etc.)
    socket.on('game:action', async (data: { gameId: string; action: GameAction }) => {
      const { gameId, action } = data;
      const gameRoom = gameRooms.get(gameId);

      if (!gameRoom || gameRoom.state !== 'playing') {
        socket.emit('game:error', 'Invalid game state');
        return;
      }

      try {
        const result = await gameRoom.engine.handlePlayerAction(action);
        const gameState = gameRoom.engine.getGameState();
        
        // Update room state from game engine
        gameRoom.pot = gameState.pot;
        gameRoom.communityCards = gameState.communityCards;
        gameRoom.currentBet = gameState.currentBet;
        gameRoom.currentTurn = gameState.currentTurn;
        gameRoom.players = gameState.players;
        
        // Broadcast updated game state to all players in the room
        io.to(gameId).emit('game:update', {
          gameState: gameRoom.engine.getGameState(user.id),
          lastAction: action
        });

        // If the game round is over, handle end of round
        if (result.isRoundComplete) {
          const roundResult = gameRoom.engine.getRoundResult();
          io.to(gameId).emit('game:roundEnd', roundResult);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        socket.emit('game:error', errorMessage);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.username}`);
      
      // Broadcast user leaving to all other users
      socket.broadcast.emit('user:left', {
        id: user.id,
        username: user.username
      });
      
      // Remove user from connected users
      connectedUsers.delete(user.id);
      
      // Handle player leaving game room
      if (authenticatedSocket.gameId) {
        const gameRoom = gameRooms.get(authenticatedSocket.gameId);
        if (gameRoom) {
          // Remove player from room
          gameRoom.players = gameRoom.players.filter(p => p.id !== user.id);
          
          if (gameRoom.players.length === 0) {
            // If no players left, remove the room
            gameRooms.delete(authenticatedSocket.gameId);
          } else if (gameRoom.state === 'playing' && gameRoom.players.length < 2) {
            // End game if not enough players
            gameRoom.state = 'waiting';
            io.to(authenticatedSocket.gameId).emit('game:ended', {
              message: 'Not enough players to continue'
            });
          } else {
            // Notify remaining players
            io.to(authenticatedSocket.gameId).emit('player:left', {
              playerId: user.id,
              username: user.username
            });
          }
        }
      }

      // Broadcast updated lists
      io.emit('users:update', Array.from(connectedUsers.values()));
      io.emit('games:list', Array.from(gameRooms.values()).map(room => ({
        id: room.id,
        players: room.players,
        maxPlayers: room.maxPlayers,
        state: room.state,
        pot: room.pot,
        currentBet: room.currentBet,
        currentTurn: room.currentTurn
      })));
    });
  });
};