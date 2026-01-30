import axios from "axios";
import logger from "../utils/logger";
import { forceUpdateCheck } from "./versionService";

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

// Contador de erros consecutivos para detectar loops
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => {
    // Reset contador de erros em caso de sucesso
    consecutiveErrors = 0;
    return response;
  },
  async (error) => {
    consecutiveErrors++;

    // Se muitos erros consecutivos, pode ser incompatibilidade de versão
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      logger.warn(
        "Muitos erros consecutivos detectados, verificando atualização...",
      );
      consecutiveErrors = 0; // Reset para evitar loop

      // Verifica se há atualização disponível
      const hasUpdate = await forceUpdateCheck();
      if (hasUpdate) {
        return Promise.reject(error); // Vai recarregar a página
      }
    }

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

    // Se for erro 404 em chunk (arquivo JS/CSS), pode ser versão antiga
    if (
      error.response?.status === 404 &&
      error.config?.url?.includes(".chunk.")
    ) {
      logger.warn("Chunk não encontrado, forçando atualização...");
      await forceUpdateCheck();
    }

    return Promise.reject(error);
  },
);

export default api;
