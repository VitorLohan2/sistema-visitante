/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAINEL DO ATENDENTE - Página de Atendimento ao Cliente
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Página completa para atendentes gerenciarem as conversas de suporte.
 *
 * FUNCIONALIDADES:
 * - Ver fila de atendimento
 * - Aceitar conversas da fila
 * - Conversar em tempo real com clientes
 * - Finalizar atendimentos
 * - Ver histórico de conversas
 *
 * PERMISSÕES NECESSÁRIAS:
 * - chat_atendente_acessar_painel
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FiUser,
  FiUsers,
  FiMessageSquare,
  FiClock,
  FiCheck,
  FiX,
  FiSend,
  FiRefreshCw,
  FiLoader,
  FiSearch,
  FiFilter,
  FiChevronRight,
  FiAlertCircle,
  FiPhone,
  FiMail,
  FiCalendar,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import * as socketService from "../../services/socketService";
import "./PainelAtendente.css";

// Status da conversa
const STATUS = {
  BOT: "BOT",
  AGUARDANDO_ATENDENTE: "AGUARDANDO_ATENDENTE",
  EM_ATENDIMENTO: "EM_ATENDIMENTO",
  FINALIZADA: "FINALIZADA",
};

export default function PainelAtendente() {
  const { user } = useAuth();

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("fila"); // fila, ativas, historico

  // Estados da fila
  const [fila, setFila] = useState([]);
  const [filaLoading, setFilaLoading] = useState(false);

  // Estados das conversas ativas
  const [conversasAtivas, setConversasAtivas] = useState([]);
  const [conversaSelecionada, setConversaSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);

  // Estados do histórico
  const [historico, setHistorico] = useState([]);
  const [filtroHistorico, setFiltroHistorico] = useState("");
  const [paginaHistorico, setPaginaHistorico] = useState(1);

  // Estados de input
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [digitando, setDigitando] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const digitandoTimeoutRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO INICIAL
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      await Promise.all([carregarFila(), carregarConversasAtivas()]);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados do painel");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO DE DADOS
  // ═══════════════════════════════════════════════════════════════

  const carregarFila = async () => {
    setFilaLoading(true);
    try {
      const response = await api.get("/chat-suporte/atendente/fila");
      setFila(response.data.fila || []);
    } catch (err) {
      console.error("Erro ao carregar fila:", err);
    } finally {
      setFilaLoading(false);
    }
  };

  const carregarConversasAtivas = async () => {
    try {
      const response = await api.get(
        "/chat-suporte/atendente/minhas-conversas"
      );
      setConversasAtivas(response.data.conversas || []);
    } catch (err) {
      console.error("Erro ao carregar conversas ativas:", err);
    }
  };

  const carregarHistorico = async () => {
    try {
      const response = await api.get("/chat-suporte/atendente/historico", {
        params: {
          page: paginaHistorico,
          search: filtroHistorico || undefined,
        },
      });
      setHistorico(response.data.conversas || []);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    }
  };

  const carregarMensagens = async (conversaId) => {
    try {
      const response = await api.get(`/chat-suporte/conversas/${conversaId}`);
      setMensagens(response.data.mensagens || []);
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    // Função para entrar na sala de atendentes
    const entrarSalaAtendentes = () => {
      if (socketService.isConnected()) {
        socketService.emit("chat-suporte:atendente-online", {
          atendente_id: user?.id,
        });
        console.log("👨‍💼 Entrou na sala de atendentes");
      }
    };

    // Entra na sala imediatamente se já estiver conectado
    entrarSalaAtendentes();

    // Também registra para quando o socket conectar
    const unsubConnected = socketService.on("connected", entrarSalaAtendentes);

    // Listener para nova conversa na fila
    const unsubNovaFila = socketService.on("chat-suporte:nova-fila", () => {
      console.log("📢 Nova conversa na fila - atualizando");
      carregarFila();
    });

    // Listener para fila atualizada
    const unsubFilaAtualizada = socketService.on(
      "chat-suporte:fila-atualizada",
      () => {
        console.log("📢 Fila atualizada - atualizando");
        carregarFila();
      }
    );

    return () => {
      if (socketService.isConnected()) {
        socketService.emit("chat-suporte:atendente-offline", {
          atendente_id: user?.id,
        });
      }
      unsubConnected && unsubConnected();
      unsubNovaFila && unsubNovaFila();
      unsubFilaAtualizada && unsubFilaAtualizada();
    };
  }, [user?.id]);

  // Listeners específicos da conversa selecionada
  useEffect(() => {
    if (!conversaSelecionada?.id) return;

    socketService.emit("chat-suporte:entrar", conversaSelecionada.id);

    const unsubMensagem = socketService.on("chat-suporte:mensagem", (data) => {
      if (data.conversa_id === conversaSelecionada.id) {
        setMensagens((prev) => {
          if (prev.find((m) => m.id === data.mensagem.id)) return prev;
          return [...prev, data.mensagem];
        });
      }
    });

    const unsubDigitando = socketService.on(
      "chat-suporte:digitando",
      (data) => {
        if (data.conversa_id === conversaSelecionada.id) {
          setDigitando(data.nome);
        }
      }
    );

    const unsubParouDigitar = socketService.on(
      "chat-suporte:parou-digitar",
      (data) => {
        if (data.conversa_id === conversaSelecionada.id) {
          setDigitando(null);
        }
      }
    );

    const unsubFinalizada = socketService.on(
      "chat-suporte:conversa-finalizada",
      (data) => {
        if (data.conversa_id === conversaSelecionada.id) {
          setConversaSelecionada((prev) => ({
            ...prev,
            status: STATUS.FINALIZADA,
          }));
          carregarConversasAtivas();
        }
      }
    );

    return () => {
      socketService.emit("chat-suporte:sair", conversaSelecionada.id);
      unsubMensagem && unsubMensagem();
      unsubDigitando && unsubDigitando();
      unsubParouDigitar && unsubParouDigitar();
      unsubFinalizada && unsubFinalizada();
    };
  }, [conversaSelecionada?.id]);

  // Scroll para última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens]);

  // Carrega histórico quando muda de tab
  useEffect(() => {
    if (tab === "historico") {
      carregarHistorico();
    }
  }, [tab, paginaHistorico, filtroHistorico]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  // Aceita uma conversa da fila
  const aceitarConversa = async (conversaId) => {
    try {
      const response = await api.post(
        `/chat-suporte/atendente/aceitar/${conversaId}`
      );

      if (response.data.conversa) {
        // Adiciona às conversas ativas
        setConversasAtivas((prev) => [...prev, response.data.conversa]);

        // Remove da fila
        setFila((prev) => prev.filter((f) => f.conversa_id !== conversaId));

        // Seleciona a conversa
        selecionarConversa(response.data.conversa);

        // Muda para tab de ativas
        setTab("ativas");
      }
    } catch (err) {
      console.error("Erro ao aceitar conversa:", err);
      setError(err.response?.data?.error || "Erro ao aceitar conversa");
    }
  };

  // Seleciona uma conversa para visualizar
  const selecionarConversa = async (conversa) => {
    setConversaSelecionada(conversa);
    await carregarMensagens(conversa.id);
  };

  // Envia mensagem
  const enviarMensagem = async (e) => {
    e?.preventDefault();

    if (!novaMensagem.trim() || enviando || !conversaSelecionada?.id) return;

    const mensagemTexto = novaMensagem.trim();
    setNovaMensagem("");
    setEnviando(true);

    socketService.emit("chat-suporte:parou-digitar", {
      conversa_id: conversaSelecionada.id,
    });

    try {
      const response = await api.post(
        `/chat-suporte/conversas/${conversaSelecionada.id}/mensagens`,
        { mensagem: mensagemTexto }
      );

      if (response.data.mensagemUsuario) {
        setMensagens((prev) => {
          if (prev.find((m) => m.id === response.data.mensagemUsuario.id))
            return prev;
          return [...prev, response.data.mensagemUsuario];
        });
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      setError("Erro ao enviar mensagem");
    } finally {
      setEnviando(false);
    }
  };

  // Emite evento de digitando
  const handleTyping = useCallback(() => {
    if (!conversaSelecionada?.id) return;

    socketService.emit("chat-suporte:digitando", {
      conversa_id: conversaSelecionada.id,
      nome: user?.nome || "Atendente",
    });

    if (digitandoTimeoutRef.current) {
      clearTimeout(digitandoTimeoutRef.current);
    }

    digitandoTimeoutRef.current = setTimeout(() => {
      socketService.emit("chat-suporte:parou-digitar", {
        conversa_id: conversaSelecionada.id,
      });
    }, 2000);
  }, [conversaSelecionada?.id, user?.nome]);

  // Finaliza conversa
  const finalizarConversa = async () => {
    if (!conversaSelecionada?.id) return;

    if (!window.confirm("Tem certeza que deseja finalizar este atendimento?")) {
      return;
    }

    try {
      await api.post(
        `/chat-suporte/conversas/${conversaSelecionada.id}/finalizar`
      );
      setConversaSelecionada((prev) => ({
        ...prev,
        status: STATUS.FINALIZADA,
      }));
      setConversasAtivas((prev) =>
        prev.filter((c) => c.id !== conversaSelecionada.id)
      );
    } catch (err) {
      console.error("Erro ao finalizar conversa:", err);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════

  // Formata tempo de espera
  const formatarTempoEspera = (dataInicio) => {
    const inicio = new Date(dataInicio);
    const agora = new Date();
    const diff = Math.floor((agora - inicio) / 1000 / 60); // minutos

    if (diff < 1) return "Agora";
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  };

  // Renderiza item da fila
  const renderItemFila = (item) => (
    <div key={item.id} className="painel-atendente-queue-item">
      <div className="queue-item-info">
        <div className="queue-item-avatar">
          <FiUser size={20} />
        </div>
        <div className="queue-item-details">
          <span className="queue-item-name">
            {item.nome_visitante || item.nome_usuario || "Visitante"}
          </span>
          <span className="queue-item-email">
            {item.email_visitante || item.email_usuario}
          </span>
        </div>
      </div>
      <div className="queue-item-meta">
        <span className="queue-item-time">
          <FiClock size={12} />
          {formatarTempoEspera(item.adicionado_em)}
        </span>
        <span className="queue-item-position">#{item.posicao}</span>
      </div>
      <button
        className="queue-item-accept-btn"
        onClick={() => aceitarConversa(item.conversa_id)}
      >
        <FiCheck size={16} />
        Atender
      </button>
    </div>
  );

  // Renderiza conversa na lista
  const renderConversaItem = (conversa, isHistorico = false) => (
    <div
      key={conversa.id}
      className={`painel-atendente-conversa-item ${
        conversaSelecionada?.id === conversa.id ? "selected" : ""
      }`}
      onClick={() => selecionarConversa(conversa)}
    >
      <div className="conversa-item-avatar">
        <FiUser size={18} />
      </div>
      <div className="conversa-item-info">
        <span className="conversa-item-name">
          {conversa.nome_visitante || conversa.nome_usuario || "Visitante"}
        </span>
        <span className="conversa-item-preview">
          {conversa.ultima_mensagem || "Sem mensagens"}
        </span>
      </div>
      <div className="conversa-item-meta">
        {!isHistorico && (
          <span
            className={`conversa-item-status ${conversa.status.toLowerCase()}`}
          >
            {conversa.status === STATUS.EM_ATENDIMENTO
              ? "Ativo"
              : conversa.status}
          </span>
        )}
        <span className="conversa-item-time">
          {new Date(
            conversa.atualizado_em || conversa.criado_em
          ).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <FiChevronRight size={16} className="conversa-item-arrow" />
    </div>
  );

  // Renderiza área de mensagens
  const renderMensagens = () => (
    <div className="painel-atendente-messages">
      {mensagens.map((msg, index) => (
        <div
          key={msg.id || index}
          className={`painel-atendente-message ${msg.origem.toLowerCase()}`}
        >
          <div className="message-content">{msg.mensagem}</div>
          <div className="message-time">
            {new Date(msg.criado_em).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      ))}

      {digitando && (
        <div className="painel-atendente-typing">
          <span>{digitando} está digitando</span>
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );

  if (loading) {
    return (
      <div className="painel-atendente-loading">
        <FiLoader className="spin" size={32} />
        <span>Carregando painel...</span>
      </div>
    );
  }

  return (
    <div className="painel-atendente">
      {/* Sidebar */}
      <div className="painel-atendente-sidebar">
        {/* Tabs */}
        <div className="painel-atendente-tabs">
          <button
            className={tab === "fila" ? "active" : ""}
            onClick={() => setTab("fila")}
          >
            <FiUsers size={16} />
            Fila
            {fila.length > 0 && <span className="badge">{fila.length}</span>}
          </button>
          <button
            className={tab === "ativas" ? "active" : ""}
            onClick={() => setTab("ativas")}
          >
            <FiMessageSquare size={16} />
            Ativas
            {conversasAtivas.length > 0 && (
              <span className="badge">{conversasAtivas.length}</span>
            )}
          </button>
          <button
            className={tab === "historico" ? "active" : ""}
            onClick={() => setTab("historico")}
          >
            <FiClock size={16} />
            Histórico
          </button>
        </div>

        {/* Conteúdo da Sidebar */}
        <div className="painel-atendente-sidebar-content">
          {/* Tab Fila */}
          {tab === "fila" && (
            <div className="painel-atendente-queue">
              <div className="queue-header">
                <h3>Fila de Atendimento</h3>
                <button
                  className="refresh-btn"
                  onClick={carregarFila}
                  disabled={filaLoading}
                >
                  <FiRefreshCw
                    size={16}
                    className={filaLoading ? "spin" : ""}
                  />
                </button>
              </div>

              {fila.length === 0 ? (
                <div className="queue-empty">
                  <FiUsers size={32} />
                  <p>Nenhum cliente na fila</p>
                </div>
              ) : (
                <div className="queue-list">{fila.map(renderItemFila)}</div>
              )}
            </div>
          )}

          {/* Tab Ativas */}
          {tab === "ativas" && (
            <div className="painel-atendente-ativas">
              <div className="ativas-header">
                <h3>Conversas Ativas</h3>
              </div>

              {conversasAtivas.length === 0 ? (
                <div className="ativas-empty">
                  <FiMessageSquare size={32} />
                  <p>Nenhuma conversa ativa</p>
                  <button onClick={() => setTab("fila")}>
                    Ver fila de atendimento
                  </button>
                </div>
              ) : (
                <div className="ativas-list">
                  {conversasAtivas.map((c) => renderConversaItem(c))}
                </div>
              )}
            </div>
          )}

          {/* Tab Histórico */}
          {tab === "historico" && (
            <div className="painel-atendente-historico">
              <div className="historico-header">
                <h3>Histórico</h3>
                <div className="historico-search">
                  <FiSearch size={14} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={filtroHistorico}
                    onChange={(e) => setFiltroHistorico(e.target.value)}
                  />
                </div>
              </div>

              <div className="historico-list">
                {historico.map((c) => renderConversaItem(c, true))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Área principal - Chat */}
      <div className="painel-atendente-main">
        {conversaSelecionada ? (
          <>
            {/* Header do chat */}
            <div className="painel-atendente-chat-header">
              <div className="chat-header-info">
                <div className="chat-header-avatar">
                  <FiUser size={24} />
                </div>
                <div className="chat-header-details">
                  <h3>
                    {conversaSelecionada.nome_visitante ||
                      conversaSelecionada.nome_usuario ||
                      "Visitante"}
                  </h3>
                  <div className="chat-header-meta">
                    {conversaSelecionada.email_visitante ||
                      conversaSelecionada.email_usuario}
                  </div>
                </div>
              </div>
              <div className="chat-header-actions">
                <span
                  className={`status-badge ${conversaSelecionada.status.toLowerCase()}`}
                >
                  {conversaSelecionada.status === STATUS.EM_ATENDIMENTO
                    ? "Em Atendimento"
                    : conversaSelecionada.status}
                </span>
                {conversaSelecionada.status === STATUS.EM_ATENDIMENTO && (
                  <button className="end-chat-btn" onClick={finalizarConversa}>
                    <FiX size={16} />
                    Finalizar
                  </button>
                )}
              </div>
            </div>

            {/* Mensagens */}
            {renderMensagens()}

            {/* Input de mensagem */}
            {conversaSelecionada.status === STATUS.EM_ATENDIMENTO && (
              <form
                className="painel-atendente-input"
                onSubmit={enviarMensagem}
              >
                <input
                  type="text"
                  value={novaMensagem}
                  onChange={(e) => {
                    setNovaMensagem(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Digite sua mensagem..."
                  disabled={enviando}
                />
                <button
                  type="submit"
                  disabled={!novaMensagem.trim() || enviando}
                >
                  {enviando ? (
                    <FiLoader className="spin" size={18} />
                  ) : (
                    <FiSend size={18} />
                  )}
                </button>
              </form>
            )}

            {/* Aviso de conversa finalizada */}
            {conversaSelecionada.status === STATUS.FINALIZADA && (
              <div className="painel-atendente-finished">
                <FiCheck size={20} />
                <span>Esta conversa foi finalizada</span>
              </div>
            )}
          </>
        ) : (
          <div className="painel-atendente-empty">
            <FiMessageSquare size={48} />
            <h3>Selecione uma conversa</h3>
            <p>
              Escolha uma conversa da lista ou aceite um novo atendimento da
              fila.
            </p>
          </div>
        )}
      </div>

      {/* Notificação de erro */}
      {error && (
        <div className="painel-atendente-error">
          <FiAlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <FiX size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
