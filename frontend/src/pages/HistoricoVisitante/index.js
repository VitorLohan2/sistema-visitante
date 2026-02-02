import logger from "../../utils/logger";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import {
  FiSearch,
  FiFileText,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiMessageSquare,
  FiClock,
  FiUsers,
  FiFilter,
  FiDownload,
  FiCalendar,
} from "react-icons/fi";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import api from "../../services/api";
import * as socketService from "../../services/socketService";
import { useSocket } from "../../hooks/useSocket";
import {
  setCache,
  getCache,
  addHistoricoToCache,
  updateHistoricoInCache,
  removeHistoricoFromCache,
} from "../../services/cacheService";
import "./styles.css";

import logoImg from "../../assets/logo.svg";

export default function HistoricoVisitante() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("");

  // ✅ Garante conexão do socket
  useSocket();

  // ✅ Inicializa com cache se existir
  const [historyData, setHistoryData] = useState(
    () => getCache("historico") || [],
  );

  const [selectedObservation, setSelectedObservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ✅ PAGINAÇÃO
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;

  const ongId = localStorage.getItem("ongId");
  const ongName = localStorage.getItem("ongName");

  // Controle de listeners do socket
  const socketListenersRef = useRef([]);
  const isDataLoadedRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET LISTENERS - Atualização em tempo real
  // ═══════════════════════════════════════════════════════════════
  const setupSocketListeners = useCallback(() => {
    // Remove listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // ✅ LISTENER: Visita encerrada (visitor:end do backend)
    const unsubVisitorEnd = socketService.on("visitor:end", (visitante) => {
      logger.log(
        "📥 Socket Histórico: Visita encerrada recebida",
        visitante.id,
        visitante.nome,
      );
      setHistoryData((prev) => {
        // Verifica duplicata pelo ID do histórico
        const existente = prev.find((v) => v.id === visitante.id);
        if (existente) {
          logger.log("⚠️ Registro já existe no histórico, atualizando...");
          return prev.map((v) =>
            v.id === visitante.id ? { ...v, ...visitante } : v,
          );
        }

        // Adiciona novo registro ao histórico
        logger.log("✅ Adicionando novo registro ao histórico");
        const novosHistorico = [visitante, ...prev].sort((a, b) => {
          const dateA = new Date(
            a.data_de_saida || a.data_de_entrada || a.criado_em,
          );
          const dateB = new Date(
            b.data_de_saida || b.data_de_entrada || b.criado_em,
          );
          return dateB - dateA;
        });
        // Atualiza cache
        setCache("historico", novosHistorico);
        return novosHistorico;
      });
    });

    // ✅ LISTENER: Visita encerrada (visita:encerrada alternativo)
    const unsubVisitaEncerrada = socketService.on(
      "visita:encerrada",
      (visitante) => {
        logger.log(
          "📥 Socket Histórico: Visita encerrada (alt)",
          visitante.nome,
        );
        setHistoryData((prev) => {
          if (prev.find((v) => v.id === visitante.id)) {
            return prev.map((v) =>
              v.id === visitante.id ? { ...v, ...visitante } : v,
            );
          }
          const novosHistorico = [visitante, ...prev].sort((a, b) => {
            const dateA = new Date(a.data_de_entrada || a.criado_em);
            const dateB = new Date(b.data_de_entrada || b.criado_em);
            return dateB - dateA;
          });
          setCache("historico", novosHistorico);
          return novosHistorico;
        });
      },
    );

    // ✅ LISTENER: Visitante atualizado no histórico
    const unsubHistoricoUpdated = socketService.on(
      "historico:updated",
      (dados) => {
        logger.log("📝 Socket Histórico: Atualizado", dados.id);
        setHistoryData((prev) => {
          const novosHistorico = prev
            .map((v) => (v.id === dados.id ? { ...v, ...dados } : v))
            .sort((a, b) => {
              const dateA = new Date(a.data_de_entrada || a.criado_em);
              const dateB = new Date(b.data_de_entrada || b.criado_em);
              return dateB - dateA;
            });
          setCache("historico", novosHistorico);
          return novosHistorico;
        });
      },
    );

    // ✅ LISTENER: Visitante deletado do histórico
    const unsubHistoricoDeleted = socketService.on(
      "historico:deleted",
      (dados) => {
        logger.log("🗑️ Socket Histórico: Deletado", dados.id);
        setHistoryData((prev) => {
          const novosHistorico = prev.filter((v) => v.id !== dados.id);
          setCache("historico", novosHistorico);
          return novosHistorico;
        });
      },
    );

    // ✅ LISTENER: Visitante atualizado (pode ter saído - data_de_saida)
    const unsubVisitanteUpdated = socketService.on(
      "visitante:updated",
      (dados) => {
        // Se o visitante agora tem data_de_saida, ele deve aparecer no histórico
        if (dados.data_de_saida) {
          logger.log(
            "📥 Socket Histórico: Visitante encerrou visita",
            dados.id,
          );
          setHistoryData((prev) => {
            const exists = prev.find((v) => v.id === dados.id);
            if (exists) {
              // Atualiza existente
              const novosHistorico = prev
                .map((v) => (v.id === dados.id ? { ...v, ...dados } : v))
                .sort((a, b) => {
                  const dateA = new Date(a.data_de_entrada || a.criado_em);
                  const dateB = new Date(b.data_de_entrada || b.criado_em);
                  return dateB - dateA;
                });
              setCache("historico", novosHistorico);
              return novosHistorico;
            } else {
              // Adiciona novo ao histórico
              const novosHistorico = [dados, ...prev].sort((a, b) => {
                const dateA = new Date(a.data_de_entrada || a.criado_em);
                const dateB = new Date(b.data_de_entrada || b.criado_em);
                return dateB - dateA;
              });
              setCache("historico", novosHistorico);
              return novosHistorico;
            }
          });
        }
      },
    );

    socketListenersRef.current.push(
      unsubVisitorEnd,
      unsubVisitaEncerrada,
      unsubHistoricoUpdated,
      unsubHistoricoDeleted,
      unsubVisitanteUpdated,
    );

    logger.log("🔌 Socket Histórico: Listeners configurados");
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO INICIAL - Com cache
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // ✅ Se já tem cache, usa imediatamente
        const cachedHistorico = getCache("historico");
        if (
          cachedHistorico &&
          cachedHistorico.length > 0 &&
          !isDataLoadedRef.current
        ) {
          logger.log(
            "📦 Histórico: Usando cache",
            cachedHistorico.length,
            "registros",
          );
          setHistoryData(cachedHistorico);
        }

        // ✅ Busca da API em background
        const response = await api.get("visitantes/historico");

        // Ordenar os dados por data de entrada (mais recente primeiro)
        const sortedData = response.data.sort((a, b) => {
          const dateA = new Date(a.data_de_entrada || a.criado_em);
          const dateB = new Date(b.data_de_entrada || b.criado_em);
          return dateB - dateA;
        });

        // ✅ Atualiza estado e cache
        setHistoryData(sortedData);
        setCache("historico", sortedData);
        isDataLoadedRef.current = true;

        logger.log(
          "✅ Histórico: Carregado da API",
          sortedData.length,
          "registros",
        );
      } catch (error) {
        logger.error("Erro ao carregar histórico:", error);
        // Se falhou mas tem cache, mantém o cache
        if (!getCache("historico")) {
          showToast(
            "Erro ao carregar histórico. Verifique sua conexão.",
            "error",
          );
        }
      }
    };

    fetchHistory();

    // ✅ Configura Socket listeners
    setupSocketListeners();

    // Cleanup
    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
  }, [ongId, setupSocketListeners]);

  // ═══════════════════════════════════════════════════════════════
  // FILTRO DE DADOS
  // ═══════════════════════════════════════════════════════════════
  const filteredHistoryData = useMemo(() => {
    return historyData.filter((visitor) => {
      const matchesSearch =
        (visitor.nome &&
          visitor.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (visitor.cpf && visitor.cpf.includes(searchTerm));

      // Filtro por empresa
      const matchesEmpresa =
        !filterEmpresa ||
        visitor.empresa === filterEmpresa ||
        visitor.empresa_destino === filterEmpresa;

      if (!filterDate) return matchesSearch && matchesEmpresa;

      function formatDateToLocalYYYYMMDD(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      const entryDateFormatted = formatDateToLocalYYYYMMDD(
        visitor.data_de_entrada || visitor.criado_em,
      );

      return (
        matchesSearch && matchesEmpresa && entryDateFormatted === filterDate
      );
    });
  }, [historyData, searchTerm, filterDate, filterEmpresa]);

  // Lista única de empresas para o filtro
  const empresasUnicas = useMemo(() => {
    const empresas = new Set();
    historyData.forEach((visitor) => {
      if (visitor.empresa) empresas.add(visitor.empresa);
      if (visitor.empresa_destino) empresas.add(visitor.empresa_destino);
    });
    return Array.from(empresas).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
    );
  }, [historyData]);

  // ═══════════════════════════════════════════════════════════════
  // PAGINAÇÃO
  // ═══════════════════════════════════════════════════════════════
  const totalPages = Math.ceil(filteredHistoryData.length / recordsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return filteredHistoryData.slice(startIndex, endIndex);
  }, [filteredHistoryData, currentPage, recordsPerPage]);

  // Reset para página 1 quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate, filterEmpresa]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll suave para o topo da tabela
      document.querySelector(".historico-table-container")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // Gera array de páginas para renderizar
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // ═══════════════════════════════════════════════════════════════
  // ESTATÍSTICAS
  // ═══════════════════════════════════════════════════════════════
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visitasHoje = historyData.filter((v) => {
      const entryDate = new Date(v.data_de_entrada || v.criado_em);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    }).length;

    const comObservacao = historyData.filter(
      (v) => v.observacao && v.observacao.trim() !== "",
    ).length;

    return {
      total: historyData.length,
      visitasHoje,
      comObservacao,
    };
  }, [historyData]);

  // ═══════════════════════════════════════════════════════════════
  // EXPORTAR EXCEL
  // ═══════════════════════════════════════════════════════════════
  function exportToExcel(data) {
    const formattedData = data.map((visitor) => ({
      Nome: visitor.nome || "Não informado",
      CPF: visitor.cpf || "Não informado",
      Empresa: visitor.empresa || "Não informado",
      Destino: visitor.empresa_destino || "Não informado",
      Setor: visitor.setor || "Não informado",
      Função: visitor.funcao || "Não informado",
      Placa: visitor.placa_veiculo || "Não informado",
      "Tipo Veículo": visitor.tipo_veiculo || "Não informado",
      Cor: visitor.cor_veiculo || "Não informado",
      Responsável: visitor.responsavel || "Não informado",
      Observação: visitor.observacao || "Não informado",
      Entrada: visitor.data_de_entrada
        ? new Date(visitor.data_de_entrada).toLocaleString()
        : new Date(visitor.criado_em).toLocaleString(),
      Saída: visitor.data_de_saida
        ? new Date(visitor.data_de_saida).toLocaleString()
        : "Não informado",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório de Visitas");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(
      blob,
      `relatorio_visitas_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORTAR PDF
  // ═══════════════════════════════════════════════════════════════
  function exportToPDF(data) {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Relatório de Histórico de Visitas", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total de registros: ${data.length}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [
        ["Nome", "CPF", "Empresa", "Destino", "Setor", "Entrada", "Saída"],
      ],
      body: data.map((visitor) => [
        visitor.nome || "-",
        visitor.cpf || "-",
        visitor.empresa || "-",
        visitor.empresa_destino || "-",
        visitor.setor || "-",
        visitor.data_de_entrada
          ? new Date(visitor.data_de_entrada).toLocaleString()
          : "-",
        visitor.data_de_saida
          ? new Date(visitor.data_de_saida).toLocaleString()
          : "-",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [55, 65, 81] },
    });

    doc.save(`relatorio_visitas_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  // ═══════════════════════════════════════════════════════════════
  // LIMPAR FILTROS
  // ═══════════════════════════════════════════════════════════════
  const clearFilters = () => {
    setSearchTerm("");
    setFilterDate("");
    setFilterEmpresa("");
  };

  // ═══════════════════════════════════════════════════════════════
  // MODAL DE OBSERVAÇÃO
  // ═══════════════════════════════════════════════════════════════
  function handleOpenObservation(observacao) {
    setSelectedObservation(observacao || "Nenhuma observação cadastrada.");
    setIsModalOpen(true);
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="historico-container">
      {/* HEADER - Apenas título */}
      <header className="historico-header">
        <div className="historico-logo-wrapper">
          <div className="historico-title-group">
            <h1 className="historico-title">Histórico de Visitas</h1>
          </div>
        </div>
      </header>

      {/* STATS CARDS */}
      <section className="historico-stats">
        <div className="historico-stat-card">
          <div className="historico-stat-icon total">
            <FiUsers size={24} />
          </div>
          <div className="historico-stat-info">
            <span className="historico-stat-value">{stats.total} </span>
            <span className="historico-stat-label">Total de Visitas</span>
          </div>
        </div>

        <div className="historico-stat-card">
          <div className="historico-stat-icon hoje">
            <FiClock size={24} />
          </div>
          <div className="historico-stat-info">
            <span className="historico-stat-value">{stats.visitasHoje} </span>
            <span className="historico-stat-label">Visitas Hoje</span>
          </div>
        </div>

        <div className="historico-stat-card">
          <div className="historico-stat-icon obs">
            <FiMessageSquare size={24} />
          </div>
          <div className="historico-stat-info">
            <span className="historico-stat-value">{stats.comObservacao} </span>
            <span className="historico-stat-label">Com Observação</span>
          </div>
        </div>

        <div className="historico-stat-card">
          <div className="historico-stat-icon filtrado">
            <FiFilter size={24} />
          </div>
          <div className="historico-stat-info">
            <span className="historico-stat-value">
              {filteredHistoryData.length}{" "}
            </span>
            <span className="historico-stat-label">Resultados Filtrados</span>
          </div>
        </div>
      </section>

      {/* TOOLBAR - Filtros e Ações (Novo Layout) */}
      <section className="historico-filters">
        <div className="filters-left">
          {/* Campo de Busca */}
          <div className="search-wrapper">
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="btn-clear-search"
                onClick={() => setSearchTerm("")}
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          {/* Filtro por Empresa */}
          <div className="filter-item">
            <FiFilter size={16} />
            <select
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
            >
              <option value="">Todas as empresas</option>
              {empresasUnicas.map((empresa) => (
                <option key={empresa} value={empresa}>
                  {empresa}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Data */}
          <div className="filter-item">
            <FiCalendar size={16} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {/* Botão Limpar Filtros */}
          {(searchTerm || filterDate || filterEmpresa) && (
            <button className="btn-clear-filters" onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
        </div>

        <div className="filters-right">
          {/* Contador de Resultados */}
          <span className="results-count">
            {filteredHistoryData.length} registro
            {filteredHistoryData.length !== 1 ? "s" : ""}
          </span>

          {/* Botão Excel */}
          <button
            className="btn-export"
            onClick={() => exportToExcel(filteredHistoryData)}
            title="Exportar Excel"
          >
            <FiDownload size={16} />
            <span>Excel</span>
          </button>

          {/* Botão PDF */}
          <button
            className="btn-export pdf"
            onClick={() => exportToPDF(filteredHistoryData)}
            title="Exportar PDF"
          >
            <FiDownload size={16} />
            <span>PDF</span>
          </button>
        </div>
      </section>

      {/* TABELA */}
      <section className="historico-table-container">
        {filteredHistoryData.length === 0 ? (
          <div className="historico-empty">
            <FiUsers size={48} />
            <h3>Nenhuma visita encontrada</h3>
            <p>
              Não há visitas encerradas que correspondam aos filtros aplicados.
            </p>
          </div>
        ) : (
          <>
            <table className="historico-table">
              <thead>
                <tr>
                  <th className="th-center">#</th>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Empresa</th>
                  <th>Destino</th>
                  <th>Setor</th>
                  <th>Função</th>
                  <th className="th-center">Placa</th>
                  <th className="th-center">Tipo</th>
                  <th className="th-center">Cor</th>
                  <th>Responsável</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th className="th-center">Obs</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((visitor, index) => {
                  const globalIndex =
                    (currentPage - 1) * recordsPerPage + index;
                  return (
                    <tr key={visitor.id}>
                      <td data-label="#">
                        {filteredHistoryData.length - globalIndex}
                      </td>
                      <td data-label="Nome">
                        {visitor.nome || "Não informado"}
                      </td>
                      <td data-label="CPF">{visitor.cpf || "Não informado"}</td>
                      <td data-label="Empresa">
                        {visitor.empresa || "Não informado"}
                      </td>
                      <td
                        data-label="Destino"
                        style={{
                          fontWeight: "bold",
                          color:
                            visitor.empresa_destino === "DIME"
                              ? "green"
                              : visitor.empresa_destino === "GUEPAR"
                                ? "blue"
                                : "inherit",
                        }}
                      >
                        {visitor.empresa_destino || "-"}
                      </td>
                      <td data-label="Setor">
                        {visitor.setor || "Não informado"}
                      </td>
                      <td data-label="Função">{visitor.funcao || "-"}</td>
                      <td data-label="Placa" className="historico-vehicle">
                        {visitor.placa_veiculo || "-"}
                      </td>
                      <td data-label="Tipo" className="historico-vehicle">
                        {visitor.tipo_veiculo || "-"}
                      </td>
                      <td data-label="Cor" className="historico-vehicle">
                        {visitor.cor_veiculo || "-"}
                      </td>
                      <td data-label="Responsável">
                        {visitor.responsavel || "Não informado"}
                      </td>
                      <td data-label="Entrada">
                        {visitor.data_de_entrada
                          ? new Date(visitor.data_de_entrada).toLocaleString()
                          : new Date(visitor.criado_em).toLocaleString()}
                      </td>
                      <td data-label="Saída">
                        {visitor.data_de_saida
                          ? new Date(visitor.data_de_saida).toLocaleString()
                          : "Não informado"}
                      </td>
                      <td data-label="Observação" className="td-center">
                        <button
                          onClick={() =>
                            handleOpenObservation(visitor.observacao)
                          }
                          className="historico-obs-btn"
                          title="Ver observação"
                        >
                          <FiMessageSquare size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="historico-pagination">
                <div className="historico-pagination-info">
                  Mostrando {(currentPage - 1) * recordsPerPage + 1} -{" "}
                  {Math.min(
                    currentPage * recordsPerPage,
                    filteredHistoryData.length,
                  )}{" "}
                  de {filteredHistoryData.length} registros
                </div>

                <div className="historico-pagination-controls">
                  <button
                    className="historico-pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Página anterior"
                  >
                    <FiChevronLeft size={18} />
                  </button>

                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      className={`historico-pagination-btn ${
                        page === currentPage ? "active" : ""
                      } ${page === "..." ? "dots" : ""}`}
                      onClick={() => page !== "..." && handlePageChange(page)}
                      disabled={page === "..."}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    className="historico-pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Próxima página"
                  >
                    <FiChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div
          className="historico-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="historico-modal" onClick={(e) => e.stopPropagation()}>
            <div className="historico-modal-header">
              <h2>Observação</h2>
              <button
                className="historico-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="historico-modal-body">
              <p>{selectedObservation}</p>
            </div>
            <div className="historico-modal-footer">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-primary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}
