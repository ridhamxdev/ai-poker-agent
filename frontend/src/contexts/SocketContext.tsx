import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Manager } from 'socket.io-client';
import { useAuth } from './AuthContext';

const io = (uri: string, opts?: any) => new Manager(uri, opts).socket('/');

interface Player {
  id: string;
  username: string;
  chips: number;
  socketId: string;
  bet: number;
  folded: boolean;
  cards?: string[];
}

interface GameRoom {
  id: string;
  players: Player[];
  maxPlayers: number;
  state: 'waiting' | 'playing' | 'finished';
  pot: number;
  currentBet: number;
  currentTurn: number;
  communityCards?: string[];
}

interface GameState {
  id: string;
  players: Player[];
  state: 'waiting' | 'playing' | 'finished';
  gameState: string;
  pot: number;
  communityCards: string[];
  currentTurn: number;
  currentBet: number;
  smallBlind: number;
  bigBlind: number;
  winner?: {
    playerId: string;
    winningHand: string;
    amount: number;
  };
}

interface GameAction {
  playerId: string;
  type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  amount?: number;
}

interface RoundResult {
  winners: Player[];
  pot: number;
  hands: {
    playerId: string;
    cards: string[];
    handRank: string;
  }[];
}

interface ServerToClientEvents {
  'connect': () => void;
  'disconnect': () => void;
  'connect_error': (error: Error) => void;
  'users:update': (users: Player[]) => void;
  'games:list': (games: GameRoom[]) => void;
  'user:joined': (data: { id: string; username: string; socketId: string }) => void;
  'user:left': (data: { id: string; username: string }) => void;
  'game:created': (data: { gameId: string; success: boolean } | { gameId: string; createdBy: string; players: Player[]; maxPlayers: number }) => void;
  'game:waiting': (data: { gameId: string; players: Player[]; message: string; playersNeeded: number }) => void;
  'game:started': (data: { gameId: string; players: Player[]; state: GameState }) => void;
  'game:update': (data: { gameState: GameState; lastAction: GameAction }) => void;
  'game:roundEnd': (result: RoundResult) => void;
  'game:ended': (data: { message: string }) => void;
  'player:joined': (data: { gameId: string; player: { id: string; username: string }; totalPlayers: number; maxPlayers: number }) => void;
  'player:left': (data: { playerId: string; username: string } | { gameId: string; player: { id: string; username: string }; totalPlayers: number; maxPlayers: number }) => void;
  'game:error': (message: string) => void;
}

interface ClientToServerEvents {
  'game:create': () => void;
  'game:join': (gameId: string) => void;
  'game:leave': (data: { gameId: string }) => void;
  'game:action': (data: { gameId: string; action: GameAction }) => void;
}

type GameSocket = ReturnType<typeof io> & {
  on: <K extends keyof ServerToClientEvents>(event: K, listener: ServerToClientEvents[K]) => void;
  emit: <K extends keyof ClientToServerEvents>(event: K, ...args: Parameters<ClientToServerEvents[K]>) => void;
};

interface SocketContextType {
  socket: GameSocket | null;
  isConnected: boolean;
  onlineUsers: Player[];
  currentGame: GameState | null;
  availableGames: GameRoom[];
  error: string | null;
  waitingRoom: { gameId: string; players: Player[]; message: string; playersNeeded: number } | null;
  notifications: Array<{ id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; timestamp: number }>;
  createGame: () => void;
  joinGame: (gameId: string) => void;
  leaveGame: () => void;
  makeAction: (action: GameAction) => void;
  reconnect: () => void;
  clearNotifications: () => void;
}

const SOCKET_URL = 'http://localhost:5000';

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Player[]>([]);
  const [currentGame, setCurrentGame] = useState<GameState | null>(null);
  const [availableGames, setAvailableGames] = useState<GameRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [waitingRoom, setWaitingRoom] = useState<{ gameId: string; players: Player[]; message: string; playersNeeded: number } | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string; timestamp: number }>>([]);
  const { user } = useAuth();

  // Helper function to add notifications
  const addNotification = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const id = Date.now().toString();
    const notification = { id, type, message, timestamp: Date.now() };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // In the initializeSocket function
  const initializeSocket = useCallback(() => {
    if (!user) {
      console.log('No user available for socket connection');
      return;
    }
  
    console.log('Initializing socket connection with token:', localStorage.getItem('token') ? 'Token exists' : 'No token');
  
    const manager = new Manager(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000,
      transports: ['websocket', 'polling']
    });
    
    const newSocket = manager.socket('/multiplayer') as GameSocket;
  
    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to multiplayer game server');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from game server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('❌ Connection error:', error.message);
      setError('Failed to connect to game server');
      setIsConnected(false);
    });

    // User events
    newSocket.on('users:update', (users: Player[]) => {
      console.log('👥 Received users update:', users.length, 'users');
      setOnlineUsers(users);
    });

    newSocket.on('user:joined', (data: { id: string; username: string; socketId: string }) => {
      if (data.id !== user?.id) {
        addNotification('info', `${data.username} joined the lobby`);
      }
    });

    newSocket.on('user:left', (data: { id: string; username: string }) => {
      if (data.id !== user?.id) {
        addNotification('info', `${data.username} left the lobby`);
      }
    });

    // Game list events
    newSocket.on('games:list', (games: GameRoom[]) => {
      console.log('🎮 Received games update:', games.length, 'games');
      setAvailableGames(games);
    });

    // Game events
    newSocket.on('game:created', (data: { gameId: string; success: boolean } | { gameId: string; createdBy: string; players: Player[]; maxPlayers: number }) => {
      if ('success' in data && data.success) {
        console.log('Game created:', data.gameId);
        setError(null);
        addNotification('success', 'Game created successfully!');
      } else if ('createdBy' in data) {
        addNotification('info', `${data.createdBy} created a new game`);
      }
    });

    newSocket.on('game:waiting', (data: { gameId: string; players: Player[]; message: string; playersNeeded: number }) => {
      setWaitingRoom(data);
      setCurrentGame(null);
      console.log('Game waiting for players:', data.message);
    });

    newSocket.on('game:started', (data: { gameId: string; players: Player[]; state: GameState }) => {
      setCurrentGame(data.state);
      setWaitingRoom(null);
      console.log('Game started:', data.gameId);
    });

    newSocket.on('game:update', (data: { gameState: GameState; lastAction: GameAction }) => {
      setCurrentGame(data.gameState);
      console.log('Game updated, last action:', data.lastAction);
    });

    newSocket.on('game:roundEnd', (result: RoundResult) => {
      console.log('Round ended:', result);
      // Handle round end (show winners, update chips, etc.)
    });

    newSocket.on('game:ended', (data: { message: string }) => {
      console.log('Game ended:', data.message);
      setCurrentGame(null);
    });

    newSocket.on('player:left', (data: { playerId: string; username: string } | { gameId: string; player: { id: string; username: string }; totalPlayers: number; maxPlayers: number }) => {
      if ('playerId' in data) {
        console.log('Player left:', data.username);
        addNotification('warning', `${data.username} left the game`);
      } else {
        console.log('Player left game:', data.player.username);
        addNotification('warning', `${data.player.username} left the game`);
      }
    });

    newSocket.on('player:joined', (data: { gameId: string; player: { id: string; username: string }; totalPlayers: number; maxPlayers: number }) => {
      console.log('Player joined game:', data.player.username);
      addNotification('success', `${data.player.username} joined the game`);
    });

    newSocket.on('game:error', (message: string) => {
      console.error('Game error:', message);
      setError(message);
      addNotification('error', message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  useEffect(() => {
    const cleanup = initializeSocket();
    return () => cleanup?.();
  }, [initializeSocket]);

  const createGame = useCallback(() => {
    if (!socket || !isConnected) return;
    socket.emit('game:create');
  }, [socket, isConnected]);

  const joinGame = useCallback((gameId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('game:join', gameId);
  }, [socket, isConnected]);

  const leaveGame = useCallback(() => {
    if (!socket || !isConnected) return;
    
    const gameId = currentGame?.id || waitingRoom?.gameId;
    if (gameId) {
      socket.emit('game:leave', { gameId });
      setCurrentGame(null);
      setWaitingRoom(null);
    }
  }, [socket, isConnected, currentGame, waitingRoom]);

  const makeAction = useCallback((action: GameAction) => {
    if (!socket || !isConnected || !currentGame) return;
    socket.emit('game:action', {
      gameId: currentGame.id,
      action
    });
  }, [socket, isConnected, currentGame]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    initializeSocket();
  }, [initializeSocket]);

  const value = {
    socket,
    isConnected,
    onlineUsers,
    currentGame,
    availableGames,
    error,
    waitingRoom,
    notifications,
    createGame,
    joinGame,
    leaveGame,
    makeAction,
    reconnect,
    clearNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};