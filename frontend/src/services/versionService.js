/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VERSION SERVICE v2 - Sistema de Controle de Versão e Atualização
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ARQUITETURA DE PROTEÇÃO EM 2 CAMADAS:
 *
 * CAMADA 1 (index.html - Script Inline):
 * - Executa ANTES do React carregar
 * - Detecta erros de chunk/sintaxe (código antigo incompatível)
 * - Força reload imediato se versão diferente
 * - Protege contra loops com cooldown de 30s
 *
 * CAMADA 2 (Este serviço - React):
 * - Executa DEPOIS do React carregar
 * - Verifica versão periodicamente (a cada 60s)
 * - Mostra notificação amigável ao usuário
 * - Usuário decide quando atualizar
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import logger from "../utils/logger";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES - DEVEM SER IGUAIS AO SCRIPT DO index.html!
// ═══════════════════════════════════════════════════════════════════════════

// Chaves do localStorage (sincronizadas com index.html)
const VERSION_KEY = "app_version";
const BUILD_TIME_KEY = "app_build_time";
const BUILD_NUMBER_KEY = "app_build_number"; // Mesma chave do index.html
const UPDATE_DISMISSED_KEY = "app_update_dismissed";
const RELOAD_KEY = "app_force_reload"; // Mesma chave do index.html

// Intervalo de verificação (em ms)
const CHECK_INTERVAL = 60000; // 1 minuto

// Tempo para mostrar notificação novamente após dismissar
const DISMISS_COOLDOWN = 300000; // 5 minutos

// Cooldown de reload (deve ser igual ao index.html)
const RELOAD_COOLDOWN = 30000; // 30 segundos

let checkIntervalId = null;
let updateCallbacks = [];

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES PRIVADAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtém a versão atual do servidor (arquivo estático)
 * @returns {Promise<{version: string, buildTime: string, buildNumber: number} | null>}
 */
async function fetchServerVersion() {
  try {
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
      logger.warn(
        "[Version] Não foi possível obter version.json:",
        response.status,
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("[Version] Erro ao buscar versão do servidor:", error);
    return null;
  }
}

/**
 * Obtém a versão armazenada localmente
 * @returns {{version: string, buildTime: string, buildNumber: number} | null}
 */
function getLocalVersion() {
  try {
    const version = localStorage.getItem(VERSION_KEY);
    const buildTime = localStorage.getItem(BUILD_TIME_KEY);
    const buildNumber = localStorage.getItem(BUILD_NUMBER_KEY);

    if (version && buildTime && buildNumber) {
      return {
        version,
        buildTime,
        buildNumber: parseInt(buildNumber, 10),
      };
    }
    return null;
  } catch (error) {
    logger.error("[Version] Erro ao ler versão local:", error);
    return null;
  }
}

/**
 * Salva a versão localmente
 */
function saveLocalVersion(version, buildTime, buildNumber) {
  try {
    localStorage.setItem(VERSION_KEY, version);
    localStorage.setItem(BUILD_TIME_KEY, buildTime);
    localStorage.setItem(BUILD_NUMBER_KEY, buildNumber.toString());
    logger.log("[Version] Versão salva localmente:", version, buildTime);
  } catch (error) {
    logger.error("[Version] Erro ao salvar versão local:", error);
  }
}

/**
 * Verifica se a notificação foi dismissada recentemente
 */
function wasRecentlyDismissed() {
  try {
    const dismissed = localStorage.getItem(UPDATE_DISMISSED_KEY);
    if (!dismissed) return false;

    const timeSince = Date.now() - parseInt(dismissed, 10);
    return timeSince < DISMISS_COOLDOWN;
  } catch {
    return false;
  }
}

/**
 * Marca a notificação como dismissada
 */
function markDismissed() {
  localStorage.setItem(UPDATE_DISMISSED_KEY, Date.now().toString());
}

/**
 * Limpa o flag de dismiss
 */
function clearDismissed() {
  localStorage.removeItem(UPDATE_DISMISSED_KEY);
}

/**
 * Notifica todos os listeners sobre atualização disponível
 */
function notifyUpdateAvailable(serverVersion) {
  logger.log("[Version] Notificando sobre atualização:", serverVersion.version);
  updateCallbacks.forEach((callback) => {
    try {
      callback({
        type: "update-available",
        version: serverVersion.version,
        buildTime: serverVersion.buildTime,
        buildNumber: serverVersion.buildNumber,
      });
    } catch (error) {
      logger.error("[Version] Erro no callback de atualização:", error);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES PÚBLICAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registra um callback para ser notificado sobre atualizações
 * @param {Function} callback - Função a ser chamada com { type, version, buildTime }
 * @returns {Function} - Função para remover o listener
 */
export function onUpdateAvailable(callback) {
  updateCallbacks.push(callback);

  // Retorna função para remover o listener
  return () => {
    updateCallbacks = updateCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * Verifica se há uma nova versão disponível
 * @param {boolean} forceNotify - Se true, notifica mesmo se já foi dismissada
 * @returns {Promise<{hasUpdate: boolean, version?: string}>}
 */
export async function checkForUpdates(forceNotify = false) {
  const serverVersion = await fetchServerVersion();

  if (!serverVersion) {
    return { hasUpdate: false };
  }

  const localVersion = getLocalVersion();

  // Primeira vez acessando - salva a versão atual
  if (!localVersion) {
    logger.log(
      "[Version] Primeira execução, salvando versão:",
      serverVersion.version,
    );
    saveLocalVersion(
      serverVersion.version,
      serverVersion.buildTime,
      serverVersion.buildNumber,
    );
    return { hasUpdate: false };
  }

  // Compara pelo buildNumber (mais confiável)
  const hasUpdate = serverVersion.buildNumber !== localVersion.buildNumber;

  if (hasUpdate) {
    logger.log("[Version] 🆕 Nova versão detectada!");
    logger.log(
      "[Version]   Local:",
      localVersion.version,
      `(build: ${localVersion.buildNumber})`,
    );
    logger.log(
      "[Version]   Servidor:",
      serverVersion.version,
      `(build: ${serverVersion.buildNumber})`,
    );

    // Só notifica se não foi dismissada recentemente (ou se forçado)
    if (forceNotify || !wasRecentlyDismissed()) {
      notifyUpdateAvailable(serverVersion);
    }

    return {
      hasUpdate: true,
      version: serverVersion.version,
      buildTime: serverVersion.buildTime,
    };
  }

  return { hasUpdate: false };
}

/**
 * Dismissar a notificação de atualização temporariamente
 */
export function dismissUpdate() {
  logger.log("[Version] Atualização dismissada pelo usuário");
  markDismissed();
}

/**
 * Limpa todo o cache e força reload COMPLETO
 * Deve ser chamada quando o usuário clica em "Atualizar"
 *
 * CORREÇÃO: Agora usa o cache versionado. Quando o app recarrega com a nova
 * versão, o validateCacheVersion() limpa automaticamente chaves antigas.
 * Isso evita loops: o performUpdate salva a nova versão ANTES do reload,
 * então na próxima carga o app sabe que já está atualizado.
 */
export async function performUpdate() {
  logger.log("[Version] 🔄 Usuário solicitou atualização...");
  logger.log("[Version] 🧹 Iniciando limpeza completa de cache...");

  // Busca versão do servidor para salvar
  const serverVersion = await fetchServerVersion();

  try {
    // 1. Atualiza a versão local ANTES de limpar tudo
    //    Isso garante que na próxima carga, checkForUpdates() não detecta mudança
    //    e evita loops infinitos de reload.
    if (serverVersion) {
      saveLocalVersion(
        serverVersion.version,
        serverVersion.buildTime,
        serverVersion.buildNumber,
      );
      // Atualiza também a versão do cache para que o validateCacheVersion()
      // saiba que precisa limpar chaves antigas
      localStorage.setItem(
        "cache_version",
        serverVersion.buildNumber.toString(),
      );
    }

    // 2. Limpa flags de controle
    localStorage.removeItem(UPDATE_DISMISSED_KEY);
    localStorage.removeItem(RELOAD_KEY);

    // 3. Limpa TODOS os dados de cache (sessionStorage)
    sessionStorage.clear();

    // 4. Limpa caches específicos da aplicação no localStorage
    //    Preserva: autenticação (token/usuario) e versão do app
    const keysToKeep = [
      "token",
      "usuario",
      VERSION_KEY,
      BUILD_TIME_KEY,
      BUILD_NUMBER_KEY,
      "cache_version",
    ];

    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
        logger.log("[Version] Removido localStorage:", key);
      }
    });

    // 5. Limpa Service Workers (em background, não bloqueia)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }

    // 6. Limpa Cache API (em background, não bloqueia)
    if ("caches" in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }

    logger.log("[Version] ✅ Cache limpo! Fazendo hard reload...");

    // 7. HARD RELOAD — redireciona para HOME com cache-busting
    const homeUrl = window.location.origin + "/?_refresh=" + Date.now();

    setTimeout(() => {
      window.location.replace(homeUrl);
    }, 100);
  } catch (error) {
    logger.error("[Version] Erro ao limpar cache:", error);
    window.location.replace(
      window.location.origin + "/?_refresh=" + Date.now(),
    );
  }
}

/**
 * Inicializa o sistema de verificação de versão
 * Deve ser chamado quando o App é montado
 */
export function initVersionCheck() {
  logger.log("[Version] 🔍 Iniciando sistema de verificação de versão...");

  // Verifica imediatamente (silenciosamente na primeira vez)
  setTimeout(() => {
    checkForUpdates();
  }, 3000); // Aguarda 3 segundos para não atrapalhar carregamento inicial

  // Inicia verificação periódica
  if (!checkIntervalId) {
    checkIntervalId = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL);

    logger.log(
      `[Version] ✅ Verificação ativa (a cada ${CHECK_INTERVAL / 1000}s)`,
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
    logger.log("[Version] ⏹️ Verificação de versão parada");
  }
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

/**
 * Força verificação e notificação imediata
 * Ignora o cooldown de dismiss
 */
export async function forceUpdateCheck() {
  clearDismissed();
  return checkForUpdates(true);
}

export default {
  initVersionCheck,
  stopVersionCheck,
  checkForUpdates,
  forceUpdateCheck,
  performUpdate,
  dismissUpdate,
  onUpdateAvailable,
  getVersionInfo,
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE DEBUG (apenas em desenvolvimento)
// ═══════════════════════════════════════════════════════════════════════════

if (process.env.NODE_ENV === "development") {
  /**
   * Função de teste para simular notificação de atualização
   * Use no console: window.__testUpdate()
   */
  window.__testUpdate = function (version = "99.0.0") {
    logger.log(
      "[Version] 🧪 TESTE: Simulando atualização para versão",
      version,
    );
    notifyUpdateAvailable({
      version: version,
      buildTime: new Date().toISOString(),
      buildNumber: Date.now(),
    });
  };

  /**
   * Reseta completamente o estado de versão
   * Use no console: window.__resetVersion()
   */
  window.__resetVersion = function () {
    localStorage.removeItem(VERSION_KEY);
    localStorage.removeItem(BUILD_TIME_KEY);
    localStorage.removeItem(BUILD_NUMBER_KEY);
    localStorage.removeItem(UPDATE_DISMISSED_KEY);
    localStorage.removeItem(RELOAD_KEY);
    logger.log("[Version] 🧪 TESTE: Estado de versão resetado!");
    logger.log("[Version] 🧪 Recarregue a página para testar fresh install");
  };

  logger.log("[Version] 🧪 Funções de teste disponíveis:");
  logger.log("[Version]    window.__testUpdate('3.0.0') - Simula notificação");
  logger.log("[Version]    window.__resetVersion() - Reseta estado de versão");
}
