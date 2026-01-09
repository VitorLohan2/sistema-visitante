/**
 * SocketService - Serviço de conexão WebSocket com Socket.IO
 *
 * Sincroniza dados em tempo real entre múltiplos usuários
 * Atualiza o cache automaticamente quando há mudanças
 */

import { io } from "socket.io-client";
import {
  addVisitanteToCache,
  updateVisitanteInCache,
  removeVisitanteFromCache,
  getCache,
  setCache,
} from "./cacheService";

// Instância única do socket
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Callbacks registrados para eventos
const eventCallbacks = {
  "visitante:created": [],
  "visitante:updated": [],
  "visitante:deleted": [],
  "empresa:created": [],
  "empresa:updated": [],
  "empresa:deleted": [],
  "setor:created": [],
  "setor:updated": [],
  "setor:deleted": [],
  connected: [],
  disconnected: [],
  error: [],
};

/**
 * Obtém a URL do servidor Socket.IO
 */
function getSocketUrl() {
  return (
    process.env.REACT_APP_SOCKET_URL ||
    process.env.REACT_APP_API_URL ||
    "http://localhost:3001"
  );
}

/**
 * Conecta ao servidor Socket.IO
 */
export function connect(token) {
  if (socket?.connected) {
    console.log("🔌 Socket já conectado");
    return socket;
  }

  const socketUrl = getSocketUrl();
  console.log("🔌 Conectando ao Socket.IO:", socketUrl);

  socket = io(socketUrl, {
    auth: { token },
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE CONEXÃO
  // ═══════════════════════════════════════════════════════════════
  socket.on("connect", () => {
    console.log("✅ Socket conectado:", socket.id);
    reconnectAttempts = 0;

    // Entra na sala global
    socket.emit("join", "global");

    // Notifica callbacks
    eventCallbacks.connected.forEach((cb) => cb(socket.id));
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket desconectado:", reason);
    eventCallbacks.disconnected.forEach((cb) => cb(reason));
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Erro de conexão Socket:", error.message);
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log("⚠️ Máximo de tentativas de reconexão atingido");
    }

    eventCallbacks.error.forEach((cb) => cb(error));
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE VISITANTES
  // ═══════════════════════════════════════════════════════════════
  socket.on("visitante:created", (data) => {
    console.log("📥 Novo visitante recebido via Socket:", data);

    // Busca empresas e setores do cache para mapear nomes
    const empresas = getCache("empresas") || [];
    const setores = getCache("setores") || [];

    const visitanteCompleto = {
      ...data,
      empresa:
        empresas.find((e) => e.id === data.empresa_id)?.nome || "Não informado",
      setor:
        setores.find((s) => s.id === data.setor_id)?.nome || "Não informado",
    };

    // Atualiza o cache
    addVisitanteToCache(visitanteCompleto);

    // Notifica callbacks registrados
    eventCallbacks["visitante:created"].forEach((cb) => cb(visitanteCompleto));
  });

  socket.on("visitante:updated", (data) => {
    console.log("📝 Visitante atualizado via Socket:", data);

    const empresas = getCache("empresas") || [];
    const setores = getCache("setores") || [];

    const dadosAtualizados = {
      ...data,
      empresa:
        empresas.find((e) => e.id === data.empresa_id)?.nome ||
        data.empresa ||
        "Não informado",
      setor:
        setores.find((s) => s.id === data.setor_id)?.nome ||
        data.setor ||
        "Não informado",
    };

    // Atualiza o cache
    updateVisitanteInCache(data.id, dadosAtualizados);

    // Notifica callbacks
    eventCallbacks["visitante:updated"].forEach((cb) => cb(dadosAtualizados));
  });

  socket.on("visitante:deleted", (data) => {
    console.log("🗑️ Visitante deletado via Socket:", data);

    // Remove do cache
    removeVisitanteFromCache(data.id);

    // Notifica callbacks
    eventCallbacks["visitante:deleted"].forEach((cb) => cb(data));
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE EMPRESAS
  // ═══════════════════════════════════════════════════════════════
  socket.on("empresa:created", (data) => {
    console.log("🏢 Nova empresa recebida via Socket:", data);
    const empresas = getCache("empresas") || [];
    setCache(
      "empresas",
      [...empresas, data].sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR")
      )
    );
    eventCallbacks["empresa:created"].forEach((cb) => cb(data));
  });

  socket.on("empresa:updated", (data) => {
    console.log("🏢 Empresa atualizada via Socket:", data);
    const empresas = getCache("empresas") || [];
    const novasEmpresas = empresas.map((e) =>
      e.id === data.id ? { ...e, ...data } : e
    );
    setCache("empresas", novasEmpresas);
    eventCallbacks["empresa:updated"].forEach((cb) => cb(data));
  });

  socket.on("empresa:deleted", (data) => {
    console.log("🏢 Empresa deletada via Socket:", data);
    const empresas = getCache("empresas") || [];
    setCache(
      "empresas",
      empresas.filter((e) => e.id !== data.id)
    );
    eventCallbacks["empresa:deleted"].forEach((cb) => cb(data));
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE SETORES
  // ═══════════════════════════════════════════════════════════════
  socket.on("setor:created", (data) => {
    console.log("📁 Novo setor recebido via Socket:", data);
    const setores = getCache("setores") || [];
    setCache(
      "setores",
      [...setores, data].sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR")
      )
    );
    eventCallbacks["setor:created"].forEach((cb) => cb(data));
  });

  socket.on("setor:updated", (data) => {
    console.log("📁 Setor atualizado via Socket:", data);
    const setores = getCache("setores") || [];
    const novosSetores = setores.map((s) =>
      s.id === data.id ? { ...s, ...data } : s
    );
    setCache("setores", novosSetores);
    eventCallbacks["setor:updated"].forEach((cb) => cb(data));
  });

  socket.on("setor:deleted", (data) => {
    console.log("📁 Setor deletado via Socket:", data);
    const setores = getCache("setores") || [];
    setCache(
      "setores",
      setores.filter((s) => s.id !== data.id)
    );
    eventCallbacks["setor:deleted"].forEach((cb) => cb(data));
  });

  return socket;
}

/**
 * Desconecta do servidor Socket.IO
 */
export function disconnect() {
  if (socket) {
    console.log("🔌 Desconectando Socket.IO...");
    socket.disconnect();
    socket = null;
  }
}

/**
 * Verifica se está conectado
 */
export function isConnected() {
  return socket?.connected || false;
}

/**
 * Obtém o ID do socket atual
 */
export function getSocketId() {
  return socket?.id || null;
}

/**
 * Registra um callback para um evento específico
 */
export function on(event, callback) {
  if (eventCallbacks[event]) {
    eventCallbacks[event].push(callback);
  }

  // Retorna função para remover o listener
  return () => off(event, callback);
}

/**
 * Remove um callback de um evento
 */
export function off(event, callback) {
  if (eventCallbacks[event]) {
    eventCallbacks[event] = eventCallbacks[event].filter(
      (cb) => cb !== callback
    );
  }
}

/**
 * Emite um evento para o servidor
 */
export function emit(event, data) {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    console.warn("⚠️ Socket não conectado. Evento não enviado:", event);
  }
}

/**
 * Entra em uma sala específica
 */
export function joinRoom(room) {
  if (socket?.connected) {
    socket.emit("join", room);
    console.log(`🚪 Entrou na sala: ${room}`);
  }
}

/**
 * Sai de uma sala específica
 */
export function leaveRoom(room) {
  if (socket?.connected) {
    socket.emit("leave", room);
    console.log(`🚪 Saiu da sala: ${room}`);
  }
}

/**
 * Obtém a instância do socket (uso avançado)
 */
export function getSocket() {
  return socket;
}

export default {
  connect,
  disconnect,
  isConnected,
  getSocketId,
  on,
  off,
  emit,
  joinRoom,
  leaveRoom,
  getSocket,
};
