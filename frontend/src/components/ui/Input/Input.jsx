import React, { forwardRef } from "react";
import "./Input.css";

/**
 * Input reutilizável com label e mensagem de erro
 *
 * @param {Object} props
 * @param {string} props.label - Label do campo
 * @param {string} props.tipo - Tipo do input (text, email, password, number, etc)
 * @param {string} props.erro - Mensagem de erro
 * @param {string} props.dica - Texto de ajuda abaixo do campo
 * @param {boolean} props.obrigatorio - Marca campo como obrigatório
 * @param {React.ReactNode} props.icone - Ícone à esquerda do input
 * @param {boolean} props.desabilitado - Desabilita o input
 * @param {string} props.tamanho - 'pequeno' | 'medio' | 'grande'
 */
const Input = forwardRef(
  (
    {
      label,
      tipo = "text",
      erro,
      dica,
      obrigatorio = false,
      icone = null,
      desabilitado = false,
      tamanho = "medio",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s/g, "-")}`;

    const wrapperClasses = [
      "input-wrapper",
      `input-${tamanho}`,
      erro && "input-erro",
      desabilitado && "input-desabilitado",
      icone && "input-com-icone",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {obrigatorio && <span className="input-obrigatorio">*</span>}
          </label>
        )}
        <div className="input-container">
          {icone && <span className="input-icone">{icone}</span>}
          <input
            ref={ref}
            id={inputId}
            type={tipo}
            disabled={desabilitado}
            className="input-field"
            {...props}
          />
        </div>
        {erro && <span className="input-mensagem-erro">{erro}</span>}
        {dica && !erro && <span className="input-dica">{dica}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
