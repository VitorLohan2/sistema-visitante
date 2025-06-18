import React, { useState, useEffect, useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import {
  FiPower, FiTrash2, FiUserPlus, FiEdit, FiUsers, FiClock, FiSearch, FiMessageSquare
} from 'react-icons/fi';
import { AiFillThunderbolt } from 'react-icons/ai';

import notificacaoSom from '../../assets/notificacao.mp3';
import RippleButton from '../../components/RippleButton';
import api from '../../services/api';

import './styles.css';

import logoImg from '../../assets/logo.svg';
import disable from '../../assets/disable.png';
import userIcon from '../../assets/user.png';

export default function Profile() {
  const [incidents, setIncidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const history = useHistory();
  const ongId = localStorage.getItem('ongId');
  const ongName = localStorage.getItem('ongName');
  const [unseenCount, setUnseenCount] = useState(0);
  const unseenRef = useRef(0);
  const [userData, setUserData] = useState({ setor: '' });
  const isFirstLoad = useRef(true);

  const [showAdmMenu, setShowAdmMenu] = useState(false);
  const admMenuRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!ongId) return;

      try {
        const ongResponse = await api.get(`ongs/${ongId}`);
        const { setor, type } = ongResponse.data;
        setUserData({ setor, type });

        const profileResponse = await api.get('profile', {
          headers: { Authorization: ongId }
        });
        setIncidents(profileResponse.data);

        if (setor === 'Segurança') {
          const unseenResponse = await api.get('/tickets/unseen', {
            headers: { Authorization: ongId }
          });

          const newCount = unseenResponse.data.count;
          if (!isFirstLoad.current && newCount > unseenRef.current) {
            const audio = new Audio(notificacaoSom);
            audio.play().catch(err => console.error("Erro ao tocar som:", err));
          }

          unseenRef.current = newCount;
          setUnseenCount(newCount);
          isFirstLoad.current = false;
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error.response?.data || error.message);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [ongId]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (admMenuRef.current && !admMenuRef.current.contains(event.target)) {
        setShowAdmMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredIncidents = incidents.filter(incident =>
    incident.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.cpf.includes(searchTerm)
  );

  async function handleDeleteIncident(id) {
    if (!window.confirm('Tem certeza que deseja deletar este cadastro?')) return;

    try {
      const response = await api.delete(`incidents/${id}`, {
        headers: { Authorization: ongId }
      });

      if (response.status === 204) {
        setIncidents(incidents.filter(incident => incident.id !== id));
        alert('Cadastro deletado com sucesso!');
      }
    } catch (err) {
      const error = err.response?.data?.error || err.message;
      alert(`Acesso Bloqueado: ${error}`);
    }
  }

  async function handleRegisterVisit(id) {
    try {
      const incident = incidents.find(inc => inc.id === id);
      if (incident.bloqueado) {
        alert('Este visitante está bloqueado. Registro de visita não permitido.');
        return;
      }

      await api.post('/visitors', {
        name: incident.nome,
        cpf: incident.cpf,
        company: incident.empresa,
        sector: incident.setor
      }, {
        headers: { Authorization: ongId }
      });

      alert('Visita registrada com sucesso!');
      history.push('/visitors');
    } catch (err) {
      alert('Erro ao registrar visita: ' + err.message);
    }
  }

  function handleEditProfile(id) {
    history.push(`/incidents/edit/${id}`);
  }

  function handleViewProfile(id) {
    history.push(`/incidents/view/${id}`);
  }

  function handleLogout() {
    localStorage.clear();
    history.push('/');
  }

  return (
    <div className="profile-container">
      <header>
        <img src={logoImg} alt="DIME" />
        <span> Bem-vindo(a), {ongName} </span>

        <div className="search-container">
          <FiSearch className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Consultar por nome ou CPF"
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Link className="button" to="/incidents/new">Cadastrar Visitante</Link>
        <button onClick={handleLogout} type="button">
          <FiPower size={18} color="#e02041" />
        </button>
      </header>

      <div className="page-header">
        <button onClick={() => history.push('/visitors')} className="visitors-link">
          <FiUsers size={20} className="icone2" />
          <span>Ver Visitantes</span>
        </button>

        <button onClick={() => history.push('/history')} className="history-link">
          <FiClock size={20} className="icone" />
          <span>Histórico</span>
        </button>

        <RippleButton onClick={(e) => {
          e.preventDefault();
          setTimeout(() => history.push('/ticket-dashboard'), 200);
        }} className="tickets-link">
          <FiMessageSquare size={20} className="icone" />
          <span>Tickets</span>
          {userData.setor === 'Segurança' && unseenCount > 0 && (
            <span className="notification-badge">
              {unseenCount > 9 ? '9+' : unseenCount}
            </span>
          )}
        </RippleButton>
            
        {userData.type === 'ADM' && (
          <div className="adm-menu-container" ref={admMenuRef}>
            <button onClick={() => setShowAdmMenu(prev => !prev)} className="adm-link">
              <AiFillThunderbolt size={20} className="icone" />
              <span>EasyPonto</span>
            </button>

            {showAdmMenu && (
              <div className="adm-submenu">
                <button onClick={() => history.push('/funcionarios')}>Gerenciar Funcionários</button>
                <button onClick={() => history.push('/funcionarios/cadastrar')}>Cadastrar Funcionário</button>
                <button onClick={() => history.push('/ponto')}>Bipagem Entrada/Saída</button>
              </div>
            )}
          </div>
        )}
      </div>

      <h1>Cadastrados</h1>

      <div className="simple-table">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Nascimento</th>
              <th>CPF</th>
              <th>Empresa</th>
              <th>Setor</th>
              <th>Telefone</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.map(incident => (
              <tr key={incident.id}>
                <td className={incident.bloqueado ? 'blocked-name' : ''}>
                  <div className="user-info">
                    {incident.bloqueado
                      ? <img src={disable} alt="Bloqueado" className="lock-icon" />
                      : <img src={userIcon} alt="Usuário" className="user-icon" />}
                    <span>{incident.nome}</span>
                  </div>
                </td>
                <td>{incident.nascimento}</td>
                <td>{incident.cpf}</td>
                <td>{incident.empresa}</td>
                <td>{incident.setor}</td>
                <td>{incident.telefone}</td>
                <td className="actions">
                  <button onClick={() => handleRegisterVisit(incident.id)} className="visit-button" aria-label="Registrar visita">
                    <FiUserPlus size={16} />
                  </button>
                  <button onClick={() => handleViewProfile(incident.id)} className="view-button" aria-label="Visualizar perfil">
                    <FiSearch size={16} />
                  </button>
                  <button onClick={() => handleEditProfile(incident.id)} className="edit-button" aria-label="Editar perfil">
                    <FiEdit size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteIncident(incident.id); }} className="delete-button" title="Deletar cadastro">
                    <FiTrash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
