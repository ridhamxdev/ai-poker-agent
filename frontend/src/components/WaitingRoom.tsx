import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { Users, Clock, UserPlus, ArrowLeft, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import './WaitingRoom.css';

const WaitingRoom: React.FC = () => {
  const { waitingRoom, leaveGame, onlineUsers } = useSocket();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState<number | null>(null);

  // Start countdown when we have enough players
  useEffect(() => {
    if (waitingRoom && waitingRoom.playersNeeded === 0) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [waitingRoom]);

  if (!waitingRoom) {
    return null;
  }

  const getPlayerInitials = (username: string) => {
    return username.split(' ').map(name => name[0]).join('').toUpperCase();
  };

  const availablePlayersToInvite = onlineUsers.filter(onlineUser => 
    !waitingRoom.players.some(player => player.id === onlineUser.id)
  );

  return (
    <div className="waiting-room">
      <div className="waiting-room-container">
        {/* Header */}
        <motion.div 
          className="waiting-room-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-left">
            <button 
              onClick={leaveGame}
              className="back-button"
            >
              <ArrowLeft size={20} />
              Leave Game
            </button>
            <div>
              <h1 className="room-title">Waiting Room</h1>
              <p className="room-subtitle">Game #{waitingRoom.gameId.slice(-6)}</p>
            </div>
          </div>
          
          {countdown !== null && (
            <motion.div 
              className="countdown"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={countdown}
            >
              <div className="countdown-circle">
                <span className="countdown-number">{countdown}</span>
              </div>
              <p>Game starting...</p>
            </motion.div>
          )}
        </motion.div>

        {/* Status Message */}
        <motion.div 
          className="status-section"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="status-card">
            <div className="status-icon">
              {waitingRoom.playersNeeded > 0 ? (
                <UserPlus size={32} />
              ) : (
                <Users size={32} />
              )}
            </div>
            
            <div className="status-content">
              <h2>
                {waitingRoom.playersNeeded > 0 
                  ? `Waiting for ${waitingRoom.playersNeeded} more player${waitingRoom.playersNeeded === 1 ? '' : 's'}`
                  : 'Ready to start!'
                }
              </h2>
              <p className="status-message">{waitingRoom.message}</p>
              
              <div className="player-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(waitingRoom.players.length / 3) * 100}%` }}
                  />
                </div>
                <span className="progress-text">
                  {waitingRoom.players.length}/3 minimum players
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Current Players */}
        <motion.div 
          className="players-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="section-header">
            <h3>
              <Users size={24} />
              Players in Game ({waitingRoom.players.length})
            </h3>
          </div>
          
          <div className="players-grid">
            <AnimatePresence>
              {waitingRoom.players.map((player, index) => (
                <motion.div
                  key={player.id}
                  className={`player-card ${player.id === user?.id ? 'current-user' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="player-avatar">
                    {getPlayerInitials(player.username)}
                    {index === 0 && (
                      <div className="host-crown">
                        <Crown size={12} />
                      </div>
                    )}
                  </div>
                  
                  <div className="player-details">
                    <h4>
                      {player.username}
                      {player.id === user?.id && <span className="you-label">(You)</span>}
                    </h4>
                    <div className="player-meta">
                      {index === 0 && <span className="host-badge">Host</span>}
                      <span className="chips">💰 {player.chips.toLocaleString()} chips</span>
                    </div>
                  </div>
                  
                  <div className="player-status">
                    <div className="status-indicator ready"></div>
                    <span>Ready</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Available Players to Invite */}
        {availablePlayersToInvite.length > 0 && waitingRoom.playersNeeded > 0 && (
          <motion.div 
            className="invite-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="section-header">
              <h3>
                <UserPlus size={24} />
                Available Players ({availablePlayersToInvite.length})
              </h3>
              <p>These players can join your game</p>
            </div>
            
            <div className="available-players-grid">
              {availablePlayersToInvite.slice(0, 6).map((availablePlayer, index) => (
                <motion.div
                  key={availablePlayer.id}
                  className="available-player-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="player-avatar small">
                    {getPlayerInitials(availablePlayer.username)}
                    <div className="online-indicator"></div>
                  </div>
                  <div className="player-info">
                    <h5>{availablePlayer.username}</h5>
                    <span className="online-status">Online</span>
                  </div>
                </motion.div>
              ))}
              
              {availablePlayersToInvite.length > 6 && (
                <div className="more-players">
                  +{availablePlayersToInvite.length - 6} more
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tips */}
        <motion.div 
          className="tips-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="tips-card">
            <Clock size={20} />
            <div>
              <h4>💡 Tips while you wait:</h4>
              <ul>
                <li>The game will start automatically when 3 players join</li>
                <li>Share the game link with friends to fill up faster</li>
                <li>Maximum 6 players can join this game</li>
                <li>Each player starts with {waitingRoom.players[0]?.chips.toLocaleString()} chips</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default WaitingRoom;

