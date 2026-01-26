/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UTILITÁRIOS GEOGRÁFICOS - SISTEMA DE RONDA PROFISSIONAL
 *
 * Funções de alta precisão para:
 * - Cálculo de distância (Haversine)
 * - Interpolação de coordenadas
 * - Filtro anti-teleporte
 * - Suavização de movimento (filtro de média móvel)
 * - Conversão de ângulos e direções
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const EARTH_RADIUS_METERS = 6371000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Limites para filtro anti-teleporte (em metros)
export const GPS_CONFIG = {
  MAX_JUMP_DISTANCE: 20, // Distância máxima permitida entre pontos (metros)
  MIN_DISTANCE_TO_RECORD: 2, // Distância mínima para registrar novo ponto (metros)
  MAX_SPEED_MS: 8.33, // Velocidade máxima esperada ~30 km/h (m/s)
  SMOOTHING_FACTOR: 0.3, // Fator de suavização (0-1, menor = mais suave)
  INTERPOLATION_STEPS: 5, // Passos de interpolação para movimento suave
};

// ═══════════════════════════════════════════════════════════════════════════════
// CÁLCULO DE DISTÂNCIA - FÓRMULA DE HAVERSINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param {number} lat1 - Latitude do ponto 1
 * @param {number} lon1 - Longitude do ponto 1
 * @param {number} lat2 - Latitude do ponto 2
 * @param {number} lon2 - Longitude do ponto 2
 * @returns {number} Distância em metros
 */
export function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;

  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calcula distância entre dois objetos de coordenadas
 * @param {Object} coord1 - {latitude, longitude}
 * @param {Object} coord2 - {latitude, longitude}
 * @returns {number} Distância em metros
 */
export function calcularDistancia(coord1, coord2) {
  if (!coord1 || !coord2) return 0;
  return calcularDistanciaHaversine(
    coord1.latitude,
    coord1.longitude,
    coord2.latitude,
    coord2.longitude,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERPOLAÇÃO DE COORDENADAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interpola linearmente entre dois valores
 * @param {number} start - Valor inicial
 * @param {number} end - Valor final
 * @param {number} t - Fator de interpolação (0-1)
 * @returns {number} Valor interpolado
 */
export function lerp(start, end, t) {
  return start + (end - start) * Math.max(0, Math.min(1, t));
}

/**
 * Interpola coordenadas entre dois pontos
 * @param {Object} from - Coordenada inicial {latitude, longitude}
 * @param {Object} to - Coordenada final {latitude, longitude}
 * @param {number} t - Fator de interpolação (0-1)
 * @returns {Object} Coordenada interpolada
 */
export function interpolateCoordenadas(from, to, t) {
  if (!from || !to) return to || from;

  return {
    latitude: lerp(from.latitude, to.latitude, t),
    longitude: lerp(from.longitude, to.longitude, t),
  };
}

/**
 * Gera array de pontos interpolados entre duas coordenadas
 * @param {Object} from - Coordenada inicial
 * @param {Object} to - Coordenada final
 * @param {number} steps - Número de passos intermediários
 * @returns {Array} Array de coordenadas interpoladas
 */
export function gerarPontosInterpolados(
  from,
  to,
  steps = GPS_CONFIG.INTERPOLATION_STEPS,
) {
  if (!from || !to) return [];

  const pontos = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    pontos.push(interpolateCoordenadas(from, to, t));
  }
  return pontos;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTRO ANTI-TELEPORTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se a nova posição é válida (não é teleporte)
 * @param {Object} posicaoAnterior - Posição anterior {latitude, longitude, timestamp}
 * @param {Object} novaPosicao - Nova posição {latitude, longitude, timestamp}
 * @param {Object} config - Configurações opcionais
 * @returns {Object} {valida: boolean, distancia: number, motivo: string}
 */
export function validarPosicao(posicaoAnterior, novaPosicao, config = {}) {
  const {
    maxJumpDistance = GPS_CONFIG.MAX_JUMP_DISTANCE,
    maxSpeedMS = GPS_CONFIG.MAX_SPEED_MS,
  } = config;

  // Se não há posição anterior, aceita a nova
  if (!posicaoAnterior) {
    return { valida: true, distancia: 0, motivo: "primeira_posicao" };
  }

  // Calcula distância
  const distancia = calcularDistancia(posicaoAnterior, novaPosicao);

  // Calcula tempo decorrido (se disponível)
  let tempoDecorrido = 0;
  if (posicaoAnterior.timestamp && novaPosicao.timestamp) {
    const t1 = new Date(posicaoAnterior.timestamp).getTime();
    const t2 = new Date(novaPosicao.timestamp).getTime();
    tempoDecorrido = (t2 - t1) / 1000; // em segundos
  }

  // Verifica salto brusco (teleporte)
  if (distancia > maxJumpDistance) {
    // Se temos tempo, verifica velocidade
    if (tempoDecorrido > 0) {
      const velocidadeCalculada = distancia / tempoDecorrido;
      if (velocidadeCalculada > maxSpeedMS) {
        return {
          valida: false,
          distancia,
          motivo: `teleporte_velocidade_${velocidadeCalculada.toFixed(1)}ms`,
        };
      }
    } else {
      // Sem tempo disponível, rejeita saltos grandes
      return {
        valida: false,
        distancia,
        motivo: `teleporte_distancia_${distancia.toFixed(1)}m`,
      };
    }
  }

  return { valida: true, distancia, motivo: "ok" };
}

/**
 * Classe para gerenciar filtro anti-teleporte com histórico
 */
export class FiltroAntiTeleporte {
  constructor(config = {}) {
    this.config = { ...GPS_CONFIG, ...config };
    this.ultimaPosicaoValida = null;
    this.posicoesRejeitadas = 0;
    this.maxRejeicoes = 3; // Após X rejeições consecutivas, aceita mesmo assim
  }

  /**
   * Processa nova posição
   * @param {Object} novaPosicao - Nova posição GPS
   * @returns {Object} {aceita: boolean, posicao: Object, motivo: string}
   */
  processar(novaPosicao) {
    if (!novaPosicao || !novaPosicao.latitude || !novaPosicao.longitude) {
      return { aceita: false, posicao: null, motivo: "posicao_invalida" };
    }

    const resultado = validarPosicao(
      this.ultimaPosicaoValida,
      novaPosicao,
      this.config,
    );

    if (resultado.valida) {
      this.ultimaPosicaoValida = { ...novaPosicao };
      this.posicoesRejeitadas = 0;
      return { aceita: true, posicao: novaPosicao, motivo: resultado.motivo };
    }

    // Incrementa contador de rejeições
    this.posicoesRejeitadas++;

    // Se rejeitou muitas vezes consecutivas, aceita (pode ser movimento real)
    if (this.posicoesRejeitadas >= this.maxRejeicoes) {
      this.ultimaPosicaoValida = { ...novaPosicao };
      this.posicoesRejeitadas = 0;
      return {
        aceita: true,
        posicao: novaPosicao,
        motivo: "aceito_apos_rejeicoes",
      };
    }

    return { aceita: false, posicao: null, motivo: resultado.motivo };
  }

  /**
   * Reseta o filtro
   */
  resetar() {
    this.ultimaPosicaoValida = null;
    this.posicoesRejeitadas = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUAVIZAÇÃO DE MOVIMENTO (MÉDIA MÓVEL EXPONENCIAL)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classe para suavizar coordenadas GPS usando média móvel exponencial
 */
export class SuavizadorCoordenadas {
  constructor(fatorSuavizacao = GPS_CONFIG.SMOOTHING_FACTOR) {
    this.fator = fatorSuavizacao;
    this.posicaoSuavizada = null;
  }

  /**
   * Suaviza nova posição
   * @param {Object} novaPosicao - Nova posição {latitude, longitude}
   * @returns {Object} Posição suavizada
   */
  suavizar(novaPosicao) {
    if (!novaPosicao) return this.posicaoSuavizada;

    if (!this.posicaoSuavizada) {
      this.posicaoSuavizada = { ...novaPosicao };
      return this.posicaoSuavizada;
    }

    // Média móvel exponencial
    this.posicaoSuavizada = {
      latitude:
        this.posicaoSuavizada.latitude +
        this.fator * (novaPosicao.latitude - this.posicaoSuavizada.latitude),
      longitude:
        this.posicaoSuavizada.longitude +
        this.fator * (novaPosicao.longitude - this.posicaoSuavizada.longitude),
      // Mantém outros campos da nova posição
      ...novaPosicao,
      latitude:
        this.posicaoSuavizada.latitude +
        this.fator * (novaPosicao.latitude - this.posicaoSuavizada.latitude),
      longitude:
        this.posicaoSuavizada.longitude +
        this.fator * (novaPosicao.longitude - this.posicaoSuavizada.longitude),
    };

    return this.posicaoSuavizada;
  }

  /**
   * Reseta o suavizador
   */
  resetar() {
    this.posicaoSuavizada = null;
  }

  /**
   * Obtém posição atual suavizada
   */
  getPosicaoAtual() {
    return this.posicaoSuavizada;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIREÇÃO E ÂNGULOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normaliza ângulo para 0-360 graus
 * @param {number} angulo - Ângulo em graus
 * @returns {number} Ângulo normalizado
 */
export function normalizarAngulo(angulo) {
  return ((angulo % 360) + 360) % 360;
}

/**
 * Interpola entre dois ângulos usando o caminho mais curto
 * @param {number} anguloAtual - Ângulo atual
 * @param {number} anguloAlvo - Ângulo alvo
 * @param {number} fator - Fator de interpolação (0-1)
 * @returns {number} Ângulo interpolado
 */
export function interpolatarAngulo(anguloAtual, anguloAlvo, fator = 0.15) {
  // Normaliza os ângulos
  const atual = normalizarAngulo(anguloAtual);
  const alvo = normalizarAngulo(anguloAlvo);

  // Calcula a diferença usando o caminho mais curto
  let diff = alvo - atual;

  // Ajusta para usar o caminho mais curto
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  // Interpola
  return normalizarAngulo(atual + diff * fator);
}

/**
 * Converte ângulo em graus para direção cardeal
 * @param {number} angulo - Ângulo em graus (0 = Norte)
 * @returns {string} Direção cardeal (N, NE, E, SE, S, SO, O, NO)
 */
export function getDirecaoCardeal(angulo) {
  if (angulo === null || angulo === undefined) return "--";

  const direcoes = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const normalizado = normalizarAngulo(angulo);
  const indice = Math.round(normalizado / 45) % 8;
  return direcoes[indice];
}

/**
 * Calcula bearing (direção) entre dois pontos
 * @param {Object} from - Coordenada de origem
 * @param {Object} to - Coordenada de destino
 * @returns {number} Bearing em graus (0-360)
 */
export function calcularBearing(from, to) {
  if (!from || !to) return 0;

  const lat1 = from.latitude * DEG_TO_RAD;
  const lat2 = to.latitude * DEG_TO_RAD;
  const dLon = (to.longitude - from.longitude) * DEG_TO_RAD;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = Math.atan2(y, x) * RAD_TO_DEG;
  return normalizarAngulo(bearing);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUAVIZADOR DE ÂNGULO (para bússola)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classe para suavizar ângulos de bússola
 */
export class SuavizadorAngulo {
  constructor(fator = 0.15) {
    this.fator = fator;
    this.anguloAtual = 0;
    this.inicializado = false;
  }

  /**
   * Suaviza novo ângulo
   * @param {number} novoAngulo - Novo ângulo em graus
   * @returns {number} Ângulo suavizado
   */
  suavizar(novoAngulo) {
    if (!this.inicializado) {
      this.anguloAtual = novoAngulo;
      this.inicializado = true;
      return this.anguloAtual;
    }

    this.anguloAtual = interpolatarAngulo(
      this.anguloAtual,
      novoAngulo,
      this.fator,
    );
    return this.anguloAtual;
  }

  /**
   * Reseta o suavizador
   */
  resetar() {
    this.anguloAtual = 0;
    this.inicializado = false;
  }

  /**
   * Obtém ângulo atual
   */
  getAnguloAtual() {
    return this.anguloAtual;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATADORES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formata tempo em segundos para HH:MM:SS ou MM:SS
 * @param {number} segundos - Tempo em segundos
 * @returns {string} Tempo formatado
 */
export function formatarTempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Formata distância em metros para exibição
 * @param {number} metros - Distância em metros
 * @returns {string} Distância formatada
 */
export function formatarDistancia(metros) {
  if (!metros || metros < 0) return "0 m";
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(2)} km`;
}

/**
 * Formata velocidade de m/s para km/h
 * @param {number} velocidadeMS - Velocidade em m/s
 * @returns {string} Velocidade formatada
 */
export function formatarVelocidade(velocidadeMS) {
  if (!velocidadeMS || velocidadeMS <= 0) return "0 km/h";
  return `${Math.round(velocidadeMS * 3.6)} km/h`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Constantes
  GPS_CONFIG,
  EARTH_RADIUS_METERS,

  // Cálculos de distância
  calcularDistanciaHaversine,
  calcularDistancia,

  // Interpolação
  lerp,
  interpolateCoordenadas,
  gerarPontosInterpolados,

  // Filtro anti-teleporte
  validarPosicao,
  FiltroAntiTeleporte,

  // Suavização
  SuavizadorCoordenadas,

  // Ângulos e direção
  normalizarAngulo,
  interpolatarAngulo,
  getDirecaoCardeal,
  calcularBearing,
  SuavizadorAngulo,

  // Formatadores
  formatarTempo,
  formatarDistancia,
  formatarVelocidade,
};
