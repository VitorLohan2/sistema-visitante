// src/components/CardDeListagemVisitante.js
import React from "react";
import {
  FiUserPlus,
  FiSearch,
  FiEdit,
  FiUserCheck,
  FiTrash2,
  FiUser,
} from "react-icons/fi";

import "../styles/CardDeListagemVisitante.css";

export default function CardDeListagemVisitante({
  incident,
  formatarData,
  handleRegisterVisit,
  handleViewProfile,
  handleEditProfile,
  handleOpenBadgeModal,
  handleDeleteIncident,
}) {
  return (
    <div
      key={incident.id}
      className={`visitor-card ${incident.bloqueado ? "blocked" : ""}`}
    >
      <div className="card-left">
        <div className="card-avatar">
          {incident.avatar_imagem ? (
            <img
              src={incident.avatar_imagem}
              alt={incident.bloqueado ? "Bloqueado" : "Usuário"}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <FiUser size={55} className="default-user-icon" />
          )}
        </div>

        <div className="card-info">
          <h3 className="card-name">
            {incident.nome}
            {incident.bloqueado && (
              <span className="blocked-badge">BLOQUEADO</span>
            )}
          </h3>

          <div className="card-details">
            <div className="card-detail">
              <span className="card-detail-label">Nascimento</span>
              <span className="card-detail-value">
                {formatarData(incident.nascimento)}
              </span>
            </div>

            <div className="card-detail">
              <span className="card-detail-label">CPF</span>
              <span className="card-detail-value">{incident.cpf}</span>
            </div>

            <div className="card-detail">
              <span className="card-detail-label">Empresa</span>
              <span className="card-detail-value">{incident.empresa}</span>
            </div>

            <div className="card-detail">
              <span className="card-detail-label">Setor</span>
              <span className="card-detail-value">{incident.setor}</span>
            </div>

            <div className="card-detail">
              <span className="card-detail-label">Placa</span>
              <span className="card-detail-value">
                {incident.placa_veiculo || "-"}
              </span>
            </div>

            <div className="card-detail">
              <span className="card-detail-label">Cor</span>
              <span className="card-detail-value">
                {incident.cor_veiculo || "-"}
              </span>
            </div>

            <div className="card-detail">
              <span className="card-detail-label">Telefone</span>
              <span className="card-detail-value">{incident.telefone}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          onClick={() => handleRegisterVisit(incident.id)}
          className="card-action-btn visit"
          title="Registrar visita"
        >
          <FiUserPlus size={16} />
        </button>

        <button
          onClick={() => handleViewProfile(incident.id)}
          className="card-action-btn view"
          title="Visualizar perfil"
        >
          <FiSearch size={16} />
        </button>

        <button
          onClick={() => handleEditProfile(incident.id)}
          className="card-action-btn edit"
          title="Editar perfil"
        >
          <FiEdit size={16} />
        </button>

        <button
          onClick={() => handleOpenBadgeModal(incident.id)}
          className="card-action-btn cracha"
          title="Crachá"
        >
          <FiUserCheck size={16} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteIncident(incident.id);
          }}
          className="card-action-btn delete"
          title="Deletar cadastro"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </div>
  );
}
