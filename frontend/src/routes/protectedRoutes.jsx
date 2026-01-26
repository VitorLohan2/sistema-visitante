// src/routes/ProtectedRoute.jsx
import React, { useState } from "react";
import { Route, Redirect } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { usePermissoes } from "../hooks/usePermissoes";
import { useTickets } from "../contexts/TicketContext";
import MenuDaBarraLateral from "../components/MenuDaBarraLateral";

import "../styles/layout.css";

/**
 * ProtectedRoute - Rota protegida com verificação de permissões
 *
 * @param {string|string[]} permissao - Permissão(ões) necessária(s) para acessar a rota
 * @param {boolean} adminOnly - Se true, apenas administradores podem acessar
 */
export default function ProtectedRoute({
  children,
  permissao,
  adminOnly = false,
  ...rest
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const { isAdmin, temPermissao, loading: loadingPermissoes } = usePermissoes();
  const { ticketsAbertos } = useTickets();

  // Verifica se o usuário tem permissão para acessar a rota
  const verificarPermissao = () => {
    // Admin tem acesso a tudo
    if (isAdmin) return true;

    // Se a rota é apenas para admin, nega acesso
    if (adminOnly) return false;

    // Se não há permissão definida, permite acesso (rota básica)
    if (!permissao) return true;

    // Se permissao é um array, verifica se tem pelo menos uma
    if (Array.isArray(permissao)) {
      return permissao.some((p) => temPermissao(p));
    }

    // Verifica permissão única
    return temPermissao(permissao);
  };

  if (loading || loadingPermissoes) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div>Verificando autenticação...</div>
        <div style={{ fontSize: "14px", color: "#666" }}>
          Aguarde um momento
        </div>
      </div>
    );
  }

  return (
    <Route
      {...rest}
      render={({ location }) => {
        // Não autenticado - redireciona para login
        if (!isAuthenticated) {
          return (
            <Redirect
              to={{
                pathname: "/",
                state: { from: location },
              }}
            />
          );
        }

        // Autenticado mas sem permissão - redireciona para página de acesso negado
        if (!verificarPermissao()) {
          return (
            <div className="layout-container">
              <MenuDaBarraLateral unseenCount={ticketsAbertos} />
              <main className="layout-main">
                <div className="acesso-negado">
                  <h1>🚫 Acesso Negado</h1>
                  <p>Você não tem permissão para acessar esta página.</p>
                  <p>
                    Entre em contato com o administrador para solicitar acesso.
                  </p>
                  <button onClick={() => window.history.back()}>Voltar</button>
                </div>
              </main>
            </div>
          );
        }

        // Autenticado e com permissão - renderiza a página
        return (
          <div className="layout-container">
            <MenuDaBarraLateral unseenCount={ticketsAbertos} />
            <main className="layout-main">{children}</main>
          </div>
        );
      }}
    />
  );
}
