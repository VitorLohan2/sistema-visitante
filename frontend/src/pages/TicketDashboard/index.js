// src/pages/TicketDashboard/index.js
import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiArrowLeft, FiPlusCircle } from "react-icons/fi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import Loading from "../../components/Loading";

import "./styles.css";
import logoImg from "../../assets/logo.svg";
import excel from "../../assets/xlss.png";

const TicketDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [userData, setUserData] = useState({ nome: "", setor_id: "" });
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const history = useHistory();
  const { user } = useAuth();

  useEffect(() => {
    const ongId = user?.id || localStorage.getItem("ongId");

    if (!ongId) {
      history.push("/"); // Proteção de rota
      return;
    }

    const simulateProgress = () => {
      let value = 0;
      const interval = setInterval(() => {
        value += 10;
        setProgress(value);
        if (value >= 100) clearInterval(interval);
      }, 100);
    };

    const fetchTickets = async () => {
      try {
        simulateProgress();

        const userRes = await api.get(`/usuarios/${ongId}`);
        setUserData({
          nome: userRes.data.name,
          setor_id: userRes.data.setor_id,
        });

        const response = await api.get("/tickets"); // Header Authorization já enviado pelo interceptor

        const sorted = response.data.sort(
          (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)
        );

        setTickets(sorted);
        setFilteredTickets(sorted);
      } catch (error) {
        console.error("Erro ao buscar tickets:", error);
        alert("Erro ao carregar tickets. Verifique sua conexão.");
      } finally {
        setTimeout(() => {
          setLoading(false);
          setProgress(100);
        }, 1000);
      }
    };

    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, [history, user]);

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

  if (loading)
    return <Loading progress={progress} message="Carregando Tickets..." />;

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="page-title-wrapper">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {userData.nome}</span>
        </div>
        <Link className="back-link" to="/listagem-visitante">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
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
