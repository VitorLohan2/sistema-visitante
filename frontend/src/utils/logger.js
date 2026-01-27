/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOGGER - Utilitário de logging controlado por ambiente
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Comportamento:
 * - PRODUÇÃO: Nenhum log (tudo desativado por segurança)
 * - DESENVOLVIMENTO: Apenas erros por padrão
 * - DEBUG MODE: Todos os logs (ativar com localStorage.setItem('debug', 'true'))
 *
 * O ambiente é detectado automaticamente:
 * - Se REACT_APP_ENV=production → produção
 * - Se NODE_ENV=production → produção
 * - Se hostname não é localhost/127.0.0.1 → produção
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Detecta se está em produção
const isProduction = (() => {
  // Verifica variáveis de ambiente
  if (process.env.REACT_APP_ENV === "production") return true;
  if (process.env.NODE_ENV === "production") return true;

  // Verifica hostname (client-side)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Localhost e IPs locais são desenvolvimento
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.")
    ) {
      return false;
    }
    // Qualquer outro hostname é produção
    return true;
  }

  return false;
})();

// Debug só é ativado explicitamente via localStorage
const isDebug = (() => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("debug") === "true";
  }
  return false;
})();

// Função vazia para produção
const noop = () => {};

const logger = {
  // Logs informativos - só aparecem em debug mode (desenvolvimento)
  log: isProduction || !isDebug ? noop : console.log.bind(console),
  info: isProduction || !isDebug ? noop : console.info.bind(console),
  debug: isProduction || !isDebug ? noop : console.debug.bind(console),

  // Warnings - aparecem em desenvolvimento (não em produção)
  warn: isProduction ? noop : console.warn.bind(console),

  // Erros - SEMPRE aparecem em desenvolvimento, nunca em produção
  error: isProduction ? noop : console.error.bind(console),

  // Utilitários - só em debug mode
  table: isProduction || !isDebug ? noop : console.table.bind(console),
  group: isProduction || !isDebug ? noop : console.group.bind(console),
  groupEnd: isProduction || !isDebug ? noop : console.groupEnd.bind(console),
  time: isProduction || !isDebug ? noop : console.time.bind(console),
  timeEnd: isProduction || !isDebug ? noop : console.timeEnd.bind(console),

  // Helper para ativar/desativar debug
  enableDebug: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("debug", "true");
      console.log("🔧 Debug mode ATIVADO. Recarregue a página.");
    }
  },
  disableDebug: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("debug");
      console.log("🔧 Debug mode DESATIVADO. Recarregue a página.");
    }
  },

  // Info sobre ambiente atual
  getEnvironment: () => ({
    isProduction,
    isDebug,
    hostname:
      typeof window !== "undefined" ? window.location.hostname : "server",
  }),
};

export default logger;
