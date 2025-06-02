// src/pages/Ticket/index.js
import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

import './styles.css';
import api from '../../services/api';

import logoImg from '../../assets/logo.svg';

const TicketPage = () => {
  const history = useHistory();

  const [formData, setFormData] = useState({
    funcionario: '',
    motivo: '',
    descricao: '',
    setorResponsavel: '',
  });

  const [userData, setUserData] = useState({
    nome: '',
    setor: '',
    id: ''
  });

  // Carrega os dados do usuário ao montar o componente
    useEffect(() => {
    const loadUserData = async () => {
        try {
        const ongId = localStorage.getItem('ongId');
        const response = await api.get(`/ongs/${ongId}`);

        setUserData({
            nome: response.data.name,
            setor: response.data.setor,
            id: response.data.id
        });
        } catch (error) {
        console.error('Erro ao carregar dados da ONG:', error);
        setUserData({
            nome: 'Erro ao carregar',
            setor: 'Erro ao carregar',
            id: ''
        });
        }
    };
        loadUserData();
    }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const ongId = localStorage.getItem('ongId');

    // Validação básica dos campos
    if (!formData.funcionario || !formData.motivo || !formData.descricao || !formData.setorResponsavel) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

        try {
            const response = await api.post(
        '/tickets',
        {
            ...formData,
            nomeUsuario: userData.nome,
            setorUsuario: userData.setor
        },  
        {  
        headers: {
        Authorization: ongId
        }
        }
        );

      alert(`✅ Ticket criado por ${userData.nome} com ID: ${response.data.id}`);

      // Reseta o formulário após sucesso
      setFormData({
        funcionario: '',
        motivo: '',
        descricao: '',
        setorResponsavel: '',
      });

      // ✅ Redirecionamento usando useHistory
      history.push('/ticket-dashboard');

    } catch (err) {
      console.error('Erro ao criar ticket:', err);
      alert('❌ Erro ao criar ticket. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className="ticket-page">
      <header className="header-container">
        <div className="header-left">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {userData.nome}</span>
        </div>
        <Link className="back-link" to="/ticket-dashboard">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <section className="ticket-content">
        <h1>Abrir novo Ticket</h1>
        <form onSubmit={handleSubmit} className="ticket-form">
          <div className="form-group">
            <label>Usuário:</label>
            <input type="text" value={userData.nome} disabled />
          </div>

          <div className="form-group">
            <label>Setor:</label>
            <input type="text" value={userData.setor} disabled />
          </div>

          <div className="form-group">
            <label>Funcionário envolvido:</label>
            <input
              type="text"
              name="funcionario"
              value={formData.funcionario}
              onChange={handleChange}
              required
              placeholder="Nome do funcionário envolvido"
            />
          </div>

          <div className="form-group">
            <label>Motivo:</label>
            <select
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um motivo</option>
              <option value="Saída antecipada">Saída antecipada</option>
              <option value="Saída com objeto">Saída com objeto</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="form-group">
            <label>Descrição:</label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              required
              placeholder="Descreva o ocorrido com detalhes"
              rows={5}
            />
          </div>

          <div className="form-group">
            <label>Setor Responsável:</label>
            <select
              name="setorResponsavel"
              value={formData.setorResponsavel}
              onChange={handleChange}
              required
            >
              <option value="">Selecione o setor responsável</option>
              <option value="Segurança">Segurança</option>
              {/*<option value="Administração">Administração</option>*/}
            </select>
          </div>

          <button type="submit" className="submit-button">Abrir Ticket</button>
        </form>
      </section>
    </div>
  );
};

export default TicketPage;