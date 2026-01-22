/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOOK: useRonda
 * Gerencia estado da ronda de vigilante com GPS em tempo real
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import rondaService from "../services/rondaService";

/**
 * Hook para gerenciar a ronda de vigilante
 *
 * @example
 * const {
 *   rondaAtual,
 *   posicaoAtual,
 *   iniciarRonda,
 *   registrarCheckpoint,
 *   finalizarRonda,
 * } = useRonda();
 */
export function useRonda() {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════════════════

  const [rondaAtual, setRondaAtual] = useState(null);
  const [posicaoAtual, setPosicaoAtual] = useState(null);
  const [trajeto, setTrajeto] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [distanciaTotal, setDistanciaTotal] = useState(0);
  const [gpsAtivo, setGpsAtivo] = useState(false);
  const [erroGps, setErroGps] = useState(null);

  // Refs para controle
  const watchSubscriptionRef = useRef(null);
  const intervaloTempoRef = useRef(null);
  const intervaloTrajetoRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE GPS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Solicita permissão de localização
   */
  const solicitarPermissaoGps = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setErroGps(
          "Permissão de localização negada. Habilite nas configurações.",
        );
        return false;
      }

      return true;
    } catch (error) {
      setErroGps("Erro ao solicitar permissão de localização");
      return false;
    }
  }, []);

  /**
   * Obtém posição atual
   */
  const obterPosicaoAtual = useCallback(async () => {
    try {
      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const pos = {
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
        precisao: posicao.coords.accuracy,
        altitude: posicao.coords.altitude,
        velocidade: posicao.coords.speed,
        timestamp: new Date().toISOString(),
      };

      setPosicaoAtual(pos);
      setErroGps(null);
      return pos;
    } catch (error) {
      const mensagem =
        "Erro ao obter localização. Verifique se o GPS está ativo.";
      setErroGps(mensagem);
      throw new Error(mensagem);
    }
  }, []);

  /**
   * Inicia monitoramento contínuo do GPS
   */
  const iniciarMonitoramentoGps = useCallback(async () => {
    // Para monitoramento anterior se existir
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // 5 segundos
        distanceInterval: 5, // 5 metros
      },
      (posicao) => {
        const pos = {
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          precisao: posicao.coords.accuracy,
          altitude: posicao.coords.altitude,
          velocidade: posicao.coords.speed,
          timestamp: new Date().toISOString(),
        };

        setPosicaoAtual(pos);
        setGpsAtivo(true);
        setErroGps(null);

        // Adiciona ao trajeto local
        setTrajeto((prev) => [...prev, pos]);
      },
    );

    watchSubscriptionRef.current = subscription;
  }, []);

  /**
   * Para monitoramento do GPS
   */
  const pararMonitoramentoGps = useCallback(() => {
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
    }
    setGpsAtivo(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DA RONDA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verifica ronda em andamento ao carregar
   */
  const verificarRondaEmAndamento = useCallback(async () => {
    try {
      setCarregando(true);
      const resposta = await rondaService.buscarRondaEmAndamento();
      const ronda = resposta?.ronda || resposta;

      if (ronda && ronda.id) {
        setRondaAtual(ronda);
        // Inicializa checkpoints da ronda se existirem
        setCheckpoints(
          Array.isArray(ronda.checkpoints) ? ronda.checkpoints : [],
        );
        // Inicializa trajeto se existir
        setTrajeto(Array.isArray(ronda.trajeto) ? ronda.trajeto : []);

        // Solicita permissão e inicia GPS
        const temPermissao = await solicitarPermissaoGps();
        if (temPermissao) {
          await iniciarMonitoramentoGps();
          iniciarContadorTempo(new Date(ronda.data_inicio));
        }
      }
    } catch (error) {
      // Não define erro - pode não ter ronda (esperado)
      console.log("Nenhuma ronda em andamento");
    } finally {
      setCarregando(false);
    }
  }, [solicitarPermissaoGps, iniciarMonitoramentoGps]);

  /**
   * Inicia contador de tempo
   */
  const iniciarContadorTempo = useCallback((dataInicio) => {
    if (intervaloTempoRef.current) {
      clearInterval(intervaloTempoRef.current);
    }

    const calcularTempo = () => {
      const agora = new Date();
      const inicio = new Date(dataInicio);
      const diffMs = agora - inicio;
      setTempoDecorrido(Math.floor(diffMs / 1000));
    };

    calcularTempo();
    intervaloTempoRef.current = setInterval(calcularTempo, 1000);
  }, []);

  /**
   * Inicia nova ronda
   */
  const iniciarRonda = useCallback(async () => {
    try {
      setErro(null);

      // Solicita permissão de GPS
      const temPermissao = await solicitarPermissaoGps();
      if (!temPermissao) {
        throw new Error("Permissão de GPS necessária para iniciar ronda");
      }

      // Obtém posição inicial
      const posicao = await obterPosicaoAtual();

      // Inicia ronda na API
      const { ronda } = await rondaService.iniciarRonda(posicao);

      setRondaAtual(ronda);
      setTrajeto([posicao]);

      // Inicia monitoramento contínuo
      await iniciarMonitoramentoGps();
      iniciarContadorTempo(new Date(ronda.data_inicio));

      // Inicia envio periódico do trajeto
      iniciarEnvioTrajeto(ronda.id);

      return ronda;
    } catch (error) {
      const mensagem = error.response?.data?.error || error.message;
      setErro(mensagem);
      throw error;
    }
  }, [
    solicitarPermissaoGps,
    obterPosicaoAtual,
    iniciarMonitoramentoGps,
    iniciarContadorTempo,
  ]);

  /**
   * Inicia envio periódico do trajeto para a API
   */
  const iniciarEnvioTrajeto = useCallback(
    (rondaId) => {
      if (intervaloTrajetoRef.current) {
        clearInterval(intervaloTrajetoRef.current);
      }

      intervaloTrajetoRef.current = setInterval(async () => {
        const posicao = await obterPosicaoAtual().catch(() => null);

        if (posicao && rondaId) {
          try {
            await rondaService.registrarTrajeto(rondaId, posicao);
          } catch (error) {
            console.error("Erro ao enviar trajeto:", error);
          }
        }
      }, 30000); // Envia a cada 30 segundos
    },
    [obterPosicaoAtual],
  );

  /**
   * Registra checkpoint
   */
  const registrarCheckpoint = useCallback(
    async (descricao = "") => {
      if (!rondaAtual) {
        throw new Error("Nenhuma ronda em andamento");
      }

      try {
        setErro(null);
        const posicao = await obterPosicaoAtual();

        const resposta = await rondaService.registrarCheckpoint(rondaAtual.id, {
          ...posicao,
          descricao,
        });

        const checkpoint = resposta?.checkpoint || resposta;

        // Atualiza lista de checkpoints
        setCheckpoints((prev) => [...prev, checkpoint]);

        // Atualiza ronda com novo checkpoint
        setRondaAtual((prev) => ({
          ...prev,
          checkpoints: [...(prev?.checkpoints || []), checkpoint],
        }));

        return checkpoint;
      } catch (error) {
        const mensagem = error.response?.data?.error || error.message;
        setErro(mensagem);
        throw error;
      }
    },
    [rondaAtual, obterPosicaoAtual],
  );

  /**
   * Finaliza ronda
   */
  const finalizarRonda = useCallback(
    async (observacao = "") => {
      if (!rondaAtual) {
        throw new Error("Nenhuma ronda em andamento");
      }

      try {
        setErro(null);
        const posicao = await obterPosicaoAtual();

        const resultado = await rondaService.finalizarRonda(rondaAtual.id, {
          ...posicao,
          observacao,
        });

        // Limpa estados
        limparEstados();

        return resultado;
      } catch (error) {
        const mensagem = error.response?.data?.error || error.message;
        setErro(mensagem);
        throw error;
      }
    },
    [rondaAtual, obterPosicaoAtual],
  );

  /**
   * Cancela ronda
   */
  const cancelarRonda = useCallback(
    async (motivo = "") => {
      if (!rondaAtual) {
        throw new Error("Nenhuma ronda em andamento");
      }

      try {
        setErro(null);
        await rondaService.cancelarRonda(rondaAtual.id, motivo);
        limparEstados();
      } catch (error) {
        const mensagem = error.response?.data?.error || error.message;
        setErro(mensagem);
        throw error;
      }
    },
    [rondaAtual],
  );

  /**
   * Limpa todos os estados e para monitoramentos
   */
  const limparEstados = useCallback(() => {
    pararMonitoramentoGps();

    if (intervaloTempoRef.current) {
      clearInterval(intervaloTempoRef.current);
      intervaloTempoRef.current = null;
    }

    if (intervaloTrajetoRef.current) {
      clearInterval(intervaloTrajetoRef.current);
      intervaloTrajetoRef.current = null;
    }

    setRondaAtual(null);
    setTrajeto([]);
    setCheckpoints([]);
    setTempoDecorrido(0);
    setDistanciaTotal(0);
  }, [pararMonitoramentoGps]);

  /**
   * Limpa erro
   */
  const limparErro = useCallback(() => {
    setErro(null);
    setErroGps(null);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFEITOS
  // ═══════════════════════════════════════════════════════════════════════════

  // Verifica ronda em andamento ao montar
  useEffect(() => {
    verificarRondaEmAndamento();

    return () => {
      limparEstados();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Formata tempo em HH:MM:SS
   */
  const formatarTempo = useCallback((segundos) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;

    return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
  }, []);

  const tempoDecorridoFormatado = formatarTempo(tempoDecorrido);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Estados
    rondaAtual,
    rondaAtiva: rondaAtual, // Alias para compatibilidade
    posicaoAtual,
    trajeto,
    checkpoints,
    carregando,
    erro,
    erroGps,
    tempoDecorrido,
    tempoDecorridoFormatado,
    distanciaTotal,
    gpsAtivo,

    // Funções
    iniciarRonda,
    registrarCheckpoint,
    finalizarRonda,
    cancelarRonda,
    limparErro,
    formatarTempo,
  };
}

export default useRonda;
