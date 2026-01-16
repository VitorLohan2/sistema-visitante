import React, { useState, useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiLock, FiMail } from "react-icons/fi";

import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import "./styles.css";

import logoImg from "../../assets/logo.svg";
import Loading from "../../components/Loading";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [erro, setErro] = useState("");
  const history = useHistory();
  const { login, isAuthenticated } = useAuth();

  // Se já está autenticado, redireciona para home
  useEffect(() => {
    if (isAuthenticated) {
      console.log("Usuário já autenticado, redirecionando...");
      history.push("/home");
    }
  }, [isAuthenticated, history]);

  useEffect(() => {
    let interval = null;

    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 100);
    } else {
      setProgress(0);
    }

    return () => clearInterval(interval);
  }, [loading]);

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");

    if (!email.trim() || !senha.trim()) {
      setErro("Por favor, informe seu email e senha");
      return;
    }

    setLoading(true);
    console.log("Tentando fazer login com email:", email);

    try {
      const response = await api.post("/auth/login", {
        email: email.toLowerCase(),
        senha,
      });
      console.log("Resposta do login:", response.data);

      const { token, usuario } = response.data;

      // Usa o método login do contexto com token e dados do usuário
      login(token, usuario);

      // Força barra a ir até 100%
      setProgress(100);
      setTimeout(() => {
        history.push("/home");
      }, 300);
    } catch (err) {
      console.error("Erro no login:", err);

      if (err.response?.data?.code === "PASSWORD_NOT_SET") {
        // Primeiro acesso - redireciona para criar senha
        setErro(
          "Primeiro acesso detectado. Você será redirecionado para criar uma senha."
        );
        setTimeout(() => {
          history.push("/criar-senha", { userId: err.response?.data?.userId });
        }, 2000);
      } else {
        const errorMessage =
          err.response?.data?.error || "Falha no login, tente novamente.";
        setErro(errorMessage);
      }

      setLoading(false);
    }
  }

  if (loading) {
    return <Loading progress={progress} />;
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <section className="login-card">
          <img src={logoImg} alt="DIME" className="login-logo" />

          <form onSubmit={handleLogin} className="login-form">
            <h1>Login</h1>

            {erro && <div className="error-message">{erro}</div>}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <FiMail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <div className="input-wrapper">
                <FiLock size={18} className="input-icon" />
                <input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
              <Link className="forgot-password-link" to="/recuperar-senha">
                Esqueceu sua senha?
              </Link>
            </div>

            <button className="login-button" type="submit">
              Entrar
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
