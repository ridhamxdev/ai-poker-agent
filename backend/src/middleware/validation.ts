import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

interface ValidationError {
  message: string;
  details: any[];
}

const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const validationError: ValidationError = {
        message: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/"/g, ''),
          value: detail.context?.value
        }))
      };
      
      res.status(400).json({
        success: false,
        error: validationError
      });
      return;
    }
    
    next();
  };
};

// Authentication Schemas
export const registrationSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Game Schemas
export const createGameSchema = Joi.object({
  gameType: Joi.string()
    .valid('pvp', 'ai-training', 'ai-vs-human')
    .required()
    .messages({
      'any.only': 'Game type must be one of: pvp, ai-training, ai-vs-human',
      'any.required': 'Game type is required'
    }),
  aiDifficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'expert')
    .default('medium')
    .messages({
      'any.only': 'AI difficulty must be one of: easy, medium, hard, expert'
    }),
  buyIn: Joi.number()
    .integer()
    .min(100)
    .max(10000)
    .default(1000)
    .messages({
      'number.integer': 'Buy-in must be a whole number',
      'number.min': 'Buy-in must be at least 100 chips',
      'number.max': 'Buy-in cannot exceed 10,000 chips'
    })
});

export const joinGameSchema = Joi.object({
  gameId: Joi.string()
    .required()
    .messages({
      'any.required': 'Game ID is required'
    })
});

export const gameActionSchema = Joi.object({
  gameId: Joi.string()
    .required()
    .messages({
      'any.required': 'Game ID is required'
    }),
  action: Joi.string()
    .valid('fold', 'call', 'raise', 'check')
    .required()
    .messages({
      'any.only': 'Action must be one of: fold, call, raise, check',
      'any.required': 'Action is required'
    }),
  amount: Joi.number()
    .integer()
    .min(0)
    .max(100000)
    .default(0)
    .messages({
      'number.integer': 'Amount must be a whole number',
      'number.min': 'Amount cannot be negative',
      'number.max': 'Amount cannot exceed 100,000 chips'
    })
});

// AI Schemas
export const trainAISchema = Joi.object({
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'expert')
    .required()
    .messages({
      'any.only': 'Difficulty must be one of: easy, medium, hard, expert',
      'any.required': 'Difficulty is required'
    }),
  iterations: Joi.number()
    .integer()
    .min(100)
    .max(50000)
    .default(1000)
    .messages({
      'number.integer': 'Iterations must be a whole number',
      'number.min': 'Iterations must be at least 100',
      'number.max': 'Iterations cannot exceed 50,000'
    }),
  gameScenarios: Joi.array()
    .items(Joi.object())
    .optional()
});

export const aiDecisionSchema = Joi.object({
  gameId: Joi.string()
    .required()
    .messages({
      'any.required': 'Game ID is required'
    }),
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'expert')
    .default('medium')
    .messages({
      'any.only': 'Difficulty must be one of: easy, medium, hard, expert'
    })
});

export const updateAIDifficultySchema = Joi.object({
  gameId: Joi.string()
    .required()
    .messages({
      'any.required': 'Game ID is required'
    }),
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'expert')
    .required()
    .messages({
      'any.only': 'Difficulty must be one of: easy, medium, hard, expert',
      'any.required': 'Difficulty is required'
    })
});

export const personalitySchema = Joi.object({
  gameId: Joi.string()
    .required()
    .messages({
      'any.required': 'Game ID is required'
    }),
  personality: Joi.string()
    .valid('balanced', 'aggressive', 'defensive', 'exploitative')
    .required()
    .messages({
      'any.only': 'Personality must be one of: balanced, aggressive, defensive, exploitative',
      'any.required': 'Personality is required'
    })
});

// Query parameter validation
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be a whole number',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.integer': 'Limit must be a whole number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

// Validation middleware exports
export const validateRegistration = validateRequest(registrationSchema);
export const validateLogin = validateRequest(loginSchema);
export const validateCreateGame = validateRequest(createGameSchema);
export const validateJoinGame = validateRequest(joinGameSchema);
export const validateGameAction = validateRequest(gameActionSchema);
export const validateTrainAI = validateRequest(trainAISchema);
export const validateAIDecision = validateRequest(aiDecisionSchema);
export const validateUpdateAIDifficulty = validateRequest(updateAIDifficultySchema);
export const validatePersonality = validateRequest(personalitySchema);

// Query validation middleware
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = paginationSchema.validate(req.query, { abortEarly: false });
  
  if (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, '')
      }))
    });
    return;
  }
  
  req.query = value;
  next();
};
