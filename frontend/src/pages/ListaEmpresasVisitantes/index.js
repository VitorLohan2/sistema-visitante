import logger from "../../utils/logger";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiX,
  FiArrowLeft,
  FiBriefcase,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import api from "../../services/api";
import {
  getCache,
  setCache,
  addEmpresaVisitanteToCache,
  updateEmpresaVisitanteInCache,
  removeEmpresaVisitanteFromCache,
} from "../../services/cacheService";
import { useSocket } from "../../hooks/useSocket";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import Loading from "../../components/Loading";
import "./styles.css";

export default function ListaEmpresasVisitantes() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Hooks de UI
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;

  // Estados para modal de edição
  const [modalVisible, setModalVisible] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
  });
  const [salvando, setSalvando] = useState(false);

  // Socket para atualizações em tempo real
  const socket = useSocket();

  // Carregar empresas
  const carregarEmpresas = useCallback(
    async (forceReload = false) => {
      try {
        setLoading(true);

        // Verifica cache primeiro
        if (!forceReload) {
          const cachedEmpresas = getCache("empresasVisitantes");
          if (cachedEmpresas) {
            logger.log("📦 Usando empresas visitantes do cache");
            setEmpresas(cachedEmpresas);
            setLoading(false);
            return;
          }
        }

        // Se não tem cache, busca da API
        const response = await api.get("/empresas-visitantes");

        const empresasOrdenadas = response.data.sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
        );

        setCache("empresasVisitantes", empresasOrdenadas);
        setEmpresas(empresasOrdenadas);
      } catch (error) {
        logger.error("Erro ao carregar empresas:", error);
        showToast("Erro ao carregar empresas de visitantes", "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  // Carregar dados iniciais
  useEffect(() => {
    carregarEmpresas();
  }, [carregarEmpresas]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    // Empresa criada
    socket.on("empresa:create", (novaEmpresa) => {
      logger.log("🔔 Socket: Nova empresa criada", novaEmpresa);
      setEmpresas((prev) => {
        const existe = prev.find((e) => e.id === novaEmpresa.id);
        if (existe) return prev;
        const novaLista = [...prev, novaEmpresa].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
        );
        addEmpresaVisitanteToCache(novaEmpresa);
        return novaLista;
      });
    });

    // Empresa atualizada
    socket.on("empresa:update", (empresaAtualizada) => {
      logger.log("🔔 Socket: Empresa atualizada", empresaAtualizada);
      setEmpresas((prev) => {
        const novaLista = prev
          .map((e) => (e.id === empresaAtualizada.id ? empresaAtualizada : e))
          .sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
          );
        updateEmpresaVisitanteInCache(empresaAtualizada.id, empresaAtualizada);
        return novaLista;
      });
    });

    // Empresa deletada
    socket.on("empresa:delete", ({ id }) => {
      logger.log("🔔 Socket: Empresa deletada", id);
      setEmpresas((prev) => {
        const novaLista = prev.filter((e) => e.id !== id);
        removeEmpresaVisitanteFromCache(id);
        return novaLista;
      });
    });

    return () => {
      socket.off("empresa:create");
      socket.off("empresa:update");
      socket.off("empresa:delete");
    };
  }, [socket]);

  // Filtrar empresas com useMemo
  const empresasFiltradas = useMemo(() => {
    return empresas.filter((empresa) => {
      const termo = searchTerm.toLowerCase();
      return (
        empresa.nome?.toLowerCase().includes(termo) ||
        empresa.cnpj?.includes(searchTerm.replace(/\D/g, "")) ||
        empresa.email?.toLowerCase().includes(termo)
      );
    });
  }, [empresas, searchTerm]);

  // Calcular paginação
  const totalPages = Math.ceil(empresasFiltradas.length / recordsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return empresasFiltradas.slice(startIndex, endIndex);
  }, [empresasFiltradas, currentPage, recordsPerPage]);

  // Reset para página 1 quando filtro muda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handler de mudança de página
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll suave para o topo da tabela
      document.querySelector(".empresas-list")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // Gera array de páginas para renderizar
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Abrir modal para editar
  const handleEditar = (empresa) => {
    setEmpresaEditando(empresa);
    setFormData({
      nome: empresa.nome || "",
      cnpj: formatCNPJ(empresa.cnpj) || "",
      telefone: formatTelefone(empresa.telefone) || "",
      email: empresa.email || "",
      endereco: empresa.endereco || "",
    });
    setModalVisible(true);
  };

  // Abrir modal para criar nova
  const handleNova = () => {
    setEmpresaEditando(null);
    setFormData({
      nome: "",
      cnpj: "",
      telefone: "",
      email: "",
      endereco: "",
    });
    setModalVisible(true);
  };

  // Fechar modal
  const handleFecharModal = () => {
    setModalVisible(false);
    setEmpresaEditando(null);
    setFormData({
      nome: "",
      cnpj: "",
      telefone: "",
      email: "",
      endereco: "",
    });
  };

  // Salvar (criar ou atualizar)
  const handleSalvar = async (e) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      showToast("Nome da empresa é obrigatório", "warning");
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        nome: formData.nome.trim().toUpperCase(),
        cnpj: formData.cnpj.replace(/\D/g, "") || null,
        telefone: formData.telefone.replace(/\D/g, "") || null,
        email: formData.email.trim().toLowerCase() || null,
        endereco: formData.endereco.trim() || null,
      };

      if (empresaEditando) {
        // Atualizar
        await api.put(`/empresas-visitantes/${empresaEditando.id}`, payload);
        showToast("Empresa atualizada com sucesso!", "success");
      } else {
        // Criar
        await api.post("/empresas-visitantes", payload);
        showToast("Empresa cadastrada com sucesso!", "success");
      }

      handleFecharModal();
      carregarEmpresas(true);
    } catch (error) {
      logger.error("Erro ao salvar empresa:", error);
      showToast(
        error.response?.data?.error || "Erro ao salvar empresa",
        "error",
      );
    } finally {
      setSalvando(false);
    }
  };

  // Deletar empresa
  const handleDeletar = async (empresa) => {
    const confirmed = await confirm({
      title: "Excluir Empresa",
      message: `Deseja excluir a empresa "${empresa.nome}"?\n\nEsta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await api.delete(`/empresas-visitantes/${empresa.id}`);
      showToast("Empresa excluída com sucesso!", "success");
      carregarEmpresas(true);
    } catch (error) {
      logger.error("Erro ao deletar empresa:", error);
      showToast(
        error.response?.data?.error || "Erro ao excluir empresa",
        "error",
      );
    }
  };

  // Formatadores
  const formatCNPJ = (value) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`;
    }
    return cleaned;
  };

  const formatTelefone = (value) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return cleaned;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "cnpj") {
      setFormData((prev) => ({ ...prev, cnpj: formatCNPJ(value) }));
    } else if (name === "telefone") {
      setFormData((prev) => ({ ...prev, telefone: formatTelefone(value) }));
    } else if (name === "nome") {
      setFormData((prev) => ({ ...prev, nome: value.toUpperCase() }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (loading) {
    return <Loading variant="page" message="Carregando empresas..." />;
  }

  return (
    <div className="empresas-visitantes-container">
      <header className="empresas-header">
        <div className="header-left">
          <h1>Empresas de Visitantes</h1>
        </div>
        <div className="header-right">
          <button className="btn-primary" onClick={handleNova}>
            <FiPlus size={18} />
            Nova Empresa
          </button>
        </div>
      </header>

      {/* Barra de busca */}
      <div className="search-bar">
        <div className="search-wrapper">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="search-clear-btn-lev"
              onClick={() => setSearchTerm("")}
              title="Limpar busca"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
        <span className="total-empresas">
          {empresasFiltradas.length} empresa(s) encontrada(s)
        </span>
      </div>

      {/* Lista de empresas */}
      <div className="empresas-list">
        {empresasFiltradas.length === 0 ? (
          <div className="no-results">
            <FiBriefcase className="empty-icon" />
            <h3>
              {searchTerm
                ? "Nenhuma empresa encontrada"
                : "Nenhuma empresa cadastrada"}
            </h3>
            <p>
              {searchTerm
                ? `Tente refinar sua busca por "${searchTerm}"`
                : "Clique em 'Nova Empresa' para adicionar uma"}
            </p>
          </div>
        ) : (
          <>
            <table className="empresas-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CNPJ</th>
                  <th>Telefone</th>
                  <th>Email</th>
                  <th>Endereço</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((empresa, index) => (
                  <tr key={empresa.id}>
                    <td className="empresa-nome">{empresa.nome}</td>
                    <td>{formatCNPJ(empresa.cnpj) || "-"}</td>
                    <td>{formatTelefone(empresa.telefone) || "-"}</td>
                    <td>{empresa.email || "-"}</td>
                    <td className="empresa-endereco">
                      {empresa.endereco || "-"}
                    </td>
                    <td className="acoes">
                      <button
                        className="btn-editar"
                        onClick={() => handleEditar(empresa)}
                        title="Editar"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        className="btn-deletar"
                        onClick={() => handleDeletar(empresa)}
                        title="Excluir"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="empresas-pagination">
                <div className="empresas-pagination-info">
                  Mostrando {(currentPage - 1) * recordsPerPage + 1} -{" "}
                  {Math.min(
                    currentPage * recordsPerPage,
                    empresasFiltradas.length,
                  )}{" "}
                  de {empresasFiltradas.length} registros
                </div>

                <div className="empresas-pagination-controls">
                  <button
                    className="empresas-pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Página anterior"
                  >
                    <FiChevronLeft size={18} />
                  </button>

                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      className={`empresas-pagination-btn ${
                        page === currentPage ? "active" : ""
                      } ${page === "..." ? "dots" : ""}`}
                      onClick={() => page !== "..." && handlePageChange(page)}
                      disabled={page === "..."}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    className="empresas-pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Próxima página"
                  >
                    <FiChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Edição/Criação */}
      {modalVisible && (
        <div className="modal-overlay" onClick={handleFecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{empresaEditando ? "Editar Empresa" : "Nova Empresa"}</h2>
              <button
                className="btn-fechar-empresavisitante"
                onClick={handleFecharModal}
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="modal-form">
              <div className="form-group">
                <label htmlFor="nome">Nome da Empresa *</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleFormChange}
                  placeholder="NOME DA EMPRESA"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cnpj">CNPJ</label>
                  <input
                    type="text"
                    id="cnpj"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleFormChange}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="telefone">Telefone</label>
                  <input
                    type="text"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleFormChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="empresa@email.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="endereco">Endereço</label>
                <input
                  type="text"
                  id="endereco"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleFormChange}
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={handleFecharModal}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modais de UI */}
      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}
