/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTROL iD SERVICE - Comunicação com Microserviço de Equipamentos
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este serviço atua como intermediário entre o backend principal e o
 * microserviço de integração com equipamentos Control iD.
 *
 * Responsabilidades:
 * - Fazer requisições HTTP para o microserviço
 * - Tratar erros de comunicação
 * - Formatar dados para o frontend
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require("axios");

// Configuração do cliente HTTP para o microserviço
const controlIdApi = axios.create({
  baseURL: process.env.CONTROLID_SERVICE_URL || "http://localhost:3050/api",
  timeout: parseInt(process.env.CONTROLID_SERVICE_TIMEOUT) || 15000,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.CONTROLID_SERVICE_API_KEY || "",
  },
});

// Interceptor para logging de requisições
controlIdApi.interceptors.request.use(
  (config) => {
    console.log(
      `[ControlID] ${config.method?.toUpperCase()} ${config.url}`,
      config.data ? JSON.stringify(config.data).substring(0, 200) : "",
    );
    return config;
  },
  (error) => {
    console.error("[ControlID] Erro na requisição:", error.message);
    return Promise.reject(error);
  },
);

// Interceptor para tratamento de erros
controlIdApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNREFUSED") {
      console.error(
        "[ControlID] Microserviço não está disponível:",
        error.message,
      );
      throw new Error(
        "Serviço de equipamentos Control iD não está disponível. Verifique se o microserviço está rodando.",
      );
    }

    if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
      console.error("[ControlID] Timeout na comunicação:", error.message);
      throw new Error(
        "Tempo limite excedido ao comunicar com o microserviço Control iD.",
      );
    }

    // Propagar erro do microserviço
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }

    throw error;
  },
);

/**
 * Classe de serviço para integração com Control iD
 */
class ControlIdService {
  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSITIVOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista todos os dispositivos cadastrados
   */
  async listarDispositivos() {
    const response = await controlIdApi.get("/devices");
    return response.data;
  }

  /**
   * Busca um dispositivo pelo ID
   */
  async buscarDispositivo(id) {
    const response = await controlIdApi.get(`/devices/${id}`);
    return response.data;
  }

  /**
   * Cadastra um novo dispositivo
   */
  async cadastrarDispositivo(dados) {
    const response = await controlIdApi.post("/devices", dados);
    return response.data;
  }

  /**
   * Atualiza um dispositivo
   */
  async atualizarDispositivo(id, dados) {
    const response = await controlIdApi.put(`/devices/${id}`, dados);
    return response.data;
  }

  /**
   * Remove um dispositivo
   */
  async removerDispositivo(id) {
    const response = await controlIdApi.delete(`/devices/${id}`);
    return response.data;
  }

  /**
   * Verifica status de um dispositivo
   */
  async verificarStatus(id) {
    const response = await controlIdApi.post(`/devices/${id}/check-status`);
    return response.data;
  }

  /**
   * Busca informações do sistema do dispositivo
   */
  async buscarInfoSistema(id) {
    const response = await controlIdApi.get(`/devices/${id}/system-info`);
    return response.data;
  }

  /**
   * Lista modelos suportados
   */
  async listarModelos() {
    const response = await controlIdApi.get("/devices/models");
    return response.data;
  }

  /**
   * Resumo de status de todos dispositivos
   */
  async resumoStatus() {
    const response = await controlIdApi.get("/devices/status-summary");
    return response.data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USUÁRIOS NO DISPOSITIVO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista usuários de um dispositivo
   */
  async listarUsuarios(deviceId, filtros = {}) {
    const response = await controlIdApi.get(`/devices/${deviceId}/users`, {
      params: filtros,
    });
    return response.data;
  }

  /**
   * Busca um usuário pelo ID
   */
  async buscarUsuario(deviceId, userId) {
    const response = await controlIdApi.get(
      `/devices/${deviceId}/users/${userId}`,
    );
    return response.data;
  }

  /**
   * Busca usuário por matrícula
   */
  async buscarUsuarioPorMatricula(deviceId, registration) {
    const response = await controlIdApi.get(
      `/devices/${deviceId}/users/registration/${registration}`,
    );
    return response.data;
  }

  /**
   * Cria um usuário no dispositivo
   */
  async criarUsuario(deviceId, dados) {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/users`,
      dados,
    );
    return response.data;
  }

  /**
   * Atualiza um usuário no dispositivo
   */
  async atualizarUsuario(deviceId, userId, dados) {
    const response = await controlIdApi.put(
      `/devices/${deviceId}/users/${userId}`,
      dados,
    );
    return response.data;
  }

  /**
   * Remove um usuário do dispositivo
   */
  async removerUsuario(deviceId, userId) {
    const response = await controlIdApi.delete(
      `/devices/${deviceId}/users/${userId}`,
    );
    return response.data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDENCIAIS (CARTÕES, TAGS UHF, QR CODES)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista cartões de um dispositivo
   */
  async listarCartoes(deviceId) {
    const response = await controlIdApi.get(`/devices/${deviceId}/cards`);
    return response.data;
  }

  /**
   * Cria um cartão
   */
  async criarCartao(deviceId, dados) {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/cards`,
      dados,
    );
    return response.data;
  }

  /**
   * Remove um cartão
   */
  async removerCartao(deviceId, cardId) {
    const response = await controlIdApi.delete(
      `/devices/${deviceId}/cards/${cardId}`,
    );
    return response.data;
  }

  /**
   * Lista tags UHF de um dispositivo
   */
  async listarTagsUHF(deviceId) {
    const response = await controlIdApi.get(`/devices/${deviceId}/uhf-tags`);
    return response.data;
  }

  /**
   * Cria uma tag UHF
   */
  async criarTagUHF(deviceId, dados) {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/uhf-tags`,
      dados,
    );
    return response.data;
  }

  /**
   * Remove uma tag UHF
   */
  async removerTagUHF(deviceId, tagId) {
    const response = await controlIdApi.delete(
      `/devices/${deviceId}/uhf-tags/${tagId}`,
    );
    return response.data;
  }

  /**
   * Lista QR Codes de um dispositivo
   */
  async listarQRCodes(deviceId) {
    const response = await controlIdApi.get(`/devices/${deviceId}/qr-codes`);
    return response.data;
  }

  /**
   * Cria um QR Code
   */
  async criarQRCode(deviceId, dados) {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/qr-codes`,
      dados,
    );
    return response.data;
  }

  /**
   * Remove um QR Code
   */
  async removerQRCode(deviceId, qrId) {
    const response = await controlIdApi.delete(
      `/devices/${deviceId}/qr-codes/${qrId}`,
    );
    return response.data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES DE CONTROLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Abre porta/relé
   */
  async abrirPorta(deviceId, doorId = 1) {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/actions/open-door`,
      { door_id: doorId },
    );
    return response.data;
  }

  /**
   * Abre via SecBox
   */
  async abrirSecBox(deviceId, secboxId, action = "open") {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/actions/open-sec-box`,
      { secbox_id: secboxId, action },
    );
    return response.data;
  }

  /**
   * Libera catraca
   */
  async liberarCatraca(deviceId, direction = "clockwise") {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/actions/release-turnstile`,
      { direction },
    );
    return response.data;
  }

  /**
   * Busca estado das portas
   */
  async estadoPortas(deviceId) {
    const response = await controlIdApi.get(
      `/devices/${deviceId}/actions/doors-state`,
    );
    return response.data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGS DE ACESSO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca logs de acesso de um dispositivo
   */
  async buscarLogsAcesso(deviceId, filtros = {}) {
    const response = await controlIdApi.get(
      `/devices/${deviceId}/access-logs`,
      { params: filtros },
    );
    return response.data;
  }

  /**
   * Busca logs de alarme de um dispositivo
   */
  async buscarLogsAlarme(deviceId, filtros = {}) {
    const response = await controlIdApi.get(`/devices/${deviceId}/alarm-logs`, {
      params: filtros,
    });
    return response.data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GRUPOS E REGRAS DE ACESSO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista grupos de um dispositivo
   */
  async listarGrupos(deviceId) {
    const response = await controlIdApi.get(`/devices/${deviceId}/groups`);
    return response.data;
  }

  /**
   * Cria um grupo
   */
  async criarGrupo(deviceId, dados) {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/groups`,
      dados,
    );
    return response.data;
  }

  /**
   * Adiciona usuário a um grupo
   */
  async adicionarUsuarioGrupo(deviceId, groupId, userId) {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/groups/${groupId}/users/${userId}`,
    );
    return response.data;
  }

  /**
   * Remove usuário de um grupo
   */
  async removerUsuarioGrupo(deviceId, groupId, userId) {
    const response = await controlIdApi.delete(
      `/devices/${deviceId}/groups/${groupId}/users/${userId}`,
    );
    return response.data;
  }

  /**
   * Lista regras de acesso
   */
  async listarRegrasAcesso(deviceId) {
    const response = await controlIdApi.get(
      `/devices/${deviceId}/access-rules`,
    );
    return response.data;
  }

  /**
   * Cria regra de acesso
   */
  async criarRegraAcesso(deviceId, dados) {
    const response = await controlIdApi.post(
      `/devices/${deviceId}/access-rules`,
      dados,
    );
    return response.data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGS DO SISTEMA (Operações do microserviço)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca logs de operação do microserviço
   */
  async buscarLogsOperacao(filtros = {}) {
    const response = await controlIdApi.get("/logs", { params: filtros });
    return response.data;
  }

  /**
   * Busca estatísticas de operações
   */
  async estatisticasOperacoes() {
    const response = await controlIdApi.get("/logs/stats");
    return response.data;
  }

  /**
   * Busca logs de erro
   */
  async buscarLogsErro(filtros = {}) {
    const response = await controlIdApi.get("/logs/errors", {
      params: filtros,
    });
    return response.data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verifica se o microserviço está online
   */
  async healthCheck() {
    try {
      // Health check é público (não precisa de API key) e está na raiz, não em /api
      const baseUrl = (
        process.env.CONTROLID_SERVICE_URL || "http://localhost:3050/api"
      ).replace("/api", "");
      const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
      return {
        online: true,
        ...response.data,
      };
    } catch (error) {
      return {
        online: false,
        error: error.message,
      };
    }
  }
}

module.exports = new ControlIdService();
