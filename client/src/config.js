const isProduction = import.meta.env.PROD || import.meta.env.VITE_NODE_ENV === 'production';

const renderLink = "https://resq-f27.onrender.com";
const herokuLink = "https://resq-api-f0aa1cfc88e2.herokuapp.com/";

export const config = {
  isProduction,
  API_URL: isProduction 
    ? herokuLink
    : (import.meta.env.VITE_API_URL || 'http://localhost:8080'),
  SOCKET_URL: isProduction 
    ? herokuLink
    : (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080'),
};

