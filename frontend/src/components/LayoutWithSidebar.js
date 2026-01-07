import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import SidebarMenu from "../components/SidebarMenu";
import "../styles/layout.css";

/**
 * LayoutWithSidebar - Componente wrapper que inclui a sidebar
 * Todos os componentes protegidos devem ser envolvidos por este layout
 */
export default function LayoutWithSidebar({
  children,
  unseenCount = 0,
  handleOpenConfigModal = () => {},
}) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="layout-loading">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="layout-container">
      <SidebarMenu
        unseenCount={unseenCount}
        handleOpenConfigModal={handleOpenConfigModal}
      />
      <main className="layout-main">{children}</main>
    </div>
  );
}
