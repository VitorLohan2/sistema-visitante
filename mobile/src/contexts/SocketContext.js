// src/contexts/SocketContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { io } from "socket.io-client";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  Constants.expoConfig?.extra?.API_URL || "http://192.168.10.90:3001";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);

  const isInitialized = useRef(false);
  const connectionAttemptRef = useRef(0);

  const setAuthStatus = useCallback((status) => {
    console.log("🔥 setAuthStatus:", status);

    if (!status) {
      if (socketRef.current) {
        console.log("🔴 Desconectando socket por logout");
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      isInitialized.current = false;
      connectionAttemptRef.current = 0;
    }

    setShouldConnect(status);
  }, []);

  const getSocket = useCallback(() => socketRef.current, []);

  useEffect(() => {
    console.log("🔄 useEffect socket | shouldConnect =", shouldConnect);

    if (!shouldConnect) {
      return;
    }

    // ✅ PREVINE RECRIAÇÃO
    if (isInitialized.current && socketRef.current?.connected) {
      console.log("✅ Socket já conectado:", socketRef.current.id);
      return;
    }

    if (
      isInitialized.current &&
      socketRef.current &&
      !socketRef.current.connected
    ) {
      console.log("🔄 Reconectando socket existente...");
      socketRef.current.connect();
      return;
    }

    if (connectionAttemptRef.current > 0) {
      console.log("⏳ Conexão já em andamento");
      return;
    }

    connectionAttemptRef.current++;

    const connectSocket = async () => {
      try {
        const ongId = await AsyncStorage.getItem("@Auth:ongId");
        const ongName = await AsyncStorage.getItem("@Auth:ongName");

        if (!ongId) {
          console.log("❌ Sem ongId");
          connectionAttemptRef.current = 0;
          return;
        }

        console.log("🔌 Criando socket...");

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
          connectionAttemptRef.current = 0;

          newSocket.emit("mobile_ready", { ongId, ongName, time: Date.now() });
        });

        newSocket.on("teste:conexao", (data) => {
          console.log("🎉 TESTE RECEBIDO:", data);
        });

        newSocket.on("connect_error", (err) => {
          console.log("❌ Erro de conexão:", err?.message);
          setIsConnected(false);
          connectionAttemptRef.current = 0;
        });

        newSocket.on("disconnect", (reason) => {
          console.log("🔴 Desconectado:", reason);
          setIsConnected(false);

          if (reason === "io server disconnect") {
            newSocket.connect();
          }
        });

        newSocket.on("reconnect", (attemptNumber) => {
          console.log("🔄 Reconectado após", attemptNumber, "tentativas");
          setIsConnected(true);
          connectionAttemptRef.current = 0;
        });
      } catch (error) {
        console.error("❌ Erro ao criar socket:", error);
        connectionAttemptRef.current = 0;
      }
    };

    connectSocket();

    return () => {
      if (!shouldConnect && socketRef.current) {
        console.log("🧹 Cleanup socket");
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        isInitialized.current = false;
        connectionAttemptRef.current = 0;
      }
    };
  }, [shouldConnect]);

  // ✅ MEMOIZA O CONTEXTO - NÃO RECRIA A CADA RENDER
  const contextValue = useMemo(
    () => ({
      socket: socketRef.current,
      isConnected,
      setAuthStatus,
      getSocket,
    }),
    [isConnected, setAuthStatus, getSocket]
  );

  return (
    <SocketContext.Provider value={contextValue}>
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
