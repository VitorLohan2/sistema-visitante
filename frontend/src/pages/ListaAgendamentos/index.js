import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import {
  FiPlus, FiClock, FiUser, FiBuilding, 
  FiFileText, FiCheck, FiArrowLeft, FiCalendar,
  FiX, FiEdit, FiTrash2, FiUserCheck
} from 'react-icons/fi';

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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
  const userSetorId = user?.setor_id;
  const userType = user?.type;

  const userPodeCriar = user?.type === "ADM" && userSetorId === 6;
  const userPodeConfirmar = userType === 'ADM' || userSetorId === 4; 
  const userPodeExcluir = userType === 'ADM'; // Apenas ADMs podem excluir
  
  useEffect(() => {
    loadAgendamentos();
  }, []); // ✅ Removi ongId da dependência pois não é mais necessário

  async function loadAgendamentos() {
    try {
      setLoading(true);
      // ✅ REQUISIÇÃO PÚBLICA - sem header de autorização
      const response = await api.get('/agendamentos');
      
      setAgendamentos(response.data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      alert('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }

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

  function formatarCPF(cpf) {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  async function handleConfirmarAgendamento(id) {
    if (!window.confirm('Confirmar este agendamento?')) {
      return;
    }

    try {
      // ✅ REQUISIÇÃO AUTENTICADA - com header de autorização
      const response = await api.put(`/agendamentos/${id}/confirmar`, {}, {
        headers: { Authorization: ongId }
      });

      // ✅ Atualizar apenas o agendamento confirmado
      setAgendamentos(agendamentos.map(ag => 
        ag.id === id ? { ...ag, ...response.data.agendamento } : ag
      ));
      
      alert('Agendamento confirmado com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      
      let errorMessage = 'Erro ao confirmar agendamento';
      if (error.response) {
        switch (error.response.status) {
          case 403:
            errorMessage = 'Somente Segurança e Administradores podem confirmar agendamentos';
            break;
          case 401:
            errorMessage = 'Não autorizado. Faça login novamente.';
            break;
          case 404:
            errorMessage = 'Agendamento não encontrado';
            break;
          case 400:
            errorMessage = error.response.data?.error || 'Agendamento já confirmado';
            break;
          default:
            errorMessage = error.response.data?.error || errorMessage;
        }
      }
      
      alert(errorMessage);
    }
  }

  async function handleExcluirAgendamento(id) {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      return;
    }

    try {
      // ✅ REQUISIÇÃO AUTENTICADA - com header de autorização
      await api.delete(`/agendamentos/${id}`, {
        headers: { Authorization: ongId }
      });

      setAgendamentos(agendamentos.filter(agendamento => agendamento.id !== id));
      alert('Agendamento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      
      let errorMessage = 'Erro ao excluir agendamento';
      if (error.response) {
        switch (error.response.status) {
          case 403:
            errorMessage = 'Somente Administradores podem excluir agendamentos';
            break;
          case 401:
            errorMessage = 'Não autorizado. Faça login novamente.';
            break;
          default:
            errorMessage = error.response.data?.error || errorMessage;
        }
      }
      
      alert(errorMessage);
    }
  }

  async function handleRegistrarPresenca(id) {
  if (!window.confirm('Registrar presença deste visitante?')) return;

  try {
    const response = await api.put(`/agendamentos/${id}/presenca`, {}, {
      headers: { Authorization: ongId }
    });

    setAgendamentos(agendamentos.map(ag => 
      ag.id === id ? { ...ag, ...response.data.agendamento } : ag
    ));

    alert('Presença registrada com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar presença:', error);
    alert(error.response?.data?.error || 'Erro ao registrar presença');
  }
  }

  // 📌 NOVAS FUNÇÕES DE EXPORTAÇÃO
  function exportarExcel() {
    // 🔎 Filtrar apenas os presentes
    const presentes = agendamentos.filter(ag => ag.presente);

    if (presentes.length === 0) {
      alert("Nenhum agendamento com presença para exportar.");
      return;
    }

    const dados = presentes.map(ag => ({
      Nome: ag.nome,
      CPF: formatarCPF(ag.cpf),
      Setor: ag.setor,
      'Data Agendada': formatarData(ag.horario_agendado),
      Status: ag.confirmado ? "Confirmado" : "Agendado",
      Presença: "Presente"
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agendamentos");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), "agendamentos_presentes.xlsx");
  }


  function exportarPDF() {
    const presentes = agendamentos.filter(ag => ag.presente);

    if (presentes.length === 0) {
      alert("Nenhum agendamento com presença para exportar.");
      return;
    }

    const doc = new jsPDF();
    doc.text("Relatório de Presenças", 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [["Nome", "CPF", "Setor", "Data Agendada", "Status", "Presença"]],
      body: presentes.map(ag => [
        ag.nome,
        formatarCPF(ag.cpf),
        ag.setor,
        formatarData(ag.horario_agendado),
        ag.confirmado ? "Confirmado" : "Agendado",
        "Presente"
      ])
    });

    doc.save("presencas.pdf");
  }

  console.log("Setor ID:", userSetorId, "Type:", userType);

  if (loading) return <Loading progress={100} message="Carregando agendamentos..." />;

  return (
    <div className="agendamentos-container">
      <header>
        <div className="ajuste-Titulo">
        <img src={logoImg} alt="DIME" />
        <span>Bem-vindo(a), {ongName}</span>
        </div>

        <div className="header-actions">
          {ongId && userPodeCriar && (
            <Link className="button" to="/agendamentos/novo">
              <FiPlus size={16} />
              Novo Agendamento
            </Link>
          )}

          <Link className="back-link" to="/profile">
            <FiArrowLeft size={16} color="#E02041" />
            Voltar
          </Link>
        </div>
      </header>

      <div className="page-content">
        <div className="page-title">
          <FiCalendar size={24} />
          <h1>Agendamentos de Visitas</h1>
          <span className="badge">{agendamentos.length} agendamentos</span>

            <div className="export-buttons">
              <button 
                onClick={exportarExcel} 
                className="export-button excel"
              >
                <FiFileText size={16} />
                Excel
              </button>
              
              <button 
                onClick={exportarPDF} 
                className="export-button pdf"
              >
                <FiFileText size={16} />
                PDF
              </button>
            </div>
        </div>

        {agendamentos.length === 0 ? (
          <div className="empty-state">
            <FiCalendar size={48} color="#ddd" />
            <p>Nenhum agendamento encontrado</p>
            {ongId && ( // ✅ Mostrar apenas se estiver logado
              <Link to="/agendamentos/novo" className="button">
                Criar Primeiro Agendamento
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="agendamentos-header">
              <p>Total de {agendamentos.length} agendamento(s)</p>
              {!ongId && ( // ✅ Mensagem para usuários não logados
                <p className="info-text">Faça login para gerenciar agendamentos</p>
              )}
            </div>

            <div className="agendamentos-grid">
              {agendamentos.map(agendamento => (
              <div key={agendamento.id} className="agendamento-card">
                <div className="card-main-content">
                  <div className="card-left-section">
                    <div className="card-header-lista-agendamentos">
                      <div className="card-title">
                        <FiUser size={20} />
                        <h3>{agendamento.nome}</h3>
                      </div>
                      <div className="card-time">
                        <FiClock size={16} /> 
                        <span>{formatarData(agendamento.horario_agendado)}</span>
                      </div>
                    </div>

                    {/* Foto logo abaixo do header */}
                    {agendamento.foto_colaborador && (
                      <div className="card-photo">
                        <img src={agendamento.foto_colaborador} alt={agendamento.nome} />
                      </div>
                    )}
                  </div>

                  <div className="card-body">
                    <div className="card-agend-info">
                      <div className="info-item">
                        <span className="info-label">CPF</span>
                        <span className="info-value">{formatarCPF(agendamento.cpf)}</span>
                      </div>
                      
                      <div className="info-item">
                        <span className="info-label">Setor</span>
                        <span className="info-value">{agendamento.setor}</span>
                      </div>
                      
                      <div className="info-item">
                        <span className="info-label">Criado por</span>
                        <span className="info-value">{agendamento.criado_por}</span>
                      </div>

                      <div className="info-item">
                        <span className="info-label">Status</span>
                        <span className={`status-badge ${agendamento.confirmado ? 'confirmed' : 'scheduled'}`}>
                          {agendamento.confirmado ? 'Confirmado' : 'Agendado'}
                        </span>
                      </div>

                      {agendamento.confirmado && (
                        <>
                          <div className="info-item">
                            <span className="info-label">Confirmado por</span>
                            <span className="info-value">{agendamento.confirmado_por}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Confirmado em</span>
                            <span className="info-value">{formatarData(agendamento.confirmado_em)}</span>
                          </div>
                        </>
                      )}

                      <div className="info-item">
                        <span className="info-label">Presença</span>
                        <span className={`status-badge ${agendamento.presente ? 'present' : 'absent'}`}>
                          {agendamento.presente ? 'Presente' : 'Não compareceu'}
                        </span>
                      </div>

                      {agendamento.presente && (
                        <>
                          <div className="info-item">
                            <span className="info-label">Registrado por</span>
                            <span className="info-value">{agendamento.presente_por}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Registrado em</span>
                            <span className="info-value">{formatarData(agendamento.presente_em)}</span>
                          </div>
                        </>
                      )}

                      {agendamento.observacao && (
                        <div className="info-item observacao">
                          <span className="info-label">Observação</span>
                          <span className="info-value">{agendamento.observacao}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card-status-actions">
                  {userPodeConfirmar && agendamento.confirmado && !agendamento.presente && (
                    <button 
                      onClick={() => handleRegistrarPresenca(agendamento.id)}
                      className="presence-button"
                      title="Registrar presença"
                    >
                      <FiUserCheck size={16} />
                      Presença
                    </button>
                  )}

                  {ongId && (
                    <div className="card-status-actions">
                      {userPodeConfirmar && !agendamento.confirmado && (
                        <button 
                          onClick={() => handleConfirmarAgendamento(agendamento.id)}
                          className="confirm-button"
                          title="Confirmar agendamento"
                        >
                          <FiCheck size={16} />
                          Confirmar
                        </button>
                      )}

                      {userPodeExcluir && (
                        <button 
                          onClick={() => handleExcluirAgendamento(agendamento.id)}
                          className="delete-button"
                          title="Excluir agendamento"
                        >
                          <FiTrash2 size={16} />
                          Excluir
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}