/**
 * ═══════════════════════════════════════════════════════════════════════════
 * useConfirm - Hook para Modal de Confirmação
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hook que facilita o uso do ConfirmModal de forma assíncrona,
 * similar ao window.confirm() mas com visual profissional.
 *
 * Uso:
 * ```javascript
 * import { useConfirm } from "../hooks/useConfirm";
 *
 * function MeuComponente() {
 *   const { confirm, ConfirmDialog } = useConfirm();
 *
 *   const handleDelete = async () => {
 *     const confirmed = await confirm({
 *       title: "Excluir item",
 *       message: "Tem certeza que deseja excluir este item?",
 *       confirmText: "Excluir",
 *       variant: "danger"
 *     });
 *
 *     if (confirmed) {
 *       // Executa a exclusão
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleDelete}>Excluir</button>
 *       <ConfirmDialog />
 *     </>
 *   );
 * }
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef } from "react";
import ConfirmModal from "../components/ConfirmModal";

/**
 * @typedef {Object} ConfirmOptions
 * @property {string} [title="Confirmar ação"] - Título do modal
 * @property {string} [message="Tem certeza que deseja continuar?"] - Mensagem
 * @property {string} [confirmText="Confirmar"] - Texto do botão de confirmar
 * @property {string} [cancelText="Cancelar"] - Texto do botão de cancelar
 * @property {"danger"|"warning"|"success"|"info"} [variant="warning"] - Variante visual
 */

/**
 * Hook para usar modal de confirmação
 * @returns {{ confirm: (options: ConfirmOptions) => Promise<boolean>, ConfirmDialog: React.FC }}
 */
export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Refs para armazenar as funções de resolve/reject da Promise
  const resolveRef = useRef(null);

  /**
   * Abre o modal de confirmação e retorna uma Promise
   * @param {ConfirmOptions} opts - Opções do modal
   * @returns {Promise<boolean>} - true se confirmado, false se cancelado
   */
  const confirm = useCallback((opts = {}) => {
    setOptions({
      title: opts.title || "Confirmar ação",
      message: opts.message || "Tem certeza que deseja continuar?",
      confirmText: opts.confirmText || "Confirmar",
      cancelText: opts.cancelText || "Cancelar",
      variant: opts.variant || "warning",
    });
    setIsOpen(true);
    setIsLoading(false);

    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  /**
   * Handler para confirmar
   */
  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  }, []);

  /**
   * Handler para cancelar/fechar
   */
  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  /**
   * Componente do Dialog para renderizar
   */
  const ConfirmDialog = useCallback(
    () => (
      <ConfirmModal
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        isLoading={isLoading}
      />
    ),
    [isOpen, options, isLoading, handleClose, handleConfirm],
  );

  return {
    confirm,
    ConfirmDialog,
    setIsLoading, // Para mostrar loading no botão se necessário
  };
}

export default useConfirm;
