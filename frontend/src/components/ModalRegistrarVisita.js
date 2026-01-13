// src/components/ModalRegistrarVisita.js
import React, { useState, useEffect } from "react";
import "../styles/ModalRegistrarVisita.css";

export default function ModalRegistrarVisita({
  visible,
  onClose,
  onConfirm,
  responsaveis = [],
  incident = null, // 🔹 Novo prop para receber dados do incidente
}) {
  const [selected, setSelected] = useState("");
  const [observacao, setObservacao] = useState("");

  // 🔹 Quando o incidente mudar ou o modal abrir, carrega a observação existente
  // useEffect(() => {
  //   if (incident) {
  //     setObservacao(incident.observacao || "");
  //   }
  // }, [incident]);

  if (!visible) return null;

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected, observacao); // 🔹 Agora envia ambos os dados
    }
  };

  return (
    <div className="modal-authorization" onClick={onClose}>
      <div
        className="modal-content-authorization"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Quem liberou a visita?</h2>

        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Selecione um responsável</option>
          {responsaveis.map((resp, idx) => (
            <option key={idx} value={resp}>
              {resp}
            </option>
          ))}
        </select>

        {/* NOVO CAMPO PARA OBSERVAÇÃO */}
        <div className="observacao-section">
          <label htmlFor="observacao">Observação:</label>
          <textarea
            id="observacao"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Adicione uma observação para esta visita..."
            rows={4}
            className="observacao-textarea"
          />
        </div>

        <div className="modal-actions-authorization">
          <button
            onClick={handleConfirm}
            className="btn-confirm"
            disabled={!selected}
          >
            Confirmar
          </button>
          <button onClick={onClose} className="btn-cancel">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
