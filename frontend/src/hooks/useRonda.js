/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOOK: useRonda
 * Gerencia o estado da ronda de vigilante, incluindo GPS e checkpoints
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import rondaService from "../services/rondaService";

/**
 * Hook para gerenciar a ronda de vigilante
 *
 * @example
 * const {
 *   rondaAtual,
 *   posicaoAtual,
 *   carregando,
 *   erro,
 *   iniciarRonda,
 *   registrarCheckpoint,
 *   finalizarRonda,
 *   cancelarRonda,
 *   tempoDecorrido,
 * } = useRonda();
 */
export function useRonda() {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════════════════
  const [rondaAtual, setRondaAtual] = useState(null);
  const [posicaoAtual, setPosicaoAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [gpsAtivo, setGpsAtivo] = useState(false);
  const [erroGps, setErroGps] = useState(null);

  // Refs para controle de GPS e timers
  const watchIdRef = useRef(null);
  const intervaloTempoRef = useRef(null);
  const intervaloTrajetoRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE GPS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtém a posição atual do GPS (promise)
   */
  const obterPosicaoAtual = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada pelo navegador"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            precisao: position.coords.accuracy,
            altitude: position.coords.altitude,
            velocidade: position.coords.speed,
            timestamp: new Date().toISOString(),
          };
          setPosicaoAtual(pos);
          setErroGps(null);
          resolve(pos);
        },
        (error) => {
          let mensagem = "Erro ao obter localização";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              mensagem =
                "Permissão de localização negada. Habilite o GPS nas configurações.";
              break;
            case error.POSITION_UNAVAILABLE:
              mensagem =
                "Localização indisponível. Verifique se o GPS está ativo.";
              break;
            case error.TIMEOUT:
              mensagem =
                "Tempo esgotado ao obter localização. Tente novamente.";
              break;
            default:
              mensagem = "Erro desconhecido ao obter localização.";
          }
          setErroGps(mensagem);
          reject(new Error(mensagem));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  /**
   * Inicia o monitoramento contínuo do GPS
   */
  const iniciarMonitoramentoGps = useCallback(() => {
    if (!navigator.geolocation) {
      setErroGps("Geolocalização não suportada pelo navegador");
      return;
    }

    // Limpa monitoramento anterior se existir
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const pos = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          precisao: position.coords.accuracy,
          altitude: position.coords.altitude,
          velocidade: position.coords.speed,
          timestamp: new Date().toISOString(),
        };
        setPosicaoAtual(pos);
        setGpsAtivo(true);
        setErroGps(null);
      },
      (error) => {
        console.error("Erro no monitoramento GPS:", error);
        setGpsAtivo(false);
        let mensagem = "Erro no GPS";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            mensagem = "Permissão de GPS negada";
            break;
          case error.POSITION_UNAVAILABLE:
            mensagem = "GPS indisponível";
            break;
          case error.TIMEOUT:
            mensagem = "Timeout do GPS";
            break;
          default:
            break;
        }
        setErroGps(mensagem);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000,
      }
    );
  }, []);

  /**
   * Para o monitoramento do GPS
   */
  const pararMonitoramentoGps = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsAtivo(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DA RONDA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verifica se existe ronda em andamento ao carregar
   */
  const verificarRondaEmAndamento = useCallback(async () => {
    try {
      setCarregando(true);
      const { ronda } = await rondaService.buscarRondaEmAndamento();

      if (ronda) {
        setRondaAtual(ronda);
        // Se tem ronda em andamento, inicia monitoramento GPS
        iniciarMonitoramentoGps();
        // Inicia contador de tempo
        iniciarContadorTempo(new Date(ronda.data_inicio));
      }
    } catch (err) {
      console.error("Erro ao verificar ronda em andamento:", err);
      // Não define erro aqui pois pode não ter ronda (é esperado)
    } finally {
      setCarregando(false);
    }
  }, [iniciarMonitoramentoGps]);

  /**
   * Inicia o contador de tempo decorrido
   */
  const iniciarContadorTempo = useCallback((dataInicio) => {
    // Limpa intervalo anterior se existir
    if (intervaloTempoRef.current) {
      clearInterval(intervaloTempoRef.current);
    }

    const calcularTempo = () => {
      const agora = new Date();
      const inicio = new Date(dataInicio);
      const segundos = Math.floor((agora - inicio) / 1000);
      setTempoDecorrido(segundos);
    };

    // Calcula imediatamente
    calcularTempo();

    // Atualiza a cada segundo
    intervaloTempoRef.current = setInterval(calcularTempo, 1000);
  }, []);

  /**
   * Para o contador de tempo
   */
  const pararContadorTempo = useCallback(() => {
    if (intervaloTempoRef.current) {
      clearInterval(intervaloTempoRef.current);
      intervaloTempoRef.current = null;
    }
  }, []);

  /**
   * Inicia o envio periódico do trajeto
   */
  const iniciarEnvioTrajeto = useCallback(
    (rondaId) => {
      // Limpa intervalo anterior se existir
      if (intervaloTrajetoRef.current) {
        clearInterval(intervaloTrajetoRef.current);
      }

      // Envia posição a cada 30 segundos
      intervaloTrajetoRef.current = setInterval(async () => {
        if (posicaoAtual && rondaId) {
          try {
            await rondaService.registrarTrajeto(rondaId, {
              latitude: posicaoAtual.latitude,
              longitude: posicaoAtual.longitude,
              precisao: posicaoAtual.precisao,
              altitude: posicaoAtual.altitude,
              velocidade: posicaoAtual.velocidade,
            });
          } catch (err) {
            console.warn("Falha ao enviar ponto do trajeto:", err);
          }
        }
      }, 30000); // 30 segundos
    },
    [posicaoAtual]
  );

  /**
   * Para o envio do trajeto
   */
  const pararEnvioTrajeto = useCallback(() => {
    if (intervaloTrajetoRef.current) {
      clearInterval(intervaloTrajetoRef.current);
      intervaloTrajetoRef.current = null;
    }
  }, []);

  /**
   * Inicia uma nova ronda
   */
  const iniciarRonda = useCallback(
    async (observacoes = "") => {
      try {
        setCarregando(true);
        setErro(null);

        // Obtém posição atual antes de iniciar
        const posicao = await obterPosicaoAtual();

        const resultado = await rondaService.iniciarRonda({
          latitude: posicao.latitude,
          longitude: posicao.longitude,
          observacoes,
        });

        // Atualiza estado com a ronda criada
        const rondaCriada = {
          ...resultado.ronda,
          checkpoints: [],
        };
        setRondaAtual(rondaCriada);

        // Inicia monitoramento GPS e contador
        iniciarMonitoramentoGps();
        iniciarContadorTempo(new Date(resultado.ronda.data_inicio));
        iniciarEnvioTrajeto(resultado.ronda.id);

        return resultado;
      } catch (err) {
        console.error("Erro ao iniciar ronda:", err);
        const mensagem =
          err.response?.data?.error ||
          "Erro ao iniciar ronda. Tente novamente.";
        setErro(mensagem);
        throw err;
      } finally {
        setCarregando(false);
      }
    },
    [
      obterPosicaoAtual,
      iniciarMonitoramentoGps,
      iniciarContadorTempo,
      iniciarEnvioTrajeto,
    ]
  );

  /**
   * Registra um checkpoint na ronda atual
   */
  const registrarCheckpoint = useCallback(
    async (descricao = "", fotoUrl = null) => {
      if (!rondaAtual) {
        throw new Error("Nenhuma ronda em andamento");
      }

      try {
        setCarregando(true);
        setErro(null);

        // Obtém posição atual
        const posicao = await obterPosicaoAtual();

        const resultado = await rondaService.registrarCheckpoint(
          rondaAtual.id,
          {
            latitude: posicao.latitude,
            longitude: posicao.longitude,
            descricao,
            foto_url: fotoUrl,
          }
        );

        // Atualiza ronda com novo checkpoint
        setRondaAtual((prev) => ({
          ...prev,
          total_checkpoints: (prev.total_checkpoints || 0) + 1,
          checkpoints: [...(prev.checkpoints || []), resultado.checkpoint],
        }));

        return resultado;
      } catch (err) {
        console.error("Erro ao registrar checkpoint:", err);
        const mensagem =
          err.response?.data?.error ||
          "Erro ao registrar checkpoint. Tente novamente.";
        setErro(mensagem);
        throw err;
      } finally {
        setCarregando(false);
      }
    },
    [rondaAtual, obterPosicaoAtual]
  );

  /**
   * Finaliza a ronda atual
   */
  const finalizarRonda = useCallback(
    async (observacoes = "") => {
      if (!rondaAtual) {
        throw new Error("Nenhuma ronda em andamento");
      }

      try {
        setCarregando(true);
        setErro(null);

        // Obtém posição atual final
        let posicaoFinal = posicaoAtual;
        try {
          posicaoFinal = await obterPosicaoAtual();
        } catch (e) {
          console.warn(
            "Não foi possível obter posição final, usando última conhecida"
          );
        }

        const resultado = await rondaService.finalizarRonda(rondaAtual.id, {
          latitude: posicaoFinal?.latitude,
          longitude: posicaoFinal?.longitude,
          observacoes,
        });

        // Limpa estado
        setRondaAtual(null);
        setTempoDecorrido(0);

        // Para monitoramentos
        pararMonitoramentoGps();
        pararContadorTempo();
        pararEnvioTrajeto();

        return resultado;
      } catch (err) {
        console.error("Erro ao finalizar ronda:", err);
        const mensagem =
          err.response?.data?.error ||
          "Erro ao finalizar ronda. Tente novamente.";
        setErro(mensagem);
        throw err;
      } finally {
        setCarregando(false);
      }
    },
    [
      rondaAtual,
      posicaoAtual,
      obterPosicaoAtual,
      pararMonitoramentoGps,
      pararContadorTempo,
      pararEnvioTrajeto,
    ]
  );

  /**
   * Cancela a ronda atual
   */
  const cancelarRonda = useCallback(
    async (motivo = "") => {
      if (!rondaAtual) {
        throw new Error("Nenhuma ronda em andamento");
      }

      try {
        setCarregando(true);
        setErro(null);

        const resultado = await rondaService.cancelarRonda(rondaAtual.id, {
          motivo,
        });

        // Limpa estado
        setRondaAtual(null);
        setTempoDecorrido(0);

        // Para monitoramentos
        pararMonitoramentoGps();
        pararContadorTempo();
        pararEnvioTrajeto();

        return resultado;
      } catch (err) {
        console.error("Erro ao cancelar ronda:", err);
        const mensagem =
          err.response?.data?.error ||
          "Erro ao cancelar ronda. Tente novamente.";
        setErro(mensagem);
        throw err;
      } finally {
        setCarregando(false);
      }
    },
    [rondaAtual, pararMonitoramentoGps, pararContadorTempo, pararEnvioTrajeto]
  );

  /**
   * Limpa mensagens de erro
   */
  const limparErro = useCallback(() => {
    setErro(null);
    setErroGps(null);
  }, []);

  /**
   * Formata tempo em segundos para string legível
   */
  const formatarTempo = useCallback((segundos) => {
    if (!segundos || segundos < 0) return "0s";

    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = Math.floor(segundos % 60);

    let resultado = "";
    if (horas > 0) resultado += `${horas}h `;
    if (minutos > 0) resultado += `${minutos}min `;
    if (segs > 0 || resultado === "") resultado += `${segs}s`;

    return resultado.trim();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFEITOS
  // ═══════════════════════════════════════════════════════════════════════════

  // Verifica ronda em andamento ao montar
  useEffect(() => {
    verificarRondaEmAndamento();
  }, [verificarRondaEmAndamento]);

  // Limpa recursos ao desmontar
  useEffect(() => {
    return () => {
      pararMonitoramentoGps();
      pararContadorTempo();
      pararEnvioTrajeto();
    };
  }, [pararMonitoramentoGps, pararContadorTempo, pararEnvioTrajeto]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNO DO HOOK
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Estado da ronda
    rondaAtual,
    posicaoAtual,
    carregando,
    erro,
    tempoDecorrido,
    tempoDecorridoFormatado: formatarTempo(tempoDecorrido),

    // Estado do GPS
    gpsAtivo,
    erroGps,

    // Ações da ronda
    iniciarRonda,
    registrarCheckpoint,
    finalizarRonda,
    cancelarRonda,
    verificarRondaEmAndamento,

    // Ações do GPS
    obterPosicaoAtual,
    iniciarMonitoramentoGps,
    pararMonitoramentoGps,

    // Utilitários
    limparErro,
    formatarTempo,
  };
}

export default useRonda;
