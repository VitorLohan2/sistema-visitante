/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT WIDGET - Widget Flutuante de Chat de Suporte
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Widget de chat que aparece no canto inferior direito da tela.
 * Suporta usuários logados e visitantes (não logados).
 *
 * FUNCIONALIDADES:
 * - Iniciar conversa (logado ou como visitante)
 * - Enviar/receber mensagens em tempo real
 * - Solicitar atendimento humano
 * - Ver posição na fila
 * - Avaliar atendimento
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FiMessageCircle,
  FiX,
  FiSend,
  FiUser,
  FiMail,
  FiMinimize2,
  FiMaximize2,
  FiPhone,
  FiStar,
  FiCheck,
  FiLoader,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import * as socketService from "../../services/socketService";
import "./ChatWidget.css";

// Status da conversa
const STATUS = {
  BOT: "BOT",
  AGUARDANDO_ATENDENTE: "AGUARDANDO_ATENDENTE",
  EM_ATENDIMENTO: "EM_ATENDIMENTO",
  FINALIZADA: "FINALIZADA",
};

export default function ChatWidget() {
  const { isAuthenticated, user } = useAuth();

  // Estados principais
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados do formulário de identificação (visitante)
  const [showIdentification, setShowIdentification] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  // Estados da conversa
  const [conversa, setConversa] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [posicaoFila, setPosicaoFila] = useState(null);
  const [digitando, setDigitando] = useState(null);
  const [conversaCarregada, setConversaCarregada] = useState(false);

  // Estado para mensagens não lidas (quando minimizado)
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  // Guarda os IDs das mensagens já vistas (mais confiável que usar length)
  const mensagensVistasRef = useRef(new Set());

  // Estados de avaliação
  const [showAvaliacao, setShowAvaliacao] = useState(false);
  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const digitandoTimeoutRef = useRef(null);
  const pollingRef = useRef(null);

  // Token para visitantes (armazenado no sessionStorage)
  const [tokenVisitante, setTokenVisitante] = useState(() =>
    sessionStorage.getItem("chatSuporteToken")
  );

  // ID da conversa salva (para persistência)
  const [conversaIdSalva] = useState(() => {
    const saved = sessionStorage.getItem("chatSuporteConversaId");
    return saved ? parseInt(saved) : null;
  });

  // ═══════════════════════════════════════════════════════════════
  // EFEITOS
  // ═══════════════════════════════════════════════════════════════

  // Preenche dados do usuário logado
  useEffect(() => {
    if (isAuthenticated && user) {
      setNome(user.nome || "");
      setEmail(user.email || "");
    }
  }, [isAuthenticated, user]);

  // PERSISTÊNCIA: Carrega conversa ativa ao montar o componente ou quando usuário muda
  useEffect(() => {
    const carregarConversaAtiva = async () => {
      // Reset estados antes de carregar
      setConversa(null);
      setMensagens([]);
      setPosicaoFila(null);
      setShowAvaliacao(false);

      try {
        // Para usuário logado
        if (isAuthenticated && user?.id) {
          setShowIdentification(false);

          const response = await api.get("/chat-suporte/conversas", {
            params: { status: "BOT,AGUARDANDO_ATENDENTE,EM_ATENDIMENTO" },
          });

          const conversas = response.data || [];
          const conversaAtiva = conversas[0];

          if (conversaAtiva) {
            console.log(
              "📂 Conversa ativa encontrada:",
              conversaAtiva.id,
              conversaAtiva.status
            );
            setConversa(conversaAtiva);

            // Carrega mensagens
            const msgResponse = await api.get(
              `/chat-suporte/conversas/${conversaAtiva.id}`
            );
            setMensagens(msgResponse.data.mensagens || []);

            if (conversaAtiva.status === STATUS.AGUARDANDO_ATENDENTE) {
              setPosicaoFila(msgResponse.data.posicaoFila);
            }
          } else {
            console.log("📂 Nenhuma conversa ativa para usuário logado");
          }
        }
        // Para visitante com token salvo
        else if (tokenVisitante && conversaIdSalva) {
          try {
            const response = await api.get(
              `/chat-suporte/visitante/conversas/${conversaIdSalva}`,
              { headers: { "x-chat-token": tokenVisitante } }
            );

            const conversaData = response.data.conversa || response.data;

            if (conversaData && conversaData.status !== STATUS.FINALIZADA) {
              console.log(
                "📂 Conversa de visitante encontrada:",
                conversaData.id,
                conversaData.status
              );
              setConversa(conversaData);
              setMensagens(response.data.mensagens || []);
              setShowIdentification(false);

              if (conversaData.status === STATUS.AGUARDANDO_ATENDENTE) {
                setPosicaoFila(response.data.posicaoFila);
              }
            } else {
              // Conversa finalizada, mostra identificação
              setShowIdentification(true);
            }
          } catch (err) {
            // Conversa não encontrada ou expirada, limpa dados
            console.log("⚠️ Conversa de visitante não encontrada ou expirada");
            sessionStorage.removeItem("chatSuporteToken");
            sessionStorage.removeItem("chatSuporteConversaId");
            setShowIdentification(true);
          }
        } else if (!isAuthenticated) {
          // Visitante sem token - mostrar identificação
          setShowIdentification(true);
        }
      } catch (err) {
        console.error("Erro ao carregar conversa ativa:", err);
      } finally {
        setConversaCarregada(true);
      }
    };

    carregarConversaAtiva();
  }, [isAuthenticated, user?.id]); // Remove outras dependências para evitar loops

  // Salva ID da conversa quando ela é criada
  useEffect(() => {
    if (conversa?.id) {
      sessionStorage.setItem("chatSuporteConversaId", conversa.id.toString());
    }
  }, [conversa?.id]);

  // Controla contador de mensagens não lidas quando minimiza/abre
  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Quando abre o chat, zera o contador e marca todas as mensagens como vistas
      setMensagensNaoLidas(0);
      mensagens.forEach((m) => mensagensVistasRef.current.add(m.id));
    }
  }, [isOpen, isMinimized, mensagens]);

  // Quando recebe novas mensagens e está minimizado, incrementa contador
  useEffect(() => {
    if (!isMinimized) return;

    // Encontra mensagens que ainda não foram vistas
    const mensagensNovas = mensagens.filter(
      (m) => m.id && !mensagensVistasRef.current.has(m.id)
    );

    if (mensagensNovas.length === 0) return;

    // Filtra apenas mensagens que não são do próprio usuário
    const mensagensDeOutros = mensagensNovas.filter(
      (m) => m.origem !== "USUARIO" || m.remetente_id !== user?.id
    );

    // Marca todas as novas mensagens como processadas (mesmo as do próprio usuário)
    mensagensNovas.forEach((m) => mensagensVistasRef.current.add(m.id));

    // Incrementa contador apenas com mensagens de outros
    if (mensagensDeOutros.length > 0) {
      setMensagensNaoLidas((prev) => prev + mensagensDeOutros.length);
    }
  }, [mensagens, isMinimized, user?.id]);

  // Rola para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens]);

  // Configura listeners do Socket.IO quando a conversa está ativa
  // NOTA: Só funciona para usuários logados (socket requer autenticação)
  useEffect(() => {
    // Só configura socket se estiver autenticado e tiver conversa
    if (!conversa?.id || !isAuthenticated || !socketService.isConnected())
      return;

    // Entra na sala da conversa
    socketService.emit("chat-suporte:entrar", conversa.id);

    // Listener para novas mensagens
    const unsubMensagem = socketService.on("chat-suporte:mensagem", (data) => {
      if (data.conversa_id === conversa.id) {
        setMensagens((prev) => {
          // Evita duplicatas
          if (prev.find((m) => m.id === data.mensagem.id)) return prev;
          return [...prev, data.mensagem];
        });
      }
    });

    // Listener para digitando
    const unsubDigitando = socketService.on(
      "chat-suporte:digitando",
      (data) => {
        if (data.conversa_id === conversa.id) {
          setDigitando(data.nome);
        }
      }
    );

    // Listener para parou de digitar
    const unsubParouDigitar = socketService.on(
      "chat-suporte:parou-digitar",
      (data) => {
        if (data.conversa_id === conversa.id) {
          setDigitando(null);
        }
      }
    );

    // Listener para atendente entrou
    const unsubAtendenteEntrou = socketService.on(
      "chat-suporte:atendente-entrou",
      (data) => {
        if (data.conversa_id === conversa.id) {
          console.log("🎉 Atendente entrou na conversa:", data);
          setConversa((prev) => ({
            ...prev,
            status: STATUS.EM_ATENDIMENTO,
            atendente_nome: data.atendente_nome,
          }));
          setPosicaoFila(null);
        }
      }
    );

    // Listener para conversa finalizada
    const unsubFinalizada = socketService.on(
      "chat-suporte:conversa-finalizada",
      (data) => {
        if (data.conversa_id === conversa.id) {
          setConversa((prev) => ({ ...prev, status: STATUS.FINALIZADA }));
          setShowAvaliacao(true);
        }
      }
    );

    // Listener para atualização da fila
    const unsubFilaAtualizada = socketService.on(
      "chat-suporte:fila-atualizada",
      (data) => {
        if (data.posicao && data.conversa_id === conversa.id) {
          setPosicaoFila(data.posicao);
        }
      }
    );

    return () => {
      if (socketService.isConnected()) {
        socketService.emit("chat-suporte:sair", conversa.id);
      }
      unsubMensagem && unsubMensagem();
      unsubDigitando && unsubDigitando();
      unsubParouDigitar && unsubParouDigitar();
      unsubAtendenteEntrou && unsubAtendenteEntrou();
      unsubFinalizada && unsubFinalizada();
      unsubFilaAtualizada && unsubFilaAtualizada();
    };
  }, [conversa?.id, isAuthenticated]);

  // Polling para verificar atualizações da conversa
  // Funciona para visitantes não autenticados e também como fallback para usuários logados
  useEffect(() => {
    if (!conversa?.id) {
      console.log("🔄 Polling: Sem conversa ativa");
      return;
    }
    if (conversa.status === STATUS.FINALIZADA) {
      console.log("🔄 Polling: Conversa finalizada, polling não necessário");
      return;
    }

    const conversaId = conversa.id;
    console.log(
      `🔄 Polling iniciado para conversa ${conversaId}, isAuth: ${isAuthenticated}, token: ${tokenVisitante ? "presente" : "ausente"}`
    );

    // Para visitantes: usa o token
    // Para usuários logados: usa autenticação normal
    const checkStatus = async () => {
      try {
        let response;

        if (!isAuthenticated && tokenVisitante) {
          console.log(
            `📡 Polling visitante: /chat-suporte/visitante/conversas/${conversaId}`
          );
          response = await api.get(
            `/chat-suporte/visitante/conversas/${conversaId}`,
            { headers: { "x-chat-token": tokenVisitante } }
          );
        } else if (isAuthenticated) {
          response = await api.get(`/chat-suporte/conversas/${conversaId}`);
        } else {
          console.log("⚠️ Polling: Não autenticado e sem token visitante");
          return;
        }

        const conversaAtualizada = response.data.conversa || response.data;
        const novasMensagens = response.data.mensagens || [];

        console.log(
          `📡 Polling resposta: status=${conversaAtualizada.status}, mensagens=${novasMensagens.length}`
        );

        // Atualiza conversa com dados novos
        setConversa((prev) => {
          if (!prev) return prev;

          // Se o status mudou, loga
          if (
            conversaAtualizada.status &&
            conversaAtualizada.status !== prev.status
          ) {
            console.log(
              `🔄 Status mudou: ${prev.status} -> ${conversaAtualizada.status}`
            );

            if (conversaAtualizada.status === STATUS.EM_ATENDIMENTO) {
              console.log("✅ Atendente aceitou a conversa!");
              setPosicaoFila(null);
            }

            if (conversaAtualizada.status === STATUS.FINALIZADA) {
              setShowAvaliacao(true);
            }
          }

          return {
            ...prev,
            status: conversaAtualizada.status,
            atendente_nome: conversaAtualizada.atendente_nome,
          };
        });

        // Atualiza posição na fila
        if (response.data.posicaoFila !== undefined) {
          setPosicaoFila(response.data.posicaoFila);
        }

        // Atualiza mensagens - sempre sincronizar (substitui completamente)
        if (novasMensagens.length > 0) {
          setMensagens(novasMensagens);
        }
      } catch (err) {
        console.error("Erro no polling:", err);
      }
    };

    // Executa imediatamente ao montar
    checkStatus();

    // Intervalo de polling: 3 segundos
    pollingRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [conversa?.id, isAuthenticated, tokenVisitante]);

  // Foca no input quando abre
  useEffect(() => {
    if (isOpen && !showIdentification && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, showIdentification]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  // Inicia uma nova conversa
  const iniciarConversa = async () => {
    if (!nome.trim() || !email.trim()) {
      setError("Preencha nome e email para continuar");
      return;
    }

    // Validação básica de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email inválido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;

      if (isAuthenticated) {
        // Usuário logado - usa rota autenticada
        response = await api.post("/chat-suporte/conversas");
      } else {
        // Visitante - usa rota pública
        response = await api.post("/chat-suporte/conversas/iniciar", {
          nome: nome.trim(),
          email: email.trim(),
        });

        // Salva token do visitante
        if (response.data.tokenVisitante) {
          sessionStorage.setItem(
            "chatSuporteToken",
            response.data.tokenVisitante
          );
          setTokenVisitante(response.data.tokenVisitante);
        }
      }

      setConversa(response.data.conversa);
      setMensagens(response.data.mensagens || []);
      setShowIdentification(false);
    } catch (err) {
      console.error("Erro ao iniciar conversa:", err);
      setError(err.response?.data?.error || "Erro ao iniciar conversa");
    } finally {
      setLoading(false);
    }
  };

  // Envia mensagem
  const enviarMensagem = async (e) => {
    e?.preventDefault();

    if (!novaMensagem.trim() || enviando || !conversa?.id) return;

    const mensagemTexto = novaMensagem.trim();
    setNovaMensagem("");
    setEnviando(true);

    // Emite evento de parou de digitar (só se socket estiver conectado)
    if (socketService.isConnected()) {
      socketService.emit("chat-suporte:parou-digitar", {
        conversa_id: conversa.id,
      });
    }

    try {
      let response;

      if (isAuthenticated) {
        // Usuário logado - usa rota autenticada
        response = await api.post(
          `/chat-suporte/conversas/${conversa.id}/mensagens`,
          { mensagem: mensagemTexto }
        );
      } else {
        // Visitante - usa rota pública com token
        response = await api.post(
          `/chat-suporte/visitante/conversas/${conversa.id}/mensagens`,
          { mensagem: mensagemTexto, token: tokenVisitante }
        );
      }

      // Adiciona mensagem do usuário (se não veio via socket)
      if (response.data.mensagemUsuario) {
        setMensagens((prev) => {
          if (prev.find((m) => m.id === response.data.mensagemUsuario.id))
            return prev;
          return [...prev, response.data.mensagemUsuario];
        });
      }

      // Adiciona resposta do bot (se houver e não veio via socket)
      if (response.data.mensagemBot) {
        setMensagens((prev) => {
          if (prev.find((m) => m.id === response.data.mensagemBot.id))
            return prev;
          return [...prev, response.data.mensagemBot];
        });
      }

      // Atualiza status se solicitou humano
      if (response.data.solicitouHumano) {
        setConversa((prev) => ({
          ...prev,
          status: STATUS.AGUARDANDO_ATENDENTE,
        }));
        setPosicaoFila(response.data.posicaoFila);
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      setError(err.response?.data?.error || "Erro ao enviar mensagem");
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  };

  // Emite evento de digitando (só se socket conectado)
  const handleTyping = useCallback(() => {
    if (!conversa?.id || !socketService.isConnected()) return;

    socketService.emit("chat-suporte:digitando", {
      conversa_id: conversa.id,
      nome: nome || "Visitante",
    });

    // Limpa timeout anterior
    if (digitandoTimeoutRef.current) {
      clearTimeout(digitandoTimeoutRef.current);
    }

    // Emite parou de digitar após 2 segundos
    digitandoTimeoutRef.current = setTimeout(() => {
      socketService.emit("chat-suporte:parou-digitar", {
        conversa_id: conversa.id,
      });
    }, 2000);
  }, [conversa?.id, nome]);

  // Solicita atendimento humano
  const solicitarAtendente = async () => {
    if (!conversa?.id) return;

    setLoading(true);
    try {
      let response;

      if (isAuthenticated) {
        response = await api.post(
          `/chat-suporte/conversas/${conversa.id}/solicitar-atendente`
        );
      } else {
        response = await api.post(
          `/chat-suporte/visitante/conversas/${conversa.id}/solicitar-atendente`,
          { token: tokenVisitante }
        );
      }

      setConversa((prev) => ({ ...prev, status: STATUS.AGUARDANDO_ATENDENTE }));
      setPosicaoFila(response.data.posicao);

      if (response.data.jaEstaNaFila) {
        setError("Você já está na fila de atendimento");
      }
    } catch (err) {
      console.error("Erro ao solicitar atendente:", err);
      setError(err.response?.data?.error || "Erro ao solicitar atendente");
    } finally {
      setLoading(false);
    }
  };

  // Finaliza conversa
  const finalizarConversa = async () => {
    if (!conversa?.id) return;

    try {
      await api.post(`/chat-suporte/conversas/${conversa.id}/finalizar`);
      setConversa((prev) => ({ ...prev, status: STATUS.FINALIZADA }));
      setShowAvaliacao(true);
    } catch (err) {
      console.error("Erro ao finalizar conversa:", err);
    }
  };

  // Envia avaliação
  const enviarAvaliacao = async () => {
    if (!notaAvaliacao || !conversa?.id) return;

    try {
      await api.post(`/chat-suporte/conversas/${conversa.id}/avaliar`, {
        nota: notaAvaliacao,
        comentario: comentarioAvaliacao,
      });
      setAvaliacaoEnviada(true);
    } catch (err) {
      console.error("Erro ao enviar avaliação:", err);
      setError("Erro ao enviar avaliação");
    }
  };

  // Inicia nova conversa após finalizar
  const iniciarNovaConversa = () => {
    // Limpa dados salvos
    sessionStorage.removeItem("chatSuporteConversaId");
    if (!isAuthenticated) {
      sessionStorage.removeItem("chatSuporteToken");
      setTokenVisitante(null);
    }

    setConversa(null);
    setMensagens([]);
    setShowIdentification(!isAuthenticated);
    setShowAvaliacao(false);
    setAvaliacaoEnviada(false);
    setNotaAvaliacao(0);
    setComentarioAvaliacao("");
    setPosicaoFila(null);
    setError(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════

  // Renderiza formulário de identificação
  const renderIdentificacao = () => (
    <div className="chat-widget-identification">
      <div className="chat-widget-identification-header">
        <h3>Olá! 👋</h3>
        <p>Para iniciar o atendimento, precisamos de algumas informações.</p>
      </div>

      <div className="chat-widget-form">
        <div className="chat-widget-field">
          <label>
            <FiUser size={16} />
            Nome
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            disabled={isAuthenticated}
            className={isAuthenticated ? "disabled" : ""}
          />
        </div>

        <div className="chat-widget-field">
          <label>
            <FiMail size={16} />
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            disabled={isAuthenticated}
            className={isAuthenticated ? "disabled" : ""}
          />
        </div>

        {error && <div className="chat-widget-error">{error}</div>}

        <button
          className="chat-widget-start-btn"
          onClick={iniciarConversa}
          disabled={loading}
        >
          {loading ? (
            <>
              <FiLoader className="spin" size={16} />
              Iniciando...
            </>
          ) : (
            <>
              <FiMessageCircle size={16} />
              Iniciar Conversa
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Renderiza mensagens
  const renderMensagens = () => (
    <div className="chat-widget-messages">
      {mensagens.map((msg, index) => (
        <div
          key={msg.id || index}
          className={`chat-widget-message ${msg.origem.toLowerCase()}`}
        >
          <div className="chat-widget-message-content">{msg.mensagem}</div>
          <div className="chat-widget-message-time">
            {new Date(msg.criado_em).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      ))}

      {/* Indicador de digitando */}
      {digitando && (
        <div className="chat-widget-typing">
          <span>{digitando} está digitando</span>
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {/* Indicador de posição na fila */}
      {conversa?.status === STATUS.AGUARDANDO_ATENDENTE && posicaoFila && (
        <div className="chat-widget-queue">
          <FiLoader className="spin" size={16} />
          <span>
            Aguardando atendente... Posição na fila:{" "}
            <strong>{posicaoFila}</strong>
          </span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );

  // Renderiza avaliação
  const renderAvaliacao = () => (
    <div className="chat-widget-rating">
      {avaliacaoEnviada ? (
        <div className="chat-widget-rating-success">
          <FiCheck size={32} />
          <h4>Obrigado pela avaliação!</h4>
          <p>Sua opinião é muito importante para nós.</p>
          <button onClick={iniciarNovaConversa}>Iniciar Nova Conversa</button>
        </div>
      ) : (
        <>
          <h4>Como foi o atendimento?</h4>
          <div className="chat-widget-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`star-btn ${star <= notaAvaliacao ? "active" : ""}`}
                onClick={() => setNotaAvaliacao(star)}
              >
                <FiStar size={24} />
              </button>
            ))}
          </div>
          <textarea
            placeholder="Deixe um comentário (opcional)"
            value={comentarioAvaliacao}
            onChange={(e) => setComentarioAvaliacao(e.target.value)}
          />
          <div className="chat-widget-rating-actions">
            <button className="skip-btn" onClick={iniciarNovaConversa}>
              Pular
            </button>
            <button
              className="submit-btn"
              onClick={enviarAvaliacao}
              disabled={!notaAvaliacao}
            >
              Enviar Avaliação
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Renderiza área de input
  const renderInput = () => (
    <form className="chat-widget-input" onSubmit={enviarMensagem}>
      {/* Botão de solicitar atendente (se ainda com bot) */}
      {conversa?.status === STATUS.BOT && (
        <button
          type="button"
          className="chat-widget-human-btn"
          onClick={solicitarAtendente}
          title="Falar com atendente"
        >
          <FiPhone size={18} />
        </button>
      )}

      <input
        ref={inputRef}
        type="text"
        value={novaMensagem}
        onChange={(e) => {
          setNovaMensagem(e.target.value);
          handleTyping();
        }}
        placeholder={
          conversa?.status === STATUS.AGUARDANDO_ATENDENTE
            ? "Aguardando atendente..."
            : "Digite sua mensagem..."
        }
        disabled={enviando || conversa?.status === STATUS.FINALIZADA}
      />

      <button
        type="submit"
        disabled={!novaMensagem.trim() || enviando}
        className="chat-widget-send-btn"
      >
        {enviando ? (
          <FiLoader className="spin" size={18} />
        ) : (
          <FiSend size={18} />
        )}
      </button>
    </form>
  );

  // Status badge
  const getStatusBadge = () => {
    if (!conversa) return null;

    const statusConfig = {
      [STATUS.BOT]: { label: "Bot", color: "blue" },
      [STATUS.AGUARDANDO_ATENDENTE]: { label: "Na fila", color: "yellow" },
      [STATUS.EM_ATENDIMENTO]: { label: "Em atendimento", color: "green" },
      [STATUS.FINALIZADA]: { label: "Finalizada", color: "gray" },
    };

    const config = statusConfig[conversa.status] || statusConfig[STATUS.BOT];

    return (
      <span className={`chat-widget-status ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          className="chat-widget-fab"
          onClick={() => setIsOpen(true)}
          title="Abrir chat de suporte"
        >
          <FiMessageCircle size={24} />
        </button>
      )}

      {/* Janela do chat */}
      {isOpen && (
        <div className={`chat-widget ${isMinimized ? "minimized" : ""}`}>
          {/* Header */}
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <h3>Suporte</h3>
              {getStatusBadge()}
              {/* Badge de mensagens não lidas quando minimizado */}
              {isMinimized && mensagensNaoLidas > 0 && (
                <span className="chat-unread-badge">
                  {mensagensNaoLidas > 9 ? "9+" : mensagensNaoLidas}
                </span>
              )}
            </div>
            <div className="chat-widget-header-actions">
              <button
                onClick={() => {
                  setIsMinimized(!isMinimized);
                  if (isMinimized) {
                    // Ao maximizar, zera contador e marca todas como vistas
                    setMensagensNaoLidas(0);
                    mensagens.forEach((m) =>
                      mensagensVistasRef.current.add(m.id)
                    );
                  }
                }}
                title={isMinimized ? "Maximizar" : "Minimizar"}
              >
                {isMinimized ? (
                  <FiMaximize2 size={16} />
                ) : (
                  <FiMinimize2 size={16} />
                )}
              </button>
              <button onClick={() => setIsOpen(false)} title="Fechar">
                <FiX size={16} />
              </button>
            </div>
          </div>

          {/* Conteúdo (não exibe se minimizado) */}
          {!isMinimized && (
            <div className="chat-widget-body">
              {showAvaliacao ? (
                renderAvaliacao()
              ) : conversa?.status === STATUS.FINALIZADA ? (
                // Conversa finalizada - mostrar opção de iniciar nova
                <div className="chat-widget-finished">
                  <div className="chat-widget-finished-icon">
                    <FiCheck size={48} />
                  </div>
                  <h4>Atendimento Finalizado</h4>
                  <p>Obrigado por entrar em contato conosco!</p>
                  <button
                    className="chat-widget-new-btn"
                    onClick={iniciarNovaConversa}
                  >
                    Iniciar Nova Conversa
                  </button>
                </div>
              ) : showIdentification ? (
                renderIdentificacao()
              ) : !conversa ? (
                // Usuário logado sem conversa ativa - mostrar botão para iniciar
                <div className="chat-widget-start">
                  <div className="chat-widget-start-icon">
                    <FiMessageCircle size={48} />
                  </div>
                  <h4>Olá, {nome || "usuário"}! 👋</h4>
                  <p>Como podemos ajudar você hoje?</p>
                  <button
                    className="chat-widget-start-btn"
                    onClick={iniciarConversa}
                    disabled={loading}
                  >
                    {loading ? (
                      <FiLoader className="spin" size={18} />
                    ) : (
                      <>
                        <FiMessageCircle size={18} />
                        Iniciar Conversa
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {renderMensagens()}
                  {conversa?.status !== STATUS.FINALIZADA && renderInput()}

                  {/* Botão de finalizar (se em atendimento) */}
                  {conversa?.status === STATUS.EM_ATENDIMENTO && (
                    <button
                      className="chat-widget-end-btn"
                      onClick={finalizarConversa}
                    >
                      Finalizar Atendimento
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
