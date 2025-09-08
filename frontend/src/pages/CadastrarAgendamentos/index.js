import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import {
  FiPower, FiSave, FiArrowLeft, FiUser, FiClock, 
  FiHome, FiFileText, FiCalendar, FiImage
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

  const [file, setFile] = useState(null); // 🔹 novo estado para imagem

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
    const numbers = value.replace(/\D/g, '');
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

  function handleFileChange(e) {
    setFile(e.target.files[0]); // apenas 1 imagem
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
      
      // 🔹 montar FormData
      const data = new FormData();
      data.append('nome', formData.nome.trim());
      data.append('cpf', formData.cpf.replace(/\D/g, ''));
      data.append('setor_id', parseInt(formData.setor_id));
      data.append('setor', setorSelecionado?.nome || '');
      data.append('horario_agendado', formData.horario_agendado);
      data.append('observacao', formData.observacao.trim());
      data.append('criado_por', ongName);

      if (file) {
        data.append('foto_colaborador', file); // 🔹 adiciona imagem
      }

      console.log('Enviando FormData:', Object.fromEntries(data)); // DEBUG

     await api.post('/agendamentos', data, {
      headers: { Authorization: ongId }
      });

      alert('Agendamento criado com sucesso!');
      history.push('/agendamentos');
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      
      let errorMessage = 'Erro ao criar agendamento';
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = error.response.data.error || 'Dados inválidos';
        } else if (error.response.status === 401) {
          errorMessage = 'Não autorizado. Faça login novamente.';
        } else if (error.response.status === 500) {
          errorMessage = 'Erro interno do servidor';
        }
      }
      
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

  const agora = new Date();
  const minimaData = new Date(agora.getTime() + 60 * 60 * 1000);
  const minimaDataString = minimaData.toISOString().slice(0, 16);

  if (loading) return <Loading progress={100} message="Salvando agendamento..." />;

  return (
    <div className="novo-agendamento-container">
      <header>
        <div className="ajuste-Titulo">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {ongName}</span>
        </div>

        <Link className="back-link" to="/agendamentos">
        <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link> 
      </header>

      <div className="page-content">
        <div className="page-title">
          <FiCalendar size={24} />
          <h1>Novo Agendamento</h1>
        </div>

        <form onSubmit={handleSubmit} className="agendamento-form" encType="multipart/form-data">
          <div className="form-grid">
            {/* Nome */}
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

            {/* CPF */}
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

            {/* Setor */}
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

            {/* Horário */}
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

            {/* Observação */}
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

            {/* Upload da imagem */}
            <div className="form-group full-width">
              <label htmlFor="file">
                <FiImage size={16} />
                Foto do Colaborador (opcional)
              </label>
              <input 
                type="file" 
                id="file" 
                name="file"
                accept="image/*"
                onChange={handleFileChange}
              />
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
