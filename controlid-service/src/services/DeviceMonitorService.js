const cron = require("node-cron");
const config = require("../config");
const logger = require("../config/logger");
const { DeviceRepository, DEVICE_STATUS } = require("../repositories");
const ControlIdApiService = require("./ControlIdApiService");

const deviceRepo = new DeviceRepository();

/**
 * Serviço para monitoramento de status dos equipamentos
 */
class DeviceMonitorService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Iniciar monitoramento
   */
  start() {
    if (this.isRunning) {
      logger.warn("Monitor de dispositivos já está em execução");
      return;
    }

    this.isRunning = true;
    logger.info("Iniciando monitor de dispositivos");

    // Executar verificação inicial
    this.checkAllDevices();

    // Agendar verificações periódicas
    const intervalMinutes = Math.max(
      1,
      Math.floor(config.device.statusCheckInterval / 60000),
    );
    this.cronJob = cron.schedule(`*/${intervalMinutes} * * * *`, () => {
      this.checkAllDevices();
    });

    logger.info(
      `Monitor de dispositivos iniciado - verificação a cada ${intervalMinutes} minuto(s)`,
    );
  }

  /**
   * Parar monitoramento
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info("Monitor de dispositivos parado");
  }

  /**
   * Verificar status de todos os dispositivos
   */
  async checkAllDevices() {
    try {
      const devices = deviceRepo.findAll();
      logger.debug(`Verificando status de ${devices.length} dispositivo(s)`);

      for (const device of devices) {
        await this.checkDevice(device);
      }
    } catch (error) {
      logger.error("Erro ao verificar dispositivos", { error: error.message });
    }
  }

  /**
   * Verificar status de um dispositivo específico
   */
  async checkDevice(device) {
    const api = new ControlIdApiService(device);

    try {
      // Tentar obter informações do sistema
      const systemInfo = await api.getSystemInformation();

      // Atualizar status para online
      deviceRepo.updateStatus(device.id, DEVICE_STATUS.ONLINE, systemInfo);

      logger.debug("Dispositivo online", {
        deviceId: device.id,
        name: device.name,
        version: systemInfo.version,
      });

      return { status: DEVICE_STATUS.ONLINE, systemInfo };
    } catch (error) {
      // Atualizar status para offline
      deviceRepo.updateStatus(device.id, DEVICE_STATUS.OFFLINE);

      logger.warn("Dispositivo offline", {
        deviceId: device.id,
        name: device.name,
        error: error.message,
      });

      return { status: DEVICE_STATUS.OFFLINE, error: error.message };
    } finally {
      // Tentar fazer logout
      try {
        await api.logout();
      } catch (e) {
        // Ignorar erro de logout
      }
    }
  }

  /**
   * Verificar status de um dispositivo por ID
   */
  async checkDeviceById(deviceId) {
    const device = deviceRepo.findById(deviceId);
    if (!device) {
      throw new Error("Dispositivo não encontrado");
    }
    return this.checkDevice(device);
  }

  /**
   * Obter resumo do status dos dispositivos
   */
  getStatusSummary() {
    const statusCounts = deviceRepo.countByStatus();
    const total = deviceRepo.count();

    const summary = {
      total,
      online: 0,
      offline: 0,
      error: 0,
      unknown: 0,
    };

    for (const { status, count } of statusCounts) {
      if (summary.hasOwnProperty(status)) {
        summary[status] = count;
      }
    }

    return summary;
  }
}

// Singleton
const deviceMonitor = new DeviceMonitorService();

module.exports = deviceMonitor;
