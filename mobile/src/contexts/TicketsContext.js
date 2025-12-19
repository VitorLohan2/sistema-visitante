// src/contexts/TicketsContext.js
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const TicketsContext = createContext();

export function TicketsProvider({ children }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Controla se já carregou uma vez
  const hasLoadedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // ✅ CARREGAR TICKETS (apenas 1x ou quando forçado)
  const loadTickets = useCallback(async (forceReload = false) => {
    // Se já carregou e não é reload forçado, retorna tickets atuais
    if (hasLoadedRef.current && !forceReload) {
      console.log("✅ Usando cache de tickets");
      // Retorna via callback para ter acesso ao estado atual
      return new Promise((resolve) => {
        setTickets((currentTickets) => {
          resolve(currentTickets);
          return currentTickets;
        });
      });
    }

    // Previne múltiplas requisições simultâneas
    if (isFetchingRef.current) {
      console.log("⏳ Já existe uma requisição em andamento");
      return new Promise((resolve) => {
        setTickets((currentTickets) => {
          resolve(currentTickets);
          return currentTickets;
        });
      });
    }

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      if (!ongId) {
        setLoading(false);
        isFetchingRef.current = false;
        return [];
      }

      console.log("📡 Carregando tickets do servidor...");

      const response = await api.get("/tickets", {
        headers: { Authorization: ongId },
      });

      if (!Array.isArray(response.data)) {
        console.warn("⚠️ Resposta inesperada:", response.data);
        setLoading(false);
        isFetchingRef.current = false;
        return [];
      }

      setTickets(response.data);
      hasLoadedRef.current = true;

      console.log(`✅ ${response.data.length} tickets carregados no cache`);

      return response.data;
    } catch (err) {
      console.error("❌ Erro ao carregar tickets:", err.message);
      return [];
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []); // ← SEM DEPENDÊNCIAS!

  // ✅ ADICIONAR TICKET (via Socket)
  const addTicket = useCallback((newTicket) => {
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === newTicket.id);
      if (exists) {
        console.log("⚠️ Ticket já existe, ignorando");
        return prev;
      }
      console.log("➕ Adicionando ticket ao cache:", newTicket.id);
      return [newTicket, ...prev];
    });
  }, []); // ← SEM DEPENDÊNCIAS!

  // ✅ ATUALIZAR TICKET (via Socket ou manual)
  const updateTicket = useCallback((updatedData) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === updatedData.id ? { ...ticket, ...updatedData } : ticket
      )
    );
    console.log("🔄 Ticket atualizado no cache:", updatedData.id);
  }, []); // ← SEM DEPENDÊNCIAS!

  // ✅ MARCAR COMO VISUALIZADO
  const markAsViewed = useCallback((ticketId) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, visualizado: true } : ticket
      )
    );
    console.log("👁️ Ticket marcado como visto:", ticketId);
  }, []); // ← SEM DEPENDÊNCIAS!

  // ✅ MARCAR TODOS COMO VISUALIZADOS
  const markAllAsViewed = useCallback(() => {
    setTickets((prev) =>
      prev.map((ticket) => ({ ...ticket, visualizado: true }))
    );
    console.log("👁️ Todos tickets marcados como vistos");
  }, []); // ← SEM DEPENDÊNCIAS!

  // ✅ REMOVER TICKET
  const removeTicket = useCallback((ticketId) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    console.log("🗑️ Ticket removido do cache:", ticketId);
  }, []); // ← SEM DEPENDÊNCIAS!

  // ✅ FORÇAR RECARGA (pull-to-refresh)
  const refreshTickets = useCallback(async () => {
    console.log("🔄 Forçando recarga de tickets...");
    hasLoadedRef.current = false;
    return await loadTickets(true);
  }, [loadTickets]); // ← loadTickets é estável agora

  // ✅ LIMPAR CACHE (logout)
  const clearCache = useCallback(() => {
    setTickets([]);
    hasLoadedRef.current = false;
    isFetchingRef.current = false;
    setLoading(true);
    console.log("🧹 Cache de tickets limpo");
  }, []); // ← SEM DEPENDÊNCIAS!

  const value = {
    tickets,
    loading,
    loadTickets,
    addTicket,
    updateTicket,
    markAsViewed,
    markAllAsViewed,
    removeTicket,
    refreshTickets,
    clearCache,
  };

  return (
    <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>
  );
}

export function useTickets() {
  const context = useContext(TicketsContext);
  if (!context) {
    throw new Error("useTickets deve ser usado dentro de TicketsProvider");
  }
  return context;
}
