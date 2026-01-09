/**
 * Middleware que verifica se o usuário é administrador
 * DEVE ser usado APÓS authMiddleware
 */
function adminMiddleware(req, res, next) {
  // Verifica se o authMiddleware foi executado antes
  if (!req.usuario) {
    return res.status(401).json({
      error: "Autenticação necessária",
      code: "AUTH_REQUIRED",
    });
  }

  // Verifica se é administrador (aceita ADM ou ADMIN)
  const tiposAdmin = ["ADM", "ADMIN"];

  if (!tiposAdmin.includes(req.usuario.tipo)) {
    return res.status(403).json({
      error:
        "Acesso negado. Apenas administradores podem acessar este recurso.",
      code: "ADMIN_REQUIRED",
    });
  }

  return next();
}

/**
 * Middleware que verifica se o usuário é do tipo USER
 * DEVE ser usado APÓS authMiddleware
 */
function userMiddleware(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({
      error: "Autenticação necessária",
      code: "AUTH_REQUIRED",
    });
  }

  if (req.usuario.tipo !== "USER") {
    return res.status(403).json({
      error: "Acesso negado. Recurso disponível apenas para usuários comuns.",
      code: "USER_ONLY",
    });
  }

  return next();
}

/**
 * Middleware que verifica se o usuário pertence a um setor específico
 * @param {number|number[]} setoresPermitidos - ID(s) do(s) setor(es) permitido(s)
 */
function setorMiddleware(setoresPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: "Autenticação necessária",
        code: "AUTH_REQUIRED",
      });
    }

    // Admin sempre tem acesso
    if (["ADM", "ADMIN"].includes(req.usuario.tipo)) {
      return next();
    }

    const setores = Array.isArray(setoresPermitidos)
      ? setoresPermitidos
      : [setoresPermitidos];

    if (!setores.includes(req.usuario.setor_id)) {
      return res.status(403).json({
        error: "Acesso negado. Você não tem permissão para este recurso.",
        code: "SETOR_NOT_ALLOWED",
      });
    }

    return next();
  };
}

module.exports = {
  adminMiddleware,
  userMiddleware,
  setorMiddleware,
};
