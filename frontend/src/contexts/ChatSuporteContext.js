/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT SUPORTE CONTEXT - Gerenciamento Global de Notificações de Chat
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * - Manter contagem da fila de atendimento em tempo real
 * - Gerenciar mensagens não lidas por conversa
 * - Notificar atendentes sobre novas mensagens/conversas
 * - Emitir notificações globais no sistema (usando ToastContext)
 *
 * IMPORTANTE: Socket.IO é usado para TEMPO REAL. Os listeners são registrados
 * uma única vez e usam refs para evitar problemas de stale closures.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { toast } from "./ToastContext";
import { useAuth } from "../hooks/useAuth";
import { usePermissoes } from "../hooks/usePermissoes";
import api from "../services/api";
import * as socketService from "../services/socketService";
import logger from "../utils/logger";
import notificacaoSound from "../assets/notificacao.mp3";

const ChatSuporteContext = createContext({});

export function ChatSuporteProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const { temPermissao, loading: permissoesLoading } = usePermissoes();

  // Estados de notificação - FUNCIONAM GLOBALMENTE
  const [filaCount, setFilaCount] = useState(0);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState({}); // { conversaId: count }
  const [totalMensagensNaoLidas, setTotalMensagensNaoLidas] = useState(0);
  const [conversasAtivas, setConversasAtivas] = useState([]);
  const [inicializado, setInicializado] = useState(false);

  // Ref para saber qual conversa está sendo visualizada
  const conversaVisualizandoRef = useRef(null);

  // Ref para rastrear mensagens já processadas (evita duplicação por estar em múltiplas salas)
  const mensagensProcessadasRef = useRef(new Set());

  // Refs para evitar stale closures nos callbacks do socket
  const isAtendenteRef = useRef(false);
  const temPermissaoChatRef = useRef(false);
  const userIdRef = useRef(null);
  const isAuthenticatedRef = useRef(false);
  const socketListenersRef = useRef([]);

  // Verifica se usuário é atendente (pode aceitar conversas)
  // temPermissao() já verifica ADMIN internamente
  const isAtendente =
    !permissoesLoading && temPermissao("chat_atendente_acessar_painel");

  // Verifica se usuário tem QUALQUER permissão de chat (para ver notificações no menu)
  const temPermissaoChat =
    !permissoesLoading &&
    (temPermissao("chat_visualizar") ||
      temPermissao("chat_enviar") ||
      temPermissao("chat_atendente_acessar_painel") ||
      temPermissao("chat_atendente_aceitar") ||
      temPermissao("chat_atendente_transferir") ||
      temPermissao("chat_atendente_finalizar") ||
      temPermissao("chat_gerenciar_faq") ||
      temPermissao("chat_visualizar_auditoria") ||
      temPermissao("chat_visualizar_relatorios") ||
      temPermissao("chat_gerenciar_configuracoes"));

  // Atualiza refs quando valores mudam
  useEffect(() => {
    isAtendenteRef.current = isAtendente;
    temPermissaoChatRef.current = temPermissaoChat;
    userIdRef.current = user?.id;
    isAuthenticatedRef.current = isAuthenticated;

    logger.log("📊 [ChatSuporteContext GLOBAL] Estado atualizado:", {
      isAtendente,
      temPermissaoChat,
      userId: user?.id,
      isAuthenticated,
      permissoesLoading,
    });
  }, [
    isAtendente,
    temPermissaoChat,
    user?.id,
    isAuthenticated,
    permissoesLoading,
  ]);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES DE CARREGAMENTO (usando refs para evitar stale closures)
  // ═══════════════════════════════════════════════════════════════

  // Carrega o contador da fila para TODOS com permissão de chat
  const carregarContadorFilaInterno = async () => {
    if (!temPermissaoChatRef.current || !isAuthenticatedRef.current) {
      logger.log(
        "📋 [Context] Skipping fila count - sem permissão de chat ou não autenticado",
      );
      return;
    }

    try {
      // Usa endpoint de atendente para obter a fila (retorna mesmo se não for atendente, pois verifica permissão no backend)
      const response = await api.get("/chat-suporte/atendente/fila");
      const fila = response.data.fila || [];
      logger.log(
        "📋 [Context] Contador da fila carregado:",
        fila.length,
        "conversas",
      );
      setFilaCount(fila.length);
      return fila.length;
    } catch (err) {
      // Se erro 403, usuário não tem permissão - não é erro crítico
      if (err.response?.status === 403) {
        logger.log("📋 [Context] Sem permissão para acessar fila");
        return 0;
      }
      logger.error("Erro ao carregar contador da fila:", err);
      return 0;
    }
  };

  const carregarFilaInterno = async () => {
    if (!isAtendenteRef.current || !isAuthenticatedRef.current) {
      logger.log(
        "📋 [Context] Skipping fila load - not atendente or not authenticated",
      );
      return;
    }

    try {
      const response = await api.get("/chat-suporte/atendente/fila");
      const fila = response.data.fila || [];
      logger.log("📋 [Context] Fila carregada:", fila.length, "conversas");
      setFilaCount(fila.length);
    } catch (err) {
      logger.error("Erro ao carregar fila:", err);
    }
  };

  const carregarConversasAtivasInterno = async () => {
    if (!isAtendenteRef.current || !isAuthenticatedRef.current) {
      logger.log(
        "💬 [Context] Skipping conversas load - not atendente or not authenticated",
      );
      return;
    }

    try {
      const response = await api.get(
        "/chat-suporte/atendente/minhas-conversas",
      );
      const conversas = response.data.conversas || [];
      logger.log("💬 [Context] Conversas ativas carregadas:", conversas.length);
      setConversasAtivas(conversas);
    } catch (err) {
      logger.error("Erro ao carregar conversas ativas:", err);
    }
  };

  // Funções públicas (wrappers)
  const carregarFila = useCallback(() => {
    return carregarFilaInterno();
  }, []);

  const carregarConversasAtivas = useCallback(() => {
    return carregarConversasAtivasInterno();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO INICIAL - AGUARDA PERMISSÕES
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    // Aguarda permissões serem carregadas antes de fazer qualquer coisa
    if (permissoesLoading) {
      logger.log("⏳ [ChatSuporteContext] Aguardando permissões carregarem...");
      return;
    }

    // TODOS que têm permissão de chat podem ver notificações
    if (!isAuthenticated || !temPermissaoChat) {
      logger.log(
        "🚫 [ChatSuporteContext] Sem permissão de chat ou não autenticado, limpando estados",
      );
      setFilaCount(0);
      setMensagensNaoLidas({});
      setTotalMensagensNaoLidas(0);
      setInicializado(false);
      return;
    }

    logger.log(
      "✅ [ChatSuporteContext] Permissões carregadas! temPermissaoChat:",
      temPermissaoChat,
      "isAtendente:",
      isAtendente,
    );

    // Carrega contador da fila para TODOS com permissão de chat (para o badge no menu)
    carregarContadorFilaInterno();

    // Carrega dados completos APENAS se é atendente (pode aceitar conversas)
    if (isAtendente) {
      carregarFilaInterno();
      carregarConversasAtivasInterno();
    }

    // Marca como inicializado para TODOS com permissão de chat
    setInicializado(true);
  }, [isAuthenticated, temPermissaoChat, isAtendente, permissoesLoading]);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO LISTENERS - PARA TODOS COM PERMISSÃO DE CHAT
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    // Registra listeners para TODOS com permissão de chat (não apenas atendentes)
    if (!inicializado || !isAuthenticated || !temPermissaoChat) {
      logger.log(
        "⏳ [ChatSuporteContext] Socket: Aguardando inicialização...",
        {
          inicializado,
          isAuthenticated,
          temPermissaoChat,
          isAtendente,
        },
      );
      return;
    }

    logger.log(
      "🔌 [ChatSuporteContext GLOBAL] ═══════════════════════════════════",
    );
    logger.log(
      "🔌 [ChatSuporteContext GLOBAL] REGISTRANDO LISTENERS DE SOCKET!",
    );
    logger.log("🔌 [ChatSuporteContext GLOBAL] User ID:", userIdRef.current);
    logger.log("🔌 [ChatSuporteContext GLOBAL] isAtendente:", isAtendente);
    logger.log(
      "🔌 [ChatSuporteContext GLOBAL] ═══════════════════════════════════",
    );

    // Conecta ao namespace /suporte (dedicado para chat de suporte)
    const token = localStorage.getItem("token");
    if (token && !socketService.isSuporteConnected()) {
      logger.log(
        "🔌 [ChatSuporteContext GLOBAL] Conectando ao namespace /suporte...",
      );
      socketService.connectSuporte(token);
    }

    // Função para verificar e notificar sobre conversas pendentes na fila
    const verificarFilaPendente = async () => {
      try {
        const response = await api.get("/chat-suporte/atendente/fila");
        const fila = response.data.fila || [];

        console.log(
          "📋 [Context GLOBAL] Verificando fila pendente:",
          fila.length,
          "conversas",
        );

        if (fila.length > 0) {
          setFilaCount(fila.length);

          // Mostra toast de notificação se não houver um ativo
          const toastId =
            fila.length === 1
              ? `nova-fila-${fila[0].conversa_id}`
              : "nova-fila-pendentes";

          if (!toast.isActive(toastId)) {
            const mensagem =
              fila.length === 1
                ? `🆕 ${fila[0].nome_visitante || fila[0].nome_usuario || "Um visitante"} está aguardando atendimento`
                : `📋 Há ${fila.length} conversas aguardando atendimento`;

            console.log(
              "📢 [Context GLOBAL] Mostrando toast de fila pendente:",
              mensagem,
            );

            toast.info(mensagem, {
              toastId: toastId,
              autoClose: 8000,
              onClick: () => {
                window.location.href = "/chat-suporte/atendente";
              },
            });
          }
        }
      } catch (err) {
        // Se erro 403, usuário não tem permissão - ignora silenciosamente
        if (err.response?.status !== 403) {
          console.error("Erro ao verificar fila pendente:", err);
        }
      }
    };

    // Função para entrar nas salas do namespace /suporte
    const entrarSalasSuporte = () => {
      if (socketService.isSuporteConnected() && temPermissaoChatRef.current) {
        console.log(
          "👥 [Context GLOBAL] Entrando nas salas do /suporte... ID:",
          userIdRef.current,
        );
        // Emite evento para entrar na sala de notificações
        socketService.emitSuporte("suporte:entrar-notificacoes", {
          usuario_id: userIdRef.current,
        });

        // Se é atendente, também entra na sala de atendentes
        if (isAtendenteRef.current) {
          console.log(
            "👨‍💼 [Context GLOBAL] Também entrando na sala de atendentes...",
          );
          socketService.emitSuporte("suporte:entrar-atendentes", {
            atendente_id: userIdRef.current,
          });
        }

        // Verifica se há conversas pendentes e mostra notificação
        // Delay pequeno para garantir que os listeners já foram registrados
        setTimeout(() => {
          verificarFilaPendente();
        }, 500);
      }
    };

    // IMPORTANTE: Entra nas salas IMEDIATAMENTE se já conectado
    // O evento "connected" pode já ter sido disparado antes deste useEffect
    if (socketService.isSuporteConnected()) {
      console.log(
        "🔌 [Context GLOBAL] Socket /suporte JÁ conectado, entrando nas salas AGORA!",
      );
      entrarSalasSuporte();
    }

    // Também registra para quando conectar/reconectar
    const unsubConnected = socketService.onSuporte("connected", () => {
      console.log(
        "✅ [Context GLOBAL] Socket /suporte conectado (evento), entrando nas salas...",
      );
      entrarSalasSuporte();
      // Recarrega dados ao reconectar (apenas se é atendente)
      if (isAtendenteRef.current) {
        carregarFilaInterno();
        carregarConversasAtivasInterno();
      }
    });

    // Intervalo para heartbeat - apenas para atendentes que precisam aceitar conversas
    const heartbeatInterval = setInterval(() => {
      if (socketService.isSuporteConnected() && isAtendenteRef.current) {
        socketService.emitSuporte("suporte:heartbeat-atendente", {
          atendente_id: userIdRef.current,
        });
      }
    }, 120000); // A cada 2 minutos

    // Listener para nova conversa na fila - ATUALIZA CONTADOR VIA SOCKET (sem requisição)
    const unsubNovaFila = socketService.onSuporte(
      "suporte:nova-fila",
      (data) => {
        console.log("📢 [Context GLOBAL] SOCKET: Nova conversa na fila!", data);
        console.log(
          "📢 [Context GLOBAL] solicitante_id:",
          data?.solicitante_id,
          "| userId:",
          userIdRef.current,
        );

        // Se o solicitante foi o próprio usuário, não mostra toast (ele já sabe que solicitou)
        // Mas ainda atualiza o contador
        const isMinhaSolicitacao =
          data?.solicitante_id && data.solicitante_id === userIdRef.current;

        // Atualiza o contador usando o filaCount recebido do backend
        if (data?.filaCount !== undefined) {
          console.log(
            "📢 [Context GLOBAL] Atualizando filaCount para:",
            data.filaCount,
          );
          setFilaCount(data.filaCount);
        } else {
          // Fallback: incrementa se não recebeu o count
          console.log("📢 [Context GLOBAL] Incrementando filaCount");
          setFilaCount((prev) => prev + 1);
        }

        // Se foi o próprio usuário que solicitou, não mostra toast
        if (isMinhaSolicitacao) {
          console.log(
            "📢 [Context GLOBAL] É minha própria solicitação, não mostrando toast",
          );
          return;
        }

        // Cria ID único para evitar toasts duplicados
        // Para pendentes, usa um ID fixo para não mostrar múltiplos toasts
        const toastId = data?.pendentes
          ? "nova-fila-pendentes"
          : `nova-fila-${data?.conversa_id || Date.now()}`;

        console.log(
          "📢 [Context GLOBAL] ToastId:",
          toastId,
          "| toast.isActive:",
          toast.isActive(toastId),
        );

        // Verifica se já existe toast ativo com este ID (evita duplicata de múltiplas salas)
        if (toast.isActive(toastId)) {
          console.log(
            "📢 [Context GLOBAL] Toast nova-fila já ativo, ignorando duplicata:",
            toastId,
          );
          return;
        }

        // Mensagem diferente para conversas pendentes (que entraram antes do atendente logar)
        const mensagemToast =
          data?.pendentes && data?.filaCount > 1
            ? `📋 Há ${data.filaCount} conversas aguardando atendimento`
            : `🆕 ${data?.nome || "Um visitante"} está aguardando atendimento`;

        console.log("📢 [Context GLOBAL] Exibindo toast:", mensagemToast);

        toast.info(mensagemToast, {
          toastId: toastId,
          autoClose: 8000,
          onClick: () => {
            // Navega para o painel de atendimento ao clicar
            window.location.href = "/chat-suporte/atendente";
          },
        });

        // Toca som de notificação
        try {
          const audio = new Audio(notificacaoSound);
          audio.volume = 0.5;
          audio.play().catch((err) => {
            console.log("🔇 Erro ao tocar som:", err.message);
          });
        } catch (e) {
          console.log("🔇 Erro ao criar áudio:", e.message);
        }
      },
    );

    // Listener para fila atualizada (recebe o tamanho da fila via socket)
    const unsubFilaAtualizada = socketService.onSuporte(
      "suporte:fila-atualizada",
      (data) => {
        console.log("📢 [Context GLOBAL] SOCKET: Fila atualizada!", data);

        // Atualiza contador diretamente se recebeu o tamanho
        if (data?.fila !== undefined) {
          const novoCount = Array.isArray(data.fila)
            ? data.fila.length
            : data.filaCount || 0;
          console.log(
            "📢 [Context GLOBAL] Atualizando filaCount para:",
            novoCount,
          );
          setFilaCount(novoCount);
        } else if (data?.filaCount !== undefined) {
          console.log(
            "📢 [Context GLOBAL] Atualizando filaCount para:",
            data.filaCount,
          );
          setFilaCount(data.filaCount);
        }
        // Se não recebeu dados, decrementa (provavelmente uma conversa foi aceita)
        else {
          setFilaCount((prev) => Math.max(0, prev - 1));
        }
      },
    );

    // Listener para nova mensagem (atualiza contadores E emite toast)
    const unsubMensagem = socketService.onSuporte(
      "suporte:mensagem",
      (data) => {
        logger.log("📢 [Context GLOBAL] SOCKET: Nova mensagem recebida!", data);

        // Cria ID único para a mensagem (para evitar processar duplicatas)
        const mensagemId =
          data.mensagem?.id ||
          `${data.conversa_id}-${data.mensagem?.criado_em || Date.now()}`;

        // Verifica se esta mensagem já foi processada (pode chegar duplicada de múltiplas salas)
        if (mensagensProcessadasRef.current.has(mensagemId)) {
          logger.log(
            "📢 [Context GLOBAL] Mensagem já processada, ignorando:",
            mensagemId,
          );
          return;
        }

        // Marca como processada (limpa após 5 segundos para não acumular)
        mensagensProcessadasRef.current.add(mensagemId);
        setTimeout(() => {
          mensagensProcessadasRef.current.delete(mensagemId);
        }, 5000);

        logger.log(
          "📢 [Context GLOBAL] Conversa visualizando:",
          conversaVisualizandoRef.current,
        );
        logger.log(
          "📢 [Context GLOBAL] Conversa da mensagem:",
          data.conversa_id,
        );

        // Verifica se é uma mensagem de cliente (não do atendente/bot/sistema)
        const origem = data.mensagem?.origem || data.origem;
        const isMessageFromClient =
          origem === "USUARIO" || origem === "VISITANTE";

        logger.log(
          "📢 [Context GLOBAL] Origem da mensagem:",
          origem,
          "| É do cliente:",
          isMessageFromClient,
        );

        // Se não é a conversa sendo visualizada E é mensagem de cliente
        if (
          data.conversa_id !== conversaVisualizandoRef.current &&
          isMessageFromClient
        ) {
          logger.log(
            "📢 [Context GLOBAL] Incrementando contador de não lidas para conversa:",
            data.conversa_id,
          );

          // Incrementa contador de não lidas
          setMensagensNaoLidas((prev) => {
            const newCount = (prev[data.conversa_id] || 0) + 1;
            logger.log(
              "📢 [Context GLOBAL] Novo contador para conversa",
              data.conversa_id,
              ":",
              newCount,
            );
            return {
              ...prev,
              [data.conversa_id]: newCount,
            };
          });

          // Emite notificação toast para nova mensagem
          const nomeRemetente =
            data.mensagem?.remetente_nome ||
            data.mensagem?.nome_remetente ||
            data.nome ||
            "Cliente";
          const textoMensagem = data.mensagem?.mensagem || data.mensagem || "";
          const previewMensagem =
            typeof textoMensagem === "string"
              ? textoMensagem.substring(0, 50)
              : "Nova mensagem";

          // Cria um ID único para o toast baseado na mensagem para evitar duplicação
          const mensagemId =
            data.mensagem?.id || `${data.conversa_id}-${Date.now()}`;
          const toastId = `msg-${mensagemId}`;

          logger.log(
            "📢 [Context GLOBAL] Exibindo toast para:",
            nomeRemetente,
            "-",
            previewMensagem,
            "| ToastID:",
            toastId,
          );

          // Só exibe se não existir toast com mesmo ID (evita duplicação)
          if (!toast.isActive(toastId)) {
            toast.info(
              `💬 ${nomeRemetente}: ${previewMensagem}${previewMensagem.length >= 50 ? "..." : ""}`,
              {
                toastId: toastId,
                autoClose: 5000,
                onClick: () => {
                  // Navega para o painel de atendimento ao clicar
                  window.location.href = "/chat-suporte/atendente";
                },
              },
            );

            // Toca som de notificação (mais suave para mensagens)
            try {
              const audio = new Audio(notificacaoSound);
              audio.volume = 0.3;
              audio.play().catch((err) => {
                logger.log("🔇 Erro ao tocar som:", err.message);
              });
            } catch (e) {
              logger.log("🔇 Erro ao criar áudio:", e.message);
            }
          }
        }

        // Atualiza conversas ativas
        carregarConversasAtivasInterno();
      },
    );

    // Listener para conversa aceita por outro atendente
    const unsubAtendenteEntrou = socketService.onSuporte(
      "suporte:atendente-entrou",
      () => {
        logger.log("📢 [Context GLOBAL] SOCKET: Atendente entrou em conversa!");
        carregarFilaInterno();
        carregarConversasAtivasInterno();
      },
    );

    // Listener para conversa finalizada
    const unsubFinalizada = socketService.onSuporte(
      "suporte:conversa-finalizada",
      (data) => {
        logger.log("📢 [Context GLOBAL] SOCKET: Conversa finalizada!", data);
        // Remove mensagens não lidas desta conversa
        setMensagensNaoLidas((prev) => {
          const updated = { ...prev };
          delete updated[data.conversa_id];
          return updated;
        });
        carregarConversasAtivasInterno();
      },
    );

    return () => {
      logger.log(
        "🔌 [ChatSuporteContext GLOBAL] Removendo listeners de socket...",
      );
      // Limpa o heartbeat
      clearInterval(heartbeatInterval);

      // Só emite offline se é atendente e estiver deslogando
      if (socketService.isSuporteConnected() && isAtendenteRef.current) {
        socketService.emitSuporte("suporte:atendente-offline", {
          atendente_id: userIdRef.current,
        });
      }
      // Desconecta do namespace /suporte
      socketService.disconnectSuporte();

      unsubConnected && unsubConnected();
      unsubNovaFila && unsubNovaFila();
      unsubFilaAtualizada && unsubFilaAtualizada();
      unsubMensagem && unsubMensagem();
      unsubAtendenteEntrou && unsubAtendenteEntrou();
      unsubFinalizada && unsubFinalizada();
    };
  }, [inicializado, isAuthenticated, temPermissaoChat, isAtendente]); // Dependências atualizadas

  // ═══════════════════════════════════════════════════════════════
  // CALCULAR TOTAIS
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    const total = Object.values(mensagensNaoLidas).reduce(
      (acc, count) => acc + count,
      0,
    );
    setTotalMensagensNaoLidas(total);
  }, [mensagensNaoLidas]);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES EXPOSTAS
  // ═══════════════════════════════════════════════════════════════

  // Marca que está visualizando uma conversa (zera contador)
  const visualizandoConversa = useCallback((conversaId) => {
    conversaVisualizandoRef.current = conversaId;

    if (conversaId) {
      setMensagensNaoLidas((prev) => {
        const updated = { ...prev };
        delete updated[conversaId];
        return updated;
      });
    }
  }, []);

  // Sai da visualização de conversa
  const saiuConversa = useCallback(() => {
    conversaVisualizandoRef.current = null;
  }, []);

  // Força atualização
  const atualizarDados = useCallback(() => {
    carregarFila();
    carregarConversasAtivas();
  }, [carregarFila, carregarConversasAtivas]);

  return (
    <ChatSuporteContext.Provider
      value={{
        // Estados
        filaCount,
        mensagensNaoLidas,
        totalMensagensNaoLidas,
        conversasAtivas,
        isAtendente,

        // Funções
        visualizandoConversa,
        saiuConversa,
        atualizarDados,
        carregarFila,
        carregarConversasAtivas,
      }}
    >
      {children}
    </ChatSuporteContext.Provider>
  );
}

export const useChatSuporte = () => {
  const context = useContext(ChatSuporteContext);
  if (!context) {
    // Retorna valores padrão se usado fora do provider
    return {
      filaCount: 0,
      mensagensNaoLidas: {},
      totalMensagensNaoLidas: 0,
      conversasAtivas: [],
      isAtendente: false,
      visualizandoConversa: () => {},
      saiuConversa: () => {},
      atualizarDados: () => {},
      carregarFila: () => {},
      carregarConversasAtivas: () => {},
    };
  }
  return context;
};
