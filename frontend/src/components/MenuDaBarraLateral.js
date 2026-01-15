import React, { useState, useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  FiUsers,
  FiClock,
  FiMessageSquare,
  FiLogOut,
  FiMenu,
  FiX,
  FiBarChart2,
  FiCalendar,
  FiHome,
  FiUserPlus,
  FiBriefcase,
  FiLogIn,
  FiShield,
  FiTruck,
  FiList,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { usePermissoes } from "../hooks/usePermissoes";
import { useAgendamentos } from "../contexts/AgendamentoContext";
import { useDescargas } from "../contexts/DescargaContext";
import "../styles/MenuDaBarraLateral.css";

export default function MenuDaBarraLateral({ unseenCount }) {
  const history = useHistory();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isAdmin, temPermissao, papeis } = usePermissoes();
  const { agendamentosAbertos } = useAgendamentos();
  const { solicitacoesPendentes } = useDescargas();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Verificar se é da Segurança
  const isSeguranca =
    papeis.includes("SEGURANÇA") || papeis.includes("SEGURANCA");

  // Função para verificar se a rota está ativa
  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

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
            {isAdmin && <span className="badge-admin">Administrador</span>}
          </div>
        </div>

        {/* Menu items - TODOS controlados por permissão */}
        <nav className="sidebar-nav">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PÁGINA INICIAL - UNIVERSAL (sem permissão) */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          <button
            className={`nav-item ${isActive("/home") ? "active" : ""}`}
            onClick={() => handleNavigation("/home")}
          >
            <FiHome size={20} />
            <span>Página Inicial</span>
          </button>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: VISITANTES */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Visitantes Cadastrados (antiga Página Inicial) - visitante_visualizar */}
          {(isAdmin || temPermissao("visitante_visualizar")) && (
            <button
              className={`nav-item ${isActive("/listagem-visitante") ? "active" : ""}`}
              onClick={() => handleNavigation("/listagem-visitante")}
            >
              <FiList size={20} />
              <span>Visitantes Cadastrados</span>
            </button>
          )}

          {/* Cadastrar Visitante - cadastro_criar */}
          {(isAdmin || temPermissao("cadastro_criar")) && (
            <button
              className={`nav-item ${isActive("/cadastro-visitantes/novo") ? "active" : ""}`}
              onClick={() => handleNavigation("/cadastro-visitantes/novo")}
            >
              <FiUserPlus size={20} />
              <span>Cadastrar Visitante</span>
            </button>
          )}

          {/* Visitantes do Dia - cadastro_visualizar */}
          {(isAdmin || temPermissao("cadastro_visualizar")) && (
            <button
              className={`nav-item ${isActive("/visitantes") ? "active" : ""}`}
              onClick={() => handleNavigation("/visitantes")}
            >
              <FiUsers size={20} />
              <span>Visitas do Dia</span>
            </button>
          )}

          {/* Histórico de Visitantes - visitante_historico */}
          {(isAdmin || temPermissao("visitante_historico")) && (
            <button
              className={`nav-item ${isActive("/historico-visitante") ? "active" : ""}`}
              onClick={() => handleNavigation("/historico-visitante")}
            >
              <FiClock size={20} />
              <span>Histórico</span>
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: TICKETS */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Tickets - ticket_visualizar */}
          {(isAdmin || temPermissao("ticket_visualizar")) && (
            <button
              className={`nav-item ${isActive("/ticket-dashboard") ? "active" : ""}`}
              onClick={() => handleNavigation("/ticket-dashboard")}
            >
              <FiMessageSquare size={20} />
              <span>Ticket</span>
              {unseenCount > 0 && (
                <span className="notification-badge">
                  {unseenCount > 9 ? "9+" : unseenCount}
                </span>
              )}
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: AGENDAMENTOS */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Agendamentos - agendamento_visualizar */}
          {(isAdmin || temPermissao("agendamento_visualizar")) && (
            <button
              className={`nav-item ${isActive("/agendamentos") ? "active" : ""}`}
              onClick={() => handleNavigation("/agendamentos")}
            >
              <FiCalendar size={20} />
              <span>Agendamentos</span>
              {/* Badge de notificação para SEGURANÇA e Admin */}
              {(isSeguranca || isAdmin) && agendamentosAbertos > 0 && (
                <span className="notification-badge">
                  {agendamentosAbertos > 9 ? "9+" : agendamentosAbertos}
                </span>
              )}
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: DESCARGAS */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Gerenciar Descargas - descarga_visualizar */}
          {(isAdmin || temPermissao("descarga_visualizar")) && (
            <button
              className={`nav-item ${isActive("/gerenciamento-descargas") ? "active" : ""}`}
              onClick={() => handleNavigation("/gerenciamento-descargas")}
            >
              <FiTruck size={20} />
              <span>Descargas</span>
              {/* Badge de solicitações pendentes */}
              {solicitacoesPendentes > 0 && (
                <span className="notification-badge">
                  {solicitacoesPendentes > 9 ? "9+" : solicitacoesPendentes}
                </span>
              )}
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: DASHBOARD */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Dashboard - dashboard_visualizar */}
          {(isAdmin || temPermissao("dashboard_visualizar")) && (
            <button
              className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}
              onClick={() => handleNavigation("/dashboard")}
            >
              <FiBarChart2 size={20} />
              <span>Dashboard</span>
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: EMPRESAS */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Empresas de Visitantes - empresa_visualizar */}
          {(isAdmin || temPermissao("empresa_visualizar")) && (
            <button
              className={`nav-item ${isActive("/empresas-visitantes") ? "active" : ""}`}
              onClick={() => handleNavigation("/empresas-visitantes")}
            >
              <FiBriefcase size={20} />
              <span>Empresas de Visitantes</span>
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: FUNCIONÁRIOS */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Gerenciar Funcionários - funcionario_visualizar */}
          {(isAdmin || temPermissao("funcionario_visualizar")) && (
            <button
              className={`nav-item ${isActive("/funcionarios") ? "active" : ""}`}
              onClick={() => handleNavigation("/funcionarios")}
            >
              <FiUsers size={20} />
              <span>Gerenciar Funcionários</span>
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: PONTO */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Ponto / Bipagem - ponto_visualizar */}
          {(isAdmin || temPermissao("ponto_visualizar")) && (
            <button
              className={`nav-item ${isActive("/ponto") ? "active" : ""}`}
              onClick={() => handleNavigation("/ponto")}
            >
              <FiLogIn size={20} />
              <span>Bipagem Entrada/Saída</span>
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: ADMINISTRAÇÃO - SOMENTE ADMIN */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Gerenciar Permissões - SOMENTE ADMIN */}
          {isAdmin && (
            <button
              className={`nav-item admin-item ${isActive("/gerenciamento-permissoes") ? "active" : ""}`}
              onClick={() => handleNavigation("/gerenciamento-permissoes")}
            >
              <FiShield size={20} />
              <span>Gerenciar Permissões</span>
            </button>
          )}
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
