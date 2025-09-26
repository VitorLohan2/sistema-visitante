// src/components/ProfileMenu.js
import React, { useState, useRef, useEffect } from 'react';
import { FiUsers, FiClock, FiMessageSquare, FiCoffee, FiSettings, FiGitlab } from 'react-icons/fi';
import { useHistory } from 'react-router-dom';

import '../styles/profile-menu.css';


export default function ProfileMenu({ userData, unseenCount, handleOpenConfigModal }) {
  const history = useHistory();
  const [showAdmMenu, setShowAdmMenu] = useState(false);
  const admMenuRef = useRef(null);

  // Fecha menu ADM ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (admMenuRef.current && !admMenuRef.current.contains(event.target)) {
        setShowAdmMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="page-profile-header">
      <button onClick={() => history.push('/visitors')} className="visitors-link">
        <FiUsers size={20} className="icone2" />
        <span>Ver Visitantes</span>
      </button>

      <button onClick={() => history.push('/history')} className="history-link">
        <FiClock size={20} className="icone" />
        <span>Histórico</span>
      </button>
        
      <button onClick={() => history.push('/ticket-dashboard')} className="tickets-link">
        <FiMessageSquare size={20} className="icone" />
        <span>Tickets</span>
        {userData.setor === 'Segurança' && unseenCount > 0 && ( 
          <span className="notification-badge">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>
        
      {userData.type === 'ADM' && (
        <div className="adm-menu-container" ref={admMenuRef}>
          <button onClick={() => setShowAdmMenu(prev => !prev)} className="adm-link">
            <FiGitlab size={20} className="icone" />
            <span>Administrativo</span>
          </button>

          {showAdmMenu && (
            <div className="adm-submenu">
              <button onClick={() => history.push('/chave-cadastro')}>Chave de Cadastro</button>
              <button onClick={() => history.push('/empresa-visitantes')}>Cadastrar Empresa</button>
              <button onClick={() => history.push('/funcionarios')}>Gerenciar Funcionários</button>
              <button onClick={() => history.push('/funcionarios/cadastrar')}>Cadastrar Funcionário</button>
              <button onClick={() => history.push('/ponto')}>Bipagem Entrada/Saída</button>
            </div>
          )}
        </div>
      )}

      {(userData.type === 'ADM' || [3, 4, 6].includes(userData.setor_id)) && (
        <button onClick={() => history.push('/agendamentos')} className="agendamentos-link">
          <FiCoffee size={20} className="icone" />
          <span>Agendamentos</span>
        </button>
      )}

      <button onClick={handleOpenConfigModal} className="history-link">
        <FiSettings size={20} className="icone" />
        <span>Configuração</span>
      </button>
    </div>
  );
}
