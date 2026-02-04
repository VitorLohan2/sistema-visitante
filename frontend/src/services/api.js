import axios from "axios";
import logger from "../utils/logger";
import { forceUpdateCheck, performUpdate } from "./versionService";

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

// Contador de erros consecutivos para detectar incompatibilidade
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;

// Flag para evitar múltiplas verificações simultâneas
let isCheckingUpdate = false;

/**
 * Verifica se o erro indica possível incompatibilidade de versão
 */
function isVersionMismatchError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message || "";

  // Erros que podem indicar incompatibilidade de versão
  return (
    status === 500 || // Erro interno (pode ser API incompatível)
    status === 404 || // Rota não existe mais
    status === 400 || // Bad request (formato de dados mudou)
    message.includes("Cannot read") ||
    message.includes("undefined") ||
    message.includes("is not a function")
  );
}

/**
 * Força atualização se houver versão nova
 */
async function checkAndForceUpdate() {
  if (isCheckingUpdate) return;

  isCheckingUpdate = true;
  try {
    const result = await forceUpdateCheck();
    if (result.hasUpdate) {
      logger.warn("🔄 Versão desatualizada detectada! Forçando atualização...");
      await performUpdate();
    }
  } finally {
    isCheckingUpdate = false;
  }
}

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => {
    // Reset contador de erros em caso de sucesso
    consecutiveErrors = 0;
    return response;
  },
  async (error) => {
    // Ignora erros de rede (sem resposta do servidor)
    if (!error.response && error.message === "Network Error") {
      return Promise.reject(error);
    }

    // Conta apenas erros que podem indicar incompatibilidade
    if (isVersionMismatchError(error)) {
      consecutiveErrors++;
      logger.warn(
        `⚠️ Erro potencial de versão (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
        error.response?.status,
        error.config?.url,
      );
    }

    // Se muitos erros consecutivos, verifica atualização
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      logger.warn("🚨 Muitos erros consecutivos! Verificando atualização...");
      consecutiveErrors = 0;
      await checkAndForceUpdate();
    }

    // Token expirado ou inválido
    if (error.response?.status === 401) {
      logger.log("Token inválido ou expirado, redirecionando para login");
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");

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
