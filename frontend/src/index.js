import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

// ═══════════════════════════════════════════════════════════════════════════
// NOTA: A proteção principal contra cache desatualizado está no index.html
// O script inline no HTML executa ANTES do React carregar, garantindo que
// erros de chunk sejam tratados mesmo se o bundle não carregar.
// ═══════════════════════════════════════════════════════════════════════════

// Limpa parâmetro de refresh da URL (estética)
if (
  window.location.search.includes("_refresh=") ||
  window.location.search.includes("_v=")
) {
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}

// Render da aplicação
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root"),
);
