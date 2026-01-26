/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Socket
 * Gerencia conexão WebSocket para comunicação em tempo real
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// URL do servidor
const API_URL =
  Constants.expoConfig?.extra?.API_URL || "http://192.168.137.1:3001";

let socket = null;
let conectando = false;

/**
 * Conecta ao servidor Socket.IO
 * @returns {Promise<Socket>} Instância do socket conectado
 */
export async function conectar() {
  // Se já está conectado, retorna o socket existente
  if (socket?.connected) {
    console.log("🔌 Socket já conectado");
    return socket;
  }

  // Se já está tentando conectar, aguarda
  if (conectando) {
    console.log("⏳ Conexão em andamento...");
    return new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        if (socket?.connected) {
          clearInterval(checkConnection);
          resolve(socket);
        }
      }, 100);
    });
  }

  conectando = true;

  try {
    // Obtém token de autenticação
    const token = await AsyncStorage.getItem("@Auth:token");

    if (!token) {
      console.log("❌ Socket: Sem token de autenticação");
      conectando = false;
      return null;
    }

    // Cria nova conexão
    socket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    // Eventos de conexão
    socket.on("connect", () => {
      console.log("✅ Socket conectado:", socket.id);
      conectando = false;
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket desconectado:", reason);
    });

    socket.on("connect_error", (error) => {
      console.log("❌ Erro de conexão Socket:", error.message);
      conectando = false;
    });

    // Aguarda conexão ou timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        conectando = false;
        reject(new Error("Timeout ao conectar socket"));
      }, 10000);

      socket.on("connect", () => {
        clearTimeout(timeout);
        resolve(socket);
      });

      socket.on("connect_error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  } catch (error) {
    console.error("❌ Erro ao conectar socket:", error);
    conectando = false;
    throw error;
  }
}

/**
 * Desconecta do servidor
 */
export function desconectar() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("🔌 Socket desconectado manualmente");
  }
}

/**
 * Retorna a instância do socket (pode ser null)
 */
export function getSocket() {
  return socket;
}

/**
 * Verifica se está conectado
 */
export function estaConectado() {
  return socket?.connected || false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTOS DE RONDA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Entra na sala da ronda para receber atualizações
 * @param {number} rondaId - ID da ronda
 */
export function entrarSalaRonda(rondaId) {
  if (socket?.connected) {
    socket.emit("ronda:entrar", rondaId);
    console.log(`📍 Entrou na sala da ronda ${rondaId}`);
  }
}

/**
 * Sai da sala da ronda
 * @param {number} rondaId - ID da ronda
 */
export function sairSalaRonda(rondaId) {
  if (socket?.connected) {
    socket.emit("ronda:sair", rondaId);
    console.log(`📍 Saiu da sala da ronda ${rondaId}`);
  }
}

/**
 * Emite atualização de posição GPS
 * @param {number} rondaId - ID da ronda
 * @param {object} posicao - Dados da posição {latitude, longitude, precisao, velocidade}
 */
export function emitirPosicaoRonda(rondaId, posicao) {
  if (socket?.connected) {
    socket.emit("ronda:posicao", {
      ronda_id: rondaId,
      ...posicao,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Emite evento de checkpoint registrado
 * @param {number} rondaId - ID da ronda
 * @param {object} checkpoint - Dados do checkpoint
 */
export function emitirCheckpoint(rondaId, checkpoint) {
  if (socket?.connected) {
    socket.emit("ronda:checkpoint", {
      ronda_id: rondaId,
      checkpoint,
    });
  }
}

/**
 * Emite evento de ronda iniciada
 * @param {object} ronda - Dados da ronda
 */
export function emitirRondaIniciada(ronda) {
  if (socket?.connected) {
    socket.emit("ronda:iniciada", ronda);
    console.log("📡 Evento ronda:iniciada emitido");
  }
}

/**
 * Emite evento de ronda finalizada
 * @param {object} ronda - Dados da ronda
 */
export function emitirRondaFinalizada(ronda) {
  if (socket?.connected) {
    socket.emit("ronda:finalizada", ronda);
    console.log("📡 Evento ronda:finalizada emitido");
  }
}

/**
 * Registra listener para eventos de ronda
 * @param {string} evento - Nome do evento
 * @param {function} callback - Função callback
 */
export function onRondaEvento(evento, callback) {
  if (socket) {
    socket.on(evento, callback);
  }
}

/**
 * Remove listener de evento de ronda
 * @param {string} evento - Nome do evento
 * @param {function} callback - Função callback (opcional)
 */
export function offRondaEvento(evento, callback) {
  if (socket) {
    if (callback) {
      socket.off(evento, callback);
    } else {
      socket.off(evento);
    }
  }
}

export default {
  conectar,
  desconectar,
  getSocket,
  estaConectado,
  entrarSalaRonda,
  sairSalaRonda,
  emitirPosicaoRonda,
  emitirCheckpoint,
  emitirRondaIniciada,
  emitirRondaFinalizada,
  onRondaEvento,
  offRondaEvento,
};
