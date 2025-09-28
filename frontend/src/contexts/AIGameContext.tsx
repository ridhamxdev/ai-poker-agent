import React, { createContext, useContext, useState } from 'react';

interface AIGameState {
  gameId: string;
  players: any[];
  gameState: string;
  pot: number;
  communityCards: any[];
  currentTurn: number;
  currentBet: number;
  smallBlind: number;
  bigBlind: number;
  winner?: {
    playerId: string;
    winningHand: string;
    amount: number;
  };
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
      const response = await fetch('/api/ai-game/create', {
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
          gameState: data.data.gameState || 'preflop',
          pot: data.data.pot || 0,
          communityCards: data.data.communityCards || [],
          currentTurn: data.data.currentPlayer || data.data.currentTurn || 0,
          currentBet: data.data.currentBet || 0,
          smallBlind: data.data.smallBlind || 25,
          bigBlind: data.data.bigBlind || 50,
          winner: data.data.winner
        };
        console.log('AI Game created successfully:', gameState);
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
      const response = await fetch('/api/ai-game/action', {
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
        const gameStateData = data.data.gameState;
        const updatedGameState: AIGameState = {
          gameId: gameStateData.gameId,
          players: gameStateData.players || [],
          gameState: gameStateData.gameState || 'playing',
          pot: gameStateData.pot || 0,
          communityCards: gameStateData.communityCards || [],
          currentTurn: gameStateData.currentPlayer || gameStateData.currentTurn || 0,
          currentBet: gameStateData.currentBet || Math.max(...(gameStateData.players || []).map((p: any) => p.currentBet || 0)),
          smallBlind: gameStateData.smallBlind || 25,
          bigBlind: gameStateData.bigBlind || 50,
          winner: gameStateData.winner
        };
        console.log('Updated game state after action:', updatedGameState);
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
