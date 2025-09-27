import axios from 'axios';

import { API_BASE_URL } from './config';

// API response types
interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    chips: number;
  };
  message?: string;
}
// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL; 
const api = {
  signUp: async (data: { name: string; email: string; password: string }) => {
    const response = await axios.post<AuthResponse>('/api/auth/register', {
      username: data.name,
      email: data.email,
      password: data.password
    });
    return response.data;
  },

  signIn: async (data: { email: string; password: string }) => {
    const response = await axios.post<AuthResponse>('/api/auth/login', {
      email: data.email,
      password: data.password
    });
    return response.data;
  },

  signOut: async () => {
    const response = await axios.post<{ message: string }>('/api/auth/logout');
    return response.data;
  },

  verifyAuth: async () => {
    const response = await axios.get<AuthResponse>('/api/auth/verify');
    return response.data;
  }
};

export default api;
