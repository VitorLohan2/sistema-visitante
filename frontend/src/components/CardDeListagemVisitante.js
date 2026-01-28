// src/components/CardDeListagemVisitante.js
import React, { useState } from "react";
import {
  FiUserPlus,
  FiSearch,
  FiEdit,
  FiUserCheck,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";

import "../styles/CardDeListagemVisitante.css";

export default function CardDeListagemVisitante({
  visitante,
  formatarData,
  handleRegisterVisit,
  handleViewProfile,
  handleEditProfile,
  handleOpenBadgeModal,
  handleDeleteIncident,
}) {
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  // Log para debug - ver TODOS os campos do visitante
  if (visitante.id === 687 || visitante.id === 688) {
    console.log(`📋 Card ${visitante.id} - Objeto completo:`, {
      id: visitante.id,
      nome: visitante.nome,
      empresa: visitante.empresa,
      empresa_id: visitante.empresa_id,
      setor: visitante.setor,
      setor_id: visitante.setor_id,
      todas_chaves: Object.keys(visitante),
    });
  }

  const handleOpenPhotoModal = () => {
    if (visitante.avatar_imagem) {
      setPhotoModalVisible(true);
    }
  };

  return (
    <>
      <div
        key={visitante.id}
        className={`visitor-card ${visitante.bloqueado ? "blocked" : ""}`}
      >
        <div className="card-left">
          <div
            className={`card-avatar ${visitante.avatar_imagem ? "clickable" : ""}`}
            onClick={handleOpenPhotoModal}
            title={visitante.avatar_imagem ? "Clique para ampliar" : ""}
          >
            {visitante.avatar_imagem ? (
              <img
                src={visitante.avatar_imagem}
                alt={visitante.bloqueado ? "Bloqueado" : "Usuário"}
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
              {visitante.nome}
              {visitante.bloqueado && (
                <span className="blocked-badge">BLOQUEADO</span>
              )}
            </h3>

            <div className="card-details">
              <div className="card-detail">
                <span className="card-detail-label">Nascimento</span>
                <span className="card-detail-value">
                  {formatarData(visitante.nascimento)}
                </span>
              </div>

              <div className="card-detail">
                <span className="card-detail-label">CPF</span>
                <span className="card-detail-value">{visitante.cpf}</span>
              </div>

              <div className="card-detail">
                <span className="card-detail-label">Empresa</span>
                <span className="card-detail-value">
                  {visitante.empresa || "Não informado"}
                </span>
              </div>

              <div className="card-detail">
                <span className="card-detail-label">Setor</span>
                <span className="card-detail-value">
                  {visitante.setor || "Não informado"}
                </span>
              </div>

              <div className="card-detail">
                <span className="card-detail-label">Função</span>
                <span className="card-detail-value">
                  {visitante.funcao || "-"}
                </span>
              </div>

              <div className="card-detail">
                <span className="card-detail-label">Placa Veículo</span>
                <span className="card-detail-value">
                  {visitante.placa_veiculo || "-"}
                </span>
              </div>

              <div className="card-detail">
                <span className="card-detail-label">Tipo Veículo</span>
                <span className="card-detail-value">
                  {visitante.tipo_veiculo || "-"}
                </span>
              </div>

              <div className="card-detail">
                <span className="card-detail-label">Cor Veículo</span>
                <span className="card-detail-value">
                  {visitante.cor_veiculo || "-"}
                </span>
              </div>

              <div className="card-detail">
                <span className="card-detail-label">Telefone</span>
                <span className="card-detail-value">{visitante.telefone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-actions">
          <button
            onClick={() => handleRegisterVisit(visitante.id)}
            className="card-action-btn visit"
            title="Registrar visita"
          >
            <FiUserPlus size={16} />
          </button>

          <button
            onClick={() => handleViewProfile(visitante.id)}
            className="card-action-btn view"
            title="Visualizar perfil"
          >
            <FiSearch size={16} />
          </button>

          <button
            onClick={() => handleEditProfile(visitante.id)}
            className="card-action-btn edit"
            title="Editar perfil"
          >
            <FiEdit size={16} />
          </button>

          <button
            onClick={() => handleOpenBadgeModal(visitante.id)}
            className="card-action-btn cracha"
            title="Crachá"
          >
            <FiUserCheck size={16} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteIncident(visitante.id);
            }}
            className="card-action-btn delete"
            title="Deletar cadastro"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>

      {/* Modal para ampliar foto */}
      {photoModalVisible && (
        <div
          className="photo-modal-overlay"
          onClick={() => setPhotoModalVisible(false)}
        >
          <div
            className="photo-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="photo-modal-close"
              onClick={() => setPhotoModalVisible(false)}
            >
              <FiX size={24} />
            </button>
            <img
              src={visitante.avatar_imagem}
              alt={visitante.nome}
              className="photo-modal-image"
            />
            <div className="photo-modal-name">{visitante.nome}</div>
          </div>
        </div>
      )}
    </>
  );
}
