import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  TrendingUp,
  Trophy,
  Target,
  Calendar,
  Award,
  DollarSign,
  Users,
  Clock,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Stats.css';

interface GameStats {
  user: {
    id: string;
    username: string;
    level: number;
    experience: number;
    experienceToNextLevel: number;
  };
  gameStats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    winRate: number;
    lossRate: number;
  };
  financialStats: {
    currentChips: number;
    totalWinnings: number;
    averageWinnings: number;
    netProfit: number;
    profitability: string;
  };
  achievements: {
    rank: string;
    accountAge: number;
    badges: string[];
  };
}

const Stats: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/stats`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-container">
          <div className="loading-spinner-large"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-page">
        <div className="stats-container">
          <p>Failed to load statistics</p>
        </div>
      </div>
    );
  }

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Winner': return '#10b981';
      case 'High Roller': return '#f59e0b';
      case 'Skilled Player': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Expert': return '#ef4444';
      case 'Advanced': return '#f59e0b';
      case 'Beginner': return '#10b981';
      default: return '#64748b';
    }
  };

  return (
    <div className="stats-page">
      <div className="stats-container">
        <motion.div 
          className="stats-header"
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
          <h1>Player Statistics</h1>
          <p>Track your poker performance and achievements</p>
        </motion.div>

        <div className="stats-content">
          {/* Overview Cards */}
          <motion.div 
            className="stats-overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="overview-card games-card">
              <div className="card-icon">
                <Users />
              </div>
              <div className="card-content">
                <h3>{stats.gameStats.gamesPlayed}</h3>
                <p>Games Played</p>
              </div>
            </div>

            <div className="overview-card wins-card">
              <div className="card-icon">
                <Trophy />
              </div>
              <div className="card-content">
                <h3>{stats.gameStats.gamesWon}</h3>
                <p>Games Won</p>
              </div>
            </div>

            <div className="overview-card winrate-card">
              <div className="card-icon">
                <Target />
              </div>
              <div className="card-content">
                <h3>{stats.gameStats.winRate}%</h3>
                <p>Win Rate</p>
              </div>
            </div>

            <div className="overview-card chips-card">
              <div className="card-icon">
                <DollarSign />
              </div>
              <div className="card-content">
                <h3>{stats.financialStats.currentChips.toLocaleString()}</h3>
                <p>Current Chips</p>
              </div>
            </div>
          </motion.div>

          {/* Detailed Stats Grid */}
          <div className="detailed-stats">
            {/* Game Performance */}
            <motion.div 
              className="stats-card performance-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="card-header">
                <BarChart3 className="card-icon" />
                <h3>Game Performance</h3>
              </div>
              <div className="performance-metrics">
                <div className="metric">
                  <span className="metric-label">Win/Loss Ratio</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill win-fill" 
                      style={{ width: `${stats.gameStats.winRate}%` }}
                    />
                  </div>
                  <span className="metric-value">
                    {stats.gameStats.gamesWon}W / {stats.gameStats.gamesLost}L
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Success Rate</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill success-fill" 
                      style={{ width: `${stats.gameStats.winRate}%` }}
                    />
                  </div>
                  <span className="metric-value">{stats.gameStats.winRate}% wins</span>
                </div>
              </div>
            </motion.div>

            {/* Financial Stats */}
            <motion.div 
              className="stats-card financial-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="card-header">
                <DollarSign className="card-icon" />
                <h3>Financial Statistics</h3>
              </div>
              <div className="financial-metrics">
                <div className="financial-item">
                  <span className="label">Total Winnings</span>
                  <span className="value positive">
                    +{stats.financialStats.totalWinnings.toLocaleString()}
                  </span>
                </div>
                <div className="financial-item">
                  <span className="label">Average Winnings</span>
                  <span className="value">
                    {stats.financialStats.averageWinnings.toLocaleString()}
                  </span>
                </div>
                <div className="financial-item">
                  <span className="label">Net Profit</span>
                  <span className={`value ${stats.financialStats.netProfit >= 0 ? 'positive' : 'negative'}`}>
                    {stats.financialStats.netProfit >= 0 ? '+' : ''}
                    {stats.financialStats.netProfit.toLocaleString()}
                  </span>
                </div>
                <div className="financial-item">
                  <span className="label">Profitability</span>
                  <span className={`value ${stats.financialStats.profitability === 'Profitable' ? 'positive' : 'negative'}`}>
                    {stats.financialStats.profitability}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Level Progress */}
            <motion.div 
              className="stats-card level-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="card-header">
                <TrendingUp className="card-icon" />
                <h3>Level Progress</h3>
              </div>
              <div className="level-content">
                <div className="level-info">
                  <div className="current-level">
                    <span className="level-number">{stats.user.level}</span>
                    <span className="level-label">Current Level</span>
                  </div>
                  <div className="next-level">
                    <span className="level-number">{stats.user.level + 1}</span>
                    <span className="level-label">Next Level</span>
                  </div>
                </div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${((stats.user.experience) / (stats.user.experience + stats.user.experienceToNextLevel)) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="progress-text">
                    <span>{stats.user.experience} XP</span>
                    <span>{stats.user.experienceToNextLevel} XP to next level</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Achievements */}
            <motion.div 
              className="stats-card achievements-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="card-header">
                <Award className="card-icon" />
                <h3>Achievements</h3>
              </div>
              <div className="achievements-content">
                <div className="rank-info">
                  <div className="rank-badge" style={{ backgroundColor: getRankColor(stats.achievements.rank) }}>
                    <Award size={20} />
                    <span>{stats.achievements.rank}</span>
                  </div>
                  <div className="account-info">
                    <Calendar size={16} />
                    <span>{stats.achievements.accountAge} days playing</span>
                  </div>
                </div>
                <div className="badges-section">
                  <h4>Earned Badges</h4>
                  {stats.achievements.badges.length > 0 ? (
                    <div className="badges-list">
                      {stats.achievements.badges.map((badge, index) => (
                        <div 
                          key={index}
                          className="badge"
                          style={{ backgroundColor: getBadgeColor(badge) }}
                        >
                          <Trophy size={14} />
                          <span>{badge}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-badges">No badges earned yet. Keep playing to unlock achievements!</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;


