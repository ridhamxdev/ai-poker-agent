import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { validateRegistration, validateLogin } from '../middleware/validation';
import authMiddleware from '../middleware/auth';
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

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const createUserResponse = (user: any) => {
  const {
    _id: id,
    username,
    email,
    chips,
    level,
    gamesPlayed,
    gamesWon,
    totalWinnings,
    experience,
    createdAt,
    updatedAt
  } = user;

  const winRate = gamesPlayed > 0 ? parseFloat(((gamesWon / gamesPlayed) * 100).toFixed(1)) : 0;

  return {
    id,
    username,
    email,
    chips,
    level,
    gamesPlayed,
    gamesWon,
    totalWinnings,
    experience,
    winRate,
    createdAt,
    updatedAt
  };
};

// Helper function to set auth cookie
const setAuthCookie = (res: Response, token: string) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  };
  
  res.cookie('authToken', token, cookieOptions);
};

// Register
router.post('/register', validateRegistration, async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser: IUser | null = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
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

    // Create new user
    const user: IUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        username: user.username 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Set auth cookie
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: createUserResponse(user)
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

// Login
router.post('/login', validateLogin, async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
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

    // Check password
    const isPasswordValid: boolean = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        username: user.username 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Set auth cookie
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: createUserResponse(user)
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

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user profile
router.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId).select('-password');
    
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
      data: {
        user: createUserResponse(user)
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

// Verify token endpoint
router.get('/verify', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId).select('-password');
    
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
        user: createUserResponse(user)
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify token',
      code: 'VERIFY_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Generate new token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        username: user.username 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Set new auth cookie
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
        user: createUserResponse(user)
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

export default router;
