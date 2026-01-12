const connection = require("../database/connection");

/**
 * Middleware que verifica se o usuário é administrador via papéis
 * DEVE ser usado APÓS authMiddleware
 */
async function adminMiddleware(req, res, next) {
  // Verifica se o authMiddleware foi executado antes
  if (!req.usuario) {
    return res.status(401).json({
      error: "Autenticação necessária",
      code: "AUTH_REQUIRED",
    });
  }

  try {
    // Verificar via papéis no banco
    const papeis = await connection("usuarios_papeis")
      .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
      .where("usuarios_papeis.usuario_id", req.usuario.id)
      .pluck("papeis.nome");

    const isAdmin = Array.isArray(papeis) && papeis.includes("ADMIN");

    if (!isAdmin) {
      return res.status(403).json({
        error:
          "Acesso negado. Apenas administradores podem acessar este recurso.",
        code: "ADMIN_REQUIRED",
      });
    }

    // Adiciona flag isAdmin ao request para uso posterior
    req.usuario.isAdmin = true;

    return next();
  } catch (error) {
    console.error("Erro ao verificar permissões de admin:", error);
    return res.status(500).json({
      error: "Erro ao verificar permissões",
      code: "PERMISSION_CHECK_ERROR",
    });
  }
}

/**
 * Middleware que verifica se o usuário NÃO é admin (usuário comum)
 * DEVE ser usado APÓS authMiddleware
 */
async function userMiddleware(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({
      error: "Autenticação necessária",
      code: "AUTH_REQUIRED",
    });
  }

  try {
    // Verificar via papéis no banco
    const papeis = await connection("usuarios_papeis")
      .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
      .where("usuarios_papeis.usuario_id", req.usuario.id)
      .pluck("papeis.nome");

    const isAdmin = Array.isArray(papeis) && papeis.includes("ADMIN");

    if (isAdmin) {
      return res.status(403).json({
        error: "Acesso negado. Recurso disponível apenas para usuários comuns.",
        code: "USER_ONLY",
      });
    }

    return next();
  } catch (error) {
    console.error("Erro ao verificar permissões:", error);
    return res.status(500).json({
      error: "Erro ao verificar permissões",
      code: "PERMISSION_CHECK_ERROR",
    });
  }
}

/**
 * Middleware que verifica se o usuário pertence a um setor específico
 * @param {number|number[]} setoresPermitidos - ID(s) do(s) setor(es) permitido(s)
 */
function setorMiddleware(setoresPermitidos) {
  return async (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: "Autenticação necessária",
        code: "AUTH_REQUIRED",
      });
    }

    try {
      // Verificar se é admin via papéis
      const papeis = await connection("usuarios_papeis")
        .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
        .where("usuarios_papeis.usuario_id", req.usuario.id)
        .pluck("papeis.nome");

      const isAdmin = Array.isArray(papeis) && papeis.includes("ADMIN");

      // Admin sempre tem acesso
      if (isAdmin) {
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
    } catch (error) {
      console.error("Erro ao verificar setor:", error);
      return res.status(500).json({
        error: "Erro ao verificar permissões",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  };
}

module.exports = {
  adminMiddleware,
  userMiddleware,
  setorMiddleware,
};
