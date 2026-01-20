const connection = require("../database/connection");
const { getPermissoesUsuario } = require("./permissaoMiddleware");

/**
 * @deprecated Use requerPermissao do permissaoMiddleware.js
 * Middleware legado para compatibilidade - agora verifica permissão 'usuario_gerenciar'
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
    // Buscar permissões do usuário via RBAC
    const resultado = await getPermissoesUsuario(req.usuario.id);
    const permissoesUsuario = resultado?.permissoes || [];

    // Verifica se tem permissão de gerenciar usuários
    const temPermissao = permissoesUsuario.includes("usuario_gerenciar");

    if (!temPermissao) {
      return res.status(403).json({
        error:
          "Acesso negado. Você não tem permissão para acessar este recurso.",
        code: "PERMISSION_DENIED",
      });
    }

    // Adiciona permissões ao request para uso posterior
    req.permissoesUsuario = permissoesUsuario;

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
 * @deprecated Não usar - sistema agora usa apenas RBAC
 * Middleware legado que verificava se o usuário NÃO era admin
 */
async function userMiddleware(req, res, next) {
  // Middleware legado - agora permite todos os usuários
  if (!req.usuario) {
    return res.status(401).json({
      error: "Autenticação necessária",
      code: "AUTH_REQUIRED",
    });
  }
  return next();
}

/**
 * @deprecated Use requerPermissao do permissaoMiddleware.js
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
