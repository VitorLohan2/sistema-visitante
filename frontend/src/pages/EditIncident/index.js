// src/pages/EditIncident/index.js
import React, { useState, useEffect } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';

export default function EditIncident() {
  const [form, setForm] = useState({
    nome: '',
    nascimento: '',
    cpf: '',
    empresa: '',
    setor: '',
    telefone: '',
    observacao: '',
    bloqueado: false
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const history = useHistory();
  const { id } = useParams();

  const empresas = ["Dime", "Dimep", "Dime Saúde"];
  const setores = ["Reunião", "Entrega", "Visita"];

  useEffect(() => {
    console.log('userType:', localStorage.getItem('ongType'));
    console.log('ongId:', localStorage.getItem('ongId'));
    // Verifica se é ADM quando o componente carrega
    setIsAdmin(localStorage.getItem('ongType') === 'ADM');
    
    async function loadIncident() {
      try {
        const response = await api.get(`/incidents/${id}`);
        const data = response.data;

        setForm({
          ...data,
          cpf: formatCPF(data.cpf || ''),
          telefone: formatTelefone(data.telefone || ''),
          bloqueado: Boolean(data.bloqueado)
        });
      } catch (err) {
        alert('Erro ao carregar dados do incidente');
        history.push('/profile');
      }
    }

    loadIncident();
  }, [id, history]);

  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : value;
  };

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'nome' ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [name]: newValue }));
  };

  const handleCpfChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setForm(prev => ({ ...prev, cpf: formatted }));
  };

  const handleTelefoneChange = (e) => {
    const formatted = formatTelefone(e.target.value);
    setForm(prev => ({ ...prev, telefone: formatted }));
  };

  // Nova função para lidar com o bloqueio
  const handleBlockChange = async (e) => {
    if (!isAdmin) return;
    
    const novoEstado = e.target.checked;
    
    try {
      await api.put(`/incidents/${id}/block`, 
        { bloqueado: novoEstado },
        { headers: { authorization: localStorage.getItem('ongId') } }
      );
      setForm(prev => ({ ...prev, bloqueado: novoEstado }));
      alert(`Cadastro ${novoEstado ? 'bloqueado' : 'desbloqueado'} com sucesso!`);
    } catch (err) {
      console.error('Erro ao atualizar bloqueio:', err);
      alert(err.response?.data?.error || 'Erro ao atualizar status de bloqueio');
      // Reverte a mudança em caso de erro
      setForm(prev => ({ ...prev, bloqueado: !novoEstado }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cpfClean = form.cpf.replace(/\D/g, '');
    const telefoneClean = form.telefone.replace(/\D/g, '');

    if (cpfClean.length !== 11) {
      return alert('CPF inválido. Deve conter 11 dígitos.');
    }

    if (telefoneClean.length !== 11) {
      return alert('Telefone inválido. Deve conter 11 dígitos com DDD.');
    }

    if (!form.empresa || !form.setor) {
      return alert('Empresa e setor são obrigatórios.');
    }

    const payload = {
      nome: form.nome,
      nascimento: form.nascimento,
      cpf: cpfClean,
      empresa: form.empresa,
      setor: form.setor,
      telefone: telefoneClean,
      observacao: form.observacao
      // Removido o bloqueado do payload principal
    };

    try {
      await api.put(`/incidents/${id}`, payload, {
        headers: {
          authorization: localStorage.getItem('ongId')
        }
      });
      alert('Dados atualizados com sucesso!');
      history.push('/profile');
    } catch (err) {
      console.error('Erro na atualização:', err.response?.data || err);
      alert(err.response?.data?.error || 'Erro ao atualizar incidente');
    }
  };

  return (
    <div className="new-incident-container">
      <div className="content">
        <section>
          <img src={logoImg} alt="Logo" width="350px" />
          <h1>Editar Cadastro</h1>
          <p>Atualize os dados do cadastro.</p>
          <Link className="back-link" to="/profile">
            <FiArrowLeft size={16} color="#e02041" />
            Voltar
          </Link>
        </section>

        <form onSubmit={handleSubmit}>
          <input
            name="nome"
            placeholder="Nome"
            value={form.nome}
            onChange={handleChange}
            required
            disabled={!isAdmin}
          />

          <input
            type="date"
            name="nascimento"
            value={form.nascimento}
            onChange={handleChange}
            required
            disabled={!isAdmin}
          />

          <input
            name="cpf"
            placeholder="CPF"
            value={form.cpf}
            onChange={handleCpfChange}
            maxLength={14}
            required
            disabled={!isAdmin}
          />

          <select
            name="empresa"
            value={form.empresa}
            onChange={handleChange}
            required
          >
            <option value="">Empresa</option>
            {empresas.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>

          <select
            name="setor"
            value={form.setor}
            onChange={handleChange}
            required
          >
            <option value="">Setor</option>
            {setores.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>

          <input
            name="telefone"
            placeholder="(DD)99999-9999"
            value={form.telefone}
            onChange={handleTelefoneChange}
            maxLength={15}
            required
          />

          <div className="checkbox-container">
          <input
            type="checkbox"
            id="bloqueado-checkbox"
            checked={form.bloqueado}
            onChange={handleBlockChange}
            disabled={!isAdmin}
            className={!isAdmin ? 'disabled-checkbox' : ''}
          />
          <label htmlFor="bloqueado-checkbox">
            {form.bloqueado ? '✅ Cadastro Bloqueado' : '⛔ Bloquear Acesso'}
          </label>
        </div>

          <textarea
            name="observacao"
            placeholder="Observações"
            value={form.observacao}
            onChange={handleChange}
          />

          <button className="button" type="submit">
            Atualizar
          </button>
        </form>
      </div>
    </div>
  );
}
