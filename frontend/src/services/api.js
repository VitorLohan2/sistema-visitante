import axios from 'axios'

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3333'
})

console.log('🌐 API baseURL:', api); // Verifique no console
console.log('API Base URL:', api.defaults.baseURL); // Verifique no console

// Interceptor para adicionar o token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('ongId');
      localStorage.removeItem('ongName');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api