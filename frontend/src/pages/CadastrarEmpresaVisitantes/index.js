import React, { useState, useEffect, useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import Loading from '../../components/Loading';

export default function CadastrarEmpresaVisitantes() {
  const [form, setForm] = useState({
    nome: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userType, setUserType] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const history = useHistory();
  const ongName = localStorage.getItem('ongName');
  const isMounted = useRef(true);

  // ✅ Efeito para controlar o progresso do loading (igual ao seu login)
  useEffect(() => {
    let interval = null;

    if (loading || isCheckingAuth) {
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
  }, [loading, isCheckingAuth]);

  // ✅ VERIFICAR AUTENTICAÇÃO ADM NO MOUNT
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const ongId = localStorage.getItem('ongId');
        const ongTypeStored = localStorage.getItem('ongType');
        
        if (!ongId) {
          history.push('/');
          return;
        }

        // ✅ Verificar se é ADM/ADMIN
        if (ongTypeStored !== 'ADM' && ongTypeStored !== 'ADMIN') {
          setTimeout(() => {
            alert('Somente administradores tem permissão!');
            history.push('/profile');
          }, 1000);
          return;
        }

        // Força barra a ir até 100%
        setProgress(100);
        setTimeout(() => {
          setUserType(ongTypeStored);
          setIsCheckingAuth(false);
        }, 300);

      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setTimeout(() => {
          history.push('/profile');
        }, 1000);
      }
    };

    checkAuth();
    
    return () => {
      isMounted.current = false;
    };
  }, [history]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.nome.trim()) {
      alert('Por favor, informe o nome da empresa');
      return;
    }
    
    setLoading(true);
    
    try {
      await api.post('/empresas-visitantes', form, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      
      if (isMounted.current) {
        // Força barra a ir até 100%
        setProgress(100);
        setTimeout(() => {
          alert('Empresa cadastrada com sucesso!');
          history.push('/profile');
        }, 300);
      }
    } catch (error) {
      if (isMounted.current) {
        // ✅ Tratar erro de permissão
        if (error.response?.status === 403) {
          alert('Somente administradores tem permissão!');
          history.push('/profile');
          return;
        }
        
        const errorMessage = error.response?.data?.error || 'Erro ao cadastrar empresa';
        alert(errorMessage);
        setLoading(false);
      }
    }
  };

  const handleNomeChange = (e) => {
    setForm({...form, nome: e.target.value.toUpperCase()});
  };

  // ✅ Mostrar loading enquanto verifica autenticação
  if (isCheckingAuth) {
    return <Loading progress={progress} />;
  }

  // ✅ Se não é ADM, não renderizar nada (já redirecionou)
  if (userType !== 'ADM' && userType !== 'ADMIN') {
    return null;
  }

  // ✅ Mostrar loading durante submit
  if (loading) {
    return <Loading progress={progress} />;
  }

  return (
    <div className="form-container">
      <header>
        <div className="ajuste-Titulo">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {ongName}</span>
        </div>
        <Link className="back-link" to="/profile">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <div className="empresa-visitante-content">
        <section className="form-section">
          <h1>Cadastrar Empresa</h1>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Nome da Empresa:</label>
              <input
                value={form.nome}
                onChange={handleNomeChange}
                required
                placeholder="Digite o nome da empresa"
              />
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="save-button"
                disabled={loading || !form.nome.trim()}
              >
                Salvar Empresa
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}