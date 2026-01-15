/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE SERVICE - Sistema Centralizado de Cache
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sistema de cache em duas camadas:
 * 1. Memória (memoryCache) - Acesso instantâneo
 * 2. SessionStorage - Persiste entre navegações na mesma sessão
 *
 * IMPORTANTE:
 * - SessionStorage é limpo quando fecha o navegador
 * - Dados persistem durante navegação entre páginas
 * - Cache carregado uma vez no login via useDataLoader
 * - Sincronização em tempo real via Socket.IO
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TABELAS DO BANCO DE DADOS CACHEADAS:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DADOS PRINCIPAIS (carregados no login):
 * - usuarios: Lista de usuários do sistema
 * - cadastroVisitantes: Cadastro de visitantes
 * - empresasVisitantes: Empresas de onde vêm os visitantes
 * - setoresVisitantes: Setores para onde os visitantes vão
 * - empresas: Empresas dos usuários do sistema
 * - setores: Setores dos usuários do sistema
 * - responsaveis: Responsáveis por liberar visitantes
 * - funcionarios: Lista de funcionários
 * - papeis: Papéis/Roles do sistema
 * - permissoes: Permissões do sistema
 * - usuariosPapeis: Vinculação usuário-papel
 *
 * DADOS OPERACIONAIS (carregados sob demanda ou por Socket):
 * - visitors: Visitantes em tempo real (entrada/saída)
 * - history: Histórico de visitas
 * - agendamentos: Agendamentos de visitantes
 * - tickets: Tickets de suporte
 * - comunicados: Comunicados do sistema
 *
 * DADOS DE DESCARGA:
 * - solicitacoesDescarga: Solicitações de descarga
 * - solicitacoesDescargaHistorico: Histórico de descargas
 *
 * DADOS DE SUPORTE:
 * - conversasSuporte: Conversas do chat de suporte
 * - mensagensSuporte: Mensagens do chat
 *
 * DADOS DE PONTO:
 * - registrosPonto: Registros de ponto dos usuários
 * - historicoPontoDiario: Histórico diário de ponto
 * - registrosFuncionarios: Registros de ponto de funcionários
 *
 * DADOS AUXILIARES:
 * - userData: Dados do usuário logado
 * - dashboardStats: Estatísticas do dashboard (com TTL)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
  usuariosPapeis: null,
  papeisPermissoes: null,

  // Dados operacionais
  visitors: null,
  history: null,
  agendamentos: null,
  tickets: null,
  comunicados: null,

  // Dados de descarga
  solicitacoesDescarga: null,
  solicitacoesDescargaHistorico: null,

  // Dados de suporte
  conversasSuporte: null,
  mensagensSuporte: null,

  // Dados de ponto
  registrosPonto: null,
  historicoPontoDiario: null,
  registrosFuncionarios: null,

  // Dados auxiliares
  userData: null,
  dashboardStats: null,

  // Controle
  lastUpdate: null,

  // ═══════════════════════════════════════════════════════════════
  // ALIASES para compatibilidade com código existente
  // ═══════════════════════════════════════════════════════════════
  visitantes: null, // Alias para cadastroVisitantes
  historico: null, // Alias para history
};

// ═══════════════════════════════════════════════════════════════════════════
// CHAVES DO SESSIONSTORAGE
// ═══════════════════════════════════════════════════════════════════════════
const CACHE_KEYS = {
  // Dados principais
  USUARIOS: "cache_usuarios",
  CADASTROVISITANTES: "cache_cadastro_visitantes",
  EMPRESASVISITANTES: "cache_empresas_visitantes",
  SETORESVISITANTES: "cache_setores_visitantes",
  EMPRESAS: "cache_empresas",
  SETORES: "cache_setores",
  RESPONSAVEIS: "cache_responsaveis",
  FUNCIONARIOS: "cache_funcionarios",
  PAPEIS: "cache_papeis",
  PERMISSOES: "cache_permissoes",
  USUARIOSPAPEIS: "cache_usuarios_papeis",
  PAPEISPERMISSOES: "cache_papeis_permissoes",

  // Dados operacionais
  VISITORS: "cache_visitors",
  HISTORY: "cache_history",
  AGENDAMENTOS: "cache_agendamentos",
  TICKETS: "cache_tickets",
  COMUNICADOS: "cache_comunicados",

  // Dados de descarga
  SOLICITACOESDESCARGA: "cache_solicitacoes_descarga",
  SOLICITACOESDESCARGAHISTORICO: "cache_solicitacoes_descarga_historico",

  // Dados de suporte
  CONVERSASSUPORTE: "cache_conversas_suporte",
  MENSAGENSSUPORTE: "cache_mensagens_suporte",

  // Dados de ponto
  REGISTROSPONTO: "cache_registros_ponto",
  HISTORICOPONTODIARIO: "cache_historico_ponto_diario",
  REGISTROSFUNCIONARIOS: "cache_registros_funcionarios",

  // Dados auxiliares
  USERDATA: "cache_user_data",
  DASHBOARDSTATS: "cache_dashboard_stats",

  // Controle
  LASTUPDATE: "cache_last_update",

  // ═══════════════════════════════════════════════════════════════
  // ALIASES para compatibilidade
  // ═══════════════════════════════════════════════════════════════
  VISITANTES: "cache_cadastro_visitantes", // Alias
  HISTORICO: "cache_history", // Alias
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS DE CACHE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Salva dados no cache (memória + sessionStorage)
 * @param {string} key - Chave do cache
 * @param {any} data - Dados a serem salvos
 */
export function setCache(key, data) {
  try {
    // Normaliza a chave
    const normalizedKey = normalizeKey(key);

    // Salva em memória
    memoryCache[normalizedKey] = data;

    // Alias: visitantes = cadastroVisitantes
    if (normalizedKey === "cadastroVisitantes") {
      memoryCache.visitantes = data;
    }
    if (normalizedKey === "visitantes") {
      memoryCache.cadastroVisitantes = data;
    }

    // Alias: historico = history
    if (normalizedKey === "history") {
      memoryCache.historico = data;
    }
    if (normalizedKey === "historico") {
      memoryCache.history = data;
    }

    // Salva no sessionStorage
    const cacheKey = CACHE_KEYS[normalizedKey.toUpperCase()];
    if (cacheKey) {
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    }

    // Atualiza timestamp
    const now = Date.now();
    memoryCache.lastUpdate = now;
    sessionStorage.setItem(CACHE_KEYS.LASTUPDATE, now.toString());

    console.log(
      `✅ Cache salvo: ${key} (${Array.isArray(data) ? data.length + " itens" : "dados"})`
    );
  } catch (error) {
    console.error(`❌ Erro ao salvar cache ${key}:`, error);
  }
}

/**
 * Recupera dados do cache (primeiro memória, depois sessionStorage)
 * @param {string} key - Chave do cache
 * @returns {any} Dados do cache ou null
 */
export function getCache(key) {
  const normalizedKey = normalizeKey(key);

  // Primeiro tenta memória (mais rápido)
  if (memoryCache[normalizedKey] !== null) {
    return memoryCache[normalizedKey];
  }

  // Fallback para sessionStorage
  try {
    const cacheKey = CACHE_KEYS[normalizedKey.toUpperCase()];
    if (cacheKey) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        memoryCache[normalizedKey] = data;
        return data;
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao ler cache ${key}:`, error);
  }

  return null;
}

/**
 * Normaliza a chave removendo underscores e convertendo para camelCase
 * @param {string} key - Chave original
 * @returns {string} Chave normalizada
 */
function normalizeKey(key) {
  // Aliases diretos
  const aliases = {
    empresas: "empresas",
    setores: "setores",
    visitantes: "cadastroVisitantes",
    historico: "history",
    user_data: "userData",
  };

  if (aliases[key.toLowerCase()]) {
    return aliases[key.toLowerCase()];
  }

  // Converte snake_case para camelCase
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Verifica se o cache principal está carregado
 * @returns {boolean}
 */
export function isCacheLoaded() {
  return !!(
    getCache("cadastroVisitantes") &&
    getCache("empresasVisitantes") &&
    getCache("setoresVisitantes")
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
    "empresas",
    "setores",
    "responsaveis",
    "funcionarios",
    "papeis",
    "permissoes",
    "visitors",
    "history",
    "agendamentos",
    "tickets",
    "comunicados",
    "solicitacoesDescarga",
    "conversasSuporte",
  ];

  keysToCheck.forEach((key) => {
    const data = getCache(key);
    stats[key] = Array.isArray(data) ? data.length : data ? 1 : 0;
  });

  stats.lastUpdate = getCache("lastUpdate")
    ? new Date(parseInt(getCache("lastUpdate")))
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
export function addToCache(
  cacheKey,
  item,
  sortField = null,
  sortOrder = "asc"
) {
  const items = getCache(cacheKey) || [];

  // Verifica duplicatas
  if (item.id && items.find((i) => i.id === item.id)) {
    console.log(`⚠️ Item ${item.id} já existe no cache ${cacheKey}`);
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

  setCache(cacheKey, newItems);
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
export function updateInCache(cacheKey, id, updates, idField = "id") {
  const items = getCache(cacheKey) || [];
  const newItems = items.map((item) =>
    item[idField] === id ? { ...item, ...updates } : item
  );
  setCache(cacheKey, newItems);
  return newItems;
}

/**
 * Remove um item do cache
 * @param {string} cacheKey - Chave do cache
 * @param {any} id - ID do item
 * @param {string} idField - Campo de identificação (padrão: 'id')
 * @returns {array} Nova lista
 */
export function removeFromCache(cacheKey, id, idField = "id") {
  const items = getCache(cacheKey) || [];
  const newItems = items.filter((item) => item[idField] !== id);
  setCache(cacheKey, newItems);
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
// FUNÇÕES ESPECÍFICAS PARA VISITANTES (CADASTRO)
// ═══════════════════════════════════════════════════════════════════════════

export function addVisitanteToCache(visitante) {
  return addToCache("cadastroVisitantes", visitante, "nome", "asc");
}

export function updateVisitanteInCache(id, dados) {
  const result = updateInCache("cadastroVisitantes", id, dados);
  // Reordena por nome
  const sorted = result.sort((a, b) =>
    (a.nome || "")
      .toLowerCase()
      .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
  );
  setCache("cadastroVisitantes", sorted);
  return sorted;
}

export function removeVisitanteFromCache(id) {
  return removeFromCache("cadastroVisitantes", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA HISTÓRICO
// ═══════════════════════════════════════════════════════════════════════════

export function addHistoricoToCache(registro) {
  const historico = getCache("history") || [];
  const newHistorico = [registro, ...historico].sort((a, b) => {
    const dateA = new Date(a.data_de_entrada || a.criado_em);
    const dateB = new Date(b.data_de_entrada || b.criado_em);
    return dateB - dateA;
  });
  setCache("history", newHistorico);
  return newHistorico;
}

export function updateHistoricoInCache(id, dados) {
  return updateInCache("history", id, dados);
}

export function removeHistoricoFromCache(id) {
  return removeFromCache("history", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA AGENDAMENTOS
// ═══════════════════════════════════════════════════════════════════════════

export function addAgendamentoToCache(agendamento) {
  const agendamentos = getCache("agendamentos") || [];
  const newAgendamentos = [agendamento, ...agendamentos].sort((a, b) => {
    const dateA = new Date(a.horario_agendado || a.created_at);
    const dateB = new Date(b.horario_agendado || b.created_at);
    return dateA - dateB;
  });
  setCache("agendamentos", newAgendamentos);
  return newAgendamentos;
}

export function updateAgendamentoInCache(id, dados) {
  return updateInCache("agendamentos", id, dados);
}

export function removeAgendamentoFromCache(id) {
  return removeFromCache("agendamentos", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA TICKETS
// ═══════════════════════════════════════════════════════════════════════════

export function addTicketToCache(ticket) {
  const tickets = getCache("tickets") || [];
  const newTickets = [ticket, ...tickets];
  setCache("tickets", newTickets);
  return newTickets;
}

export function updateTicketInCache(id, dados) {
  return updateInCache("tickets", id, dados);
}

export function removeTicketFromCache(id) {
  return removeFromCache("tickets", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA FUNCIONÁRIOS
// ═══════════════════════════════════════════════════════════════════════════

export function addFuncionarioToCache(funcionario) {
  return addToCache("funcionarios", funcionario, "nome", "asc");
}

export function updateFuncionarioInCache(cracha, dados) {
  return updateInCache("funcionarios", cracha, dados, "cracha");
}

export function removeFuncionarioFromCache(cracha) {
  return removeFromCache("funcionarios", cracha, "cracha");
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA EMPRESAS DE VISITANTES
// ═══════════════════════════════════════════════════════════════════════════

export function addEmpresaVisitanteToCache(empresa) {
  return addToCache("empresasVisitantes", empresa, "nome", "asc");
}

export function updateEmpresaVisitanteInCache(id, dados) {
  const result = updateInCache("empresasVisitantes", id, dados);
  const sorted = result.sort((a, b) =>
    (a.nome || "")
      .toLowerCase()
      .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
  );
  setCache("empresasVisitantes", sorted);
  return sorted;
}

export function removeEmpresaVisitanteFromCache(id) {
  return removeFromCache("empresasVisitantes", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA SETORES DE VISITANTES
// ═══════════════════════════════════════════════════════════════════════════

export function addSetorVisitanteToCache(setor) {
  return addToCache("setoresVisitantes", setor, "nome", "asc");
}

export function updateSetorVisitanteInCache(id, dados) {
  const result = updateInCache("setoresVisitantes", id, dados);
  const sorted = result.sort((a, b) =>
    (a.nome || "")
      .toLowerCase()
      .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
  );
  setCache("setoresVisitantes", sorted);
  return sorted;
}

export function removeSetorVisitanteFromCache(id) {
  return removeFromCache("setoresVisitantes", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA PERMISSÕES
// ═══════════════════════════════════════════════════════════════════════════

export function setPermissoesCache(permissoes, papeis) {
  setCache("permissoes", permissoes);
  setCache("papeis", papeis);
}

export function getPermissoesCache() {
  return {
    permissoes: getCache("permissoes"),
    papeis: getCache("papeis"),
  };
}

export function clearPermissoesCache() {
  memoryCache.permissoes = null;
  memoryCache.papeis = null;
  sessionStorage.removeItem(CACHE_KEYS.PERMISSOES);
  sessionStorage.removeItem(CACHE_KEYS.PAPEIS);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA COMUNICADOS
// ═══════════════════════════════════════════════════════════════════════════

export function addComunicadoToCache(comunicado) {
  const comunicados = getCache("comunicados") || [];
  const newComunicados = [comunicado, ...comunicados];
  setCache("comunicados", newComunicados);
  return newComunicados;
}

export function updateComunicadoInCache(id, dados) {
  return updateInCache("comunicados", id, dados);
}

export function removeComunicadoFromCache(id) {
  return removeFromCache("comunicados", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA SOLICITAÇÕES DE DESCARGA
// ═══════════════════════════════════════════════════════════════════════════

export function addSolicitacaoDescargaToCache(solicitacao) {
  const solicitacoes = getCache("solicitacoesDescarga") || [];
  const newSolicitacoes = [solicitacao, ...solicitacoes];
  setCache("solicitacoesDescarga", newSolicitacoes);
  return newSolicitacoes;
}

export function updateSolicitacaoDescargaInCache(id, dados) {
  return updateInCache("solicitacoesDescarga", id, dados);
}

export function removeSolicitacaoDescargaFromCache(id) {
  return removeFromCache("solicitacoesDescarga", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA CONVERSAS DE SUPORTE
// ═══════════════════════════════════════════════════════════════════════════

export function addConversaSuporteToCache(conversa) {
  return addToCache("conversasSuporte", conversa);
}

export function updateConversaSuporteInCache(id, dados) {
  return updateInCache("conversasSuporte", id, dados);
}

export function addMensagemSuporteToCache(conversaId, mensagem) {
  const mensagens = getCache("mensagensSuporte") || {};
  const conversaMensagens = mensagens[conversaId] || [];
  mensagens[conversaId] = [...conversaMensagens, mensagem];
  setCache("mensagensSuporte", mensagens);
  return mensagens;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA VISITORS (ENTRADA/SAÍDA EM TEMPO REAL)
// ═══════════════════════════════════════════════════════════════════════════

export function addVisitorToCache(visitor) {
  return addToCache("visitors", visitor);
}

export function updateVisitorInCache(id, dados) {
  return updateInCache("visitors", id, dados);
}

export function removeVisitorFromCache(id) {
  return removeFromCache("visitors", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESPECÍFICAS PARA USUÁRIOS
// ═══════════════════════════════════════════════════════════════════════════

export function addUsuarioToCache(usuario) {
  return addToCache("usuarios", usuario, "nome", "asc");
}

export function updateUsuarioInCache(id, dados) {
  return updateInCache("usuarios", id, dados);
}

export function removeUsuarioFromCache(id) {
  return removeFromCache("usuarios", id);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT
// ═══════════════════════════════════════════════════════════════════════════
export default {
  // Funções principais
  setCache,
  getCache,
  clearCache,
  isCacheLoaded,
  getCacheStats,

  // Funções CRUD genéricas
  addToCache,
  updateInCache,
  removeFromCache,
  findInCache,

  // Visitantes (cadastro)
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

  // Tickets
  addTicketToCache,
  updateTicketInCache,
  removeTicketFromCache,

  // Funcionários
  addFuncionarioToCache,
  updateFuncionarioInCache,
  removeFuncionarioFromCache,

  // Empresas Visitantes
  addEmpresaVisitanteToCache,
  updateEmpresaVisitanteInCache,
  removeEmpresaVisitanteFromCache,

  // Setores Visitantes
  addSetorVisitanteToCache,
  updateSetorVisitanteInCache,
  removeSetorVisitanteFromCache,

  // Permissões
  setPermissoesCache,
  getPermissoesCache,
  clearPermissoesCache,

  // Comunicados
  addComunicadoToCache,
  updateComunicadoInCache,
  removeComunicadoFromCache,

  // Solicitações de Descarga
  addSolicitacaoDescargaToCache,
  updateSolicitacaoDescargaInCache,
  removeSolicitacaoDescargaFromCache,

  // Conversas Suporte
  addConversaSuporteToCache,
  updateConversaSuporteInCache,
  addMensagemSuporteToCache,

  // Visitors (tempo real)
  addVisitorToCache,
  updateVisitorInCache,
  removeVisitorFromCache,

  // Usuários
  addUsuarioToCache,
  updateUsuarioInCache,
  removeUsuarioFromCache,
};
