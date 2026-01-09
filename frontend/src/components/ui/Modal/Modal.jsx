import React, { useEffect, useCallback } from "react";
import { FiX } from "react-icons/fi";
import "./Modal.css";

/**
 * Modal reutilizável
 *
 * @param {Object} props
 * @param {boolean} props.aberto - Se o modal está visível
 * @param {Function} props.aoFechar - Callback para fechar o modal
 * @param {string} props.titulo - Título do modal
 * @param {string} props.tamanho - 'pequeno' | 'medio' | 'grande' | 'auto'
 * @param {boolean} props.fecharAoClicarFora - Fecha ao clicar no overlay
 * @param {boolean} props.mostrarBotaoFechar - Mostra o X no header
 * @param {React.ReactNode} props.rodape - Conteúdo do rodapé (botões)
 * @param {React.ReactNode} props.children - Conteúdo do modal
 */
export default function Modal({
  aberto = false,
  aoFechar,
  titulo,
  tamanho = "medio",
  fecharAoClicarFora = true,
  mostrarBotaoFechar = true,
  rodape,
  children,
  className = "",
}) {
  // Fecha com ESC
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && aoFechar) {
        aoFechar();
      }
    },
    [aoFechar]
  );

  useEffect(() => {
    if (aberto) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [aberto, handleKeyDown]);

  if (!aberto) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && fecharAoClicarFora && aoFechar) {
      aoFechar();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-container modal-${tamanho} ${className}`}>
        {(titulo || mostrarBotaoFechar) && (
          <div className="modal-header">
            {titulo && <h2 className="modal-titulo">{titulo}</h2>}
            {mostrarBotaoFechar && (
              <button
                type="button"
                className="modal-btn-fechar"
                onClick={aoFechar}
                aria-label="Fechar modal"
              >
                <FiX size={20} />
              </button>
            )}
          </div>
        )}

        <div className="modal-body">{children}</div>

        {rodape && <div className="modal-footer">{rodape}</div>}
      </div>
    </div>
  );
}
