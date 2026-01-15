import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiSearch, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

import notificacaoSom from "../../assets/notificacao.mp3";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useDataLoader } from "../../hooks/useDataLoader";
import Loading from "../../components/Loading";

import CardDeListagemVisitante from "../../components/CardDeListagemVisitante";

import ModalRegistrarVisita from "../../components/ModalRegistrarVisita";
import ModalCracha from "../../components/ModalCracha";

import "./styles.css";
import "../../styles/CardDeListagemVisitante.css";

import logo from "../../assets/logo.svg";

export default function ListagemVisitante() {
  const history = useHistory();
  const { user, logout } = useAuth();
  const ongId = user?.id;
  const ongName = user?.name;

  // ═══════════════════════════════════════════════════════════════
  // 🆕 HOOK DE DADOS COM CACHE
  // ═══════════════════════════════════════════════════════════════
  const {
    loading,
    progress,
    progressMessage,
    visitantes: allVisitantes,
    empresas: empresasVisitantes,
    setores: setoresVisitantes,
    responsaveis,
    userData,
    removeVisitante,
    reloadVisitantes,
  } = useDataLoader(ongId);

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

  // Modal de registrar Visita
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [selectedVisitante, setSelectedVisitante] = useState(null);

  // Tickets de segurança
  const [unseenCount, setUnseenCount] = useState(0);
  const unseenRef = useRef(0);
  const isFirstLoad = useRef(true);

  // Modal do crachá
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [badgeData, setBadgeData] = useState(null);

  // Modal de configurações

  // ═══════════════════════════════════════════════════════════════
  // EFEITO: Sincroniza visitantes carregados com estado filtrado
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (allVisitantes.length > 0 && !isSearching && !searchTerm) {
      setFilteredVisitantes(allVisitantes);
    }
  }, [allVisitantes, isSearching, searchTerm]);

  // ═══════════════════════════════════════════════════════════════
  // EFEITO: Carrega tema do localStorage
  // ═══════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════
  // EFEITO: Verifica notificações de segurança (apenas para setor Segurança)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!ongId || userData?.setor !== "Segurança") return;

    const checkNotifications = async () => {
      try {
        const response = await api.get("/tickets/unseen");

        const newCount = response.data.count;
        if (!isFirstLoad.current && newCount > unseenRef.current) {
          const audio = new Audio(notificacaoSom);
          audio.play().catch((err) => console.error("Erro ao tocar som:", err));
        }

        unseenRef.current = newCount;
        setUnseenCount(newCount);
        isFirstLoad.current = false;
      } catch (error) {
        console.error("Erro ao verificar notificações:", error);
      }
    };

    checkNotifications();
    const intervalId = setInterval(checkNotifications, 30000); // A cada 30 segundos

    return () => clearInterval(intervalId);
  }, [ongId, userData?.setor]);

  // ═══════════════════════════════════════════════════════════════
  // EFEITO: Busca com debounce (usando dados em cache)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchTerm.trim()) {
        setIsSearching(false);
        setFilteredVisitantes(allVisitantes);
        return;
      }

      setIsSearching(true);
      setCurrentPage(1);
      setPageGroup(0);

      const searchLower = searchTerm.toLowerCase().trim();
      const cpfNumbers = searchTerm.replace(/\D/g, "");

      // Busca local nos dados em cache (instantâneo)
      const results = allVisitantes.filter((visitante) => {
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
  }, [searchTerm, allVisitantes]);

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
    indexOfLastRecord
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
        // Remove do cache local (sem recarregar da API)
        removeVisitante(id);

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
            (c) => c.nome === editedData.cor_veiculo
          );
          corVeiculoId = corFound?.id || null;
        }

        if (editedData.tipo_veiculo) {
          const tiposRes = await api.get("/tipos-veiculos-visitantes");
          const tipoFound = tiposRes.data.find(
            (t) => t.nome === editedData.tipo_veiculo
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

        // Atualiza o cache local
        reloadVisitantes();
      }

      // Registra a visita
      await api.post("/visitantes", {
        nome: selectedVisitante.nome,
        cpf: selectedVisitante.cpf,
        empresa:
          editedData.empresa ||
          selectedVisitante.empresa ||
          selectedVisitante.empresa_nome,
        setor: selectedVisitante.setor || selectedVisitante.setor_nome,
        placa_veiculo:
          editedData.placa_veiculo || selectedVisitante.placa_veiculo,
        cor_veiculo: editedData.cor_veiculo || selectedVisitante.cor_veiculo,
        tipo_veiculo: editedData.tipo_veiculo || selectedVisitante.tipo_veiculo,
        funcao: selectedVisitante.funcao || selectedVisitante.funcao_nome,
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
  if (loading) {
    return <Loading progress={progress} message={progressMessage} />;
  }

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
                className="search-clear-btn"
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

      <h1>
        Visitantes Cadastrados ({sortedVisitantes.length})
        {isSearching && searchTerm && (
          <span className="search-results-info">
            {" "}
            - Buscando por "{searchTerm}" ({sortedVisitantes.length} resultados)
          </span>
        )}
      </h1>

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
      {sortedVisitantes.length === 0 && !loading && (
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
            }
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
