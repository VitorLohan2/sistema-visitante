// src/pages/RecuperarSenha/index.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./styles.css";
import { FiArrowLeft, FiMail, FiCheckCircle } from "react-icons/fi";
import logoImg from "../../assets/logo.svg";
import Loading from "../../components/Loading";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setLoading(true);

    try {
      const response = await api.post("/auth/solicitar-recuperacao-senha", {
        email,
        dataNascimento,
      });
      setMensagem(response.data.message);
      setEmailEnviado(true);
    } catch (err) {
      setErro(
        err.response?.data?.error || "Erro ao solicitar recuperação de senha"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="recuperar-senha-container">
      {loading && <Loading progress={100} />}

      <section className="form">
        <img src={logoImg} alt="Controle de Segurança" width="250px" />

        {!emailEnviado ? (
          <form onSubmit={handleSubmit}>
            <h1>Recuperar Senha</h1>
            <p className="descricao">
              Informe seu e-mail e data de nascimento para receber o link de
              recuperação.
            </p>

            <div className="input-group">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="Seu e-mail cadastrado"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Data de Nascimento</label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                required
              />
            </div>

            <button
              className="button-recuperar"
              type="submit"
              disabled={loading}
            >
              <FiMail size={18} />
              Enviar Link de Recuperação
            </button>

            {erro && <p className="erro">{erro}</p>}

            <Link className="back-link" to="/">
              <FiArrowLeft size={16} color="#e02041" />
              Voltar ao login
            </Link>
          </form>
        ) : (
          <div className="sucesso-container">
            <FiCheckCircle size={60} className="icone-sucesso" />
            <h2>E-mail Enviado!</h2>
            <p className="mensagem-sucesso">{mensagem}</p>
            <p className="instrucoes">
              Verifique sua caixa de entrada e a pasta de spam. O link expira em
              1 hora.
            </p>
            <Link className="button-voltar" to="/">
              <FiArrowLeft size={16} />
              Voltar ao login
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
