import React, { useState, useEffect } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiTrendingUp,
  FiServer,
  FiGlobe,
  FiUser,
  FiClock,
} from "react-icons/fi";
import { Bar } from "react-chartjs-2";
import socketService from "../../services/socketService";
import api from "../../services/api";
import "./styles.css";

export default function MonitoramentoRequisicoes() {
  const [stats, setStats] = useState({
    total: 0,
    errors: 0,
    errorRate: "0.00%",
    avgPerMinute: 0,
    uptime: "0h 0m",
    consumptionLevel: "baixo",
    topErrors: [],
    topIPs: [],
    topUsers: [],
    uniqueIPs: 0,
    uniqueUsers: 0,
    byMethod: {},
  });
  const [usePolling, setUsePolling] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Buscar estatísticas iniciais
  useEffect(() => {
    let isMounted = true; // Flag para verificar se componente está montado

    const fetchStats = async () => {
      try {
        const response = await api.get("/api/stats", {
          headers: {
            "x-admin-key":
              process.env.REACT_APP_ADMIN_STATS_KEY || "dev_admin_key_123",
          },
        });

        // Só atualiza se componente ainda estiver montado
        if (isMounted) {
          setStats(response.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erro ao buscar estatísticas:", error);
        }
      }
    };

    fetchStats();

    // Se usar polling, atualiza a cada 10 segundos
    let pollingInterval;
    if (usePolling) {
      pollingInterval = setInterval(fetchStats, 10000);
    }

    return () => {
      isMounted = false; // Marca como desmontado
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [usePolling]);

  // Socket listener para atualizações em tempo real
  useEffect(() => {
    const socket = socketService.getSocket();

    // Verifica se o socket está pronto
    if (!socket) {
      console.warn(
        "Socket não está pronto ainda. Estatísticas serão atualizadas via polling.",
      );
      setUsePolling(true);
      return;
    }

    // Socket está pronto, desabilita polling
    setUsePolling(false);

    const handleStatsUpdate = (data) => {
      setStats(data);
    };

    const handleError = (errorData) => {
      // Atualiza apenas o contador de erros quando ocorre um novo erro
      setStats((prev) => ({
        ...prev,
        errors: prev.errors + 1,
      }));
    };

    socket.on("request:stats", handleStatsUpdate);
    socket.on("request:error", handleError);

    return () => {
      socket.off("request:stats", handleStatsUpdate);
      socket.off("request:error", handleError);
    };
  }, []);

  // Determinar cor e emoji baseado no nível de consumo
  const getConsumptionConfig = () => {
    switch (stats.consumptionLevel) {
      case "alto":
        return {
          color: "#ef4444",
          emoji: "🔴",
          text: "Alto",
          barColor: "rgba(239, 68, 68, 0.8)",
        };
      case "médio":
        return {
          color: "#f59e0b",
          emoji: "🟡",
          text: "Médio",
          barColor: "rgba(245, 158, 11, 0.8)",
        };
      default:
        return {
          color: "#10b981",
          emoji: "🟢",
          text: "Baixo",
          barColor: "rgba(16, 185, 129, 0.8)",
        };
    }
  };

  const consumptionConfig = getConsumptionConfig();

  // Dados do gráfico de requisições por método
  const methodChartData = {
    labels: Object.keys(stats.byMethod || {}),
    datasets: [
      {
        label: "Requisições",
        data: Object.values(stats.byMethod || {}),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)", // GET - Azul
          "rgba(16, 185, 129, 0.8)", // POST - Verde
          "rgba(245, 158, 11, 0.8)", // PUT - Amarelo
          "rgba(239, 68, 68, 0.8)", // DELETE - Vermelho
        ],
        borderColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const methodChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Requisições por Método HTTP",
        color: "#6b7280",
        font: {
          size: 14,
          weight: "600",
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="monitoramento-requisicoes">
      {/* Card Principal de Estatísticas */}
      <div className="stats-main-card">
        <div className="stats-header">
          <FiActivity className="header-icon" />
          <h3>Monitoramento de Requisições</h3>
          <span className="realtime-badge">• Tempo Real</span>
        </div>

        <div className="stats-grid">
          {/* Total de Requisições */}
          <div className="stat-item">
            <div className="stat-icon total">
              <FiServer />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total de Requisições</span>
              <span className="stat-value">{stats.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Erros */}
          <div className="stat-item">
            <div className="stat-icon errors">
              <FiAlertCircle />
            </div>
            <div className="stat-content">
              <span className="stat-label">Erros</span>
              <span className="stat-value">
                {stats.errors} <small>({stats.errorRate})</small>
              </span>
            </div>
          </div>

          {/* Média por Minuto */}
          <div className="stat-item">
            <div className="stat-icon average">
              <FiTrendingUp />
            </div>
            <div className="stat-content">
              <span className="stat-label">Média por Minuto</span>
              <span className="stat-value">{stats.avgPerMinute} req/min</span>
            </div>
          </div>

          {/* Nível de Consumo */}
          <div className="stat-item consumption">
            <div
              className="consumption-indicator"
              style={{ backgroundColor: consumptionConfig.color }}
            >
              <span className="consumption-emoji">
                {consumptionConfig.emoji}
              </span>
            </div>
            <div className="stat-content">
              <span className="stat-label">Nível de Consumo</span>
              <span
                className="stat-value"
                style={{ color: consumptionConfig.color }}
              >
                {consumptionConfig.text}
              </span>
            </div>
          </div>
        </div>

        <div className="stats-footer">
          <span className="uptime">⏱️ Uptime: {stats.uptime}</span>
        </div>
      </div>

      {/* Gráfico de Métodos HTTP */}
      <div className="method-chart-card">
        <div className="chart-container">
          <Bar data={methodChartData} options={methodChartOptions} />
        </div>
      </div>

      {/* Top Endpoints mais acessados */}
      {stats.topEndpoints && stats.topEndpoints.length > 0 && (
        <div className="endpoints-card">
          <div className="endpoints-header">
            <FiServer className="header-icon success" />
            <h3>Top Endpoints</h3>
          </div>

          <div className="endpoints-list">
            {stats.topEndpoints.slice(0, 8).map((item, index) => {
              // Usar método do backend se disponível, senão inferir
              const method = item.method || "GET";
              const methodColor = {
                GET: "#3b82f6",
                POST: "#10b981",
                PUT: "#f59e0b",
                DELETE: "#ef4444",
                PATCH: "#8b5cf6",
              };

              return (
                <div key={index} className="endpoint-item">
                  <div
                    className="endpoint-badge"
                    style={{
                      backgroundColor: methodColor[method] || "#6b7280",
                    }}
                  >
                    <span className="endpoint-method">{method}</span>
                  </div>
                  <div className="endpoint-info">
                    <span className="endpoint-path">{item.endpoint}</span>
                  </div>
                  <div className="endpoint-count">
                    <span className="endpoint-count-badge">{item.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card de Erros por Endpoint */}
      {stats.topErrors && stats.topErrors.length > 0 && (
        <div className="errors-card">
          <div className="errors-header">
            <FiAlertCircle className="header-icon error" />
            <h3>Endpoints com Erros</h3>
          </div>

          <div className="errors-list">
            {stats.topErrors.map((error, index) => (
              <div key={index} className="error-item">
                <div className="error-badge">
                  <span className="error-method">{error.method}</span>
                </div>
                <div className="error-info">
                  <span className="error-endpoint">{error.endpoint}</span>
                  {error.lastError && (
                    <span className="error-details">
                      Status {error.lastError.status} • Última ocorrência:{" "}
                      {new Date(error.lastError.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="error-count">
                  <span className="error-count-badge">{error.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card de IPs de Usuários Logados */}
      {stats.topIPs && stats.topIPs.length > 0 && (
        <div className="ips-card">
          <div className="ips-header">
            <FiGlobe className="header-icon ip" />
            <h3>IPs de Usuários Online ({stats.uniqueIPs})</h3>
          </div>

          <div className="ips-list">
            {stats.topIPs.slice(0, 8).map((item, index) => (
              <div key={index} className="ip-item">
                <div className="ip-rank">#{index + 1}</div>
                <div className="ip-info">
                  <span className="ip-address">{item.ip}</span>
                  {item.users && item.users.length > 0 && (
                    <span className="ip-users">👤 {item.users.join(", ")}</span>
                  )}
                </div>
                <div className="ip-stats">
                  <span className="ip-count">
                    {item.count} {item.count === 1 ? "usuário" : "usuários"}
                  </span>
                  {item.lastActivity && (
                    <span className="ip-last">
                      <FiClock size={10} />
                      {new Date(item.lastActivity).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card de Usuários Online */}
      {stats.topUsers && stats.topUsers.length > 0 ? (
        <div className="users-card">
          <div className="users-header">
            <FiUser className="header-icon user" />
            <h3>Usuários Online ({stats.uniqueUsers})</h3>
          </div>

          <div className="users-list">
            {stats.topUsers.slice(0, 8).map((item, index) => (
              <div key={index} className="user-item user-online">
                <div
                  className="user-status-indicator online"
                  title="Online"
                ></div>
                <div className="user-info">
                  <span className="usuario-nome">
                    {item.userName ||
                      item.userEmail ||
                      "Usuário " + item.userId}
                    {item.isAdmin && <span className="admin-badge">Admin</span>}
                  </span>
                  <span className="user-details">
                    <span className="user-ip" title="IP">
                      {item.ip}
                    </span>
                    {item.socketCount > 1 && (
                      <span className="user-tabs" title="Abas abertas">
                        📑 {item.socketCount} abas
                      </span>
                    )}
                  </span>
                </div>
                <div className="user-stats">
                  {item.connectedAt && (
                    <span className="user-connected" title="Conectado desde">
                      <FiClock size={10} />
                      {new Date(item.connectedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="users-card">
          <div className="users-header">
            <FiUser className="header-icon user" />
            <h3>Usuários Online (0)</h3>
          </div>
          <div className="users-empty">
            <span>Nenhum usuário online no momento</span>
          </div>
        </div>
      )}

      {/* Indicador de Barra de Consumo */}
      <div className="consumption-bar-card">
        <div className="consumption-bar-header">
          <span>Indicador de Consumo</span>
          <span className="consumption-percentage">
            {Math.min(Math.round((stats.avgPerMinute / 100) * 100), 100)}%
          </span>
        </div>
        <div className="consumption-bar-track">
          <div
            className="consumption-bar-fill"
            style={{
              width: `${Math.min((stats.avgPerMinute / 100) * 100, 100)}%`,
              backgroundColor: consumptionConfig.color,
            }}
          />
        </div>
        <div className="consumption-bar-labels">
          <span className="label-low">🟢 Baixo (0-20)</span>
          <span className="label-medium">🟡 Médio (20-50)</span>
          <span className="label-high">🔴 Alto (50+)</span>
        </div>
      </div>
    </div>
  );
}
