import logger from "../../utils/logger";
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
import { usePermissoes } from "../../hooks/usePermissoes";
import MonitoramentoRequisicoes from "../../components/MonitoramentoRequisicoes";
import DashboardAuth from "../../components/DashboardAuth";
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
  ArcElement,
);

export default function Dashboard() {
  const { user } = useAuth();
  const { temPermissao, loading: permissoesLoading } = usePermissoes();

  // Estado de autenticação do Dashboard
  const [isDashboardAuthenticated, setIsDashboardAuthenticated] =
    useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

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

  // Verificar se há token de Dashboard válido ao carregar
  useEffect(() => {
    const checkDashboardAuth = async () => {
      const token = localStorage.getItem("dashboardToken");
      const expiry = localStorage.getItem("dashboardTokenExpiry");

      // Se não tem token, não está autenticado
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      // Verifica se expirou localmente
      if (expiry && new Date(expiry) < new Date()) {
        localStorage.removeItem("dashboardToken");
        localStorage.removeItem("dashboardTokenExpiry");
        setCheckingAuth(false);
        return;
      }

      // Verifica no servidor se o token ainda é válido
      try {
        await api.get("/api/dashboard/verify", {
          headers: { "x-dashboard-token": token },
        });
        setIsDashboardAuthenticated(true);
      } catch (err) {
        // Token inválido, remove
        localStorage.removeItem("dashboardToken");
        localStorage.removeItem("dashboardTokenExpiry");
      } finally {
        setCheckingAuth(false);
      }
    };

    checkDashboardAuth();
  }, []);

  // Handler quando autenticação é bem-sucedida
  const handleDashboardAuthenticated = (token) => {
    setIsDashboardAuthenticated(true);
  };

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
      logger.error("Erro ao carregar estatísticas:", err);
      setError("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Só carrega estatísticas se estiver autenticado no Dashboard
    if (!isDashboardAuthenticated && !checkingAuth) return;
    if (checkingAuth) return;

    carregarEstatisticas();

    // Função para obter hora atual no timezone de Brasília
    const getHoraBrasilia = () => {
      const now = new Date();
      // Formata a hora no timezone de Brasília e converte para número
      const horaBrasilia = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "numeric",
        hour12: false,
      }).format(now);
      return parseInt(horaBrasilia, 10);
    };

    // Socket listeners para tempo real
    const socket = socketService.getSocket();

    // Verifica se o socket está pronto
    if (!socket) {
      console.warn("Dashboard: Socket não está pronto ainda.");
      return;
    }

    // Quando um novo visitante ENTRA (registra visita) - visitor:create
    const handleVisitorCreate = () => {
      console.log("📡 Dashboard: visitor:create recebido");
      setStats((prev) => ({
        ...prev,
        visitantesHoje: prev.visitantesHoje + 1,
      }));
      // Atualiza gráfico da hora atual (Brasília)
      const horaAtual = getHoraBrasilia();
      setVisitantesPorHora((prev) => {
        const newData = [...prev];
        const index = newData.findIndex((item) => item.hora === horaAtual);
        if (index !== -1) {
          newData[index] = {
            ...newData[index],
            quantidade: newData[index].quantidade + 1,
          };
        } else {
          // Se não existir, adiciona nova entrada
          newData.push({ hora: horaAtual, quantidade: 1 });
        }
        return newData;
      });
    };

    // Quando um novo CADASTRO é feito - visitante:created
    const handleVisitanteCreated = () => {
      console.log("📡 Dashboard: visitante:created recebido");
      setStats((prev) => ({
        ...prev,
        totalVisitantes: prev.totalVisitantes + 1,
        cadastrosHoje: prev.cadastrosHoje + 1,
      }));
      // Atualiza gráfico da hora atual (Brasília)
      const horaAtual = getHoraBrasilia();
      setCadastrosPorHora((prev) => {
        const newData = [...prev];
        const index = newData.findIndex((item) => item.hora === horaAtual);
        if (index !== -1) {
          newData[index] = {
            ...newData[index],
            quantidade: newData[index].quantidade + 1,
          };
        } else {
          // Se não existir, adiciona nova entrada
          newData.push({ hora: horaAtual, quantidade: 1 });
        }
        return newData;
      });
    };

    // Quando um agendamento é criado - agendamento:create
    const handleAgendamentoCreate = () => {
      console.log("📡 Dashboard: agendamento:create recebido");
      setStats((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos + 1,
      }));
    };

    // Quando um ticket é criado - ticket:create
    const handleTicketCreate = () => {
      console.log("📡 Dashboard: ticket:create recebido");
      setStats((prev) => ({
        ...prev,
        tickets: prev.tickets + 1,
      }));
    };

    // Quando ticket é resolvido/atualizado - ticket:update
    const handleTicketUpdate = (data) => {
      console.log("📡 Dashboard: ticket:update recebido", data);
      if (data?.status === "resolvido") {
        setStats((prev) => ({
          ...prev,
          tickets: Math.max(0, prev.tickets - 1),
        }));
      }
    };

    // Registra os listeners com os eventos CORRETOS do backend
    socket.on("visitor:create", handleVisitorCreate);
    socket.on("visitante:created", handleVisitanteCreated);
    socket.on("agendamento:create", handleAgendamentoCreate);
    socket.on("ticket:create", handleTicketCreate);
    socket.on("ticket:update", handleTicketUpdate);

    console.log("✅ Dashboard: Socket listeners registrados para tempo real");

    return () => {
      socket.off("visitor:create", handleVisitorCreate);
      socket.off("visitante:created", handleVisitanteCreated);
      socket.off("agendamento:create", handleAgendamentoCreate);
      socket.off("ticket:create", handleTicketCreate);
      socket.off("ticket:update", handleTicketUpdate);
    };
  }, [carregarEstatisticas, isDashboardAuthenticated, checkingAuth]);

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

  // Verifica permissão via RBAC (temPermissao já considera ADMIN)
  if (permissoesLoading || checkingAuth) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!temPermissao("dashboard_visualizar")) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar o dashboard.</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado no Dashboard, mostra tela de senha
  // NOTA: Em desenvolvimento sem DASHBOARD_PASSWORD_HASH configurado,
  // a autenticação é ignorada no backend
  if (!isDashboardAuthenticated) {
    return <DashboardAuth onAuthenticated={handleDashboardAuthenticated} />;
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

      {/* Monitoramento de Requisições */}
      <MonitoramentoRequisicoes />
    </div>
  );
}
