import logger from "../../utils/logger";
// src/pages/ListaAgendamentos/index.js
import React, { useState, useEffect, useMemo } from "react";
import {
  FiPlus,
  FiClock,
  FiUser,
  FiHome,
  FiFileText,
  FiCheck,
  FiCalendar,
  FiX,
  FiTrash2,
  FiUserCheck,
  FiRefreshCw,
  FiDownload,
  FiFilter,
  FiSearch,
  FiImage,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import api from "../../services/api";
import { getCache, setCache } from "../../services/cacheService";
import { useAuth } from "../../hooks/useAuth";
import Loading from "../../components/Loading";
import { usePermissoes } from "../../hooks/usePermissoes";
import { useAgendamentos } from "../../contexts/AgendamentoContext";

import "./styles.css";

export default function ListaAgendamentos() {
  // Context
  const {
    agendamentos,
    fetchAgendamentos,
    addAgendamento,
    updateAgendamento,
    removeAgendamento,
    isLoading: contextLoading,
  } = useAgendamentos();

  // Auth e Permissões
  const { user } = useAuth();
  const { temPermissao, papeis } = usePermissoes();
  const ongId = user?.id;
  const ongName = user?.name;
  const userSetorId = user?.setor_id;

  // Verificar se é da Segurança (usado apenas para notificações no menu lateral)
  const isSeguranca =
    papeis.includes("SEGURANÇA") || papeis.includes("SEGURANCA");

  // Permissões baseadas em RBAC - temPermissao() já verifica ADMIN internamente
  const podeCriar = temPermissao("agendamento_criar");
  const podeConfirmar = temPermissao("agendamento_editar");
  const podeExcluir = temPermissao("agendamento_deletar");
  const podeRegistrarPresenca = temPermissao("agendamento_editar");

  // Estados locais
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterDate, setFilterDate] = useState("");

  // Estados do Modal de Cadastro
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    setor_id: "",
    horario_agendado: "",
    observacao: "",
  });
  const [file, setFile] = useState(null);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do Modal de Visualização de Imagem
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Carregar setores para o modal
  useEffect(() => {
    async function loadSetores() {
      try {
        const cachedSetores = getCache("setores");
        if (cachedSetores) {
          setSetoresVisitantes(cachedSetores);
          return;
        }

        const response = await api.get("/setores-visitantes");
        setCache("setores", response.data);
        setSetoresVisitantes(response.data);
      } catch (error) {
        logger.error("Erro ao carregar setores:", error);
      }
    }
    loadSetores();
  }, []);

  // Filtros
  const agendamentosFiltrados = useMemo(() => {
    let filtered = [...agendamentos];

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ag) =>
          ag.nome?.toLowerCase().includes(term) ||
          ag.cpf?.includes(term) ||
          ag.setor?.toLowerCase().includes(term),
      );
    }

    // Filtro por status
    if (filterStatus === "aberto") {
      filtered = filtered.filter((ag) => !ag.confirmado);
    } else if (filterStatus === "confirmado") {
      filtered = filtered.filter((ag) => ag.confirmado && !ag.presente);
    } else if (filterStatus === "presente") {
      filtered = filtered.filter((ag) => ag.presente);
    }

    // Filtro por data
    if (filterDate) {
      filtered = filtered.filter((ag) => {
        const agDate = new Date(ag.horario_agendado)
          .toLocaleDateString("pt-BR")
          .split("/")
          .reverse()
          .join("-");
        return agDate === filterDate;
      });
    }

    return filtered;
  }, [agendamentos, searchTerm, filterStatus, filterDate]);

  // Estatísticas
  const stats = useMemo(
    () => ({
      total: agendamentos.length,
      abertos: agendamentos.filter((ag) => !ag.confirmado).length,
      confirmados: agendamentos.filter((ag) => ag.confirmado && !ag.presente)
        .length,
      presentes: agendamentos.filter((ag) => ag.presente).length,
    }),
    [agendamentos],
  );

  // Handlers
  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("todos");
    setFilterDate("");
  };

  // Formatadores
  const formatarData = (data) => {
    if (!data) return "Data não informada";
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatarDataCriacao = (data) => {
    if (!data) return "Data não informada";
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return "";
    const numbers = cpf.replace(/\D/g, "");
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Handlers do Modal
  const handleOpenModal = () => {
    setFormData({
      nome: "",
      cpf: "",
      setor_id: "",
      horario_agendado: "",
      observacao: "",
    });
    setFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      nome: "",
      cpf: "",
      setor_id: "",
      horario_agendado: "",
      observacao: "",
    });
    setFile(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCPFChange = (e) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, "");
    const formatted = numbers.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4",
    );
    setFormData((prev) => ({ ...prev, cpf: formatted }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      // Validar tipo e tamanho do arquivo
      if (!selectedFile.type.startsWith("image/")) {
        alert("Por favor, selecione apenas arquivos de imagem.");
        e.target.value = ""; // Limpa o input
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        // 5MB
        alert("A imagem deve ter no máximo 5MB.");
        e.target.value = ""; // Limpa o input
        return;
      }

      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  // Handlers do Modal de Imagem
  const handleOpenImageModal = (imageUrl, nome) => {
    setSelectedImage({ url: imageUrl, nome });
    setShowImageModal(true);
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const validarFormulario = () => {
    const { nome, cpf, setor_id, horario_agendado } = formData;

    if (!nome.trim()) {
      alert("Nome é obrigatório");
      return false;
    }

    if (!cpf || cpf.replace(/\D/g, "").length !== 11) {
      alert("CPF deve ter 11 dígitos");
      return false;
    }

    if (!setor_id) {
      alert("Setor é obrigatório");
      return false;
    }

    if (!horario_agendado) {
      alert("Horário agendado é obrigatório");
      return false;
    }

    const agora = new Date();
    const horarioSelecionado = new Date(horario_agendado);

    if (horarioSelecionado <= agora) {
      alert("O horário agendado deve ser no futuro");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    setIsSubmitting(true);

    try {
      const setorSelecionado = setoresVisitantes.find(
        (s) => s.id === parseInt(formData.setor_id),
      );

      const data = new FormData();
      data.append("nome", formData.nome.trim());
      data.append("cpf", formData.cpf.replace(/\D/g, ""));
      data.append("setor_id", parseInt(formData.setor_id));
      data.append("setor", setorSelecionado?.nome || "");
      data.append("horario_agendado", formData.horario_agendado);
      data.append("observacao", formData.observacao.trim());
      data.append("criado_por", ongName);

      // Só adiciona o arquivo se realmente existe e não está vazio
      if (file && file.size > 0 && file.type.startsWith("image/")) {
        data.append("foto_colaborador", file);
      }

      const response = await api.post("/agendamentos", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // O agendamento será adicionado automaticamente via Socket
      // Não precisa adicionar manualmente para evitar duplicação

      handleCloseModal();
      alert("✅ Agendamento criado com sucesso!");
    } catch (error) {
      logger.error("Erro ao criar agendamento:", error);
      alert(error.response?.data?.error || "Erro ao criar agendamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ações nos agendamentos
  const handleConfirmar = async (id) => {
    if (!window.confirm("Confirmar este agendamento?")) return;

    try {
      const response = await api.put(`/agendamentos/${id}/confirmar`, {});

      // Não atualiza localmente - deixa o Socket fazer via listener
      alert("✅ Agendamento confirmado!");
    } catch (error) {
      logger.error("Erro ao confirmar:", error);
      alert(error.response?.data?.error || "Erro ao confirmar agendamento");
    }
  };

  const handleRegistrarPresenca = async (id) => {
    if (!window.confirm("Registrar presença deste visitante?")) return;

    try {
      const response = await api.put(`/agendamentos/${id}/presenca`, {});

      // Não atualiza localmente - deixa o Socket fazer via listener
      alert("✅ Presença registrada!");
    } catch (error) {
      logger.error("Erro ao registrar presença:", error);
      alert(error.response?.data?.error || "Erro ao registrar presença");
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este agendamento?"))
      return;

    try {
      await api.delete(`/agendamentos/${id}`);

      // Não remove localmente - deixa o Socket fazer via listener
      alert("✅ Agendamento excluído!");
    } catch (error) {
      logger.error("Erro ao excluir:", error);
      alert(error.response?.data?.error || "Erro ao excluir agendamento");
    }
  };

  // Exportações
  const exportarExcel = () => {
    const dados = agendamentosFiltrados.map((ag) => ({
      Nome: ag.nome,
      CPF: formatarCPF(ag.cpf),
      Setor: ag.setor,
      "Data Agendada": formatarData(ag.horario_agendado),
      Status: ag.presente
        ? "Presente"
        : ag.confirmado
          ? "Confirmado"
          : "Agendado",
      "Criado por": ag.criado_por,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agendamentos");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `agendamentos_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Agendamentos", 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [["Nome", "CPF", "Setor", "Data", "Status"]],
      body: agendamentosFiltrados.map((ag) => [
        ag.nome,
        formatarCPF(ag.cpf),
        ag.setor,
        formatarData(ag.horario_agendado),
        ag.presente ? "Presente" : ag.confirmado ? "Confirmado" : "Agendado",
      ]),
    });

    doc.save("agendamentos.pdf");
  };

  // Data mínima para agendamento
  const minDateTime = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  // Loading inicial dos dados
  if (contextLoading && agendamentos.length === 0) {
    return <Loading variant="page" message="Carregando agendamentos..." />;
  }

  return (
    <div className="agendamentos-page">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <header className="agendamentos-header">
        <div className="agendamentos-header-content">
          <div className="header-left">
            <h1>
              <FiCalendar className="header-icon" />
              Agendamentos de Visitas
            </h1>
            <p className="header-subtitle">
              Gerencie e acompanhe os agendamentos de visitantes
            </p>
          </div>

          <div className="header-right">
            {podeCriar && (
              <button className="btn-primary" onClick={handleOpenModal}>
                <FiPlus />
                <span>Novo Agendamento</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* STATS CARDS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="agendamentos-stats">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-icon-wrapper blue">
            <FiCalendar />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Em Aberto</span>
            <span className="stat-value">{stats.abertos}</span>
          </div>
          <div className="stat-icon-wrapper yellow">
            <FiAlertCircle />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Confirmados</span>
            <span className="stat-value">{stats.confirmados}</span>
          </div>
          <div className="stat-icon-wrapper green">
            <FiCheckCircle />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Presentes</span>
            <span className="stat-value">{stats.presentes}</span>
          </div>
          <div className="stat-icon-wrapper purple">
            <FiUserCheck />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FILTROS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="agendamentos-filters">
        <div className="filters-left">
          <div className="search-wrapper">
            <FiSearch />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="btn-clear-search"
                onClick={() => setSearchTerm("")}
              >
                <FiX />
              </button>
            )}
          </div>

          <div className="filter-item">
            <FiFilter />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="aberto">Em Aberto</option>
              <option value="confirmado">Confirmados</option>
              <option value="presente">Presentes</option>
            </select>
          </div>

          <div className="filter-item">
            <FiCalendar />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {(searchTerm || filterStatus !== "todos" || filterDate) && (
            <button className="btn-clear-filters" onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
        </div>

        <div className="filters-right">
          <span className="results-count">
            {agendamentosFiltrados.length} agendamento
            {agendamentosFiltrados.length !== 1 ? "s" : ""}
          </span>

          <button
            className="btn-export"
            onClick={exportarExcel}
            title="Exportar Excel"
          >
            <FiDownload />
            <span>Excel</span>
          </button>

          <button
            className="btn-export pdf"
            onClick={exportarPDF}
            title="Exportar PDF"
          >
            <FiDownload />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LISTA DE AGENDAMENTOS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="agendamentos-list">
        {agendamentosFiltrados.length === 0 ? (
          <div className="empty-state">
            <FiCalendar size={48} />
            <h3>Nenhum agendamento encontrado</h3>
            <p>
              {searchTerm || filterStatus !== "todos" || filterDate
                ? "Tente ajustar os filtros de busca"
                : "Clique em 'Novo Agendamento' para criar o primeiro"}
            </p>
          </div>
        ) : (
          agendamentosFiltrados.map((agendamento) => (
            <div
              key={agendamento.id}
              className={`agendamento-card ${agendamento.presente ? "presente" : agendamento.confirmado ? "confirmado" : "aberto"}`}
            >
              {/* Foto do visitante - sempre exibe (com default se não houver) */}
              <div
                className={`agendamento-card-photo ${agendamento.foto_colaborador ? "clickable" : "default-photo"}`}
                onClick={() =>
                  agendamento.foto_colaborador &&
                  handleOpenImageModal(
                    agendamento.foto_colaborador,
                    agendamento.nome,
                  )
                }
                title={
                  agendamento.foto_colaborador
                    ? "Clique para ampliar a imagem"
                    : "Sem foto"
                }
              >
                {agendamento.foto_colaborador ? (
                  <img
                    src={agendamento.foto_colaborador}
                    alt={agendamento.nome}
                  />
                ) : (
                  <div className="default-avatar">
                    <FiUser size={32} />
                  </div>
                )}
              </div>

              {/* Conteúdo principal */}
              <div className="agendamento-card-content">
                <div className="agendamento-agendamento-card-header">
                  <div className="agendamento-card-title-group">
                    <h3>{agendamento.nome}</h3>
                    <span className="agendamento-card-cpf">
                      {formatarCPF(agendamento.cpf)}
                    </span>
                  </div>

                  <div className="agendamento-card-status">
                    <span
                      className={`status-badge ${agendamento.presente ? "presente" : agendamento.confirmado ? "confirmado" : "aberto"}`}
                    >
                      {agendamento.presente
                        ? "Presente"
                        : agendamento.confirmado
                          ? "Confirmado"
                          : "Agendado"}
                    </span>
                  </div>
                </div>

                <div className="agendamento-card-info-grid">
                  <div className="info-item">
                    <FiHome className="info-icon" />
                    <div>
                      <span className="info-label">Setor</span>
                      <span className="info-value">{agendamento.setor}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <FiClock className="info-icon" />
                    <div>
                      <span className="info-label">Data/Hora</span>
                      <span className="info-value">
                        {formatarData(agendamento.horario_agendado)}
                      </span>
                    </div>
                  </div>

                  <div className="info-item">
                    <FiCalendar className="info-icon" />
                    <div>
                      <span className="info-label">Criado em</span>
                      <span className="info-value">
                        {formatarDataCriacao(agendamento.criado_em)}
                      </span>
                    </div>
                  </div>

                  <div className="info-item">
                    <FiUser className="info-icon" />
                    <div>
                      <span className="info-label">Criado por</span>
                      <span className="info-value">
                        {agendamento.criado_por}
                      </span>
                    </div>
                  </div>

                  {agendamento.confirmado && (
                    <div className="info-item">
                      <FiCheck className="info-icon" />
                      <div>
                        <span className="info-label">Confirmado por</span>
                        <span className="info-value">
                          {agendamento.confirmado_por}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {agendamento.observacao && (
                  <div className="agendamento-card-observacao">
                    <FiFileText className="info-icon" />
                    <span>{agendamento.observacao}</span>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="agendamento-card-actions">
                {!agendamento.confirmado && podeConfirmar && (
                  <button
                    className="btn-action confirmar"
                    onClick={() => handleConfirmar(agendamento.id)}
                    title="Confirmar agendamento"
                  >
                    <FiCheck />
                    <span>Confirmar</span>
                  </button>
                )}

                {agendamento.confirmado &&
                  !agendamento.presente &&
                  podeRegistrarPresenca && (
                    <button
                      className="btn-action presenca"
                      onClick={() => handleRegistrarPresenca(agendamento.id)}
                      title="Registrar presença"
                    >
                      <FiUserCheck />
                      <span>Presença</span>
                    </button>
                  )}

                {podeExcluir && (
                  <button
                    className="btn-action excluir"
                    onClick={() => handleExcluir(agendamento.id)}
                    title="Excluir agendamento"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - NOVO AGENDAMENTO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FiCalendar />
                Novo Agendamento
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nome">
                    <FiUser /> Nome Completo *
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Digite o nome completo"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cpf">
                    <FiUser /> CPF *
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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="setor_id">
                    <FiHome /> Setor *
                  </label>
                  <select
                    id="setor_id"
                    name="setor_id"
                    value={formData.setor_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o setor</option>
                    {setoresVisitantes.map((setor) => (
                      <option key={setor.id} value={setor.id}>
                        {setor.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="horario_agendado">
                    <FiClock /> Horário Agendado *
                  </label>
                  <input
                    type="datetime-local"
                    id="horario_agendado"
                    name="horario_agendado"
                    value={formData.horario_agendado}
                    onChange={handleInputChange}
                    min={minDateTime}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="observacao">
                  <FiFileText /> Observação
                </label>
                <textarea
                  id="observacao"
                  name="observacao"
                  value={formData.observacao}
                  onChange={handleInputChange}
                  placeholder="Informações adicionais (opcional)"
                  maxLength={500}
                  rows={3}
                />
                <small className="char-count">
                  {formData.observacao.length}/500
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="file">
                  <FiImage /> Foto do Visitante (opcional)
                </label>
                <input
                  type="file"
                  id="file"
                  name="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleFileChange}
                />
                {file && (
                  <div className="file-info">
                    <span className="file-name">📄 {file.name}</span>
                    <small className="file-size">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </small>
                  </div>
                )}
                <small className="form-help">
                  Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 5MB.
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="btn-spinner"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <FiPlus />
                      Criar Agendamento
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - VISUALIZAÇÃO DE IMAGEM */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showImageModal && selectedImage && (
        <div className="modal-overlay" onClick={handleCloseImageModal}>
          <div
            className="image-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="image-modal-header">
              <h3>📷 Foto - {selectedImage.nome}</h3>
            </div>

            <div className="image-modal-content">
              <img
                src={selectedImage.url}
                alt={selectedImage.nome}
                className="image-modal-img"
              />
            </div>

            <div className="image-modal-footer">
              <button
                className="btn-secondary"
                onClick={() => window.open(selectedImage.url, "_blank")}
              >
                🔗 Abrir em nova aba
              </button>
              <button className="btn-primary" onClick={handleCloseImageModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
