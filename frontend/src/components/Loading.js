// components/Loading.js
import React from "react";
import { FiCoffee } from "react-icons/fi";
// Estilos centralizados no layout.css

const Loading = ({
  progress = 0,
  message = "Carregando...",
  variant = "overlay", // overlay, inline, page, minimal, spinner-only
  showProgress = false,
}) => {
  // Variação de spinner apenas
  if (variant === "spinner-only") {
    return (
      <div className="loading-spinner-only">
        <div className="spinner-ring"></div>
      </div>
    );
  }

  // Variação minimal
  if (variant === "minimal") {
    return <div className="loading-minimal">{message}</div>;
  }

  // Variação inline
  if (variant === "inline") {
    return (
      <div className="loading-inline">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-message">{message}</p>
      </div>
    );
  }

  // Variação para página
  if (variant === "page") {
    return (
      <div className="page-loading">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-message">{message}</p>
      </div>
    );
  }

  // Variação overlay (padrão) - tela cheia
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        {/* Logo ou título */}
        <div className="loading-header">
          <h2>
            <FiCoffee />
          </h2>
        </div>

        {/* Spinner animado */}
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>

        {/* Barra de progresso (opcional) */}
        {showProgress && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}

        {/* Mensagem */}
        <p className="loading-message">{message}</p>

        {/* Pontos animados */}
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default Loading;
