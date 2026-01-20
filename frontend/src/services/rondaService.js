/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVICE: Ronda de Vigilante
 * Serviço para comunicação com a API de rondas
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";

/**
 * Serviço de Rondas - Agrupa todas as chamadas à API
 */
const rondaService = {
  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DO VIGILANTE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicia uma nova ronda
   * @param {Object} dados - Dados iniciais da ronda
   * @param {number} dados.latitude - Latitude inicial
   * @param {number} dados.longitude - Longitude inicial
   * @param {string} [dados.observacoes] - Observações iniciais
   * @returns {Promise} Dados da ronda criada
   */
  async iniciarRonda(dados) {
    const response = await api.post("/rondas/iniciar", dados);
    return response.data;
  },

  /**
   * Busca ronda em andamento do usuário atual
   * @returns {Promise} Ronda em andamento ou null
   */
  async buscarRondaEmAndamento() {
    const response = await api.get("/rondas/em-andamento");
    return response.data;
  },

  /**
   * Registra um checkpoint na ronda
   * @param {number} rondaId - ID da ronda
   * @param {Object} dados - Dados do checkpoint
   * @param {number} dados.latitude - Latitude do checkpoint
   * @param {number} dados.longitude - Longitude do checkpoint
   * @param {string} [dados.descricao] - Descrição do checkpoint
   * @param {string} [dados.foto_url] - URL da foto do checkpoint
   * @returns {Promise} Dados do checkpoint criado
   */
  async registrarCheckpoint(rondaId, dados) {
    const response = await api.post(`/rondas/${rondaId}/checkpoint`, dados);
    return response.data;
  },

  /**
   * Registra um ponto do trajeto GPS
   * @param {number} rondaId - ID da ronda
   * @param {Object} dados - Dados do ponto GPS
   * @param {number} dados.latitude - Latitude
   * @param {number} dados.longitude - Longitude
   * @param {number} [dados.precisao] - Precisão do GPS em metros
   * @param {number} [dados.altitude] - Altitude em metros
   * @param {number} [dados.velocidade] - Velocidade em m/s
   * @returns {Promise} Confirmação do registro
   */
  async registrarTrajeto(rondaId, dados) {
    const response = await api.post(`/rondas/${rondaId}/trajeto`, dados);
    return response.data;
  },

  /**
   * Finaliza uma ronda em andamento
   * @param {number} rondaId - ID da ronda
   * @param {Object} [dados] - Dados finais
   * @param {number} [dados.latitude] - Latitude final
   * @param {number} [dados.longitude] - Longitude final
   * @param {string} [dados.observacoes] - Observações finais
   * @returns {Promise} Dados da ronda finalizada
   */
  async finalizarRonda(rondaId, dados = {}) {
    const response = await api.put(`/rondas/${rondaId}/finalizar`, dados);
    return response.data;
  },

  /**
   * Cancela uma ronda em andamento
   * @param {number} rondaId - ID da ronda
   * @param {Object} [dados] - Dados do cancelamento
   * @param {string} [dados.motivo] - Motivo do cancelamento
   * @returns {Promise} Confirmação do cancelamento
   */
  async cancelarRonda(rondaId, dados = {}) {
    const response = await api.put(`/rondas/${rondaId}/cancelar`, dados);
    return response.data;
  },

  /**
   * Lista histórico de rondas do usuário
   * @param {Object} [filtros] - Filtros opcionais
   * @param {number} [filtros.pagina] - Número da página
   * @param {number} [filtros.limite] - Limite por página
   * @param {string} [filtros.data_inicio] - Data inicial (YYYY-MM-DD)
   * @param {string} [filtros.data_fim] - Data final (YYYY-MM-DD)
   * @returns {Promise} Lista de rondas com paginação
   */
  async listarHistorico(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.pagina) params.append("pagina", filtros.pagina);
    if (filtros.limite) params.append("limite", filtros.limite);
    if (filtros.data_inicio) params.append("data_inicio", filtros.data_inicio);
    if (filtros.data_fim) params.append("data_fim", filtros.data_fim);

    const response = await api.get(`/rondas/historico?${params.toString()}`);
    return response.data;
  },

  /**
   * Busca detalhes de uma ronda específica
   * @param {number} rondaId - ID da ronda
   * @returns {Promise} Detalhes completos da ronda
   */
  async buscarDetalhes(rondaId) {
    const response = await api.get(`/rondas/${rondaId}`);
    return response.data;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES ADMINISTRATIVAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista todas as rondas (painel admin)
   * @param {Object} [filtros] - Filtros
   * @param {number} [filtros.pagina] - Página
   * @param {number} [filtros.limite] - Limite
   * @param {number} [filtros.usuario_id] - Filtrar por usuário
   * @param {string} [filtros.status] - Filtrar por status
   * @param {string} [filtros.data_inicio] - Data início
   * @param {string} [filtros.data_fim] - Data fim
   * @param {number} [filtros.empresa_id] - Filtrar por empresa
   * @returns {Promise} Lista de rondas
   */
  async listarTodasRondas(filtros = {}) {
    const params = new URLSearchParams();
    Object.keys(filtros).forEach((key) => {
      if (
        filtros[key] !== null &&
        filtros[key] !== undefined &&
        filtros[key] !== ""
      ) {
        params.append(key, filtros[key]);
      }
    });

    const response = await api.get(`/rondas/admin/listar?${params.toString()}`);
    return response.data;
  },

  /**
   * Busca estatísticas de rondas
   * @param {Object} [filtros] - Filtros
   * @param {string} [filtros.data_inicio] - Data início
   * @param {string} [filtros.data_fim] - Data fim
   * @param {number} [filtros.empresa_id] - Filtrar por empresa
   * @returns {Promise} Estatísticas
   */
  async buscarEstatisticas(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.data_inicio) params.append("data_inicio", filtros.data_inicio);
    if (filtros.data_fim) params.append("data_fim", filtros.data_fim);
    if (filtros.empresa_id) params.append("empresa_id", filtros.empresa_id);

    const response = await api.get(
      `/rondas/admin/estatisticas?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Lista registros de auditoria
   * @param {Object} [filtros] - Filtros
   * @returns {Promise} Lista de registros de auditoria
   */
  async listarAuditoria(filtros = {}) {
    const params = new URLSearchParams();
    Object.keys(filtros).forEach((key) => {
      if (
        filtros[key] !== null &&
        filtros[key] !== undefined &&
        filtros[key] !== ""
      ) {
        params.append(key, filtros[key]);
      }
    });

    const response = await api.get(
      `/rondas/admin/auditoria?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Lista vigilantes disponíveis para filtros
   * @returns {Promise} Lista de vigilantes
   */
  async listarVigilantes() {
    const response = await api.get("/rondas/admin/vigilantes");
    return response.data;
  },
};

export default rondaService;
