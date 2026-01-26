/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TICKET DASHBOARD - Gerenciamento de Tickets de Suporte
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dados: Carregados do cache (useDataLoader é responsável pelo carregamento inicial)
 * Atualização: Via TicketContext que gerencia Socket.IO em tempo real
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useHistory } from "react-router-dom";
import {
  FiPlusCircle,
  FiX,
  FiUser,
  FiUsers,
  FiFileText,
  FiFilter,
  FiDownload,
  FiMoreVertical,
  FiCalendar,
  FiAlertCircle,
  FiTrendingUp,
  FiClock,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../services/api";
import { getCache, setCache } from "../../services/cacheService";
import { useAuth } from "../../hooks/useAuth";
import { usePermissoes } from "../../hooks/usePermissoes";
import { useTickets } from "../../contexts/TicketContext";
import Loading from "../../components/Loading";

import "./styles.css";

const TicketDashboard = () => {
  // Estados principais - Usando contexto para sincronização
  const {
    tickets,
    setTickets,
    fetchTickets: fetchTicketsContext,
  } = useTickets();
  const [filteredTickets, setFilteredTickets] = useState([]);

  // ═══════════════════════════════════════════════════════════════
  // DADOS DO CACHE (carregados pelo useDataLoader)
  // ═══════════════════════════════════════════════════════════════
  const [userData, setUserData] = useState(() => {
    const cached = getCache("userData");
    return cached
      ? {
          nome: cached.name || "",
          setor: cached.setor || cached.setor_nome || "",
          setor_id: cached.setor_id || null,
        }
      : { nome: "", setor: "", setor_id: null };
  });

  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [isLoading, setIsLoading] = useState(true);

  // Estados do Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    funcionario: "",
    motivo: "",
    descricao: "",
    setorResponsavel: "Segurança",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag and Drop
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Menu de opções
  const [activeMenu, setActiveMenu] = useState(null);

  const history = useHistory();
  const { user } = useAuth();
  const { papeis, temPermissao, loading: permissoesLoading } = usePermissoes();

  // Verificar se é da Segurança via papéis
  const isSeguranca =
    papeis.includes("SEGURANÇA") || papeis.includes("SEGURANCA");
  const podeEditarTicket = temPermissao("ticket_editar") || isSeguranca;

  // Refs para controle
  const isDataLoadedRef = useRef(false);

  // Status do Kanban - Novo design com cores pastel
  const statusConfig = [
    {
      key: "Aberto",
      label: "A Fazer",
      headerBg: "#FDE68A",
      textColor: "#92400E",
      columnBg: "#FFFBEB",
    },
    {
      key: "Em andamento",
      label: "Em Progresso",
      headerBg: "#FCA5A5",
      textColor: "#991B1B",
      columnBg: "#FEF2F2",
    },
    {
      key: "Resolvido",
      label: "Concluído",
      headerBg: "#6EE7B7",
      textColor: "#065F46",
      columnBg: "#ECFDF5",
    },
  ];

  // Cores das tags de motivo
  const motivoColors = {
    "Saída antecipada": { bg: "#FEE2E2", text: "#991B1B", label: "urgente" },
    "Saída com objeto": { bg: "#E0E7FF", text: "#3730A3", label: "objeto" },
    Outros: { bg: "#F3F4F6", text: "#374151", label: "outros" },
  };

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO DE DADOS - Primeiro do cache, depois API se necessário
  // ═══════════════════════════════════════════════════════════════
  const fetchTickets = useCallback(
    async (forceRefresh = false) => {
      const ongId = user?.id || localStorage.getItem("ongId");
      if (!ongId) return;

      setIsLoading(true);

      try {
        // ✅ Primeiro verifica se já tem userData no cache
        const cachedUserData = getCache("userData");
        if (cachedUserData && !forceRefresh) {
          console.log("📦 Usando userData do cache");
          setUserData({
            nome: cachedUserData.name || "",
            setor: cachedUserData.setor || cachedUserData.setor_nome || "",
            setor_id: cachedUserData.setor_id || null,
          });
        } else {
          // Se não tem cache ou forceRefresh, busca da API
          const userRes = await api.get(`/usuarios/${ongId}`);
          setUserData({
            nome: userRes.data.name,
            setor: userRes.data.setor || userRes.data.setor_nome || "",
            setor_id: userRes.data.setor_id,
          });
          // Atualiza o cache
          setCache("userData", userRes.data);
        }

        // Usar o fetch do contexto para manter sincronizado
        await fetchTicketsContext(forceRefresh);
        isDataLoadedRef.current = true;
      } catch (error) {
        console.error("Erro ao buscar tickets:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, fetchTicketsContext],
  );

  // ═══════════════════════════════════════════════════════════════
  // EFEITOS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const ongId = user?.id || localStorage.getItem("ongId");
    if (!ongId) {
      history.push("/");
      return;
    }

    fetchTickets();
  }, [history, user, fetchTickets]);

  // Filtros
  useEffect(() => {
    let filtered = [...tickets];

    if (filterDate) {
      filtered = filtered.filter((ticket) => {
        const ticketDate = new Date(ticket.data_criacao)
          .toLocaleDateString("pt-BR")
          .split("/")
          .reverse()
          .join("-");
        return ticketDate === filterDate;
      });
    }

    if (filterStatus !== "todos") {
      filtered = filtered.filter((ticket) => ticket.status === filterStatus);
    }

    setFilteredTickets(filtered);
  }, [filterDate, filterStatus, tickets]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // DRAG AND DROP HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleDragStart = (e, ticket) => {
    if (!podeEditarTicket) return;
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = "move";
    e.target.classList.add("dragging");
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove("dragging");
    setDraggedTicket(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTicket || !podeEditarTicket) return;
    if (draggedTicket.status === newStatus) return;

    await handleChangeStatus(draggedTicket.id, newStatus);
    setDraggedTicket(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleChangeStatus = async (ticketId, newStatus) => {
    if (!ticketId || !newStatus) return;

    try {
      const response = await api.put(`/tickets/${Number(ticketId)}`, {
        status: newStatus,
      });

      if (response.status === 200) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status: newStatus } : t,
          ),
        );
      }
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      const errorMsg = err.response?.data?.error || "Erro ao atualizar status";
      alert(errorMsg);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();

    if (!formData.funcionario || !formData.motivo || !formData.descricao) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/tickets", {
        ...formData,
        nomeUsuario: userData.nome,
        setorUsuario: userData.setor,
      });

      setShowModal(false);
      setFormData({
        funcionario: "",
        motivo: "",
        descricao: "",
        setorResponsavel: "Segurança",
      });

      alert(`✅ Ticket #${response.data.id} criado com sucesso!`);
    } catch (err) {
      console.error("Erro ao criar ticket:", err);
      alert("❌ Erro ao criar ticket. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredTickets.map((ticket) => ({
      ID: ticket.id,
      "Criado por": ticket.nome_usuario,
      Setor: ticket.setor_usuario,
      Funcionário: ticket.funcionario,
      Motivo: ticket.motivo,
      Descrição: ticket.descricao,
      "Setor Responsável": ticket.setor_responsavel,
      Status: ticket.status,
      Data: new Date(ticket.data_criacao).toLocaleString("pt-BR"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(
      blob,
      `tickets_${filterDate || "todos"}_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.xlsx`,
    );
  };

  const clearFilters = () => {
    setFilterDate("");
    setFilterStatus("todos");
  };

  const toggleMenu = (e, ticketId) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === ticketId ? null : ticketId);
  };

  // Gerar iniciais do usuário
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Gerar cor do avatar baseado no nome
  const getAvatarColor = (name) => {
    if (!name) return "#6B7280";
    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#84CC16",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Estatísticas
  const stats = {
    total: tickets.length,
    abertos: tickets.filter((t) => t.status === "Aberto").length,
    emAndamento: tickets.filter((t) => t.status === "Em andamento").length,
    resolvidos: tickets.filter((t) => t.status === "Resolvido").length,
  };

  // Obter usuários únicos
  const uniqueUsers = [
    ...new Set(tickets.map((t) => t.nome_usuario).filter(Boolean)),
  ];

  // Loading inicial dos dados
  if (isLoading && tickets.length === 0) {
    return <Loading variant="page" message="Carregando tickets..." />;
  }

  return (
    <div className="ticket-dashboard">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <header className="ticket-header">
        <div className="ticket-header-content">
          <div className="header-left">
            <h1>
              <FiFileText className="header-icon" />
              Central de Tickets
            </h1>
            <p className="header-subtitle">
              Gerencie e acompanhe todas as solicitações
            </p>
          </div>

          <div className="header-right">
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <FiPlusCircle />
              <span>Novo Ticket</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MINI DASHBOARD - STATS CARDS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="stats-dashboard">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total de Tarefas</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-icon-wrapper">
            <FiTrendingUp />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Em Progresso</span>
            <span className="stat-value">{stats.emAndamento}</span>
          </div>
          <div className="stat-icon-wrapper yellow">
            <FiClock />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Membros da Equipe</span>
            <span className="stat-value">{uniqueUsers.length}</span>
          </div>
          <div className="stat-icon-wrapper">
            <FiUsers />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FILTROS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="filters-bar">
        <div className="filters-left">
          <div className="filter-item">
            <FiFilter />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="Aberto">A Fazer</option>
              <option value="Em andamento">Em Progresso</option>
              <option value="Resolvido">Concluído</option>
            </select>
          </div>

          <div className="filter-item">
            <FiCalendar />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {(filterDate || filterStatus !== "todos") && (
            <button className="btn-clear" onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
        </div>

        <div className="filters-right">
          <span className="results-count">
            {filteredTickets.length} ticket
            {filteredTickets.length !== 1 ? "s" : ""}
          </span>

          <button className="btn-export" onClick={exportToExcel}>
            <FiDownload />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* KANBAN BOARD - NOVO DESIGN */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="kanban-board">
        {statusConfig.map((status) => {
          const columnTickets = filteredTickets.filter(
            (t) => t.status === status.key,
          );
          const isDragOver = dragOverColumn === status.key;

          return (
            <div
              className={`kanban-column ${isDragOver ? "drag-over" : ""}`}
              key={status.key}
              onDragOver={(e) => handleDragOver(e, status.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status.key)}
              style={{ backgroundColor: status.columnBg }}
            >
              <div
                className="column-header"
                style={{ backgroundColor: status.headerBg }}
              >
                <span
                  className="column-title"
                  style={{ color: status.textColor }}
                >
                  {status.label}
                </span>
                <span
                  className="column-count"
                  style={{
                    backgroundColor: status.textColor,
                    color: "#fff",
                  }}
                >
                  {columnTickets.length}
                </span>
              </div>

              <div className="column-content">
                {columnTickets.length === 0 ? (
                  <div className="empty-column">
                    <p>Nenhum ticket</p>
                    {podeEditarTicket && draggedTicket && (
                      <p className="drop-hint">Solte aqui</p>
                    )}
                  </div>
                ) : (
                  columnTickets.map((ticket) => (
                    <div
                      className={`ticket-card ${podeEditarTicket ? "draggable" : ""}`}
                      key={ticket.id}
                      draggable={podeEditarTicket}
                      onDragStart={(e) => handleDragStart(e, ticket)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Header do Card */}
                      <div className="card-header">
                        <h3 className="card-title">
                          #{ticket.id} - {ticket.funcionario}
                        </h3>
                        {podeEditarTicket && (
                          <button
                            className="card-menu-btn"
                            onClick={(e) => toggleMenu(e, ticket.id)}
                          >
                            <FiMoreVertical />
                          </button>
                        )}

                        {/* Menu dropdown */}
                        {activeMenu === ticket.id && podeEditarTicket && (
                          <div className="card-menu">
                            {statusConfig
                              .filter((s) => s.key !== ticket.status)
                              .map((s) => (
                                <button
                                  key={s.key}
                                  onClick={() =>
                                    handleChangeStatus(ticket.id, s.key)
                                  }
                                >
                                  Mover para {s.label}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Descrição */}
                      <p className="card-description">{ticket.descricao}</p>

                      {/* Tags */}
                      <div className="card-tags">
                        <span
                          className="tag"
                          style={{
                            backgroundColor:
                              motivoColors[ticket.motivo]?.bg || "#F3F4F6",
                            color:
                              motivoColors[ticket.motivo]?.text || "#374151",
                          }}
                        >
                          {motivoColors[ticket.motivo]?.label || ticket.motivo}
                        </span>
                        <span className="tag tag-setor">
                          {ticket.setor_responsavel}
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="card-footer">
                        <span className="card-date">
                          <FiCalendar />
                          {new Date(ticket.data_criacao).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>

                        <div className="card-avatars">
                          <div
                            className="avatar"
                            title={ticket.nome_usuario}
                            style={{
                              backgroundColor: getAvatarColor(
                                ticket.nome_usuario,
                              ),
                            }}
                          >
                            {getInitials(ticket.nome_usuario)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - CRIAR TICKET */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FiPlusCircle />
                Novo Ticket
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <FiUser />
                    Usuário
                  </label>
                  <input type="text" value={userData.nome} disabled />
                </div>

                <div className="form-group">
                  <label>
                    <FiUsers />
                    Setor
                  </label>
                  <input type="text" value={userData.setor} disabled />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="funcionario">
                  <FiUser />
                  Funcionário Envolvido *
                </label>
                <input
                  type="text"
                  id="funcionario"
                  name="funcionario"
                  value={formData.funcionario}
                  onChange={handleFormChange}
                  placeholder="Nome do funcionário envolvido"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="motivo">
                    <FiAlertCircle />
                    Motivo *
                  </label>
                  <select
                    id="motivo"
                    name="motivo"
                    value={formData.motivo}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Selecione um motivo</option>
                    <option value="Saída antecipada">Saída antecipada</option>
                    <option value="Saída com objeto">Saída com objeto</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="setorResponsavel">
                    <FiUsers />
                    Setor Responsável *
                  </label>
                  <select
                    id="setorResponsavel"
                    name="setorResponsavel"
                    value={formData.setorResponsavel}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="Segurança">Segurança</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="descricao">
                  <FiFileText />
                  Descrição *
                </label>
                <textarea
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleFormChange}
                  placeholder="Descreva o ocorrido com detalhes..."
                  rows={5}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="btn-spinner"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <FiPlusCircle />
                      Criar Ticket
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDashboard;
