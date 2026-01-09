import React from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import logoImg from "../assets/logo.svg";
import "./CabecalhoPagina.css";

/**
 * Componente de cabeçalho padrão para as páginas
 * Evita repetição do header com logo, nome e botão voltar
 *
 * @param {Object} props
 * @param {string} props.nomeUsuario - Nome do usuário logado
 * @param {string} props.rotaVoltar - Rota para o botão voltar (default: '/listagem-visitante')
 * @param {string} props.textoVoltar - Texto do botão voltar (default: 'Voltar')
 * @param {boolean} props.mostrarVoltar - Se deve mostrar o botão voltar (default: true)
 * @param {React.ReactNode} props.children - Conteúdo adicional no header (ex: botões)
 * @param {string} props.className - Classes CSS adicionais
 */
export default function CabecalhoPagina({
  nomeUsuario,
  rotaVoltar = "/listagem-visitante",
  textoVoltar = "Voltar",
  mostrarVoltar = true,
  children,
  className = "",
}) {
  return (
    <header className={`cabecalho-pagina ${className}`}>
      <div className="ajuste-Titulo">
        <img src={logoImg} alt="DIME" />
        {nomeUsuario && <span>Bem-vindo(a), {nomeUsuario}</span>}
      </div>

      <div className="cabecalho-acoes">
        {children}

        {mostrarVoltar && (
          <Link className="back-link" to={rotaVoltar}>
            <FiArrowLeft size={16} color="#E02041" />
            {textoVoltar}
          </Link>
        )}
      </div>
    </header>
  );
}
