const config = require("../config");
const logger = require("../config/logger");

/**
 * Middleware de autenticação via API Key
 * Usado para proteger o acesso ao microserviço (apenas backend principal pode acessar)
 */
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;

  if (!apiKey) {
    logger.warn("Requisição sem API Key", { ip: req.ip, path: req.path });
    return res.status(401).json({
      success: false,
      error: "API Key não fornecida",
      code: "MISSING_API_KEY",
    });
  }

  if (apiKey !== config.auth.apiKey) {
    logger.warn("API Key inválida", { ip: req.ip, path: req.path });
    return res.status(403).json({
      success: false,
      error: "API Key inválida",
      code: "INVALID_API_KEY",
    });
  }

  next();
};

module.exports = authMiddleware;
