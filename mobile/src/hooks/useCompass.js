/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOOK: useCompass
 * Sistema de bússola de alta precisão usando Magnetometer (expo-sensors)
 *
 * CARACTERÍSTICAS:
 * - NÃO usa coords.heading (impreciso)
 * - Usa Magnetometer do expo-sensors
 * - Atualização a cada ~100ms
 * - Conversão correta para ângulo 0-360°
 * - Rotação suave interpolada
 * - Correção para Android/iOS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Magnetometer } from "expo-sensors";
import { Platform } from "react-native";
import {
  SuavizadorAngulo,
  normalizarAngulo,
  getDirecaoCardeal,
} from "../utils/geoUtils";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const MAGNETOMETER_CONFIG = {
  UPDATE_INTERVAL: 16, // 60 FPS - tempo real
  SMOOTHING_FACTOR: 0.5, // Menos suavização = mais responsivo
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Converte dados do magnetômetro para heading (0-360°)
 * @param {Object} data - Dados do magnetômetro {x, y, z}
 * @returns {number} Ângulo em graus (0 = Norte)
 */
function calcularHeading(data) {
  if (!data || data.x === undefined || data.y === undefined) {
    return null; // Retorna null ao invés de 0 para indicar dado inválido
  }

  const { x, y } = data;

  // Se os valores são muito próximos de zero, magnetômetro não está funcionando
  if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) {
    return null;
  }

  // Calcula ângulo usando atan2
  // atan2 retorna radianos de -π a π
  let angulo = Math.atan2(y, x) * (180 / Math.PI);

  // Normaliza para 0-360
  angulo = normalizarAngulo(angulo);

  // Correção específica para Android
  // O magnetômetro do Android retorna valores diferentes do iOS
  if (Platform.OS === "android") {
    // Rotaciona 90° para alinhar com o Norte
    angulo = normalizarAngulo(angulo + 90);
  }

  return angulo;
}

/**
 * Aplica calibração baseada em declinação magnética local
 * @param {number} heading - Heading magnético
 * @param {number} declinacao - Declinação magnética em graus
 * @returns {number} Heading corrigido
 */
function aplicarDeclinacao(heading, declinacao = 0) {
  return normalizarAngulo(heading + declinacao);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function useCompass(options = {}) {
  const {
    ativo = false,
    updateInterval = MAGNETOMETER_CONFIG.UPDATE_INTERVAL,
    smoothingFactor = MAGNETOMETER_CONFIG.SMOOTHING_FACTOR,
    declinacaoMagnetica = 0, // Declinação magnética local (graus)
    onDirecaoAtualizada = null,
  } = options;

  // ─────────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ─────────────────────────────────────────────────────────────────────────────

  // Ângulo bruto do magnetômetro
  const [direcaoBruta, setDirecaoBruta] = useState(0);

  // Ângulo suavizado (para rotação fluida)
  const [direcaoSuavizada, setDirecaoSuavizada] = useState(0);

  // Direção cardeal (N, NE, E, etc.)
  const [direcaoCardeal, setDirecaoCardeal] = useState("--");

  // Status
  const [busssolaAtiva, setBussolaAtiva] = useState(false);
  const [disponivel, setDisponivel] = useState(false);
  const [erro, setErro] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // REFS
  // ─────────────────────────────────────────────────────────────────────────────

  const subscriptionRef = useRef(null);
  const suavizadorRef = useRef(new SuavizadorAngulo(smoothingFactor));

  // ─────────────────────────────────────────────────────────────────────────────
  // VERIFICAR DISPONIBILIDADE
  // ─────────────────────────────────────────────────────────────────────────────

  const verificarDisponibilidade = useCallback(async () => {
    try {
      const { available } = await Magnetometer.isAvailableAsync();
      setDisponivel(available);

      if (!available) {
        setErro("Magnetômetro não disponível neste dispositivo");
        return false;
      }

      setErro(null);
      return true;
    } catch (error) {
      console.error("❌ Erro ao verificar magnetômetro:", error);
      setDisponivel(false);
      setErro("Erro ao verificar magnetômetro");
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // PROCESSAR DADOS DO MAGNETÔMETRO
  // ─────────────────────────────────────────────────────────────────────────────

  const processarDados = useCallback(
    (data) => {
      // Calcula heading bruto
      let headingBruto = calcularHeading(data);

      // Se magnetômetro não retornou dado válido, mantém último valor
      if (headingBruto === null) {
        console.log("⚠️ Magnetômetro: dados inválidos, mantendo último valor");
        return;
      }

      // Aplica declinação magnética
      headingBruto = aplicarDeclinacao(headingBruto, declinacaoMagnetica);

      // Atualiza direção bruta
      setDirecaoBruta(headingBruto);

      // TEMPO REAL: usa direto sem suavização excessiva
      // Apenas um leve filtro para evitar tremor
      const headingSuavizado = suavizadorRef.current.suavizar(headingBruto);
      setDirecaoSuavizada(headingBruto); // USA BRUTO para resposta instantânea

      // Atualiza direção cardeal
      const cardeal = getDirecaoCardeal(headingSuavizado);
      setDirecaoCardeal(cardeal);

      // Callback
      onDirecaoAtualizada?.({
        bruta: headingBruto,
        suavizada: headingSuavizado,
        cardeal,
      });
    },
    [declinacaoMagnetica, onDirecaoAtualizada],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // INICIAR BÚSSOLA
  // ─────────────────────────────────────────────────────────────────────────────

  const iniciar = useCallback(async () => {
    // Para se já estiver rodando
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    try {
      // Verifica disponibilidade
      const estaDisponivel = await verificarDisponibilidade();
      if (!estaDisponivel) {
        return false;
      }

      console.log("🧭 Iniciando bússola (Magnetometer)...");

      // Define intervalo de atualização
      Magnetometer.setUpdateInterval(updateInterval);

      // Inicia listener
      subscriptionRef.current = Magnetometer.addListener(processarDados);

      setBussolaAtiva(true);
      setErro(null);

      console.log(`✅ Bússola iniciada (intervalo: ${updateInterval}ms)`);
      return true;
    } catch (error) {
      console.error("❌ Erro ao iniciar bússola:", error);
      setErro("Erro ao iniciar bússola");
      setBussolaAtiva(false);
      return false;
    }
  }, [verificarDisponibilidade, updateInterval, processarDados]);

  // ─────────────────────────────────────────────────────────────────────────────
  // PARAR BÚSSOLA
  // ─────────────────────────────────────────────────────────────────────────────

  const parar = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
      console.log("🛑 Bússola parada");
    }
    setBussolaAtiva(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RESETAR
  // ─────────────────────────────────────────────────────────────────────────────

  const resetar = useCallback(() => {
    parar();
    suavizadorRef.current.resetar();
    setDirecaoBruta(0);
    setDirecaoSuavizada(0);
    setDirecaoCardeal("--");
    setErro(null);
    console.log("🔄 Bússola resetada");
  }, [parar]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CALIBRAR (reinicia suavização)
  // ─────────────────────────────────────────────────────────────────────────────

  const calibrar = useCallback(() => {
    suavizadorRef.current.resetar();
    console.log("🔧 Bússola calibrada");
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFEITO: Controle baseado na prop 'ativo'
  // ─────────────────────────────────────────────────────────────────────────────

  // Ref para controlar se já está ativo (evita loop)
  const ativoRef = useRef(false);

  // Refs estáveis para as funções (evita recriação de callbacks)
  const iniciarRef = useRef(iniciar);
  const pararRef = useRef(parar);
  iniciarRef.current = iniciar;
  pararRef.current = parar;

  useEffect(() => {
    // Evita executar se o estado não mudou realmente
    if (ativo === ativoRef.current) return;
    ativoRef.current = ativo;

    let cancelado = false;

    if (ativo) {
      // Usa IIFE para poder usar async/await
      (async () => {
        await iniciarRef.current();
        // Verifica se foi cancelado enquanto aguardava
        if (cancelado) {
          pararRef.current();
        }
      })();
    } else {
      pararRef.current();
    }

    return () => {
      cancelado = true;
      if (ativoRef.current) {
        pararRef.current();
        ativoRef.current = false;
      }
    };
  }, [ativo]); // Apenas 'ativo' como dependência

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP NO UNMOUNT
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Verifica disponibilidade no mount
    verificarDisponibilidade();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [verificarDisponibilidade]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RETORNO
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Direções
    direcao: direcaoSuavizada, // Ângulo suavizado para rotação do marker
    direcaoBruta, // Ângulo bruto do magnetômetro
    direcaoSuavizada, // Alias para direcao
    direcaoCardeal, // Direção cardeal (N, NE, E, etc.)

    // Status
    bussolaAtiva: busssolaAtiva,
    disponivel,
    erro,

    // Métodos
    iniciar,
    parar,
    resetar,
    calibrar,
    verificarDisponibilidade,

    // Utilitário
    getDirecaoCardeal: (angulo) =>
      getDirecaoCardeal(angulo ?? direcaoSuavizada),
  };
}

export default useCompass;
