import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { 
  validateRegistration, 
  validateLogin,
  validateUpdateProfile,
  validateChangePassword 
} from '../middleware/validation';
import authMiddleware, { blacklistToken, getTokenFromRequest } from '../middleware/auth';
import { IUser, AuthenticatedUser } from '../types';

const router = express.Router();

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface UpdateProfileRequest {
  username?: string;
  email?: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Helper function to generate JWT token
const generateToken = (user: IUser): string => {
  return jwt.sign(
    { 
      userId: user._id.toString(), 
      email: user.email, 
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      version: 1
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Helper function to set auth cookie
const setAuthCookie = (res: Response, token: string): void => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  };
  
  res.cookie('authToken', token, cookieOptions);
};

// Helper function to clear auth cookie
const clearAuthCookie = (res: Response): void => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
};

// Register User
router.post('/register', validateRegistration, async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    console.log('Processing registration request for:', req.body.email);
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() }, 
        { username: username.toLowerCase().trim() }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) {
        res.status(409).json({
          success: false,
          message: 'An account with this email already exists',
          code: 'EMAIL_EXISTS'
        });
        return;
      } else {
        res.status(409).json({
          success: false,
          message: 'This username is already taken',
          code: 'USERNAME_EXISTS'
        });
        return;
      }
    }

    const user: IUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    await user.save();

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          chips: user.chips,
          level: user.level,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          totalWinnings: user.totalWinnings,
          experience: user.experience,
          createdAt: user.createdAt || new Date()
        }
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'Username or email already exists',
        code: 'DUPLICATE_USER'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login User
router.post('/login', validateLogin, async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    const isPasswordValid: boolean = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          chips: user.chips,
          level: user.level,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          totalWinnings: user.totalWinnings,
          experience: user.experience,
          winRate: user.gamesPlayed > 0 ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) : '0.0',
          lastLogin: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
});

// Logout User
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = getTokenFromRequest(req);

    if (token) {
      blacklistToken(token);
    }

    clearAuthCookie(res);
    
    res.json({
      success: true,
      message: 'Logged out successfully',
      data: {
        loggedOut: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Get Current User Profile
router.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    const winRate = user.gamesPlayed > 0 ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) : '0.0';
    const lossRate = user.gamesPlayed > 0 ? (((user.gamesPlayed - user.gamesWon) / user.gamesPlayed) * 100).toFixed(1) : '0.0';
    const averageWinnings = user.gamesWon > 0 ? Math.round(user.totalWinnings / user.gamesWon) : 0;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          chips: user.chips,
          level: user.level,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          gamesLost: user.gamesPlayed - user.gamesWon,
          totalWinnings: user.totalWinnings,
          experience: user.experience,
          winRate: parseFloat(winRate),
          lossRate: parseFloat(lossRate),
          averageWinnings,
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
          accountAge: user.createdAt ? Math.floor((new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0,
          rank: user.level >= 10 ? 'Expert' : user.level >= 5 ? 'Advanced' : 'Beginner'
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// Update User Profile
router.put('/profile', authMiddleware, validateUpdateProfile, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { username, email } = req.body as UpdateProfileRequest;

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ 
        username: username.toLowerCase().trim(),
        _id: { $ne: userId }
      });
      
      if (existingUsername) {
        res.status(409).json({
          success: false,
          message: 'Username already taken',
          code: 'USERNAME_EXISTS'
        });
        return;
      }
      user.username = username.trim();
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: userId }
      });
      
      if (existingEmail) {
        res.status(409).json({
          success: false,
          message: 'Email already registered',
          code: 'EMAIL_EXISTS'
        });
        return;
      }
      user.email = email.toLowerCase().trim();
    }

    await user.save();

    const newToken = generateToken(user);
    setAuthCookie(res, newToken);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        token: newToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          chips: user.chips,
          level: user.level,
          updatedAt: user.updatedAt || new Date()
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR'
    });
  }
});

// Change Password
router.put('/password', authMiddleware, validateChangePassword, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body as ChangePasswordRequest;

    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
      return;
    }

    user.password = newPassword;
    await user.save();

    const newToken = generateToken(user);
    setAuthCookie(res, newToken);

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        token: newToken,
        passwordChanged: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
});

// Verify Token
router.get('/verify', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        valid: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          chips: user.chips,
          level: user.level
        },
        tokenInfo: {
          userId: req.user!.userId,
          email: req.user!.email,
          username: req.user!.username,
          verified: true,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed',
      code: 'VERIFY_ERROR'
    });
  }
});

// Refresh Token
router.post('/refresh', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    const newToken = generateToken(user);
    setAuthCookie(res, newToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          chips: user.chips,
          level: user.level,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon
        },
        refreshed: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      code: 'REFRESH_ERROR'
    });
  }
});

// Add Balance (Chips)
router.post('/add-balance', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { amount } = req.body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000) {
      res.status(400).json({
        success: false,
        message: 'Invalid amount. Must be between 1 and 10,000 chips.',
        code: 'INVALID_AMOUNT'
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Add chips to user balance
    user.chips += amount;
    await user.save();

    res.json({
      success: true,
      message: `Successfully added ${amount} chips to your balance`,
      data: {
        newBalance: user.chips,
        addedAmount: amount
      }
    });

  } catch (error) {
    console.error('Add balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add balance',
      code: 'ADD_BALANCE_ERROR'
    });
  }
});

// Get User Statistics
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    const winRate = user.gamesPlayed > 0 ? ((user.gamesWon / user.gamesPlayed) * 100) : 0;
    const lossRate = 100 - winRate;
    const averageWinnings = user.gamesWon > 0 ? Math.round(user.totalWinnings / user.gamesWon) : 0;
    const netProfit = user.totalWinnings - (user.gamesPlayed * 1000);
    const experienceToNextLevel = (user.level * 1000) - user.experience;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          level: user.level,
          experience: user.experience,
          experienceToNextLevel: Math.max(0, experienceToNextLevel)
        },
        gameStats: {
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          gamesLost: user.gamesPlayed - user.gamesWon,
          winRate: parseFloat(winRate.toFixed(1)),
          lossRate: parseFloat(lossRate.toFixed(1))
        },
        financialStats: {
          currentChips: user.chips,
          totalWinnings: user.totalWinnings,
          averageWinnings,
          netProfit,
          profitability: netProfit >= 0 ? 'Profitable' : 'Loss'
        },
        achievements: {
          rank: user.level >= 10 ? 'Expert' : user.level >= 5 ? 'Advanced' : 'Beginner',
          accountAge: user.createdAt ? Math.floor((new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0,
          badges: [
            ...(user.gamesWon >= 10 ? ['Winner'] : []),
            ...(user.totalWinnings >= 50000 ? ['High Roller'] : []),
            ...(winRate >= 60 ? ['Skilled Player'] : [])
          ]
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
      code: 'STATS_ERROR'
    });
  }
});

export default router;
