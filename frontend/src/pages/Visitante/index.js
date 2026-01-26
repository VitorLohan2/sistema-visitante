import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { getCache, setCache } from "../../services/cacheService";
import * as socketService from "../../services/socketService";
import { useSocket } from "../../hooks/useSocket";
import "./styles.css";

export default function Visitante() {
  const [visitors, setVisitors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const socketListenersRef = useRef([]);

  // ✅ Garante conexão do socket
  useSocket();

  const history = useHistory();
  const ongId = localStorage.getItem("ongId");

  // ═══════════════════════════════════════════════════════════════
  // SETUP DOS LISTENERS DO SOCKET (tempo real)
  // ═══════════════════════════════════════════════════════════════
  const setupSocketListeners = useCallback(() => {
    // Limpar listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // ✅ Nova visita registrada (visitor:create - emitido por VisitanteController)
    const unsubVisitorCreate = socketService.on(
      "visitor:create",
      (visitante) => {
        console.log(
          "🟢 Nova visita registrada via socket (visitor:create):",
          visitante.id,
        );
        setVisitors((prev) => {
          if (prev.find((v) => v.id === visitante.id)) return prev;
          const novosVisitantes = [visitante, ...prev];
          setCache("visitors", novosVisitantes);
          return novosVisitantes;
        });
      },
    );

    // Novo visitante cadastrado (visitante:created - emitido por CadastroVisitanteController)
    const unsubCreate = socketService.on("visitante:created", (visitante) => {
      console.log("📥 Visitante cadastrado via socket:", visitante.id);
      // Este evento é para cadastro, não para visita ativa
      // Mantemos por compatibilidade, mas normalmente não afeta esta lista
    });

    // Visitante atualizado (ex: saiu)
    const unsubUpdate = socketService.on("visitante:updated", (dados) => {
      console.log("📝 Visitante atualizado via socket:", dados.id);
      // Se data_de_saida foi definido, remove da lista de ativos
      if (dados.data_de_saida) {
        setVisitors((prev) => {
          const novosVisitantes = prev.filter((v) => v.id !== dados.id);
          setCache("visitors", novosVisitantes);
          return novosVisitantes;
        });
      } else {
        setVisitors((prev) => {
          const novosVisitantes = prev.map((v) =>
            v.id === dados.id ? { ...v, ...dados } : v,
          );
          setCache("visitors", novosVisitantes);
          return novosVisitantes;
        });
      }
    });

    // Visitante deletado
    const unsubDelete = socketService.on("visitante:deleted", (dados) => {
      console.log("🗑️ Visitante removido via socket:", dados.id);
      setVisitors((prev) => {
        const novosVisitantes = prev.filter((v) => v.id !== dados.id);
        setCache("visitors", novosVisitantes);
        return novosVisitantes;
      });
    });

    // ✅ Visita encerrada (visitor:end - emitido pelo backend ao encerrar visita)
    const unsubVisitorEnd = socketService.on("visitor:end", (dados) => {
      console.log("🏁 Visita encerrada via socket (visitor:end):", dados.id);
      setVisitors((prev) => {
        const novosVisitantes = prev.filter((v) => v.id !== dados.id);
        setCache("visitors", novosVisitantes);
        return novosVisitantes;
      });
    });

    // ✅ Visitante removido da lista ativa (visitor:delete)
    const unsubVisitorDelete = socketService.on("visitor:delete", (dados) => {
      console.log("🗑️ Visitante removido (visitor:delete):", dados.id);
      setVisitors((prev) => {
        const novosVisitantes = prev.filter((v) => v.id !== dados.id);
        setCache("visitors", novosVisitantes);
        return novosVisitantes;
      });
    });

    socketListenersRef.current.push(
      unsubVisitorCreate,
      unsubCreate,
      unsubUpdate,
      unsubDelete,
      unsubVisitorEnd,
      unsubVisitorDelete,
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO INICIAL (cache primeiro, depois API)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // 1. Carrega do cache instantaneamente
    const cachedVisitors = getCache("visitors");
    if (cachedVisitors && cachedVisitors.length > 0) {
      console.log("⚡ Visitantes carregados do cache:", cachedVisitors.length);
      setVisitors(cachedVisitors);
      setIsLoading(false);
    }

    // 2. Setup dos listeners do socket
    setupSocketListeners();

    // 3. Busca da API em background
    api
      .get("visitantes")
      .then((response) => {
        console.log("🔄 Visitantes atualizados da API:", response.data.length);
        setVisitors(response.data);
        setCache("visitors", response.data);
      })
      .catch((error) => {
        console.error("Erro ao carregar visitantes:", error);
        // Se não tem cache, mostra erro
        if (!cachedVisitors || cachedVisitors.length === 0) {
          alert("Erro ao carregar visitantes. Verifique sua conexão.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Cleanup
    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
  }, [ongId, setupSocketListeners]);

  // ═══════════════════════════════════════════════════════════════
  // ENCERRAR VISITA
  // ═══════════════════════════════════════════════════════════════
  async function handleEndVisit(id) {
    try {
      await api.put(`visitantes/${id}/exit`, {});

      alert("Visita Finalizada com sucesso!");

      // Atualiza o estado e o cache
      setVisitors((prev) => {
        const novosVisitantes = prev.filter((visitor) => visitor.id !== id);
        setCache("visitors", novosVisitantes);
        return novosVisitantes;
      });
    } catch (err) {
      console.error("Erro ao encerrar visita:", err);
      alert("Erro ao encerrar visita, tente novamente.");
    }
  }

  // Abre modal e mostra observação
  function handleOpenObservation(observacao) {
    setSelectedObservation(observacao || "Nenhuma observação cadastrada.");
    setIsModalOpen(true);
  }

  // Filtra visitantes por nome ou CPF
  const filteredVisitors = visitors.filter((visitor) => {
    const matchesSearch =
      (visitor.nome &&
        visitor.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
                  className="search-clear-btn-visitante"
                  onClick={() => setSearchTerm("")}
                  title="Limpar busca"
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
                  <th>Função</th>
                  <th className="th-center">Placa</th>
                  <th className="th-center">Tipo</th>
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
                    <td data-label="Nome">{visitor.nome || "Não informado"}</td>
                    <td data-label="CPF">{visitor.cpf || "Não informado"}</td>
                    <td data-label="Empresa">
                      {visitor.empresa || "Não informado"}
                    </td>
                    <td data-label="Setor">
                      {visitor.setor || "Não informado"}
                    </td>
                    <td data-label="Função">{visitor.funcao || "-"}</td>
                    <td data-label="Placa" className="td-center">
                      {visitor.placa_veiculo || "-"}
                    </td>
                    <td data-label="Tipo" className="td-center">
                      {visitor.tipo_veiculo || "-"}
                    </td>
                    <td data-label="Cor" className="td-center">
                      {visitor.cor_veiculo || "-"}
                    </td>
                    <td data-label="Responsável">
                      {visitor.responsavel || "Não informado"}
                    </td>
                    <td data-label="Entrada">
                      {visitor.data_de_entrada
                        ? new Date(visitor.data_de_entrada).toLocaleString()
                        : new Date(visitor.criado_em).toLocaleString()}
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
                          className="btn-primary"
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
