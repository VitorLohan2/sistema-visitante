/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIRM MODAL - Modal de Confirmação Padronizado
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Componente para substituir window.confirm() com visual profissional
 *
 * Uso direto:
 * <ConfirmModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onConfirm={handleConfirm}
 *   title="Confirmar ação"
 *   message="Tem certeza que deseja continuar?"
 *   confirmText="Confirmar"
 *   cancelText="Cancelar"
 *   variant="danger" // "danger" | "warning" | "success" | "info"
 * />
 *
 * Uso com hook (recomendado):
 * const { confirm, ConfirmDialog } = useConfirm();
 * const confirmed = await confirm({ title: "...", message: "..." });
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiX,
} from "react-icons/fi";
import "./styles.css";

const VARIANTS = {
  danger: {
    icon: FiAlertTriangle,
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
  },
  warning: {
    icon: FiAlertCircle,
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
  },
  success: {
    icon: FiCheckCircle,
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
  },
  info: {
    icon: FiInfo,
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message = "Tem certeza que deseja continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning",
  isLoading = false,
}) {
  const variantConfig = VARIANTS[variant] || VARIANTS.warning;
  const IconComponent = variantConfig.icon;

  // Fechar com ESC
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const modalContent = (
    <div className="confirm-modal-overlay" onClick={handleClose}>
      <div
        className="confirm-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Header com ícone */}
        <div className="confirm-modal-header">
          <div
            className="confirm-modal-icon"
            style={{
              backgroundColor: variantConfig.bgColor,
              color: variantConfig.color,
            }}
          >
            <IconComponent size={24} />
          </div>
          <button
            className="confirm-modal-close"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Fechar"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="confirm-modal-content">
          <h2 id="confirm-modal-title" className="confirm-modal-title">
            {title}
          </h2>
          <p className="confirm-modal-message">{message}</p>
        </div>

        {/* Ações */}
        <div className="confirm-modal-actions">
          <button
            className="confirm-modal-btn cancel"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-modal-btn confirm ${variant}`}
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              backgroundColor: variantConfig.color,
            }}
          >
            {isLoading ? (
              <>
                <span className="confirm-modal-spinner" />
                Aguarde...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
