import axios from "axios";
import logger from "../utils/logger";
import { forceUpdateCheck, performUpdate } from "./versionService";
import { forceLogout } from "../hooks/useAuth";
import { isTokenExpired, shouldRefreshToken } from "../utils/tokenUtils";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001",
});

logger.log("API Base URL:", api.defaults.baseURL);

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLE DE REFRESH TOKEN
// Evita múltiplas chamadas simultâneas de refresh (race condition)
// ═══════════════════════════════════════════════════════════════════════════
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Registra uma requisição que está aguardando o refresh do token.
 * Quando o refresh completar, todas as requisições pendentes serão retentadas.
 */
function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

/**
 * Notifica todas as requisições pendentes com o novo token.
 */
function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

/**
 * Notifica todas as requisições pendentes que o refresh falhou.
 */
function onTokenRefreshFailed() {
  refreshSubscribers.forEach((callback) => callback(null));
  refreshSubscribers = [];
}

/**
 * Tenta renovar o token JWT via endpoint de refresh.
 * @returns {string|null} Novo token ou null se falhou
 */
async function attemptTokenRefresh() {
  const currentToken = localStorage.getItem("token");
  if (!currentToken) return null;

  try {
    // Usa axios diretamente (sem interceptors) para evitar loop
    const response = await axios.post(
      `${api.defaults.baseURL}/auth/refresh-token`,
      {},
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      },
    );

    const { token, usuario } = response.data;

    // Atualiza token e dados do usuário no localStorage
    localStorage.setItem("token", token);
    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        isAdmin: usuario.isAdmin || false,
        empresa_id: usuario.empresa_id,
        setor_id: usuario.setor_id,
      }),
    );

    logger.log("✅ Token renovado com sucesso via interceptor");
    return token;
  } catch (error) {
    logger.warn("⚠️ Falha ao renovar token:", error.response?.status);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERCEPTOR DE REQUISIÇÃO
// Adiciona token JWT. Se expirado, tenta refresh antes de enviar.
// ═══════════════════════════════════════════════════════════════════════════
api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("token");

  if (token) {
    // Se o token está expirado, tenta refresh ANTES de enviar a requisição
    if (isTokenExpired(token)) {
      logger.warn(
        "🔐 Token expirado detectado antes da requisição, tentando refresh...",
      );

      // Evita refresh duplicado - se já está em andamento, aguarda
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await attemptTokenRefresh();
        isRefreshing = false;

        if (newToken) {
          onTokenRefreshed(newToken);
          token = newToken; // Usa o novo token
        } else {
          // Refresh falhou - token expirou além do período de graça
          onTokenRefreshFailed();
          logger.warn(
            "🔐 Refresh falhou no request interceptor — forçando logout",
          );
          forceLogout();
          return Promise.reject(
            new axios.Cancel("Token expirado e refresh falhou"),
          );
        }
      } else {
        // Aguarda o refresh em andamento
        token = await new Promise((resolve) => {
          subscribeTokenRefresh((t) => resolve(t));
        });
        if (!token) {
          return Promise.reject(
            new axios.Cancel("Token expirado e refresh falhou"),
          );
        }
      }
    }

    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Contador de erros consecutivos para detectar incompatibilidade
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;

// Flag para evitar múltiplas operações simultâneas de atualização
let isCheckingUpdate = false;

/**
 * Verifica se o erro indica possível incompatibilidade de versão
 */
function isVersionMismatchError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message || "";

  return (
    status === 500 ||
    status === 404 ||
    status === 400 ||
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

// ═══════════════════════════════════════════════════════════════════════════
// INTERCEPTOR DE RESPOSTA
// Trata 401 com tentativa de refresh antes de forçar logout
// ═══════════════════════════════════════════════════════════════════════════
api.interceptors.response.use(
  (response) => {
    // Reset contador de erros em caso de sucesso
    consecutiveErrors = 0;
    return response;
  },
  async (error) => {
    // Ignora erros de cancelamento (ex: token expirado detectado no request interceptor)
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Ignora erros de rede (sem resposta do servidor)
    if (!error.response && error.message === "Network Error") {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // ──────────────────────────────────────────────────────────────
    // 401 — Token expirado/inválido
    // Tenta refresh antes de forçar logout
    // ──────────────────────────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Marca a requisição para não tentar refresh novamente (evita loop)
      originalRequest._retry = true;

      // Se o próprio refresh falhou, faz logout direto
      if (originalRequest.url?.includes("/auth/refresh-token")) {
        forceLogout();
        return Promise.reject(error);
      }

      // Se já existe um refresh em andamento, aguarda o resultado
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      // Inicia o processo de refresh
      isRefreshing = true;

      const newToken = await attemptTokenRefresh();

      if (newToken) {
        isRefreshing = false;
        onTokenRefreshed(newToken);

        // Retenta a requisição original com o novo token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        // Refresh falhou — token expirou além do período de graça
        isRefreshing = false;
        onTokenRefreshFailed();
        logger.warn("🔐 Refresh falhou — forçando logout");
        forceLogout();
        return Promise.reject(error);
      }
    }

    // ──────────────────────────────────────────────────────────────
    // Erros que podem indicar incompatibilidade de versão
    // ──────────────────────────────────────────────────────────────
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

    return Promise.reject(error);
  },
);

export default api;
