import axios from 'axios';

const api = axios.create({
  baseURL: '', // Proxied via Vite
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Inject Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Inject Vault Token if present in state/localStorage
    const vaultToken = localStorage.getItem('vaultToken');
    if (vaultToken) {
      config.headers['x-vault-token'] = vaultToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const rToken = localStorage.getItem('refreshToken');
      
      if (rToken) {
        try {
          console.log('[API] Access token expired, attempting refresh...');
          const res = await axios.post('/api/auth/refresh', { refreshToken: rToken });
          const newAccessToken = res.data.accessToken;
          
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          return api(originalRequest); // Retry original request
        } catch (refreshError) {
          console.error('[API] Refresh token expired, logging out.');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('vaultToken');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
