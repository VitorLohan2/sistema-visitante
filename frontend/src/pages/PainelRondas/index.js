/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Painel de Gerenciamento de Rondas
 * Interface administrativa para visualizar e gerenciar rondas de vigilantes
 *
 * Dados: Carregados do cache (useDataLoader é responsável pelo carregamento inicial)
 * Atualização: Via Socket.IO em tempo real
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FiNavigation,
  FiSearch,
  FiFilter,
  FiCalendar,
  FiUser,
  FiClock,
  FiMapPin,
  FiActivity,
  FiTrendingUp,
  FiList,
  FiMap,
  FiEye,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiWifi,
} from "react-icons/fi";
import rondaService from "../../services/rondaService";
import * as socketService from "../../services/socketService";
import { getCache, setCache } from "../../services/cacheService";
import { usePermissoes } from "../../hooks/usePermissoes";
import MapaRonda from "../../components/MapaRonda";
import "./styles.css";

export default function PainelRondas() {
  // ═══════════════════════════════════════════════════════════════════════════
  // HOOKS E PERMISSÕES
  // ═══════════════════════════════════════════════════════════════════════════
  const { temPermissao } = usePermissoes();

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════════════════
  const [abaAtiva, setAbaAtiva] = useState("lista"); // lista, estatisticas, auditoria
  const [rondas, setRondas] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [auditoria, setAuditoria] = useState([]);
  const [vigilantes, setVigilantes] = useState(
    () => getCache("vigilantes") || [],
  );
  const [carregando, setCarregando] = useState(false); // ✅ Dados carregados no login via useDataLoader
  const [erro, setErro] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    usuario_id: "",
    status: "",
    data_inicio: "",
    data_fim: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Paginação
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 20,
    total: 0,
    totalPaginas: 0,
  });

  // Modal de detalhes
  const [rondaSelecionada, setRondaSelecionada] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // Estados para tempo real (Socket.IO)
  const [socketConectado, setSocketConectado] = useState(false);
  const [rondasTempoReal, setRondasTempoReal] = useState({}); // {ronda_id: {latitude, longitude, ...}}
  const ultimaAtualizacaoRef = useRef(new Date());
  const primeiraRenderizacaoRef = useRef(true); // ✅ Controla se é a primeira renderização

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE CARREGAMENTO - Primeiro do cache, depois API se necessário
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carrega lista de vigilantes para filtros
   */
  const carregarVigilantes = useCallback(
    async (forceRefresh = false) => {
      try {
        // ✅ Se já tem vigilantes do cache (estado inicial), não precisa buscar
        if (vigilantes.length > 0 && !forceRefresh) {
          console.log("📦 Usando vigilantes do cache (estado inicial)");
          return;
        }

        // Se não tem cache ou forceRefresh, busca da API
        const { vigilantes: lista } = await rondaService.listarVigilantes();
        const vigilantesData = lista || [];
        setVigilantes(vigilantesData);

        // Salva no cache
        setCache("vigilantes", vigilantesData);
      } catch (err) {
        console.error("Erro ao carregar vigilantes:", err);
      }
    },
    [vigilantes.length],
  );

  /**
   * Carrega lista de rondas
   */
  const carregarRondas = useCallback(
    async (showLoading = true) => {
      try {
        // ✅ Só mostra loading se não for a primeira renderização
        if (showLoading && !primeiraRenderizacaoRef.current) {
          setCarregando(true);
        }
        primeiraRenderizacaoRef.current = false;
        setErro(null);

        const { rondas: lista, paginacao: pag } =
          await rondaService.listarTodasRondas({
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
        console.error("Erro ao carregar rondas:", err);
        setErro("Erro ao carregar rondas. Tente novamente.");
      } finally {
        setCarregando(false);
      }
    },
    [filtros, paginacao.pagina, paginacao.limite],
  );

  /**
   * Carrega estatísticas
   */
  const carregarEstatisticas = useCallback(async () => {
    try {
      setCarregando(true);
      const dados = await rondaService.buscarEstatisticas(filtros);
      setEstatisticas(dados);
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
      setErro("Erro ao carregar estatísticas.");
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  /**
   * Carrega auditoria
   */
  const carregarAuditoria = useCallback(async () => {
    try {
      setCarregando(true);
      const { registros, paginacao: pag } = await rondaService.listarAuditoria({
        ...filtros,
        pagina: paginacao.pagina,
        limite: paginacao.limite,
      });

      setAuditoria(registros || []);
      setPaginacao((prev) => ({
        ...prev,
        total: pag.total,
        totalPaginas: pag.totalPaginas,
      }));
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
      setErro("Erro ao carregar auditoria.");
    } finally {
      setCarregando(false);
    }
  }, [filtros, paginacao.pagina, paginacao.limite]);

  /**
   * Carrega detalhes de uma ronda
   */
  const carregarDetalhesRonda = useCallback(async (rondaId) => {
    try {
      setCarregandoDetalhes(true);
      const { ronda } = await rondaService.buscarDetalhes(rondaId);
      setRondaSelecionada(ronda);
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
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
    setFiltros({
      usuario_id: "",
      status: "",
      data_inicio: "",
      data_fim: "",
    });
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

  const handleVerDetalhes = (rondaId) => {
    carregarDetalhesRonda(rondaId);
  };

  const handleFecharDetalhes = () => {
    setRondaSelecionada(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EFEITOS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    carregarVigilantes();
  }, [carregarVigilantes]);

  // Socket.IO para atualizações em tempo real
  useEffect(() => {
    // Verifica conexão do Socket
    setSocketConectado(socketService.isConnected());

    // Listeners para eventos de ronda
    const unsubscribeNovaRonda = socketService.on(
      "ronda:nova-iniciada",
      (data) => {
        console.log("🚶 Nova ronda iniciada (tempo real):", data);
        // Recarrega lista se estiver na aba lista
        if (abaAtiva === "lista") {
          carregarRondas();
        }
        // Adiciona ao tracking em tempo real
        setRondasTempoReal((prev) => ({
          ...prev,
          [data.id]: {
            ...data,
            posicao_atual: null,
          },
        }));
      },
    );

    const unsubscribePosicao = socketService.on(
      "ronda:posicao-atualizada",
      (data) => {
        // Atualiza posição em tempo real
        setRondasTempoReal((prev) => ({
          ...prev,
          [data.ronda_id]: {
            ...(prev[data.ronda_id] || {}),
            posicao_atual: {
              latitude: data.latitude,
              longitude: data.longitude,
              precisao: data.precisao,
              velocidade: data.velocidade,
              timestamp: data.timestamp,
            },
          },
        }));
        ultimaAtualizacaoRef.current = new Date();
      },
    );

    const unsubscribeCheckpoint = socketService.on(
      "ronda:checkpoint-registrado",
      (data) => {
        console.log("📍 Checkpoint registrado (tempo real):", data);
        // Atualiza contador de checkpoints se a ronda está na lista
        setRondas((prev) =>
          prev.map((r) =>
            r.id === data.ronda_id
              ? { ...r, total_checkpoints: (r.total_checkpoints || 0) + 1 }
              : r,
          ),
        );
      },
    );

    const unsubscribeEncerrada = socketService.on("ronda:encerrada", (data) => {
      console.log("🔴 Ronda encerrada (tempo real):", data);
      // Remove do tracking em tempo real
      setRondasTempoReal((prev) => {
        const novo = { ...prev };
        delete novo[data.id];
        return novo;
      });
      // Recarrega lista
      if (abaAtiva === "lista") {
        carregarRondas();
      }
    });

    const unsubscribeConectado = socketService.on("connected", () => {
      setSocketConectado(true);
    });

    const unsubscribeDesconectado = socketService.on("disconnected", () => {
      setSocketConectado(false);
    });

    // Cleanup
    return () => {
      unsubscribeNovaRonda();
      unsubscribePosicao();
      unsubscribeCheckpoint();
      unsubscribeEncerrada();
      unsubscribeConectado();
      unsubscribeDesconectado();
    };
  }, [abaAtiva, carregarRondas]);

  useEffect(() => {
    if (abaAtiva === "lista") {
      carregarRondas();
    } else if (abaAtiva === "estatisticas") {
      carregarEstatisticas();
    } else if (abaAtiva === "auditoria") {
      carregarAuditoria();
    }
  }, [abaAtiva, carregarRondas, carregarEstatisticas, carregarAuditoria]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES AUXILIARES
  // ═══════════════════════════════════════════════════════════════════════════

  const formatarData = (data) => {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "em_andamento":
        return (
          <span className="status-badge em-andamento">
            <FiActivity size={14} />
            Em Andamento
          </span>
        );
      case "finalizada":
        return (
          <span className="status-badge finalizada">
            <FiCheckCircle size={14} />
            Finalizada
          </span>
        );
      case "cancelada":
        return (
          <span className="status-badge cancelada">
            <FiXCircle size={14} />
            Cancelada
          </span>
        );
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getTipoAcaoIcon = (tipo) => {
    switch (tipo) {
      case "INICIO":
        return <FiNavigation className="icone-acao inicio" />;
      case "CHECKPOINT":
        return <FiMapPin className="icone-acao checkpoint" />;
      case "FINALIZACAO":
        return <FiCheckCircle className="icone-acao finalizacao" />;
      case "CANCELAMENTO":
        return <FiXCircle className="icone-acao cancelamento" />;
      case "VISUALIZACAO":
        return <FiEye className="icone-acao visualizacao" />;
      default:
        return <FiActivity className="icone-acao" />;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICAÇÃO DE PERMISSÃO
  // ═══════════════════════════════════════════════════════════════════════════

  if (!temPermissao("ronda_gerenciar")) {
    return (
      <div className="painel-rondas-container">
        <div className="acesso-negado">
          <FiAlertCircle size={48} />
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar o painel de rondas.</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="painel-rondas-container">
      {/* Header */}
      <header className="painel-rondas-header">
        <div className="pr-header-titulo">
          <FiNavigation size={28} />
          <h1>Painel de Rondas</h1>
          {/* Indicador de conexão em tempo real */}
          <span
            className={`status-tempo-real ${socketConectado ? "conectado" : "desconectado"}`}
          >
            <FiWifi size={14} />
            {socketConectado ? "Tempo Real" : "Offline"}
          </span>
        </div>
        <div className="pr-header-acoes">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`pr-btn-filtros ${mostrarFiltros ? "ativo" : ""}`}
          >
            <FiFilter size={18} />
            Filtros
          </button>
        </div>
      </header>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="painel-filtros">
          <div className="pr-filtro-grupo">
            <label>
              <FiUser size={16} />
              Vigilante
            </label>
            <select
              value={filtros.usuario_id}
              onChange={(e) => handleFiltroChange("usuario_id", e.target.value)}
            >
              <option value="">Todos</option>
              {vigilantes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="pr-filtro-grupo">
            <label>
              <FiActivity size={16} />
              Status
            </label>
            <select
              value={filtros.status}
              onChange={(e) => handleFiltroChange("status", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div className="pr-filtro-grupo">
            <label>
              <FiCalendar size={16} />
              Data Início
            </label>
            <input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) =>
                handleFiltroChange("data_inicio", e.target.value)
              }
            />
          </div>

          <div className="pr-filtro-grupo">
            <label>
              <FiCalendar size={16} />
              Data Fim
            </label>
            <input
              type="date"
              value={filtros.data_fim}
              onChange={(e) => handleFiltroChange("data_fim", e.target.value)}
            />
          </div>

          <button onClick={handleLimparFiltros} className="pr-btn-limpar">
            <FiX size={16} />
            Limpar
          </button>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="painel-mensagem erro">
          <FiAlertCircle size={20} />
          <span>{erro}</span>
          <button onClick={() => setErro(null)}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Abas */}
      <div className="pr-abas">
        <button
          className={`pr-aba ${abaAtiva === "lista" ? "ativa" : ""}`}
          onClick={() => setAbaAtiva("lista")}
        >
          <FiList size={18} />
          Lista de Rondas
        </button>
        <button
          className={`pr-aba ${abaAtiva === "estatisticas" ? "ativa" : ""}`}
          onClick={() => setAbaAtiva("estatisticas")}
        >
          <FiTrendingUp size={18} />
          Estatísticas
        </button>
        <button
          className={`pr-aba ${abaAtiva === "auditoria" ? "ativa" : ""}`}
          onClick={() => setAbaAtiva("auditoria")}
        >
          <FiActivity size={18} />
          Auditoria
        </button>
      </div>

      {/* Conteúdo */}
      <main className="painel-conteudo">
        {carregando ? (
          <div className="painel-loading">
            <FiRefreshCw className="spin" size={32} />
            <p>Carregando...</p>
          </div>
        ) : abaAtiva === "lista" ? (
          /* Lista de Rondas */
          <>
            <div className="tabela-container">
              <table className="tabela-rondas">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Vigilante</th>
                    <th>Status</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Tempo</th>
                    <th>Checkpoints</th>
                    <th>Distância</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rondas.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="sem-dados">
                        Nenhuma ronda encontrada
                      </td>
                    </tr>
                  ) : (
                    rondas.map((ronda) => (
                      <tr key={ronda.id}>
                        <td>#{ronda.id}</td>
                        <td>{ronda.usuario_nome || "-"}</td>
                        <td>{getStatusBadge(ronda.status)}</td>
                        <td>{formatarData(ronda.data_inicio)}</td>
                        <td>{formatarData(ronda.data_fim)}</td>
                        <td>{ronda.tempo_total || "-"}</td>
                        <td>{ronda.total_checkpoints || 0}</td>
                        <td>{ronda.distancia_total || "-"}</td>
                        <td>
                          <button
                            onClick={() => handleVerDetalhes(ronda.id)}
                            className="btn-acao"
                            title="Ver detalhes"
                          >
                            <FiEye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {paginacao.totalPaginas > 1 && (
              <div className="paginacao">
                <button
                  onClick={handlePaginaAnterior}
                  disabled={paginacao.pagina === 1}
                >
                  <FiChevronLeft size={18} />
                </button>
                <span>
                  Página {paginacao.pagina} de {paginacao.totalPaginas}
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
        ) : abaAtiva === "estatisticas" ? (
          /* Estatísticas */
          estatisticas && (
            <div className="estatisticas-container">
              {/* Cards de estatísticas */}
              <div className="estatisticas-cards">
                <div className="stat-card">
                  <div className="stat-icone">
                    <FiNavigation size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">
                      {estatisticas.estatisticas.total_rondas}
                    </span>
                    <span className="stat-label">Total de Rondas</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icone verde">
                    <FiCheckCircle size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">
                      {estatisticas.estatisticas.rondas_finalizadas}
                    </span>
                    <span className="stat-label">Finalizadas</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icone azul">
                    <FiActivity size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">
                      {estatisticas.estatisticas.rondas_em_andamento}
                    </span>
                    <span className="stat-label">Em Andamento</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icone vermelho">
                    <FiXCircle size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">
                      {estatisticas.estatisticas.rondas_canceladas}
                    </span>
                    <span className="stat-label">Canceladas</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icone">
                    <FiClock size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">
                      {estatisticas.estatisticas.tempo_total}
                    </span>
                    <span className="stat-label">Tempo Total</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icone">
                    <FiClock size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">
                      {estatisticas.estatisticas.tempo_medio}
                    </span>
                    <span className="stat-label">Tempo Médio</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icone">
                    <FiMapPin size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">
                      {estatisticas.estatisticas.total_checkpoints}
                    </span>
                    <span className="stat-label">Total Checkpoints</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icone">
                    <FiUser size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">
                      {estatisticas.estatisticas.total_vigilantes}
                    </span>
                    <span className="stat-label">Vigilantes Ativos</span>
                  </div>
                </div>
              </div>

              {/* Top Vigilantes */}
              {estatisticas.topVigilantes &&
                estatisticas.topVigilantes.length > 0 && (
                  <div className="top-vigilantes">
                    <h3>
                      <FiTrendingUp size={20} />
                      Top Vigilantes
                    </h3>
                    <table className="tabela-top">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nome</th>
                          <th>Rondas</th>
                          <th>Tempo Total</th>
                          <th>Distância</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estatisticas.topVigilantes.map((v, index) => (
                          <tr key={v.id}>
                            <td>{index + 1}</td>
                            <td>{v.nome}</td>
                            <td>{v.total_rondas}</td>
                            <td>{v.tempo_total}</td>
                            <td>{v.distancia_total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* Rondas por Dia */}
              {estatisticas.rondasPorDia &&
                estatisticas.rondasPorDia.length > 0 && (
                  <div className="rondas-por-dia">
                    <h3>
                      <FiCalendar size={20} />
                      Rondas por Dia (Últimos 7 dias)
                    </h3>
                    <div className="grafico-barras">
                      {estatisticas.rondasPorDia.map((dia) => (
                        <div key={dia.data} className="barra-container">
                          <div
                            className="barra"
                            style={{
                              height: `${Math.max((dia.total / Math.max(...estatisticas.rondasPorDia.map((d) => d.total))) * 100, 10)}%`,
                            }}
                          >
                            <span className="barra-valor">{dia.total}</span>
                          </div>
                          <span className="barra-label">
                            {new Date(dia.data).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )
        ) : (
          /* Auditoria */
          <>
            <div className="tabela-container">
              <table className="tabela-auditoria">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Tipo</th>
                    <th>Usuário</th>
                    <th>Ronda</th>
                    <th>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {auditoria.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="sem-dados">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : (
                    auditoria.map((registro) => (
                      <tr key={registro.id}>
                        <td>{formatarData(registro.data_hora)}</td>
                        <td>
                          <span className="tipo-acao">
                            {getTipoAcaoIcon(registro.tipo_acao)}
                            {registro.tipo_acao}
                          </span>
                        </td>
                        <td>{registro.usuario_nome || "-"}</td>
                        <td>
                          {registro.ronda_id ? `#${registro.ronda_id}` : "-"}
                        </td>
                        <td>{registro.descricao}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {paginacao.totalPaginas > 1 && (
              <div className="paginacao">
                <button
                  onClick={handlePaginaAnterior}
                  disabled={paginacao.pagina === 1}
                >
                  <FiChevronLeft size={18} />
                </button>
                <span>
                  Página {paginacao.pagina} de {paginacao.totalPaginas}
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
        <div className="modal-overlay" onClick={handleFecharDetalhes}>
          <div className="modal-detalhes" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>
                <FiNavigation size={24} />
                Detalhes da Ronda #{rondaSelecionada.id}
              </h2>
              <button onClick={handleFecharDetalhes} className="btn-fechar">
                <FiX size={24} />
              </button>
            </header>

            {carregandoDetalhes ? (
              <div className="modal-loading">
                <FiRefreshCw className="spin" size={32} />
              </div>
            ) : (
              <div className="modal-conteudo">
                {/* Informações gerais */}
                <section className="detalhes-secao">
                  <h3>Informações Gerais</h3>
                  <div className="detalhes-grid">
                    <div className="detalhe-item">
                      <span className="label">Vigilante</span>
                      <span className="valor">
                        {rondaSelecionada.usuario_nome}
                      </span>
                    </div>
                    <div className="detalhe-item">
                      <span className="label">Empresa</span>
                      <span className="valor">
                        {rondaSelecionada.empresa_nome || "-"}
                      </span>
                    </div>
                    <div className="detalhe-item">
                      <span className="label">Status</span>
                      {getStatusBadge(rondaSelecionada.status)}
                    </div>
                    <div className="detalhe-item">
                      <span className="label">Início</span>
                      <span className="valor">
                        {formatarData(rondaSelecionada.data_inicio)}
                      </span>
                    </div>
                    <div className="detalhe-item">
                      <span className="label">Fim</span>
                      <span className="valor">
                        {formatarData(rondaSelecionada.data_fim)}
                      </span>
                    </div>
                    <div className="detalhe-item">
                      <span className="label">Tempo Total</span>
                      <span className="valor destaque">
                        {rondaSelecionada.tempo_total}
                      </span>
                    </div>
                    <div className="detalhe-item">
                      <span className="label">Distância</span>
                      <span className="valor">
                        {rondaSelecionada.distancia_total}
                      </span>
                    </div>
                    <div className="detalhe-item">
                      <span className="label">Checkpoints</span>
                      <span className="valor">
                        {rondaSelecionada.total_checkpoints}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Observações */}
                {rondaSelecionada.observacoes && (
                  <section className="detalhes-secao">
                    <h3>Observações</h3>
                    <p className="observacoes">
                      {rondaSelecionada.observacoes}
                    </p>
                  </section>
                )}

                {/* Checkpoints */}
                {rondaSelecionada.checkpoints &&
                  rondaSelecionada.checkpoints.length > 0 && (
                    <section className="detalhes-secao">
                      <h3>
                        <FiMapPin size={18} />
                        Checkpoints ({rondaSelecionada.checkpoints.length})
                      </h3>
                      <div className="checkpoints-lista">
                        {rondaSelecionada.checkpoints.map((cp) => (
                          <div key={cp.id} className="checkpoint-detalhe">
                            <div className="checkpoint-numero">
                              {cp.numero_sequencial}
                            </div>
                            <div className="checkpoint-dados">
                              <span className="hora">
                                {new Date(cp.data_hora).toLocaleTimeString(
                                  "pt-BR",
                                )}
                              </span>
                              {cp.descricao && (
                                <span className="descricao">
                                  {cp.descricao}
                                </span>
                              )}
                              <span className="coordenadas">
                                {cp.latitude}, {cp.longitude}
                              </span>
                              <span className="tempo">
                                +{cp.tempo_desde_anterior}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                {/* Mapa do trajeto */}
                {rondaSelecionada.trajeto &&
                  rondaSelecionada.trajeto.length > 0 && (
                    <section className="detalhes-secao">
                      <h3>
                        <FiMap size={18} />
                        Trajeto ({rondaSelecionada.trajeto.length} pontos)
                      </h3>
                      <MapaRonda
                        trajeto={rondaSelecionada.trajeto}
                        checkpoints={rondaSelecionada.checkpoints}
                        inicio={rondaSelecionada.trajeto[0]}
                        fim={
                          rondaSelecionada.trajeto[
                            rondaSelecionada.trajeto.length - 1
                          ]
                        }
                        altura={350}
                      />
                    </section>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
