import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Create an array of endpoints that should NEVER trigger a token refresh
    const excludedEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

    // Check if it's a 401, we haven't retried, AND it's not an excluded endpoint
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !excludedEndpoints.includes(originalRequest.url)
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await api.post('/api/auth/refresh');
        const { accessToken } = refreshRes.data;
        
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        delete api.defaults.headers.common['Authorization'];
        return Promise.reject(refreshError);
      }
    }
    
    // If it's a login 401, it will skip the if-block and reject normally here
    return Promise.reject(error);
  }
);

export default api;