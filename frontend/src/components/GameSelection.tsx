import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Users, Bot, Play, ArrowLeft, BarChart3, User, LogOut } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import './GameSelection.css';

const GameSelection = () => {
  // ✅ CORRECT - All hooks are inside the component function
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth(); // Only call useAuth ONCE
  const { socket, isConnected, onlineUsers } = useSocket();
  
  const [selectedMode, setSelectedMode] = useState<'multiplayer' | 'ai' | null>(null);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);

  interface Game {
    id: string;
    host: string;
    players: string[];
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    console.log('No user found, redirecting to signin');
    navigate('/signin', { replace: true });
    return null;
  }

  // useEffect for socket setup
  useEffect(() => {
    console.log('GameSelection mounted, user:', user);
    
    if (socket) {
      console.log('Socket available, setting up listeners');
      
      // Socket event listeners
      socket.on('gameslist', (games) => {
        setAvailableGames(games);
      });

      socket.on('playerscount', (count) => {
        console.log('Online players:', count);
      });

      return () => {
        if (socket) {
          console.log('Cleaning up socket listeners');
          socket.off('gameslist');
          socket.off('playerscount');
        }
      };
    } else {
      console.log('Socket not available, but continuing with component rendering');
    }
  }, [socket, user]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1, delayChildren: 0.1 } 
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] } 
    }
  };

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.4 } },
    hover: { scale: 1.05, transition: { duration: 0.2 } }
  };

  const handleGameSelect = (mode: 'ai' | 'multiplayer') => {
    if (mode === 'multiplayer') {
      navigate('/lobby');
    } else {
      navigate('/poker-game', { state: { mode: 'ai' } });
    }
  };

  // Handle mode from location state
  useEffect(() => {
    const mode = location.state?.mode;
    if (mode) {
      handleGameSelect(mode as 'ai' | 'multiplayer');
    }
  }, [location.state]);

  return (
    <div className="game-selection-page">
      <motion.div
        className="container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header with Navigation */}
        <motion.div className="game-selection-header" variants={itemVariants}>
          <div className="header-left">
            <Link to="/" className="back-link">
              <ArrowLeft size={20} />
              Back to Home
            </Link>
            <h1>Game Dashboard</h1>
          </div>
          <div className="header-actions">
            <motion.button
              className="header-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BarChart3 size={20} />
              Stats
            </motion.button>
            <motion.button
              className="header-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <User size={20} />
              Profile
            </motion.button>
            <motion.button
              className="header-btn logout-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut size={20} />
              Logout
            </motion.button>
          </div>
        </motion.div>

        {/* Game Mode Selection */}
        <motion.div className="game-modes-section" variants={itemVariants}>
          <h2>Choose Your Game Mode</h2>
          <div className="game-modes-horizontal">
            <motion.div
              className={`game-mode-card-horizontal ${selectedMode === 'multiplayer' ? 'selected' : ''}`}
              variants={cardVariants}
              whileHover="hover"
              onClick={() => setSelectedMode('multiplayer')}
            >
              <div className="mode-icon-horizontal">
                <Users size={32} />
              </div>
              <div className="mode-content">
                <h3>Multiplayer</h3>
                <p>Play against real players online</p>
              </div>
            </motion.div>

            <motion.div
              className={`game-mode-card-horizontal ${selectedMode === 'ai' ? 'selected' : ''}`}
              variants={cardVariants}
              whileHover="hover"
              onClick={() => setSelectedMode('ai')}
            >
              <div className="mode-icon-horizontal">
                <Bot size={32} />
              </div>
              <div className="mode-content">
                <h3>AI Opponents</h3>
                <p>Challenge advanced AI players</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Game List Section */}
        {selectedMode === 'multiplayer' && (
          <motion.div
            className="game-list-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="game-list-header">
              <h2>Available Games</h2>
              <div className="online-status">
                <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
                <span className="online-count">
                  {onlineUsers.length} Players Online
                </span>
              </div>
            </div>
            <div className="game-list">
              {availableGames.length === 0 ? (
                <div className="no-games">
                  <p>No games available. Create one to start playing!</p>
                </div>
              ) : (
                availableGames.map((game) => (
                  <motion.div
                    key={game.id}
                    className="game-item"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="game-info">
                      <h3>Host: {game.host}</h3>
                      <p>Players: {game.players.length}/{game.maxPlayers}</p>
                      <span className={`game-status ${game.status}`}>
                        {game.status}
                      </span>
                    </div>
                    {game.status === 'waiting' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => socket?.emit('gamejoin', game.id)}
                      >
                        Join Game
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Start Game Button */}
        {selectedMode && (
          <motion.div
            className="start-game-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {selectedMode === 'ai' ? (
              <Link
                to="/poker-game"
                state={{ gameMode: 'ai' }}
                className="btn btn-primary btn-large"
              >
                <Play size={20} />
                Start AI Game
              </Link>
            ) : (
              <button
                className="btn btn-primary btn-large"
                onClick={() => navigate('/lobby')}
              >
                <Play size={20} />
                Join Multiplayer Lobby
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default GameSelection;
