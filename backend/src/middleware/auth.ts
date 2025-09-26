import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from '../types';

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const verifyToken = (token: string): AuthenticatedUser => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    return {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
};

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
      message: 'No token provided. Please login.',
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
      res.clearCookie('authToken');
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.',
      code: 'INVALID_TOKEN'
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
        res.clearCookie('authToken');
      }
    }
  }

  next();
};

export default authMiddleware;
