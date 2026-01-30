/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VERSION SERVICE - Sistema de Controle de Versão e Atualização Automática
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este serviço resolve o problema de usuários logados ficarem em loop
 * após uma atualização do sistema em produção.
 *
 * COMO FUNCIONA:
 * 1. A cada build, o arquivo version.json é atualizado com timestamp único
 * 2. O frontend verifica periodicamente se há nova versão
 * 3. Se detectar versão nova, força um reload limpo (sem cache)
 * 4. Evita loops verificando se já tentou recarregar recentemente
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import logger from "../utils/logger";

// Chaves do localStorage para controle
const VERSION_KEY = "app_version";
const BUILD_TIME_KEY = "app_build_time";
const LAST_RELOAD_KEY = "app_last_reload";
const RELOAD_COOLDOWN = 60000; // 1 minuto de cooldown entre reloads

// Intervalo de verificação de versão (em ms)
const CHECK_INTERVAL = 30000; // 30 segundos

let checkIntervalId = null;

/**
 * Obtém a versão atual do servidor
 * @returns {Promise<{version: string, buildTime: string} | null>}
 */
async function fetchServerVersion() {
  try {
    // Adiciona timestamp para evitar cache
    const timestamp = Date.now();
    const response = await fetch(`/version.json?t=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    if (!response.ok) {
      logger.warn("Não foi possível obter version.json:", response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Erro ao buscar versão do servidor:", error);
    return null;
  }
}

/**
 * Obtém a versão armazenada localmente
 * @returns {{version: string, buildTime: string} | null}
 */
function getLocalVersion() {
  const version = localStorage.getItem(VERSION_KEY);
  const buildTime = localStorage.getItem(BUILD_TIME_KEY);

  if (version && buildTime) {
    return { version, buildTime };
  }

  return null;
}

/**
 * Salva a versão localmente
 * @param {string} version
 * @param {string} buildTime
 */
function saveLocalVersion(version, buildTime) {
  localStorage.setItem(VERSION_KEY, version);
  localStorage.setItem(BUILD_TIME_KEY, buildTime);
}

/**
 * Verifica se pode fazer reload (cooldown para evitar loops)
 * @returns {boolean}
 */
function canReload() {
  const lastReload = localStorage.getItem(LAST_RELOAD_KEY);

  if (!lastReload) {
    return true;
  }

  const timeSinceLastReload = Date.now() - parseInt(lastReload, 10);
  return timeSinceLastReload > RELOAD_COOLDOWN;
}

/**
 * Registra o momento do reload
 */
function markReload() {
  localStorage.setItem(LAST_RELOAD_KEY, Date.now().toString());
}

/**
 * Limpa todo o cache do navegador e faz reload FORÇADO
 * Usa técnica de redirecionamento com cache-busting para garantir
 * que o navegador baixe todos os arquivos novamente
 */
async function clearCacheAndReload() {
  logger.log("🔄 Nova versão detectada! Limpando cache e recarregando...");

  // Marca o reload para evitar loops
  markReload();

  try {
    // 1. Limpa o cache do Service Worker se existir
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        logger.log("Service Worker desregistrado");
      }
    }

    // 2. Limpa TODOS os caches da Cache API
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          logger.log("Deletando cache:", cacheName);
          return caches.delete(cacheName);
        }),
      );
    }

    // 3. Limpa sessionStorage (dados de cache da aplicação)
    sessionStorage.clear();

    // 4. Técnica de HARD RELOAD real:
    // Redireciona para a mesma URL com um parâmetro único
    // Isso força o navegador a buscar tudo do servidor
    const timestamp = Date.now();
    const currentUrl = window.location.href.split("?")[0].split("#")[0];
    const separator = currentUrl.includes("?") ? "&" : "?";
    const newUrl = `${currentUrl}${separator}_v=${timestamp}`;

    logger.log("Redirecionando para:", newUrl);

    // Substitui a entrada no histórico para evitar botão "voltar" quebrado
    window.location.replace(newUrl);
  } catch (error) {
    logger.error("Erro ao limpar cache:", error);
    // Fallback: tenta reload normal
    window.location.href =
      window.location.href.split("?")[0] + "?_reload=" + Date.now();
  }
}

/**
 * Verifica se há uma nova versão disponível
 * @returns {Promise<boolean>} - true se há nova versão
 */
async function checkForUpdates() {
  const serverVersion = await fetchServerVersion();

  if (!serverVersion) {
    return false;
  }

  const localVersion = getLocalVersion();

  // Primeira vez acessando - salva a versão atual
  if (!localVersion) {
    logger.log("📦 Primeira execução, salvando versão:", serverVersion.version);
    saveLocalVersion(serverVersion.version, serverVersion.buildTime);
    return false;
  }

  // Compara pelo buildTime (mais confiável que version)
  const hasNewVersion = serverVersion.buildTime !== localVersion.buildTime;

  if (hasNewVersion) {
    logger.log("🆕 Nova versão detectada!");
    logger.log(
      "   Versão local:",
      localVersion.version,
      localVersion.buildTime,
    );
    logger.log(
      "   Versão servidor:",
      serverVersion.version,
      serverVersion.buildTime,
    );

    // Atualiza a versão local antes do reload
    saveLocalVersion(serverVersion.version, serverVersion.buildTime);
    return true;
  }

  return false;
}

/**
 * Inicializa o sistema de verificação de versão
 * Deve ser chamado quando o App é montado
 */
export async function initVersionCheck() {
  logger.log("🔍 Iniciando verificação de versão...");

  // Verifica imediatamente
  const hasUpdate = await checkForUpdates();

  if (hasUpdate && canReload()) {
    await clearCacheAndReload();
    return; // Não continua, vai recarregar
  }

  // Inicia verificação periódica
  if (!checkIntervalId) {
    checkIntervalId = setInterval(async () => {
      const hasUpdate = await checkForUpdates();

      if (hasUpdate && canReload()) {
        await clearCacheAndReload();
      }
    }, CHECK_INTERVAL);

    logger.log(
      `✅ Verificação de versão ativa (a cada ${CHECK_INTERVAL / 1000}s)`,
    );
  }
}

/**
 * Para a verificação periódica de versão
 */
export function stopVersionCheck() {
  if (checkIntervalId) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
    logger.log("⏹️ Verificação de versão parada");
  }
}

/**
 * Força verificação imediata de atualização
 * Útil para chamar manualmente ou após erro
 */
export async function forceUpdateCheck() {
  logger.log("🔄 Forçando verificação de atualização...");

  const hasUpdate = await checkForUpdates();

  if (hasUpdate && canReload()) {
    await clearCacheAndReload();
    return true;
  }

  return false;
}

/**
 * Obtém informações da versão atual
 * @returns {{local: object, intervalActive: boolean}}
 */
export function getVersionInfo() {
  return {
    local: getLocalVersion(),
    intervalActive: checkIntervalId !== null,
  };
}

export default {
  initVersionCheck,
  stopVersionCheck,
  forceUpdateCheck,
  getVersionInfo,
};
