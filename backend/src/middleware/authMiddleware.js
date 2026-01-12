const { verificarToken } = require("../utils/jwt");

/**
 * Middleware de autenticação JWT
 * Valida o token e adiciona dados do usuário ao request
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token não fornecido",
      code: "TOKEN_MISSING",
    });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    return res.status(401).json({
      error: "Formato de token inválido",
      code: "TOKEN_MALFORMED",
    });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({
      error: "Token mal formatado",
      code: "TOKEN_MALFORMED",
    });
  }

  try {
    const decoded = verificarToken(token);

    // Adiciona dados do usuário ao request
    req.usuario = {
      id: decoded.id,
      nome: decoded.nome,
      email: decoded.email,
      empresa_id: decoded.empresa_id,
      setor_id: decoded.setor_id,
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expirado",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      error: "Token inválido",
      code: "TOKEN_INVALID",
    });
  }
}

/**
 * Middleware que verifica autenticação mas não bloqueia se não houver token
 * Útil para rotas que podem ser acessadas por usuários logados ou não
 */
function authOptional(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.usuario = null;
    return next();
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
    req.usuario = null;
    return next();
  }

  try {
    const decoded = verificarToken(parts[1]);
    req.usuario = {
      id: decoded.id,
      nome: decoded.nome,
      email: decoded.email,
      empresa_id: decoded.empresa_id,
      setor_id: decoded.setor_id,
    };
  } catch (error) {
    req.usuario = null;
  }

  return next();
}

module.exports = { authMiddleware, authOptional };
