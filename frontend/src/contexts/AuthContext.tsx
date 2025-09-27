import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';


interface User {
  id: string;
  username: string;
  email: string;
  chips: number;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: User;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
axios.defaults.withCredentials = true;
// Remove this line as it's causing the issue
// axios.defaults.baseURL = '/api';
// const API_BASE_URL = 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verify auth status on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await axios.get<AuthResponse>('/api/auth/verify');
        if (response.data && response.data.success && response.data.data?.user) {
          setUser(response.data.data.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.log('Auth verification failed:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post<AuthResponse>('/api/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      // Check if login was successful and has required data
      if (response.data && response.data.success && response.data.data?.user) {
        const userData = response.data.data.user;
        setUser(userData);
        setIsAuthenticated(true);
        
        // Store token if your backend sends one
        if (response.data.data.token) {
          localStorage.setItem('token', response.data.data.token);
        }
        
        console.log('User authenticated successfully:', userData);
      } else {
        throw new Error('Invalid login response structure');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Network error occurred');
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await axios.post<AuthResponse>('/api/auth/register', {
        username,
        email,
        password
      });
      
      if (response.data && response.data.success && response.data.data?.user) {
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        
        if (response.data.data.token) {
          localStorage.setItem('token', response.data.data.token);
        }
      } else {
        throw new Error('Invalid registration response structure');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Network error occurred');
    }
  };

  const logout = async () => {
    try {
      await axios.post<{ message: string }>('/api/auth/logout');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error: any) {
      console.error('Logout error:', error.response?.data?.message || 'Unknown error');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        register,
        logout,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};