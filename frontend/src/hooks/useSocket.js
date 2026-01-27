/**
 * useSocket - Hook para gerenciar conexão Socket.IO
 *
 * Conecta automaticamente quando o usuário está logado
 * Desconecta automaticamente no logout
 * Permite registrar listeners para eventos em tempo real
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import * as socketService from "../services/socketService";
import logger from "../utils/logger";

export function useSocket() {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const listenersRef = useRef([]);

  // Conecta ao socket quando autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem("token");

      if (token) {
        logger.log("🔌 useSocket: Iniciando conexão...");
        socketService.connect(token);

        // Listener de conexão
        const unsubConnect = socketService.on("connected", (id) => {
          setIsConnected(true);
          setSocketId(id);
        });

        // Listener de desconexão
        const unsubDisconnect = socketService.on("disconnected", () => {
          setIsConnected(false);
          setSocketId(null);
        });

        listenersRef.current.push(unsubConnect, unsubDisconnect);
      }
    }

    return () => {
      // Limpa listeners ao desmontar
      listenersRef.current.forEach((unsub) => unsub && unsub());
      listenersRef.current = [];
    };
  }, [isAuthenticated, user]);

  // Desconecta no logout
  useEffect(() => {
    if (!isAuthenticated) {
      socketService.disconnect();
      setIsConnected(false);
      setSocketId(null);
    }
  }, [isAuthenticated]);

  /**
   * Registra um listener para um evento
   * Retorna função para remover o listener
   */
  const on = useCallback((event, callback) => {
    const unsubscribe = socketService.on(event, callback);
    listenersRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  /**
   * Remove um listener de um evento
   */
  const off = useCallback((event, callback) => {
    socketService.off(event, callback);
  }, []);

  /**
   * Emite um evento para o servidor
   */
  const emit = useCallback((event, data) => {
    socketService.emit(event, data);
  }, []);

  /**
   * Entra em uma sala
   */
  const joinRoom = useCallback((room) => {
    socketService.joinRoom(room);
  }, []);

  /**
   * Sai de uma sala
   */
  const leaveRoom = useCallback((room) => {
    socketService.leaveRoom(room);
  }, []);

  return {
    isConnected,
    socketId,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
    socket: socketService.getSocket(),
  };
}

export default useSocket;
