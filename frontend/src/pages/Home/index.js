import logger from "../../utils/logger";
// src/pages/Home/index.js
import React, { useState, useEffect, useMemo } from "react";
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
import { useDataLoader } from "../../hooks/useDataLoader";
import MenuDaBarraLateral from "../../components/MenuDaBarraLateral";
import Loading from "../../components/Loading";
import api from "../../services/api";
import * as socketService from "../../services/socketService";
import "./styles.css";

export default function Home() {
  const { user } = useAuth();
  const { temPermissao, loading: permissoesLoading } = usePermissoes();

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO DE DADOS DO SISTEMA (ÚNICA VEZ NO LOGIN)
  // Atualização em tempo real via Socket.IO
  // ═══════════════════════════════════════════════════════════════
  const {
    loading,
    progress,
    progressMessage,
    patchNotes: cachedPatchNotes,
  } = useDataLoader(user?.id);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [patchNotes, setPatchNotes] = useState([]);

  // Estados para o modal de criar/editar patch note
  const [showPatchNoteModal, setShowPatchNoteModal] = useState(false);
  const [editingPatchNote, setEditingPatchNote] = useState(null);
  const [savingPatchNote, setSavingPatchNote] = useState(false);

  // Função auxiliar para obter data local no formato YYYY-MM-DD
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [patchNoteForm, setPatchNoteForm] = useState({
    versao: "",
    titulo: "",
    descricao: "",
    tipo: "improvement",
    data_lancamento: getLocalDateString(),
  });

  // Status do sistema - dados reais
  const [systemStatus, setSystemStatus] = useState({
    status: "ONLINE",
    uptime: "0%",
    lastUpdate: "Carregando...",
  });

  // Versão do sistema
  const [systemVersion, setSystemVersion] = useState("0.0.0");

  // Carrega informações do sistema (versão, último commit)
  useEffect(() => {
    async function loadSystemInfo() {
      try {
        // Busca informações do sistema (versão e último commit)
        const infoRes = await api.get("/system/info");
        if (infoRes.data) {
          setSystemVersion(infoRes.data.version || "0.0.0");

          // Formata a data do último commit
          if (infoRes.data.lastCommitDate) {
            const commitDate = new Date(infoRes.data.lastCommitDate);
            setSystemStatus((prev) => ({
              ...prev,
              lastUpdate: commitDate.toLocaleDateString("pt-BR"),
            }));
          }
        }

        // Busca estatísticas de permissões do usuário
        const statsRes = await api.get("/system/permissions-stats");
        if (statsRes.data) {
          setSystemStatus((prev) => ({
            ...prev,
            uptime: `${statsRes.data.porcentagem}%`,
          }));
        }
      } catch (err) {
        logger.error("Erro ao carregar informações do sistema:", err);
      }
    }

    if (user?.id) {
      loadSystemInfo();
    }
  }, [user?.id]);

  // Sincroniza patchNotes do cache quando carregados
  useEffect(() => {
    if (cachedPatchNotes && cachedPatchNotes.length > 0) {
      setPatchNotes(cachedPatchNotes);
    }
  }, [cachedPatchNotes]);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO - Atualização em tempo real dos Patch Notes
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // Listener: Novo patch note criado
    const unsubCreated = socketService.on("patch-note:created", (patchNote) => {
      logger.log("🟢 Socket: Novo patch note recebido", patchNote.id);
      setPatchNotes((prev) => {
        // Evita duplicatas
        if (prev.find((p) => p.id === patchNote.id)) return prev;
        // Adiciona no início e ordena por data
        return [patchNote, ...prev].sort(
          (a, b) => new Date(b.data_lancamento) - new Date(a.data_lancamento),
        );
      });
    });

    // Listener: Patch note atualizado
    const unsubUpdated = socketService.on("patch-note:updated", (patchNote) => {
      logger.log("🔵 Socket: Patch note atualizado", patchNote.id);
      setPatchNotes((prev) =>
        prev.map((p) => (p.id === patchNote.id ? patchNote : p)),
      );
    });

    // Listener: Patch note deletado
    const unsubDeleted = socketService.on("patch-note:deleted", (data) => {
      logger.log("🔴 Socket: Patch note deletado", data.id);
      setPatchNotes((prev) => prev.filter((p) => p.id !== data.id));
    });

    // Cleanup ao desmontar
    return () => {
      unsubCreated && unsubCreated();
      unsubUpdated && unsubUpdated();
      unsubDeleted && unsubDeleted();
    };
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

  // Formata data do patch note (evita problema de timezone UTC)
  const formatPatchNoteDate = (dateString) => {
    if (!dateString) return "";

    // Pega a string de data do banco (YYYY-MM-DD) e formata diretamente
    // Sem criar objeto Date para evitar conversão de timezone
    const [year, month, day] = dateString.split("T")[0].split("-");

    // Formata para DD/MM/YYYY
    return `${day}/${month}/${year}`;
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
      logger.error("Erro ao enviar feedback:", err);
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
      data_lancamento: getLocalDateString(),
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
        note.data_lancamento?.split("T")[0] || getLocalDateString(),
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
        // Socket.IO vai sincronizar automaticamente
      } else {
        await api.post("/patch-notes", patchNoteForm);
        // Socket.IO vai sincronizar automaticamente
      }
      handleCloseModal();
    } catch (err) {
      logger.error("Erro ao salvar atualização:", err);
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
      // Socket.IO vai sincronizar automaticamente
    } catch (err) {
      logger.error("Erro ao excluir atualização:", err);
      const mensagem =
        err.response?.data?.error || "Erro ao excluir atualização.";
      alert(mensagem);
    }
  };

  // Memoiza permissões para evitar re-renderizações
  const podeGerenciarPatchNotes = useMemo(() => {
    return temPermissao("patch_notes_gerenciar");
  }, [temPermissao]);

  // Memoiza o menu para evitar re-renderizações desnecessárias
  const memoizedMenu = useMemo(() => {
    // Só renderiza quando permissões estão carregadas
    if (permissoesLoading) return null;
    return <MenuDaBarraLateral key="home-menu" />;
  }, [permissoesLoading]);

  // ═══════════════════════════════════════════════════════════════
  // LOADING CENTRALIZADO
  // ═══════════════════════════════════════════════════════════════
  if (loading || permissoesLoading) {
    return <Loading progress={progress} message={progressMessage} />;
  }

  return (
    <div className="home-container">
      {memoizedMenu}

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
                  <span className="label">Nível de Acesso</span>
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
              {podeGerenciarPatchNotes && (
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
              {patchNotes.length === 0 ? (
                <div className="no-updates">Nenhuma atualização disponível</div>
              ) : (
                patchNotes.map((note, index) => (
                  <div key={note.id || index} className="update-item">
                    {getUpdateIcon(note.tipo)}
                    <div className="update-content">
                      <div className="update-header">
                        <span className="update-version">v{note.versao}</span>
                        <span className="update-date">
                          {formatPatchNoteDate(note.data_lancamento)}
                        </span>
                        {podeGerenciarPatchNotes && (
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
            Sistema de Gestão de Visitantes • Versão {systemVersion} •{" "}
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
