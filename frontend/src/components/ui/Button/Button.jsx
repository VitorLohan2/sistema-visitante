import React from "react";
import "./Button.css";

/**
 * Botão reutilizável com variantes
 *
 * @param {Object} props
 * @param {string} props.variante - 'primario' | 'secundario' | 'perigo' | 'sucesso' | 'outline'
 * @param {string} props.tamanho - 'pequeno' | 'medio' | 'grande'
 * @param {boolean} props.carregando - Exibe spinner de loading
 * @param {boolean} props.desabilitado - Desabilita o botão
 * @param {boolean} props.larguraTotal - Ocupa 100% da largura
 * @param {React.ReactNode} props.icone - Ícone à esquerda do texto
 * @param {string} props.tipo - 'button' | 'submit' | 'reset'
 * @param {Function} props.onClick - Callback de clique
 * @param {React.ReactNode} props.children - Conteúdo do botão
 */
export default function Button({
  variante = "primario",
  tamanho = "medio",
  carregando = false,
  desabilitado = false,
  larguraTotal = false,
  icone = null,
  tipo = "button",
  onClick,
  children,
  className = "",
  ...props
}) {
  const classes = [
    "btn",
    `btn-${variante}`,
    `btn-${tamanho}`,
    larguraTotal && "btn-full",
    carregando && "btn-loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={tipo}
      className={classes}
      disabled={desabilitado || carregando}
      onClick={onClick}
      {...props}
    >
      {carregando ? (
        <span className="btn-spinner" />
      ) : (
        <>
          {icone && <span className="btn-icone">{icone}</span>}
          {children}
        </>
      )}
    </button>
  );
}
