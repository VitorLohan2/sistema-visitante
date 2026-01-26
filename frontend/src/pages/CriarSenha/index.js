/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CRIAR SENHA - Página para primeiro acesso
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Permite que usuários criem sua senha no primeiro acesso ao sistema.
 * O userId é passado via location.state ou pode ser digitado manualmente.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation, useHistory } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import "./styles.css";
import {
  FiArrowLeft,
  FiLock,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiUser,
} from "react-icons/fi";
import logoImg from "../../assets/logo.svg";
import Loading from "../../components/Loading";

export default function CriarSenha() {
  const location = useLocation();
  const history = useHistory();
  const { login } = useAuth();

  // Estados
  const [userId, setUserId] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [senhaCriada, setSenhaCriada] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  // Pega o userId do state (vindo do login)
  useEffect(() => {
    if (location.state?.userId) {
      setUserId(location.state.userId);
    }
  }, [location.state]);

  // Validação de força da senha
  const validarForcaSenha = (senha) => {
    if (senha.length < 6)
      return { valido: false, forca: 0, texto: "Muito curta" };
    if (senha.length < 8) return { valido: true, forca: 1, texto: "Fraca" };

    const temMaiuscula = /[A-Z]/.test(senha);
    const temMinuscula = /[a-z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    const temEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);

    const criterios = [
      temMaiuscula,
      temMinuscula,
      temNumero,
      temEspecial,
    ].filter(Boolean).length;

    if (criterios >= 3 && senha.length >= 10)
      return { valido: true, forca: 3, texto: "Forte" };
    if (criterios >= 2 && senha.length >= 8)
      return { valido: true, forca: 2, texto: "Média" };
    return { valido: true, forca: 1, texto: "Fraca" };
  };

  const forcaSenha = validarForcaSenha(senha);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    // Validações
    if (!userId.trim()) {
      setErro("Informe o ID do usuário.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/criar-senha", {
        userId: userId.trim(),
        senha,
        confirmarSenha,
      });

      setMensagem(response.data.message || "Senha criada com sucesso!");
      setSenhaCriada(true);

      // Se veio token, faz login automaticamente
      if (response.data.token && response.data.usuario) {
        setTimeout(() => {
          login(response.data.token, response.data.usuario);
          history.push("/home");
        }, 2000);
      }
    } catch (err) {
      console.error("Erro ao criar senha:", err);
      setErro(
        err.response?.data?.error || "Erro ao criar senha. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="criar-senha-container">
      {loading && <Loading progress={100} />}

      <section className="form">
        <img src={logoImg} alt="Sistema de Visitantes" width="250px" />

        {senhaCriada ? (
          <div className="sucesso-container">
            <FiCheckCircle size={60} className="icone-sucesso" />
            <h2>Senha Criada!</h2>
            <p className="mensagem-sucesso">{mensagem}</p>
            <p className="instrucoes">
              Você será redirecionado para o sistema em instantes...
            </p>
            <Link className="button-voltar" to="/">
              <FiArrowLeft size={16} />
              Ir para Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1>Criar Senha</h1>
            <p className="descricao">
              Primeiro acesso? Crie sua senha para acessar o sistema.
            </p>

            {/* Campo ID do Usuário */}
            <div className="input-group">
              <label>ID do Usuário</label>
              <div className="input-wrapper">
                <FiUser size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Digite seu ID de usuário"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  disabled={!!location.state?.userId}
                />
              </div>
              {location.state?.userId && (
                <small className="input-hint">ID recebido do login</small>
              )}
            </div>

            {/* Campo Nova Senha */}
            <div className="input-group">
              <label>Nova Senha</label>
              <div className="input-senha">
                <FiLock size={18} className="input-icon" />
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn-mostrar"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  tabIndex={-1}
                >
                  {mostrarSenha ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {senha && (
                <div className={`forca-senha forca-${forcaSenha.forca}`}>
                  <div className="barra-forca">
                    <div
                      className="barra-preenchida"
                      style={{ width: `${(forcaSenha.forca / 3) * 100}%` }}
                    />
                  </div>
                  <span>{forcaSenha.texto}</span>
                </div>
              )}
            </div>

            {/* Campo Confirmar Senha */}
            <div className="input-group">
              <label>Confirmar Senha</label>
              <div className="input-senha">
                <FiLock size={18} className="input-icon" />
                <input
                  type={mostrarConfirmar ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn-mostrar"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                  tabIndex={-1}
                >
                  {mostrarConfirmar ? (
                    <FiEyeOff size={18} />
                  ) : (
                    <FiEye size={18} />
                  )}
                </button>
              </div>
              {confirmarSenha && senha !== confirmarSenha && (
                <small className="input-error">As senhas não coincidem</small>
              )}
              {confirmarSenha &&
                senha === confirmarSenha &&
                confirmarSenha.length >= 6 && (
                  <small className="input-success">
                    <FiCheckCircle size={14} /> Senhas coincidem
                  </small>
                )}
            </div>

            {/* Mensagens de erro */}
            {erro && (
              <div className="erro-message">
                <FiAlertCircle size={18} />
                {erro}
              </div>
            )}

            {/* Botão Submit */}
            <button
              type="submit"
              className="button-criar"
              disabled={loading || senha.length < 6 || senha !== confirmarSenha}
            >
              {loading ? "Criando..." : "Criar Senha"}
            </button>

            {/* Link voltar */}
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
