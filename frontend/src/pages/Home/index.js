// src/pages/Home/index.js
import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiSend,
  FiActivity,
  FiZap,
  FiStar,
  FiGitCommit,
  FiPlus,
  FiX,
  FiTrash2,
  FiEdit,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { usePermissoes } from "../../hooks/usePermissoes";
import MenuDaBarraLateral from "../../components/MenuDaBarraLateral";
import api from "../../services/api";
import "./styles.css";

export default function Home() {
  const history = useHistory();
  const { user } = useAuth();
  const { temPermissao, isAdmin } = usePermissoes();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [patchNotes, setPatchNotes] = useState([]);
  const [loadingPatchNotes, setLoadingPatchNotes] = useState(true);

  // Estados para o modal de criar/editar patch note
  const [showPatchNoteModal, setShowPatchNoteModal] = useState(false);
  const [editingPatchNote, setEditingPatchNote] = useState(null);
  const [savingPatchNote, setSavingPatchNote] = useState(false);
  const [patchNoteForm, setPatchNoteForm] = useState({
    versao: "",
    titulo: "",
    descricao: "",
    tipo: "improvement",
    data_lancamento: new Date().toISOString().split("T")[0],
  });

  // Status do sistema (pode ser obtido de uma API no futuro)
  const [systemStatus] = useState({
    status: "ONLINE",
    uptime: "99.9%",
    lastUpdate: "15/01/2026",
  });

  // Busca as atualizações do sistema da API
  const fetchPatchNotes = async () => {
    try {
      const response = await api.get("/patch-notes");
      setPatchNotes(response.data);
    } catch (err) {
      console.error("Erro ao buscar atualizações:", err);
      setPatchNotes([]);
    } finally {
      setLoadingPatchNotes(false);
    }
  };

  useEffect(() => {
    fetchPatchNotes();
  }, []);

  // Atualiza o relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Formata a data
  const formatDate = (date) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("pt-BR", options);
  };

  // Formata o horário
  const formatTime = (date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Envia feedback por email
  const handleSendFeedback = async () => {
    if (!feedback.trim()) return;

    setSendingFeedback(true);
    try {
      await api.post("/feedback/enviar", {
        mensagem: feedback,
        usuario_nome: user?.nome,
        usuario_email: user?.email,
      });

      setFeedbackSent(true);
      setFeedback("");
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      console.error("Erro ao enviar feedback:", err);
      alert("Erro ao enviar feedback. Tente novamente.");
    } finally {
      setSendingFeedback(false);
    }
  };

  // Saudação baseada no horário
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Ícone do tipo de atualização
  const getUpdateIcon = (type) => {
    switch (type) {
      case "feature":
        return <FiStar className="update-icon feature" />;
      case "improvement":
        return <FiZap className="update-icon improvement" />;
      case "fix":
        return <FiGitCommit className="update-icon fix" />;
      default:
        return <FiGitCommit className="update-icon" />;
    }
  };

  // Abre modal para criar novo patch note
  const handleOpenCreateModal = () => {
    setEditingPatchNote(null);
    setPatchNoteForm({
      versao: "",
      titulo: "",
      descricao: "",
      tipo: "improvement",
      data_lancamento: new Date().toISOString().split("T")[0],
    });
    setShowPatchNoteModal(true);
  };

  // Abre modal para editar patch note
  const handleOpenEditModal = (note) => {
    setEditingPatchNote(note);
    setPatchNoteForm({
      versao: note.versao,
      titulo: note.titulo,
      descricao: note.descricao,
      tipo: note.tipo,
      data_lancamento:
        note.data_lancamento?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
    });
    setShowPatchNoteModal(true);
  };

  // Fecha o modal
  const handleCloseModal = () => {
    setShowPatchNoteModal(false);
    setEditingPatchNote(null);
  };

  // Salva patch note (criar ou editar)
  const handleSavePatchNote = async () => {
    if (
      !patchNoteForm.versao ||
      !patchNoteForm.titulo ||
      !patchNoteForm.descricao
    ) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setSavingPatchNote(true);
    try {
      if (editingPatchNote) {
        await api.put(`/patch-notes/${editingPatchNote.id}`, patchNoteForm);
      } else {
        await api.post("/patch-notes", patchNoteForm);
      }
      await fetchPatchNotes();
      handleCloseModal();
    } catch (err) {
      console.error("Erro ao salvar atualização:", err);
      alert(err.response?.data?.error || "Erro ao salvar atualização.");
    } finally {
      setSavingPatchNote(false);
    }
  };

  // Deleta patch note
  const handleDeletePatchNote = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta atualização?")) {
      return;
    }

    try {
      await api.delete(`/patch-notes/${id}`);
      await fetchPatchNotes();
    } catch (err) {
      console.error("Erro ao excluir atualização:", err);
      alert("Erro ao excluir atualização.");
    }
  };

  return (
    <div className="home-container">
      <MenuDaBarraLateral />

      <main className="home-content">
        {/* Header com saudação */}
        <header className="home-header">
          <div className="greeting-section">
            <h1>
              {getGreeting()},{" "}
              <span className="user-name">{user?.nome?.split(" ")[0]}</span>
            </h1>
            <p className="greeting-subtitle">
              Bem-vindo ao Sistema de Gestão de Visitantes
            </p>
          </div>

          {/* Relógio Digital */}
          <div className="clock-widget">
            <div className="clock-time">{formatTime(currentTime)}</div>
            <div className="clock-date">{formatDate(currentTime)}</div>
          </div>
        </header>

        {/* Grid de Cards */}
        <div className="home-grid">
          {/* Status do Sistema */}
          <div className="home-card status-card">
            <div className="card-header">
              <FiActivity size={20} />
              <h3>Status do Sistema</h3>
            </div>
            <div className="status-content">
              <div
                className={`status-indicator ${systemStatus.status.toLowerCase()}`}
              >
                {systemStatus.status === "ONLINE" ? (
                  <FiCheckCircle size={24} />
                ) : (
                  <FiAlertTriangle size={24} />
                )}
                <span className="status-text">{systemStatus.status}</span>
              </div>
              <div className="status-details">
                <div className="status-item">
                  <span className="label">Disponibilidade</span>
                  <span className="value">{systemStatus.uptime}</span>
                </div>
                <div className="status-item">
                  <span className="label">Última Atualização</span>
                  <span className="value">{systemStatus.lastUpdate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Atualizações / Patch Notes */}
          <div className="home-card updates-card">
            <div className="card-header">
              <FiZap size={20} />
              <h3>Atualizações do Sistema</h3>
              {(isAdmin || temPermissao("patch_notes_gerenciar")) && (
                <button
                  className="add-patch-note-btn"
                  onClick={handleOpenCreateModal}
                  title="Adicionar Atualização"
                >
                  <FiPlus size={18} />
                </button>
              )}
            </div>
            <div className="updates-list">
              {loadingPatchNotes ? (
                <div className="loading-updates">
                  Carregando atualizações...
                </div>
              ) : patchNotes.length === 0 ? (
                <div className="no-updates">Nenhuma atualização disponível</div>
              ) : (
                patchNotes.map((note, index) => (
                  <div key={note.id || index} className="update-item">
                    {getUpdateIcon(note.tipo)}
                    <div className="update-content">
                      <div className="update-header">
                        <span className="update-version">v{note.versao}</span>
                        <span className="update-date">
                          {new Date(note.data_lancamento).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                        {(isAdmin || temPermissao("patch_notes_gerenciar")) && (
                          <div className="update-actions">
                            <button
                              className="update-action-btn edit"
                              onClick={() => handleOpenEditModal(note)}
                              title="Editar"
                            >
                              <FiEdit size={14} />
                            </button>
                            <button
                              className="update-action-btn delete"
                              onClick={() => handleDeletePatchNote(note.id)}
                              title="Excluir"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <h4 className="update-title">{note.titulo}</h4>
                      <p className="update-description">{note.descricao}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Feedback / Ideias */}
          <div className="home-card feedback-card">
            <div className="card-header">
              <FiSend size={20} />
              <h3>Envie sua Ideia</h3>
            </div>
            <div className="feedback-content">
              <p className="feedback-description">
                Ajude-nos a melhorar! Compartilhe suas sugestões e ideias para
                novas funcionalidades.
              </p>
              <textarea
                className="feedback-textarea"
                placeholder="Descreva sua ideia ou sugestão de melhoria..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                disabled={sendingFeedback}
              />
              <button
                className="feedback-btn"
                onClick={handleSendFeedback}
                disabled={!feedback.trim() || sendingFeedback}
              >
                {sendingFeedback ? (
                  <>
                    <span className="btn-spinner"></span>
                    Enviando...
                  </>
                ) : feedbackSent ? (
                  <>
                    <FiCheckCircle size={16} />
                    Enviado com Sucesso!
                  </>
                ) : (
                  <>
                    <FiSend size={16} />
                    Enviar Feedback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer com versão */}
        <footer className="home-footer">
          <p>
            Sistema de Gestão de Visitantes • Versão 2.5.0 •{" "}
            {new Date().getFullYear()}
          </p>
        </footer>
      </main>

      {/* Modal para criar/editar Patch Note */}
      {showPatchNoteModal && (
        <div className="patch-note-modal-overlay" onClick={handleCloseModal}>
          <div
            className="patch-note-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="patch-note-modal-header">
              <h2>
                {editingPatchNote ? "Editar Atualização" : "Nova Atualização"}
              </h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <FiX size={20} />
              </button>
            </div>

            <div className="patch-note-modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Versão *</label>
                  <input
                    type="text"
                    placeholder="Ex: 2.5.1"
                    value={patchNoteForm.versao}
                    onChange={(e) =>
                      setPatchNoteForm({
                        ...patchNoteForm,
                        versao: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    value={patchNoteForm.tipo}
                    onChange={(e) =>
                      setPatchNoteForm({
                        ...patchNoteForm,
                        tipo: e.target.value,
                      })
                    }
                  >
                    <option value="feature">✨ Nova Funcionalidade</option>
                    <option value="improvement">⚡ Melhoria</option>
                    <option value="fix">🔧 Correção</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Data de Lançamento *</label>
                <input
                  type="date"
                  value={patchNoteForm.data_lancamento}
                  onChange={(e) =>
                    setPatchNoteForm({
                      ...patchNoteForm,
                      data_lancamento: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  placeholder="Ex: Sistema de Notificações"
                  value={patchNoteForm.titulo}
                  onChange={(e) =>
                    setPatchNoteForm({
                      ...patchNoteForm,
                      titulo: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Descrição *</label>
                <textarea
                  placeholder="Descreva as mudanças realizadas..."
                  rows={4}
                  value={patchNoteForm.descricao}
                  onChange={(e) =>
                    setPatchNoteForm({
                      ...patchNoteForm,
                      descricao: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="patch-note-modal-footer">
              <button className="cancel-btn" onClick={handleCloseModal}>
                Cancelar
              </button>
              <button
                className="save-btn"
                onClick={handleSavePatchNote}
                disabled={savingPatchNote}
              >
                {savingPatchNote ? (
                  <>
                    <span className="btn-spinner"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={16} />
                    {editingPatchNote ? "Atualizar" : "Criar"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
