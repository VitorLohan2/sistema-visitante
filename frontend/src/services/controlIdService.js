/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVICE: Control iD - Serviço de API para Equipamentos de Controle de Acesso
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este serviço encapsula todas as chamadas à API do backend relacionadas
 * ao módulo de integração com equipamentos Control iD.
 *
 * Uso:
 * import controlIdService from '../services/controlIdService';
 * const dispositivos = await controlIdService.listarDispositivos();
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";

const controlIdService = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK E STATUS GERAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verifica se o microserviço está online
   */
  async healthCheck() {
    const response = await api.get("/controlid/health");
    return response.data;
  },

  /**
   * Resumo de status de todos os dispositivos
   */
  async resumoStatus() {
    const response = await api.get("/controlid/devices/status-summary");
    return response.data;
  },

  /**
   * Lista modelos de equipamentos suportados
   */
  async listarModelos() {
    const response = await api.get("/controlid/devices/models");
    return response.data;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSITIVOS - CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista todos os dispositivos cadastrados
   */
  async listarDispositivos() {
    const response = await api.get("/controlid/devices");
    return response.data;
  },

  /**
   * Busca um dispositivo pelo ID
   */
  async buscarDispositivo(id) {
    const response = await api.get(`/controlid/devices/${id}`);
    return response.data;
  },

  /**
   * Cadastra um novo dispositivo
   */
  async cadastrarDispositivo(dados) {
    const response = await api.post("/controlid/devices", dados);
    return response.data;
  },

  /**
   * Atualiza um dispositivo
   */
  async atualizarDispositivo(id, dados) {
    const response = await api.put(`/controlid/devices/${id}`, dados);
    return response.data;
  },

  /**
   * Remove um dispositivo
   */
  async removerDispositivo(id) {
    await api.delete(`/controlid/devices/${id}`);
  },

  /**
   * Verifica status de um dispositivo
   */
  async verificarStatus(id) {
    const response = await api.post(`/controlid/devices/${id}/check-status`);
    return response.data;
  },

  /**
   * Busca informações do sistema do dispositivo
   */
  async buscarInfoSistema(id) {
    const response = await api.get(`/controlid/devices/${id}/system-info`);
    return response.data;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // USUÁRIOS NO DISPOSITIVO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista usuários de um dispositivo
   */
  async listarUsuarios(deviceId, filtros = {}) {
    const response = await api.get(`/controlid/devices/${deviceId}/users`, {
      params: filtros,
    });
    return response.data;
  },

  /**
   * Busca um usuário pelo ID
   */
  async buscarUsuario(deviceId, userId) {
    const response = await api.get(
      `/controlid/devices/${deviceId}/users/${userId}`,
    );
    return response.data;
  },

  /**
   * Cria um usuário no dispositivo
   */
  async criarUsuario(deviceId, dados) {
    const response = await api.post(
      `/controlid/devices/${deviceId}/users`,
      dados,
    );
    return response.data;
  },

  /**
   * Atualiza um usuário no dispositivo
   */
  async atualizarUsuario(deviceId, userId, dados) {
    const response = await api.put(
      `/controlid/devices/${deviceId}/users/${userId}`,
      dados,
    );
    return response.data;
  },

  /**
   * Remove um usuário do dispositivo
   */
  async removerUsuario(deviceId, userId) {
    await api.delete(`/controlid/devices/${deviceId}/users/${userId}`);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDENCIAIS - CARTÕES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista cartões de um dispositivo
   */
  async listarCartoes(deviceId) {
    const response = await api.get(`/controlid/devices/${deviceId}/cards`);
    return response.data;
  },

  /**
   * Cria um cartão
   */
  async criarCartao(deviceId, dados) {
    const response = await api.post(
      `/controlid/devices/${deviceId}/cards`,
      dados,
    );
    return response.data;
  },

  /**
   * Remove um cartão
   */
  async removerCartao(deviceId, cardId) {
    await api.delete(`/controlid/devices/${deviceId}/cards/${cardId}`);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDENCIAIS - TAGS UHF
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista tags UHF de um dispositivo
   */
  async listarTagsUHF(deviceId) {
    const response = await api.get(`/controlid/devices/${deviceId}/uhf-tags`);
    return response.data;
  },

  /**
   * Cria uma tag UHF
   */
  async criarTagUHF(deviceId, dados) {
    const response = await api.post(
      `/controlid/devices/${deviceId}/uhf-tags`,
      dados,
    );
    return response.data;
  },

  /**
   * Remove uma tag UHF
   */
  async removerTagUHF(deviceId, tagId) {
    await api.delete(`/controlid/devices/${deviceId}/uhf-tags/${tagId}`);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDENCIAIS - QR CODES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista QR Codes de um dispositivo
   */
  async listarQRCodes(deviceId) {
    const response = await api.get(`/controlid/devices/${deviceId}/qr-codes`);
    return response.data;
  },

  /**
   * Cria um QR Code
   */
  async criarQRCode(deviceId, dados) {
    const response = await api.post(
      `/controlid/devices/${deviceId}/qr-codes`,
      dados,
    );
    return response.data;
  },

  /**
   * Remove um QR Code
   */
  async removerQRCode(deviceId, qrId) {
    await api.delete(`/controlid/devices/${deviceId}/qr-codes/${qrId}`);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES DE CONTROLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Abre porta/relé
   * @param {number} deviceId - ID do dispositivo
   * @param {number} doorId - ID da porta (1-4)
   */
  async abrirPorta(deviceId, doorId = 1) {
    const response = await api.post(
      `/controlid/devices/${deviceId}/actions/open-door`,
      { door_id: doorId },
    );
    return response.data;
  },

  /**
   * Abre via SecBox
   * @param {number} deviceId - ID do dispositivo
   * @param {number} secboxId - ID da SecBox
   * @param {string} action - Ação: 'open', 'close', 'trigger'
   */
  async abrirSecBox(deviceId, secboxId, action = "open") {
    const response = await api.post(
      `/controlid/devices/${deviceId}/actions/open-sec-box`,
      { secbox_id: secboxId, action },
    );
    return response.data;
  },

  /**
   * Libera catraca
   * @param {number} deviceId - ID do dispositivo
   * @param {string} direction - Direção: 'clockwise', 'anticlockwise', 'both'
   */
  async liberarCatraca(deviceId, direction = "clockwise") {
    const response = await api.post(
      `/controlid/devices/${deviceId}/actions/release-turnstile`,
      { direction },
    );
    return response.data;
  },

  /**
   * Busca estado das portas
   */
  async estadoPortas(deviceId) {
    const response = await api.get(
      `/controlid/devices/${deviceId}/actions/doors-state`,
    );
    return response.data;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGS DE ACESSO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca logs de acesso de um dispositivo
   * @param {number} deviceId - ID do dispositivo
   * @param {object} filtros - { start_time, end_time, limit, offset }
   */
  async buscarLogsAcesso(deviceId, filtros = {}) {
    const response = await api.get(
      `/controlid/devices/${deviceId}/access-logs`,
      { params: filtros },
    );
    return response.data;
  },

  /**
   * Busca logs de alarme de um dispositivo
   */
  async buscarLogsAlarme(deviceId, filtros = {}) {
    const response = await api.get(
      `/controlid/devices/${deviceId}/alarm-logs`,
      { params: filtros },
    );
    return response.data;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GRUPOS E REGRAS DE ACESSO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista grupos de um dispositivo
   */
  async listarGrupos(deviceId) {
    const response = await api.get(`/controlid/devices/${deviceId}/groups`);
    return response.data;
  },

  /**
   * Cria um grupo
   */
  async criarGrupo(deviceId, dados) {
    const response = await api.post(
      `/controlid/devices/${deviceId}/groups`,
      dados,
    );
    return response.data;
  },

  /**
   * Lista regras de acesso
   */
  async listarRegrasAcesso(deviceId) {
    const response = await api.get(
      `/controlid/devices/${deviceId}/access-rules`,
    );
    return response.data;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGS DO SISTEMA (Admin)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca logs de operação do microserviço
   */
  async buscarLogsOperacao(filtros = {}) {
    const response = await api.get("/controlid/logs", { params: filtros });
    return response.data;
  },

  /**
   * Busca estatísticas de operações
   */
  async estatisticasOperacoes() {
    const response = await api.get("/controlid/logs/stats");
    return response.data;
  },
};

export default controlIdService;
