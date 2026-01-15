// src/pages/RedefinirSenha/index.js
import React, { useState, useEffect } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import api from "../../services/api";
import "./styles.css";
import {
  FiArrowLeft,
  FiLock,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import logoImg from "../../assets/logo.svg";
import Loading from "../../components/Loading";

export default function RedefinirSenha() {
  const location = useLocation();
  const history = useHistory();
  const [token, setToken] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [senhaRedefinida, setSenhaRedefinida] = useState(false);
  const [tokenInvalido, setTokenInvalido] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  // Extrai o token da URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get("token");

    if (tokenParam) {
      setToken(tokenParam);
      verificarToken(tokenParam);
    } else {
      setTokenInvalido(true);
      setErro("Link de recuperação inválido ou expirado.");
    }
  }, [location]);

  // Verifica se o token é válido
  async function verificarToken(tokenValue) {
    try {
      await api.get(`/auth/verificar-token-recuperacao?token=${tokenValue}`);
    } catch (err) {
      setTokenInvalido(true);
      setErro(err.response?.data?.error || "Token inválido ou expirado.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    // Validações
    if (novaSenha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/redefinir-senha", {
        token,
        novaSenha,
        confirmarSenha,
      });
      setMensagem(response.data.message);
      setSenhaRedefinida(true);
    } catch (err) {
      setErro(err.response?.data?.error || "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  }

  // Redireciona para login após 3 segundos
  useEffect(() => {
    if (senhaRedefinida) {
      const timer = setTimeout(() => {
        history.push("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [senhaRedefinida, history]);

  return (
    <div className="redefinir-senha-container">
      {loading && <Loading progress={100} />}

      <section className="form">
        <img src={logoImg} alt="Controle de Segurança" width="250px" />

        {tokenInvalido ? (
          <div className="erro-container">
            <FiAlertCircle size={60} className="icone-erro" />
            <h2>Link Inválido</h2>
            <p className="mensagem-erro">{erro}</p>
            <p className="instrucoes">
              O link pode ter expirado ou já foi utilizado. Solicite um novo
              link de recuperação.
            </p>
            <Link className="button-solicitar" to="/recuperar-senha">
              Solicitar Novo Link
            </Link>
            <Link className="back-link" to="/">
              <FiArrowLeft size={16} color="#e02041" />
              Voltar ao login
            </Link>
          </div>
        ) : senhaRedefinida ? (
          <div className="sucesso-container">
            <FiCheckCircle size={60} className="icone-sucesso" />
            <h2>Senha Redefinida!</h2>
            <p className="mensagem-sucesso">{mensagem}</p>
            <p className="instrucoes">
              Você será redirecionado para a tela de login em instantes...
            </p>
            <Link className="button-voltar" to="/">
              <FiArrowLeft size={16} />
              Ir para Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1>Redefinir Senha</h1>
            <p className="descricao">
              Digite sua nova senha para recuperar o acesso à sua conta.
            </p>

            <div className="input-group">
              <label>Nova Senha</label>
              <div className="input-senha">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="btn-mostrar-senha"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Confirmar Nova Senha</label>
              <div className="input-senha">
                <input
                  type={mostrarConfirmar ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="btn-mostrar-senha"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                >
                  {mostrarConfirmar ? (
                    <FiEyeOff size={18} />
                  ) : (
                    <FiEye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              className="button-redefinir"
              type="submit"
              disabled={loading}
            >
              <FiLock size={18} />
              Redefinir Senha
            </button>

            {erro && <p className="erro">{erro}</p>}

            <Link className="back-link" to="/">
              <FiArrowLeft size={16} color="#e02041" />
              Voltar ao login
            </Link>
          </form>
        )}
      </section>
    </div>
  );
}
