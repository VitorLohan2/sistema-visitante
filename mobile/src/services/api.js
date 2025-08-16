import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Força sempre o uso do IP local da sua máquina
const api = axios.create({
  baseURL: process.env.API_URL || 'http://192.168.10.27:3333', // Substitua pelo seu IP real baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3333' / baseURL: 'https://sistema-visitante.onrender.com'
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Interceptores com logs detalhados
api.interceptors.request.use(async (config) => {

  console.log('📡 Requisição para:', {
    url: `${config.baseURL}${config.url}`,
    method: config.method,
    data: config.data
  });

  return config;
}, (error) => {
  console.error('Erro no interceptor de requisição:', error);
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  console.log('✅ Resposta recebida:', {
    status: response.status,
    url: response.config.url,
    data: response.data
  });
  return response;
}, (error) => {
  const errorDetails = {
    message: error.message,
    code: error.code,
    url: error.config?.url,
    status: error.response?.status,
    responseData: error.response?.data
  };

  console.error('❌ Erro na resposta:', errorDetails);

  if (error.response?.status === 401) {
    AsyncStorage.multiRemove(['@Auth:ongId', '@Auth:ongName']);
  }

  return Promise.reject(error);
});

export default api;
