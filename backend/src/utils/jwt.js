const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "sistema-visitante-secret-key-2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

/**
 * Gera um token JWT
 * @param {Object} payload - Dados a serem incluídos no token
 * @returns {string} Token JWT
 */
function gerarToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifica e decodifica um token JWT
 * @param {string} token - Token JWT
 * @returns {Object} Payload decodificado
 * @throws {Error} Se o token for inválido ou expirado
 */
function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Decodifica um token JWT sem verificar (útil para debug)
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload decodificado ou null
 */
function decodificarToken(token) {
  return jwt.decode(token);
}

module.exports = {
  gerarToken,
  verificarToken,
  decodificarToken,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
