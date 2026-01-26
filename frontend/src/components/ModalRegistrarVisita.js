// src/components/ModalRegistrarVisita.js
import React, { useState, useEffect } from "react";
import { FiX, FiCheck, FiUser, FiTruck, FiBriefcase } from "react-icons/fi";
import api from "../services/api";
import "../styles/ModalRegistrarVisita.css";

export default function ModalRegistrarVisita({
  visible,
  onClose,
  onConfirm,
  responsaveis = [],
  visitante = null, // Dados do visitante selecionado
}) {
  const [selected, setSelected] = useState("");
  const [observacao, setObservacao] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Campos de edição rápida
  const [empresa, setEmpresa] = useState("");
  const [placaVeiculo, setPlacaVeiculo] = useState("");
  const [corVeiculo, setCorVeiculo] = useState("");
  const [tipoVeiculo, setTipoVeiculo] = useState("");

  // Listas de opções
  const [empresas, setEmpresas] = useState([]);
  const [coresVeiculos, setCoresVeiculos] = useState([]);
  const [tiposVeiculos, setTiposVeiculos] = useState([]);

  // Carrega dados das APIs ao abrir o modal
  useEffect(() => {
    if (visible) {
      loadOptions();
      // Preenche com dados do visitante se existir
      if (visitante) {
        setEmpresa(visitante.empresa || "");
        setPlacaVeiculo(visitante.placa_veiculo || "");
        setCorVeiculo(visitante.cor_veiculo || "");
        setTipoVeiculo(visitante.tipo_veiculo || "");
      }
    }
  }, [visible, visitante]);

  const loadOptions = async () => {
    try {
      const [empresasRes, coresRes, tiposRes] = await Promise.all([
        api.get("/empresas-visitantes"),
        api.get("/cores-veiculos-visitantes"),
        api.get("/tipos-veiculos-visitantes"),
      ]);
      setEmpresas(empresasRes.data);
      setCoresVeiculos(coresRes.data);
      setTiposVeiculos(tiposRes.data);
    } catch (err) {
      console.error("Erro ao carregar opções:", err);
    }
  };

  // Função para formatar placa
  const formatPlaca = (value) => {
    const cleaned = value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 7);
    return cleaned;
  };

  const handlePlacaChange = (e) => {
    setPlacaVeiculo(formatPlaca(e.target.value));
  };

  if (!visible) return null;

  const handleConfirm = async () => {
    if (selected && !isLoading) {
      setIsLoading(true);
      try {
        // Envia dados adicionais junto com responsável e observação
        await onConfirm(selected, observacao, {
          empresa,
          placa_veiculo: placaVeiculo,
          cor_veiculo: corVeiculo,
          tipo_veiculo: tipoVeiculo,
        });
      } catch (err) {
        console.error("Erro ao confirmar visita:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClose = () => {
    // Limpa os campos ao fechar
    setSelected("");
    setObservacao("");
    setEmpresa("");
    setPlacaVeiculo("");
    setCorVeiculo("");
    setTipoVeiculo("");
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="modal-registrar-visita-overlay" onClick={handleClose}>
      <div
        className="modal-registrar-visita-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-registrar-visita-header">
          <h2>Registrar Visita</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-registrar-visita-body">
          {/* Seção Responsável */}
          <div className="modal-section">
            <div className="modal-section-title">
              <FiUser size={16} />
              <span>Autorização</span>
            </div>
            <div className="modal-form-group">
              <label>Quem liberou a visita?</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Selecione um responsável</option>
                {responsaveis.map((resp, idx) => (
                  <option key={idx} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seção Empresa */}
          <div className="modal-section">
            <div className="modal-section-title">
              <FiBriefcase size={16} />
              <span>Empresa</span>
            </div>
            <div className="modal-form-group">
              <label>Empresa</label>
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              >
                <option value="">Selecione a empresa</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.nome}>
                    {emp.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seção Veículo */}
          <div className="modal-section">
            <div className="modal-section-title">
              <FiTruck size={16} />
              <span>Veículo (opcional)</span>
            </div>
            <div className="modal-form-row">
              <div className="modal-form-group">
                <label>Placa</label>
                <input
                  type="text"
                  value={placaVeiculo}
                  onChange={handlePlacaChange}
                  placeholder="ABC1D23"
                  maxLength={7}
                />
              </div>
              <div className="modal-form-group">
                <label>Cor</label>
                <select
                  value={corVeiculo}
                  onChange={(e) => setCorVeiculo(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {coresVeiculos.map((cor) => (
                    <option key={cor.id} value={cor.nome}>
                      {cor.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-form-group">
                <label>Tipo</label>
                <select
                  value={tipoVeiculo}
                  onChange={(e) => setTipoVeiculo(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {tiposVeiculos.map((tipo) => (
                    <option key={tipo.id} value={tipo.nome}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Observação */}
          <div className="modal-form-group">
            <label>Observação</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione uma observação para esta visita..."
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-registrar-visita-footer">
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!selected || isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner"></span>
                Processando...
              </>
            ) : (
              <>
                <FiCheck size={16} />
                Confirmar Visita
              </>
            )}
          </button>
          <button
            className="btn-modal-cancel"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
