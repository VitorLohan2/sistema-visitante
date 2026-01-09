// src/components/ProfileMenu.js
import React from "react";
import {
  FiUsers,
  FiClock,
  FiMessageSquare,
  FiCoffee,
  FiSettings,
  FiKey,
  FiShield,
  FiBriefcase,
  FiUserPlus,
  FiLogIn,
} from "react-icons/fi";
import { useHistory } from "react-router-dom";
import { usePermissoes } from "../hooks/usePermissoes";

import "../styles/profile-menu.css";

export default function ProfileMenu({
  userData,
  unseenCount,
  handleOpenConfigModal,
}) {
  const history = useHistory();
  const { isAdmin, temPermissao } = usePermissoes();

  // Verifica se pode ver agendamentos
  const podeVerAgendamentos =
    isAdmin ||
    temPermissao("agendamento_visualizar") ||
    [3, 4, 6].includes(userData?.setor_id);

  return (
    <div className="page-profile-header">
      {/* Visitantes - todos podem ver */}
      <button
        onClick={() => history.push("/visitantes")}
        className="visitors-link"
      >
        <FiUsers size={20} className="icone2" />
        <span>Ver Visitantes</span>
      </button>

      {/* Histórico - todos podem ver */}
      <button
        onClick={() => history.push("/historico-visitante")}
        className="history-link"
      >
        <FiClock size={20} className="icone" />
        <span>Histórico</span>
      </button>

      {/* Tickets - todos podem ver */}
      <button
        onClick={() => history.push("/ticket-dashboard")}
        className="tickets-link"
      >
        <FiMessageSquare size={20} className="icone" />
        <span>Tickets</span>
        {userData?.setor === "Segurança" && unseenCount > 0 && (
          <span className="notification-badge">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {/* Agendamentos - por permissão ou setor */}
      {podeVerAgendamentos && (
        <button
          onClick={() => history.push("/agendamentos")}
          className="agendamentos-link"
        >
          <FiCoffee size={20} className="icone" />
          <span>Agendamentos</span>
        </button>
      )}

      {/* Chave de Cadastro - por permissão */}
      {(isAdmin || temPermissao("codigo_visualizar")) && (
        <button
          onClick={() => history.push("/chave-cadastro")}
          className="menu-link"
        >
          <FiKey size={20} className="icone" />
          <span>Chave Cadastro</span>
        </button>
      )}

      {/* Cadastrar Empresa - por permissão */}
      {(isAdmin || temPermissao("empresa_criar")) && (
        <button
          onClick={() => history.push("/cadastrar-empresa-visitante")}
          className="menu-link"
        >
          <FiBriefcase size={20} className="icone" />
          <span>Cadastrar Empresa</span>
        </button>
      )}

      {/* Funcionários - por permissão */}
      {(isAdmin || temPermissao("funcionario_visualizar")) && (
        <button
          onClick={() => history.push("/funcionarios")}
          className="menu-link"
        >
          <FiUsers size={20} className="icone" />
          <span>Funcionários</span>
        </button>
      )}

      {/* Cadastrar Funcionário - por permissão */}
      {(isAdmin || temPermissao("funcionario_criar")) && (
        <button
          onClick={() => history.push("/funcionarios/cadastrar")}
          className="menu-link"
        >
          <FiUserPlus size={20} className="icone" />
          <span>Cadastrar Func.</span>
        </button>
      )}

      {/* Ponto/Bipagem - por permissão */}
      {(isAdmin || temPermissao("ponto_visualizar")) && (
        <button onClick={() => history.push("/ponto")} className="menu-link">
          <FiLogIn size={20} className="icone" />
          <span>Ponto</span>
        </button>
      )}

      {/* Gerenciar Permissões - somente ADMIN */}
      {isAdmin && (
        <button
          onClick={() => history.push("/gerenciamento-permissoes")}
          className="menu-link admin-link"
        >
          <FiShield size={20} className="icone" />
          <span>Permissões</span>
        </button>
      )}

      <button onClick={handleOpenConfigModal} className="history-link">
        <FiSettings size={20} className="icone" />
        <span>Configuração</span>
      </button>
    </div>
  );
}
