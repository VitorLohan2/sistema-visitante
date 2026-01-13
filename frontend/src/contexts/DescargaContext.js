// src/contexts/DescargaContext.js
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
import { useAuth } from "../hooks/useAuth";

// Importar som de notificação
import notificacaoSom from "../assets/notificacao.mp3";

const DescargaContext = createContext({});

export function DescargaProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const socketListenersRef = useRef([]);
  const isInitializedRef = useRef(false);
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
        console.log("Não foi possível tocar som de notificação:", err.message);
      });
    }
  }, []);

  // Buscar contagem de solicitações pendentes
  const fetchPendentes = useCallback(async () => {
    if (!isAuthenticated) {
      setSolicitacoesPendentes(0);
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get("/solicitacoes-descarga/pendentes/count");
      setSolicitacoesPendentes(response.data.count || 0);
    } catch (error) {
      console.error("Erro ao buscar solicitações pendentes:", error);
      setSolicitacoesPendentes(0);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Setup dos listeners do socket
  const setupSocketListeners = useCallback(() => {
    // Limpar listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // Listener para nova solicitação de descarga
    const unsubNova = socketService.on("descarga:nova", (solicitacao) => {
      console.log(
        "🚚 DescargaContext: Nova solicitação recebida via socket",
        solicitacao.protocolo
      );

      // Toca som de notificação
      playNotificationSound();

      // Incrementar contador de pendentes
      setSolicitacoesPendentes((prev) => prev + 1);
    });

    // Listener para solicitação atualizada (aprovada/rejeitada/ajustada)
    const unsubAtualizada = socketService.on("descarga:atualizada", (dados) => {
      console.log(
        "🚚 DescargaContext: Solicitação atualizada via socket",
        dados.id
      );

      // Se foi aprovada ou rejeitada, decrementar contador de pendentes
      if (dados.status === "aprovado" || dados.status === "rejeitado") {
        setSolicitacoesPendentes((prev) => Math.max(0, prev - 1));
      }
    });

    socketListenersRef.current = [unsubNova, unsubAtualizada];
  }, [playNotificationSound]);

  // Inicialização
  useEffect(() => {
    if (!isAuthenticated || isInitializedRef.current) return;

    isInitializedRef.current = true;
    fetchPendentes();
    setupSocketListeners();

    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
      isInitializedRef.current = false;
    };
  }, [isAuthenticated, fetchPendentes, setupSocketListeners]);

  // Resetar ao deslogar
  useEffect(() => {
    if (!isAuthenticated) {
      setSolicitacoesPendentes(0);
      isInitializedRef.current = false;
    }
  }, [isAuthenticated]);

  // Atualizar manualmente (pode ser chamado após aprovar/rejeitar)
  const refreshPendentes = useCallback(() => {
    fetchPendentes();
  }, [fetchPendentes]);

  const value = {
    solicitacoesPendentes,
    isLoading,
    refreshPendentes,
  };

  return (
    <DescargaContext.Provider value={value}>
      {children}
    </DescargaContext.Provider>
  );
}

export function useDescargas() {
  const context = useContext(DescargaContext);

  if (!context) {
    throw new Error(
      "useDescargas deve ser usado dentro de um DescargaProvider"
    );
  }

  return context;
}

export default DescargaContext;
