import logger from "../utils/logger";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AGENDAMENTO CONTEXT - Gerenciamento Centralizado de Agendamentos
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * - Gerenciar estado global de agendamentos
 * - Sincronizar via Socket.IO em tempo real
 * - Cachear dados no sessionStorage
 * - Fornecer contador de agendamentos não confirmados (badge)
 * - Tocar som de notificação para novos agendamentos
 *
 * Eventos Socket:
 * - agendamento:create  → Novo agendamento criado
 * - agendamento:update  → Agendamento atualizado
 * - agendamento:delete  → Agendamento removido
 *
 * Uso: const { agendamentos, agendamentosAbertos } = useAgendamentos();
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

const AgendamentoContext = createContext({});

export function AgendamentoProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [agendamentosAbertos, setAgendamentosAbertos] = useState(0);
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

  // Calcular agendamentos em aberto (não confirmados)
  const calcularAgendamentosAbertos = useCallback((agendamentoList) => {
    const abertos = agendamentoList.filter((a) => !a.confirmado).length;
    setAgendamentosAbertos(abertos);
    return abertos;
  }, []);

  // Setup dos listeners do socket
  const setupSocketListeners = useCallback(() => {
    // Limpar listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // Listener para novo agendamento criado
    const unsubCreate = socketService.on(
      "agendamento:create",
      (agendamento) => {
        logger.log(
          "📅 AgendamentoContext: Novo agendamento recebido via socket",
          agendamento.id
        );

        setAgendamentos((prev) => {
          // Verificação mais robusta contra duplicação
          const jaExiste = prev.some((a) => a.id === agendamento.id);
          if (jaExiste) {
            logger.log(
              "⚠️ Agendamento já existe, ignorando duplicação:",
              agendamento.id
            );
            return prev;
          }

          // Toca som de notificação (apenas se não for o primeiro load)
          if (!isFirstLoadRef.current) {
            playNotificationSound();
          }

          const novosAgendamentos = [agendamento, ...prev].sort(
            (a, b) =>
              new Date(b.horario_agendado) - new Date(a.horario_agendado)
          );
          setCache("agendamentos", novosAgendamentos);
          calcularAgendamentosAbertos(novosAgendamentos);
          return novosAgendamentos;
        });
      }
    );

    // Listener para agendamento atualizado
    const unsubUpdate = socketService.on("agendamento:update", (dados) => {
      logger.log(
        "📅 AgendamentoContext: Agendamento atualizado via socket",
        dados.id
      );
      setAgendamentos((prev) => {
        const novosAgendamentos = prev
          .map((a) => (a.id === dados.id ? { ...a, ...dados } : a))
          .sort(
            (a, b) =>
              new Date(b.horario_agendado) - new Date(a.horario_agendado)
          );
        setCache("agendamentos", novosAgendamentos);
        calcularAgendamentosAbertos(novosAgendamentos);
        return novosAgendamentos;
      });
    });

    // Listener para agendamento deletado
    const unsubDelete = socketService.on("agendamento:delete", (dados) => {
      logger.log(
        "📅 AgendamentoContext: Agendamento removido via socket",
        dados.id
      );
      setAgendamentos((prev) => {
        const novosAgendamentos = prev.filter((a) => a.id !== dados.id);
        setCache("agendamentos", novosAgendamentos);
        calcularAgendamentosAbertos(novosAgendamentos);
        return novosAgendamentos;
      });
    });

    socketListenersRef.current.push(unsubCreate, unsubUpdate, unsubDelete);
  }, [calcularAgendamentosAbertos, playNotificationSound]);

  // Conectar socket
  const connectSocket = useCallback(() => {
    const token = localStorage.getItem("token");
    if (token && !socketService.isConnected()) {
      logger.log("📅 AgendamentoContext: Conectando socket...");
      socketService.connect(token);
    }
  }, []);

  // Buscar agendamentos da API
  const fetchAgendamentos = useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated) return;

      try {
        // Usar cache se disponível e não for refresh forçado
        if (!forceRefresh) {
          const cachedAgendamentos = getCache("agendamentos");
          if (cachedAgendamentos && cachedAgendamentos.length > 0) {
            logger.log(
              "📅 AgendamentoContext: Carregando do cache",
              cachedAgendamentos.length,
              "agendamentos"
            );
            setAgendamentos(cachedAgendamentos);
            calcularAgendamentosAbertos(cachedAgendamentos);
            setIsLoading(false);
          }
        }

        // Buscar da API
        const response = await api.get("/agendamentos");
        const sorted = response.data.sort(
          (a, b) => new Date(b.horario_agendado) - new Date(a.horario_agendado)
        );

        logger.log(
          "📅 AgendamentoContext: Carregado da API",
          sorted.length,
          "agendamentos"
        );
        setAgendamentos(sorted);
        setCache("agendamentos", sorted);
        calcularAgendamentosAbertos(sorted);
        isInitializedRef.current = true;
        isFirstLoadRef.current = false;
      } catch (error) {
        logger.error("Erro ao buscar agendamentos:", error);
        // Usar cache em caso de erro
        const cachedAgendamentos = getCache("agendamentos");
        if (cachedAgendamentos) {
          setAgendamentos(cachedAgendamentos);
          calcularAgendamentosAbertos(cachedAgendamentos);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, calcularAgendamentosAbertos]
  );

  // Inicialização quando usuário loga
  useEffect(() => {
    if (isAuthenticated && !isInitializedRef.current) {
      logger.log("📅 AgendamentoContext: Inicializando...");

      // Primeiro conecta o socket
      connectSocket();

      // Depois configura os listeners
      setupSocketListeners();

      // Por fim carrega os agendamentos
      fetchAgendamentos();
    }

    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
  }, [isAuthenticated, fetchAgendamentos, setupSocketListeners, connectSocket]);

  // Limpar quando usuário desloga
  useEffect(() => {
    if (!isAuthenticated) {
      setAgendamentos([]);
      setAgendamentosAbertos(0);
      isInitializedRef.current = false;
      isFirstLoadRef.current = true;
    }
  }, [isAuthenticated]);

  // Atualizar contagem quando agendamentos mudam
  useEffect(() => {
    calcularAgendamentosAbertos(agendamentos);
  }, [agendamentos, calcularAgendamentosAbertos]);

  // Adicionar agendamento localmente
  const addAgendamento = useCallback((agendamento) => {
    setAgendamentos((prev) => {
      const novosAgendamentos = [agendamento, ...prev].sort(
        (a, b) => new Date(b.horario_agendado) - new Date(a.horario_agendado)
      );
      setCache("agendamentos", novosAgendamentos);
      return novosAgendamentos;
    });
  }, []);

  // Atualizar agendamento localmente
  const updateAgendamento = useCallback((id, dados) => {
    setAgendamentos((prev) => {
      const novosAgendamentos = prev.map((a) =>
        a.id === id ? { ...a, ...dados } : a
      );
      setCache("agendamentos", novosAgendamentos);
      return novosAgendamentos;
    });
  }, []);

  // Remover agendamento localmente
  const removeAgendamento = useCallback((id) => {
    setAgendamentos((prev) => {
      const novosAgendamentos = prev.filter((a) => a.id !== id);
      setCache("agendamentos", novosAgendamentos);
      return novosAgendamentos;
    });
  }, []);

  const value = {
    agendamentos,
    setAgendamentos,
    agendamentosAbertos,
    isLoading,
    fetchAgendamentos,
    addAgendamento,
    updateAgendamento,
    removeAgendamento,
  };

  return (
    <AgendamentoContext.Provider value={value}>
      {children}
    </AgendamentoContext.Provider>
  );
}

export function useAgendamentos() {
  const context = useContext(AgendamentoContext);
  if (!context) {
    throw new Error(
      "useAgendamentos deve ser usado dentro de um AgendamentoProvider"
    );
  }
  return context;
}

export default AgendamentoContext;


