// src/services/permissoesService.js

import api from "./api";
import {
  setPermissoesCache,
  getPermissoesCache,
  clearPermissoesCache,
} from "./cacheService";
import { validateToken } from "../utils/tokenUtils";
import logger from "../utils/logger";

/**
 * Busca as permissões do usuário logado.
 *
 * FLUXO:
 * 1. Valida o token JWT (verifica expiração)
 * 2. Se token inválido → retorna vazio (sem permissões)
 * 3. Se token válido → tenta cache (memória) primeiro
 * 4. Se cache vazio → busca da API autenticada
 * 5. Armazena resultado no cache
 *
 * NOTA: O cache de permissões vive na memória (memoryCache) e no
 * sessionStorage versionado. Não há acesso direto ao sessionStorage
 * para evitar permissões de versões anteriores.
 */
export async function buscarMinhasPermissoes() {
  // 1. Valida se há um token JWT válido (não expirado)
  const token = localStorage.getItem("token");
  const validation = validateToken(token);

  if (!validation.valid) {
    logger.log(
      `[permissoesService] Token inválido (${validation.reason}), retornando vazio`,
    );
    return { permissoes: [], papeis: [] };
  }

  // 2. Tenta o cache (memória + sessionStorage versionado)
  const cached = getPermissoesCache();
  if (cached.permissoes && cached.papeis) {
    return cached;
  }

  // 3. Busca da API autenticada
  try {
    const response = await api.get("/usuarios-papeis/me/permissoes");
    const { permissoes, papeis } = response.data;

    // 4. Salva no cache centralizado (versionado)
    setPermissoesCache(permissoes, papeis);

    return { permissoes, papeis };
  } catch (error) {
    logger.error("Erro ao buscar permissões:", error);
    return { permissoes: [], papeis: [] };
  }
}

/**
 * Limpa o cache de permissões (usar ao fazer login/logout)
 */
export function limparCachePermissoes() {
  clearPermissoesCache();
}

/**
 * Verifica se o usuário tem determinada permissão
 * @param {string} permissao - Chave da permissão (ex: 'empresa_criar')
 */
export async function temPermissao(permissao) {
  const { permissoes, papeis } = await buscarMinhasPermissoes();

  // ADMIN tem todas as permissões
  if (papeis.includes("ADMIN")) {
    return true;
  }

  return permissoes.includes(permissao);
}

/**
 * Verifica se o usuário tem alguma das permissões listadas
 * @param {string[]} permissoesRequeridas - Array de permissões
 */
export async function temAlgumaPermissao(permissoesRequeridas) {
  const { permissoes, papeis } = await buscarMinhasPermissoes();

  // ADMIN tem todas as permissões
  if (papeis.includes("ADMIN")) {
    return true;
  }

  return permissoesRequeridas.some((p) => permissoes.includes(p));
}

/**
 * Verifica se o usuário tem todas as permissões listadas
 * @param {string[]} permissoesRequeridas - Array de permissões
 */
export async function temTodasPermissoes(permissoesRequeridas) {
  const { permissoes, papeis } = await buscarMinhasPermissoes();

  // ADMIN tem todas as permissões
  if (papeis.includes("ADMIN")) {
    return true;
  }

  return permissoesRequeridas.every((p) => permissoes.includes(p));
}

/**
 * Verifica se o usuário é ADMIN
 */
export async function isAdmin() {
  const { papeis } = await buscarMinhasPermissoes();
  return papeis.includes("ADMIN");
}

/**
 * Retorna os papéis do usuário
 */
export async function meusPapeis() {
  const { papeis } = await buscarMinhasPermissoes();
  return papeis;
}

export default {
  buscarMinhasPermissoes,
  limparCachePermissoes,
  temPermissao,
  temAlgumaPermissao,
  temTodasPermissoes,
  isAdmin,
  meusPapeis,
};
