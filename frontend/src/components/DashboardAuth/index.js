import React, { useState, useEffect } from "react";
import {
  FiLock,
  FiEye,
  FiEyeOff,
  FiShield,
  FiAlertCircle,
} from "react-icons/fi";
import api from "../../services/api";
import "./styles.css";

export default function DashboardAuth({ onAuthenticated }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(0);

  // Timer de bloqueio
  useEffect(() => {
    let interval;
    if (blocked && blockTimer > 0) {
      interval = setInterval(() => {
        setBlockTimer((prev) => {
          if (prev <= 1) {
            setBlocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [blocked, blockTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      setError("Digite a senha de acesso");
      return;
    }

    // Bloqueia após 5 tentativas por 2 minutos
    if (attempts >= 5) {
      setBlocked(true);
      setBlockTimer(120); // 2 minutos
      setError("Muitas tentativas. Aguarde 2 minutos.");
      return;
    }

    // Evita múltiplos cliques
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/dashboard/auth", { password });

      if (response.data.success) {
        // Salva o token no localStorage
        localStorage.setItem("dashboardToken", response.data.token);
        localStorage.setItem(
          "dashboardTokenExpiry",
          new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        );

        // Notifica o componente pai
        onAuthenticated(response.data.token);
      }
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setBlocked(true);
        setBlockTimer(120);
        setError("Muitas tentativas. Aguarde 2 minutos.");
      } else if (err.response?.status === 401) {
        setError(`Senha incorreta. Tentativas restantes: ${5 - newAttempts}`);
      } else {
        setError("Erro ao verificar senha. Tente novamente.");
      }

      // Limpa a senha após erro
      setPassword("");

      console.error("Erro de autenticação:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-auth-overlay">
      <div className="dashboard-auth-container">
        <div className="auth-header">
          <div className="auth-icon">
            <FiShield size={48} />
          </div>
          <h2>Acesso Restrito</h2>
          <p>Este Dashboard contém dados sensíveis do sistema.</p>
          <p className="auth-subtitle">
            Digite a senha de administrador para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <FiLock className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha do Dashboard"
              autoFocus
              disabled={loading || blocked}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {error && (
            <div className="auth-error">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          {blocked && blockTimer > 0 && (
            <div className="auth-blocked">
              ⏳ Bloqueado por {Math.floor(blockTimer / 60)}:
              {String(blockTimer % 60).padStart(2, "0")}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || blocked}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Verificando...
              </>
            ) : blocked ? (
              <>
                <FiLock />
                Aguarde...
              </>
            ) : (
              <>
                <FiLock />
                Acessar Dashboard
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>🔒 Dados protegidos por criptografia</p>
        </div>
      </div>
    </div>
  );
}
