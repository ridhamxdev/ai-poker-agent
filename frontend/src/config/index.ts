// Handle environment variables safely for browser
const getEnvVar = (name: string, defaultValue: string): string => {
    // In browser environment, only REACT_APP_ prefixed variables are available
    if (typeof window !== 'undefined') {
      return (window as any).__ENV__?.[name] || defaultValue;
    }
    
    // For build-time, these will be replaced by webpack
    const envValue = process.env[name];
    return envValue || defaultValue;
  };
  
  // Use empty string to rely on relative URLs with Vite's proxy in development
  export const API_BASE_URL = getEnvVar('REACT_APP_API_URL', '');
  export const SOCKET_URL = getEnvVar('REACT_APP_SOCKET_URL', 'http://localhost:5000');
  