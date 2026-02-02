/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOAST NOTIFICATION - Componente de Notificação
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * NOTA: Este componente é mantido para compatibilidade.
 * O sistema principal de toasts agora usa o ToastContext global.
 *
 * Para usar toasts, use:
 *   import { useToast } from "../hooks/useToast";
 *   const { showToast } = useToast();
 *   showToast("Mensagem", "success");
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiX,
} from "react-icons/fi";
import "./styles.css";

// Cores SÓLIDAS (não transparentes)
const TOAST_TYPES = {
  success: {
    icon: FiCheckCircle,
    iconColor: "#16a34a",
    bgColor: "#dcfce7",
    borderColor: "#22c55e",
  },
  error: {
    icon: FiAlertCircle,
    iconColor: "#dc2626",
    bgColor: "#fee2e2",
    borderColor: "#ef4444",
  },
  warning: {
    icon: FiAlertTriangle,
    iconColor: "#d97706",
    bgColor: "#fef3c7",
    borderColor: "#f59e0b",
  },
  info: {
    icon: FiInfo,
    iconColor: "#2563eb",
    bgColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
};

function Toast({ id, message, type, onClose }) {
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const IconComponent = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div
      className="toast-item"
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      <div className="toast-icon" style={{ color: config.iconColor }}>
        <IconComponent size={20} />
      </div>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={() => onClose(id)}>
        <FiX size={16} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>,
    document.body,
  );
}

export default Toast;
