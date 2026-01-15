import React, { useState, useEffect, useCallback } from "react";
import {
  FiUsers,
  FiClipboard,
  FiMessageSquare,
  FiCalendar,
  FiTrendingUp,
} from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import api from "../../services/api";
import { getCache, setCache } from "../../services/cacheService";
import socketService from "../../services/socketService";
import { useAuth } from "../../hooks/useAuth";
import "./styles.css";

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalVisitantes: 0,
    visitantesHoje: 0,
    cadastrosHoje: 0,
    agendamentos: 0,
    tickets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dados para gráficos
  const [visitantesPorHora, setVisitantesPorHora] = useState([]);
  const [cadastrosPorHora, setCadastrosPorHora] = useState([]);

  const carregarEstatisticas = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Verifica cache primeiro para carregamento instantâneo
      const cachedStats = getCache("dashboardStats");
      if (cachedStats) {
        setStats(cachedStats);
        setLoading(false);
      }

      const cachedVisitantesPorHora = getCache("visitantesPorHora");
      if (cachedVisitantesPorHora) {
        setVisitantesPorHora(cachedVisitantesPorHora);
      }

      const cachedCadastrosPorHora = getCache("cadastrosPorHora");
      if (cachedCadastrosPorHora) {
        setCadastrosPorHora(cachedCadastrosPorHora);
      }

      // Busca todas estatísticas de uma única rota
      const response = await api.get("/dashboard/estatisticas-hoje");
      const data = response.data;

      const newStats = {
        totalVisitantes: data.totalVisitantes || 0,
        visitantesHoje: data.visitantesHoje || 0,
        cadastrosHoje: data.cadastrosHoje || 0,
        agendamentos: data.agendamentos || 0,
        tickets: data.tickets || 0,
      };

      // Salva no cache
      setCache("dashboardStats", newStats);
      setStats(newStats);

      // Dados dos gráficos
      if (data.visitantesPorHora) {
        setCache("visitantesPorHora", data.visitantesPorHora);
        setVisitantesPorHora(data.visitantesPorHora);
      }

      if (data.cadastrosPorHora) {
        setCache("cadastrosPorHora", data.cadastrosPorHora);
        setCadastrosPorHora(data.cadastrosPorHora);
      }
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
      setError("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarEstatisticas();

    // Socket listeners para tempo real
    const socket = socketService.getSocket();

    // Quando um novo visitante entra
    const handleNovoVisitante = () => {
      setStats((prev) => ({
        ...prev,
        visitantesHoje: prev.visitantesHoje + 1,
      }));
      // Atualiza gráfico da hora atual
      const horaAtual = new Date().getHours();
      setVisitantesPorHora((prev) => {
        const newData = [...prev];
        const index = newData.findIndex((item) => item.hora === horaAtual);
        if (index !== -1) {
          newData[index] = {
            ...newData[index],
            quantidade: newData[index].quantidade + 1,
          };
        }
        return newData;
      });
    };

    // Quando um novo cadastro é feito
    const handleNovoCadastro = () => {
      setStats((prev) => ({
        ...prev,
        totalVisitantes: prev.totalVisitantes + 1,
        cadastrosHoje: prev.cadastrosHoje + 1,
      }));
      // Atualiza gráfico da hora atual
      const horaAtual = new Date().getHours();
      setCadastrosPorHora((prev) => {
        const newData = [...prev];
        const index = newData.findIndex((item) => item.hora === horaAtual);
        if (index !== -1) {
          newData[index] = {
            ...newData[index],
            quantidade: newData[index].quantidade + 1,
          };
        }
        return newData;
      });
    };

    // Quando um agendamento é criado
    const handleNovoAgendamento = () => {
      setStats((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos + 1,
      }));
    };

    // Quando um ticket é criado
    const handleNovoTicket = () => {
      setStats((prev) => ({
        ...prev,
        tickets: prev.tickets + 1,
      }));
    };

    // Quando ticket é resolvido
    const handleTicketResolvido = () => {
      setStats((prev) => ({
        ...prev,
        tickets: Math.max(0, prev.tickets - 1),
      }));
    };

    socket.on("visitante:entrada", handleNovoVisitante);
    socket.on("visitante:novo", handleNovoCadastro);
    socket.on("agendamento:novo", handleNovoAgendamento);
    socket.on("ticket:novo", handleNovoTicket);
    socket.on("ticket:resolvido", handleTicketResolvido);

    return () => {
      socket.off("visitante:entrada", handleNovoVisitante);
      socket.off("visitante:novo", handleNovoCadastro);
      socket.off("agendamento:novo", handleNovoAgendamento);
      socket.off("ticket:novo", handleNovoTicket);
      socket.off("ticket:resolvido", handleTicketResolvido);
    };
  }, [carregarEstatisticas]);

  // Gerar labels de horas (6h às 23h) - estendido para incluir 23h
  const horasLabel = Array.from({ length: 18 }, (_, i) => `${i + 6}h`);

  // Preparar dados do gráfico de visitantes
  const visitantesChartData = {
    labels: horasLabel,
    datasets: [
      {
        label: "Visitantes",
        data: horasLabel.map((_, i) => {
          const hora = i + 6;
          const found = visitantesPorHora.find((item) => item.hora === hora);
          return found ? found.quantidade : 0;
        }),
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderColor: "#10b981",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  // Preparar dados do gráfico de cadastros
  const cadastrosChartData = {
    labels: horasLabel,
    datasets: [
      {
        label: "Cadastros",
        data: horasLabel.map((_, i) => {
          const hora = i + 6;
          const found = cadastrosPorHora.find((item) => item.hora === hora);
          return found ? found.quantidade : 0;
        }),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1f2937",
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6b7280",
          font: { size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#f3f4f6",
        },
        ticks: {
          color: "#6b7280",
          font: { size: 11 },
          stepSize: 1,
        },
      },
    },
  };

  if (!user?.isAdmin) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">
          <h2>Acesso Negado</h2>
          <p>Apenas administradores podem acessar o dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="db-header-content">
          <h1>DASHBOARD ADMINISTRATIVO</h1>
          <p className="header-subtitle">
            Visão geral do sistema em tempo real
          </p>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && <div className="db-error-message">{error}</div>}

      {/* Grid de estatísticas */}
      <div className="stats-grid">
        {/* Card: Total de Visitantes */}
        <div className="stat-card">
          <div className="stat-icon visitors">
            <FiUsers size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Visitantes</span>
            <span className="stat-value">{stats.totalVisitantes}</span>
          </div>
        </div>

        {/* Card: Visitantes Hoje */}
        <div className="stat-card">
          <div className="stat-icon today">
            <FiTrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Visitantes Hoje</span>
            <span className="stat-value">{stats.visitantesHoje}</span>
          </div>
        </div>

        {/* Card: Cadastros Hoje */}
        <div className="stat-card">
          <div className="stat-icon cadastros">
            <FiClipboard size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Cadastros Hoje</span>
            <span className="stat-value">{stats.cadastrosHoje}</span>
          </div>
        </div>

        {/* Card: Agendamentos */}
        <div className="stat-card">
          <div className="stat-icon schedules">
            <FiCalendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Agendamentos</span>
            <span className="stat-value">{stats.agendamentos}</span>
          </div>
        </div>

        {/* Card: Tickets */}
        <div className="stat-card">
          <div className="stat-icon support">
            <FiMessageSquare size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Tickets Abertos</span>
            <span className="stat-value">{stats.tickets}</span>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Gráfico de Visitantes do Dia */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Visitantes do Dia</h3>
            <span className="chart-subtitle">Entradas por hora</span>
          </div>
          <div className="chart-container">
            <Bar data={visitantesChartData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico de Cadastros do Dia */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Cadastros do Dia</h3>
            <span className="chart-subtitle">Novos cadastros por hora</span>
          </div>
          <div className="chart-container">
            <Line data={cadastrosChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
