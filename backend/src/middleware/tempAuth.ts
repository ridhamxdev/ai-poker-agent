// Temporary in-memory authentication for testing
import { Request, Response, NextFunction } from 'express';

export interface TempAuthenticatedRequest extends Request {
  user?: {
    userId: string;
    id: string;
    email: string;
    username: string;
  };
}

// Simple in-memory "user" for testing
const TEMP_USER = {
  userId: 'temp_user_123',
  id: 'temp_user_123',
  email: 'test@example.com',
  username: 'TestUser'
};

export const tempAuthMiddleware = (req: TempAuthenticatedRequest, res: Response, next: NextFunction): void => {
  // For testing, always authenticate as the temp user
  req.user = TEMP_USER;
  next();
};

export default tempAuthMiddleware;
