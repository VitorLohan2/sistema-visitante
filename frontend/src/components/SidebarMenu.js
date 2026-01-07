import React, { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import {
  FiUsers,
  FiClock,
  FiMessageSquare,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiBarChart2,
  FiCalendar,
  FiHome,
  FiUserPlus,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import "../styles/sidebar-menu.css";

export default function SidebarMenu({ unseenCount, handleOpenConfigModal }) {
  const history = useHistory();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admMenuOpen, setAdmMenuOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Fechar sidebar ao clicar fora (mobile)
  useEffect(() => {
    function handleClickOutside(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setSidebarOpen(false);
      }
    }

    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [sidebarOpen]);

  // Fechar sidebar ao navegar
  const handleNavigation = (path) => {
    history.push(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Botão hamburger (visível apenas em mobile) */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
        ref={sidebarRef}
      >
        {/* Header da sidebar */}
        <div className="sidebar-header">
          <div className="user-info">
            <h3>{user?.nome}</h3>
            <p>{user?.email}</p>
            {user?.tipo === "ADM" && (
              <span className="badge-admin">Administrador</span>
            )}
          </div>
        </div>

        {/* Menu items */}
        <nav className="sidebar-nav">
          {/* Página Inicial (Profile) */}
          <button
            className="nav-item"
            onClick={() => handleNavigation("/profile")}
          >
            <FiHome size={20} />
            <span>Página Inicial</span>
          </button>

          {/* Cadastrar Visitante */}
          <button
            className="nav-item"
            onClick={() => handleNavigation("/cadastro-visitantes/new")}
          >
            <FiUserPlus size={20} />
            <span>Cadastrar Visitante</span>
          </button>

          {/* Dashboard (somente ADM) */}
          {user?.tipo === "ADM" && (
            <button
              className="nav-item"
              onClick={() => handleNavigation("/dashboard")}
            >
              <FiBarChart2 size={20} />
              <span>Dashboard</span>
            </button>
          )}

          {/* Visitantes */}
          <button
            className="nav-item"
            onClick={() => handleNavigation("/visitors")}
          >
            <FiUsers size={20} />
            <span>Visitantes</span>
          </button>

          {/* Histórico */}
          <button
            className="nav-item"
            onClick={() => handleNavigation("/history")}
          >
            <FiClock size={20} />
            <span>Histórico</span>
          </button>

          {/* Tickets */}
          <button
            className="nav-item"
            onClick={() => handleNavigation("/ticket-dashboard")}
          >
            <FiMessageSquare size={20} />
            <span>Suporte</span>
            {user?.setor === "Segurança" && unseenCount > 0 && (
              <span className="notification-badge">
                {unseenCount > 9 ? "9+" : unseenCount}
              </span>
            )}
          </button>

          {/* Agendamentos */}
          {(user?.tipo === "ADM" || [3, 4, 6].includes(user?.setor_id)) && (
            <button
              className="nav-item"
              onClick={() => handleNavigation("/agendamentos")}
            >
              <FiCalendar size={20} />
              <span>Agendamentos</span>
            </button>
          )}

          {/* Menu Administrativo */}
          {user?.tipo === "ADM" && (
            <div className="nav-submenu">
              <button
                className="nav-item"
                onClick={() => setAdmMenuOpen(!admMenuOpen)}
              >
                <FiSettings size={20} />
                <span>Administração</span>
                <span className={`arrow ${admMenuOpen ? "open" : ""}`}>›</span>
              </button>

              {admMenuOpen && (
                <div className="submenu-items">
                  <button
                    className="submenu-item"
                    onClick={() => handleNavigation("/chave-cadastro")}
                  >
                    Chave de Cadastro
                  </button>
                  <button
                    className="submenu-item"
                    onClick={() => handleNavigation("/empresa-visitantes")}
                  >
                    Cadastrar Empresa
                  </button>
                  <button
                    className="submenu-item"
                    onClick={() => handleNavigation("/funcionarios")}
                  >
                    Gerenciar Funcionários
                  </button>
                  <button
                    className="submenu-item"
                    onClick={() => handleNavigation("/funcionarios/cadastrar")}
                  >
                    Cadastrar Funcionário
                  </button>
                  <button
                    className="submenu-item"
                    onClick={() => handleNavigation("/ponto")}
                  >
                    Bipagem Entrada/Saída
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Configurações */}
          <button
            className="nav-item"
            onClick={() => {
              handleOpenConfigModal();
              setSidebarOpen(false);
            }}
          >
            <FiSettings size={20} />
            <span>Configurações</span>
          </button>
        </nav>

        {/* Footer da sidebar */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
