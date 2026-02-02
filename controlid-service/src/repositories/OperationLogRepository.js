const db = require("../config/database");
const logger = require("../config/logger");

/**
 * Repository para logs de operações
 */
class OperationLogRepository {
  /**
   * Criar log de operação
   */
  create(data) {
    try {
      const stmt = db.prepare(`
        INSERT INTO operation_logs (
          device_id, operation, endpoint, request_data, 
          response_data, status, error_message, duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        data.deviceId || null,
        data.operation,
        data.endpoint || null,
        data.requestData ? JSON.stringify(data.requestData) : null,
        data.responseData ? JSON.stringify(data.responseData) : null,
        data.status,
        data.errorMessage || null,
        data.durationMs || null,
      );

      return result.lastInsertRowid;
    } catch (error) {
      logger.error("Erro ao criar log de operação", { error: error.message });
      // Não lançar erro para não interromper operações por causa de log
      return null;
    }
  }

  /**
   * Buscar logs por device ID
   */
  findByDeviceId(deviceId, limit = 100, offset = 0) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM operation_logs 
        WHERE device_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(deviceId, limit, offset);
    } catch (error) {
      logger.error("Erro ao buscar logs por device", {
        deviceId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Buscar logs recentes
   */
  findRecent(limit = 100) {
    try {
      const stmt = db.prepare(`
        SELECT ol.*, d.name as device_name, d.ip as device_ip
        FROM operation_logs ol
        LEFT JOIN devices d ON ol.device_id = d.id
        ORDER BY ol.created_at DESC
        LIMIT ?
      `);
      return stmt.all(limit);
    } catch (error) {
      logger.error("Erro ao buscar logs recentes", { error: error.message });
      throw error;
    }
  }

  /**
   * Buscar logs por operação
   */
  findByOperation(operation, limit = 100) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM operation_logs 
        WHERE operation = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(operation, limit);
    } catch (error) {
      logger.error("Erro ao buscar logs por operação", {
        operation,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Buscar logs com erro
   */
  findErrors(limit = 100) {
    try {
      const stmt = db.prepare(`
        SELECT ol.*, d.name as device_name, d.ip as device_ip
        FROM operation_logs ol
        LEFT JOIN devices d ON ol.device_id = d.id
        WHERE ol.status = 'error'
        ORDER BY ol.created_at DESC
        LIMIT ?
      `);
      return stmt.all(limit);
    } catch (error) {
      logger.error("Erro ao buscar logs de erro", { error: error.message });
      throw error;
    }
  }

  /**
   * Limpar logs antigos (manter últimos N dias)
   */
  cleanOld(daysToKeep = 30) {
    try {
      const stmt = db.prepare(`
        DELETE FROM operation_logs 
        WHERE created_at < datetime('now', '-' || ? || ' days')
      `);
      const result = stmt.run(daysToKeep);
      if (result.changes > 0) {
        logger.info("Logs antigos removidos", {
          count: result.changes,
          daysToKeep,
        });
      }
      return result.changes;
    } catch (error) {
      logger.error("Erro ao limpar logs antigos", { error: error.message });
      throw error;
    }
  }

  /**
   * Estatísticas de operações
   */
  getStats() {
    try {
      const stmt = db.prepare(`
        SELECT 
          operation,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
          AVG(duration_ms) as avg_duration_ms
        FROM operation_logs
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY operation
      `);
      return stmt.all();
    } catch (error) {
      logger.error("Erro ao obter estatísticas", { error: error.message });
      throw error;
    }
  }
}

module.exports = { OperationLogRepository };
