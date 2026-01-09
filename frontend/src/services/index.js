/**
 * Exporta todos os services do sistema
 * Facilita importação: import { funcionarioService, visitanteService } from '../services';
 */

export { default as api } from "./api";
export { default as authService } from "./authService";
export { default as funcionarioService } from "./funcionarioService";
export { default as visitanteService } from "./visitanteService";
export { default as agendamentoService } from "./agendamentoService";
export { default as ticketService } from "./ticketService";
export { default as cacheService } from "./cacheService";
export * from "./cacheService";
export { default as socketService } from "./socketService";
export * from "./socketService";
