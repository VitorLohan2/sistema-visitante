import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  FiArrowLeft,
  FiSearch,
  FiLogOut,
  FiMessageSquare,
  FiX,
  FiUsers,
} from "react-icons/fi";

import api from "../../services/api";
import "./styles.css";

import logoImg from "../../assets/logo.svg";

export default function Visitante() {
  const [visitors, setVisitors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedObservation, setSelectedObservation] = useState(null); // 👈 guarda obs do visitante
  const [isModalOpen, setIsModalOpen] = useState(false);

  const history = useHistory();
  const ongId = localStorage.getItem("ongId");
  const ongName = localStorage.getItem("ongName");

  useEffect(() => {
    // ✅ CORREÇÃO: REMOVER header manual - o interceptor já adiciona Bearer automaticamente
    api
      .get("visitantes")
      .then((response) => {
        setVisitors(response.data);
      })
      .catch((error) => {
        console.error("Erro ao carregar visitantes:", error);
        alert("Erro ao carregar visitantes. Verifique sua conexão.");
      });
  }, [ongId]);

  // 👉 Função adicionada:
  async function handleEndVisit(id) {
    try {
      // ✅ CORRIGIDO: Usando rota correta /visitantes/:id/exit
      await api.put(`visitantes/${id}/exit`, {});

      alert("Visita Finalizada com sucesso!");
      // Atualiza o estado removendo o visitante da lista
      setVisitors(visitors.filter((visitor) => visitor.id !== id));

      // Opcional: redirecionar para histórico
      // history.push('/history');
    } catch (err) {
      console.error("Erro ao encerrar visita:", err);
      alert("Erro ao encerrar visita, tente novamente.");
    }
  }

  // 👇 abre modal e mostra observação
  function handleOpenObservation(observacao) {
    setSelectedObservation(observacao || "Nenhuma observação cadastrada.");
    setIsModalOpen(true);
  }

  // Filtra visitantes por nome ou CPF
  const filteredVisitors = visitors.filter((visitor) => {
    const matchesSearch =
      (visitor.name &&
        visitor.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (visitor.cpf && visitor.cpf.includes(searchTerm));
    return matchesSearch;
  });

  return (
    <div className="visitante-container">
      {/* HEADER */}
      <header className="visitante-header">
        <div className="visitante-logo-wrapper">
          <div className="visitante-title-group">
            <h1 className="visitante-title">Visitantes</h1>
          </div>
        </div>
      </header>

      {/* TABELA CONTAINER */}
      <section className="visitante-table-container">
        <div className="visitante-table-header">
          <h2 className="visitante-table-title">Visitas no Local</h2>
          <div className="visitante-search-wrapper">
            <div className="visitante-search-box">
              <FiSearch className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="search-clear-btn"
                  onClick={() => setSearchTerm("")}
                  title="Limpar busca"
                  style={{
                    position: "absolute",
                    right: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    border: "none",
                    borderRadius: "50%",
                    background: "rgba(224, 32, 65, 0.1)",
                    color: "#e02041",
                    cursor: "pointer",
                  }}
                >
                  <FiX size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredVisitors.length === 0 ? (
          <div className="visitante-empty">
            <FiUsers size={48} />
            <h3>
              {searchTerm
                ? "Nenhum visitante encontrado"
                : "Nenhum visitante cadastrado"}
            </h3>
            <p>
              {searchTerm
                ? "Tente alterar os termos de busca."
                : "Não há visitantes com visita ativa no momento."}
            </p>
          </div>
        ) : (
          <div className="visitante-table-wrapper">
            <table className="visitante-table">
              <thead>
                <tr>
                  <th className="th-center">#</th>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Empresa</th>
                  <th>Setor</th>
                  <th className="th-center">Placa</th>
                  <th className="th-center">Cor</th>
                  <th>Responsável</th>
                  <th>Data/Hora Entrada</th>
                  <th className="th-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((visitor, index) => (
                  <tr key={visitor.id}>
                    <td data-label="#">{index + 1}</td>
                    <td data-label="Nome">{visitor.name || "Não informado"}</td>
                    <td data-label="CPF">{visitor.cpf || "Não informado"}</td>
                    <td data-label="Empresa">
                      {visitor.company || visitor.empresa || "Não informado"}
                    </td>
                    <td data-label="Setor">
                      {visitor.sector || visitor.setor || "Não informado"}
                    </td>
                    <td data-label="Placa" className="td-center">
                      {visitor.placa_veiculo || "-"}
                    </td>
                    <td data-label="Cor" className="td-center">
                      {visitor.cor_veiculo || "-"}
                    </td>
                    <td data-label="Responsável">
                      {visitor.responsavel || "Não informado"}
                    </td>
                    <td data-label="Entrada">
                      {visitor.entry_date
                        ? new Date(visitor.entry_date).toLocaleString()
                        : new Date(visitor.created_at).toLocaleString()}
                    </td>
                    <td data-label="Ações" className="td-center">
                      <div className="visitante-actions">
                        <button
                          onClick={() =>
                            handleOpenObservation(visitor.observacao)
                          }
                          className="visitante-obs-btn"
                          title="Ver observação"
                        >
                          <FiMessageSquare size={16} />
                        </button>
                        <button
                          onClick={() => handleEndVisit(visitor.id)}
                          className="visitante-end-btn"
                        >
                          <FiLogOut size={16} />
                          <span>Encerrar Visita</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div
          className="visitante-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="visitante-modal" onClick={(e) => e.stopPropagation()}>
            <div className="visitante-modal-header">
              <h3>
                <FiMessageSquare size={20} />
                Observação
              </h3>
              <button
                className="visitante-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="visitante-modal-body">
              <p>{selectedObservation}</p>
            </div>
            <div className="visitante-modal-footer">
              <button
                onClick={() => setIsModalOpen(false)}
                className="visitante-modal-btn"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
