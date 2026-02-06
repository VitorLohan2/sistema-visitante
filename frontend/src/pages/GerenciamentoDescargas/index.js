import logger from "../../utils/logger";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import {
  FiTruck,
  FiSearch,
  FiFilter,
  FiCheck,
  FiX,
  FiClock,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiMail,
  FiPhone,
  FiUser,
  FiCalendar,
  FiPackage,
} from "react-icons/fi";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { usePermissoes } from "../../hooks/usePermissoes";
import { getCache, setCache } from "../../services/cacheService";
import socketService from "../../services/socketService";
import "./styles.css";

const GerenciamentoDescargas = () => {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();
  const { user } = useAuth();
  const { temPermissao } = usePermissoes();

  // Estados principais
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de filtro
  const [filtros, setFiltros] = useState({
    status: "",
    dataInicio: "",
    dataFim: "",
    busca: "",
  });
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);

  // Estados de paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const itensPorPagina = 10;

  // Estados de modal
  const [modalDetalhes, setModalDetalhes] = useState({
    aberto: false,
    solicitacao: null,
  });
  const [modalAprovar, setModalAprovar] = useState({
    aberto: false,
    solicitacao: null,
  });
  const [modalRejeitar, setModalRejeitar] = useState({
    aberto: false,
    solicitacao: null,
  });
  const [modalAjustar, setModalAjustar] = useState({
    aberto: false,
    solicitacao: null,
  });

  // Estados de formulário
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [novoHorario, setNovoHorario] = useState({
    data: "",
    hora: "",
    motivo: "",
  });
  const [processando, setProcessando] = useState(false);
  const isFirstLoadRef = useRef(true);
  const filtrosRef = useRef(filtros);

  // Manter ref atualizada
  useEffect(() => {
    filtrosRef.current = filtros;
  }, [filtros]);

  // Buscar solicitações
  const buscarSolicitacoes = useCallback(
    async (pagina = 1, usarFiltros = false) => {
      try {
        // Na primeira carga, usa cache para renderização instantânea
        let cacheUsado = false;
        if (isFirstLoadRef.current && pagina === 1) {
          const cachedData = getCache("solicitacoesDescarga");
          if (cachedData && cachedData.data?.length > 0) {
            logger.log(
              "⚡ Descargas carregadas do cache:",
              cachedData.data.length,
            );
            setSolicitacoes(cachedData.data);
            setTotalPaginas(cachedData.totalPaginas || 1);
            setTotalRegistros(
              cachedData.totalRegistros || cachedData.data.length,
            );
            setLoading(false);
            cacheUsado = true;
          }
        }

        // Só mostra loading se não carregou do cache
        if (!cacheUsado) {
          setLoading(pagina === 1);
          setRefreshing(pagina !== 1);
        }

        const params = new URLSearchParams();
        params.append("page", pagina);
        params.append("limit", itensPorPagina);

        // Usa filtros da ref apenas se usarFiltros for true
        const f = usarFiltros
          ? filtrosRef.current
          : { status: "", dataInicio: "", dataFim: "", busca: "" };

        if (f.status) params.append("status", f.status);
        if (f.dataInicio) params.append("data_inicio", f.dataInicio);
        if (f.dataFim) params.append("data_fim", f.dataFim);
        if (f.busca) params.append("busca", f.busca);

        const response = await api.get(
          `/solicitacoes-descarga?${params.toString()}`,
        );

        // Mapear dados vindos do backend para o formato esperado
        const dados = response.data.data || response.data || [];
        const totalPags = response.data.pagination?.totalPages || 1;
        const totalRegs = response.data.pagination?.total || dados.length || 0;

        setSolicitacoes(dados);
        setTotalPaginas(totalPags);
        setTotalRegistros(totalRegs);
        setPaginaAtual(pagina);

        // Salva no cache apenas se for a primeira página sem filtros
        if (
          pagina === 1 &&
          !f.status &&
          !f.dataInicio &&
          !f.dataFim &&
          !f.busca
        ) {
          setCache("solicitacoesDescarga", {
            data: dados,
            totalPaginas: totalPags,
            totalRegistros: totalRegs,
          });
        }

        isFirstLoadRef.current = false;
      } catch (error) {
        logger.error("Erro ao buscar solicitações:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [], // Sem dependências - usa refs
  );

  useEffect(() => {
    buscarSolicitacoes(1, false); // Carrega sem filtros inicialmente
  }, [buscarSolicitacoes]);

  // Socket - Atualização em tempo real
  useEffect(() => {
    // Listener para nova solicitação
    const handleNovaDescarga = (data) => {
      logger.log("📦 Nova solicitação recebida via Socket:", data);
      // Adiciona no início da lista
      setSolicitacoes((prev) => {
        if (prev.find((s) => s.id === data.id)) return prev;
        const novaLista = [data, ...prev];
        // Atualiza cache
        const cached = getCache("solicitacoesDescarga");
        if (cached) {
          setCache("solicitacoesDescarga", {
            ...cached,
            data: novaLista,
            totalRegistros: (cached.totalRegistros || 0) + 1,
          });
        }
        return novaLista;
      });
    };

    // Listener para atualização de solicitação
    const handleDescargaAtualizada = (data) => {
      logger.log("📦 Solicitação atualizada via Socket:", data);
      // Atualiza a solicitação na lista local e no cache
      setSolicitacoes((prev) => {
        const novaLista = prev.map((s) =>
          s.id === data.id ? { ...s, ...data } : s,
        );
        // Atualiza cache
        const cached = getCache("solicitacoesDescarga");
        if (cached) {
          setCache("solicitacoesDescarga", {
            ...cached,
            data: novaLista,
          });
        }
        return novaLista;
      });
    };

    // Registra os listeners
    const unsubscribeNova = socketService.on(
      "descarga:nova",
      handleNovaDescarga,
    );
    const unsubscribeAtualizada = socketService.on(
      "descarga:atualizada",
      handleDescargaAtualizada,
    );

    // Cleanup ao desmontar
    return () => {
      unsubscribeNova();
      unsubscribeAtualizada();
    };
  }, [buscarSolicitacoes]);

  // Aplicar filtros
  const aplicarFiltros = () => {
    setFiltrosAtivos(true);
    buscarSolicitacoes(1, true); // Passa true para usar filtros
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({
      status: "",
      dataInicio: "",
      dataFim: "",
      busca: "",
    });
    setFiltrosAtivos(false);
    // Espera o estado limpar e depois busca sem filtros
    setTimeout(() => {
      buscarSolicitacoes(1, false);
    }, 0);
  };

  // Aprovar solicitação
  const handleAprovar = async () => {
    if (!modalAprovar.solicitacao) return;

    try {
      setProcessando(true);
      await api.post(
        `/solicitacoes-descarga/${modalAprovar.solicitacao.id}/aprovar`,
      );

      setModalAprovar({ aberto: false, solicitacao: null });
      buscarSolicitacoes(paginaAtual, filtrosAtivos);

      showToast(
        "Solicitação aprovada com sucesso! O solicitante foi notificado por e-mail.",
        "success",
      );
    } catch (error) {
      logger.error("Erro ao aprovar:", error);
      showToast("Erro ao aprovar solicitação. Tente novamente.", "error");
    } finally {
      setProcessando(false);
    }
  };

  // Rejeitar solicitação
  const handleRejeitar = async () => {
    if (!modalRejeitar.solicitacao || !motivoRejeicao.trim()) {
      showToast("Por favor, informe o motivo da rejeição.", "warning");
      return;
    }

    try {
      setProcessando(true);
      await api.post(
        `/solicitacoes-descarga/${modalRejeitar.solicitacao.id}/rejeitar`,
        {
          observacao: motivoRejeicao,
        },
      );

      setModalRejeitar({ aberto: false, solicitacao: null });
      setMotivoRejeicao("");
      buscarSolicitacoes(paginaAtual, filtrosAtivos);

      showToast(
        "Solicitação rejeitada. O solicitante foi notificado por e-mail.",
        "success",
      );
    } catch (error) {
      logger.error("Erro ao rejeitar:", error);
      showToast("Erro ao rejeitar solicitação. Tente novamente.", "error");
    } finally {
      setProcessando(false);
    }
  };

  // Ajustar horário
  const handleAjustarHorario = async () => {
    if (!modalAjustar.solicitacao || !novoHorario.data || !novoHorario.hora) {
      showToast("Por favor, informe a nova data e horário.", "warning");
      return;
    }

    try {
      setProcessando(true);

      // Enviar data e hora sem conversão de timezone
      // Formato: "2026-01-15T14:30:00" (sem Z no final = horário local)
      const dataHoraLocal = `${novoHorario.data}T${novoHorario.hora}:00`;

      await api.post(
        `/solicitacoes-descarga/${modalAjustar.solicitacao.id}/ajustar-horario`,
        {
          novo_horario: dataHoraLocal,
          observacao: novoHorario.motivo,
        },
      );

      setModalAjustar({ aberto: false, solicitacao: null });
      setNovoHorario({ data: "", hora: "", motivo: "" });
      buscarSolicitacoes(paginaAtual, filtrosAtivos);

      showToast(
        "Horário ajustado com sucesso! O solicitante foi notificado por e-mail.",
        "success",
      );
    } catch (error) {
      logger.error("Erro ao ajustar horário:", error);
      showToast("Erro ao ajustar horário. Tente novamente.", "error");
    } finally {
      setProcessando(false);
    }
  };

  // Formatar CNPJ/CPF
  const formatarDocumento = (documento) => {
    if (!documento) return "-";
    const numeros = documento.replace(/\D/g, "");
    if (numeros.length === 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (numeros.length === 14) {
      return numeros.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5",
      );
    }
    return documento;
  };

  // Formatar data
  const formatarData = (data) => {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
  };

  // Função auxiliar para parsear data do PostgreSQL como horário local
  const parseDateAsLocal = (data) => {
    if (!data) return null;
    // PostgreSQL retorna "2026-01-15 14:30:00" ou "2026-01-15T14:30:00"
    // Precisamos parsear manualmente para evitar problemas de timezone
    const str = typeof data === "string" ? data : data.toString();
    // Extrair componentes da data
    const match = str.match(
      /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):?(\d{2})?/,
    );
    if (match) {
      const [, ano, mes, dia, hora, min, seg = "00"] = match;
      // Criar data com componentes locais (mês é 0-indexed)
      return new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia),
        parseInt(hora),
        parseInt(min),
        parseInt(seg),
      );
    }
    // Fallback para Date padrão
    return new Date(data);
  };

  // Formatar data e hora (tratando timestamps do PostgreSQL)
  const formatarDataHora = (data) => {
    if (!data) return "-";
    const dataObj = parseDateAsLocal(data);
    return dataObj ? dataObj.toLocaleString("pt-BR") : "-";
  };

  // Obter classe do status
  const getStatusClass = (status) => {
    const statusLower = status?.toLowerCase() || "";
    const classes = {
      pendente: "gd-status-pendente",
      aprovado: "gd-status-aprovado",
      rejeitado: "gd-status-rejeitado",
      ajuste_solicitado: "gd-status-ajuste",
    };
    return classes[statusLower] || "";
  };

  // Obter label do status
  const getStatusLabel = (status) => {
    const statusLower = status?.toLowerCase() || "";
    const labels = {
      pendente: "Pendente",
      aprovado: "Aprovado",
      rejeitado: "Rejeitado",
      ajuste_solicitado: "Ajuste Solicitado",
    };
    return labels[statusLower] || status;
  };

  // Gerar protocolo a partir do ID
  const gerarProtocolo = (id) => {
    return `DESC-${String(id).padStart(6, "0")}`;
  };

  // Formatar horário (tratando timestamps do PostgreSQL)
  const formatarHorario = (dataHora) => {
    if (!dataHora) return "-";
    const dataObj = parseDateAsLocal(dataHora);
    return dataObj
      ? dataObj.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";
  };

  return (
    <div className="gd-container">
      {/* Header */}
      <div className="gd-header">
        <div className="gd-header-titulo">
          <FiTruck className="gd-header-icon" />
          <div>
            <h1>Gerenciamento de Descargas</h1>
            <p>Gerencie as solicitações de descarga de fornecedores</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="gd-filtros">
        <div className="gd-filtros-row">
          <div className="gd-filtro-grupo">
            <label>Buscar</label>
            <div className="gd-input-icon">
              <FiSearch />
              <input
                type="text"
                placeholder="Empresa, CNPJ, motorista..."
                value={filtros.busca}
                onChange={(e) =>
                  setFiltros({ ...filtros, busca: e.target.value })
                }
              />
            </div>
          </div>

          <div className="gd-filtro-grupo">
            <label>Status</label>
            <select
              value={filtros.status}
              onChange={(e) =>
                setFiltros({ ...filtros, status: e.target.value })
              }
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
              <option value="ajuste_solicitado">Ajuste Solicitado</option>
            </select>
          </div>

          <div className="gd-filtro-grupo">
            <label>Data Início</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) =>
                setFiltros({ ...filtros, dataInicio: e.target.value })
              }
            />
          </div>

          <div className="gd-filtro-grupo">
            <label>Data Fim</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) =>
                setFiltros({ ...filtros, dataFim: e.target.value })
              }
            />
          </div>

          <div className="gd-filtros-acoes">
            <button className="btn-secondary" onClick={aplicarFiltros}>
              <FiFilter /> Filtrar
            </button>
            <button className="btn-clean" onClick={limparFiltros}>
              <FiX /> Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="gd-resumo">
        <span className="gd-total-registros">
          {totalRegistros} solicitação(ões) encontrada(s)
        </span>
      </div>

      {/* Tabela */}
      <div className="gd-tabela">
        {solicitacoes.length === 0 ? (
          <div className="gd-tabela-vazia">
            <FiTruck />
            <p>Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Protocolo</th>
                <th>Empresa</th>
                <th>Transportadora</th>
                <th>Motorista</th>
                <th>Notas Fiscais</th>
                <th>Volumes</th>
                <th>Data Solicitada</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((solicitacao) => (
                <tr key={solicitacao.id}>
                  <td className="gd-td-protocolo">
                    <strong>{gerarProtocolo(solicitacao.id)}</strong>
                  </td>
                  <td>{solicitacao.empresa_nome}</td>
                  <td>{solicitacao.transportadora_nome || "-"}</td>
                  <td>{solicitacao.motorista_nome}</td>
                  <td className="gd-td-notas">
                    <span title={solicitacao.notas_fiscais || "-"}>
                      {solicitacao.notas_fiscais
                        ? solicitacao.notas_fiscais.length > 20
                          ? solicitacao.notas_fiscais.substring(0, 20) + "..."
                          : solicitacao.notas_fiscais
                        : "-"}
                    </span>
                  </td>
                  <td>{solicitacao.quantidade_volumes || "-"}</td>
                  <td>
                    {formatarData(solicitacao.horario_solicitado)}
                    <br />
                    <small>
                      {formatarHorario(solicitacao.horario_solicitado)}
                    </small>
                  </td>
                  <td>
                    <span
                      className={`gd-status-badge ${getStatusClass(solicitacao.status)}`}
                    >
                      {getStatusLabel(solicitacao.status)}
                    </span>
                  </td>
                  <td className="gd-td-acoes">
                    <button
                      className="gd-btn-acao gd-btn-visualizar"
                      onClick={() =>
                        setModalDetalhes({ aberto: true, solicitacao })
                      }
                      title="Ver detalhes"
                    >
                      <FiEye />
                    </button>

                    {solicitacao.status?.toUpperCase() === "PENDENTE" &&
                      temPermissao("descarga_aprovar") && (
                        <>
                          <button
                            className="gd-btn-acao gd-btn-aprovar"
                            onClick={() =>
                              setModalAprovar({ aberto: true, solicitacao })
                            }
                            title="Aprovar"
                          >
                            <FiCheck />
                          </button>

                          <button
                            className="gd-btn-acao gd-btn-rejeitar"
                            onClick={() =>
                              setModalRejeitar({ aberto: true, solicitacao })
                            }
                            title="Rejeitar"
                          >
                            <FiX />
                          </button>

                          <button
                            className="gd-btn-acao gd-btn-ajustar"
                            onClick={() =>
                              setModalAjustar({ aberto: true, solicitacao })
                            }
                            title="Ajustar horário"
                          >
                            <FiClock />
                          </button>
                        </>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="gd-paginacao">
          <button
            className="gd-btn-paginacao"
            onClick={() => buscarSolicitacoes(paginaAtual - 1, filtrosAtivos)}
            disabled={paginaAtual === 1}
          >
            <FiChevronLeft /> Anterior
          </button>

          <span className="gd-paginacao-info">
            Página {paginaAtual} de {totalPaginas}
          </span>

          <button
            className="gd-btn-paginacao"
            onClick={() => buscarSolicitacoes(paginaAtual + 1, filtrosAtivos)}
            disabled={paginaAtual === totalPaginas}
          >
            Próxima <FiChevronRight />
          </button>
        </div>
      )}

      {/* Modal Detalhes */}
      {modalDetalhes.aberto && modalDetalhes.solicitacao && (
        <div
          className="gd-modal-overlay"
          onClick={() => setModalDetalhes({ aberto: false, solicitacao: null })}
        >
          <div
            className="gd-modal-content gd-modal-detalhes"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gd-modal-header">
              <h2>Detalhes da Solicitação</h2>
              <span
                className={`gd-status-badge ${getStatusClass(modalDetalhes.solicitacao.status)}`}
              >
                {getStatusLabel(modalDetalhes.solicitacao.status)}
              </span>
            </div>

            <div className="gd-modal-body">
              <div className="gd-detalhes-section">
                <h3>
                  <FiPackage /> Informações da Empresa
                </h3>
                <div className="gd-detalhes-grid">
                  <div className="gd-detalhe-item">
                    <label>Protocolo</label>
                    <span className="gd-protocolo">
                      {gerarProtocolo(modalDetalhes.solicitacao.id)}
                    </span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>Empresa</label>
                    <span>{modalDetalhes.solicitacao.empresa_nome}</span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>Contato</label>
                    <span>{modalDetalhes.solicitacao.empresa_contato}</span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>CNPJ/CPF</label>
                    <span>
                      {formatarDocumento(
                        modalDetalhes.solicitacao.empresa_cnpj,
                      )}
                    </span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>E-mail</label>
                    <span>
                      <FiMail /> {modalDetalhes.solicitacao.empresa_email}
                    </span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>Telefone</label>
                    <span>
                      <FiPhone /> {modalDetalhes.solicitacao.empresa_telefone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="gd-detalhes-section">
                <h3>
                  <FiUser /> Informações do Motorista
                </h3>
                <div className="gd-detalhes-grid">
                  <div className="gd-detalhe-item">
                    <label>Nome</label>
                    <span>{modalDetalhes.solicitacao.motorista_nome}</span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>CPF</label>
                    <span>
                      {formatarDocumento(
                        modalDetalhes.solicitacao.motorista_cpf,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="gd-detalhes-section">
                <h3>
                  <FiTruck /> Informações da Descarga
                </h3>
                <div className="gd-detalhes-grid">
                  <div className="gd-detalhe-item">
                    <label>Placa do Veículo</label>
                    <span>{modalDetalhes.solicitacao.placa_veiculo}</span>
                  </div>
                  {modalDetalhes.solicitacao.transportadora_nome && (
                    <div className="gd-detalhe-item">
                      <label>Transportadora</label>
                      <span>
                        {modalDetalhes.solicitacao.transportadora_nome}
                      </span>
                    </div>
                  )}
                  <div className="gd-detalhe-item">
                    <label>Tipo de Carga</label>
                    <span>{modalDetalhes.solicitacao.tipo_carga}</span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>Notas Fiscais</label>
                    <span>
                      {modalDetalhes.solicitacao.notas_fiscais || "-"}
                    </span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>Quantidade de Volumes</label>
                    <span>
                      {modalDetalhes.solicitacao.quantidade_volumes || "-"}
                    </span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>Data Solicitada</label>
                    <span>
                      <FiCalendar />{" "}
                      {formatarData(
                        modalDetalhes.solicitacao.horario_solicitado,
                      )}
                    </span>
                  </div>
                  <div className="gd-detalhe-item">
                    <label>Horário Solicitado</label>
                    <span>
                      <FiClock />{" "}
                      {formatarHorario(
                        modalDetalhes.solicitacao.horario_solicitado,
                      )}
                    </span>
                  </div>
                </div>

                {modalDetalhes.solicitacao.observacao && (
                  <div className="gd-detalhe-observacoes">
                    <label>Observações</label>
                    <p>{modalDetalhes.solicitacao.observacao}</p>
                  </div>
                )}
              </div>

              <div className="gd-detalhes-section gd-detalhes-datas">
                <div className="gd-detalhe-item">
                  <label>Data da Solicitação</label>
                  <span>
                    {formatarDataHora(modalDetalhes.solicitacao.criado_em)}
                  </span>
                </div>
                {modalDetalhes.solicitacao.validado_em && (
                  <div className="gd-detalhe-item">
                    <label>Data da Resposta</label>
                    <span>
                      {formatarDataHora(modalDetalhes.solicitacao.validado_em)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="gd-modal-footer">
              <button
                className="gd-btn-secundario"
                onClick={() =>
                  setModalDetalhes({ aberto: false, solicitacao: null })
                }
              >
                Fechar
              </button>

              {modalDetalhes.solicitacao.status?.toUpperCase() === "PENDENTE" &&
                temPermissao("descarga_aprovar") && (
                  <div className="gd-modal-acoes">
                    <button
                      className="gd-btn-aprovar"
                      onClick={() => {
                        setModalDetalhes({ aberto: false, solicitacao: null });
                        setModalAprovar({
                          aberto: true,
                          solicitacao: modalDetalhes.solicitacao,
                        });
                      }}
                    >
                      <FiCheck /> Aprovar
                    </button>
                    <button
                      className="gd-btn-ajustar"
                      onClick={() => {
                        setModalDetalhes({ aberto: false, solicitacao: null });
                        setModalAjustar({
                          aberto: true,
                          solicitacao: modalDetalhes.solicitacao,
                        });
                      }}
                    >
                      <FiClock /> Ajustar
                    </button>
                    <button
                      className="gd-btn-rejeitar"
                      onClick={() => {
                        setModalDetalhes({ aberto: false, solicitacao: null });
                        setModalRejeitar({
                          aberto: true,
                          solicitacao: modalDetalhes.solicitacao,
                        });
                      }}
                    >
                      <FiX /> Rejeitar
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Aprovar */}
      {modalAprovar.aberto && modalAprovar.solicitacao && (
        <div
          className="gd-modal-overlay"
          onClick={() => setModalAprovar({ aberto: false, solicitacao: null })}
        >
          <div
            className="gd-modal-content gd-modal-acao"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gd-modal-header gd-modal-header-aprovar">
              <FiCheck />
              <h2>Aprovar Solicitação</h2>
            </div>

            <div className="gd-modal-body">
              <p className="gd-modal-confirmacao">
                Deseja aprovar a solicitação de descarga da empresa{" "}
                <strong>{modalAprovar.solicitacao.empresa_nome}</strong>?
              </p>

              <div className="gd-modal-resumo">
                <div className="gd-resumo-item">
                  <label>Data:</label>
                  <span>
                    {formatarData(modalAprovar.solicitacao.horario_solicitado)}
                  </span>
                </div>
                <div className="gd-resumo-item">
                  <label>Horário:</label>
                  <span>
                    {formatarHorario(
                      modalAprovar.solicitacao.horario_solicitado,
                    )}
                  </span>
                </div>
                <div className="gd-resumo-item">
                  <label>Motorista:</label>
                  <span>{modalAprovar.solicitacao.motorista_nome}</span>
                </div>
              </div>

              <p className="gd-modal-info">
                Um agendamento será criado automaticamente e o solicitante será
                notificado por e-mail.
              </p>
            </div>

            <div className="gd-modal-footer">
              <button
                className="gd-btn-secundario"
                onClick={() =>
                  setModalAprovar({ aberto: false, solicitacao: null })
                }
                disabled={processando}
              >
                Cancelar
              </button>
              <button
                className="gd-btn-aprovar"
                onClick={handleAprovar}
                disabled={processando}
              >
                {processando ? "Aprovando..." : "Confirmar Aprovação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejeitar */}
      {modalRejeitar.aberto && modalRejeitar.solicitacao && (
        <div
          className="gd-modal-overlay"
          onClick={() => setModalRejeitar({ aberto: false, solicitacao: null })}
        >
          <div
            className="gd-modal-content gd-modal-acao"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gd-modal-header gd-modal-header-rejeitar">
              <FiX />
              <h2>Rejeitar Solicitação</h2>
            </div>

            <div className="gd-modal-body">
              <p className="gd-modal-confirmacao">
                Deseja rejeitar a solicitação de descarga da empresa{" "}
                <strong>{modalRejeitar.solicitacao.empresa_nome}</strong>?
              </p>

              <div className="gd-form-grupo">
                <label>Motivo da Rejeição *</label>
                <textarea
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                  rows={4}
                  required
                />
              </div>

              <p className="gd-modal-info gd-warning">
                O solicitante será notificado por e-mail sobre a rejeição com o
                motivo informado.
              </p>
            </div>

            <div className="gd-modal-footer">
              <button
                className="gd-btn-secundario"
                onClick={() => {
                  setModalRejeitar({ aberto: false, solicitacao: null });
                  setMotivoRejeicao("");
                }}
                disabled={processando}
              >
                Cancelar
              </button>
              <button
                className="gd-btn-rejeitar"
                onClick={handleRejeitar}
                disabled={processando || !motivoRejeicao.trim()}
              >
                {processando ? "Rejeitando..." : "Confirmar Rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajustar Horário */}
      {modalAjustar.aberto && modalAjustar.solicitacao && (
        <div
          className="gd-modal-overlay"
          onClick={() => setModalAjustar({ aberto: false, solicitacao: null })}
        >
          <div
            className="gd-modal-content gd-modal-acao"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gd-modal-header gd-modal-header-ajustar">
              <FiClock />
              <h2>Ajustar Horário</h2>
            </div>

            <div className="gd-modal-body">
              <p className="gd-modal-confirmacao">
                Propor novo horário para a solicitação da empresa{" "}
                <strong>{modalAjustar.solicitacao.empresa_nome}</strong>
              </p>

              <div className="gd-modal-resumo">
                <div className="gd-resumo-item">
                  <label>Solicitado:</label>
                  <span>
                    {formatarData(modalAjustar.solicitacao.horario_solicitado)}{" "}
                    às{" "}
                    {formatarHorario(
                      modalAjustar.solicitacao.horario_solicitado,
                    )}
                  </span>
                </div>
              </div>

              <div className="gd-form-row">
                <div className="gd-form-grupo">
                  <label>Nova Data *</label>
                  <input
                    type="date"
                    value={novoHorario.data}
                    onChange={(e) =>
                      setNovoHorario({ ...novoHorario, data: e.target.value })
                    }
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div className="gd-form-grupo">
                  <label>Novo Horário *</label>
                  <input
                    type="time"
                    value={novoHorario.hora}
                    onChange={(e) =>
                      setNovoHorario({ ...novoHorario, hora: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="gd-form-grupo">
                <label>Motivo do Ajuste</label>
                <textarea
                  value={novoHorario.motivo}
                  onChange={(e) =>
                    setNovoHorario({ ...novoHorario, motivo: e.target.value })
                  }
                  placeholder="Informe o motivo do ajuste (opcional)..."
                  rows={3}
                />
              </div>

              <p className="gd-modal-info">
                O solicitante será notificado por e-mail sobre a proposta de
                novo horário.
              </p>
            </div>

            <div className="gd-modal-footer">
              <button
                className="gd-btn-secundario"
                onClick={() => {
                  setModalAjustar({ aberto: false, solicitacao: null });
                  setNovoHorario({ data: "", hora: "", motivo: "" });
                }}
                disabled={processando}
              >
                Cancelar
              </button>
              <button
                className="gd-btn-ajustar"
                onClick={handleAjustarHorario}
                disabled={processando || !novoHorario.data || !novoHorario.hora}
              >
                {processando ? "Enviando..." : "Enviar Proposta"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
};

export default GerenciamentoDescargas;
