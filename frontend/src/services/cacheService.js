/**
 * CacheService - Sistema de cache em memória/sessionStorage
 *
 * IMPORTANTE:
 * - sessionStorage é limpo quando fecha o navegador
 * - Dados persistem durante navegação entre páginas
 * - Cache carregado uma vez no login
 */

// Cache em memória para acesso rápido (mais rápido que sessionStorage)
const memoryCache = {
  visitantes: null,
  empresas: null,
  setores: null,
  responsaveis: null,
  historico: null,
  tickets: null,
  lastUpdate: null,
};

// Chaves do sessionStorage
const CACHE_KEYS = {
  VISITANTES: "cache_visitantes",
  EMPRESAS: "cache_empresas",
  SETORES: "cache_setores",
  RESPONSAVEIS: "cache_responsaveis",
  HISTORICO: "cache_historico",
  TICKETS: "cache_tickets",
  LAST_UPDATE: "cache_last_update",
  USER_DATA: "cache_user_data",
};

/**
 * Salva dados no cache (memória + sessionStorage)
 */
export function setCache(key, data) {
  try {
    // Salva em memória (acesso instantâneo)
    memoryCache[key] = data;

    // Salva no sessionStorage (persiste entre navegações)
    const cacheKey = CACHE_KEYS[key.toUpperCase()];
    if (cacheKey) {
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    }

    // Atualiza timestamp
    const now = Date.now();
    memoryCache.lastUpdate = now;
    sessionStorage.setItem(CACHE_KEYS.LAST_UPDATE, now.toString());

    console.log(
      `✅ Cache salvo: ${key} (${Array.isArray(data) ? data.length + " itens" : "dados"})`
    );
  } catch (error) {
    console.error(`❌ Erro ao salvar cache ${key}:`, error);
  }
}

/**
 * Recupera dados do cache (primeiro memória, depois sessionStorage)
 */
export function getCache(key) {
  // Primeiro tenta memória (mais rápido)
  if (memoryCache[key]) {
    return memoryCache[key];
  }

  // Fallback para sessionStorage
  try {
    const cacheKey = CACHE_KEYS[key.toUpperCase()];
    if (cacheKey) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Restaura na memória para próximos acessos
        memoryCache[key] = data;
        return data;
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao ler cache ${key}:`, error);
  }

  return null;
}

/**
 * Verifica se o cache está carregado
 */
export function isCacheLoaded() {
  return !!(
    getCache("visitantes") &&
    getCache("empresas") &&
    getCache("setores")
  );
}

/**
 * Limpa todo o cache
 */
export function clearCache() {
  // Limpa memória
  Object.keys(memoryCache).forEach((key) => {
    memoryCache[key] = null;
  });

  // Limpa sessionStorage
  Object.values(CACHE_KEYS).forEach((key) => {
    sessionStorage.removeItem(key);
  });

  console.log("🗑️ Cache limpo completamente");
}

/**
 * Adiciona um item ao cache de visitantes
 */
export function addVisitanteToCache(visitante) {
  const visitantes = getCache("visitantes") || [];
  const newVisitantes = [...visitantes, visitante].sort((a, b) => {
    const nomeA = (a.nome || "").toLowerCase();
    const nomeB = (b.nome || "").toLowerCase();
    return nomeA.localeCompare(nomeB, "pt-BR");
  });
  setCache("visitantes", newVisitantes);
  return newVisitantes;
}

/**
 * Atualiza um visitante no cache
 */
export function updateVisitanteInCache(id, dadosAtualizados) {
  const visitantes = getCache("visitantes") || [];
  const newVisitantes = visitantes
    .map((v) => (v.id === id ? { ...v, ...dadosAtualizados } : v))
    .sort((a, b) => {
      const nomeA = (a.nome || "").toLowerCase();
      const nomeB = (b.nome || "").toLowerCase();
      return nomeA.localeCompare(nomeB, "pt-BR");
    });
  setCache("visitantes", newVisitantes);
  return newVisitantes;
}

/**
 * Remove um visitante do cache
 */
export function removeVisitanteFromCache(id) {
  const visitantes = getCache("visitantes") || [];
  const newVisitantes = visitantes.filter((v) => v.id !== id);
  setCache("visitantes", newVisitantes);
  return newVisitantes;
}

/**
 * Adiciona um item ao cache de histórico
 */
export function addHistoricoToCache(visitante) {
  const historico = getCache("historico") || [];
  const newHistorico = [visitante, ...historico].sort((a, b) => {
    const dateA = new Date(a.entry_date || a.created_at);
    const dateB = new Date(b.entry_date || b.created_at);
    return dateB - dateA; // Mais recente primeiro
  });
  setCache("historico", newHistorico);
  return newHistorico;
}

/**
 * Atualiza um visitante no cache de histórico
 */
export function updateHistoricoInCache(id, dadosAtualizados) {
  const historico = getCache("historico") || [];
  const newHistorico = historico
    .map((v) => (v.id === id ? { ...v, ...dadosAtualizados } : v))
    .sort((a, b) => {
      const dateA = new Date(a.entry_date || a.created_at);
      const dateB = new Date(b.entry_date || b.created_at);
      return dateB - dateA;
    });
  setCache("historico", newHistorico);
  return newHistorico;
}

/**
 * Remove um visitante do cache de histórico
 */
export function removeHistoricoFromCache(id) {
  const historico = getCache("historico") || [];
  const newHistorico = historico.filter((v) => v.id !== id);
  setCache("historico", newHistorico);
  return newHistorico;
}

/**
 * Retorna estatísticas do cache
 */
export function getCacheStats() {
  const visitantes = getCache("visitantes") || [];
  const empresas = getCache("empresas") || [];
  const setores = getCache("setores") || [];
  const historico = getCache("historico") || [];
  const lastUpdate = getCache("lastUpdate");

  return {
    visitantes: visitantes.length,
    empresas: empresas.length,
    setores: setores.length,
    historico: historico.length,
    lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)) : null,
    isLoaded: isCacheLoaded(),
  };
}

export default {
  setCache,
  getCache,
  clearCache,
  isCacheLoaded,
  addVisitanteToCache,
  updateVisitanteInCache,
  removeVisitanteFromCache,
  addHistoricoToCache,
  updateHistoricoInCache,
  removeHistoricoFromCache,
  getCacheStats,
};
