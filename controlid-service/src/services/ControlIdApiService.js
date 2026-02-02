const axios = require("axios");
const config = require("../config");
const logger = require("../config/logger");
const { SessionRepository } = require("../repositories");
const { OperationLogRepository } = require("../repositories");

const sessionRepo = new SessionRepository();
const logRepo = new OperationLogRepository();

/**
 * Serviço principal para comunicação com equipamentos Control iD
 * Baseado na documentação oficial: https://www.controlid.com.br/docs/access-api-pt/
 */
class ControlIdApiService {
  constructor(device) {
    this.device = device;
    this.baseUrl = `http://${device.ip}:${device.port || 80}`;
    this.session = null;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: config.device.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Log de operação
   */
  async logOperation(
    operation,
    endpoint,
    requestData,
    responseData,
    status,
    errorMessage,
    startTime,
  ) {
    const durationMs = Date.now() - startTime;
    logRepo.create({
      deviceId: this.device.id,
      operation,
      endpoint,
      requestData,
      responseData,
      status,
      errorMessage,
      durationMs,
    });
  }

  // ===========================================
  // GERENCIAMENTO DE SESSÃO
  // ===========================================

  /**
   * Realizar login no equipamento
   * POST /login.fcgi
   */
  async login() {
    const startTime = Date.now();
    const endpoint = "/login.fcgi";

    try {
      const response = await this.axiosInstance.post(endpoint, {
        login: this.device.login || "admin",
        password: this.device.password || "admin",
      });

      if (response.data && response.data.session) {
        this.session = response.data.session;

        // Salvar sessão no cache
        sessionRepo.save(this.device.id, this.session);

        await this.logOperation(
          "login",
          endpoint,
          null,
          { session: "***" },
          "success",
          null,
          startTime,
        );
        logger.info("Login realizado com sucesso", {
          deviceId: this.device.id,
          ip: this.device.ip,
        });

        return this.session;
      }

      throw new Error("Resposta de login inválida");
    } catch (error) {
      await this.logOperation(
        "login",
        endpoint,
        null,
        null,
        "error",
        error.message,
        startTime,
      );
      logger.error("Erro no login", {
        deviceId: this.device.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Realizar logout do equipamento
   * POST /logout.fcgi
   */
  async logout() {
    const startTime = Date.now();
    const endpoint = `/logout.fcgi?session=${this.session}`;

    try {
      await this.axiosInstance.post(endpoint);

      // Remover sessão do cache
      sessionRepo.deleteByDeviceId(this.device.id);
      this.session = null;

      await this.logOperation(
        "logout",
        endpoint,
        null,
        null,
        "success",
        null,
        startTime,
      );
      logger.debug("Logout realizado", { deviceId: this.device.id });
    } catch (error) {
      await this.logOperation(
        "logout",
        endpoint,
        null,
        null,
        "error",
        error.message,
        startTime,
      );
      logger.error("Erro no logout", {
        deviceId: this.device.id,
        error: error.message,
      });
    }
  }

  /**
   * Verificar validade da sessão
   * POST /session_is_valid.fcgi
   */
  async isSessionValid() {
    if (!this.session) return false;

    try {
      const response = await this.axiosInstance.post(
        `/session_is_valid.fcgi?session=${this.session}`,
      );
      return response.data && response.data.session_is_valid === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Garantir sessão válida (auto-login se necessário)
   */
  async ensureSession() {
    // Tentar recuperar sessão do cache
    if (!this.session) {
      const cachedSession = sessionRepo.findByDeviceId(this.device.id);
      if (cachedSession) {
        this.session = cachedSession.session_token;
      }
    }

    // Verificar se sessão é válida
    if (this.session && (await this.isSessionValid())) {
      return this.session;
    }

    // Fazer login
    return await this.login();
  }

  /**
   * Executar requisição com retry e auto-login
   */
  async executeRequest(
    method,
    endpoint,
    data = null,
    retries = config.device.maxRetries,
  ) {
    const startTime = Date.now();

    try {
      await this.ensureSession();

      const url = endpoint.includes("?")
        ? `${endpoint}&session=${this.session}`
        : `${endpoint}?session=${this.session}`;

      const response =
        method === "get"
          ? await this.axiosInstance.get(url)
          : await this.axiosInstance.post(url, data);

      await this.logOperation(
        endpoint.split(".")[0].replace("/", ""),
        endpoint,
        data,
        response.data,
        "success",
        null,
        startTime,
      );

      return response.data;
    } catch (error) {
      // Se erro de sessão, tentar fazer login e retry
      if (error.response?.status === 401 && retries > 0) {
        this.session = null;
        await new Promise((resolve) =>
          setTimeout(resolve, config.device.retryDelay),
        );
        return this.executeRequest(method, endpoint, data, retries - 1);
      }

      await this.logOperation(
        endpoint.split(".")[0].replace("/", ""),
        endpoint,
        data,
        null,
        "error",
        error.message,
        startTime,
      );
      throw error;
    }
  }

  // ===========================================
  // INFORMAÇÕES DO SISTEMA
  // ===========================================

  /**
   * Obter informações do sistema
   * POST /system_information.fcgi
   */
  async getSystemInformation() {
    return this.executeRequest("post", "/system_information.fcgi");
  }

  // ===========================================
  // OPERAÇÕES COM OBJETOS (CRUD)
  // ===========================================

  /**
   * Criar objetos
   * POST /create_objects.fcgi
   */
  async createObjects(objectType, values) {
    return this.executeRequest("post", "/create_objects.fcgi", {
      object: objectType,
      values: Array.isArray(values) ? values : [values],
    });
  }

  /**
   * Carregar objetos
   * POST /load_objects.fcgi
   */
  async loadObjects(objectType, options = {}) {
    const payload = { object: objectType };

    if (options.fields) payload.fields = options.fields;
    if (options.limit) payload.limit = options.limit;
    if (options.offset) payload.offset = options.offset;
    if (options.order) payload.order = options.order;
    if (options.where) payload.where = options.where;

    return this.executeRequest("post", "/load_objects.fcgi", payload);
  }

  /**
   * Modificar objetos
   * POST /modify_objects.fcgi
   */
  async modifyObjects(objectType, values, where) {
    return this.executeRequest("post", "/modify_objects.fcgi", {
      object: objectType,
      values,
      where,
    });
  }

  /**
   * Destruir objetos
   * POST /destroy_objects.fcgi
   */
  async destroyObjects(objectType, where) {
    return this.executeRequest("post", "/destroy_objects.fcgi", {
      object: objectType,
      where,
    });
  }

  // ===========================================
  // USUÁRIOS
  // ===========================================

  /**
   * Listar usuários
   */
  async listUsers(options = {}) {
    return this.loadObjects("users", options);
  }

  /**
   * Criar usuário
   */
  async createUser(userData) {
    return this.createObjects("users", userData);
  }

  /**
   * Buscar usuário por ID
   */
  async getUserById(userId) {
    const result = await this.loadObjects("users", {
      where: { users: { id: userId } },
    });
    return result.users?.[0] || null;
  }

  /**
   * Buscar usuário por matrícula
   */
  async getUserByRegistration(registration) {
    const result = await this.loadObjects("users", {
      where: { users: { registration } },
    });
    return result.users?.[0] || null;
  }

  /**
   * Atualizar usuário
   */
  async updateUser(userId, userData) {
    return this.modifyObjects("users", userData, {
      users: { id: userId },
    });
  }

  /**
   * Deletar usuário
   */
  async deleteUser(userId) {
    return this.destroyObjects("users", {
      users: { id: userId },
    });
  }

  // ===========================================
  // CARTÕES
  // ===========================================

  /**
   * Listar cartões
   */
  async listCards(options = {}) {
    return this.loadObjects("cards", options);
  }

  /**
   * Criar cartão para usuário
   */
  async createCard(userId, cardValue) {
    return this.createObjects("cards", {
      user_id: userId,
      value: cardValue,
    });
  }

  /**
   * Deletar cartão
   */
  async deleteCard(cardId) {
    return this.destroyObjects("cards", {
      cards: { id: cardId },
    });
  }

  // ===========================================
  // TAGS UHF
  // ===========================================

  /**
   * Listar tags UHF
   */
  async listUhfTags(options = {}) {
    return this.loadObjects("uhf_tags", options);
  }

  /**
   * Criar tag UHF para usuário
   */
  async createUhfTag(userId, tagValue) {
    return this.createObjects("uhf_tags", {
      user_id: userId,
      value: tagValue,
    });
  }

  /**
   * Deletar tag UHF
   */
  async deleteUhfTag(tagId) {
    return this.destroyObjects("uhf_tags", {
      uhf_tags: { id: tagId },
    });
  }

  // ===========================================
  // QR CODES
  // ===========================================

  /**
   * Listar QR Codes
   */
  async listQrCodes(options = {}) {
    return this.loadObjects("qrcodes", options);
  }

  /**
   * Criar QR Code para usuário
   */
  async createQrCode(userId, qrValue) {
    return this.createObjects("qrcodes", {
      user_id: userId,
      value: qrValue,
    });
  }

  /**
   * Deletar QR Code
   */
  async deleteQrCode(qrId) {
    return this.destroyObjects("qrcodes", {
      qrcodes: { id: qrId },
    });
  }

  // ===========================================
  // GRUPOS DE ACESSO
  // ===========================================

  /**
   * Listar grupos
   */
  async listGroups(options = {}) {
    return this.loadObjects("groups", options);
  }

  /**
   * Criar grupo
   */
  async createGroup(name) {
    return this.createObjects("groups", { name });
  }

  /**
   * Vincular usuário a grupo
   */
  async addUserToGroup(userId, groupId) {
    return this.createObjects("user_groups", {
      user_id: userId,
      group_id: groupId,
    });
  }

  /**
   * Remover usuário de grupo
   */
  async removeUserFromGroup(userId, groupId) {
    return this.destroyObjects("user_groups", {
      user_groups: { user_id: userId, group_id: groupId },
    });
  }

  // ===========================================
  // REGRAS DE ACESSO
  // ===========================================

  /**
   * Listar regras de acesso
   */
  async listAccessRules(options = {}) {
    return this.loadObjects("access_rules", options);
  }

  /**
   * Criar regra de acesso
   */
  async createAccessRule(name, type = 1, priority = 0) {
    return this.createObjects("access_rules", {
      name,
      type, // 0 = bloqueio, 1 = permissão
      priority,
    });
  }

  /**
   * Vincular grupo a regra de acesso
   */
  async addGroupToAccessRule(groupId, accessRuleId) {
    return this.createObjects("group_access_rules", {
      group_id: groupId,
      access_rule_id: accessRuleId,
    });
  }

  // ===========================================
  // LOGS DE ACESSO
  // ===========================================

  /**
   * Listar logs de acesso
   */
  async listAccessLogs(options = {}) {
    return this.loadObjects("access_logs", options);
  }

  /**
   * Buscar logs de acesso por período
   */
  async getAccessLogsByPeriod(startTimestamp, endTimestamp, limit = 1000) {
    return this.loadObjects("access_logs", {
      where: {
        access_logs: {
          time: { ">=": startTimestamp, "<=": endTimestamp },
        },
      },
      limit,
      order: ["time", "descending"],
    });
  }

  // ===========================================
  // AÇÕES DE CONTROLE
  // ===========================================

  /**
   * Executar ações no equipamento
   * POST /execute_actions.fcgi
   */
  async executeActions(actions) {
    return this.executeRequest("post", "/execute_actions.fcgi", { actions });
  }

  /**
   * Abrir porta/relé (iDAccess, iDFit, iDBox, iDUHF)
   */
  async openDoor(doorId = 1) {
    return this.executeActions([
      { action: "door", parameters: `door=${doorId}` },
    ]);
  }

  /**
   * Abrir porta via SecBox (iDFlex, iDAccess Pro, iDAccess Nano)
   */
  async openSecBox(secBoxId = 65793, reason = 3) {
    return this.executeActions([
      { action: "sec_box", parameters: `id=${secBoxId}, reason=${reason}` },
    ]);
  }

  /**
   * Liberar catraca
   * @param direction - 'clockwise', 'anticlockwise' ou 'both'
   */
  async releaseTurnstile(direction = "both") {
    return this.executeActions([
      { action: "catra", parameters: `allow=${direction}` },
    ]);
  }

  /**
   * Verificar estado das portas
   * POST /doors_state.fcgi
   */
  async getDoorsState() {
    return this.executeRequest("post", "/doors_state.fcgi");
  }

  // ===========================================
  // CONFIGURAÇÕES
  // ===========================================

  /**
   * Obter configurações
   * POST /get_configuration.fcgi
   */
  async getConfiguration() {
    return this.executeRequest("post", "/get_configuration.fcgi", {
      general: ["*"],
    });
  }

  /**
   * Modificar configurações
   * POST /set_configuration.fcgi
   */
  async setConfiguration(config) {
    return this.executeRequest("post", "/set_configuration.fcgi", config);
  }

  // ===========================================
  // HORÁRIOS (TIME ZONES)
  // ===========================================

  /**
   * Listar horários
   */
  async listTimeZones(options = {}) {
    return this.loadObjects("time_zones", options);
  }

  /**
   * Criar horário
   */
  async createTimeZone(name) {
    return this.createObjects("time_zones", { name });
  }

  /**
   * Listar intervalos de horário
   */
  async listTimeSpans(timeZoneId) {
    return this.loadObjects("time_spans", {
      where: { time_spans: { time_zone_id: timeZoneId } },
    });
  }

  /**
   * Criar intervalo de horário
   */
  async createTimeSpan(timeZoneId, timeSpanData) {
    return this.createObjects("time_spans", {
      time_zone_id: timeZoneId,
      ...timeSpanData,
    });
  }

  // ===========================================
  // FERIADOS
  // ===========================================

  /**
   * Listar feriados
   */
  async listHolidays(options = {}) {
    return this.loadObjects("holidays", options);
  }

  /**
   * Criar feriado
   */
  async createHoliday(holidayData) {
    return this.createObjects("holidays", holidayData);
  }

  // ===========================================
  // ÁREAS E PORTAIS
  // ===========================================

  /**
   * Listar áreas
   */
  async listAreas(options = {}) {
    return this.loadObjects("areas", options);
  }

  /**
   * Listar portais
   */
  async listPortals(options = {}) {
    return this.loadObjects("portals", options);
  }

  // ===========================================
  // BIOMETRIA E TEMPLATES
  // ===========================================

  /**
   * Listar templates biométricos
   */
  async listTemplates(userId = null) {
    const options = {};
    if (userId) {
      options.where = { templates: { user_id: userId } };
    }
    return this.loadObjects("templates", options);
  }

  /**
   * Criar template biométrico
   */
  async createTemplate(userId, templateData) {
    return this.createObjects("templates", {
      user_id: userId,
      ...templateData,
    });
  }

  // ===========================================
  // ALARMES
  // ===========================================

  /**
   * Listar logs de alarme
   */
  async listAlarmLogs(options = {}) {
    return this.loadObjects("alarm_logs", options);
  }

  /**
   * Listar zonas de alarme
   */
  async listAlarmZones(options = {}) {
    return this.loadObjects("alarm_zones", options);
  }
}

module.exports = ControlIdApiService;
