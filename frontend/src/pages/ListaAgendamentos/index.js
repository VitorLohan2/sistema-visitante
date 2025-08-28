import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import {
  FiPower, FiPlus, FiClock, FiUser, FiBuilding, 
  FiFileText, FiCheck, FiArrowLeft, FiCalendar
} from 'react-icons/fi';

import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Loading from '../../components/Loading';

import './styles.css';

import logoImg from '../../assets/logo.svg';

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const history = useHistory();
  
  const { user, logout } = useAuth();
  const ongId = user?.id;
  const ongName = user?.name;
  const userSetor = user?.setor;

  useEffect(() => {
    async function loadAgendamentos() {
      try {
        const response = await api.get('/agendamentos', {
          headers: { Authorization: ongId }
        });
        
        setAgendamentos(response.data);
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        alert('Erro ao carregar agendamentos');
      } finally {
        setLoading(false);
      }
    }

    if (ongId) {
      loadAgendamentos();
    }
  }, [ongId]);

  function formatarData(data) {
    if (!data) return 'Data não informada';
    
    const date = new Date(data);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function handleConfirmarAgendamento(id) {
    if (!window.confirm('Confirmar este agendamento? O item será removido da lista após confirmação.')) {
      return;
    }

    try {
      await api.patch(`/agendamentos/${id}/confirmar`, {}, {
        headers: { Authorization: ongId }
      });

      // Remove o agendamento da lista após confirmação
      setAgendamentos(agendamentos.filter(agendamento => agendamento.id !== id));
      alert('Agendamento confirmado com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      alert('Erro ao confirmar agendamento');
    }
  }

  function handleLogout() {
    if (window.confirm('Tem certeza que deseja sair?')) {
      logout();
    }
  }

  if (loading) return <Loading progress={100} message="Carregando agendamentos..." />;

  return (
    <div className="agendamentos-container">
      <header>
        <img src={logoImg} alt="DIME" />
        <span>Bem-vindo(a), {ongName}</span>

        <div className="header-actions">
          <Link className="button" to="/agendamentos/novo">
            <FiPlus size={16} />
            Novo Agendamento
          </Link>
          
          <button onClick={() => history.goBack()} className="back-button">
            <FiArrowLeft size={16} />
            Voltar
          </button>

          <button onClick={handleLogout} type="button">
            <FiPower size={18} color="#e02041" />
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="page-title">
          <FiCalendar size={24} />
          <h1>Agendamentos de Visitas</h1>
        </div>

        {agendamentos.length === 0 ? (
          <div className="empty-state">
            <FiCalendar size={48} color="#ddd" />
            <p>Nenhum agendamento encontrado</p>
            <Link to="/agendamentos/novo" className="button">
              Criar Primeiro Agendamento
            </Link>
          </div>
        ) : (
          <div className="agendamentos-grid">
            {agendamentos.map(agendamento => (
              <div key={agendamento.id} className="agendamento-card">
                <div className="card-header">
                  <div className="card-title">
                    <FiUser size={20} />
                    <h3>{agendamento.nome}</h3>
                  </div>
                  <div className="card-time">
                    <FiClock size={16} />
                    <span>{formatarData(agendamento.horario_agendado)}</span>
                  </div>
                </div>

                <div className="card-body">
                  <div className="card-info">
                    <div className="info-item">
                      <span className="info-label">CPF:</span>
                      <span className="info-value">{agendamento.cpf}</span>
                    </div>
                    
                    <div className="info-item">
                      <span className="info-label">Setor:</span>
                      <span className="info-value">{agendamento.setor}</span>
                    </div>
                    
                    <div className="info-item">
                      <span className="info-label">Criado por:</span>
                      <span className="info-value">{agendamento.criado_por}</span>
                    </div>

                    {agendamento.observacao && (
                      <div className="info-item observacao">
                        <span className="info-label">Observação:</span>
                        <span className="info-value">{agendamento.observacao}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Só mostra o botão de confirmar se o usuário for da Portaria/Segurança */}
                {(userSetor === 'Portaria' || userSetor === 'Segurança') && (
                  <div className="card-actions-agenda">
                    <button 
                      onClick={() => handleConfirmarAgendamento(agendamento.id)}
                      className="confirm-button"
                      title="Confirmar agendamento"
                    >
                      <FiCheck size={16} />
                      Confirmar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}