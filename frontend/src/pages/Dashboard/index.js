import React, { useState, useEffect, useRef } from "react";
import {
  FiUsers,
  FiClipboard,
  FiMessageSquare,
  FiCalendar,
  FiTrendingUp,
  FiRefreshCw,
} from "react-icons/fi";
import api from "../../services/api";
import { getCache, setCache } from "../../services/cacheService";
import { useAuth } from "../../hooks/useAuth";
import "./styles.css";

// TTL do cache de dashboard: 2 minutos
const DASHBOARD_CACHE_TTL = 2 * 60 * 1000;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalVisitantes: 0,
    visitantesHoje: 0,
    agendamentos: 0,
    tickets: 0,
    funcionarios: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const cacheTimestampRef = useRef(null);

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async (forceReload = false) => {
    try {
      setLoading(true);
      setError("");

      // ✅ Verifica cache com TTL (a menos que seja reload forçado)
      if (!forceReload) {
        const cachedStats = getCache("dashboardStats");
        const cacheTimestamp = sessionStorage.getItem(
          "cache_dashboard_timestamp"
        );

        if (cachedStats && cacheTimestamp) {
          const cacheAge = Date.now() - parseInt(cacheTimestamp);
          if (cacheAge < DASHBOARD_CACHE_TTL) {
            console.log(
              "📦 Usando estatísticas do cache (válido por mais " +
                Math.round((DASHBOARD_CACHE_TTL - cacheAge) / 1000) +
                "s)"
            );
            setStats(cachedStats);
            setLastUpdate(new Date(parseInt(cacheTimestamp)));
            setLoading(false);
            return;
          }
        }
      }

      // Se não tem cache válido ou é reload forçado, busca da API
      const [visitantes, funcionarios, agendamentos, tickets] =
        await Promise.all([
          api.get("/cadastro-visitantes").catch(() => ({ data: { total: 0 } })),
          api.get("/funcionarios").catch(() => ({ data: { total: 0 } })),
          api.get("/agendamentos").catch(() => ({ data: { total: 0 } })),
          api.get("/tickets").catch(() => ({ data: { total: 0 } })),
        ]);

      const newStats = {
        totalVisitantes: visitantes.data?.total || 0,
        visitantesHoje: visitantes.data?.hoje || 0,
        agendamentos: agendamentos.data?.total || 0,
        tickets: tickets.data?.total || 0,
        funcionarios: funcionarios.data?.total || 0,
      };

      // Salva no cache com timestamp
      setCache("dashboardStats", newStats);
      sessionStorage.setItem(
        "cache_dashboard_timestamp",
        Date.now().toString()
      );

      setStats(newStats);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
      setError("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
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
        <div className="header-content">
          <h1>DASHBOARD ADMINISTRATIVO</h1>
        </div>
        <button
          className="refresh-btn"
          onClick={() => carregarEstatisticas(true)}
          disabled={loading}
        >
          <FiRefreshCw size={20} className={loading ? "rotating" : ""} />
          Atualizar
        </button>
      </div>

      {/* Mensagem de erro */}
      {error && <div className="error-message">{error}</div>}

      {/* Grid de estatísticas */}
      <div className="stats-grid">
        {/* Card: Total de Visitantes */}
        <div className="stat-card">
          <div className="stat-icon visitors">
            <FiUsers size={32} />
          </div>
          <div className="stat-content">
            <h3>Visitantes</h3>
            <div className="stat-value">{stats.totalVisitantes}</div>
            <p className="stat-sublabel">Total cadastrados</p>
          </div>
        </div>

        {/* Card: Visitantes Hoje */}
        <div className="stat-card">
          <div className="stat-icon today">
            <FiTrendingUp size={32} />
          </div>
          <div className="stat-content">
            <h3>Hoje</h3>
            <div className="stat-value">{stats.visitantesHoje}</div>
            <p className="stat-sublabel">Visitantes hoje</p>
          </div>
        </div>

        {/* Card: Agendamentos */}
        <div className="stat-card">
          <div className="stat-icon schedules">
            <FiCalendar size={32} />
          </div>
          <div className="stat-content">
            <h3>Agendamentos</h3>
            <div className="stat-value">{stats.agendamentos}</div>
            <p className="stat-sublabel">Pendentes</p>
          </div>
        </div>

        {/* Card: Tickets */}
        <div className="stat-card">
          <div className="stat-icon support">
            <FiMessageSquare size={32} />
          </div>
          <div className="stat-content">
            <h3>Suporte</h3>
            <div className="stat-value">{stats.tickets}</div>
            <p className="stat-sublabel">Tickets abertos</p>
          </div>
        </div>

        {/* Card: Funcionários */}
        <div className="stat-card">
          <div className="stat-icon employees">
            <FiClipboard size={32} />
          </div>
          <div className="stat-content">
            <h3>Funcionários</h3>
            <div className="stat-value">{stats.funcionarios}</div>
            <p className="stat-sublabel">Total de funcionários</p>
          </div>
        </div>
      </div>

      {/* Seções rápidas */}
      <div className="dashboard-sections">
        {/* Atalhos de ação */}
        <section className="quick-actions">
          <h2>Ações Rápidas</h2>
          <div className="actions-grid">
            <a href="/funcionarios/cadastrar" className="action-btn">
              <FiUsers size={24} />
              <span>Adicionar Funcionário</span>
            </a>
            <a href="/cadastrar-empresa-visitante" className="action-btn">
              <FiClipboard size={24} />
              <span>Cadastrar Empresa</span>
            </a>
            <a href="/agendamentos" className="action-btn">
              <FiCalendar size={24} />
              <span>Ver Agendamentos</span>
            </a>
            <a href="/ticket-dashboard" className="action-btn">
              <FiMessageSquare size={24} />
              <span>Gerenciar Tickets</span>
            </a>
          </div>
        </section>

        {/* Última atualização */}
        <div className="dashboard-footer">
          <p>
            Última atualização:{" "}
            {lastUpdate
              ? lastUpdate.toLocaleString("pt-BR")
              : new Date().toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
    </div>
  );
}
