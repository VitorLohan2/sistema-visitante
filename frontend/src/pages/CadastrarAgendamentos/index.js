import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import {
  FiPower, FiSave, FiArrowLeft, FiUser, FiClock, 
  FiHome, FiFileText, FiCalendar
} from 'react-icons/fi';

import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Loading from '../../components/Loading';

import './styles.css';

import logoImg from '../../assets/logo.svg';

export default function NovoAgendamento() {
  const [loading, setLoading] = useState(false);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);
  const history = useHistory();
  
  const { user, logout } = useAuth();
  const ongId = user?.id;
  const ongName = user?.name;

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    setor_id: '',
    horario_agendado: '',
    observacao: ''
  });

  useEffect(() => {
    async function loadSetores() {
      try {
        const response = await api.get('/setores-visitantes');
        setSetoresVisitantes(response.data);
      } catch (error) {
        console.error('Erro ao carregar setores:', error);
      }
    }

    loadSetores();
  }, []);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function formatarCPF(value) {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  function handleCPFChange(e) {
    const value = e.target.value;
    const formattedValue = formatarCPF(value);
    
    setFormData(prev => ({
      ...prev,
      cpf: formattedValue
    }));
  }

  function validarFormulario() {
    const { nome, cpf, setor_id, horario_agendado } = formData;
    
    if (!nome.trim()) {
      alert('Nome é obrigatório');
      return false;
    }

    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      alert('CPF deve ter 11 dígitos');
      return false;
    }

    if (!setor_id) {
      alert('Setor é obrigatório');
      return false;
    }

    if (!horario_agendado) {
      alert('Horário agendado é obrigatório');
      return false;
    }

    // Verificar se o horário não é no passado
    const agora = new Date();
    const horarioSelecionado = new Date(horario_agendado);
    
    if (horarioSelecionado <= agora) {
      alert('O horário agendado deve ser no futuro');
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);

    try {
      const setorSelecionado = setoresVisitantes.find(s => s.id === parseInt(formData.setor_id));
      
      const dadosEnvio = {
        nome: formData.nome.trim(),
        cpf: formData.cpf.replace(/\D/g, ''), // Remove formatação
        setor_id: parseInt(formData.setor_id),
        setor: setorSelecionado?.nome || '',
        horario_agendado: formData.horario_agendado,
        observacao: formData.observacao.trim(),
        criado_por: ongName
      };

      await api.post('/agendamentos', dadosEnvio, {
        headers: { Authorization: ongId }
      });

      alert('Agendamento criado com sucesso!');
      history.push('/agendamentos');
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      const errorMessage = error.response?.data?.error || 'Erro ao criar agendamento';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    if (window.confirm('Tem certeza que deseja sair?')) {
      logout();
    }
  }

  // Calcular data/hora mínima (agora + 1 hora)
  const agora = new Date();
  const minimaData = new Date(agora.getTime() + 60 * 60 * 1000); // +1 hora
  const minimaDataString = minimaData.toISOString().slice(0, 16);

  if (loading) return <Loading progress={100} message="Salvando agendamento..." />;

  return (
    <div className="novo-agendamento-container">
      <header>
        <img src={logoImg} alt="DIME" />
        <span>Bem-vindo(a), {ongName}</span>

        <div className="header-actions">
          <Link to="/agendamentos" className="back-button">
            <FiArrowLeft size={16} />
            Voltar
          </Link>

          <button onClick={handleLogout} type="button">
            <FiPower size={18} color="#e02041" />
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="page-title">
          <FiCalendar size={24} />
          <h1>Novo Agendamento</h1>
        </div>

        <form onSubmit={handleSubmit} className="agendamento-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nome">
                <FiUser size={16} />
                Nome Completo *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Digite o nome completo do visitante"
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cpf">
                <FiUser size={16} />
                CPF *
              </label>
              <input
                type="text"
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={handleCPFChange}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="setor_id">
                <FiHome size={16} />
                Setor *
              </label>
              <select
                id="setor_id"
                name="setor_id"
                value={formData.setor_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Selecione o setor</option>
                {setoresVisitantes.map(setor => (
                  <option key={setor.id} value={setor.id}>
                    {setor.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="horario_agendado">
                <FiClock size={16} />
                Horário Agendado *
              </label>
              <input
                type="datetime-local"
                id="horario_agendado"
                name="horario_agendado"
                value={formData.horario_agendado}
                onChange={handleInputChange}
                min={minimaDataString}
                required
              />
              <small className="form-hint">
                O horário deve ser no futuro
              </small>
            </div>

            <div className="form-group full-width">
              <label htmlFor="observacao">
                <FiFileText size={16} />
                Observação
              </label>
              <textarea
                id="observacao"
                name="observacao"
                value={formData.observacao}
                onChange={handleInputChange}
                placeholder="Informações adicionais sobre o agendamento (opcional)"
                maxLength={500}
                rows={4}
              />
              <small className="form-hint">
                {formData.observacao.length}/500 caracteres
              </small>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/agendamentos" className="cancel-button">
              Cancelar
            </Link>
            <button type="submit" className="save-button" disabled={loading}>
              <FiSave size={16} />
              Salvar Agendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}