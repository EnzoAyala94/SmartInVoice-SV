import axios from 'axios';

// En desarrollo local usa el proxy de Vite ('/api' -> localhost:4000).
// En produccion, define VITE_API_URL con la URL completa de tu backend
// (por ejemplo: https://mi-backend.onrender.com/api).
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export default api;
