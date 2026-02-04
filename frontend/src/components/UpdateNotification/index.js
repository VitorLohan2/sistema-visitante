/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UPDATE NOTIFICATION - Componente de Notificação de Atualização
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Exibe uma notificação fixa quando uma nova versão do sistema está disponível.
 * O usuário pode atualizar quando quiser, sem interrupção forçada.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { FiRefreshCw, FiX, FiInfo } from "react-icons/fi";
import "./styles.css";

function UpdateNotification({ version, onUpdate, onDismiss, showDetails }) {
  return (
    <div className="update-notification">
      <div className="update-notification-content">
        <div className="update-notification-icon">
          <FiRefreshCw className="rotating-icon" />
        </div>

        <div className="update-notification-text">
          <strong>Nova atualização disponível!</strong>
          {version && <span className="update-version">Versão {version}</span>}
          <p>Clique em atualizar para obter as últimas melhorias.</p>
        </div>

        <div className="update-notification-actions">
          <button
            className="update-btn update-btn-primary"
            onClick={onUpdate}
            title="Atualizar agora"
          >
            <FiRefreshCw />
            Atualizar
          </button>

          {showDetails && (
            <button
              className="update-btn update-btn-secondary"
              onClick={showDetails}
              title="Ver novidades"
            >
              <FiInfo />
            </button>
          )}

          <button
            className="update-btn update-btn-close"
            onClick={onDismiss}
            title="Lembrar mais tarde"
          >
            <FiX />
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
