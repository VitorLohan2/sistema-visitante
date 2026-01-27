import axios from "axios";
import logger from "../utils/logger";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001",
});

logger.log("API Base URL:", api.defaults.baseURL);

// Interceptor para adicionar o token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

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
      logger.log("Token inválido ou expirado, redirecionando para login");
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");

      // Evita loop: só redireciona se não estiver já na página de login
      if (
        window.location.pathname !== "/" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
