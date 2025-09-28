import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Trophy, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Award,
  ArrowLeft,
  Plus,
  Coins
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

interface UserStats {
  user: {
    id: string;
    username: string;
    email: string;
    chips: number;
    level: number;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    totalWinnings: number;
    experience: number;
    winRate: number;
    lossRate: number;
    averageWinnings: number;
    createdAt: string;
    accountAge: number;
    rank: string;
  };
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [addBalanceAmount, setAddBalanceAmount] = useState('');
  const [isAddingBalance, setIsAddingBalance] = useState(false);
  const [showAddBalance, setShowAddBalance] = useState(false);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBalance = async () => {
    const amount = parseInt(addBalanceAmount);
    if (!amount || amount <= 0 || amount > 10000) {
      alert('Please enter a valid amount between 1 and 10,000');
      return;
    }

    setIsAddingBalance(true);
    try {
      const response = await fetch('/api/auth/add-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ amount })
      });

      const data = await response.json();
      if (data.success) {
        // Update user context
        if (user) {
          updateUser({ ...user, chips: data.data.newBalance });
        }
        
        // Refresh stats
        await fetchUserStats();
        
        setAddBalanceAmount('');
        setShowAddBalance(false);
        alert(`Successfully added ${amount} chips to your balance!`);
      } else {
        alert(data.message || 'Failed to add balance');
      }
    } catch (error) {
      console.error('Error adding balance:', error);
      alert('Failed to add balance. Please try again.');
    } finally {
      setIsAddingBalance(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="loading-spinner-large"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>Failed to load profile data</p>
        </div>
      </div>
    );
  }

  const { user: userStats } = stats;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <motion.div 
          className="profile-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button 
            className="back-button"
            onClick={() => navigate('/game-selection')}
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1>Player Profile</h1>
        </motion.div>

        <div className="profile-content">
          {/* User Info Card */}
          <motion.div 
            className="profile-card user-info-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="card-header">
              <User className="card-icon" />
              <h3>Player Information</h3>
            </div>
            <div className="user-info">
              <div className="user-avatar">
                <span>{userStats.username.charAt(0).toUpperCase()}</span>
              </div>
              <div className="user-details">
                <h2>{userStats.username}</h2>
                <p className="user-email">{userStats.email}</p>
                <div className="user-rank">
                  <Award size={16} />
                  <span>{userStats.rank}</span>
                  <span className="level">Level {userStats.level}</span>
                </div>
                <div className="account-age">
                  <Calendar size={16} />
                  <span>{userStats.accountAge} days old</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Balance Card */}
          <motion.div 
            className="profile-card balance-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="card-header">
              <Coins className="card-icon" />
              <h3>Chip Balance</h3>
            </div>
            <div className="balance-content">
              <div className="balance-amount">
                <DollarSign size={24} />
                <span>{userStats.chips.toLocaleString()}</span>
                <small>chips</small>
              </div>
              <button 
                className="add-balance-btn"
                onClick={() => setShowAddBalance(true)}
              >
                <Plus size={18} />
                Add Chips
              </button>
            </div>
          </motion.div>

          {/* Game Statistics */}
          <motion.div 
            className="profile-card stats-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="card-header">
              <Trophy className="card-icon" />
              <h3>Game Statistics</h3>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{userStats.gamesPlayed}</div>
                <div className="stat-label">Games Played</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats.gamesWon}</div>
                <div className="stat-label">Games Won</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats.winRate.toFixed(1)}%</div>
                <div className="stat-label">Win Rate</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats.totalWinnings.toLocaleString()}</div>
                <div className="stat-label">Total Winnings</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats.averageWinnings.toLocaleString()}</div>
                <div className="stat-label">Avg Winnings</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats.experience}</div>
                <div className="stat-label">Experience</div>
              </div>
            </div>
          </motion.div>

          {/* Performance Chart Placeholder */}
          <motion.div 
            className="profile-card performance-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="card-header">
              <TrendingUp className="card-icon" />
              <h3>Performance Overview</h3>
            </div>
            <div className="performance-content">
              <div className="performance-item">
                <span className="performance-label">Win/Loss Ratio</span>
                <div className="performance-bar">
                  <div 
                    className="performance-fill win-fill" 
                    style={{ width: `${userStats.winRate}%` }}
                  />
                </div>
                <span className="performance-value">{userStats.winRate.toFixed(1)}% wins</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Profitability</span>
                <div className="performance-bar">
                  <div 
                    className="performance-fill profit-fill" 
                    style={{ width: `${Math.min((userStats.totalWinnings / (userStats.chips + userStats.totalWinnings)) * 100, 100)}%` }}
                  />
                </div>
                <span className="performance-value">
                  {userStats.totalWinnings >= 0 ? 'Profitable' : 'Loss'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Add Balance Modal */}
        {showAddBalance && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowAddBalance(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Add Chips to Balance</h3>
              <p>Enter the amount of chips you want to add (1 - 10,000)</p>
              <div className="amount-input-container">
                <DollarSign size={20} />
                <input
                  type="number"
                  value={addBalanceAmount}
                  onChange={(e) => setAddBalanceAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  max="10000"
                  disabled={isAddingBalance}
                />
                <span>chips</span>
              </div>
              <div className="modal-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowAddBalance(false)}
                  disabled={isAddingBalance}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-btn"
                  onClick={handleAddBalance}
                  disabled={isAddingBalance || !addBalanceAmount}
                >
                  {isAddingBalance ? (
                    <div className="loading-spinner" />
                  ) : (
                    'Add Chips'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Profile;


