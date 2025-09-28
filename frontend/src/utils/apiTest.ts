// Utility to test API authentication
export const testAuth = async () => {
  try {
    const response = await fetch('/api/auth/profile', {
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Auth test result:', data);
    return data;
  } catch (error) {
    console.error('Auth test error:', error);
    return null;
  }
};

export const testAIGameCreate = async () => {
  try {
    const response = await fetch('/api/ai-game/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        minAIPlayers: 2,
        difficulty: 'medium'
      })
    });
    
    const data = await response.json();
    console.log('AI Game create test result:', data);
    return data;
  } catch (error) {
    console.error('AI Game create test error:', error);
    return null;
  }
};
