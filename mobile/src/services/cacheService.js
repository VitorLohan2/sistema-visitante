/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE SERVICE - Sistema Centralizado de Cache para Mobile
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sistema de cache em duas camadas (igual ao frontend):
 * 1. Memória (memoryCache) - Acesso instantâneo
 * 2. AsyncStorage - Persiste entre sessões do app
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ═══════════════════════════════════════════════════════════════════════════
// CACHE EM MEMÓRIA (acesso instantâneo)
// ═══════════════════════════════════════════════════════════════════════════
const memoryCache = {
  // Dados principais
  usuarios: null,
  cadastroVisitantes: null,
  empresasVisitantes: null,
  setoresVisitantes: null,
  empresas: null,
  setores: null,
  responsaveis: null,
  funcionarios: null,
  papeis: null,
  permissoes: null,

  // Dados de veículos
  coresVeiculos: null,
  tiposVeiculos: null,
  funcoesVisitantes: null,

  // Dados operacionais
  visitors: null,
  history: null,
  agendamentos: null,
  tickets: null,

  // Dados auxiliares
  userData: null,

  // Controle
  lastUpdate: null,

  // Aliases para compatibilidade
  visitantes: null,
  historico: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// CHAVES DO ASYNCSTORAGE
// ═══════════════════════════════════════════════════════════════════════════
const CACHE_KEYS = {
  // Dados principais
  USUARIOS: "@cache_usuarios",
  CADASTROVISITANTES: "@cache_cadastro_visitantes",
  EMPRESASVISITANTES: "@cache_empresas_visitantes",
  SETORESVISITANTES: "@cache_setores_visitantes",
  EMPRESAS: "@cache_empresas",
  SETORES: "@cache_setores",
  RESPONSAVEIS: "@cache_responsaveis",
  FUNCIONARIOS: "@cache_funcionarios",
  PAPEIS: "@cache_papeis",
  PERMISSOES: "@cache_permissoes",

  // Dados de veículos
  CORESVEICULOS: "@cache_cores_veiculos",
  TIPOSVEICULOS: "@cache_tipos_veiculos",
  FUNCOESVISITANTES: "@cache_funcoes_visitantes",

  // Dados operacionais
  VISITORS: "@cache_visitors",
  HISTORY: "@cache_history",
  AGENDAMENTOS: "@cache_agendamentos",
  TICKETS: "@cache_tickets",

  // Dados auxiliares
  USERDATA: "@cache_user_data",

  // Controle
  LASTUPDATE: "@cache_last_update",

  // Aliases
  VISITANTES: "@cache_cadastro_visitantes",
  HISTORICO: "@cache_history",
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS DE CACHE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normaliza a chave removendo underscores e convertendo para camelCase
 * @param {string} key - Chave original
 * @returns {string} Chave normalizada
 */
function normalizeKey(key) {
  const aliases = {
    empresas: "empresas",
    setores: "setores",
    visitantes: "cadastroVisitantes",
    historico: "history",
    user_data: "userData",
    cores_veiculos: "coresVeiculos",
    tipos_veiculos: "tiposVeiculos",
    funcoes_visitantes: "funcoesVisitantes",
  };

  if (aliases[key.toLowerCase()]) {
    return aliases[key.toLowerCase()];
  }

  // Converte snake_case para camelCase
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Salva dados no cache (memória + AsyncStorage)
 * @param {string} key - Chave do cache
 * @param {any} data - Dados a serem salvos
 */
export async function setCache(key, data) {
  try {
    const normalizedKey = normalizeKey(key);

    // Salva em memória
    memoryCache[normalizedKey] = data;

    // Aliases
    if (normalizedKey === "cadastroVisitantes") {
      memoryCache.visitantes = data;
    }
    if (normalizedKey === "visitantes") {
      memoryCache.cadastroVisitantes = data;
    }
    if (normalizedKey === "history") {
      memoryCache.historico = data;
    }
    if (normalizedKey === "historico") {
      memoryCache.history = data;
    }

    // Salva no AsyncStorage
    const cacheKey = CACHE_KEYS[normalizedKey.toUpperCase()];
    if (cacheKey) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    }

    // Atualiza timestamp
    const now = Date.now();
    memoryCache.lastUpdate = now;
    await AsyncStorage.setItem(CACHE_KEYS.LASTUPDATE, now.toString());

    console.log(
      `✅ [CACHE] Salvo: ${key} (${Array.isArray(data) ? data.length + " itens" : "dados"})`,
    );
  } catch (error) {
    console.error(`❌ [CACHE] Erro ao salvar ${key}:`, error);
  }
}

/**
 * Salva dados no cache de forma síncrona (apenas memória)
 * Útil para atualizações rápidas
 * @param {string} key - Chave do cache
 * @param {any} data - Dados a serem salvos
 */
export function setCacheSync(key, data) {
  const normalizedKey = normalizeKey(key);
  memoryCache[normalizedKey] = data;

  // Aliases
  if (normalizedKey === "cadastroVisitantes") {
    memoryCache.visitantes = data;
  }
  if (normalizedKey === "history") {
    memoryCache.historico = data;
  }
}

/**
 * Recupera dados do cache (primeiro memória, depois AsyncStorage)
 * @param {string} key - Chave do cache
 * @returns {any} Dados do cache ou null
 */
export function getCache(key) {
  const normalizedKey = normalizeKey(key);

  // Primeiro tenta memória (mais rápido)
  if (memoryCache[normalizedKey] !== null) {
    return memoryCache[normalizedKey];
  }

  return null;
}

/**
 * Recupera dados do cache de forma assíncrona (verifica AsyncStorage)
 * @param {string} key - Chave do cache
 * @returns {Promise<any>} Dados do cache ou null
 */
export async function getCacheAsync(key) {
  const normalizedKey = normalizeKey(key);

  // Primeiro tenta memória
  if (memoryCache[normalizedKey] !== null) {
    return memoryCache[normalizedKey];
  }

  // Fallback para AsyncStorage
  try {
    const cacheKey = CACHE_KEYS[normalizedKey.toUpperCase()];
    if (cacheKey) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        memoryCache[normalizedKey] = data;
        return data;
      }
    }
  } catch (error) {
    console.error(`❌ [CACHE] Erro ao ler ${key}:`, error);
  }

  return null;
}

/**
 * Verifica se o cache principal está carregado
 * @returns {boolean}
 */
export function isCacheLoaded() {
  return !!(
    getCache("empresasVisitantes") &&
    getCache("setoresVisitantes") &&
    getCache("coresVeiculos") &&
    getCache("tiposVeiculos") &&
    getCache("funcoesVisitantes")
  );
}

/**
 * Limpa todo o cache
 */
export async function clearCache() {
  // Limpa memória
  Object.keys(memoryCache).forEach((key) => {
    memoryCache[key] = null;
  });

  // Limpa AsyncStorage
  try {
    const keys = Object.values(CACHE_KEYS);
    await AsyncStorage.multiRemove(keys);
    console.log("🗑️ [CACHE] Limpo completamente");
  } catch (error) {
    console.error("❌ [CACHE] Erro ao limpar:", error);
  }
}

/**
 * Retorna estatísticas do cache
 * @returns {object} Estatísticas
 */
export function getCacheStats() {
  const stats = {};
  const keysToCheck = [
    "usuarios",
    "cadastroVisitantes",
    "empresasVisitantes",
    "setoresVisitantes",
    "coresVeiculos",
    "tiposVeiculos",
    "funcoesVisitantes",
    "responsaveis",
    "funcionarios",
    "visitors",
    "history",
    "agendamentos",
    "tickets",
  ];

  keysToCheck.forEach((key) => {
    const data = getCache(key);
    stats[key] = Array.isArray(data) ? data.length : data ? 1 : 0;
  });

  stats.lastUpdate = memoryCache.lastUpdate
    ? new Date(memoryCache.lastUpdate)
    : null;
  stats.isLoaded = isCacheLoaded();

  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES CRUD GENÉRICAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adiciona um item ao cache de uma lista
 * @param {string} cacheKey - Chave do cache
 * @param {object} item - Item a ser adicionado
 * @param {string} sortField - Campo para ordenação (opcional)
 * @param {string} sortOrder - 'asc' ou 'desc' (padrão: 'asc')
 * @returns {array} Nova lista
 */
export async function addToCache(
  cacheKey,
  item,
  sortField = null,
  sortOrder = "asc",
) {
  const items = getCache(cacheKey) || [];

  // Verifica duplicatas
  if (item.id && items.find((i) => i.id === item.id)) {
    console.log(`⚠️ [CACHE] Item ${item.id} já existe em ${cacheKey}`);
    return items;
  }

  let newItems = [...items, item];

  // Ordena se necessário
  if (sortField) {
    newItems = newItems.sort((a, b) => {
      const valA = (a[sortField] || "").toString().toLowerCase();
      const valB = (b[sortField] || "").toString().toLowerCase();
      const result = valA.localeCompare(valB, "pt-BR");
      return sortOrder === "desc" ? -result : result;
    });
  }

  await setCache(cacheKey, newItems);
  return newItems;
}

/**
 * Atualiza um item no cache
 * @param {string} cacheKey - Chave do cache
 * @param {any} id - ID do item
 * @param {object} updates - Dados atualizados
 * @param {string} idField - Campo de identificação (padrão: 'id')
 * @returns {array} Nova lista
 */
export async function updateInCache(cacheKey, id, updates, idField = "id") {
  const items = getCache(cacheKey) || [];
  const newItems = items.map((item) =>
    item[idField] === id ? { ...item, ...updates } : item,
  );
  await setCache(cacheKey, newItems);
  return newItems;
}

/**
 * Remove um item do cache
 * @param {string} cacheKey - Chave do cache
 * @param {any} id - ID do item
 * @param {string} idField - Campo de identificação (padrão: 'id')
 * @returns {array} Nova lista
 */
export async function removeFromCache(cacheKey, id, idField = "id") {
  const items = getCache(cacheKey) || [];
  const newItems = items.filter((item) => item[idField] !== id);
  await setCache(cacheKey, newItems);
  return newItems;
}

/**
 * Busca um item no cache
 * @param {string} cacheKey - Chave do cache
 * @param {any} id - ID do item
 * @param {string} idField - Campo de identificação (padrão: 'id')
 * @returns {object|null} Item encontrado ou null
 */
export function findInCache(cacheKey, id, idField = "id") {
  const items = getCache(cacheKey) || [];
  return items.find((item) => item[idField] === id) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CARREGAMENTO INICIAL DO CACHE (para restaurar do AsyncStorage)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Restaura cache do AsyncStorage para a memória
 * Deve ser chamado no início do app
 */
export async function restoreCache() {
  try {
    console.log("🔄 [CACHE] Restaurando do AsyncStorage...");

    const keysToRestore = [
      "empresasVisitantes",
      "setoresVisitantes",
      "coresVeiculos",
      "tiposVeiculos",
      "funcoesVisitantes",
      "responsaveis",
      "funcionarios",
      "userData",
    ];

    for (const key of keysToRestore) {
      await getCacheAsync(key);
    }

    console.log("✅ [CACHE] Restaurado com sucesso");
    return true;
  } catch (error) {
    console.error("❌ [CACHE] Erro ao restaurar:", error);
    return false;
  }
}

export default {
  setCache,
  setCacheSync,
  getCache,
  getCacheAsync,
  clearCache,
  isCacheLoaded,
  getCacheStats,
  addToCache,
  updateInCache,
  removeFromCache,
  findInCache,
  restoreCache,
};
