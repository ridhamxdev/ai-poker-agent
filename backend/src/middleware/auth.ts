import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from '../types';

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Token blacklist (in production, use Redis)
const blacklistedTokens = new Set<string>();

// Enhanced token verification with blacklist check
export const verifyToken = (token: string): AuthenticatedUser => {
  try {
    // Check if token is blacklisted
    if (blacklistedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Validate token structure
    if (!decoded.userId || !decoded.email) {
      throw new Error('Invalid token structure');
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username || 'Unknown'
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

// Enhanced authentication middleware
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // Try to get token from Authorization header first, then from cookies
  let token: string | undefined;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please login.',
      code: 'NO_TOKEN'
    });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    // Clear invalid cookie
    if (req.cookies && req.cookies.authToken) {
      res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
    }
    
    const errorMessage = (error as Error).message;
    let code = 'INVALID_TOKEN';
    
    if (errorMessage.includes('expired')) {
      code = 'TOKEN_EXPIRED';
    } else if (errorMessage.includes('revoked')) {
      code = 'TOKEN_REVOKED';
    }
    
    res.status(401).json({
      success: false,
      message: `Authentication failed: ${errorMessage}`,
      code
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  let token: string | undefined;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Clear invalid cookie but don't fail
      if (req.cookies && req.cookies.authToken) {
        res.clearCookie('authToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/'
        });
      }
    }
  }

  next();
};

// Helper function to add token to blacklist
export const blacklistToken = (token: string): void => {
  blacklistedTokens.add(token);
  // In production, you might want to store this in Redis with expiration
  // redisClient.setex(`blacklist_${token}`, 7*24*60*60, 'true');
};

// Helper function to check if token is blacklisted
export const isTokenBlacklisted = (token: string): boolean => {
  return blacklistedTokens.has(token);
};

// Helper function to get token from request
export const getTokenFromRequest = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  } else if (req.cookies && req.cookies.authToken) {
    return req.cookies.authToken;
  }
  return undefined;
};

export default authMiddleware;
