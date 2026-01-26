/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Dados de Apoio para Visitantes
 * Gerencia dados auxiliares: empresas, setores, cores, tipos veículos, funções
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";
import { setCache, getCache } from "./cacheService";

// ═══════════════════════════════════════════════════════════════════════════════
// EMPRESAS VISITANTES (/empresas-visitantes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista todas as empresas de visitantes
 * GET /empresas-visitantes
 * @param {boolean} useCache - Usar cache se disponível
 */
async function listarEmpresas(useCache = true) {
  if (useCache) {
    const cached = getCache("empresasVisitantes");
    if (cached) {
      console.log("📦 [EMPRESAS] Usando cache");
      return cached;
    }
  }

  const response = await api.get("/empresas-visitantes");
  await setCache("empresasVisitantes", response.data);
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETORES VISITANTES (/setores-visitantes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista todos os setores para visitantes
 * GET /setores-visitantes
 * @param {boolean} useCache - Usar cache se disponível
 */
async function listarSetores(useCache = true) {
  if (useCache) {
    const cached = getCache("setoresVisitantes");
    if (cached) {
      console.log("📦 [SETORES] Usando cache");
      return cached;
    }
  }

  const response = await api.get("/setores-visitantes");
  await setCache("setoresVisitantes", response.data);
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORES DE VEÍCULOS (/cores-veiculos-visitantes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista todas as cores de veículos
 * GET /cores-veiculos-visitantes
 * @param {boolean} useCache - Usar cache se disponível
 */
async function listarCoresVeiculos(useCache = true) {
  if (useCache) {
    const cached = getCache("coresVeiculos");
    if (cached) {
      console.log("📦 [CORES] Usando cache");
      return cached;
    }
  }

  const response = await api.get("/cores-veiculos-visitantes");
  await setCache("coresVeiculos", response.data);
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE VEÍCULOS (/tipos-veiculos-visitantes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista todos os tipos de veículos
 * GET /tipos-veiculos-visitantes
 * @param {boolean} useCache - Usar cache se disponível
 */
async function listarTiposVeiculos(useCache = true) {
  if (useCache) {
    const cached = getCache("tiposVeiculos");
    if (cached) {
      console.log("📦 [TIPOS] Usando cache");
      return cached;
    }
  }

  const response = await api.get("/tipos-veiculos-visitantes");
  await setCache("tiposVeiculos", response.data);
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE VISITANTES (/funcoes-visitantes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista todas as funções de visitantes
 * GET /funcoes-visitantes
 * @param {boolean} useCache - Usar cache se disponível
 */
async function listarFuncoes(useCache = true) {
  if (useCache) {
    const cached = getCache("funcoesVisitantes");
    if (cached) {
      console.log("📦 [FUNÇÕES] Usando cache");
      return cached;
    }
  }

  const response = await api.get("/funcoes-visitantes");
  await setCache("funcoesVisitantes", response.data);
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSÁVEIS (/responsaveis)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista todos os responsáveis
 * GET /responsaveis
 * @param {boolean} useCache - Usar cache se disponível
 */
async function listarResponsaveis(useCache = true) {
  if (useCache) {
    const cached = getCache("responsaveis");
    if (cached) {
      console.log("📦 [RESPONSÁVEIS] Usando cache");
      return cached;
    }
  }

  const response = await api.get("/responsaveis");
  await setCache("responsaveis", response.data);
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARREGAMENTO EM LOTE (para usar no login)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Carrega todos os dados de apoio de uma vez
 * Ideal para chamar no login
 * @returns {object} Objeto com todos os dados carregados
 */
async function carregarTodosDados() {
  console.log("🔄 [DADOS APOIO] Carregando todos os dados...");

  try {
    const [empresas, setores, cores, tipos, funcoes] = await Promise.all([
      api.get("/empresas-visitantes"),
      api.get("/setores-visitantes"),
      api.get("/cores-veiculos-visitantes"),
      api.get("/tipos-veiculos-visitantes"),
      api.get("/funcoes-visitantes"),
    ]);

    // Salva no cache
    await setCache("empresasVisitantes", empresas.data);
    await setCache("setoresVisitantes", setores.data);
    await setCache("coresVeiculos", cores.data);
    await setCache("tiposVeiculos", tipos.data);
    await setCache("funcoesVisitantes", funcoes.data);

    console.log("✅ [DADOS APOIO] Todos os dados carregados com sucesso");
    console.log(`   📊 Empresas: ${empresas.data.length}`);
    console.log(`   📊 Setores: ${setores.data.length}`);
    console.log(`   📊 Cores: ${cores.data.length}`);
    console.log(`   📊 Tipos: ${tipos.data.length}`);
    console.log(`   📊 Funções: ${funcoes.data.length}`);

    return {
      empresas: empresas.data,
      setores: setores.data,
      cores: cores.data,
      tipos: tipos.data,
      funcoes: funcoes.data,
    };
  } catch (error) {
    console.error("❌ [DADOS APOIO] Erro ao carregar:", error);
    throw error;
  }
}

/**
 * Atualiza o cache de todos os dados (força atualização)
 */
async function atualizarCache() {
  return carregarTodosDados();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Empresas
  listarEmpresas,

  // Setores
  listarSetores,

  // Cores de veículos
  listarCoresVeiculos,

  // Tipos de veículos
  listarTiposVeiculos,

  // Funções
  listarFuncoes,

  // Responsáveis
  listarResponsaveis,

  // Utilitários
  carregarTodosDados,
  atualizarCache,
};
