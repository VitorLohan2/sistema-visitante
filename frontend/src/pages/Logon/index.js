import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiLogIn } from 'react-icons/fi';

import api from '../../services/api';
import './styles.css';

import logoImg from '../../assets/logo.svg';
import heroesImg from '../../assets/ilustracao-seguranca.png';
import Loading from '../../components/Loading';

export default function Logon() {
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const history = useHistory();

  useEffect(() => {
    let interval = null;

    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
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
    setLoading(true);

    try {
      const response = await api.post('sessions', { id });

      localStorage.setItem('ongId', id);
      localStorage.setItem('ongName', response.data.name);
      localStorage.setItem('ongType', response.data.type);

      // força barra a ir até 100%
      setProgress(100);
      setTimeout(() => {
        history.push('/profile');
      }, 300); // pequeno delay para usuário ver barra cheia
    } catch (err) {
      alert('Falha no login, tente novamente.');
      setLoading(false);
    }
  }

  if (loading) {
    return <Loading progress={progress} />;
  }

  return (
    <div className="logon-container">
      <section className="form">
        <img src={logoImg} alt="Controle de Segurança" width={"350px"} />

        <form onSubmit={handleLogin}>
          <h1>Faça seu Login</h1>
          <input
            placeholder="Sua ID"
            value={id}
            onChange={e => setId(e.target.value)}
          />
          <button className="button" type="submit">Entrar</button>
          <Link className="back-link" to="/register">
            <FiLogIn size={16} color="#e02041" />
            Não tenho cadastro
          </Link>
          <Link className="back-link" to="/recuperar-id">
            <FiLogIn size={16} color="#e02041" />
            Esqueci meu ID
          </Link>
        </form>
      </section>
      <img src={heroesImg} alt="Heroes" width={"550px"} />
    </div>
  );
}

