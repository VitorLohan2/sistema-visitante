import React from "react";
import "./Table.css";

/**
 * Tabela reutilizável com suporte a loading e estado vazio
 *
 * @param {Object} props
 * @param {Array} props.colunas - Array de { chave, titulo, largura?, renderizar? }
 * @param {Array} props.dados - Array de objetos com os dados
 * @param {boolean} props.carregando - Exibe estado de loading
 * @param {string} props.mensagemVazia - Mensagem quando não há dados
 * @param {Function} props.aoClicarLinha - Callback ao clicar em uma linha
 * @param {Function} props.renderizarAcoes - Função para renderizar coluna de ações
 * @param {boolean} props.compacta - Reduz padding das células
 * @param {boolean} props.listrada - Adiciona fundo alternado nas linhas
 */
export default function Table({
  colunas = [],
  dados = [],
  carregando = false,
  mensagemVazia = "Nenhum registro encontrado.",
  aoClicarLinha,
  renderizarAcoes,
  compacta = false,
  listrada = true,
  className = "",
}) {
  const classes = [
    "tabela-container",
    compacta && "tabela-compacta",
    listrada && "tabela-listrada",
    aoClicarLinha && "tabela-clicavel",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const colunasCompletas = renderizarAcoes
    ? [...colunas, { chave: "_acoes", titulo: "Ações", largura: "120px" }]
    : colunas;

  if (carregando) {
    return (
      <div className={classes}>
        <table className="tabela">
          <thead>
            <tr>
              {colunasCompletas.map((col) => (
                <th key={col.chave} style={{ width: col.largura }}>
                  {col.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="tabela-skeleton-row">
                {colunasCompletas.map((col) => (
                  <td key={col.chave}>
                    <div className="tabela-skeleton" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (dados.length === 0) {
    return (
      <div className={classes}>
        <table className="tabela">
          <thead>
            <tr>
              {colunasCompletas.map((col) => (
                <th key={col.chave} style={{ width: col.largura }}>
                  {col.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={colunasCompletas.length} className="tabela-vazia">
                {mensagemVazia}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={classes}>
      <table className="tabela">
        <thead>
          <tr>
            {colunasCompletas.map((col) => (
              <th key={col.chave} style={{ width: col.largura }}>
                {col.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((item, index) => (
            <tr
              key={item.id || index}
              onClick={() => aoClicarLinha && aoClicarLinha(item)}
            >
              {colunas.map((col) => (
                <td key={col.chave}>
                  {col.renderizar
                    ? col.renderizar(item[col.chave], item)
                    : item[col.chave]}
                </td>
              ))}
              {renderizarAcoes && (
                <td className="tabela-acoes">{renderizarAcoes(item)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
