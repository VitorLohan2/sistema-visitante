/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇOS: Index
 * Exportação centralizada de todos os serviços
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export { default as api } from "./api";
export { default as authService } from "./authService";
export { default as permissoesService } from "./permissoesService";
export { default as visitantesService } from "./visitantesService";
export { default as rondaService } from "./rondaService";
export { default as agendamentosService } from "./agendamentosService";
export { default as ticketsService } from "./ticketsService";
export { default as dadosApoioService } from "./dadosApoioService";
export { default as cacheService } from "./cacheService";

// Exportações nomeadas do cacheService para uso direto
export {
  setCache,
  getCache,
  getCacheAsync,
  clearCache,
  isCacheLoaded,
  getCacheStats,
  restoreCache,
} from "./cacheService";
