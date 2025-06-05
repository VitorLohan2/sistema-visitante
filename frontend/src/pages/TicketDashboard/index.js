// src/pages/TicketDashboard/index.js
import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiArrowLeft, FiPlusCircle } from 'react-icons/fi';
import RippleButton from '../../components/RippleButton';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import api from '../../services/api';

import './styles.css';
import logoImg from '../../assets/logo.svg';
import excel from '../../assets/xlss.png';

const TicketDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [userData, setUserData] = useState({ nome: '', setor: '' });
  const [filterDate, setFilterDate] = useState('');
  const history = useHistory();

  
  useEffect(() => {
    const ongId = localStorage.getItem('ongId');

    const fetchTickets = async () => {
      try {
        const user = await api.get(`/ongs/${ongId}`);
        setUserData({
          nome: user.data.name,
          setor: user.data.setor
        });

        const response = await api.get('/tickets', {
          headers: { Authorization: ongId }
        });

        const sorted = response.data.sort((a, b) =>
          new Date(b.data_criacao) - new Date(a.data_criacao)
        );

        setTickets(sorted);
        setFilteredTickets(sorted);
      } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        alert('Erro ao carregar tickets. Verifique sua conexão.');
      }
    };

    // Chamada inicial
    fetchTickets();

    // Atualização a cada 5 segundos
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filtra os tickets pela data selecionada
  useEffect(() => {
    if (!filterDate) {
      setFilteredTickets(tickets);
      return;
    }

    const filtered = tickets.filter(ticket => {
      const ticketDate = new Date(ticket.data_criacao).toLocaleDateString('pt-BR').split('/').reverse().join('-');
      return ticketDate === filterDate;
    });

    setFilteredTickets(filtered);
  }, [filterDate, tickets]);

  const handleChangeStatus = async (ticketId, newStatus) => {
    if (!ticketId || !newStatus) {
      alert('Dados inválidos para atualização');
      return;
    }

    try {
      const response = await api.put(`/tickets/${Number(ticketId)}`, 
        { status: newStatus },
        {
          headers: { 
            Authorization: localStorage.getItem('ongId'),
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 200) {
        setTickets(prev => prev.map(t => 
          t.id === ticketId ? {...t, status: newStatus} : t
        ));
        setFilteredTickets(prev => prev.map(t => 
          t.id === ticketId ? {...t, status: newStatus} : t
        ));
      }
    } catch (err) {
      console.error('Erro completo:', err);
      alert(`Erro: ${err.response?.data?.message || 'Falha na atualização'}`);
    }
  };

  const statusLabels = ['Aberto', 'Em andamento', 'Resolvido'];

  const handleNavigateToCreateTicket = () => {
    history.push('/tickets');
  };

  // Função para exportar para Excel
  const exportToExcel = () => {
    const dataToExport = filteredTickets.map(ticket => ({
      'Criado por': ticket.nome_usuario,
      'Setor': ticket.setor_usuario,
      'Funcionário': ticket.funcionario,
      'Motivo': ticket.motivo,
      'Descrição': ticket.descricao,
      'Setor Responsável': ticket.setor_responsavel,
      'Status': ticket.status,
      'Data': new Date(ticket.data_criacao).toLocaleString('pt-BR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `tickets_${filterDate || 'todos'}.xlsx`);
  };

  return (
    <div className="ticket-dashboard">
      <header>
        <div className="ajuste-Titulo">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {userData.nome}</span>
        </div>
        <Link className="back-link" to="/profile">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <div className="ticket-header">
        <div className="left-buttons">
          <button 
            onClick={handleNavigateToCreateTicket}
            className="tickets-link">
            <FiPlusCircle size={20} className="icone" />
            <span>Criar Ticket</span>
          </button>

          <RippleButton 
            onClick={exportToExcel}
            className="report-button">
            <img src={excel} alt="Excel" className="excel-icon" />
            Gerar Relatório
          </RippleButton>
        </div>   

        <div className="date-filter">
          <label>
            Filtrar por data:
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="kanban-board">
        {statusLabels.map(status => (
          <div className="kanban-column" key={status}>
            <div className="header-wrapper">
              <h2>{status}</h2>
            </div>
            <div className="ticket-list">
              {filteredTickets
                .filter(ticket => ticket.status === status)
                .map(ticket => (
                  <div className={`ticket-card ${status.toLowerCase()}`} key={ticket.id}>
                    <strong>Criado por:</strong>
                    <p className="destaque-usuario">{ticket.nome_usuario}</p>

                    <strong>Setor:</strong>
                    <p className="destaque-usuario">{ticket.setor_usuario}</p>
                    
                    <strong>Funcionário:</strong>
                    <p>{ticket.funcionario}</p>

                    <strong>Motivo:</strong>
                    <p>{ticket.motivo}</p>

                    <strong>Descrição:</strong>
                    <p>{ticket.descricao}</p>

                    <strong>Setor (Verificação):</strong>
                    <p className="destaque-usuario">{ticket.setor_responsavel}</p>

                    <strong>Data:</strong>
                    <p>{new Date(ticket.data_criacao).toLocaleString('pt-BR')}</p>

                    {userData.setor === 'Segurança' && (
                      <select
                        value={ticket.status}
                        onChange={(e) => handleChangeStatus(ticket.id, e.target.value)}
                        className="status-select"
                        disabled={ticket.status === 'Resolvido'}
                      >
                        {statusLabels.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketDashboard;