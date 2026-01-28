/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LISTAGEM DE VISITANTES - Página de Gerenciamento de Cadastros
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * - Listar visitantes cadastrados (dados do cache)
 * - Busca por nome ou CPF
 * - Registrar nova visita
 * - Editar/Visualizar/Deletar cadastros
 * - Imprimir crachá
 *
 * Dados: Carregados do cache (Home é responsável pelo carregamento inicial)
 * Atualização: Via Socket.IO em tempo real
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiSearch, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { getCache, setCache } from "../../services/cacheService";
import * as socketService from "../../services/socketService";

import CardDeListagemVisitante from "../../components/CardDeListagemVisitante";
import ModalRegistrarVisita from "../../components/ModalRegistrarVisita";
import ModalCracha from "../../components/ModalCracha";

import "./styles.css";
import "../../styles/CardDeListagemVisitante.css";
import logo from "../../assets/logo.svg";

export default function ListagemVisitante() {
  const history = useHistory();
  const { user, logout } = useAuth();

  // ═══════════════════════════════════════════════════════════════
  // DADOS DO CACHE (carregados pela Home)
  // ═══════════════════════════════════════════════════════════════
  const [visitantes, setVisitantes] = useState(
    () => getCache("cadastroVisitantes") || [],
  );
  const [responsaveis] = useState(() => getCache("responsaveis") || []);
  const socketListenersRef = useRef([]);

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS LOCAIS
  // ═══════════════════════════════════════════════════════════════
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filteredVisitantes, setFilteredVisitantes] = useState([]);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [pageGroup, setPageGroup] = useState(0);
  const pagesPerGroup = 4;

  // Modais
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [selectedVisitante, setSelectedVisitante] = useState(null);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [badgeData, setBadgeData] = useState(null);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO - Sincronização em tempo real
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // Limpa listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // Listener: Novo visitante criado
    const unsubCreate = socketService.on("visitante:created", (visitante) => {
      console.log("🔵 Socket recebido - visitante:created:", {
        id: visitante.id,
        nome: visitante.nome,
        empresa: visitante.empresa,
        setor: visitante.setor,
      });
      setVisitantes((prev) => {
        if (prev.find((v) => v.id === visitante.id)) return prev;
        const novos = [...prev, visitante].sort((a, b) =>
          (a.nome || "")
            .toLowerCase()
            .localeCompare((b.nome || "").toLowerCase(), "pt-BR"),
        );
        setCache("cadastroVisitantes", novos);
        console.log(
          "💾 Visitante adicionado ao estado:",
          novos.find((v) => v.id === visitante.id),
        );
        return novos;
      });
    });

    // Listener: Visitante atualizado
    const unsubUpdate = socketService.on("visitante:updated", (dados) => {
      setVisitantes((prev) => {
        const novos = prev.map((v) =>
          v.id === dados.id ? { ...v, ...dados } : v,
        );
        setCache("cadastroVisitantes", novos);
        return novos;
      });
    });

    // Listener: Visitante deletado
    const unsubDelete = socketService.on("visitante:deleted", (dados) => {
      setVisitantes((prev) => {
        const novos = prev.filter((v) => v.id !== dados.id);
        setCache("cadastroVisitantes", novos);
        return novos;
      });
    });

    socketListenersRef.current.push(unsubCreate, unsubUpdate, unsubDelete);

    // Cleanup ao desmontar
    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SINCRONIZAÇÃO: Visitantes → Lista Filtrada
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (visitantes.length > 0 && !isSearching && !searchTerm) {
      setFilteredVisitantes(visitantes);
    }
  }, [visitantes, isSearching, searchTerm]);

  // ═══════════════════════════════════════════════════════════════
  // BUSCA: Filtro com debounce (300ms)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchTerm.trim()) {
        setIsSearching(false);
        setFilteredVisitantes(visitantes);
        return;
      }

      setIsSearching(true);
      setCurrentPage(1);
      setPageGroup(0);

      const searchLower = searchTerm.toLowerCase().trim();
      const cpfNumbers = searchTerm.replace(/\D/g, "");

      // Busca local nos dados em cache (instantâneo)
      const results = visitantes.filter((visitante) => {
        const hasName = visitante.nome && typeof visitante.nome === "string";
        const hasCpf = visitante.cpf && typeof visitante.cpf === "string";

        // Busca por nome
        let nameMatch = false;
        if (hasName) {
          const nomeNormalizado = visitante.nome.toLowerCase().trim();
          nameMatch = nomeNormalizado.includes(searchLower);
        }

        // Busca por CPF
        let cpfMatch = false;
        if (hasCpf && cpfNumbers.length > 0) {
          cpfMatch =
            visitante.cpf.includes(searchTerm) ||
            visitante.cpf.replace(/\D/g, "").includes(cpfNumbers);
        }

        return nameMatch || cpfMatch;
      });

      setFilteredVisitantes(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, visitantes]);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES UTILITÁRIAS
  // ═══════════════════════════════════════════════════════════════

  function formatarData(data) {
    if (!data) return "Data não informada";
    const dataParte = data.split("T")[0];
    const partes = dataParte.split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // PAGINAÇÃO - Usa dados já ordenados do cache
  // ═══════════════════════════════════════════════════════════════
  const sortedVisitantes = useMemo(() => {
    return [...filteredVisitantes].sort((a, b) => {
      const nomeA = (a.nome || "").toLowerCase();
      const nomeB = (b.nome || "").toLowerCase();
      return nomeA.localeCompare(nomeB, "pt-BR");
    });
  }, [filteredVisitantes]);

  const totalPages = Math.ceil(sortedVisitantes.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = sortedVisitantes.slice(
    indexOfFirstRecord,
    indexOfLastRecord,
  );

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS DE AÇÕES
  // ═══════════════════════════════════════════════════════════════
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim() === "") {
      setIsSearching(false);
    }
  };

  async function handleDeleteIncident(id) {
    if (!window.confirm("Tem certeza que deseja deletar este cadastro?"))
      return;

    try {
      const response = await api.delete(`cadastro-visitantes/${id}`);

      if (response.status === 204) {
        // Remove do estado local e do cache
        setVisitantes((prev) => {
          const novos = prev.filter((v) => v.id !== id);
          setCache("cadastroVisitantes", novos);
          return novos;
        });

        // Atualiza a lista filtrada também
        setFilteredVisitantes((prev) => prev.filter((v) => v.id !== id));

        alert("Cadastro deletado com sucesso!");
      }
    } catch (err) {
      const error = err.response?.data?.error || err.message;
      alert(`Acesso Bloqueado: ${error}`);
    }
  }

  function handleRegisterVisit(id) {
    const visitante = sortedVisitantes.find((v) => v.id === id);
    if (visitante?.bloqueado) {
      alert("Este visitante está bloqueado. Registro de visita não permitido.");
      return;
    }
    setSelectedVisitante(visitante);
    setVisitModalVisible(true);
  }

  async function handleConfirmVisit(responsavel, observacao, editedData = {}) {
    try {
      // Verifica se houve alteração nos dados do cadastro
      const hasChanges =
        (editedData.empresa &&
          editedData.empresa !== selectedVisitante.empresa) ||
        (editedData.placa_veiculo &&
          editedData.placa_veiculo !== selectedVisitante.placa_veiculo) ||
        (editedData.cor_veiculo &&
          editedData.cor_veiculo !== selectedVisitante.cor_veiculo) ||
        (editedData.tipo_veiculo &&
          editedData.tipo_veiculo !== selectedVisitante.tipo_veiculo);

      // Se houve alterações, atualiza o cadastro do visitante
      if (hasChanges) {
        // Busca IDs das cores e tipos de veículos
        let corVeiculoId = null;
        let tipoVeiculoId = null;

        if (editedData.cor_veiculo) {
          const coresRes = await api.get("/cores-veiculos-visitantes");
          const corFound = coresRes.data.find(
            (c) => c.nome === editedData.cor_veiculo,
          );
          corVeiculoId = corFound?.id || null;
        }

        if (editedData.tipo_veiculo) {
          const tiposRes = await api.get("/tipos-veiculos-visitantes");
          const tipoFound = tiposRes.data.find(
            (t) => t.nome === editedData.tipo_veiculo,
          );
          tipoVeiculoId = tipoFound?.id || null;
        }

        // Atualiza o cadastro do visitante
        await api.put(`/cadastro-visitantes/${selectedVisitante.id}`, {
          nome: selectedVisitante.nome,
          nascimento: selectedVisitante.nascimento,
          cpf: selectedVisitante.cpf?.replace(/\D/g, ""),
          empresa: editedData.empresa || selectedVisitante.empresa,
          setor: selectedVisitante.setor,
          telefone: selectedVisitante.telefone?.replace(/\D/g, ""),
          placa_veiculo:
            editedData.placa_veiculo || selectedVisitante.placa_veiculo || "",
          cor_veiculo_visitante_id: corVeiculoId,
          tipo_veiculo_visitante_id: tipoVeiculoId,
          observacao: selectedVisitante.observacao || "",
          avatar_imagem: selectedVisitante.avatar_imagem || null,
        });

        // Atualização via Socket.IO será automática
      }

      // Registra a visita
      await api.post("/visitantes", {
        nome: selectedVisitante.nome,
        cpf: selectedVisitante.cpf,
        empresa: editedData.empresa || selectedVisitante.empresa,
        empresa_atribuida_id: editedData.empresa_atribuida_id || null,
        setor: selectedVisitante.setor,
        placa_veiculo:
          editedData.placa_veiculo || selectedVisitante.placa_veiculo,
        cor_veiculo: editedData.cor_veiculo || selectedVisitante.cor_veiculo,
        tipo_veiculo: editedData.tipo_veiculo || selectedVisitante.tipo_veiculo,
        funcao: selectedVisitante.funcao,
        responsavel,
        observacao,
      });

      alert("Visita registrada com sucesso!");
      setVisitModalVisible(false);
      setSelectedVisitante(null);
      history.push("/visitantes");
    } catch (err) {
      alert("Erro ao registrar visita: " + err.message);
    }
  }

  function handleEditProfile(id) {
    history.push(`/cadastro-visitantes/edit/${id}`);
  }

  function handleViewProfile(id) {
    history.push(`/cadastro-visitantes/view/${id}`);
  }

  function handleLogout() {
    if (window.confirm("Tem certeza que deseja sair?")) {
      logout();
    }
  }

  async function handleOpenBadgeModal(id) {
    try {
      const response = await api.get(`cadastro-visitantes/${id}/cracha`);
      setBadgeData({
        ...response.data,
        imagem: response.data.avatar_imagem || response.data.imagem1 || null,
      });
      setBadgeModalVisible(true);
    } catch (err) {
      alert("Erro ao abrir crachá: " + err.message);
    }
  }

  function handleCloseBadgeModal() {
    setBadgeModalVisible(false);
    setBadgeData(null);
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="profile-container">
      <header>
        <img src={logo} alt="DIME" />

        <div className="search-container">
          <div className="search-wrapper">
            <FiSearch className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              className="search-input"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchTerm && (
              <button
                className="search-clear-btn-lv"
                onClick={() => setSearchTerm("")}
                title="Limpar busca"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        <Link className="button" to="/cadastro-visitantes/novo">
          Cadastrar Visitante
        </Link>
      </header>

      <div className="page-header-section">
        <h1 className="page-title">Visitantes Cadastrados</h1>
        <div className="page-subtitle">
          <span className="total-counter">
            <span className="counter-value">{visitantes.length}</span>
            <span className="counter-label">cadastros registrados</span>
          </span>
          {isSearching && searchTerm && (
            <span className="search-results-badge">
              <span className="badge-icon">🔍</span>
              <span className="badge-text">
                {sortedVisitantes.length} resultado
                {sortedVisitantes.length !== 1 ? "s" : ""} para "{searchTerm}"
              </span>
            </span>
          )}
        </div>
      </div>

      {/* CARDS CONTAINER */}
      <div className="visitors-list">
        {currentRecords.map((visitante) => (
          <CardDeListagemVisitante
            key={visitante.id}
            visitante={visitante}
            formatarData={formatarData}
            handleRegisterVisit={handleRegisterVisit}
            handleViewProfile={handleViewProfile}
            handleEditProfile={handleEditProfile}
            handleOpenBadgeModal={handleOpenBadgeModal}
            handleDeleteIncident={handleDeleteIncident}
          />
        ))}
      </div>

      {/* Mensagem quando não há resultados */}
      {sortedVisitantes.length === 0 && (
        <div className="no-results">
          {searchTerm
            ? `Nenhum resultado encontrado para "${searchTerm}"`
            : "Nenhum cadastro encontrado"}
        </div>
      )}

      {/* PAGINAÇÃO */}
      {sortedVisitantes.length > recordsPerPage && (
        <div className="pagination">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <FiChevronLeft size={16} />
          </button>

          <button
            onClick={() => goToPage(1)}
            className={`pagination-button ${currentPage === 1 ? "active" : ""}`}
          >
            1
          </button>

          {pageGroup > 0 && (
            <button
              onClick={() => setPageGroup(pageGroup - 1)}
              className="pagination-button"
            >
              ...
            </button>
          )}

          {Array.from(
            { length: Math.min(pagesPerGroup, totalPages - 2) },
            (_, i) => {
              const pageNumber = 2 + i + pageGroup * pagesPerGroup;
              return pageNumber <= totalPages - 1 ? (
                <button
                  key={pageNumber}
                  onClick={() => goToPage(pageNumber)}
                  className={`pagination-button ${currentPage === pageNumber ? "active" : ""}`}
                >
                  {pageNumber}
                </button>
              ) : null;
            },
          )}

          {2 + (pageGroup + 1) * pagesPerGroup < totalPages && (
            <button
              onClick={() => setPageGroup(pageGroup + 1)}
              className="pagination-button"
            >
              ...
            </button>
          )}

          {totalPages > 1 && (
            <button
              onClick={() => goToPage(totalPages)}
              className={`pagination-button ${currentPage === totalPages ? "active" : ""}`}
            >
              {totalPages}
            </button>
          )}

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      )}

      {/* MODAL DO CRACHÁ */}
      <ModalCracha
        visible={badgeModalVisible}
        onClose={handleCloseBadgeModal}
        badgeData={badgeData}
      />

      <ModalRegistrarVisita
        visible={visitModalVisible}
        onClose={() => setVisitModalVisible(false)}
        onConfirm={handleConfirmVisit}
        responsaveis={responsaveis.map((r) => r.nome)}
        visitante={selectedVisitante}
      />
    </div>
  );
}
