/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MENU DA BARRA LATERAL - Componente de Navegação Principal
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * - Exibir menu de navegação lateral responsivo
 * - Exibir badge de notificações de tickets (via TicketContext)
 * - Controlar acesso baseado em permissões
 * - Mostrar contadores de agendamentos e descargas pendentes
 *
 * Dados de notificação: Fornecidos pelos Contexts (TicketContext, AgendamentoContext, DescargaContext)
 * Atualização: Via Socket.IO em tempo real (gerenciado pelos Contexts)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
  FiHeadphones,
  FiMapPin,
  FiMap,
  FiTarget,
  FiServer,
} from "react-icons/fi";
import {
  FaUserAstronaut,
  FaUserSecret,
  FaUserTie,
  FaUserNinja,
} from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import { usePermissoes } from "../hooks/usePermissoes";
import { useAgendamentos } from "../contexts/AgendamentoContext";
import { useDescargas } from "../contexts/DescargaContext";
import { useTickets } from "../contexts/TicketContext";
import { useChatSuporte } from "../contexts/ChatSuporteContext";
import logo from "../assets/logo_lateral.svg";
import "../styles/MenuDaBarraLateral.css";

export default function MenuDaBarraLateral() {
  const history = useHistory();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { temPermissao, papeis } = usePermissoes();

  // ═══════════════════════════════════════════════════════════════
  // DADOS DOS CONTEXTS (atualizados via Socket.IO automaticamente)
  // ═══════════════════════════════════════════════════════════════
  const { agendamentosAbertos } = useAgendamentos();
  const { solicitacoesPendentes } = useDescargas();
  const { unseenCount } = useTickets(); // Badge de tickets não vistos
  const { filaCount } = useChatSuporte(); // Badge de chat suporte - APENAS fila de espera

  // Estados locais
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Verifica se usuário é da Segurança
  const isSeguranca =
    papeis.includes("SEGURANÇA") || papeis.includes("SEGURANCA");

  // Verifica se tem QUALQUER permissão de chat (para mostrar notificação)
  const temPermissaoChat =
    temPermissao("chat_visualizar") ||
    temPermissao("chat_enviar") ||
    temPermissao("chat_atendente_acessar_painel") ||
    temPermissao("chat_atendente_aceitar") ||
    temPermissao("chat_atendente_transferir") ||
    temPermissao("chat_atendente_finalizar") ||
    temPermissao("chat_gerenciar_faq") ||
    temPermissao("chat_visualizar_auditoria") ||
    temPermissao("chat_visualizar_relatorios") ||
    temPermissao("chat_gerenciar_configuracoes");

  // Notificação de chat = APENAS fila de espera (conversas aguardando atendente)
  const chatNotificationCount = filaCount;

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  // Verifica se a rota está ativa
  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  // Fecha sidebar ao clicar fora (mobile)
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
        {/* Logo da empresa */}
        <div className="sidebar-logo">
          <img src={logo} alt="Logo da Empresa" className="logo-image" />
        </div>

        {/* Header da sidebar */}
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar-container">
              <div
                className={`user-avatar-animated ${
                  papeis.includes("ADMIN")
                    ? "avatar-admin"
                    : papeis.includes("GESTOR")
                      ? "avatar-gestor"
                      : papeis.includes("SEGURANÇA") ||
                          papeis.includes("SEGURANCA")
                        ? "avatar-security"
                        : "avatar-user"
                }`}
              >
                <div className="avatar-icon">
                  {papeis.includes("ADMIN") ? (
                    <FaUserAstronaut
                      style={{ color: "white", fontSize: "24px" }}
                    />
                  ) : papeis.includes("GESTOR") ? (
                    <FaUserTie style={{ color: "white", fontSize: "24px" }} />
                  ) : papeis.includes("SEGURANÇA") ||
                    papeis.includes("SEGURANCA") ? (
                    <FaUserSecret
                      style={{ color: "white", fontSize: "24px" }}
                    />
                  ) : (
                    <FaUserNinja style={{ color: "white", fontSize: "24px" }} />
                  )}
                </div>
                <div className="avatar-pulse"></div>
              </div>
              <div className="user-details">
                <h3>{user?.nome}</h3>
              </div>
            </div>
            <div className="user-email">
              <p>{user?.email}</p>
            </div>
            {papeis.includes("ADMIN") && (
              <span className="badge-admin">Administrador</span>
            )}
            {papeis.includes("GESTOR") && !papeis.includes("ADMIN") && (
              <span className="badge-gestor">Gestor</span>
            )}
          </div>
        </div>

        {/* Menu items - TODOS controlados por permissão RBAC */}
        {/* NOTA: temPermissao() já verifica se é ADMIN internamente */}
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
          {temPermissao("visitante_visualizar") && (
            <button
              className={`nav-item ${isActive("/listagem-visitante") ? "active" : ""}`}
              onClick={() => handleNavigation("/listagem-visitante")}
            >
              <FiList size={20} />
              <span>Visitantes Cadastrados</span>
            </button>
          )}

          {/* Cadastrar Visitante - cadastro_criar */}
          {temPermissao("cadastro_criar") && (
            <button
              className={`nav-item ${isActive("/cadastro-visitantes/novo") ? "active" : ""}`}
              onClick={() => handleNavigation("/cadastro-visitantes/novo")}
            >
              <FiUserPlus size={20} />
              <span>Cadastrar Visitante</span>
            </button>
          )}

          {/* Visitantes do Dia - cadastro_visualizar */}
          {temPermissao("cadastro_visualizar") && (
            <button
              className={`nav-item ${isActive("/visitantes") ? "active" : ""}`}
              onClick={() => handleNavigation("/visitantes")}
            >
              <FiUsers size={20} />
              <span>Visitas do Dia</span>
            </button>
          )}

          {/* Histórico de Visitantes - visitante_historico */}
          {temPermissao("visitante_historico") && (
            <button
              className={`nav-item ${isActive("/historico-visitante") ? "active" : ""}`}
              onClick={() => handleNavigation("/historico-visitante")}
            >
              <FiClock size={20} />
              <span>Histórico</span>
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: RONDA DE VIGILANTE */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Minha Ronda - ronda_iniciar */}
          {temPermissao("ronda_iniciar") && (
            <button
              className={`nav-item ${isActive("/ronda") ? "active" : ""}`}
              onClick={() => handleNavigation("/ronda")}
            >
              <FiMapPin size={20} />
              <span>Minha Ronda</span>
            </button>
          )}

          {/* Painel de Rondas (Admin) - ronda_gerenciar */}
          {temPermissao("ronda_gerenciar") && (
            <button
              className={`nav-item ${isActive("/painel-rondas") ? "active" : ""}`}
              onClick={() => handleNavigation("/painel-rondas")}
            >
              <FiMap size={20} />
              <span>Painel de Rondas</span>
            </button>
          )}

          {/* Pontos de Controle - ronda_pontos_controle_visualizar */}
          {temPermissao("ronda_pontos_controle_visualizar") && (
            <button
              className={`nav-item ${isActive("/pontos-controle") ? "active" : ""}`}
              onClick={() => handleNavigation("/pontos-controle")}
            >
              <FiTarget size={20} />
              <span>Pontos de Controle</span>
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: TICKETS */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Tickets - ticket_visualizar */}
          {temPermissao("ticket_visualizar") && (
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
          {/* MÓDULO: CHAT SUPORTE */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Chat de Suporte - qualquer permissão de chat */}
          {temPermissaoChat && (
            <button
              className={`nav-item ${isActive("/chat-suporte") ? "active" : ""}`}
              onClick={() =>
                handleNavigation(
                  temPermissao("chat_atendente_acessar_painel")
                    ? "/chat-suporte/atendente"
                    : "/chat-suporte",
                )
              }
            >
              <FiHeadphones size={20} />
              <span>Chat de Suporte</span>
              {/* Badge de notificação: fila de espera */}
              {chatNotificationCount > 0 && (
                <span className="notification-badge">
                  {chatNotificationCount > 9 ? "9+" : chatNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: AGENDAMENTOS */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Agendamentos - agendamento_visualizar */}
          {temPermissao("agendamento_visualizar") && (
            <button
              className={`nav-item ${isActive("/agendamentos") ? "active" : ""}`}
              onClick={() => handleNavigation("/agendamentos")}
            >
              <FiCalendar size={20} />
              <span>Agendamentos</span>
              {/* Badge de notificação para SEGURANÇA */}
              {isSeguranca && agendamentosAbertos > 0 && (
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
          {temPermissao("descarga_visualizar") && (
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
          {temPermissao("dashboard_visualizar") && (
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
          {temPermissao("empresa_visualizar") && (
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
          {temPermissao("funcionario_visualizar") && (
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
          {temPermissao("ponto_visualizar") && (
            <button
              className={`nav-item ${isActive("/ponto") ? "active" : ""}`}
              onClick={() => handleNavigation("/ponto")}
            >
              <FiLogIn size={20} />
              <span>Bipagem Entrada/Saída</span>
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: CONTROL iD - EQUIPAMENTOS */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Equipamentos Control iD - controlid_visualizar */}
          {temPermissao("controlid_visualizar") && (
            <button
              className={`nav-item ${isActive("/equipamentos-controlid") ? "active" : ""}`}
              onClick={() => handleNavigation("/equipamentos-controlid")}
            >
              <FiServer size={20} />
              <span>Equipamentos Control iD</span>
            </button>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MÓDULO: ADMINISTRAÇÃO */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* Gerenciar Permissões - permissao_gerenciar */}
          {temPermissao("permissao_gerenciar") && (
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
