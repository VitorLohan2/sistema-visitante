/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOOK: useRondaPreciso (VERSÃO REFATORADA)
 * Sistema profissional de ronda de vigilante com GPS de alta precisão
 *
 * ARQUITETURA:
 * - GPS → Estado Local → Google Maps (renderização)
 * - GPS → Socket.IO → Backend (dados)
 * - Backend NUNCA dirige renderização do mapa
 * - UI funciona offline
 *
 * HOOKS UTILIZADOS:
 * - useGPSTracker: GPS de alta precisão com filtros profissionais
 * - useCompass: Bússola com Magnetometer para rotação suave
 * - useRondaSocket: Socket.IO para envio de dados ao backend
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useGPSTracker } from "./useGPSTracker";
import { useCompass } from "./useCompass";
import { useRondaSocket } from "./useRondaSocket";
import rondaService from "../services/rondaService";
import {
  formatarTempo,
  formatarDistancia,
  formatarVelocidade,
} from "../utils/gpsFilter";
import { getDirecaoCardeal } from "../utils/geoUtils";
import {
  calcularDistanciaHaversine,
  validarProximidadeCheckpoint,
} from "../utils/geoLocation";

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function useRondaPreciso() {
  // ─────────────────────────────────────────────────────────────────────────────
  // ESTADOS DA RONDA
  // ─────────────────────────────────────────────────────────────────────────────

  const [rondaAtual, setRondaAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [iniciandoRonda, setIniciandoRonda] = useState(false);
  const [erro, setErro] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [rondaAtiva, setRondaAtiva] = useState(false);

  // Estados para Pontos de Controle
  const [pontosControle, setPontosControle] = useState([]);
  const [pontosVisitados, setPontosVisitados] = useState(new Set());
  const [pontoProximo, setPontoProximo] = useState(null); // Ponto dentro do raio

  // ─────────────────────────────────────────────────────────────────────────────
  // REFS
  // ─────────────────────────────────────────────────────────────────────────────

  const rondaIdRef = useRef(null);
  const dataInicioRef = useRef(null);
  const intervaloTempoRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // HOOK DE SOCKET
  // ─────────────────────────────────────────────────────────────────────────────

  const socketHook = useRondaSocket({
    rondaId: rondaIdRef.current,
    intervaloEnvio: 3000, // Envia a cada 3 segundos
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // HOOK DE GPS - SEMPRE ATIVO para posição em tempo real
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    posicaoAtual,
    posicaoSuavizada,
    trajeto,
    distanciaTotal,
    velocidade,
    precisao: precisaoGPS,
    gpsAtivo,
    erro: erroGPS,
    solicitarPermissao,
    obterPosicaoAtual,
    iniciarTracking,
    pararTracking,
    resetarTrajeto,
    resetarCompleto: resetarGPS,
  } = useGPSTracker({
    ativo: true, // SEMPRE ATIVO para mostrar posição mesmo antes da ronda
    onPosicaoAtualizada: (posicao) => {
      // Atualiza posição no socket apenas se ronda ativa
      if (rondaAtiva) {
        socketHook.atualizarPosicao(posicao);
      }
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // HOOK DE BÚSSOLA - SEMPRE ATIVO para rotação em tempo real
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    direcao,
    direcaoSuavizada: direcaoInterpolada,
    direcaoCardeal,
    bussolaAtiva,
    erro: erroBussola,
    iniciar: iniciarBussola,
    parar: pararBussola,
    resetar: resetarBussola,
  } = useCompass({
    ativo: true, // SEMPRE ATIVO para resposta instantânea da rotação
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTADOR DE TEMPO
  // ─────────────────────────────────────────────────────────────────────────────

  const iniciarContadorTempo = useCallback((dataInicio) => {
    if (intervaloTempoRef.current) {
      clearInterval(intervaloTempoRef.current);
    }

    dataInicioRef.current = new Date(dataInicio);

    const atualizar = () => {
      if (!dataInicioRef.current) return;
      const diffMs = Date.now() - dataInicioRef.current.getTime();
      setTempoDecorrido(Math.max(0, Math.floor(diffMs / 1000)));
    };

    atualizar();
    intervaloTempoRef.current = setInterval(atualizar, 1000);
  }, []);

  const pararContadorTempo = useCallback(() => {
    if (intervaloTempoRef.current) {
      clearInterval(intervaloTempoRef.current);
      intervaloTempoRef.current = null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // CARREGAR PONTOS DE CONTROLE
  // ─────────────────────────────────────────────────────────────────────────────

  const carregarPontosControle = useCallback(async () => {
    try {
      const resposta = await rondaService.listarPontosControle();
      const pontos = resposta?.pontos || [];

      // Filtra apenas pontos ativos e normaliza coordenadas
      const pontosAtivos = pontos
        .filter((p) => p.ativo)
        .map((p) => ({
          ...p,
          latitude: parseFloat(p.latitude),
          longitude: parseFloat(p.longitude),
          raio: p.raio || 30,
        }));

      setPontosControle(pontosAtivos);
      console.log(`📍 ${pontosAtivos.length} pontos de controle carregados`);

      return pontosAtivos;
    } catch (error) {
      console.warn("⚠️ Erro ao carregar pontos de controle:", error.message);
      return [];
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // VERIFICAR PROXIMIDADE COM PONTOS DE CONTROLE
  // ─────────────────────────────────────────────────────────────────────────────

  const verificarProximidadePontos = useCallback(
    (posicao) => {
      if (!posicao || !pontosControle.length || !rondaAtual) return;

      // Procura ponto dentro do raio que ainda não foi visitado
      let pontoMaisProximo = null;
      let menorDistancia = Infinity;

      for (const ponto of pontosControle) {
        // Pula pontos já visitados
        if (pontosVisitados.has(ponto.id)) continue;

        const distancia = calcularDistanciaHaversine(
          posicao.latitude,
          posicao.longitude,
          ponto.latitude,
          ponto.longitude,
        );

        // Verifica se está dentro do raio
        if (distancia <= ponto.raio && distancia < menorDistancia) {
          menorDistancia = distancia;
          pontoMaisProximo = {
            ...ponto,
            distanciaAtual: Math.round(distancia),
            dentroDoRaio: true,
          };
        }
      }

      setPontoProximo(pontoMaisProximo);
    },
    [pontosControle, pontosVisitados, rondaAtual],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // REF PARA SOCKET HOOK (evita re-renders)
  // ─────────────────────────────────────────────────────────────────────────────

  const socketHookRef = useRef(socketHook);
  socketHookRef.current = socketHook;

  // ─────────────────────────────────────────────────────────────────────────────
  // LIMPAR ESTADOS
  // ─────────────────────────────────────────────────────────────────────────────

  const limparEstados = useCallback(() => {
    // Para todos os sistemas
    setRondaAtiva(false);
    pararContadorTempo();
    socketHookRef.current.finalizar(rondaIdRef.current);

    // Reseta refs
    rondaIdRef.current = null;
    dataInicioRef.current = null;

    // Reseta estados
    setRondaAtual(null);
    setCheckpoints([]);
    setTempoDecorrido(0);
    setErro(null);
    setPontosVisitados(new Set());
    setPontoProximo(null);

    console.log("🔄 Estados da ronda limpos");
  }, [pararContadorTempo]);

  // ─────────────────────────────────────────────────────────────────────────────
  // VERIFICAR RONDA EM ANDAMENTO
  // ─────────────────────────────────────────────────────────────────────────────

  const verificarRondaEmAndamento = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      // Carrega pontos de controle primeiro
      await carregarPontosControle();

      const resposta = await rondaService.buscarRondaEmAndamento();
      const ronda = resposta?.ronda;

      if (ronda && ronda.id) {
        console.log("✅ Ronda em andamento encontrada:", ronda.id);

        setRondaAtual(ronda);
        rondaIdRef.current = ronda.id;

        // Carrega checkpoints existentes e marca pontos visitados
        if (Array.isArray(ronda.checkpoints)) {
          const cps = ronda.checkpoints
            .map((cp) => ({
              ...cp,
              latitude: cp.latitude ? parseFloat(cp.latitude) : null,
              longitude: cp.longitude ? parseFloat(cp.longitude) : null,
            }))
            .filter((cp) => cp.latitude && cp.longitude);
          setCheckpoints(cps);

          // Marca pontos de controle já visitados
          const visitados = new Set();
          cps.forEach((cp) => {
            if (cp.ponto_controle_id) {
              visitados.add(cp.ponto_controle_id);
            }
          });
          setPontosVisitados(visitados);
        }

        // Solicita permissão de GPS
        const temPermissao = await solicitarPermissao();
        if (temPermissao) {
          // Ativa todos os sistemas
          setRondaAtiva(true);
          iniciarContadorTempo(ronda.data_inicio);

          // Inicializa socket
          await socketHookRef.current.inicializar(ronda.id);
        }
      }
    } catch (error) {
      console.log("⚠️ Nenhuma ronda em andamento:", error.message);
      // Não é erro se não houver ronda
    } finally {
      setCarregando(false);
    }
  }, [solicitarPermissao, iniciarContadorTempo, carregarPontosControle]);

  // ─────────────────────────────────────────────────────────────────────────────
  // INICIAR RONDA
  // ─────────────────────────────────────────────────────────────────────────────

  const iniciarRonda = useCallback(async () => {
    if (iniciandoRonda || rondaAtual) {
      return null;
    }

    try {
      setIniciandoRonda(true);
      setErro(null);

      // Carrega pontos de controle se ainda não carregou
      if (pontosControle.length === 0) {
        await carregarPontosControle();
      }

      // Solicita permissão
      const temPermissao = await solicitarPermissao();
      if (!temPermissao) {
        throw new Error("Permissão de GPS necessária");
      }

      // Obtém posição inicial
      const posicao = await obterPosicaoAtual();

      // Inicia ronda no backend
      const resposta = await rondaService.iniciarRonda(posicao);
      const ronda = resposta?.ronda || resposta;

      if (!ronda || !ronda.id) {
        throw new Error("Resposta inválida do servidor");
      }

      console.log("✅ Ronda iniciada:", ronda.id);

      // Atualiza estados
      setRondaAtual(ronda);
      rondaIdRef.current = ronda.id;
      setCheckpoints([]);
      setPontosVisitados(new Set());

      // Ativa tracking (GPS e bússola)
      setRondaAtiva(true);

      // Inicia contador de tempo
      iniciarContadorTempo(ronda.data_inicio);

      // Inicializa socket
      await socketHookRef.current.inicializar(ronda.id);
      socketHookRef.current.emitirRondaIniciada(ronda);

      return ronda;
    } catch (error) {
      console.error("❌ Erro ao iniciar ronda:", error);
      const mensagem = error.response?.data?.error || error.message;
      setErro(mensagem);
      throw error;
    } finally {
      setIniciandoRonda(false);
    }
  }, [
    iniciandoRonda,
    rondaAtual,
    solicitarPermissao,
    obterPosicaoAtual,
    iniciarContadorTempo,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTRAR CHECKPOINT (com validação de ponto de controle)
  // ─────────────────────────────────────────────────────────────────────────────

  const registrarCheckpoint = useCallback(
    async (descricao = "", pontoControleId = null) => {
      if (!rondaAtual || !rondaIdRef.current) {
        throw new Error("Nenhuma ronda em andamento");
      }

      try {
        // Obtém posição atual
        const posicao = await obterPosicaoAtual();

        // Se for ponto de controle, valida proximidade
        let distancia = null;
        let pontoValidado = pontoControleId
          ? pontosControle.find((p) => p.id === pontoControleId)
          : null;

        if (pontoValidado) {
          distancia = calcularDistanciaHaversine(
            posicao.latitude,
            posicao.longitude,
            pontoValidado.latitude,
            pontoValidado.longitude,
          );

          // Verifica se está dentro do raio
          if (distancia > pontoValidado.raio) {
            throw new Error(
              `Você está a ${Math.round(distancia)}m do ponto. Aproxime-se para validar (raio: ${pontoValidado.raio}m).`,
            );
          }
        }

        // Registra no backend
        const resposta = await rondaService.registrarCheckpoint(
          rondaIdRef.current,
          {
            ponto_controle_id: pontoControleId,
            latitude: posicao.latitude,
            longitude: posicao.longitude,
            distancia: distancia ? Math.round(distancia) : null,
            precisao: posicao.accuracy || null,
            descricao,
          },
        );

        const checkpoint = resposta?.checkpoint || resposta;

        // Normaliza checkpoint
        const cp = {
          ...checkpoint,
          latitude: checkpoint.latitude
            ? parseFloat(checkpoint.latitude)
            : posicao.latitude,
          longitude: checkpoint.longitude
            ? parseFloat(checkpoint.longitude)
            : posicao.longitude,
          ponto_controle_id: pontoControleId,
          nome_ponto: pontoValidado?.nome || null,
        };

        // Atualiza estado local
        setCheckpoints((prev) => [...prev, cp]);

        // Marca ponto como visitado
        if (pontoControleId) {
          setPontosVisitados((prev) => new Set([...prev, pontoControleId]));
          setPontoProximo(null);
        }

        // Emite via socket
        socketHookRef.current.emitirCheckpoint(cp, rondaIdRef.current);

        console.log(
          "✅ Checkpoint registrado:",
          pontoValidado?.nome || `#${checkpoints.length + 1}`,
        );

        return cp;
      } catch (error) {
        console.error("❌ Erro ao registrar checkpoint:", error);
        throw error;
      }
    },
    [rondaAtual, obterPosicaoAtual, checkpoints.length, pontosControle],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDAR PONTO DE CONTROLE PRÓXIMO (atalho para checkpoint)
  // ─────────────────────────────────────────────────────────────────────────────

  const validarPontoProximo = useCallback(
    async (descricao = "") => {
      if (!pontoProximo) {
        throw new Error("Nenhum ponto de controle dentro do raio");
      }
      return registrarCheckpoint(descricao, pontoProximo.id);
    },
    [pontoProximo, registrarCheckpoint],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // FINALIZAR RONDA
  // ─────────────────────────────────────────────────────────────────────────────

  const finalizarRonda = useCallback(
    async (observacoes = "") => {
      if (!rondaAtual || !rondaIdRef.current) {
        throw new Error("Nenhuma ronda em andamento");
      }

      try {
        // Obtém posição final
        const posicao = await obterPosicaoAtual();

        // Finaliza no backend
        const resultado = await rondaService.finalizarRonda(
          rondaIdRef.current,
          {
            latitude: posicao.latitude,
            longitude: posicao.longitude,
            observacoes,
          },
        );

        console.log("✅ Ronda finalizada:", rondaIdRef.current);

        // Emite via socket
        socketHookRef.current.emitirRondaFinalizada({
          id: rondaIdRef.current,
          ...resultado,
        });

        // Limpa estados
        limparEstados();

        return resultado;
      } catch (error) {
        console.error("❌ Erro ao finalizar ronda:", error);
        throw error;
      }
    },
    [rondaAtual, obterPosicaoAtual],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // EFEITOS
  // ─────────────────────────────────────────────────────────────────────────────

  // Verifica ronda em andamento no mount
  useEffect(() => {
    verificarRondaEmAndamento();

    return () => {
      // Cleanup
      pararContadorTempo();
    };
  }, []);

  // Verifica proximidade com pontos de controle quando a posição atualiza
  useEffect(() => {
    if (posicaoAtual && rondaAtiva) {
      verificarProximidadePontos(posicaoAtual);
    }
  }, [posicaoAtual, rondaAtiva, verificarProximidadePontos]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RETORNO - OTIMIZADO PARA TEMPO REAL
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Estado da ronda
    rondaAtual,
    carregando,
    iniciandoRonda,
    erro,

    // GPS - USA POSIÇÃO BRUTA para tempo real
    posicaoAtual: posicaoAtual, // Posição bruta para resposta instantânea
    posicaoInterpolada: posicaoAtual, // Também bruta para tempo real
    precisaoGPS,
    velocidade,
    gpsAtivo,
    erroGPS,

    // Bússola - USA DIREÇÃO BRUTA para resposta instantânea
    direcao,
    direcaoInterpolada: direcao, // Usa direção bruta para tempo real
    getDirecaoCardeal: (angulo) => getDirecaoCardeal(angulo ?? direcao),

    // Trajeto
    trajeto,
    checkpoints,
    distanciaTotal,
    tempoDecorrido,

    // Pontos de Controle
    pontosControle,
    pontosVisitados: Array.from(pontosVisitados),
    pontoProximo, // Ponto dentro do raio (se houver)
    totalPontosObrigatorios: pontosControle.filter((p) => p.obrigatorio).length,
    pontosObrigatoriosVisitados: pontosControle.filter(
      (p) => p.obrigatorio && pontosVisitados.has(p.id),
    ).length,

    // Ações
    iniciarRonda,
    finalizarRonda,
    registrarCheckpoint,
    validarPontoProximo, // Valida o ponto mais próximo
    obterPosicaoAtual,
    carregarPontosControle,

    // Formatadores
    formatarTempo,
    formatarDistancia,
    formatarVelocidade,
  };
}

export default useRondaPreciso;
