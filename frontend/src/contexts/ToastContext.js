/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOAST CONTEXT - Sistema Global de Notificações
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Contexto ÚNICO para gerenciar toasts em todo o sistema.
 * Substitui completamente o react-toastify.
 *
 * Uso dentro de componentes:
 * ```javascript
 * import { useGlobalToast } from "../contexts/ToastContext";
 *
 * function MeuComponente() {
 *   const { showToast } = useGlobalToast();
 *
 *   const handleSave = () => {
 *     showToast("Salvo com sucesso!", "success");
 *   };
 * }
 * ```
 *
 * Uso fora de componentes (ex: contexts, services):
 * ```javascript
 * import { toast } from "../contexts/ToastContext";
 *
 * toast.info("Mensagem", { toastId: "id-unico", onClick: () => {} });
 * toast.isActive("id-unico"); // Verifica se toast existe
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiX,
  FiMessageCircle,
} from "react-icons/fi";
import "../components/Toast/styles.css";

const ToastContext = createContext({});

let toastId = 0;

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON TOAST - Para uso fora de componentes React
// ════════════════════════════════════════════════════════════════════════════

// Armazena referência global das funções do provider
let globalShowToast = null;
let globalIsActive = null;

/**
 * API compatível com react-toastify para facilitar migração
 * Pode ser usada FORA de componentes React (ex: em contexts)
 */
export const toast = {
  /**
   * Mostra toast do tipo info
   * @param {string} message - Mensagem
   * @param {Object} options - { toastId, autoClose, onClick }
   */
  info: (message, options = {}) => {
    if (!globalShowToast) {
      console.warn("[Toast] ToastProvider não inicializado ainda");
      return;
    }
    return globalShowToast(message, "chat", {
      toastId: options.toastId,
      autoClose: options.autoClose || 5000,
      onClick: options.onClick,
    });
  },

  /**
   * Mostra toast de sucesso
   */
  success: (message, options = {}) => {
    if (!globalShowToast) {
      console.warn("[Toast] ToastProvider não inicializado ainda");
      return;
    }
    return globalShowToast(message, "success", {
      toastId: options.toastId,
      autoClose: options.autoClose || 5000,
      onClick: options.onClick,
    });
  },

  /**
   * Mostra toast de erro
   */
  error: (message, options = {}) => {
    if (!globalShowToast) {
      console.warn("[Toast] ToastProvider não inicializado ainda");
      return;
    }
    return globalShowToast(message, "error", {
      toastId: options.toastId,
      autoClose: options.autoClose || 5000,
      onClick: options.onClick,
    });
  },

  /**
   * Mostra toast de warning
   */
  warning: (message, options = {}) => {
    if (!globalShowToast) {
      console.warn("[Toast] ToastProvider não inicializado ainda");
      return;
    }
    return globalShowToast(message, "warning", {
      toastId: options.toastId,
      autoClose: options.autoClose || 5000,
      onClick: options.onClick,
    });
  },

  /**
   * Verifica se um toast com ID específico está ativo
   * @param {string} toastId - ID do toast
   * @returns {boolean}
   */
  isActive: (toastIdToCheck) => {
    if (!globalIsActive) {
      return false;
    }
    return globalIsActive(toastIdToCheck);
  },
};

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE TIPOS DE TOAST
// ════════════════════════════════════════════════════════════════════════════

const TOAST_TYPES = {
  success: {
    icon: FiCheckCircle,
    bgColor: "#dcfce7",
    borderColor: "#22c55e",
    iconColor: "#16a34a",
  },
  error: {
    icon: FiAlertCircle,
    bgColor: "#fee2e2",
    borderColor: "#ef4444",
    iconColor: "#dc2626",
  },
  warning: {
    icon: FiAlertTriangle,
    bgColor: "#fef3c7",
    borderColor: "#f59e0b",
    iconColor: "#d97706",
  },
  info: {
    icon: FiInfo,
    bgColor: "#dbeafe",
    borderColor: "#3b82f6",
    iconColor: "#2563eb",
  },
  chat: {
    icon: FiMessageCircle,
    bgColor: "#dbeafe",
    borderColor: "#3b82f6",
    iconColor: "#2563eb",
  },
};

// Componente Toast individual
function ToastItem({ id, message, type, onClick, onClose, autoClose = 5000 }) {
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const IconComponent = config.icon;

  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose(id);
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [id, onClose, autoClose]);

  const handleClick = () => {
    if (onClick) {
      onClick();
      onClose(id);
    }
  };

  return (
    <div
      className={`toast-item ${onClick ? "clickable" : ""}`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
      onClick={onClick ? handleClick : undefined}
    >
      <div className="toast-icon" style={{ color: config.iconColor }}>
        <IconComponent size={20} />
      </div>
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose(id);
        }}
      >
        <FiX size={16} />
      </button>
    </div>
  );
}

// Container global de toasts
function GlobalToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>,
    document.body,
  );
}

// Provider do contexto
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const activeToastIds = React.useRef(new Set());

  /**
   * Verifica se um toast com determinado ID está ativo
   * @param {string} customId - ID personalizado do toast
   * @returns {boolean}
   */
  const isActive = useCallback((customId) => {
    return activeToastIds.current.has(customId);
  }, []);

  /**
   * Exibe uma notificação toast
   * @param {string} message - Mensagem a exibir
   * @param {"success"|"error"|"warning"|"info"|"chat"} type - Tipo da notificação
   * @param {Object} options - Opções adicionais
   * @param {string} options.toastId - ID personalizado para evitar duplicação
   * @param {number} options.autoClose - Tempo para fechar automaticamente (ms)
   * @param {Function} options.onClick - Callback ao clicar no toast
   */
  const showToast = useCallback((message, type = "info", options = {}) => {
    const { toastId: customId, autoClose = 5000, onClick } = options;

    // Se tem ID personalizado e já está ativo, não mostra
    if (customId && activeToastIds.current.has(customId)) {
      return;
    }

    const id = customId || `toast-${++toastId}`;

    if (customId) {
      activeToastIds.current.add(customId);
    }

    setToasts((prev) => [...prev, { id, message, type, onClick, autoClose }]);

    return id;
  }, []);

  /**
   * Remove um toast
   * @param {string|number} id - ID do toast
   */
  const removeToast = useCallback((id) => {
    activeToastIds.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Remove todos os toasts
   */
  const clearToasts = useCallback(() => {
    activeToastIds.current.clear();
    setToasts([]);
  }, []);

  // Registra funções globais para uso fora de componentes
  React.useEffect(() => {
    globalShowToast = showToast;
    globalIsActive = isActive;

    return () => {
      globalShowToast = null;
      globalIsActive = null;
    };
  }, [showToast, isActive]);

  const value = {
    showToast,
    removeToast,
    clearToasts,
    isActive,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <GlobalToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Hook para usar o sistema de toast global
 * @returns {{ showToast: Function, removeToast: Function, clearToasts: Function, isActive: Function }}
 */
export function useGlobalToast() {
  const context = useContext(ToastContext);
  if (!context || Object.keys(context).length === 0) {
    throw new Error("useGlobalToast deve ser usado dentro de ToastProvider");
  }
  return context;
}

export default ToastContext;
