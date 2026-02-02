const db = require("../config/database");
const logger = require("../config/logger");
const { v4: uuidv4 } = require("uuid");

/**
 * Modelos de equipamentos Control iD suportados
 */
const DEVICE_MODELS = {
  IDUHF: "iDUHF",
  IDFACE: "iDFace",
  IDFACE_MAX: "iDFace Max",
  IDBLOCK: "iDBlock",
  IDBLOCK_NEXT: "iDBlock Next",
  IDFLEX: "iDFlex",
  IDACCESS: "iDAccess",
  IDACCESS_PRO: "iDAccess Pro",
  IDACCESS_NANO: "iDAccess Nano",
  IDBOX: "iDBox",
  IDFIT: "iDFit",
};

/**
 * Status possíveis dos equipamentos
 */
const DEVICE_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
  ERROR: "error",
  UNKNOWN: "unknown",
};

/**
 * Repository para gerenciamento de equipamentos
 */
class DeviceRepository {
  /**
   * Buscar todos os equipamentos
   */
  findAll() {
    try {
      const stmt = db.prepare("SELECT * FROM devices ORDER BY name");
      return stmt.all();
    } catch (error) {
      logger.error("Erro ao buscar equipamentos", { error: error.message });
      throw error;
    }
  }

  /**
   * Buscar equipamento por ID
   */
  findById(id) {
    try {
      const stmt = db.prepare("SELECT * FROM devices WHERE id = ?");
      return stmt.get(id);
    } catch (error) {
      logger.error("Erro ao buscar equipamento", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Buscar equipamento por IP
   */
  findByIp(ip) {
    try {
      const stmt = db.prepare("SELECT * FROM devices WHERE ip = ?");
      return stmt.get(ip);
    } catch (error) {
      logger.error("Erro ao buscar equipamento por IP", {
        ip,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Criar novo equipamento
   */
  create(data) {
    try {
      const id = data.id || uuidv4();
      const stmt = db.prepare(`
        INSERT INTO devices (id, name, ip, port, login, password, model, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.name,
        data.ip,
        data.port || 80,
        data.login || "admin",
        data.password || "admin",
        data.model,
        data.description || null,
      );

      logger.info("Equipamento criado", { id, name: data.name, ip: data.ip });
      return this.findById(id);
    } catch (error) {
      logger.error("Erro ao criar equipamento", { error: error.message });
      throw error;
    }
  }

  /**
   * Atualizar equipamento
   */
  update(id, data) {
    try {
      const fields = [];
      const values = [];

      // Construir dinamicamente os campos a atualizar
      if (data.name !== undefined) {
        fields.push("name = ?");
        values.push(data.name);
      }
      if (data.ip !== undefined) {
        fields.push("ip = ?");
        values.push(data.ip);
      }
      if (data.port !== undefined) {
        fields.push("port = ?");
        values.push(data.port);
      }
      if (data.login !== undefined) {
        fields.push("login = ?");
        values.push(data.login);
      }
      if (data.password !== undefined) {
        fields.push("password = ?");
        values.push(data.password);
      }
      if (data.model !== undefined) {
        fields.push("model = ?");
        values.push(data.model);
      }
      if (data.description !== undefined) {
        fields.push("description = ?");
        values.push(data.description);
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      fields.push('updated_at = datetime("now")');
      values.push(id);

      const stmt = db.prepare(`
        UPDATE devices SET ${fields.join(", ")} WHERE id = ?
      `);

      stmt.run(...values);
      logger.info("Equipamento atualizado", { id });
      return this.findById(id);
    } catch (error) {
      logger.error("Erro ao atualizar equipamento", {
        id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Atualizar status do equipamento
   */
  updateStatus(id, status, systemInfo = null) {
    try {
      const updateFields = ["status = ?", 'updated_at = datetime("now")'];
      const values = [status];

      if (status === DEVICE_STATUS.ONLINE) {
        updateFields.push('last_seen_at = datetime("now")');
      }

      if (systemInfo) {
        if (systemInfo.serial) {
          updateFields.push("serial_number = ?");
          values.push(systemInfo.serial);
        }
        if (systemInfo.version) {
          updateFields.push("firmware_version = ?");
          values.push(systemInfo.version);
        }
      }

      values.push(id);

      const stmt = db.prepare(`
        UPDATE devices SET ${updateFields.join(", ")} WHERE id = ?
      `);

      stmt.run(...values);

      // Salvar histórico de status se tiver informações do sistema
      if (systemInfo && status === DEVICE_STATUS.ONLINE) {
        this.saveStatusHistory(id, status, systemInfo);
      }

      return this.findById(id);
    } catch (error) {
      logger.error("Erro ao atualizar status do equipamento", {
        id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Salvar histórico de status
   */
  saveStatusHistory(deviceId, status, systemInfo) {
    try {
      const stmt = db.prepare(`
        INSERT INTO device_status_history (
          device_id, status, uptime_days, uptime_hours, uptime_minutes,
          memory_free, memory_total, disk_free, disk_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        deviceId,
        status,
        systemInfo.uptime?.days || null,
        systemInfo.uptime?.hours || null,
        systemInfo.uptime?.minutes || null,
        systemInfo.memory?.ram?.free || null,
        systemInfo.memory?.ram?.total || null,
        systemInfo.memory?.disk?.free || null,
        systemInfo.memory?.disk?.total || null,
      );
    } catch (error) {
      logger.error("Erro ao salvar histórico de status", {
        deviceId,
        error: error.message,
      });
    }
  }

  /**
   * Deletar equipamento
   */
  delete(id) {
    try {
      const stmt = db.prepare("DELETE FROM devices WHERE id = ?");
      const result = stmt.run(id);
      logger.info("Equipamento deletado", { id, changes: result.changes });
      return result.changes > 0;
    } catch (error) {
      logger.error("Erro ao deletar equipamento", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Buscar equipamentos por status
   */
  findByStatus(status) {
    try {
      const stmt = db.prepare("SELECT * FROM devices WHERE status = ?");
      return stmt.all(status);
    } catch (error) {
      logger.error("Erro ao buscar equipamentos por status", {
        status,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Buscar equipamentos por modelo
   */
  findByModel(model) {
    try {
      const stmt = db.prepare("SELECT * FROM devices WHERE model = ?");
      return stmt.all(model);
    } catch (error) {
      logger.error("Erro ao buscar equipamentos por modelo", {
        model,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Contar equipamentos
   */
  count() {
    try {
      const stmt = db.prepare("SELECT COUNT(*) as total FROM devices");
      return stmt.get().total;
    } catch (error) {
      logger.error("Erro ao contar equipamentos", { error: error.message });
      throw error;
    }
  }

  /**
   * Contar equipamentos por status
   */
  countByStatus() {
    try {
      const stmt = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM devices 
        GROUP BY status
      `);
      return stmt.all();
    } catch (error) {
      logger.error("Erro ao contar equipamentos por status", {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = {
  DeviceRepository,
  DEVICE_MODELS,
  DEVICE_STATUS,
};
