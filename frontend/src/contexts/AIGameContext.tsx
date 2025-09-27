import React, { createContext, useContext, useState } from 'react';

interface AIGameState {
  gameId: string;
  players: any[];
  gameState: string;
  pot: number;
  communityCards: any[];
  currentTurn: number;
  currentBet: number;
}

interface AIGameContextType {
  currentAIGame: AIGameState | null;
  setCurrentAIGame: (game: AIGameState | null) => void;
  createAIGame: (config: { minAIPlayers: number; difficulty: string }) => Promise<boolean>;
  makeAIAction: (action: any) => Promise<boolean>;
  leaveAIGame: () => void;
  isLoading: boolean;
  error: string | null;
}

const AIGameContext = createContext<AIGameContextType | undefined>(undefined);

export const AIGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAIGame, setCurrentAIGame] = useState<AIGameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAIGame = async (config: { minAIPlayers: number; difficulty: string }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/ai-game/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      const data = await response.json();
      
      if (data.success) {
        const gameState: AIGameState = {
          gameId: data.data.gameId,
          players: data.data.players || [],
          gameState: data.data.gameState || 'waiting',
          pot: data.data.pot || 0,
          communityCards: data.data.communityCards || [],
          currentTurn: data.data.currentTurn || 0,
          currentBet: data.data.currentBet || 0
        };
        setCurrentAIGame(gameState);
        return true;
      } else {
        setError(data.message || 'Failed to create AI game');
        return false;
      }
    } catch (error) {
      console.error('Error creating AI game:', error);
      setError('Network error. Please check if the backend server is running.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const makeAIAction = async (action: any): Promise<boolean> => {
    if (!currentAIGame) return false;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/ai-game/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          gameId: currentAIGame.gameId,
          action
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedGameState: AIGameState = {
          gameId: data.data.gameState.gameId,
          players: data.data.gameState.players || [],
          gameState: data.data.gameState.gameState || 'playing',
          pot: data.data.gameState.pot || 0,
          communityCards: data.data.gameState.communityCards || [],
          currentTurn: data.data.gameState.currentTurn || 0,
          currentBet: data.data.gameState.currentBet || 0
        };
        setCurrentAIGame(updatedGameState);
        return true;
      } else {
        setError(data.message || 'Failed to process action');
        return false;
      }
    } catch (error) {
      console.error('Error making AI action:', error);
      setError('Network error during action');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const leaveAIGame = () => {
    setCurrentAIGame(null);
    setError(null);
  };

  return (
    <AIGameContext.Provider
      value={{
        currentAIGame,
        setCurrentAIGame,
        createAIGame,
        makeAIAction,
        leaveAIGame,
        isLoading,
        error
      }}
    >
      {children}
    </AIGameContext.Provider>
  );
};

export const useAIGame = () => {
  const context = useContext(AIGameContext);
  if (context === undefined) {
    throw new Error('useAIGame must be used within an AIGameProvider');
  }
  return context;
};
