import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, Bot, Play, ArrowLeft, BarChart3, User, LogOut } from 'lucide-react';

const GameSelection = () => {
  const [selectedMode, setSelectedMode] = useState<'multiplayer' | 'ai' | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeInOut" }
    }
  };

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.4 }
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.2 }
    }
  };

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

        {/* Start Game Button */}
        {selectedMode && (
          <motion.div
            className="start-game-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link 
              to="/poker-game" 
              state={{ gameMode: selectedMode }}
              className="btn btn-primary btn-large"
            >
              <Play size={20} />
              Start {selectedMode === 'multiplayer' ? 'Multiplayer' : 'AI'} Game
            </Link>
          </motion.div>
        )}

       
      </motion.div>
    </div>
  );
};

export default GameSelection;