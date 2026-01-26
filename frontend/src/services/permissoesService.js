// src/services/permissoesService.js

import api from "./api";
import {
  setPermissoesCache,
  getPermissoesCache,
  clearPermissoesCache,
} from "./cacheService";

/**
 * Busca as permissões do usuário logado
 * Usa cache em memória e sessionStorage para persistir entre navegações
 */
export async function buscarMinhasPermissoes() {
  // Primeiro verifica se há token (usuário logado)
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("[permissoesService] Sem token, retornando vazio");
    return { permissoes: [], papeis: [] };
  }

  // Depois tenta o cache (memória + sessionStorage)
  const cached = getPermissoesCache();
  if (cached.permissoes && cached.papeis) {
    return cached;
  }

  try {
    const response = await api.get("/usuarios-papeis/me/permissoes");
    const { permissoes, papeis } = response.data;

    // Salva no cache centralizado
    setPermissoesCache(permissoes, papeis);

    return { permissoes, papeis };
  } catch (error) {
    console.error("Erro ao buscar permissões:", error);
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
