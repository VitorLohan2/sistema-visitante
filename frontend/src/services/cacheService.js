/**
 * CacheService - Sistema de cache em memória/sessionStorage
 *
 * IMPORTANTE:
 * - sessionStorage é limpo quando fecha o navegador
 * - Dados persistem durante navegação entre páginas
 * - Cache carregado uma vez no login
 *
 * DADOS CACHEADOS:
 * - visitantes: Lista de visitantes cadastrados
 * - empresas: Empresas de funcionários
 * - setores: Setores de funcionários
 * - empresasVisitantes: Empresas de visitantes
 * - setoresVisitantes: Setores de visitantes
 * - responsaveis: Lista de responsáveis
 * - historico: Histórico de visitas
 * - tickets: Tickets de suporte
 * - agendamentos: Agendamentos de visitantes
 * - funcionarios: Lista de funcionários
 * - permissoes: Permissões do usuário logado
 * - papeis: Papéis do usuário logado
 * - dashboardStats: Estatísticas do dashboard (com TTL)
 */

// Cache em memória para acesso rápido (mais rápido que sessionStorage)
const memoryCache = {
  visitantes: null,
  empresas: null,
  setores: null,
  empresasVisitantes: null,
  setoresVisitantes: null,
  responsaveis: null,
  historico: null,
  tickets: null,
  agendamentos: null,
  funcionarios: null,
  permissoes: null,
  papeis: null,
  dashboardStats: null,
  lastUpdate: null,
};

// Chaves do sessionStorage
const CACHE_KEYS = {
  VISITANTES: "cache_visitantes",
  EMPRESAS: "cache_empresas",
  SETORES: "cache_setores",
  EMPRESASVISITANTES: "cache_empresas_visitantes",
  SETORESVISITANTES: "cache_setores_visitantes",
  RESPONSAVEIS: "cache_responsaveis",
  HISTORICO: "cache_historico",
  TICKETS: "cache_tickets",
  AGENDAMENTOS: "cache_agendamentos",
  FUNCIONARIOS: "cache_funcionarios",
  PERMISSOES: "cache_permissoes",
  PAPEIS: "cache_papeis",
  DASHBOARD_STATS: "cache_dashboard_stats",
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
  const agendamentos = getCache("agendamentos") || [];
  const funcionarios = getCache("funcionarios") || [];
  const lastUpdate = getCache("lastUpdate");

  return {
    visitantes: visitantes.length,
    empresas: empresas.length,
    setores: setores.length,
    historico: historico.length,
    agendamentos: agendamentos.length,
    funcionarios: funcionarios.length,
    lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)) : null,
    isLoaded: isCacheLoaded(),
  };
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES PARA AGENDAMENTOS
// ═══════════════════════════════════════════════════════════════

/**
 * Adiciona um agendamento ao cache
 */
export function addAgendamentoToCache(agendamento) {
  const agendamentos = getCache("agendamentos") || [];
  const newAgendamentos = [agendamento, ...agendamentos].sort((a, b) => {
    const dateA = new Date(a.horario_agendado || a.created_at);
    const dateB = new Date(b.horario_agendado || b.created_at);
    return dateA - dateB; // Mais próximo primeiro
  });
  setCache("agendamentos", newAgendamentos);
  return newAgendamentos;
}

/**
 * Atualiza um agendamento no cache
 */
export function updateAgendamentoInCache(id, dadosAtualizados) {
  const agendamentos = getCache("agendamentos") || [];
  const newAgendamentos = agendamentos.map((a) =>
    a.id === id ? { ...a, ...dadosAtualizados } : a
  );
  setCache("agendamentos", newAgendamentos);
  return newAgendamentos;
}

/**
 * Remove um agendamento do cache
 */
export function removeAgendamentoFromCache(id) {
  const agendamentos = getCache("agendamentos") || [];
  const newAgendamentos = agendamentos.filter((a) => a.id !== id);
  setCache("agendamentos", newAgendamentos);
  return newAgendamentos;
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES PARA FUNCIONÁRIOS
// ═══════════════════════════════════════════════════════════════

/**
 * Adiciona um funcionário ao cache
 */
export function addFuncionarioToCache(funcionario) {
  const funcionarios = getCache("funcionarios") || [];
  const newFuncionarios = [...funcionarios, funcionario].sort((a, b) => {
    const nomeA = (a.nome || "").toLowerCase();
    const nomeB = (b.nome || "").toLowerCase();
    return nomeA.localeCompare(nomeB, "pt-BR");
  });
  setCache("funcionarios", newFuncionarios);
  return newFuncionarios;
}

/**
 * Atualiza um funcionário no cache
 */
export function updateFuncionarioInCache(cracha, dadosAtualizados) {
  const funcionarios = getCache("funcionarios") || [];
  const newFuncionarios = funcionarios.map((f) =>
    f.cracha === cracha ? { ...f, ...dadosAtualizados } : f
  );
  setCache("funcionarios", newFuncionarios);
  return newFuncionarios;
}

/**
 * Remove um funcionário do cache
 */
export function removeFuncionarioFromCache(cracha) {
  const funcionarios = getCache("funcionarios") || [];
  const newFuncionarios = funcionarios.filter((f) => f.cracha !== cracha);
  setCache("funcionarios", newFuncionarios);
  return newFuncionarios;
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES PARA PERMISSÕES (integração com permissoesService)
// ═══════════════════════════════════════════════════════════════

/**
 * Salva permissões e papéis no cache
 */
export function setPermissoesCache(permissoes, papeis) {
  setCache("permissoes", permissoes);
  setCache("papeis", papeis);
}

/**
 * Recupera permissões do cache
 */
export function getPermissoesCache() {
  return {
    permissoes: getCache("permissoes"),
    papeis: getCache("papeis"),
  };
}

/**
 * Limpa cache de permissões
 */
export function clearPermissoesCache() {
  memoryCache.permissoes = null;
  memoryCache.papeis = null;
  sessionStorage.removeItem(CACHE_KEYS.PERMISSOES);
  sessionStorage.removeItem(CACHE_KEYS.PAPEIS);
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES PARA TICKETS
// ═══════════════════════════════════════════════════════════════

/**
 * Adiciona um ticket ao cache
 */
export function addTicketToCache(ticket) {
  const tickets = getCache("tickets") || [];
  const newTickets = [ticket, ...tickets];
  setCache("tickets", newTickets);
  return newTickets;
}

/**
 * Atualiza um ticket no cache
 */
export function updateTicketInCache(id, dadosAtualizados) {
  const tickets = getCache("tickets") || [];
  const newTickets = tickets.map((t) =>
    t.id === id ? { ...t, ...dadosAtualizados } : t
  );
  setCache("tickets", newTickets);
  return newTickets;
}

/**
 * Remove um ticket do cache
 */
export function removeTicketFromCache(id) {
  const tickets = getCache("tickets") || [];
  const newTickets = tickets.filter((t) => t.id !== id);
  setCache("tickets", newTickets);
  return newTickets;
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES PARA EMPRESAS DE VISITANTES
// ═══════════════════════════════════════════════════════════════

/**
 * Adiciona uma empresa de visitante ao cache
 */
export function addEmpresaVisitanteToCache(empresa) {
  const empresas = getCache("empresasVisitantes") || [];
  const newEmpresas = [...empresas, empresa].sort((a, b) => {
    const nomeA = (a.nome || "").toLowerCase();
    const nomeB = (b.nome || "").toLowerCase();
    return nomeA.localeCompare(nomeB, "pt-BR");
  });
  setCache("empresasVisitantes", newEmpresas);
  return newEmpresas;
}

/**
 * Atualiza uma empresa de visitante no cache
 */
export function updateEmpresaVisitanteInCache(id, dadosAtualizados) {
  const empresas = getCache("empresasVisitantes") || [];
  const newEmpresas = empresas
    .map((e) => (e.id === id ? { ...e, ...dadosAtualizados } : e))
    .sort((a, b) => {
      const nomeA = (a.nome || "").toLowerCase();
      const nomeB = (b.nome || "").toLowerCase();
      return nomeA.localeCompare(nomeB, "pt-BR");
    });
  setCache("empresasVisitantes", newEmpresas);
  return newEmpresas;
}

/**
 * Remove uma empresa de visitante do cache
 */
export function removeEmpresaVisitanteFromCache(id) {
  const empresas = getCache("empresasVisitantes") || [];
  const newEmpresas = empresas.filter((e) => e.id !== id);
  setCache("empresasVisitantes", newEmpresas);
  return newEmpresas;
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES PARA SETORES DE VISITANTES
// ═══════════════════════════════════════════════════════════════

/**
 * Adiciona um setor de visitante ao cache
 */
export function addSetorVisitanteToCache(setor) {
  const setores = getCache("setoresVisitantes") || [];
  const newSetores = [...setores, setor].sort((a, b) => {
    const nomeA = (a.nome || "").toLowerCase();
    const nomeB = (b.nome || "").toLowerCase();
    return nomeA.localeCompare(nomeB, "pt-BR");
  });
  setCache("setoresVisitantes", newSetores);
  return newSetores;
}

/**
 * Atualiza um setor de visitante no cache
 */
export function updateSetorVisitanteInCache(id, dadosAtualizados) {
  const setores = getCache("setoresVisitantes") || [];
  const newSetores = setores
    .map((s) => (s.id === id ? { ...s, ...dadosAtualizados } : s))
    .sort((a, b) => {
      const nomeA = (a.nome || "").toLowerCase();
      const nomeB = (b.nome || "").toLowerCase();
      return nomeA.localeCompare(nomeB, "pt-BR");
    });
  setCache("setoresVisitantes", newSetores);
  return newSetores;
}

/**
 * Remove um setor de visitante do cache
 */
export function removeSetorVisitanteFromCache(id) {
  const setores = getCache("setoresVisitantes") || [];
  const newSetores = setores.filter((s) => s.id !== id);
  setCache("setoresVisitantes", newSetores);
  return newSetores;
}

export default {
  setCache,
  getCache,
  clearCache,
  isCacheLoaded,
  // Visitantes
  addVisitanteToCache,
  updateVisitanteInCache,
  removeVisitanteFromCache,
  // Histórico
  addHistoricoToCache,
  updateHistoricoInCache,
  removeHistoricoFromCache,
  // Agendamentos
  addAgendamentoToCache,
  updateAgendamentoInCache,
  removeAgendamentoFromCache,
  // Funcionários
  addFuncionarioToCache,
  updateFuncionarioInCache,
  removeFuncionarioFromCache,
  // Permissões
  setPermissoesCache,
  getPermissoesCache,
  clearPermissoesCache,
  // Tickets
  addTicketToCache,
  updateTicketInCache,
  removeTicketFromCache,
  // Empresas de Visitantes
  addEmpresaVisitanteToCache,
  updateEmpresaVisitanteInCache,
  removeEmpresaVisitanteFromCache,
  // Setores de Visitantes
  addSetorVisitanteToCache,
  updateSetorVisitanteInCache,
  removeSetorVisitanteFromCache,
  // Stats
  getCacheStats,
};
