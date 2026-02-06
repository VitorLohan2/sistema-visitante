/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN UTILS — Utilitários para manipulação de JWT no cliente
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * - Decodificar JWT (sem verificação de assinatura — isso é feito no backend)
 * - Verificar expiração do token localmente
 * - Determinar se o token precisa ser renovado (refresh proativo)
 * - Fornecer informações do payload do token
 *
 * NOTA: A validação de assinatura é sempre feita pelo backend.
 * O frontend apenas decodifica o payload (base64url) para:
 *   1. Verificar expiração antes de fazer requisições
 *   2. Saber quando solicitar um refresh proativo
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import logger from "./logger";

/**
 * Margem de segurança para considerar o token "próximo de expirar"
 * Se faltam menos de 5 minutos para expirar, solicita refresh proativo
 */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Decodifica o payload de um JWT sem verificar a assinatura.
 * JWTs têm formato: header.payload.signature — o payload é base64url.
 *
 * @param {string} token - Token JWT
 * @returns {object|null} Payload decodificado ou null se inválido
 */
export function decodeToken(token) {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Converte base64url para base64 padrão
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    // Decodifica e faz parse do JSON
    const payload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      ),
    );

    return payload;
  } catch (error) {
    logger.error("[tokenUtils] Erro ao decodificar token:", error);
    return null;
  }
}

/**
 * Verifica se o token JWT está expirado.
 *
 * @param {string} token - Token JWT
 * @returns {boolean} true se expirado ou inválido, false se válido
 */
export function isTokenExpired(token) {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;

  // payload.exp é Unix timestamp em SEGUNDOS
  const expiresAt = payload.exp * 1000;
  return Date.now() >= expiresAt;
}

/**
 * Verifica se o token está próximo de expirar e deve ser renovado.
 *
 * @param {string} token - Token JWT
 * @returns {boolean} true se deve renovar, false se ainda está confortável
 */
export function shouldRefreshToken(token) {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;

  const expiresAt = payload.exp * 1000;
  const timeUntilExpiry = expiresAt - Date.now();

  return timeUntilExpiry <= REFRESH_THRESHOLD_MS;
}

/**
 * Retorna o tempo restante até a expiração do token em milissegundos.
 *
 * @param {string} token - Token JWT
 * @returns {number} Milissegundos até expirar (negativo = já expirou)
 */
export function getTokenTimeRemaining(token) {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return -1;

  return payload.exp * 1000 - Date.now();
}

/**
 * Extrai os dados do usuário armazenados no payload do token.
 *
 * @param {string} token - Token JWT
 * @returns {object|null} Dados do usuário ou null
 */
export function getUserFromToken(token) {
  const payload = decodeToken(token);
  if (!payload) return null;

  return {
    id: payload.id,
    nome: payload.nome,
    email: payload.email,
    empresa_id: payload.empresa_id,
    setor_id: payload.setor_id,
    isAdmin: payload.isAdmin || false,
  };
}

/**
 * Valida se um token é estruturalmente válido e não está expirado.
 * NÃO verifica a assinatura (isso é responsabilidade do backend).
 *
 * @param {string} token - Token JWT
 * @returns {{ valid: boolean, reason?: string, payload?: object }}
 */
export function validateToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "TOKEN_MISSING" };
  }

  const payload = decodeToken(token);
  if (!payload) {
    return { valid: false, reason: "TOKEN_MALFORMED" };
  }

  if (!payload.exp) {
    return { valid: false, reason: "TOKEN_NO_EXPIRY" };
  }

  if (isTokenExpired(token)) {
    return { valid: false, reason: "TOKEN_EXPIRED" };
  }

  if (!payload.id) {
    return { valid: false, reason: "TOKEN_NO_USER_ID" };
  }

  return { valid: true, payload };
}

export default {
  decodeToken,
  isTokenExpired,
  shouldRefreshToken,
  getTokenTimeRemaining,
  getUserFromToken,
  validateToken,
};
