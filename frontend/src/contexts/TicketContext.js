import logger from "../utils/logger";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TICKET CONTEXT - Gerenciamento Centralizado de Tickets de Suporte
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * - Gerenciar estado global de tickets
 * - Sincronizar via Socket.IO em tempo real
 * - Cachear dados no sessionStorage
 * - Fornecer contador de tickets não visualizados (badge)
 * - Fornecer contador de tickets abertos
 * - Tocar som de notificação para novos tickets
 *
 * Eventos Socket:
 * - ticket:create     → Novo ticket criado
 * - ticket:update     → Ticket atualizado
 * - ticket:viewed     → Ticket visualizado
 * - ticket:all_viewed → Todos tickets marcados como vistos
 *
 * Uso: const { tickets, unseenCount, ticketsAbertos } = useTickets();
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
import api from "../services/api";
import * as socketService from "../services/socketService";
import { getCache, setCache } from "../services/cacheService";
import { useAuth } from "../hooks/useAuth";

// Importar som de notificação
import notificacaoSom from "../assets/notificacao.mp3";

const TicketContext = createContext({});

export function TicketProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [ticketsAbertos, setTicketsAbertos] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0); // Tickets não visualizados
  const [isLoading, setIsLoading] = useState(true);
  const socketListenersRef = useRef([]);
  const isInitializedRef = useRef(false);
  const isFirstLoadRef = useRef(true);
  const audioRef = useRef(null);

  // Inicializar áudio
  useEffect(() => {
    audioRef.current = new Audio(notificacaoSom);
    audioRef.current.volume = 0.7;
  }, []);

  // Função para tocar som de notificação
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        logger.log("Não foi possível tocar som de notificação:", err.message);
      });
    }
  }, []);

  // Calcular tickets abertos e não vistos
  const calcularTicketsAbertos = useCallback((ticketList) => {
    const abertos = ticketList.filter((t) => t.status === "Aberto").length;
    const naoVistos = ticketList.filter((t) => !t.visualizado).length;
    setTicketsAbertos(abertos);
    setUnseenCount(naoVistos);
    return abertos;
  }, []);

  // Setup dos listeners do socket
  const setupSocketListeners = useCallback(() => {
    // Limpar listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // Listener para novo ticket criado
    const unsubCreate = socketService.on("ticket:create", (ticket) => {
      logger.log(
        "🎫 TicketContext: Novo ticket recebido via socket",
        ticket.id
      );

      // Toca som de notificação (apenas se não for o primeiro load)
      if (!isFirstLoadRef.current) {
        playNotificationSound();
      }

      setTickets((prev) => {
        if (prev.find((t) => t.id === ticket.id)) return prev;
        const novosTickets = [ticket, ...prev].sort(
          (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)
        );
        setCache("tickets", novosTickets);
        calcularTicketsAbertos(novosTickets);
        return novosTickets;
      });
    });

    // Listener para ticket atualizado
    const unsubUpdate = socketService.on("ticket:update", (dados) => {
      logger.log("🎫 TicketContext: Ticket atualizado via socket", dados.id);
      setTickets((prev) => {
        const novosTickets = prev
          .map((t) => (t.id === dados.id ? { ...t, ...dados } : t))
          .sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
        setCache("tickets", novosTickets);
        calcularTicketsAbertos(novosTickets);
        return novosTickets;
      });
    });

    // Listener para ticket visualizado
    const unsubViewed = socketService.on("ticket:viewed", (dados) => {
      logger.log("🎫 TicketContext: Ticket visualizado via socket", dados.id);
      setTickets((prev) => {
        const novosTickets = prev.map((t) =>
          t.id === dados.id ? { ...t, visualizado: true } : t
        );
        setCache("tickets", novosTickets);
        calcularTicketsAbertos(novosTickets); // Recalcula unseenCount
        return novosTickets;
      });
    });

    // Listener para todos visualizados
    const unsubAllViewed = socketService.on("ticket:all_viewed", () => {
      logger.log("🎫 TicketContext: Todos tickets visualizados via socket");
      setTickets((prev) => {
        const novosTickets = prev.map((t) => ({ ...t, visualizado: true }));
        setCache("tickets", novosTickets);
        calcularTicketsAbertos(novosTickets); // Recalcula unseenCount (será 0)
        return novosTickets;
      });
    });

    socketListenersRef.current.push(
      unsubCreate,
      unsubUpdate,
      unsubViewed,
      unsubAllViewed
    );
  }, [calcularTicketsAbertos, playNotificationSound]);

  // Conectar socket
  const connectSocket = useCallback(() => {
    const token = localStorage.getItem("token");
    if (token && !socketService.isConnected()) {
      logger.log("🎫 TicketContext: Conectando socket...");
      socketService.connect(token);
    }
  }, []);

  // Buscar tickets da API
  const fetchTickets = useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated) return;

      try {
        // Usar cache se disponível e não for refresh forçado
        if (!forceRefresh) {
          const cachedTickets = getCache("tickets");
          if (cachedTickets && cachedTickets.length > 0) {
            logger.log(
              "🎫 TicketContext: Carregando do cache",
              cachedTickets.length,
              "tickets"
            );
            setTickets(cachedTickets);
            calcularTicketsAbertos(cachedTickets);
            setIsLoading(false);
          }
        }

        // Buscar da API
        const response = await api.get("/tickets");
        const sorted = response.data.sort(
          (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)
        );

        logger.log(
          "🎫 TicketContext: Carregado da API",
          sorted.length,
          "tickets"
        );
        setTickets(sorted);
        setCache("tickets", sorted);
        calcularTicketsAbertos(sorted);
        isInitializedRef.current = true;
        isFirstLoadRef.current = false; // Marca que o primeiro load terminou
      } catch (error) {
        logger.error("Erro ao buscar tickets:", error);
        // Usar cache em caso de erro
        const cachedTickets = getCache("tickets");
        if (cachedTickets) {
          setTickets(cachedTickets);
          calcularTicketsAbertos(cachedTickets);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, calcularTicketsAbertos]
  );

  // Inicialização quando usuário loga
  useEffect(() => {
    if (isAuthenticated && !isInitializedRef.current) {
      logger.log("🎫 TicketContext: Inicializando...");

      // Primeiro conecta o socket
      connectSocket();

      // Depois configura os listeners
      setupSocketListeners();

      // Por fim carrega os tickets
      fetchTickets();
    }

    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
  }, [isAuthenticated, fetchTickets, setupSocketListeners, connectSocket]);

  // Limpar quando usuário desloga
  useEffect(() => {
    if (!isAuthenticated) {
      setTickets([]);
      setTicketsAbertos(0);
      setUnseenCount(0);
      isInitializedRef.current = false;
      isFirstLoadRef.current = true;
    }
  }, [isAuthenticated]);

  // Atualizar contagem quando tickets mudam
  useEffect(() => {
    calcularTicketsAbertos(tickets);
  }, [tickets, calcularTicketsAbertos]);

  const value = {
    tickets,
    setTickets,
    ticketsAbertos,
    unseenCount, // Tickets não vistos (para badge de notificação)
    isLoading,
    fetchTickets,
    setupSocketListeners,
  };

  return (
    <TicketContext.Provider value={value}>{children}</TicketContext.Provider>
  );
}

export function useTickets() {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error("useTickets deve ser usado dentro de um TicketProvider");
  }
  return context;
}

export default TicketContext;


