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
  // Eventos de visita ativa (página Visitante) - emitidos por VisitanteController
  "visitor:create": [],
  "visitor:end": [],
  "visitor:delete": [],
  "visita:encerrada": [],
  // Eventos de histórico
  "historico:created": [],
  "historico:updated": [],
  "historico:deleted": [],
  "empresa:created": [],
  "empresa:updated": [],
  "empresa:deleted": [],
  "setor:created": [],
  "setor:updated": [],
  "setor:deleted": [],
  "ticket:create": [],
  "ticket:update": [],
  "ticket:viewed": [],
  "ticket:all_viewed": [],
  "agendamento:create": [],
  "agendamento:update": [],
  "agendamento:delete": [],
  "descarga:nova": [],
  "descarga:atualizada": [],
  // Chat de Suporte
  "chat-suporte:mensagem": [],
  "chat-suporte:digitando": [],
  "chat-suporte:parou-digitar": [],
  "chat-suporte:atendente-entrou": [],
  "chat-suporte:conversa-finalizada": [],
  "chat-suporte:fila-atualizada": [],
  "chat-suporte:nova-fila": [],
  // Ronda Vigilante (Tempo Real)
  "ronda:nova-iniciada": [],
  "ronda:posicao-atualizada": [],
  "ronda:checkpoint-registrado": [],
  "ronda:encerrada": [],
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
  // EVENTOS DE VISITA ENCERRADA (para páginas Visitante e Histórico)
  // ═══════════════════════════════════════════════════════════════

  // ✅ Nova visita registrada (visitor:create - emitido por VisitanteController)
  socket.on("visitor:create", (data) => {
    console.log("🟢 Nova visita registrada via Socket (visitor:create):", data);

    // Adiciona à lista de visitantes ativos
    const visitors = getCache("visitors") || [];
    if (!visitors.find((v) => v.id === data.id)) {
      const novosVisitors = [data, ...visitors];
      setCache("visitors", novosVisitors);
    }

    // Notifica callbacks
    eventCallbacks["visitor:create"].forEach((cb) => cb(data));
  });

  socket.on("visitor:end", (data) => {
    console.log(
      "🏁 Visita encerrada via Socket (visitor:end):",
      data.id,
      data.nome,
    );

    // Remove da lista de visitantes ativos (pode não ter o mesmo ID)
    const visitors = getCache("visitors") || [];
    // Tenta remover por CPF ou por algum identificador único
    const novosVisitors = visitors.filter((v) => {
      // Se tiver o ID antigo do visitante no evento, usa ele
      // Senão, tenta pelo CPF
      return v.cpf !== data.cpf;
    });
    setCache("visitors", novosVisitors);

    // Adiciona ao histórico com o novo ID do histórico
    const historico = getCache("historico") || [];
    if (!historico.find((h) => h.id === data.id)) {
      const novoHistorico = [data, ...historico].sort((a, b) => {
        const dateA = new Date(
          a.data_de_saida || a.data_de_entrada || a.criado_em,
        );
        const dateB = new Date(
          b.data_de_saida || b.data_de_entrada || b.criado_em,
        );
        return dateB - dateA;
      });
      setCache("historico", novoHistorico);
    }

    // Notifica callbacks
    eventCallbacks["visitor:end"].forEach((cb) => cb(data));
  });

  socket.on("visitor:delete", (data) => {
    console.log(
      "🗑️ Visitante removido da lista ativa via Socket (visitor:delete):",
      data,
    );

    // Remove da lista de visitantes ativos
    const visitors = getCache("visitors") || [];
    setCache(
      "visitors",
      visitors.filter((v) => v.id !== data.id),
    );

    // Notifica callbacks
    eventCallbacks["visitor:delete"].forEach((cb) => cb(data));
  });

  socket.on("visita:encerrada", (data) => {
    console.log("🏁 Visita encerrada via Socket (visita:encerrada):", data);
    eventCallbacks["visita:encerrada"].forEach((cb) => cb(data));
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE HISTÓRICO
  // ═══════════════════════════════════════════════════════════════
  socket.on("historico:created", (data) => {
    console.log("📜 Novo registro no histórico via Socket:", data);
    const historico = getCache("historico") || [];
    if (!historico.find((h) => h.id === data.id)) {
      const novoHistorico = [data, ...historico].sort((a, b) => {
        const dateA = new Date(a.data_de_entrada || a.criado_em);
        const dateB = new Date(b.data_de_entrada || b.criado_em);
        return dateB - dateA;
      });
      setCache("historico", novoHistorico);
    }
    eventCallbacks["historico:created"].forEach((cb) => cb(data));
  });

  socket.on("historico:updated", (data) => {
    console.log("📝 Histórico atualizado via Socket:", data);
    const historico = getCache("historico") || [];
    const novoHistorico = historico.map((h) =>
      h.id === data.id ? { ...h, ...data } : h,
    );
    setCache("historico", novoHistorico);
    eventCallbacks["historico:updated"].forEach((cb) => cb(data));
  });

  socket.on("historico:deleted", (data) => {
    console.log("🗑️ Histórico removido via Socket:", data);
    const historico = getCache("historico") || [];
    setCache(
      "historico",
      historico.filter((h) => h.id !== data.id),
    );
    eventCallbacks["historico:deleted"].forEach((cb) => cb(data));
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
        (a.nome || "").localeCompare(b.nome || "", "pt-BR"),
      ),
    );
    eventCallbacks["empresa:created"].forEach((cb) => cb(data));
  });

  socket.on("empresa:updated", (data) => {
    console.log("🏢 Empresa atualizada via Socket:", data);
    const empresas = getCache("empresas") || [];
    const novasEmpresas = empresas.map((e) =>
      e.id === data.id ? { ...e, ...data } : e,
    );
    setCache("empresas", novasEmpresas);
    eventCallbacks["empresa:updated"].forEach((cb) => cb(data));
  });

  socket.on("empresa:deleted", (data) => {
    console.log("🏢 Empresa deletada via Socket:", data);
    const empresas = getCache("empresas") || [];
    setCache(
      "empresas",
      empresas.filter((e) => e.id !== data.id),
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
        (a.nome || "").localeCompare(b.nome || "", "pt-BR"),
      ),
    );
    eventCallbacks["setor:created"].forEach((cb) => cb(data));
  });

  socket.on("setor:updated", (data) => {
    console.log("📁 Setor atualizado via Socket:", data);
    const setores = getCache("setores") || [];
    const novosSetores = setores.map((s) =>
      s.id === data.id ? { ...s, ...data } : s,
    );
    setCache("setores", novosSetores);
    eventCallbacks["setor:updated"].forEach((cb) => cb(data));
  });

  socket.on("setor:deleted", (data) => {
    console.log("📁 Setor deletado via Socket:", data);
    const setores = getCache("setores") || [];
    setCache(
      "setores",
      setores.filter((s) => s.id !== data.id),
    );
    eventCallbacks["setor:deleted"].forEach((cb) => cb(data));
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE TICKETS
  // ═══════════════════════════════════════════════════════════════
  socket.on("ticket:create", (data) => {
    console.log("🎫 Novo ticket recebido via Socket:", data);
    const tickets = getCache("tickets") || [];
    if (!tickets.find((t) => t.id === data.id)) {
      const novosTickets = [data, ...tickets].sort(
        (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao),
      );
      setCache("tickets", novosTickets);
    }
    eventCallbacks["ticket:create"].forEach((cb) => cb(data));
  });

  socket.on("ticket:update", (data) => {
    console.log("🎫 Ticket atualizado via Socket:", data);
    const tickets = getCache("tickets") || [];
    const novosTickets = tickets.map((t) =>
      t.id === data.id ? { ...t, ...data } : t,
    );
    setCache("tickets", novosTickets);
    eventCallbacks["ticket:update"].forEach((cb) => cb(data));
  });

  socket.on("ticket:viewed", (data) => {
    console.log("🎫 Ticket visualizado via Socket:", data);
    eventCallbacks["ticket:viewed"].forEach((cb) => cb(data));
  });

  socket.on("ticket:all_viewed", (data) => {
    console.log("🎫 Todos tickets visualizados via Socket");
    eventCallbacks["ticket:all_viewed"].forEach((cb) => cb(data));
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE AGENDAMENTOS
  // ═══════════════════════════════════════════════════════════════
  socket.on("agendamento:create", (data) => {
    console.log("📅 Novo agendamento recebido via Socket:", data);
    eventCallbacks["agendamento:create"].forEach((cb) => cb(data));
  });

  socket.on("agendamento:update", (data) => {
    console.log("📅 Agendamento atualizado via Socket:", data);
    eventCallbacks["agendamento:update"].forEach((cb) => cb(data));
  });

  socket.on("agendamento:delete", (data) => {
    console.log("📅 Agendamento removido via Socket:", data);
    eventCallbacks["agendamento:delete"].forEach((cb) => cb(data));
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE SOLICITAÇÕES DE DESCARGA
  // ═══════════════════════════════════════════════════════════════
  socket.on("descarga:nova", (data) => {
    console.log("📦 Nova solicitação de descarga via Socket:", data);
    eventCallbacks["descarga:nova"].forEach((cb) => cb(data));
  });

  socket.on("descarga:atualizada", (data) => {
    console.log("📦 Solicitação de descarga atualizada via Socket:", data);
    eventCallbacks["descarga:atualizada"].forEach((cb) => cb(data));
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE CHAT DE SUPORTE
  // ═══════════════════════════════════════════════════════════════
  socket.on("chat-suporte:mensagem", (data) => {
    console.log("💬 Mensagem de chat recebida via Socket:", data);
    eventCallbacks["chat-suporte:mensagem"].forEach((cb) => cb(data));
  });

  socket.on("chat-suporte:digitando", (data) => {
    eventCallbacks["chat-suporte:digitando"].forEach((cb) => cb(data));
  });

  socket.on("chat-suporte:parou-digitar", (data) => {
    eventCallbacks["chat-suporte:parou-digitar"].forEach((cb) => cb(data));
  });

  socket.on("chat-suporte:atendente-entrou", (data) => {
    console.log("👨‍💼 Atendente entrou via Socket:", data);
    eventCallbacks["chat-suporte:atendente-entrou"].forEach((cb) => cb(data));
  });

  socket.on("chat-suporte:conversa-finalizada", (data) => {
    console.log("🔚 Conversa finalizada via Socket:", data);
    eventCallbacks["chat-suporte:conversa-finalizada"].forEach((cb) =>
      cb(data),
    );
  });

  socket.on("chat-suporte:fila-atualizada", (data) => {
    console.log("📋 Fila atualizada via Socket:", data);
    eventCallbacks["chat-suporte:fila-atualizada"].forEach((cb) => cb(data));
  });

  socket.on("chat-suporte:nova-fila", (data) => {
    console.log("📢 Nova conversa na fila via Socket:", data);
    eventCallbacks["chat-suporte:nova-fila"].forEach((cb) => cb(data));
  });

  // ═══════════════════════════════════════════════════════════════
  // EVENTOS DE RONDA VIGILANTE (TEMPO REAL)
  // ═══════════════════════════════════════════════════════════════
  socket.on("ronda:nova-iniciada", (data) => {
    console.log("🚶 Nova ronda iniciada via Socket:", data);
    eventCallbacks["ronda:nova-iniciada"].forEach((cb) => cb(data));
  });

  socket.on("ronda:posicao-atualizada", (data) => {
    // Posição GPS em tempo real - não loga para evitar spam
    eventCallbacks["ronda:posicao-atualizada"].forEach((cb) => cb(data));
  });

  socket.on("ronda:checkpoint-registrado", (data) => {
    console.log("📍 Checkpoint registrado via Socket:", data);
    eventCallbacks["ronda:checkpoint-registrado"].forEach((cb) => cb(data));
  });

  socket.on("ronda:encerrada", (data) => {
    console.log("🔴 Ronda encerrada via Socket:", data);
    eventCallbacks["ronda:encerrada"].forEach((cb) => cb(data));
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
      (cb) => cb !== callback,
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
