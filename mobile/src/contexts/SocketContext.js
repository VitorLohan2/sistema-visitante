// src/contexts/SocketContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  Constants.expoConfig?.extra?.API_URL || "http://192.168.10.92:3001";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);

  // ✅ Ref para evitar cleanup prematuro
  const isInitialized = useRef(false);

  const setAuthStatus = useCallback((status) => {
    console.log("🔥 setAuthStatus:", status);

    if (!status) {
      if (socketRef.current) {
        console.log("🔴 Desconectando socket por logout");
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      isInitialized.current = false;
    }

    setShouldConnect(status);
  }, []);

  const getSocket = useCallback(() => socketRef.current, []);

  const subscribe = useCallback((eventName, handler) => {
    if (!socketRef.current) {
      console.log("⚠ Socket não disponível para:", eventName);
      return () => {};
    }

    console.log("📡 Registrando listener via subscribe:", eventName);
    socketRef.current.on(eventName, handler);

    return () => {
      if (socketRef.current) {
        socketRef.current.off(eventName, handler);
      }
    };
  }, []);

  useEffect(() => {
    console.log("🔄 useEffect socket | shouldConnect =", shouldConnect);

    // Se não deve conectar, apenas retorna
    if (!shouldConnect) {
      return;
    }

    // Se já foi inicializado, não recria
    if (isInitialized.current && socketRef.current) {
      console.log("✅ Socket já inicializado:", socketRef.current.id);
      return;
    }

    const connectSocket = async () => {
      try {
        const ongId = await AsyncStorage.getItem("@Auth:ongId");
        const ongName = await AsyncStorage.getItem("@Auth:ongName");

        if (!ongId) {
          console.log("❌ Sem ongId. Abortando conexão.");
          return;
        }

        console.log("🔌 Criando conexão socket...");
        console.log("📡 URL:", API_URL);
        console.log("🆔 ONG:", ongId);

        const newSocket = io(API_URL, {
          transports: ["websocket"],
          query: { ongId, ongName },
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1500,
          timeout: 10000,
        });

        socketRef.current = newSocket;
        isInitialized.current = true;

        newSocket.on("connect", () => {
          console.log("✅ Socket conectado:", newSocket.id);
          setIsConnected(true);
          setSocket(newSocket);

          newSocket.emit("mobile_ready", {
            ongId,
            ongName,
            time: Date.now(),
          });

          console.log("📨 Evento mobile_ready enviado");
        });

        newSocket.on("teste:conexao", (data) => {
          console.log("🎉 TESTE RECEBIDO NO MOBILE:", data);
        });

        newSocket.on("connect_error", (err) => {
          console.log("❌ Erro de conexão:", err?.message || err);
          setIsConnected(false);
        });

        newSocket.on("disconnect", (reason) => {
          console.log("🔴 Socket desconectado:", reason);
          setIsConnected(false);

          // Não limpa o socket no estado para permitir reconexão
          if (reason === "io server disconnect") {
            // Servidor desconectou - tentar reconectar
            newSocket.connect();
          }
        });

        newSocket.on("reconnect", (attemptNumber) => {
          console.log(
            "🔄 Socket reconectado após",
            attemptNumber,
            "tentativas"
          );
          setIsConnected(true);
          setSocket(newSocket);
        });

        newSocket.on("reconnect_attempt", (attemptNumber) => {
          console.log("🔄 Tentativa de reconexão:", attemptNumber);
        });

        newSocket.on("reconnect_error", (error) => {
          console.log("❌ Erro na reconexão:", error.message);
        });

        newSocket.on("reconnect_failed", () => {
          console.log("❌ Falha ao reconectar após todas as tentativas");
        });
      } catch (error) {
        console.error("❌ Erro ao criar socket:", error);
      }
    };

    connectSocket();

    // ✅ Cleanup APENAS quando o componente for realmente desmontado
    return () => {
      if (!shouldConnect) {
        console.log("🧹 Limpando conexão socket (componente desmontado)");
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        setSocket(null);
        setIsConnected(false);
        isInitialized.current = false;
      }
    };
  }, [shouldConnect]); // ✅ APENAS shouldConnect como dependência

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        setAuthStatus,
        subscribe,
        getSocket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useAuthSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useAuthSocket deve ser usado dentro de SocketProvider");
  }
  return context;
}

export function useSocket() {
  const context = useAuthSocket();
  return context.socket;
}
