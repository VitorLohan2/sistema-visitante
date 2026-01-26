/**
 * AuthHelper - Utilitários de Autenticação
 * Centraliza a lógica de extração de ID do usuário
 */

const { verificarToken } = require("./jwt");

/**
 * Extrai o ID do usuário da requisição
 * Suporta tanto o authMiddleware (req.usuario) quanto o formato legado (Bearer token)
 *
 * Prioridade:
 * 1. req.usuario.id (do authMiddleware - JWT decodificado)
 * 2. Bearer Token JWT (decodifica e extrai o ID)
 * 3. Bearer Token ID (formato legado - ID direto)
 *
 * @param {Object} req - Objeto Request do Express
 * @returns {string|null} ID do usuário ou null se não encontrado
 */
function getUsuarioId(req) {
  // 1. Primeiro verifica se veio do authMiddleware (JWT já decodificado)
  if (req.usuario?.id) {
    return req.usuario.id;
  }

  // 2. Fallback: tenta extrair do header Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  const token = parts[1];

  // Verifica se é um JWT (contém dois pontos - formato: header.payload.signature)
  if (token.includes(".")) {
    try {
      const decoded = verificarToken(token);
      return decoded.id;
    } catch (error) {
      console.error("❌ Erro ao decodificar JWT:", error.message);
      return null;
    }
  }

  // 3. Se não for JWT, retorna o token como ID (formato legado antigo)
  return token;
}

/**
 * Extrai dados completos do usuário da requisição
 *
 * @param {Object} req - Objeto Request do Express
 * @returns {Object|null} Dados do usuário ou null
 */
function getUsuarioData(req) {
  // Se veio do authMiddleware
  if (req.usuario) {
    return req.usuario;
  }

  // Tenta extrair do JWT
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  const token = parts[1];

  if (token.includes(".")) {
    try {
      return verificarToken(token);
    } catch (error) {
      return null;
    }
  }

  // Formato legado - retorna apenas o ID
  return { id: token };
}

module.exports = {
  getUsuarioId,
  getUsuarioData,
};
