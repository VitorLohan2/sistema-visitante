/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILTRO GPS PROFISSIONAL - ANTI DRIFT / ANTI TELEPORTE
 *
 * Sistema rigoroso de filtragem para eliminar:
 * - Movimento fantasma (GPS drift)
 * - Teleportes (saltos bruscos)
 * - Zigue-zague (oscilação)
 * - Pontos de baixa qualidade
 *
 * REGRAS OBRIGATÓRIAS:
 * 1. Nunca usar ponto bruto do GPS
 * 2. Filtro por deslocamento mínimo (5 metros)
 * 3. Filtro por velocidade mínima (1.5 km/h = 0.42 m/s)
 * 4. Filtro por aceleração impossível
 * 5. Média móvel dos últimos 5 pontos válidos
 * 6. Filtro por precisão do GPS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

export const FILTRO_CONFIG = {
  // Deslocamento - MÍNIMO PARA TEMPO REAL
  MIN_DISTANCIA_METROS: 1, // Reduzido para 1m - atualiza quase sempre
  MAX_DISTANCIA_METROS: 150, // Aumentado para 150m entre pontos (anti-teleporte)

  // Velocidade - PRATICAMENTE SEM FILTRO
  MIN_VELOCIDADE_MS: 0.05, // 0.05 m/s (~0.18 km/h - quase parado)
  MAX_VELOCIDADE_MS: 6.0, // 21.6 km/h (corrida rápida)
  MAX_VELOCIDADE_EXTREMA_MS: 20.0, // 72 km/h (veículo)

  // Aceleração
  MAX_ACELERACAO_MS2: 5.0, // Bem permissivo

  // Precisão GPS - mais permissivo
  MAX_PRECISAO_METROS: 50, // Aumentado para 50m
  PRECISAO_IDEAL_METROS: 20, // Aumentado para 20m

  // Média móvel
  TAMANHO_JANELA_MEDIA: 3, // Reduzido para 3 pontos
  MIN_PONTOS_MEDIA: 2, // Mínimo de 2 pontos

  // Tempo - ATUALIZAÇÃO RÁPIDA
  MIN_INTERVALO_MS: 100, // Reduzido para 100ms
  MAX_INTERVALO_MS: 60000, // Máximo 60s entre pontos

  // Direção
  MAX_MUDANCA_DIRECAO_GRAUS: 180, // Permite qualquer curva

  // Anti-drift estático - BEM PERMISSIVO
  MIN_DISTANCIA_COM_BAIXA_PRECISAO: 2, // Reduzido para 2m
};

// ═══════════════════════════════════════════════════════════════════════════════
// CÁLCULO DE DISTÂNCIA HAVERSINE
// ═══════════════════════════════════════════════════════════════════════════════

const RAIO_TERRA_METROS = 6371000;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Calcula distância entre dois pontos usando Haversine
 */
export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) ** 2;

  return RAIO_TERRA_METROS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calcula distância entre dois objetos de coordenada
 */
export function distanciaEntrePontos(p1, p2) {
  if (!p1 || !p2) return 0;
  return calcularDistancia(
    p1.latitude,
    p1.longitude,
    p2.latitude,
    p2.longitude,
  );
}

/**
 * Calcula direção (bearing) entre dois pontos
 */
export function calcularDirecao(p1, p2) {
  if (!p1 || !p2) return 0;

  const lat1 = p1.latitude * DEG_TO_RAD;
  const lat2 = p2.latitude * DEG_TO_RAD;
  const dLon = (p2.longitude - p1.longitude) * DEG_TO_RAD;

  const x = Math.sin(dLon) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let direcao = Math.atan2(x, y) * (180 / Math.PI);
  return (direcao + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSE: VALIDADOR DE PONTO GPS
// ═══════════════════════════════════════════════════════════════════════════════

export class ValidadorPontoGPS {
  constructor(config = {}) {
    this.config = { ...FILTRO_CONFIG, ...config };
  }

  /**
   * Valida um novo ponto GPS
   * @returns {Object} { valido: boolean, motivo: string, detalhes: Object }
   */
  validar(novoPonto, pontoAnterior, velocidadeAnterior = 0) {
    const detalhes = {};

    // 1. Verificar se o ponto existe e tem coordenadas
    if (!novoPonto || !novoPonto.latitude || !novoPonto.longitude) {
      return { valido: false, motivo: "PONTO_INVALIDO", detalhes };
    }

    // 2. Verificar precisão do GPS
    const precisao = novoPonto.precisao || novoPonto.accuracy || 999;
    detalhes.precisao = precisao;

    if (precisao > this.config.MAX_PRECISAO_METROS) {
      return {
        valido: false,
        motivo: `PRECISAO_BAIXA_${Math.round(precisao)}m`,
        detalhes,
      };
    }

    // 3. Se não há ponto anterior, aceita como primeiro ponto
    if (!pontoAnterior) {
      return { valido: true, motivo: "PRIMEIRO_PONTO", detalhes };
    }

    // 4. Calcular distância
    const distancia = distanciaEntrePontos(novoPonto, pontoAnterior);
    detalhes.distancia = distancia;

    // 5. Calcular intervalo de tempo
    const agora = novoPonto.timestamp
      ? new Date(novoPonto.timestamp).getTime()
      : Date.now();
    const anterior = pontoAnterior.timestamp
      ? new Date(pontoAnterior.timestamp).getTime()
      : Date.now();
    const intervaloMs = agora - anterior;
    const intervaloSeg = intervaloMs / 1000;
    detalhes.intervaloMs = intervaloMs;

    // 6. Verificar intervalo mínimo
    if (intervaloMs < this.config.MIN_INTERVALO_MS) {
      return { valido: false, motivo: "INTERVALO_MUITO_CURTO", detalhes };
    }

    // 7. REMOVIDO: Verificação de deslocamento mínimo
    // O filtro de deslocamento é aplicado apenas ao TRAJETO, não ao marker
    // Isso permite atualização em tempo real do marker mesmo com pequenos movimentos

    detalhes.distanciaMinima = 0; // Sem mínimo para marker
    detalhes.precisaoIdeal = precisao <= this.config.PRECISAO_IDEAL_METROS;

    // 8. Verificar teleporte (deslocamento máximo) - só rejeita se MUITO grande
    if (distancia > this.config.MAX_DISTANCIA_METROS) {
      return {
        valido: false,
        motivo: `TELEPORTE_${distancia.toFixed(1)}m`,
        detalhes,
      };
    }

    // 9. Calcular velocidade
    const velocidade = intervaloSeg > 0 ? distancia / intervaloSeg : 0;
    detalhes.velocidade = velocidade;
    detalhes.velocidadeKmh = velocidade * 3.6;

    // 10. Verificação de velocidade SIMPLIFICADA para tempo real
    // Só rejeita velocidade impossível (> 72 km/h)
    if (velocidade > this.config.MAX_VELOCIDADE_EXTREMA_MS) {
      return {
        valido: false,
        motivo: `TELEPORTE_${(velocidade * 3.6).toFixed(1)}kmh`,
        detalhes,
      };
    }

    // REMOVIDO: Verificação de velocidade mínima - deixa passar tudo
    // REMOVIDO: Verificação de drift estático - causa rejeições desnecessárias

    // 11. Verificar aceleração (só rejeita se for absurda)
    if (velocidadeAnterior > 0 && intervaloSeg > 0) {
      const aceleracao =
        Math.abs(velocidade - velocidadeAnterior) / intervaloSeg;
      detalhes.aceleracao = aceleracao;

      if (aceleracao > this.config.MAX_ACELERACAO_MS2) {
        return {
          valido: false,
          motivo: `ACELERACAO_IMPOSSIVEL_${aceleracao.toFixed(2)}ms2`,
          detalhes,
        };
      }
    }

    // PONTO VÁLIDO
    return { valido: true, motivo: "OK", detalhes };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSE: MÉDIA MÓVEL DE COORDENADAS
// ═══════════════════════════════════════════════════════════════════════════════

export class MediaMovelCoordenadas {
  constructor(tamanhoJanela = FILTRO_CONFIG.TAMANHO_JANELA_MEDIA) {
    this.tamanhoJanela = tamanhoJanela;
    this.pontos = [];
    this.pesos = this.calcularPesos(tamanhoJanela);
  }

  /**
   * Calcula pesos para média ponderada (pontos mais recentes têm mais peso)
   */
  calcularPesos(tamanho) {
    const pesos = [];
    let soma = 0;
    for (let i = 1; i <= tamanho; i++) {
      pesos.push(i);
      soma += i;
    }
    return pesos.map((p) => p / soma);
  }

  /**
   * Adiciona ponto e retorna média
   */
  adicionar(ponto) {
    if (!ponto || !ponto.latitude || !ponto.longitude) {
      return this.obterMedia();
    }

    this.pontos.push({
      latitude: ponto.latitude,
      longitude: ponto.longitude,
      timestamp: ponto.timestamp || new Date().toISOString(),
    });

    // Mantém apenas os últimos N pontos
    if (this.pontos.length > this.tamanhoJanela) {
      this.pontos.shift();
    }

    return this.obterMedia();
  }

  /**
   * Calcula média ponderada dos pontos
   */
  obterMedia() {
    if (this.pontos.length === 0) return null;

    // Se tem poucos pontos, retorna a média simples
    if (this.pontos.length < FILTRO_CONFIG.MIN_PONTOS_MEDIA) {
      const lat =
        this.pontos.reduce((s, p) => s + p.latitude, 0) / this.pontos.length;
      const lon =
        this.pontos.reduce((s, p) => s + p.longitude, 0) / this.pontos.length;
      return { latitude: lat, longitude: lon };
    }

    // Média ponderada (pontos mais recentes têm mais peso)
    let latSum = 0;
    let lonSum = 0;
    let pesoTotal = 0;

    const pesosAtuais = this.pesos.slice(-this.pontos.length);

    this.pontos.forEach((p, i) => {
      const peso = pesosAtuais[i] || 1 / this.pontos.length;
      latSum += p.latitude * peso;
      lonSum += p.longitude * peso;
      pesoTotal += peso;
    });

    return {
      latitude: latSum / pesoTotal,
      longitude: lonSum / pesoTotal,
    };
  }

  /**
   * Retorna último ponto adicionado
   */
  obterUltimo() {
    return this.pontos.length > 0 ? this.pontos[this.pontos.length - 1] : null;
  }

  /**
   * Reseta a média
   */
  resetar() {
    this.pontos = [];
  }

  /**
   * Retorna quantidade de pontos
   */
  quantidade() {
    return this.pontos.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSE: FILTRO GPS COMPLETO
// ═══════════════════════════════════════════════════════════════════════════════

export class FiltroGPSProfissional {
  constructor(config = {}) {
    this.config = { ...FILTRO_CONFIG, ...config };
    this.validador = new ValidadorPontoGPS(this.config);
    this.mediaMovel = new MediaMovelCoordenadas(
      this.config.TAMANHO_JANELA_MEDIA,
    );

    // Estado
    this.ultimoPontoValido = null;
    this.ultimaVelocidade = 0;
    this.pontosRejeitados = 0;
    this.pontosAceitos = 0;
    this.direcaoAnterior = null;

    // Logs
    this.logs = [];
  }

  /**
   * Processa novo ponto do GPS
   * @param {Object} pontoGPS - Ponto bruto do GPS
   * @returns {Object} { aceito, pontoFiltrado, pontoMedia, motivo, detalhes }
   */
  processar(pontoGPS) {
    const timestamp = new Date().toISOString();

    // 1. Validar ponto
    const validacao = this.validador.validar(
      pontoGPS,
      this.ultimoPontoValido,
      this.ultimaVelocidade,
    );

    // Log
    this.logs.push({
      timestamp,
      aceito: validacao.valido,
      motivo: validacao.motivo,
      detalhes: validacao.detalhes,
    });

    // Manter apenas últimos 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }

    // 2. Se rejeitado, retorna
    if (!validacao.valido) {
      this.pontosRejeitados++;

      // Após muitas rejeições consecutivas, aceita para evitar "travar"
      if (this.pontosRejeitados >= 10 && pontoGPS) {
        console.log("⚠️ GPS: Forçando aceite após 10 rejeições");
        this.pontosRejeitados = 0;
        // Ainda assim não adiciona ao trajeto, apenas atualiza posição atual
        return {
          aceito: false,
          atualizarMarcador: true, // Atualiza marker mas não adiciona ao trajeto
          pontoFiltrado: pontoGPS,
          pontoMedia: this.mediaMovel.obterMedia(),
          motivo: "FORCADO_MARKER_APENAS",
          detalhes: validacao.detalhes,
        };
      }

      return {
        aceito: false,
        atualizarMarcador: false,
        pontoFiltrado: null,
        pontoMedia: this.mediaMovel.obterMedia(),
        motivo: validacao.motivo,
        detalhes: validacao.detalhes,
      };
    }

    // 3. Ponto aceito - adiciona à média móvel
    const pontoMedia = this.mediaMovel.adicionar(pontoGPS);

    // 4. Atualiza estado
    this.ultimaVelocidade = validacao.detalhes.velocidade || 0;
    this.ultimoPontoValido = { ...pontoGPS };
    this.pontosAceitos++;
    this.pontosRejeitados = 0;

    // 5. Calcular direção
    if (this.direcaoAnterior !== null && this.ultimoPontoValido) {
      const novaDirecao = calcularDirecao(this.ultimoPontoValido, pontoGPS);
      this.direcaoAnterior = novaDirecao;
    } else if (this.ultimoPontoValido) {
      this.direcaoAnterior = calcularDirecao(this.ultimoPontoValido, pontoGPS);
    }

    return {
      aceito: true,
      atualizarMarcador: true,
      pontoFiltrado: pontoGPS,
      pontoMedia,
      motivo: validacao.motivo,
      detalhes: validacao.detalhes,
    };
  }

  /**
   * Retorna estatísticas
   */
  estatisticas() {
    const total = this.pontosAceitos + this.pontosRejeitados;
    return {
      aceitos: this.pontosAceitos,
      rejeitados: this.pontosRejeitados,
      total,
      taxaAceitacao: total > 0 ? (this.pontosAceitos / total) * 100 : 0,
      pontosNaMedia: this.mediaMovel.quantidade(),
    };
  }

  /**
   * Retorna últimos logs
   */
  obterLogs(quantidade = 10) {
    return this.logs.slice(-quantidade);
  }

  /**
   * Reseta o filtro
   */
  resetar() {
    this.mediaMovel.resetar();
    this.ultimoPontoValido = null;
    this.ultimaVelocidade = 0;
    this.pontosRejeitados = 0;
    this.pontosAceitos = 0;
    this.direcaoAnterior = null;
    this.logs = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formata distância para exibição
 */
export function formatarDistancia(metros) {
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }
  return `${(metros / 1000).toFixed(2)} km`;
}

/**
 * Formata velocidade para exibição
 */
export function formatarVelocidade(ms) {
  const kmh = ms * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Formata tempo decorrido
 */
export function formatarTempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

export default FiltroGPSProfissional;
