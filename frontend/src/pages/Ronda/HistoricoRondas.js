import logger from "../../utils/logger";
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Histórico de Rondas do Vigilante
 * Interface para o vigilante visualizar seu histórico de rondas
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  FiNavigation,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiEye,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiArrowLeft,
  FiFilter,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import rondaService from "../../services/rondaService";
import { usePermissoes } from "../../hooks/usePermissoes";
import "./historico-styles.css";

export default function HistoricoRondas() {
  // ═══════════════════════════════════════════════════════════════════════════
  // HOOKS E PERMISSÕES
  // ═══════════════════════════════════════════════════════════════════════════
  const { temPermissao } = usePermissoes();

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════════════════
  const [rondas, setRondas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    data_inicio: "",
    data_fim: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Paginação
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 10,
    total: 0,
    totalPaginas: 0,
  });

  // Modal de detalhes
  const [rondaSelecionada, setRondaSelecionada] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE CARREGAMENTO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carrega histórico de rondas
   */
  const carregarHistorico = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const { rondas: lista, paginacao: pag } =
        await rondaService.listarHistorico({
          ...filtros,
          pagina: paginacao.pagina,
          limite: paginacao.limite,
        });

      setRondas(lista || []);
      setPaginacao((prev) => ({
        ...prev,
        total: pag.total,
        totalPaginas: pag.totalPaginas,
      }));
    } catch (err) {
      logger.error("Erro ao carregar histórico:", err);
      setErro("Erro ao carregar histórico. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [filtros, paginacao.pagina, paginacao.limite]);

  /**
   * Carrega detalhes de uma ronda
   */
  const carregarDetalhes = useCallback(async (rondaId) => {
    try {
      setCarregandoDetalhes(true);
      const { ronda } = await rondaService.buscarDetalhes(rondaId);
      setRondaSelecionada(ronda);
    } catch (err) {
      logger.error("Erro ao carregar detalhes:", err);
      setErro("Erro ao carregar detalhes da ronda.");
    } finally {
      setCarregandoDetalhes(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
    setPaginacao((prev) => ({ ...prev, pagina: 1 }));
  };

  const handleLimparFiltros = () => {
    setFiltros({ data_inicio: "", data_fim: "" });
    setPaginacao((prev) => ({ ...prev, pagina: 1 }));
  };

  const handlePaginaAnterior = () => {
    if (paginacao.pagina > 1) {
      setPaginacao((prev) => ({ ...prev, pagina: prev.pagina - 1 }));
    }
  };

  const handleProximaPagina = () => {
    if (paginacao.pagina < paginacao.totalPaginas) {
      setPaginacao((prev) => ({ ...prev, pagina: prev.pagina + 1 }));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EFEITOS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES AUXILIARES
  // ═══════════════════════════════════════════════════════════════════════════

  const formatarData = (data) => {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
  };

  const formatarDataCurta = (data) => {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status) => {
    if (status === "finalizada") {
      return (
        <span className="hist-status-badge finalizada">
          <FiCheckCircle size={14} />
          Finalizada
        </span>
      );
    }
    return (
      <span className="hist-status-badge cancelada">
        <FiXCircle size={14} />
        Cancelada
      </span>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICAÇÃO DE PERMISSÃO
  // ═══════════════════════════════════════════════════════════════════════════

  if (!temPermissao("ronda_visualizar_historico")) {
    return (
      <div className="historico-rondas-container">
        <div className="hist-acesso-negado">
          <FiX size={48} />
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para visualizar o histórico de rondas.</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="historico-rondas-container">
      {/* Header */}
      <header className="hist-header">
        <div className="hist-header-esquerda">
          <Link to="/rondas" className="hist-btn-voltar">
            <FiArrowLeft size={20} />
          </Link>
          <div className="hist-header-titulo">
            <FiNavigation size={24} />
            <h1>Meu Histórico de Rondas</h1>
          </div>
        </div>
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className={`hist-btn-filtros ${mostrarFiltros ? "ativo" : ""}`}
        >
          <FiFilter size={18} />
          Filtrar
        </button>
      </header>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="hist-filtros">
          <div className="hist-filtro-grupo">
            <label>
              <FiCalendar size={16} />
              De
            </label>
            <input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) =>
                handleFiltroChange("data_inicio", e.target.value)
              }
            />
          </div>
          <div className="hist-filtro-grupo">
            <label>
              <FiCalendar size={16} />
              Até
            </label>
            <input
              type="date"
              value={filtros.data_fim}
              onChange={(e) => handleFiltroChange("data_fim", e.target.value)}
            />
          </div>
          <button onClick={handleLimparFiltros} className="hist-btn-limpar">
            <FiX size={16} />
            Limpar
          </button>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="hist-mensagem-erro">
          <span>{erro}</span>
          <button onClick={() => setErro(null)}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Conteúdo */}
      <main className="hist-conteudo">
        {carregando ? (
          <div className="hist-loading">
            <FiRefreshCw className="spin" size={32} />
            <p>Carregando histórico...</p>
          </div>
        ) : rondas.length === 0 ? (
          <div className="hist-vazio">
            <FiNavigation size={48} />
            <h3>Nenhuma ronda encontrada</h3>
            <p>
              Você ainda não finalizou nenhuma ronda ou os filtros não
              retornaram resultados.
            </p>
            <Link to="/rondas" className="hist-btn-iniciar">
              Iniciar Ronda
            </Link>
          </div>
        ) : (
          <>
            {/* Lista de rondas */}
            <div className="hist-lista">
              {rondas.map((ronda) => (
                <div key={ronda.id} className="hist-card">
                  <div className="hist-card-header">
                    <span className="hist-card-id">Ronda #{ronda.id}</span>
                    {getStatusBadge(ronda.status)}
                  </div>

                  <div className="hist-card-body">
                    <div className="hist-card-info">
                      <FiCalendar size={16} />
                      <span>{formatarDataCurta(ronda.data_inicio)}</span>
                    </div>
                    <div className="hist-card-info">
                      <FiClock size={16} />
                      <span>{ronda.tempo_total || "-"}</span>
                    </div>
                    <div className="hist-card-info">
                      <FiMapPin size={16} />
                      <span>{ronda.total_checkpoints || 0} checkpoints</span>
                    </div>
                    <div className="hist-card-info">
                      <FiNavigation size={16} />
                      <span>{ronda.distancia_total || "-"}</span>
                    </div>
                  </div>

                  <div className="hist-card-footer">
                    <button
                      onClick={() => carregarDetalhes(ronda.id)}
                      className="hist-btn-detalhes"
                    >
                      <FiEye size={18} />
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {paginacao.totalPaginas > 1 && (
              <div className="hist-paginacao">
                <button
                  onClick={handlePaginaAnterior}
                  disabled={paginacao.pagina === 1}
                >
                  <FiChevronLeft size={18} />
                </button>
                <span>
                  {paginacao.pagina} de {paginacao.totalPaginas}
                </span>
                <button
                  onClick={handleProximaPagina}
                  disabled={paginacao.pagina === paginacao.totalPaginas}
                >
                  <FiChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Detalhes */}
      {rondaSelecionada && (
        <div
          className="hist-modal-overlay"
          onClick={() => setRondaSelecionada(null)}
        >
          <div className="hist-modal" onClick={(e) => e.stopPropagation()}>
            <header className="hist-modal-header">
              <h2>Ronda #{rondaSelecionada.id}</h2>
              <button onClick={() => setRondaSelecionada(null)}>
                <FiX size={24} />
              </button>
            </header>

            {carregandoDetalhes ? (
              <div className="hist-modal-loading">
                <FiRefreshCw className="spin" size={32} />
              </div>
            ) : (
              <div className="hist-modal-conteudo">
                {/* Informações gerais */}
                <div className="hist-detalhe-secao">
                  <h3>Informações</h3>
                  <div className="hist-detalhe-grid">
                    <div className="hist-detalhe-item">
                      <span className="label">Status</span>
                      {getStatusBadge(rondaSelecionada.status)}
                    </div>
                    <div className="hist-detalhe-item">
                      <span className="label">Data</span>
                      <span className="valor">
                        {formatarDataCurta(rondaSelecionada.data_inicio)}
                      </span>
                    </div>
                    <div className="hist-detalhe-item">
                      <span className="label">Início</span>
                      <span className="valor">
                        {new Date(
                          rondaSelecionada.data_inicio
                        ).toLocaleTimeString("pt-BR")}
                      </span>
                    </div>
                    <div className="hist-detalhe-item">
                      <span className="label">Fim</span>
                      <span className="valor">
                        {rondaSelecionada.data_fim
                          ? new Date(
                              rondaSelecionada.data_fim
                            ).toLocaleTimeString("pt-BR")
                          : "-"}
                      </span>
                    </div>
                    <div className="hist-detalhe-item destaque">
                      <span className="label">Tempo Total</span>
                      <span className="valor">
                        {rondaSelecionada.tempo_total}
                      </span>
                    </div>
                    <div className="hist-detalhe-item">
                      <span className="label">Distância</span>
                      <span className="valor">
                        {rondaSelecionada.distancia_total}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {rondaSelecionada.observacoes && (
                  <div className="hist-detalhe-secao">
                    <h3>Observações</h3>
                    <p className="hist-observacoes">
                      {rondaSelecionada.observacoes}
                    </p>
                  </div>
                )}

                {/* Checkpoints */}
                {rondaSelecionada.checkpoints &&
                  rondaSelecionada.checkpoints.length > 0 && (
                    <div className="hist-detalhe-secao">
                      <h3>
                        Checkpoints ({rondaSelecionada.checkpoints.length})
                      </h3>
                      <div className="hist-checkpoints">
                        {rondaSelecionada.checkpoints.map((cp) => (
                          <div key={cp.id} className="hist-checkpoint">
                            <div className="hist-checkpoint-num">
                              {cp.numero_sequencial}
                            </div>
                            <div className="hist-checkpoint-info">
                              <span className="hora">
                                {new Date(cp.data_hora).toLocaleTimeString(
                                  "pt-BR"
                                )}
                              </span>
                              {cp.descricao && (
                                <span className="desc">{cp.descricao}</span>
                              )}
                              <span className="tempo">
                                +{cp.tempo_desde_anterior}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


