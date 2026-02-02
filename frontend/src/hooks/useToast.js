/**
 * ═══════════════════════════════════════════════════════════════════════════
 * useToast - Hook para Notificações Toast
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hook wrapper que usa o ToastContext global.
 * Mantém compatibilidade com código existente.
 *
 * Uso:
 * ```javascript
 * import { useToast } from "../hooks/useToast";
 *
 * function MeuComponente() {
 *   const { showToast } = useToast();
 *
 *   const handleSave = async () => {
 *     try {
 *       await salvar();
 *       showToast("Salvo com sucesso!", "success");
 *     } catch (error) {
 *       showToast("Erro ao salvar", "error");
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleSave}>Salvar</button>
 *   );
 * }
 * ```
 *
 * NOTA: O ToastContainer não é mais necessário pois é renderizado
 * globalmente pelo ToastProvider no App.js
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback } from "react";
import { useGlobalToast } from "../contexts/ToastContext";

/**
 * Hook para gerenciar toasts
 * @returns {{ showToast: (message: string, type?: "success"|"error"|"warning"|"info") => void, ToastContainer: React.FC }}
 */
export function useToast() {
  const { showToast: globalShowToast } = useGlobalToast();

  /**
   * Exibe uma notificação toast
   * @param {string} message - Mensagem a exibir
   * @param {"success"|"error"|"warning"|"info"} type - Tipo da notificação
   */
  const showToast = useCallback(
    (message, type = "info") => {
      globalShowToast(message, type);
    },
    [globalShowToast],
  );

  /**
   * Componente Container vazio para manter compatibilidade
   * O toast agora é renderizado globalmente pelo ToastProvider
   */
  const ToastContainer = useCallback(() => null, []);

  return {
    showToast,
    ToastContainer,
  };
}

export default useToast;
