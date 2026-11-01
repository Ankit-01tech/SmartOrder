import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });

// Use sessionStorage so each browser tab has an independent session
// (fixes the multi-window Student+Kitchen+Admin interference bug)
export const getToken = () =>
  sessionStorage.getItem('cq_token') || localStorage.getItem('cq_token');

export const setToken = (token: string) => {
  sessionStorage.setItem('cq_token', token);
  // Do NOT write to localStorage — keeps tabs independent
};

export const clearToken = () => {
  sessionStorage.removeItem('cq_token');
  localStorage.removeItem('cq_token');
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
