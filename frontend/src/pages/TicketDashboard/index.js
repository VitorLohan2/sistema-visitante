// src/pages/TicketDashboard/index.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useHistory } from "react-router-dom";
import { FiPlusCircle } from "react-icons/fi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import * as socketService from "../../services/socketService";
import { setCache, getCache } from "../../services/cacheService";

import "./styles.css";
import excel from "../../assets/xlss.png";

const TicketDashboard = () => {
  // ✅ Inicializa com cache se existir
  const [tickets, setTickets] = useState(() => getCache("tickets") || []);
  const [filteredTickets, setFilteredTickets] = useState(
    () => getCache("tickets") || []
  );
  const [userData, setUserData] = useState({ nome: "", setor_id: "" });
  const [filterDate, setFilterDate] = useState("");
  const history = useHistory();
  const { user } = useAuth();

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

    // ✅ LISTENER: Novo ticket criado
    const unsubTicketCreate = socketService.on("ticket:create", (ticket) => {
      console.log("📥 Socket Tickets: Novo ticket", ticket.id);
      setTickets((prev) => {
        if (prev.find((t) => t.id === ticket.id)) {
          return prev;
        }
        const novosTickets = [ticket, ...prev].sort(
          (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)
        );
        setCache("tickets", novosTickets);
        return novosTickets;
      });
    });

    // ✅ LISTENER: Ticket atualizado
    const unsubTicketUpdate = socketService.on("ticket:update", (dados) => {
      console.log("📝 Socket Tickets: Atualizado", dados.id);
      setTickets((prev) => {
        const novosTickets = prev
          .map((t) => (t.id === dados.id ? { ...t, ...dados } : t))
          .sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
        setCache("tickets", novosTickets);
        return novosTickets;
      });
    });

    // ✅ LISTENER: Ticket visualizado
    const unsubTicketViewed = socketService.on("ticket:viewed", (dados) => {
      console.log("👁️ Socket Tickets: Visualizado", dados.id);
      setTickets((prev) => {
        const novosTickets = prev.map((t) =>
          t.id === dados.id ? { ...t, visto: true } : t
        );
        setCache("tickets", novosTickets);
        return novosTickets;
      });
    });

    // ✅ LISTENER: Todos tickets visualizados
    const unsubAllViewed = socketService.on("ticket:all_viewed", () => {
      console.log("👁️ Socket Tickets: Todos visualizados");
      setTickets((prev) => {
        const novosTickets = prev.map((t) => ({ ...t, visto: true }));
        setCache("tickets", novosTickets);
        return novosTickets;
      });
    });

    socketListenersRef.current.push(
      unsubTicketCreate,
      unsubTicketUpdate,
      unsubTicketViewed,
      unsubAllViewed
    );

    console.log("🔌 Socket Tickets: Listeners configurados");
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO INICIAL - Com cache
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const ongId = user?.id || localStorage.getItem("ongId");

    if (!ongId) {
      history.push("/");
      return;
    }

    const fetchTickets = async () => {
      try {
        // ✅ Se já tem cache, usa imediatamente
        const cachedTickets = getCache("tickets");
        if (
          cachedTickets &&
          cachedTickets.length > 0 &&
          !isDataLoadedRef.current
        ) {
          console.log(
            "📦 Tickets: Usando cache",
            cachedTickets.length,
            "registros"
          );
          setTickets(cachedTickets);
          setFilteredTickets(cachedTickets);
        }

        const userRes = await api.get(`/usuarios/${ongId}`);
        setUserData({
          nome: userRes.data.name,
          setor_id: userRes.data.setor_id,
        });

        const response = await api.get("/tickets");

        const sorted = response.data.sort(
          (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)
        );

        // ✅ Atualiza estado e cache
        setTickets(sorted);
        setFilteredTickets(sorted);
        setCache("tickets", sorted);
        isDataLoadedRef.current = true;

        console.log("✅ Tickets: Carregado da API", sorted.length, "registros");
      } catch (error) {
        console.error("Erro ao buscar tickets:", error);
        if (!getCache("tickets")) {
          alert("Erro ao carregar tickets. Verifique sua conexão.");
        }
      }
    };

    fetchTickets();

    // ✅ Configura Socket listeners (substitui setInterval)
    setupSocketListeners();

    // Cleanup
    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
  }, [history, user, setupSocketListeners]);

  useEffect(() => {
    if (!filterDate) {
      setFilteredTickets(tickets);
      return;
    }

    const filtered = tickets.filter((ticket) => {
      const ticketDate = new Date(ticket.data_criacao)
        .toLocaleDateString("pt-BR")
        .split("/")
        .reverse()
        .join("-");
      return ticketDate === filterDate;
    });

    setFilteredTickets(filtered);
  }, [filterDate, tickets]);

  const handleChangeStatus = async (ticketId, newStatus) => {
    if (!ticketId || !newStatus) {
      alert("Dados inválidos para atualização");
      return;
    }

    try {
      const response = await api.put(`/tickets/${Number(ticketId)}`, {
        status: newStatus,
      });
      if (response.status === 200) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
        setFilteredTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error("Erro completo:", err);
      alert(`Erro: ${err.response?.data?.message || "Falha na atualização"}`);
    }
  };

  const statusLabels = ["Aberto", "Em andamento", "Resolvido"];

  const handleNavigateToCreateTicket = () => {
    history.push("/tickets");
  };

  const exportToExcel = () => {
    const dataToExport = filteredTickets.map((ticket) => ({
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
    saveAs(blob, `tickets_${filterDate || "todos"}.xlsx`);
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="page-title-wrapper">
          <div className="page-title-group">
            <h1 className="page-title">Ticket Dashboard</h1>
          </div>
        </div>
      </header>

      <div className="sub-lista">
        <div className="linha-esquerda-buttons">
          <button
            onClick={handleNavigateToCreateTicket}
            className="ticket-button"
          >
            <FiPlusCircle size={20} className="icone" />
            <span>Criar Ticket</span>
          </button>
          <button onClick={exportToExcel} className="excel-button">
            <img src={excel} alt="Excel" className="excel-icon" />
            Gerar Relatório
          </button>
        </div>

        <div className="date-filter">
          <label>
            Filtrar por data:
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="kanban-board">
        {statusLabels.map((status) => (
          <div className="kanban-column" key={status}>
            <div className="header-wrapper">
              <h2>{status}</h2>
            </div>
            <div className="ticket-list">
              {filteredTickets
                .filter((ticket) => ticket.status === status)
                .map((ticket) => (
                  <div
                    className={`ticket-card ${status.toLowerCase()}`}
                    key={ticket.id}
                  >
                    <strong>Criado por:</strong>
                    <p className="destaque-usuario">{ticket.nome_usuario}</p>

                    <strong>Setor:</strong>
                    <p className="destaque-usuario">{ticket.setor_usuario}</p>

                    <strong>Funcionário:</strong>
                    <p>{ticket.funcionario}</p>

                    <strong>Motivo:</strong>
                    <p>{ticket.motivo}</p>

                    <strong>Descrição:</strong>
                    <p>{ticket.descricao}</p>

                    <strong>Setor (Verificação):</strong>
                    <p className="destaque-usuario">
                      {ticket.setor_responsavel}
                    </p>

                    <strong>Data:</strong>
                    <p>
                      {new Date(ticket.data_criacao).toLocaleString("pt-BR")}
                    </p>

                    {userData.setor_id === 4 && (
                      <select
                        value={ticket.status}
                        onChange={(e) =>
                          handleChangeStatus(ticket.id, e.target.value)
                        }
                        className="status-select"
                        disabled={ticket.status === "Resolvido"}
                      >
                        {statusLabels.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketDashboard;
