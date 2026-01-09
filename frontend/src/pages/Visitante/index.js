import React, { useState, useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiLogOut } from "react-icons/fi";

import api from "../../services/api";
import "./styles.css";

import logoImg from "../../assets/logo.svg";

export default function Visitante() {
  const [visitors, setVisitors] = useState([]);
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

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="page-title-wrapper">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {ongName}</span>
        </div>
        <Link className="back-link" to="/listagem-visitante">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <div className="content">
        <section className="historico-visitas">
          <h1>Visitantes</h1>
          <h2>Histórico de visitas</h2>

          {visitors.length === 0 ? (
            <p className="nao-visitantes">Nenhum visitante cadastrado ainda.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Empresa</th>
                  <th>Setor</th>
                  <th>Placa</th>
                  <th>Cor</th>
                  <th>Responsavel</th>
                  <th>Data/Hora Entrada</th>
                  <th className="placaendcor">Observação/Finalização</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor, index) => (
                  <tr key={visitor.id}>
                    <td>{index + 1}</td>
                    <td>{visitor.name || "Não informado"}</td>
                    <td>{visitor.cpf || "Não informado"}</td>
                    <td>
                      {visitor.company || visitor.empresa || "Não informado"}
                    </td>
                    <td>
                      {visitor.sector || visitor.setor || "Não informado"}
                    </td>
                    <td className="placaendcor">
                      {visitor.placa_veiculo || "-"}
                    </td>
                    <td className="placaendcor">
                      {visitor.cor_veiculo || "-"}
                    </td>
                    <td>{visitor.responsavel || "Não informado"}</td>
                    <td>
                      {visitor.entry_date
                        ? new Date(visitor.entry_date).toLocaleString()
                        : new Date(visitor.created_at).toLocaleString()}
                    </td>
                    <td className="acoes-buttons">
                      <button
                        onClick={() =>
                          handleOpenObservation(visitor.observacao)
                        }
                        className="observacao-button"
                        title="Ver observação"
                      >
                        <FiSearch size={18} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => handleEndVisit(visitor.id)}
                        className="encerrar-visita-button"
                      >
                        <FiLogOut size={18} strokeWidth={3} /> Encerrar Visita
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div
          className="modal-observacao-visitantes"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-conteudo-visitantes"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Observação</h2>
            <p>{selectedObservation}</p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="fechar-modal"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
