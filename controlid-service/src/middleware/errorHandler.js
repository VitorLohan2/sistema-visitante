const logger = require("../config/logger");

/**
 * Middleware para tratamento de erros
 */
const errorHandler = (err, req, res, next) => {
  // Log do erro
  logger.error("Erro na requisição", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  // Erros de validação Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      error: "Dados inválidos",
      code: "VALIDATION_ERROR",
      details: err.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      })),
    });
  }

  // Erros de conexão com dispositivo
  if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
    return res.status(503).json({
      success: false,
      error: "Dispositivo indisponível",
      code: "DEVICE_UNAVAILABLE",
      details: err.message,
    });
  }

  // Erros de timeout
  if (err.code === "ECONNABORTED") {
    return res.status(504).json({
      success: false,
      error: "Timeout na comunicação com dispositivo",
      code: "DEVICE_TIMEOUT",
    });
  }

  // Erro genérico
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "Erro interno do servidor",
    code: err.code || "INTERNAL_ERROR",
  });
};

module.exports = errorHandler;
