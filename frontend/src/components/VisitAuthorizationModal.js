// src/components/VisitAuthorizationModal.js
import React, { useState } from "react";
import "../styles/visitAuthorization-Modal.css"; // estilos simples

export default function VisitAuthorizationModal({ 
  visible, 
  onClose, 
  onConfirm, 
  responsaveis = [] 
}) {
  const [selected, setSelected] = useState("");

  if (!visible) return null;

  return (
    <div className="modal-authorization" onClick={onClose}>
      <div className="modal-content-authorization" onClick={e => e.stopPropagation()}>
        <h2>Quem liberou a visita?</h2>
        
        <select 
          value={selected} 
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Selecione um responsável</option>
          {responsaveis.map((resp, idx) => (
            <option key={idx} value={resp}>{resp}</option>
          ))}
        </select>

        <div className="modal-actions-authorization">
          <button 
            onClick={() => selected && onConfirm(selected)} 
            className="btn-confirm" 
            disabled={!selected}
          >
            Confirmar
          </button>
          <button onClick={onClose} className="btn-cancel">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
