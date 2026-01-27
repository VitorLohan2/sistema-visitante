import logger from "../../utils/logger";
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
import { useChatSuporte } from "../../contexts/ChatSuporteContext";
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
  const {
    mensagensNaoLidas,
    visualizandoConversa,
    saiuConversa,
    atualizarDados: atualizarDadosContext,
  } = useChatSuporte();

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

  // Cache de mensagens por conversa (para não perder ao trocar)
  const mensagensCache = useRef({});

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

    // Cleanup: quando sair da página, marca que não está mais visualizando
    return () => {
      saiuConversa();
    };
  }, [saiuConversa]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      await Promise.all([carregarFila(), carregarConversasAtivas()]);
    } catch (err) {
      logger.error("Erro ao carregar dados:", err);
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
      logger.error("Erro ao carregar fila:", err);
    } finally {
      setFilaLoading(false);
    }
  };

  const carregarConversasAtivas = async () => {
    try {
      const response = await api.get(
        "/chat-suporte/atendente/minhas-conversas",
      );
      setConversasAtivas(response.data.conversas || []);
    } catch (err) {
      logger.error("Erro ao carregar conversas ativas:", err);
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
      logger.error("Erro ao carregar histórico:", err);
    }
  };

  const carregarMensagens = async (conversaId) => {
    try {
      const response = await api.get(`/chat-suporte/conversas/${conversaId}`);
      const novasMensagens = response.data.mensagens || [];

      // Salva no cache
      mensagensCache.current[conversaId] = novasMensagens;

      // Atualiza o estado diretamente - esta função é chamada dentro de selecionarConversa
      setMensagens(novasMensagens);

      return novasMensagens;
    } catch (err) {
      logger.error("Erro ao carregar mensagens:", err);
      return [];
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO - Entrar em TODAS as salas de conversas ativas
  // Isso garante que o atendente receba mensagens mesmo quando não está visualizando
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!conversasAtivas.length) return;

    // Entra em todas as salas de conversas ativas
    conversasAtivas.forEach((conversa) => {
      socketService.emit("chat-suporte:entrar", conversa.id);
      logger.log(`🚪 Atendente entrou na sala da conversa ${conversa.id}`);
    });

    return () => {
      // Sai de todas as salas ao desmontar
      conversasAtivas.forEach((conversa) => {
        socketService.emit("chat-suporte:sair", conversa.id);
      });
    };
  }, [conversasAtivas]);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO - Listeners locais da página (contexto global gerencia presença)
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    // O ChatSuporteContext já gerencia a entrada na sala de atendentes
    // Aqui apenas registramos listeners locais para atualizar a UI desta página

    // Listener para nova conversa na fila
    const unsubNovaFila = socketService.on("chat-suporte:nova-fila", (data) => {
      logger.log("📢 Nova conversa na fila - dados recebidos:", data);
      // Se recebeu a fila completa, usa diretamente
      if (data?.fila && Array.isArray(data.fila)) {
        setFila(data.fila);
      } else {
        // Se não recebeu dados completos, recarrega
        carregarFila();
      }
    });

    // Listener para fila atualizada (geralmente quando uma conversa foi aceita)
    const unsubFilaAtualizada = socketService.on(
      "chat-suporte:fila-atualizada",
      (data) => {
        logger.log("📢 Fila atualizada - dados recebidos:", data);
        // Se recebeu a fila completa, usa diretamente
        if (data?.fila && Array.isArray(data.fila)) {
          setFila(data.fila);
        } else {
          // Se não recebeu dados completos, recarrega
          carregarFila();
        }
      },
    );

    // Listener GLOBAL para novas mensagens em qualquer conversa do atendente
    // Isso atualiza a lista de conversas ativas E O CACHE mesmo quando não está visualizando
    const unsubMensagemGlobal = socketService.on(
      "chat-suporte:mensagem",
      (data) => {
        logger.log("📢 Nova mensagem recebida (global):", data.conversa_id);

        // IMPORTANTE: Atualiza o cache de mensagens para QUALQUER conversa ativa
        // Isso garante que quando o atendente trocar de conversa, as mensagens estarão lá
        if (data.mensagem && data.conversa_id) {
          const cacheAtual = mensagensCache.current[data.conversa_id] || [];
          // Evita duplicatas - se já existe, não faz nada
          if (cacheAtual.find((m) => m.id === data.mensagem.id)) {
            logger.log(
              `📦 Mensagem ${data.mensagem.id} já existe no cache, ignorando duplicata`,
            );
            return; // SAI AQUI - não processa duplicatas
          }

          mensagensCache.current[data.conversa_id] = [
            ...cacheAtual,
            data.mensagem,
          ];
          logger.log(
            `📦 Cache atualizado para conversa ${data.conversa_id}:`,
            mensagensCache.current[data.conversa_id].length,
            "mensagens",
          );
        }

        // Atualiza a lista de conversas ativas com a última mensagem
        setConversasAtivas((prev) => {
          const conversaIndex = prev.findIndex(
            (c) => c.id === data.conversa_id,
          );
          if (conversaIndex === -1) return prev;

          const updatedConversas = [...prev];
          updatedConversas[conversaIndex] = {
            ...updatedConversas[conversaIndex],
            ultima_mensagem: data.mensagem?.mensagem,
            atualizado_em: data.mensagem?.criado_em || new Date().toISOString(),
          };
          return updatedConversas;
        });

        // Atualiza também o contexto global
        atualizarDadosContext();
      },
    );

    return () => {
      // NÃO emitir atendente-offline aqui!
      // O ChatSuporteContext gerencia a presença global do atendente
      // Se emitirmos aqui, o atendente sai da sala ao mudar de página
      unsubNovaFila && unsubNovaFila();
      unsubFilaAtualizada && unsubFilaAtualizada();
      unsubMensagemGlobal && unsubMensagemGlobal();
    };
  }, [user?.id, atualizarDadosContext]);

  // Listeners específicos da conversa selecionada (digitando, parou-digitar, finalizada)
  // NOTA: Mensagens são tratadas pelo listener GLOBAL acima para evitar duplicação
  useEffect(() => {
    if (!conversaSelecionada?.id) return;

    // Atualiza o estado de mensagens quando o cache muda para a conversa selecionada
    // Isso sincroniza as mensagens recebidas pelo listener global
    const syncInterval = setInterval(() => {
      const cacheAtual = mensagensCache.current[conversaSelecionada.id];
      if (cacheAtual && cacheAtual.length > 0) {
        setMensagens((prev) => {
          // Se o cache tem mais mensagens que o estado, atualiza
          if (cacheAtual.length > prev.length) {
            return cacheAtual;
          }
          return prev;
        });
      }
    }, 500);

    const unsubDigitando = socketService.on(
      "chat-suporte:digitando",
      (data) => {
        if (data.conversa_id === conversaSelecionada.id) {
          // Ignora se o nome é do próprio atendente
          const nomeAtendente = user?.nome || "Atendente";
          if (data.nome !== nomeAtendente) {
            setDigitando(data.nome);
          }
        }
      },
    );

    const unsubParouDigitar = socketService.on(
      "chat-suporte:parou-digitar",
      (data) => {
        if (data.conversa_id === conversaSelecionada.id) {
          setDigitando(null);
        }
      },
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
      },
    );

    return () => {
      // Limpa o intervalo de sincronização
      clearInterval(syncInterval);
      // Não precisa sair da sala aqui pois o useEffect de conversasAtivas gerencia isso
      unsubDigitando && unsubDigitando();
      unsubParouDigitar && unsubParouDigitar();
      unsubFinalizada && unsubFinalizada();
    };
  }, [conversaSelecionada?.id, user?.nome]);

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
    if (!conversaId) {
      setError("ID da conversa inválido");
      return;
    }

    try {
      const response = await api.post(
        `/chat-suporte/atendente/aceitar/${conversaId}`,
      );

      // Backend retorna a conversa diretamente, não dentro de { conversa: ... }
      const conversa = response.data;

      if (conversa && conversa.id) {
        // Adiciona às conversas ativas
        setConversasAtivas((prev) => [...prev, conversa]);

        // Remove da fila
        setFila((prev) => prev.filter((f) => f.conversa_id !== conversaId));

        // Seleciona a conversa
        selecionarConversa(conversa);

        // Muda para tab de ativas
        setTab("ativas");
      } else {
        setError("Resposta inválida do servidor");
      }
    } catch (err) {
      logger.error("Erro ao aceitar conversa:", err);
      setError(err.response?.data?.error || "Erro ao aceitar conversa");
    }
  };

  // Seleciona uma conversa para visualizar
  const selecionarConversa = async (conversa) => {
    // Salva mensagens da conversa atual no cache antes de trocar
    if (conversaSelecionada?.id && mensagens.length > 0) {
      mensagensCache.current[conversaSelecionada.id] = mensagens;
    }

    setConversaSelecionada(conversa);

    // Marca no context que está visualizando esta conversa (zera contador de não lidas)
    visualizandoConversa(conversa.id);

    // Verifica se tem mensagens no cache
    if (mensagensCache.current[conversa.id]) {
      setMensagens(mensagensCache.current[conversa.id]);
    } else {
      setMensagens([]);
      await carregarMensagens(conversa.id);
    }
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
      // Usa endpoint de atendente para enviar mensagem
      const response = await api.post(
        `/chat-suporte/atendente/mensagem/${conversaSelecionada.id}`,
        { mensagem: mensagemTexto },
      );

      // O endpoint de atendente retorna a mensagem diretamente
      if (response.data) {
        const novaMensagemObj = response.data;
        setMensagens((prev) => {
          if (prev.find((m) => m.id === novaMensagemObj.id)) return prev;
          const novasMensagens = [...prev, novaMensagemObj];
          // Atualiza o cache
          mensagensCache.current[conversaSelecionada.id] = novasMensagens;
          return novasMensagens;
        });
      }
    } catch (err) {
      logger.error("Erro ao enviar mensagem:", err);
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
      // Usa o endpoint de atendente para finalizar
      await api.post(
        `/chat-suporte/atendente/finalizar/${conversaSelecionada.id}`,
      );
      setConversaSelecionada((prev) => ({
        ...prev,
        status: STATUS.FINALIZADA,
      }));
      setConversasAtivas((prev) =>
        prev.filter((c) => c.id !== conversaSelecionada.id),
      );
    } catch (err) {
      logger.error("Erro ao finalizar conversa:", err);
      setError(err.response?.data?.error || "Erro ao finalizar conversa");
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
        onClick={(e) => {
          e.stopPropagation();
          aceitarConversa(item.conversa_id);
        }}
      >
        <FiCheck size={16} />
        Atender
      </button>
    </div>
  );

  // Renderiza conversa na lista
  const renderConversaItem = (conversa, isHistorico = false) => {
    const naoLidas = mensagensNaoLidas[conversa.id] || 0;
    const isSelected = conversaSelecionada?.id === conversa.id;

    return (
      <div
        key={conversa.id}
        className={`painel-atendente-conversa-item ${isSelected ? "selected" : ""} ${naoLidas > 0 ? "has-unread" : ""}`}
        onClick={() => selecionarConversa(conversa)}
      >
        <div className="conversa-item-avatar">
          <FiUser size={18} />
          {/* Badge de mensagens não lidas */}
          {naoLidas > 0 && !isSelected && (
            <span className="conversa-unread-badge">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
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
              conversa.atualizado_em || conversa.criado_em,
            ).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <FiChevronRight size={16} className="conversa-item-arrow" />
      </div>
    );
  };

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

  // Calcula total de mensagens não lidas nas conversas ativas
  const totalNaoLidas = Object.values(mensagensNaoLidas).reduce(
    (acc, count) => acc + count,
    0,
  );

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
            {/* Mostra badge com mensagens não lidas ou total de conversas */}
            {totalNaoLidas > 0 ? (
              <span className="badge unread">
                {totalNaoLidas > 9 ? "9+" : totalNaoLidas}
              </span>
            ) : conversasAtivas.length > 0 ? (
              <span className="badge">{conversasAtivas.length}</span>
            ) : null}
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
              <div className="historico-atendente-header">
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
