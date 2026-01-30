import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

// ═══════════════════════════════════════════════════════════════════════════
// TRATAMENTO DE ERROS DE CHUNK LOADING (VERSÃO ANTIGA EM CACHE)
// ═══════════════════════════════════════════════════════════════════════════
// Quando o usuário tem uma versão antiga em cache e tenta carregar chunks
// que não existem mais (após atualização), força um HARD RELOAD

const CHUNK_ERROR_KEY = "chunk_error_reload";
const CHUNK_ERROR_COOLDOWN = 30000; // 30 segundos

/**
 * Verifica se pode fazer reload (evita loop infinito)
 */
function canReloadForChunkError() {
  const lastReload = localStorage.getItem(CHUNK_ERROR_KEY);
  if (!lastReload) return true;

  const timeSince = Date.now() - parseInt(lastReload, 10);
  return timeSince > CHUNK_ERROR_COOLDOWN;
}

/**
 * Força um HARD RELOAD real, limpando cache
 */
async function forceHardReload(reason) {
  console.warn(`🔄 ${reason} - Forçando reload limpo...`);

  // Marca para evitar loop
  localStorage.setItem(CHUNK_ERROR_KEY, Date.now().toString());

  try {
    // Limpa Service Workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    // Limpa Cache API
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    // Limpa sessionStorage
    sessionStorage.clear();
  } catch (e) {
    console.error("Erro ao limpar cache:", e);
  }

  // HARD RELOAD: redireciona com timestamp para forçar buscar do servidor
  const baseUrl = window.location.origin + window.location.pathname;
  const newUrl = `${baseUrl}?_refresh=${Date.now()}`;
  window.location.replace(newUrl);
}

/**
 * Verifica se é erro de chunk
 */
function isChunkError(message) {
  if (!message) return false;
  const patterns = [
    "Loading chunk",
    "ChunkLoadError",
    "Loading CSS chunk",
    "Failed to fetch dynamically imported module",
    "Unexpected token",
    "SyntaxError",
    "Cannot find module",
  ];
  return patterns.some((pattern) => message.includes(pattern));
}

// Captura erros globais
window.addEventListener("error", (event) => {
  if (isChunkError(event.message) && canReloadForChunkError()) {
    event.preventDefault();
    forceHardReload("Erro de chunk detectado");
  }
});

// Captura promessas rejeitadas não tratadas
window.addEventListener("unhandledrejection", (event) => {
  const message = event.reason?.message || event.reason?.toString() || "";
  if (isChunkError(message) && canReloadForChunkError()) {
    event.preventDefault();
    forceHardReload("Erro de chunk não tratado");
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LIMPA PARÂMETRO DE REFRESH DA URL (estética)
// ═══════════════════════════════════════════════════════════════════════════
// Remove o ?_refresh=xxx da URL sem recarregar a página
if (
  window.location.search.includes("_refresh=") ||
  window.location.search.includes("_v=")
) {
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER DA APLICAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root"),
);
