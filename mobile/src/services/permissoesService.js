/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Permissões
 * Gerencia permissões RBAC do usuário
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Chaves do cache
const CACHE_KEY_PERMISSOES = "@Cache:permissoes";
const CACHE_KEY_PAPEIS = "@Cache:papeis";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca permissões do usuário logado
 * Usa cache para evitar requisições desnecessárias
 */
export async function buscarMinhasPermissoes() {
  try {
    // Verifica se há token (usuário logado)
    const token = await AsyncStorage.getItem("@Auth:token");
    if (!token) {
      return { permissoes: [], papeis: [] };
    }

    // Tenta buscar do cache
    const cacheData = await obterCachePermissoes();
    if (cacheData) {
      return cacheData;
    }

    // Busca da API
    const response = await api.get("/usuarios-papeis/me/permissoes");
    const { permissoes, papeis } = response.data;

    // Salva no cache
    await salvarCachePermissoes(permissoes, papeis);

    return { permissoes, papeis };
  } catch (error) {
    console.error("Erro ao buscar permissões:", error);
    return { permissoes: [], papeis: [] };
  }
}

/**
 * Obtém permissões do cache se ainda válidas
 */
async function obterCachePermissoes() {
  try {
    const [permissoesStr, papeisStr, timestampStr] =
      await AsyncStorage.multiGet([
        CACHE_KEY_PERMISSOES,
        CACHE_KEY_PAPEIS,
        "@Cache:permissoes_timestamp",
      ]);

    const timestamp = timestampStr[1] ? parseInt(timestampStr[1]) : 0;
    const agora = Date.now();

    // Verifica se cache expirou
    if (agora - timestamp > CACHE_TTL) {
      return null;
    }

    const permissoes = permissoesStr[1] ? JSON.parse(permissoesStr[1]) : [];
    const papeis = papeisStr[1] ? JSON.parse(papeisStr[1]) : [];

    return { permissoes, papeis };
  } catch {
    return null;
  }
}

/**
 * Salva permissões no cache
 */
async function salvarCachePermissoes(permissoes, papeis) {
  try {
    await AsyncStorage.multiSet([
      [CACHE_KEY_PERMISSOES, JSON.stringify(permissoes)],
      [CACHE_KEY_PAPEIS, JSON.stringify(papeis)],
      ["@Cache:permissoes_timestamp", Date.now().toString()],
    ]);
  } catch (error) {
    console.error("Erro ao salvar cache de permissões:", error);
  }
}

/**
 * Limpa cache de permissões
 */
export async function limparCachePermissoes() {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEY_PERMISSOES,
      CACHE_KEY_PAPEIS,
      "@Cache:permissoes_timestamp",
    ]);
  } catch (error) {
    console.error("Erro ao limpar cache de permissões:", error);
  }
}

/**
 * Verifica se usuário tem determinada permissão
 */
export async function temPermissao(permissao) {
  const { permissoes } = await buscarMinhasPermissoes();
  return permissoes.includes(permissao);
}

/**
 * Verifica se usuário tem alguma das permissões
 */
export async function temAlgumaPermissao(permissoesRequeridas) {
  const { permissoes } = await buscarMinhasPermissoes();
  return permissoesRequeridas.some((p) => permissoes.includes(p));
}

/**
 * Verifica se usuário tem todas as permissões
 */
export async function temTodasPermissoes(permissoesRequeridas) {
  const { permissoes } = await buscarMinhasPermissoes();
  return permissoesRequeridas.every((p) => permissoes.includes(p));
}

export default {
  buscarMinhasPermissoes,
  limparCachePermissoes,
  temPermissao,
  temAlgumaPermissao,
  temTodasPermissoes,
};
