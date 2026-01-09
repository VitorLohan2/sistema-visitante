// src/services/permissoesService.js

import api from "./api";

/**
 * Cache local de permissões do usuário
 */
let cachePermissoes = null;
let cachePapeis = null;

/**
 * Busca as permissões do usuário logado
 */
export async function buscarMinhasPermissoes() {
  if (cachePermissoes && cachePapeis) {
    return { permissoes: cachePermissoes, papeis: cachePapeis };
  }

  try {
    const response = await api.get("/usuarios-papeis/me/permissoes");
    cachePermissoes = response.data.permissoes;
    cachePapeis = response.data.papeis;
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar permissões:", error);
    return { permissoes: [], papeis: [] };
  }
}

/**
 * Limpa o cache de permissões (usar ao fazer login/logout)
 */
export function limparCachePermissoes() {
  cachePermissoes = null;
  cachePapeis = null;
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
