import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiSearch, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

import notificacaoSom from "../../assets/notificacao.mp3";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useDataLoader } from "../../hooks/useDataLoader";
import Loading from "../../components/Loading";

import VisitorCard from "../../components/VisitorCard";
import ConfigModal from "../../components/ConfigModal";
import VisitAuthorizationModal from "../../components/VisitAuthorizationModal";

import "./styles.css";
import "../../styles/dark-theme.css";
import "../../styles/visitorcard.css";

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
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Tickets de segurança
  const [unseenCount, setUnseenCount] = useState(0);
  const unseenRef = useRef(0);
  const isFirstLoad = useRef(true);

  // Modal do crachá
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [badgeData, setBadgeData] = useState(null);

  // Modal de configurações
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

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
  useEffect(() => {
    const savedTheme = localStorage.getItem("darkTheme");
    if (savedTheme) {
      setDarkTheme(JSON.parse(savedTheme));
      document.body.classList.toggle("dark-theme", JSON.parse(savedTheme));
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // EFEITO: Verifica notificações de segurança (apenas para setor Segurança)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!ongId || userData?.setor !== "Segurança") return;

    const checkNotifications = async () => {
      try {
        const response = await api.get("/tickets/unseen", {
          headers: { Authorization: ongId },
        });

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
  function toggleTheme() {
    const newTheme = !darkTheme;
    setDarkTheme(newTheme);
    localStorage.setItem("darkTheme", JSON.stringify(newTheme));
    document.body.classList.toggle("dark-theme", newTheme);
  }

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

  async function handleOpenConfigModal() {
    try {
      const response = await api.get(`usuarios/${ongId}`);
      setUserDetails(response.data);
      setConfigModalVisible(true);
    } catch (err) {
      alert("Erro ao carregar informações do usuário: " + err.message);
    }
  }

  function handleCloseConfigModal() {
    setConfigModalVisible(false);
    setUserDetails(null);
  }

  async function handleDeleteIncident(id) {
    if (!window.confirm("Tem certeza que deseja deletar este cadastro?"))
      return;

    try {
      const response = await api.delete(`cadastro-visitantes/${id}`, {
        headers: { Authorization: ongId },
      });

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
    const incident = sortedVisitantes.find((inc) => inc.id === id);
    if (incident?.bloqueado) {
      alert("Este visitante está bloqueado. Registro de visita não permitido.");
      return;
    }
    setSelectedIncident(incident);
    setVisitModalVisible(true);
  }

  async function handleConfirmVisit(responsavel, observacao) {
    try {
      // ✅ CORRIGIDO: Não passar Authorization manual - o interceptor do axios já adiciona Bearer token automaticamente
      await api.post("/visitantes", {
        name: selectedIncident.nome,
        cpf: selectedIncident.cpf,
        company: selectedIncident.empresa,
        sector: selectedIncident.setor,
        placa_veiculo: selectedIncident.placa_veiculo,
        cor_veiculo: selectedIncident.cor_veiculo,
        responsavel,
        observacao,
      });

      alert("Visita registrada com sucesso!");
      setVisitModalVisible(false);
      setSelectedIncident(null);
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
      const response = await api.get(`cadastro-visitantes/${id}/badge`);
      setBadgeData({
        ...response.data,
        imagem: response.data.avatar_imagem || response.data.imagem1 || null,
      });
      setBadgeModalVisible(true);
    } catch (err) {
      alert("Erro ao abrir crachá: " + err.message);
    }
  }

  function handlePrintBadge() {
    if (!badgeData) return;
    const printWindow = window.open("", "PRINT", "height=600,width=720");
    printWindow.document.write(`
    <html>
      <head>
        <title>Crachá de Visitante</title>
        <style>
          @page { size: 60mm 40mm landscape; margin: 0; }
          html, body { width: 60mm; height: 40mm; margin: 0; padding: 0; }
          body { display: flex; justify-content: flex-start; align-items: flex-start; }
          .badge {
            width: 60mm; height: 40mm; display: flex; flex-direction: column;
            justify-content: center; align-items: flex-start;
            font-family: Arial, sans-serif; border: 1px solid #000;
            border-radius: 6px; padding: 2mm; box-sizing: border-box;
          }
          .badge h1 { font-size: 12px; margin: 0 0 2px 0; }
          .badge p { font-size: 10px; margin: 1px 0; }
        </style>
      </head>
      <body>
        <div class="badge">
          <h1>Crachá de Visitante</h1>
          <p><strong>Nome:</strong> ${badgeData.nome}</p>
          <p><strong>Empresa:</strong> ${badgeData.empresa}</p>
          <p><strong>Setor:</strong> ${badgeData.setor}</p>
        </div>
      </body>
    </html>
  `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
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
                  background: "rgba(32, 224, 176, 0.1)",
                  color: "#047857",
                  cursor: "pointer",
                }}
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
        {currentRecords.map((incident) => (
          <VisitorCard
            key={incident.id}
            incident={incident}
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
      {badgeModalVisible && badgeData && (
        <div className="modal-overlay" onClick={handleCloseBadgeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseBadgeModal}>
              X
            </button>
            <h2>Crachá de Visitante</h2>
            <p>
              <strong>Nome:</strong> {badgeData.nome}
            </p>
            <p>
              <strong>Empresa:</strong> {badgeData.empresa}
            </p>
            <p>
              <strong>Setor:</strong> {badgeData.setor}
            </p>
            <button onClick={handlePrintBadge} className="modal-print-btn">
              Imprimir Crachá
            </button>
          </div>
        </div>
      )}

      <ConfigModal
        visible={configModalVisible}
        onClose={handleCloseConfigModal}
        darkTheme={darkTheme}
        toggleTheme={toggleTheme}
        userDetails={userDetails}
        ongId={ongId}
        ongName={ongName}
      />

      <VisitAuthorizationModal
        visible={visitModalVisible}
        onClose={() => setVisitModalVisible(false)}
        onConfirm={handleConfirmVisit}
        responsaveis={responsaveis.map((r) => r.nome)}
        incident={selectedIncident}
      />
    </div>
  );
}
