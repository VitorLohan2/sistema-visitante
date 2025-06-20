// pages/RecuperarId/index.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';
import { FiArrowLeft } from 'react-icons/fi';
import logoImg from '../../assets/logo.svg';
import Loading from '../../components/Loading';

export default function RecuperarId() {
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [idRecuperado, setIdRecuperado] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setIdRecuperado(null);
    setLoading(true);

    try {
      const response = await api.post('/recuperar-id', {
        email,
        data_nascimento: dataNascimento,
      });
      setIdRecuperado(response.data.id);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao recuperar ID');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="recuperar-id-container">
      {loading && <Loading progress={100} />}

      <section className="form">
        <img src={logoImg} alt="Controle de Segurança" width="250px" />
        <form onSubmit={handleSubmit}>
          <h1>Recuperar ID de Usuário</h1>
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            required
          />
          <button className="button" type="submit">Recuperar</button>

          {idRecuperado && (
            <p className="resultado-id">
              Seu ID é: <strong>{idRecuperado}</strong>
            </p>
          )}

          {erro && <p className="erro">{erro}</p>}

          <Link className="back-link" to="/">
            <FiArrowLeft size={16} color="#e02041" />
            Voltar ao login
          </Link>
        </form>
      </section>
    </div>
  );
}
