/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT SUPORTE CONTEXT - Gerenciamento Global de Notificações de Chat
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * - Manter contagem da fila de atendimento em tempo real
 * - Gerenciar mensagens não lidas por conversa
 * - Notificar atendentes sobre novas mensagens/conversas
 * - Emitir notificações globais no sistema (usando react-toastify)
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
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";
import { usePermissoes } from "../hooks/usePermissoes";
import api from "../services/api";
import * as socketService from "../services/socketService";

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

  // Refs para evitar stale closures nos callbacks do socket
  const isAtendenteRef = useRef(false);
  const userIdRef = useRef(null);
  const isAuthenticatedRef = useRef(false);
  const socketListenersRef = useRef([]);

  // Verifica se usuário é atendente (aguarda permissões carregarem)
  // temPermissao() já verifica ADMIN internamente
  const isAtendente =
    !permissoesLoading && temPermissao("chat_atendente_acessar_painel");

  // Atualiza refs quando valores mudam
  useEffect(() => {
    isAtendenteRef.current = isAtendente;
    userIdRef.current = user?.id;
    isAuthenticatedRef.current = isAuthenticated;

    console.log("📊 [ChatSuporteContext GLOBAL] Estado atualizado:", {
      isAtendente,
      userId: user?.id,
      isAuthenticated,
      permissoesLoading,
    });
  }, [isAtendente, user?.id, isAuthenticated, permissoesLoading]);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES DE CARREGAMENTO (usando refs para evitar stale closures)
  // ═══════════════════════════════════════════════════════════════

  const carregarFilaInterno = async () => {
    if (!isAtendenteRef.current || !isAuthenticatedRef.current) {
      console.log(
        "📋 [Context] Skipping fila load - not atendente or not authenticated"
      );
      return;
    }

    try {
      const response = await api.get("/chat-suporte/atendente/fila");
      const fila = response.data.fila || [];
      console.log("📋 [Context] Fila carregada:", fila.length, "conversas");
      setFilaCount(fila.length);
    } catch (err) {
      console.error("Erro ao carregar fila:", err);
    }
  };

  const carregarConversasAtivasInterno = async () => {
    if (!isAtendenteRef.current || !isAuthenticatedRef.current) {
      console.log(
        "💬 [Context] Skipping conversas load - not atendente or not authenticated"
      );
      return;
    }

    try {
      const response = await api.get(
        "/chat-suporte/atendente/minhas-conversas"
      );
      const conversas = response.data.conversas || [];
      console.log(
        "💬 [Context] Conversas ativas carregadas:",
        conversas.length
      );
      setConversasAtivas(conversas);
    } catch (err) {
      console.error("Erro ao carregar conversas ativas:", err);
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
      console.log(
        "⏳ [ChatSuporteContext] Aguardando permissões carregarem..."
      );
      return;
    }

    if (!isAuthenticated || !isAtendente) {
      console.log(
        "🚫 [ChatSuporteContext] Não é atendente ou não autenticado, limpando estados"
      );
      setFilaCount(0);
      setMensagensNaoLidas({});
      setTotalMensagensNaoLidas(0);
      setInicializado(false);
      return;
    }

    console.log(
      "✅ [ChatSuporteContext] Permissões carregadas! isAtendente:",
      isAtendente
    );

    // Carrega dados iniciais
    carregarFilaInterno();
    carregarConversasAtivasInterno();

    // Marca como inicializado
    setInicializado(true);
  }, [isAuthenticated, isAtendente, permissoesLoading]);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO LISTENERS - SÓ REGISTRA APÓS INICIALIZAÇÃO
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    // Só registra listeners quando inicializado (permissões carregadas + é atendente)
    if (!inicializado || !isAuthenticated || !isAtendente) {
      console.log(
        "⏳ [ChatSuporteContext] Socket: Aguardando inicialização...",
        {
          inicializado,
          isAuthenticated,
          isAtendente,
        }
      );
      return;
    }

    console.log(
      "🔌 [ChatSuporteContext GLOBAL] ═══════════════════════════════════"
    );
    console.log(
      "🔌 [ChatSuporteContext GLOBAL] REGISTRANDO LISTENERS DE SOCKET!"
    );
    console.log(
      "🔌 [ChatSuporteContext GLOBAL] Atendente ID:",
      userIdRef.current
    );
    console.log(
      "🔌 [ChatSuporteContext GLOBAL] ═══════════════════════════════════"
    );

    // Garante que o socket está conectado
    const token = localStorage.getItem("token");
    if (token && !socketService.isConnected()) {
      console.log("🔌 [ChatSuporteContext GLOBAL] Conectando socket...");
      socketService.connect(token);
    }

    // Função para entrar na sala de atendentes
    const entrarSalaAtendentes = () => {
      if (socketService.isConnected() && isAtendenteRef.current) {
        console.log(
          "👨‍💼 [Context GLOBAL] Entrando na sala de atendentes... ID:",
          userIdRef.current
        );
        socketService.emit("chat-suporte:atendente-online", {
          atendente_id: userIdRef.current,
        });
      }
    };

    // Se já conectado, entra imediatamente
    if (socketService.isConnected()) {
      entrarSalaAtendentes();
    }

    // Também registra para quando conectar/reconectar
    const unsubConnected = socketService.on("connected", () => {
      console.log("✅ [Context GLOBAL] Socket conectado, entrando na sala...");
      entrarSalaAtendentes();
      // Recarrega dados ao reconectar
      carregarFilaInterno();
      carregarConversasAtivasInterno();
    });

    // Intervalo para manter o atendente na sala (heartbeat)
    // Isso garante que mesmo após navegação entre páginas, o atendente continua na sala
    const heartbeatInterval = setInterval(() => {
      if (socketService.isConnected() && isAtendenteRef.current) {
        socketService.emit("chat-suporte:atendente-online", {
          atendente_id: userIdRef.current,
        });
      }
    }, 30000); // A cada 30 segundos

    // Listener para nova conversa na fila
    const unsubNovaFila = socketService.on("chat-suporte:nova-fila", (data) => {
      console.log("📢 [Context GLOBAL] SOCKET: Nova conversa na fila!", data);

      // Atualiza a fila
      carregarFilaInterno();

      // Emite notificação toast para nova conversa na fila
      toast.info(
        `🆕 ${data?.nome || "Um visitante"} está aguardando atendimento`,
        {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          onClick: () => {
            // Navega para o painel de atendimento ao clicar
            window.location.href = "/chat-suporte/atendente";
          },
        }
      );

      // Toca som de notificação
      try {
        const audio = new Audio("/notification.mp3");
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {
        // Ignora erro de áudio
      }
    });

    // Listener para fila atualizada
    const unsubFilaAtualizada = socketService.on(
      "chat-suporte:fila-atualizada",
      () => {
        console.log("📢 [Context GLOBAL] SOCKET: Fila atualizada!");
        carregarFilaInterno();
      }
    );

    // Listener para nova mensagem (atualiza contadores E emite toast)
    const unsubMensagem = socketService.on("chat-suporte:mensagem", (data) => {
      console.log("📢 [Context GLOBAL] SOCKET: Nova mensagem recebida!", data);
      console.log(
        "📢 [Context GLOBAL] Conversa visualizando:",
        conversaVisualizandoRef.current
      );
      console.log(
        "📢 [Context GLOBAL] Conversa da mensagem:",
        data.conversa_id
      );

      // Verifica se é uma mensagem de cliente (não do atendente/bot/sistema)
      const origem = data.mensagem?.origem || data.origem;
      const isMessageFromClient =
        origem === "USUARIO" || origem === "VISITANTE";

      console.log(
        "📢 [Context GLOBAL] Origem da mensagem:",
        origem,
        "| É do cliente:",
        isMessageFromClient
      );

      // Se não é a conversa sendo visualizada E é mensagem de cliente
      if (
        data.conversa_id !== conversaVisualizandoRef.current &&
        isMessageFromClient
      ) {
        console.log(
          "📢 [Context GLOBAL] Incrementando contador de não lidas para conversa:",
          data.conversa_id
        );

        // Incrementa contador de não lidas
        setMensagensNaoLidas((prev) => {
          const newCount = (prev[data.conversa_id] || 0) + 1;
          console.log(
            "📢 [Context GLOBAL] Novo contador para conversa",
            data.conversa_id,
            ":",
            newCount
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

        console.log(
          "📢 [Context GLOBAL] Exibindo toast para:",
          nomeRemetente,
          "-",
          previewMensagem
        );

        toast.info(
          `💬 ${nomeRemetente}: ${previewMensagem}${previewMensagem.length >= 50 ? "..." : ""}`,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            onClick: () => {
              // Navega para o painel de atendimento ao clicar
              window.location.href = "/chat-suporte/atendente";
            },
          }
        );

        // Toca som de notificação (mais suave para mensagens)
        try {
          const audio = new Audio("/notification.mp3");
          audio.volume = 0.2;
          audio.play().catch(() => {});
        } catch (e) {
          // Ignora erro de áudio
        }
      }

      // Atualiza conversas ativas
      carregarConversasAtivasInterno();
    });

    // Listener para conversa aceita por outro atendente
    const unsubAtendenteEntrou = socketService.on(
      "chat-suporte:atendente-entrou",
      () => {
        console.log(
          "📢 [Context GLOBAL] SOCKET: Atendente entrou em conversa!"
        );
        carregarFilaInterno();
        carregarConversasAtivasInterno();
      }
    );

    // Listener para conversa finalizada
    const unsubFinalizada = socketService.on(
      "chat-suporte:conversa-finalizada",
      (data) => {
        console.log("📢 [Context GLOBAL] SOCKET: Conversa finalizada!", data);
        // Remove mensagens não lidas desta conversa
        setMensagensNaoLidas((prev) => {
          const updated = { ...prev };
          delete updated[data.conversa_id];
          return updated;
        });
        carregarConversasAtivasInterno();
      }
    );

    return () => {
      console.log(
        "🔌 [ChatSuporteContext GLOBAL] Removendo listeners de socket..."
      );
      // Limpa o heartbeat
      clearInterval(heartbeatInterval);

      // Só emite offline se estiver deslogando (não apenas navegando)
      // O contexto só é desmontado no logout
      if (socketService.isConnected()) {
        socketService.emit("chat-suporte:atendente-offline", {
          atendente_id: userIdRef.current,
        });
      }
      unsubConnected && unsubConnected();
      unsubNovaFila && unsubNovaFila();
      unsubFilaAtualizada && unsubFilaAtualizada();
      unsubMensagem && unsubMensagem();
      unsubAtendenteEntrou && unsubAtendenteEntrou();
      unsubFinalizada && unsubFinalizada();
    };
  }, [inicializado, isAuthenticated, isAtendente]); // Dependências - só executa quando inicializado

  // ═══════════════════════════════════════════════════════════════
  // CALCULAR TOTAIS
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    const total = Object.values(mensagensNaoLidas).reduce(
      (acc, count) => acc + count,
      0
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
