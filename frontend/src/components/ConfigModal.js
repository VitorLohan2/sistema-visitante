import React from "react";
import { FiSettings, FiX, FiSun, FiMoon, FiInfo } from "react-icons/fi";

import '../styles/config-modal.css';

function ConfigModal({
  visible,
  onClose,
  darkTheme,
  toggleTheme,
  userDetails,
  ongId,
  ongName
}) {
  if (!visible) return null;

  return (
    <div className="config-modal-overlay" onClick={onClose}>
      <div className="config-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="config-modal-header">
          <h2>
            <FiSettings size={24} /> Configurações
          </h2>
          <button className="config-modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="config-modal-body">
          {/* Aparência */}
          <div className="config-section">
            <h3>Aparência</h3>
            <div className="theme-toggle-container">
              <label className="theme-toggle">
                <input
                  type="checkbox"
                  checked={darkTheme}
                  onChange={toggleTheme}
                />
                <div className="theme-slider">
                  <div className="theme-icon sun">
                    <FiSun size={18} />
                  </div>
                  <div className="theme-icon moon">
                    <FiMoon size={18} />
                  </div>
                </div>
              </label>
              <span className="theme-label">
                {darkTheme ? "Tema Escuro" : "Tema Claro"}
              </span>
            </div>
          </div>

          {/* Informações da Conta */}
          <div className="config-section">
            <h3>
              <FiInfo size={18} /> Informações da Conta
            </h3>
            <div className="user-info-container">
              <div className="user-info-item">
                <label>ID do Usuário:</label>
                <span className="user-info-value">{ongId}</span>
              </div>

              <div className="user-info-item">
                <label>Nome:</label>
                <span className="user-info-value">
                  {(userDetails && userDetails.name) || ongName || "Carregando..."}
                </span>
              </div>

              <div className="user-info-item">
                <label>Email:</label>
                <span className="user-info-value">
                  {(userDetails && userDetails.email) || "Carregando..."}
                </span>
              </div>

              {userDetails && userDetails.setor && (
                <div className="user-info-item">
                  <label>Setor:</label>
                  <span className="user-info-value">{userDetails.setor}</span>
                </div>
              )}

              {userDetails && userDetails.type && (
                <div className="user-info-item">
                  <label>Tipo de Conta:</label>
                  <span className="user-info-value badge-type">
                    {userDetails.type}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="config-modal-footer">
          <button className="config-close-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfigModal;
