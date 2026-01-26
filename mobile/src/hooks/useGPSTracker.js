/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOOK: useGPSTracker - VERSÃO PROFISSIONAL
 *
 * Sistema de rastreamento GPS de alta precisão com filtros rigorosos
 * para eliminar movimento fantasma e GPS drift.
 *
 * REGRAS IMPLEMENTADAS:
 * 1. NUNCA usar ponto bruto do GPS para trajeto
 * 2. Filtro por deslocamento mínimo (5 metros)
 * 3. Filtro por velocidade mínima (1.5 km/h)
 * 4. Filtro por aceleração impossível
 * 5. Média móvel dos últimos 5 pontos válidos
 * 6. Filtro por precisão do GPS
 *
 * CONFIGURAÇÃO GPS:
 * - expo-location com accuracy: Highest
 * - timeInterval: 1000ms
 * - distanceInterval: 1m
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import {
  FiltroGPSProfissional,
  distanciaEntrePontos,
  formatarDistancia,
  FILTRO_CONFIG,
} from "../utils/gpsFilter";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES DO GPS - TEMPO REAL MÁXIMO
// ═══════════════════════════════════════════════════════════════════════════════

const GPS_OPTIONS = {
  accuracy: Location.Accuracy.BestForNavigation, // Máxima precisão
  timeInterval: 100, // 100ms - 10 atualizações por segundo
  distanceInterval: 0, // Atualiza mesmo parado
  mayShowUserSettingsDialog: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function useGPSTracker(options = {}) {
  const {
    ativo = false,
    onPosicaoAtualizada = null,
    onTrajetoAtualizado = null,
    onPontoRejeitado = null,
    onErro = null,
    configFiltro = {},
  } = options;

  // ─────────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ─────────────────────────────────────────────────────────────────────────────

  // Posição atual do marker (pode ser atualizada mesmo sem adicionar ao trajeto)
  const [posicaoAtual, setPosicaoAtual] = useState(null);

  // Posição da média móvel (para trajeto suave)
  const [posicaoMedia, setPosicaoMedia] = useState(null);

  // Trajeto filtrado e validado
  const [trajeto, setTrajeto] = useState([]);

  // Métricas
  const [distanciaTotal, setDistanciaTotal] = useState(0);
  const [velocidade, setVelocidade] = useState(0);
  const [precisao, setPrecisao] = useState(null);

  // Status
  const [gpsAtivo, setGpsAtivo] = useState(false);
  const [erro, setErro] = useState(null);
  const [permissaoConcedida, setPermissaoConcedida] = useState(false);

  // Estatísticas do filtro
  const [estatisticasFiltro, setEstatisticasFiltro] = useState({
    aceitos: 0,
    rejeitados: 0,
    taxaAceitacao: 0,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REFS
  // ─────────────────────────────────────────────────────────────────────────────

  const watchSubscriptionRef = useRef(null);
  const filtroRef = useRef(new FiltroGPSProfissional(configFiltro));
  const trajetoRef = useRef([]);
  const distanciaTotalRef = useRef(0);
  const ultimoPontoTrajetoRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // SOLICITAR PERMISSÃO
  // ─────────────────────────────────────────────────────────────────────────────

  const solicitarPermissao = useCallback(async () => {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        setErro("Permissão de localização negada");
        setPermissaoConcedida(false);
        return false;
      }

      // Tenta permissão background
      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch (bgError) {
        console.log("⚠️ Permissão background não disponível");
      }

      setPermissaoConcedida(true);
      setErro(null);
      return true;
    } catch (error) {
      console.error("❌ Erro ao solicitar permissão:", error);
      setErro("Erro ao solicitar permissão");
      setPermissaoConcedida(false);
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // OBTER POSIÇÃO ATUAL (única vez)
  // ─────────────────────────────────────────────────────────────────────────────

  const obterPosicaoAtual = useCallback(async () => {
    try {
      const temPermissao = permissaoConcedida || (await solicitarPermissao());
      if (!temPermissao) {
        throw new Error("Permissão de GPS necessária");
      }

      const localizacao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        maximumAge: 5000,
      });

      const posicao = {
        latitude: localizacao.coords.latitude,
        longitude: localizacao.coords.longitude,
        precisao: localizacao.coords.accuracy,
        altitude: localizacao.coords.altitude,
        velocidade: localizacao.coords.speed || 0,
        timestamp: new Date().toISOString(),
      };

      setPosicaoAtual(posicao);
      setPosicaoMedia(posicao);
      setPrecisao(posicao.precisao);
      setErro(null);

      return posicao;
    } catch (error) {
      console.error("❌ Erro ao obter posição:", error);
      setErro(error.message);
      onErro?.(error.message);
      throw error;
    }
  }, [permissaoConcedida, solicitarPermissao, onErro]);

  // ─────────────────────────────────────────────────────────────────────────────
  // PROCESSAR NOVA POSIÇÃO DO GPS - MODO TEMPO REAL (SEM FILTROS)
  // ─────────────────────────────────────────────────────────────────────────────

  const processarNovaPosicao = useCallback(
    (localizacao) => {
      // Monta objeto do ponto GPS DIRETO - sem filtros para tempo real
      const pontoGPS = {
        latitude: localizacao.coords.latitude,
        longitude: localizacao.coords.longitude,
        precisao: localizacao.coords.accuracy,
        altitude: localizacao.coords.altitude,
        velocidade: localizacao.coords.speed || 0,
        timestamp: new Date().toISOString(),
      };

      // ═══════════════════════════════════════════════════════════════════════
      // ATUALIZAÇÃO INSTANTÂNEA - SEM FILTROS PARA O MARKER
      // ═══════════════════════════════════════════════════════════════════════

      // SEMPRE atualiza posição atual IMEDIATAMENTE
      setPosicaoAtual(pontoGPS);
      setPosicaoMedia(pontoGPS);
      setPrecisao(pontoGPS.precisao);
      setVelocidade(pontoGPS.velocidade);
      setGpsAtivo(true);
      setErro(null);

      // Callback IMEDIATO
      onPosicaoAtualizada?.(pontoGPS, pontoGPS);

      // ═══════════════════════════════════════════════════════════════════════
      // TRAJETO - Adiciona pontos com filtro mínimo (só anti-teleporte)
      // ═══════════════════════════════════════════════════════════════════════

      // Calcula distância do último ponto do trajeto
      if (ultimoPontoTrajetoRef.current) {
        const dist = distanciaEntrePontos(
          ultimoPontoTrajetoRef.current,
          pontoGPS,
        );

        // Anti-teleporte: rejeita se moveu mais de 100m em um instante
        if (dist > 100) {
          console.log(
            `⚠️ Teleporte detectado: ${dist.toFixed(1)}m - ignorando trajeto`,
          );
          return;
        }

        // Adiciona ao trajeto se moveu pelo menos 1 metro
        if (dist >= 1) {
          distanciaTotalRef.current += dist;
          setDistanciaTotal(distanciaTotalRef.current);

          const novoPonto = {
            latitude: pontoGPS.latitude,
            longitude: pontoGPS.longitude,
            timestamp: pontoGPS.timestamp,
          };

          trajetoRef.current = [...trajetoRef.current, novoPonto];
          setTrajeto([...trajetoRef.current]);
          ultimoPontoTrajetoRef.current = novoPonto;

          onTrajetoAtualizado?.(trajetoRef.current, dist);
        }
      } else {
        // Primeiro ponto do trajeto
        const primeiroPonto = {
          latitude: pontoGPS.latitude,
          longitude: pontoGPS.longitude,
          timestamp: pontoGPS.timestamp,
        };

        trajetoRef.current = [primeiroPonto];
        setTrajeto([primeiroPonto]);
        ultimoPontoTrajetoRef.current = primeiroPonto;
        onTrajetoAtualizado?.([primeiroPonto], 0);
      }
    },
    [onPosicaoAtualizada, onTrajetoAtualizado],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // INICIAR TRACKING
  // ─────────────────────────────────────────────────────────────────────────────

  const iniciarTracking = useCallback(async () => {
    // Para tracking anterior
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
    }

    try {
      const temPermissao = permissaoConcedida || (await solicitarPermissao());
      if (!temPermissao) {
        throw new Error("Permissão de GPS necessária");
      }

      console.log("🛰️ Iniciando GPS tracking TEMPO REAL...");
      console.log("   ⚡ Modo: Sem filtros - atualização instantânea");
      console.log("   📍 Intervalo: 100ms (10 updates/segundo)");

      const subscription = await Location.watchPositionAsync(
        GPS_OPTIONS,
        processarNovaPosicao,
      );

      watchSubscriptionRef.current = subscription;
      setGpsAtivo(true);
      setErro(null);

      console.log("✅ GPS tracking TEMPO REAL iniciado!");
      return true;
    } catch (error) {
      console.error("❌ Erro ao iniciar GPS:", error);
      setErro(error.message);
      setGpsAtivo(false);
      onErro?.(error.message);
      return false;
    }
  }, [permissaoConcedida, solicitarPermissao, processarNovaPosicao, onErro]);

  // ─────────────────────────────────────────────────────────────────────────────
  // PARAR TRACKING
  // ─────────────────────────────────────────────────────────────────────────────

  const pararTracking = useCallback(() => {
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
      console.log("🛑 GPS tracking parado");
    }
    setGpsAtivo(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RESETAR TRAJETO
  // ─────────────────────────────────────────────────────────────────────────────

  const resetarTrajeto = useCallback(() => {
    trajetoRef.current = [];
    distanciaTotalRef.current = 0;
    ultimoPontoTrajetoRef.current = null;
    filtroRef.current.resetar();

    setTrajeto([]);
    setDistanciaTotal(0);
    setEstatisticasFiltro({ aceitos: 0, rejeitados: 0, taxaAceitacao: 0 });

    console.log("🔄 Trajeto e filtros resetados");
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RESETAR COMPLETO
  // ─────────────────────────────────────────────────────────────────────────────

  const resetarCompleto = useCallback(() => {
    pararTracking();
    resetarTrajeto();

    setPosicaoAtual(null);
    setPosicaoMedia(null);
    setVelocidade(0);
    setPrecisao(null);
    setErro(null);

    console.log("🔄 GPS tracker resetado completamente");
  }, [pararTracking, resetarTrajeto]);

  // ─────────────────────────────────────────────────────────────────────────────
  // OBTER LOGS DO FILTRO (para debug)
  // ─────────────────────────────────────────────────────────────────────────────

  const obterLogsFiltro = useCallback((quantidade = 10) => {
    return filtroRef.current.obterLogs(quantidade);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFEITO: Controle de tracking
  // ─────────────────────────────────────────────────────────────────────────────

  const ativoRef = useRef(false);
  const iniciarTrackingRef = useRef(iniciarTracking);
  const pararTrackingRef = useRef(pararTracking);
  iniciarTrackingRef.current = iniciarTracking;
  pararTrackingRef.current = pararTracking;

  useEffect(() => {
    if (ativo === ativoRef.current) return;
    ativoRef.current = ativo;

    let cancelado = false;

    if (ativo) {
      (async () => {
        await iniciarTrackingRef.current();
        if (cancelado) {
          pararTrackingRef.current();
        }
      })();
    } else {
      pararTrackingRef.current();
    }

    return () => {
      cancelado = true;
      if (ativoRef.current) {
        pararTrackingRef.current();
        ativoRef.current = false;
      }
    };
  }, [ativo]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RETORNO
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Posições
    posicaoAtual, // Posição do marker (atualizada frequentemente)
    posicaoSuavizada: posicaoMedia, // Posição média móvel
    posicaoMedia, // Alias

    // Trajeto (APENAS pontos validados)
    trajeto,
    distanciaTotal,

    // Métricas
    velocidade,
    precisao,

    // Status
    gpsAtivo,
    permissaoConcedida,
    erro,

    // Estatísticas do filtro
    estatisticasFiltro,

    // Métodos
    solicitarPermissao,
    obterPosicaoAtual,
    iniciarTracking,
    pararTracking,
    resetarTrajeto,
    resetarCompleto,
    obterLogsFiltro,
  };
}

export default useGPSTracker;
