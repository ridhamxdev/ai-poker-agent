import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bot, Users, Target, ArrowLeft, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAIGame } from '../contexts/AIGameContext';
import './AIGameSetup.css';

interface AIGameConfig {
  minAIPlayers: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

const AIGameSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createAIGame, isLoading, error } = useAIGame();
  const [config, setConfig] = useState<AIGameConfig>({
    minAIPlayers: 2,
    difficulty: 'medium'
  });

  const handleCreateGame = async () => {
    if (!user) return;

    const success = await createAIGame(config);
    
    if (success) {
      // Navigate to the game - the AIGameContext will provide the game state
      navigate('/poker-game', { 
        state: { 
          mode: 'ai'
        } 
      });
    } else {
      // Error is handled by the context and displayed in the UI
      console.error('Failed to create AI game:', error);
    }
  };

  const difficultyInfo = {
    easy: {
      description: 'Beginner bots with conservative play (Max bet: 300)',
      color: '#10b981',
      bots: ['Bot_Novice', 'Bot_Beginner']
    },
    medium: {
      description: 'Skilled bots with balanced strategy (Max bet: 600)',
      color: '#f59e0b',
      bots: ['Bot_Skilled', 'Bot_Pro']
    },
    hard: {
      description: 'Expert bots with aggressive tactics (Max bet: 900)',
      color: '#ef4444',
      bots: ['Bot_Expert', 'Bot_Master']
    }
  };

  return (
    <div className="ai-game-setup">
      <div className="setup-container">
        <motion.div 
          className="setup-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button 
            className="back-button"
            onClick={() => navigate('/game-selection')}
          >
            <ArrowLeft size={20} />
            Back to Game Selection
          </button>
          <h1>AI Game Setup</h1>
          <p>Configure your poker game against AI opponents</p>
        </motion.div>

        <motion.div 
          className="setup-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Player Count Selection */}
          <div className="config-section">
            <div className="section-header">
              <Users className="section-icon" />
              <h3>Number of AI Players</h3>
            </div>
            <div className="player-count-options">
              {[1, 2, 3, 4, 5].map(count => (
                <motion.button
                  key={count}
                  className={`count-option ${config.minAIPlayers === count ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, minAIPlayers: count }))}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Bot size={20} />
                  <span>{count} AI</span>
                </motion.button>
              ))}
            </div>
            <p className="section-description">
              Choose how many AI opponents you want to play against (1-5)
            </p>
          </div>

          {/* Difficulty Selection */}
          <div className="config-section">
            <div className="section-header">
              <Target className="section-icon" />
              <h3>AI Difficulty</h3>
            </div>
            <div className="difficulty-options">
              {Object.entries(difficultyInfo).map(([level, info]) => (
                <motion.button
                  key={level}
                  className={`difficulty-option ${config.difficulty === level ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, difficulty: level as any }))}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ '--accent-color': info.color } as React.CSSProperties}
                >
                  <div className="difficulty-header">
                    <h4>{level.charAt(0).toUpperCase() + level.slice(1)}</h4>
                    <div className="difficulty-indicator" style={{ backgroundColor: info.color }} />
                  </div>
                  <p className="difficulty-description">{info.description}</p>
                  <div className="bot-list">
                    {info.bots.map(bot => (
                      <span key={bot} className="bot-name">{bot}</span>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Game Summary */}
          <div className="game-summary">
            <h3>Game Summary</h3>
            <div className="summary-details">
              <div className="summary-item">
                <span className="label">Total Players:</span>
                <span className="value">{config.minAIPlayers + 1} (You + {config.minAIPlayers} AI)</span>
              </div>
              <div className="summary-item">
                <span className="label">Difficulty:</span>
                <span className="value" style={{ color: difficultyInfo[config.difficulty].color }}>
                  {config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Your Balance:</span>
                <span className="value">{user?.chips?.toLocaleString()} chips</span>
              </div>
            </div>
          </div>

          {/* Create Game Button */}
          <motion.button
            className="create-game-button"
            onClick={handleCreateGame}
            disabled={isLoading || !user || user.chips < 1000}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <div className="loading-spinner" />
            ) : (
              <>
                <Play size={20} />
                Create AI Game
              </>
            )}
          </motion.button>

          {error && (
            <div className="error-message">
              <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '1rem' }}>
                {error}
              </p>
            </div>
          )}


          {user && user.chips < 1000 && (
            <div className="insufficient-chips-warning">
              <p>You need at least 1,000 chips to play. 
                <button 
                  className="add-chips-link"
                  onClick={() => navigate('/profile')}
                >
                  Add chips in your profile
                </button>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AIGameSetup;


