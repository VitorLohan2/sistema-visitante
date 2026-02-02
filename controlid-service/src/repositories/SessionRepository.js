const db = require("../config/database");
const logger = require("../config/logger");

/**
 * Repository para gerenciamento de sessões com equipamentos
 */
class SessionRepository {
  /**
   * Salvar sessão
   */
  save(deviceId, sessionToken, expiresAt = null) {
    try {
      // Remover sessões antigas do dispositivo
      this.deleteByDeviceId(deviceId);

      const stmt = db.prepare(`
        INSERT INTO device_sessions (device_id, session_token, expires_at)
        VALUES (?, ?, ?)
      `);

      stmt.run(deviceId, sessionToken, expiresAt);
      logger.debug("Sessão salva", { deviceId });
      return { deviceId, sessionToken, expiresAt };
    } catch (error) {
      logger.error("Erro ao salvar sessão", { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Buscar sessão por device ID
   */
  findByDeviceId(deviceId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM device_sessions 
        WHERE device_id = ? 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY created_at DESC
        LIMIT 1
      `);
      return stmt.get(deviceId);
    } catch (error) {
      logger.error("Erro ao buscar sessão", { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Deletar sessão por device ID
   */
  deleteByDeviceId(deviceId) {
    try {
      const stmt = db.prepare(
        "DELETE FROM device_sessions WHERE device_id = ?",
      );
      return stmt.run(deviceId);
    } catch (error) {
      logger.error("Erro ao deletar sessão", {
        deviceId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Limpar sessões expiradas
   */
  cleanExpired() {
    try {
      const stmt = db.prepare(`
        DELETE FROM device_sessions 
        WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')
      `);
      const result = stmt.run();
      if (result.changes > 0) {
        logger.info("Sessões expiradas removidas", { count: result.changes });
      }
      return result.changes;
    } catch (error) {
      logger.error("Erro ao limpar sessões expiradas", {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = { SessionRepository };
