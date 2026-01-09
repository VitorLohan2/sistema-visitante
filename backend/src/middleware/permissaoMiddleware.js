// middleware/permissaoMiddleware.js
const connection = require("../database/connection");
const { getUsuarioId } = require("../utils/authHelper");

/**
 * Cache de permissões por usuário (evita consultas repetidas)
 * Formato: { usuario_id: { permissoes: [...], timestamp: Date } }
 */
const cachePermissoes = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca permissões do usuário no banco ou cache
 */
async function getPermissoesUsuario(usuario_id) {
  // Verificar cache
  const cached = cachePermissoes.get(usuario_id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      permissoes: cached.permissoes || [],
      isAdmin: cached.isAdmin || false,
    };
  }

  try {
    // Buscar no banco
    const permissoes = await connection("usuarios_papeis")
      .join(
        "papeis_permissoes",
        "usuarios_papeis.papel_id",
        "papeis_permissoes.papel_id"
      )
      .join("permissoes", "papeis_permissoes.permissao_id", "permissoes.id")
      .where("usuarios_papeis.usuario_id", usuario_id)
      .distinct("permissoes.chave")
      .pluck("permissoes.chave");

    // Buscar papéis para verificar ADMIN
    const papeis = await connection("usuarios_papeis")
      .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
      .where("usuarios_papeis.usuario_id", usuario_id)
      .pluck("papeis.nome");

    const resultado = {
      permissoes: permissoes || [],
      isAdmin: Array.isArray(papeis) && papeis.includes("ADMIN"),
    };

    // Salvar no cache
    cachePermissoes.set(usuario_id, {
      ...resultado,
      timestamp: Date.now(),
    });

    return resultado;
  } catch (err) {
    console.error("Erro ao buscar permissões do usuário:", err);
    return { permissoes: [], isAdmin: false };
  }
}

/**
 * Limpa cache de um usuário específico
 */
function limparCacheUsuario(usuario_id) {
  cachePermissoes.delete(usuario_id);
}

/**
 * Limpa todo o cache de permissões
 */
function limparTodoCache() {
  cachePermissoes.clear();
}

/**
 * Middleware para verificar se o usuário tem determinada(s) permissão(ões)
 * @param {string|string[]} permissoesRequeridas - Uma ou mais permissões necessárias
 * @param {Object} opcoes - Opções adicionais
 * @param {boolean} opcoes.todas - Se true, exige TODAS as permissões; se false, exige ao menos uma
 */
function requerPermissao(permissoesRequeridas, opcoes = { todas: false }) {
  // Normalizar para array
  const permissoes = Array.isArray(permissoesRequeridas)
    ? permissoesRequeridas
    : [permissoesRequeridas];

  return async (req, res, next) => {
    try {
      const usuario_id = getUsuarioId(req);

      if (!usuario_id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const resultado = await getPermissoesUsuario(usuario_id);
      const permissoesUsuario = resultado?.permissoes || [];
      const isAdmin = resultado?.isAdmin || false;

      // ADMIN tem todas as permissões
      if (isAdmin) {
        req.isAdmin = true;
        req.permissoesUsuario = permissoesUsuario;
        return next();
      }

      let temPermissao;

      if (opcoes.todas) {
        // Precisa ter TODAS as permissões
        temPermissao = permissoes.every((p) => permissoesUsuario.includes(p));
      } else {
        // Precisa ter ao menos UMA permissão
        temPermissao = permissoes.some((p) => permissoesUsuario.includes(p));
      }

      if (!temPermissao) {
        return res.status(403).json({
          error: "Sem permissão para esta ação",
          permissoes_requeridas: permissoes,
          suas_permissoes: permissoesUsuario,
        });
      }

      req.isAdmin = false;
      req.permissoesUsuario = permissoesUsuario;
      next();
    } catch (err) {
      console.error("Erro ao verificar permissões:", err);
      return res.status(500).json({ error: "Erro ao verificar permissões" });
    }
  };
}

/**
 * Middleware para verificar se é ADMIN
 */
function requerAdmin() {
  return async (req, res, next) => {
    try {
      const usuario_id = getUsuarioId(req);

      if (!usuario_id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const resultado = await getPermissoesUsuario(usuario_id);
      const isAdminUser = resultado?.isAdmin || false;
      const permissoesUsuario = resultado?.permissoes || [];

      if (!isAdminUser) {
        return res.status(403).json({
          error: "Acesso restrito a administradores",
        });
      }

      req.isAdmin = true;
      req.permissoesUsuario = permissoesUsuario;
      next();
    } catch (err) {
      console.error("Erro ao verificar admin:", err);
      return res.status(500).json({ error: "Erro ao verificar permissões" });
    }
  };
}

/**
 * Verifica se usuário tem permissão (função auxiliar para uso em controllers)
 */
async function temPermissao(usuario_id, permissao) {
  const resultado = await getPermissoesUsuario(usuario_id);
  const permissoesUsuario = resultado?.permissoes || [];
  const isAdminUser = resultado?.isAdmin || false;
  return isAdminUser || permissoesUsuario.includes(permissao);
}

/**
 * Verifica se usuário é ADMIN (função auxiliar para uso em controllers)
 */
async function isAdmin(usuario_id) {
  const resultado = await getPermissoesUsuario(usuario_id);
  return resultado?.isAdmin || false;
}

module.exports = {
  requerPermissao,
  requerAdmin,
  temPermissao,
  isAdmin,
  getPermissoesUsuario,
  limparCacheUsuario,
  limparTodoCache,
};
