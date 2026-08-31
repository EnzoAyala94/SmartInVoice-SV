import axios from 'axios';

const base = import.meta.env.VITE_API_URL || '/api';
export const PORTAL_API_BASE = `${base}/portal`;

const portalApi = axios.create({
  baseURL: PORTAL_API_BASE,
  withCredentials: true,
});

export default portalApi;
