/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UTILITÁRIOS: Geolocalização para Ronda por Pontos de Controle
 *
 * Funções de alta precisão para validação de presença em checkpoints
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/** Raio da Terra em metros */
const RAIO_TERRA_METROS = 6371000;

/** Raio padrão de validação de checkpoint (metros) */
export const RAIO_PADRAO_CHECKPOINT = 30;

/** Raio mínimo permitido (metros) */
export const RAIO_MINIMO_CHECKPOINT = 10;

/** Raio máximo permitido (metros) */
export const RAIO_MAXIMO_CHECKPOINT = 100;

/** Tempo mínimo entre validações de checkpoints (segundos) */
export const TEMPO_MINIMO_ENTRE_CHECKPOINTS = 30;

// ═══════════════════════════════════════════════════════════════════════════════
// FÓRMULA DE HAVERSINE
// Cálculo preciso de distância entre dois pontos na superfície da Terra
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Converte graus para radianos
 * @param {number} graus - Valor em graus
 * @returns {number} Valor em radianos
 */
export function grausParaRadianos(graus) {
  return (graus * Math.PI) / 180;
}

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * Alta precisão para distâncias curtas e longas
 *
 * @param {number} lat1 - Latitude do ponto 1 (graus decimais)
 * @param {number} lon1 - Longitude do ponto 1 (graus decimais)
 * @param {number} lat2 - Latitude do ponto 2 (graus decimais)
 * @param {number} lon2 - Longitude do ponto 2 (graus decimais)
 * @returns {number} Distância em metros
 *
 * @example
 * const distancia = calcularDistanciaHaversine(-23.5505, -46.6333, -23.5510, -46.6340);
 * console.log(distancia); // ~87 metros
 */
export function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  // Validação de entrada
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return Infinity;
  }

  // Converte para números
  const latitude1 = parseFloat(lat1);
  const longitude1 = parseFloat(lon1);
  const latitude2 = parseFloat(lat2);
  const longitude2 = parseFloat(lon2);

  // Validação de valores
  if (
    isNaN(latitude1) ||
    isNaN(longitude1) ||
    isNaN(latitude2) ||
    isNaN(longitude2)
  ) {
    return Infinity;
  }

  // Converte para radianos
  const lat1Rad = grausParaRadianos(latitude1);
  const lat2Rad = grausParaRadianos(latitude2);
  const deltaLat = grausParaRadianos(latitude2 - latitude1);
  const deltaLon = grausParaRadianos(longitude2 - longitude1);

  // Fórmula de Haversine
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distância em metros
  return RAIO_TERRA_METROS * c;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE CHECKPOINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resultado da validação de proximidade de um checkpoint
 * @typedef {Object} ResultadoValidacaoCheckpoint
 * @property {boolean} dentroDoRaio - Se está dentro do raio permitido
 * @property {number} distancia - Distância em metros até o checkpoint
 * @property {number} raio - Raio do checkpoint em metros
 * @property {number} diferencaRaio - Diferença entre distância e raio (negativo = dentro)
 * @property {string} mensagem - Mensagem descritiva
 */

/**
 * Valida se a posição atual está dentro do raio de um checkpoint
 *
 * @param {Object} posicaoAtual - Posição atual do vigilante
 * @param {number} posicaoAtual.latitude - Latitude atual
 * @param {number} posicaoAtual.longitude - Longitude atual
 * @param {Object} checkpoint - Checkpoint a validar
 * @param {number} checkpoint.latitude - Latitude do checkpoint
 * @param {number} checkpoint.longitude - Longitude do checkpoint
 * @param {number} [checkpoint.raio=30] - Raio de validação em metros
 * @returns {ResultadoValidacaoCheckpoint} Resultado da validação
 *
 * @example
 * const resultado = validarProximidadeCheckpoint(
 *   { latitude: -23.5505, longitude: -46.6333 },
 *   { latitude: -23.5506, longitude: -46.6334, raio: 30 }
 * );
 * if (resultado.dentroDoRaio) {
 *   console.log('Checkpoint validado!');
 * }
 */
export function validarProximidadeCheckpoint(posicaoAtual, checkpoint) {
  // Validações
  if (!posicaoAtual || !checkpoint) {
    return {
      dentroDoRaio: false,
      distancia: Infinity,
      raio: 0,
      diferencaRaio: Infinity,
      mensagem: "Dados de posição ou checkpoint inválidos",
    };
  }

  const raio = checkpoint.raio || RAIO_PADRAO_CHECKPOINT;

  // Calcula distância
  const distancia = calcularDistanciaHaversine(
    posicaoAtual.latitude,
    posicaoAtual.longitude,
    checkpoint.latitude,
    checkpoint.longitude,
  );

  const dentroDoRaio = distancia <= raio;
  const diferencaRaio = distancia - raio;

  let mensagem;
  if (dentroDoRaio) {
    mensagem = `Dentro do checkpoint (${Math.round(distancia)}m de ${raio}m)`;
  } else {
    mensagem = `Fora do checkpoint - aproxime-se mais ${Math.round(diferencaRaio)}m`;
  }

  return {
    dentroDoRaio,
    distancia: Math.round(distancia * 100) / 100, // 2 casas decimais
    raio,
    diferencaRaio: Math.round(diferencaRaio * 100) / 100,
    mensagem,
  };
}

/**
 * Encontra o checkpoint mais próximo de uma lista
 *
 * @param {Object} posicaoAtual - Posição atual do vigilante
 * @param {Array<Object>} checkpoints - Lista de checkpoints
 * @param {Object} [opcoes] - Opções de filtro
 * @param {boolean} [opcoes.apenasNaoVisitados=false] - Filtrar apenas não visitados
 * @param {Set<number>} [opcoes.visitados] - Set de IDs já visitados
 * @returns {Object|null} Checkpoint mais próximo com distância, ou null
 *
 * @example
 * const maisProximo = encontrarCheckpointMaisProximo(posicao, checkpoints, {
 *   apenasNaoVisitados: true,
 *   visitados: new Set([1, 2])
 * });
 */
export function encontrarCheckpointMaisProximo(
  posicaoAtual,
  checkpoints,
  opcoes = {},
) {
  if (!posicaoAtual || !checkpoints || checkpoints.length === 0) {
    return null;
  }

  const { apenasNaoVisitados = false, visitados = new Set() } = opcoes;

  let checkpointMaisProximo = null;
  let menorDistancia = Infinity;

  for (const checkpoint of checkpoints) {
    // Pular se filtro ativo e checkpoint já visitado
    if (apenasNaoVisitados && visitados.has(checkpoint.id)) {
      continue;
    }

    const distancia = calcularDistanciaHaversine(
      posicaoAtual.latitude,
      posicaoAtual.longitude,
      checkpoint.latitude,
      checkpoint.longitude,
    );

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      checkpointMaisProximo = {
        ...checkpoint,
        distancia: Math.round(distancia * 100) / 100,
      };
    }
  }

  return checkpointMaisProximo;
}

/**
 * Filtra checkpoints que estão dentro do raio de proximidade
 *
 * @param {Object} posicaoAtual - Posição atual
 * @param {Array<Object>} checkpoints - Lista de checkpoints
 * @param {Set<number>} [visitados] - IDs já visitados (serão excluídos)
 * @returns {Array<Object>} Checkpoints dentro do raio com informações de validação
 */
export function filtrarCheckpointsDentroDoRaio(
  posicaoAtual,
  checkpoints,
  visitados = new Set(),
) {
  if (!posicaoAtual || !checkpoints) {
    return [];
  }

  return checkpoints
    .filter((cp) => !visitados.has(cp.id))
    .map((cp) => {
      const validacao = validarProximidadeCheckpoint(posicaoAtual, cp);
      return {
        ...cp,
        ...validacao,
      };
    })
    .filter((cp) => cp.dentroDoRaio)
    .sort((a, b) => a.distancia - b.distancia);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO ANTIFRAUDE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valida tempo mínimo entre checkpoints (antifraude)
 *
 * @param {Date|string} ultimaValidacao - Data/hora da última validação
 * @param {number} [tempoMinimoSegundos=30] - Tempo mínimo em segundos
 * @returns {Object} Resultado da validação de tempo
 */
export function validarTempoMinimo(
  ultimaValidacao,
  tempoMinimoSegundos = TEMPO_MINIMO_ENTRE_CHECKPOINTS,
) {
  if (!ultimaValidacao) {
    return { valido: true, tempoDecorrido: Infinity, tempoRestante: 0 };
  }

  const agora = Date.now();
  const ultimaData = new Date(ultimaValidacao).getTime();
  const tempoDecorrido = Math.floor((agora - ultimaData) / 1000);
  const tempoRestante = Math.max(0, tempoMinimoSegundos - tempoDecorrido);

  return {
    valido: tempoDecorrido >= tempoMinimoSegundos,
    tempoDecorrido,
    tempoRestante,
    mensagem:
      tempoRestante > 0
        ? `Aguarde ${tempoRestante}s para próximo checkpoint`
        : "Tempo mínimo atingido",
  };
}

/**
 * Validação completa de checkpoint (proximidade + antifraude)
 *
 * @param {Object} posicaoAtual - Posição atual do vigilante
 * @param {Object} checkpoint - Checkpoint a validar
 * @param {Object} [contexto] - Contexto adicional para validação
 * @param {Date} [contexto.ultimaValidacao] - Data da última validação
 * @param {Set<number>} [contexto.visitados] - IDs já visitados
 * @returns {Object} Resultado completo da validação
 */
export function validarCheckpointCompleto(
  posicaoAtual,
  checkpoint,
  contexto = {},
) {
  const { ultimaValidacao, visitados = new Set() } = contexto;

  // Verifica se já foi visitado
  if (visitados.has(checkpoint.id)) {
    return {
      valido: false,
      motivo: "CHECKPOINT_JA_VISITADO",
      mensagem: "Este checkpoint já foi validado nesta ronda",
    };
  }

  // Valida proximidade
  const validacaoProximidade = validarProximidadeCheckpoint(
    posicaoAtual,
    checkpoint,
  );
  if (!validacaoProximidade.dentroDoRaio) {
    return {
      valido: false,
      motivo: "FORA_DO_RAIO",
      mensagem: validacaoProximidade.mensagem,
      distancia: validacaoProximidade.distancia,
      raio: validacaoProximidade.raio,
    };
  }

  // Valida tempo mínimo (antifraude)
  const validacaoTempo = validarTempoMinimo(ultimaValidacao);
  if (!validacaoTempo.valido) {
    return {
      valido: false,
      motivo: "TEMPO_MINIMO",
      mensagem: validacaoTempo.mensagem,
      tempoRestante: validacaoTempo.tempoRestante,
    };
  }

  // Tudo válido
  return {
    valido: true,
    motivo: "OK",
    mensagem: "Checkpoint validado com sucesso",
    distancia: validacaoProximidade.distancia,
    raio: validacaoProximidade.raio,
    tempoDecorrido: validacaoTempo.tempoDecorrido,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATADORES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formata distância para exibição
 * @param {number} metros - Distância em metros
 * @returns {string} Distância formatada (ex: "150m" ou "1.5km")
 */
export function formatarDistancia(metros) {
  if (metros == null || isNaN(metros)) return "--";

  if (metros < 1000) {
    return `${Math.round(metros)}m`;
  }

  return `${(metros / 1000).toFixed(1)}km`;
}

/**
 * Formata tempo para exibição
 * @param {number} segundos - Tempo em segundos
 * @returns {string} Tempo formatado (ex: "1h 30min" ou "45s")
 */
export function formatarTempo(segundos) {
  if (segundos == null || isNaN(segundos)) return "--";

  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = Math.floor(segundos % 60);

  if (horas > 0) {
    return `${horas}h ${minutos}min`;
  }
  if (minutos > 0) {
    return `${minutos}min ${segs}s`;
  }
  return `${segs}s`;
}

export default {
  calcularDistanciaHaversine,
  validarProximidadeCheckpoint,
  encontrarCheckpointMaisProximo,
  filtrarCheckpointsDentroDoRaio,
  validarTempoMinimo,
  validarCheckpointCompleto,
  formatarDistancia,
  formatarTempo,
  RAIO_PADRAO_CHECKPOINT,
  RAIO_MINIMO_CHECKPOINT,
  RAIO_MAXIMO_CHECKPOINT,
  TEMPO_MINIMO_ENTRE_CHECKPOINTS,
};
