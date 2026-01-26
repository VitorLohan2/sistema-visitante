/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOOK: useRondaSocket
 * Gerenciamento de Socket.IO para envio de localização ao backend
 *
 * CARACTERÍSTICAS:
 * - Socket NÃO controla UI (apenas envia dados)
 * - Envio de coordenadas a cada 3-5 segundos
 * - UI funciona offline
 * - Backend nunca dirige renderização do mapa
 * - Reconexão automática
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import socketService from "../services/socketService";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const SOCKET_CONFIG = {
  INTERVALO_ENVIO: 3000, // Envia posição a cada 3 segundos
  MAX_TENTATIVAS_CONEXAO: 5,
  TIMEOUT_CONEXAO: 10000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function useRondaSocket(options = {}) {
  const {
    rondaId = null,
    intervaloEnvio = SOCKET_CONFIG.INTERVALO_ENVIO,
    onConectado = null,
    onDesconectado = null,
    onErro = null,
  } = options;

  // ─────────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ─────────────────────────────────────────────────────────────────────────────

  const [conectado, setConectado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [ultimoEnvio, setUltimoEnvio] = useState(null);
  const [totalEnviado, setTotalEnviado] = useState(0);

  // ─────────────────────────────────────────────────────────────────────────────
  // REFS
  // ─────────────────────────────────────────────────────────────────────────────

  const intervaloRef = useRef(null);
  const posicaoAtualRef = useRef(null);
  const rondaIdRef = useRef(rondaId);
  const conectandoRef = useRef(false);

  // Atualiza ref quando rondaId muda
  useEffect(() => {
    rondaIdRef.current = rondaId;
  }, [rondaId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CONECTAR AO SOCKET
  // ─────────────────────────────────────────────────────────────────────────────

  const conectar = useCallback(async () => {
    if (conectandoRef.current) {
      return false;
    }

    try {
      conectandoRef.current = true;
      setErro(null);

      console.log("🔌 Conectando ao Socket.IO...");
      await socketService.conectar();

      setConectado(true);
      onConectado?.();
      console.log("✅ Socket conectado");

      return true;
    } catch (error) {
      console.warn("⚠️ Falha ao conectar Socket:", error.message);
      setErro(error.message);
      setConectado(false);
      onErro?.(error.message);
      return false;
    } finally {
      conectandoRef.current = false;
    }
  }, [onConectado, onErro]);

  // ─────────────────────────────────────────────────────────────────────────────
  // DESCONECTAR
  // ─────────────────────────────────────────────────────────────────────────────

  const desconectar = useCallback(() => {
    socketService.desconectar();
    setConectado(false);
    onDesconectado?.();
    console.log("🔌 Socket desconectado");
  }, [onDesconectado]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ENTRAR NA SALA DA RONDA
  // ─────────────────────────────────────────────────────────────────────────────

  const entrarSalaRonda = useCallback((id) => {
    const rondaIdAtual = id || rondaIdRef.current;
    if (!rondaIdAtual) {
      console.warn("⚠️ Socket: rondaId não definido");
      return false;
    }

    if (!socketService.estaConectado()) {
      console.warn("⚠️ Socket: não conectado");
      return false;
    }

    socketService.entrarSalaRonda(rondaIdAtual);
    console.log(`📍 Entrou na sala da ronda ${rondaIdAtual}`);
    return true;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // SAIR DA SALA DA RONDA
  // ─────────────────────────────────────────────────────────────────────────────

  const sairSalaRonda = useCallback((id) => {
    const rondaIdAtual = id || rondaIdRef.current;
    if (!rondaIdAtual) return;

    socketService.sairSalaRonda(rondaIdAtual);
    console.log(`📍 Saiu da sala da ronda ${rondaIdAtual}`);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // ENVIAR POSIÇÃO (única vez)
  // ─────────────────────────────────────────────────────────────────────────────

  const enviarPosicao = useCallback((posicao, rondaIdOverride) => {
    const rondaIdAtual = rondaIdOverride || rondaIdRef.current;

    if (!rondaIdAtual) {
      return false;
    }

    if (!socketService.estaConectado()) {
      return false;
    }

    if (!posicao || !posicao.latitude || !posicao.longitude) {
      return false;
    }

    try {
      setEnviando(true);

      socketService.emitirPosicaoRonda(rondaIdAtual, {
        latitude: posicao.latitude,
        longitude: posicao.longitude,
        precisao: posicao.precisao || posicao.accuracy,
        velocidade: posicao.velocidade || posicao.speed,
        altitude: posicao.altitude,
      });

      setUltimoEnvio(new Date());
      setTotalEnviado((prev) => prev + 1);
      setEnviando(false);

      return true;
    } catch (error) {
      console.warn("⚠️ Erro ao enviar posição:", error.message);
      setEnviando(false);
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // ATUALIZAR POSIÇÃO (armazena para envio periódico)
  // ─────────────────────────────────────────────────────────────────────────────

  const atualizarPosicao = useCallback((posicao) => {
    if (posicao && posicao.latitude && posicao.longitude) {
      posicaoAtualRef.current = { ...posicao };
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // INICIAR ENVIO PERIÓDICO
  // ─────────────────────────────────────────────────────────────────────────────

  const iniciarEnvioPeriodico = useCallback(
    (rondaIdOverride) => {
      // Para intervalo anterior se existir
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }

      const rondaIdAtual = rondaIdOverride || rondaIdRef.current;
      if (!rondaIdAtual) {
        console.warn("⚠️ Socket: rondaId necessário para envio periódico");
        return false;
      }

      console.log(
        `📡 Iniciando envio periódico (intervalo: ${intervaloEnvio}ms)`,
      );

      intervaloRef.current = setInterval(() => {
        if (posicaoAtualRef.current && socketService.estaConectado()) {
          enviarPosicao(posicaoAtualRef.current, rondaIdAtual);
        }
      }, intervaloEnvio);

      return true;
    },
    [intervaloEnvio, enviarPosicao],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PARAR ENVIO PERIÓDICO
  // ─────────────────────────────────────────────────────────────────────────────

  const pararEnvioPeriodico = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
      console.log("📡 Envio periódico parado");
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // EMITIR CHECKPOINT
  // ─────────────────────────────────────────────────────────────────────────────

  const emitirCheckpoint = useCallback((checkpoint, rondaIdOverride) => {
    const rondaIdAtual = rondaIdOverride || rondaIdRef.current;

    if (!rondaIdAtual || !socketService.estaConectado()) {
      return false;
    }

    socketService.emitirCheckpoint(rondaIdAtual, checkpoint);
    console.log("📍 Checkpoint emitido via Socket");
    return true;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // EMITIR RONDA INICIADA
  // ─────────────────────────────────────────────────────────────────────────────

  const emitirRondaIniciada = useCallback((ronda) => {
    if (!socketService.estaConectado()) {
      return false;
    }

    socketService.emitirRondaIniciada(ronda);
    console.log("📡 Ronda iniciada emitida via Socket");
    return true;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // EMITIR RONDA FINALIZADA
  // ─────────────────────────────────────────────────────────────────────────────

  const emitirRondaFinalizada = useCallback((ronda) => {
    if (!socketService.estaConectado()) {
      return false;
    }

    socketService.emitirRondaFinalizada(ronda);
    console.log("📡 Ronda finalizada emitida via Socket");
    return true;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // INICIALIZAR (conecta e entra na sala)
  // ─────────────────────────────────────────────────────────────────────────────

  const inicializar = useCallback(
    async (rondaIdOverride) => {
      const rondaIdAtual = rondaIdOverride || rondaIdRef.current;

      try {
        // Tenta conectar
        const conectou = await conectar();

        if (conectou && rondaIdAtual) {
          // Entra na sala
          entrarSalaRonda(rondaIdAtual);

          // Inicia envio periódico
          iniciarEnvioPeriodico(rondaIdAtual);
        }

        return conectou;
      } catch (error) {
        console.warn("⚠️ Erro ao inicializar socket:", error.message);
        return false;
      }
    },
    [conectar, entrarSalaRonda, iniciarEnvioPeriodico],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // FINALIZAR (para envio e sai da sala)
  // ─────────────────────────────────────────────────────────────────────────────

  const finalizar = useCallback(
    (rondaIdOverride) => {
      const rondaIdAtual = rondaIdOverride || rondaIdRef.current;

      pararEnvioPeriodico();

      if (rondaIdAtual) {
        sairSalaRonda(rondaIdAtual);
      }

      posicaoAtualRef.current = null;
      setTotalEnviado(0);
      setUltimoEnvio(null);
    },
    [pararEnvioPeriodico, sairSalaRonda],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP NO UNMOUNT
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RETORNO
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Status
    conectado,
    enviando,
    erro,
    ultimoEnvio,
    totalEnviado,

    // Conexão
    conectar,
    desconectar,

    // Sala da ronda
    entrarSalaRonda,
    sairSalaRonda,

    // Envio de posição
    enviarPosicao,
    atualizarPosicao,
    iniciarEnvioPeriodico,
    pararEnvioPeriodico,

    // Eventos
    emitirCheckpoint,
    emitirRondaIniciada,
    emitirRondaFinalizada,

    // Helpers
    inicializar,
    finalizar,

    // Verifica conexão
    estaConectado: () => socketService.estaConectado(),
  };
}

export default useRondaSocket;
