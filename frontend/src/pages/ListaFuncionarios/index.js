import React, { useState, useEffect, useCallback } from "react";
import {
  FiEdit2,
  FiPlus,
  FiSearch,
  FiX,
  FiClock,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiCalendar,
  FiFilter,
} from "react-icons/fi";
import api from "../../services/api";
import {
  getCache,
  setCache,
  addFuncionarioToCache,
  updateFuncionarioInCache,
} from "../../services/cacheService";
import Loading from "../../components/Loading";
import { useSocket } from "../../hooks/useSocket";
import { usePermissoes } from "../../hooks/usePermissoes";
import "./styles.css";

// Dados estruturais dos setores e funções
const setoresEFuncoes = {
  EXPEDIÇÃO: [
    "TRAINEE GESTÃO LOGÍSTICA",
    "TRAINEE ASSIST. DE EXPEDIÇÃO",
    "ASSISTENTE DE EXPEDIÇÃO I",
    "ASSIST. DE EXPEDIÇÃO II",
    "ASSIST. DE EXPEDIÇÃO III",
    "ASSIST. DE EXPEDIÇÃO IV",
    "AUXILIAR DE EXPEDIÇÃO",
    "ASSIST. DE SALA NOBRE",
    "CONFERENTE DE CARGA I",
    "CONFERENTE DE CARGA II",
    "AUX. CONFERENTE DE CARGA",
    "MECANICO DE VEICULOS",
    "MANOBRISTA",
    "LAVADOR DE VEICULOS II",
  ],
  ADMINISTRATIVO: [
    "ASSISTENTE ADMINISTRATIVO",
    "ANALISTA ADMINISTRATIVO",
    "GERENTE ADMINISTRATIVO",
  ],
};

export default function ListaFuncionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para modal de Cadastrar/Editar
  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [funcionarioEditando, setFuncionarioEditando] = useState(null);
  const [formData, setFormData] = useState({
    cracha: "",
    nome: "",
    setor: "",
    funcao: "",
    data_admissao: new Date().toISOString().split("T")[0],
    ativo: true,
    data_demissao: "",
  });
  const [funcoesDisponiveis, setFuncoesDisponiveis] = useState([]);
  const [salvando, setSalvando] = useState(false);

  // Estados para modal de Histórico
  const [modalHistoricoVisible, setModalHistoricoVisible] = useState(false);
  const [funcionarioHistorico, setFuncionarioHistorico] = useState(null);
  const [registrosPonto, setRegistrosPonto] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [filtrosHistorico, setFiltrosHistorico] = useState({
    dataInicio: "",
    dataFim: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Socket e permissões
  const socket = useSocket();
  const { isAdmin, temPermissao, loading: permissoesLoading } = usePermissoes();

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR FUNCIONÁRIOS
  // ═══════════════════════════════════════════════════════════════
  const carregarFuncionarios = useCallback(async (forceReload = false) => {
    try {
      setLoading(true);

      // Verifica cache primeiro
      if (!forceReload) {
        const cachedFuncionarios = getCache("funcionarios");
        if (cachedFuncionarios) {
          console.log("📦 Usando funcionários do cache");
          setFuncionarios(cachedFuncionarios);
          setLoading(false);
          return;
        }
      }

      // Se não tem cache, busca da API
      const response = await api.get("/funcionarios", {
        params: { mostrarInativos: true },
      });

      const funcionariosOrdenados = response.data.sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
      );

      setCache("funcionarios", funcionariosOrdenados);
      setFuncionarios(funcionariosOrdenados);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      alert("Erro ao carregar funcionários");
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    if (!permissoesLoading) {
      carregarFuncionarios();
    }
  }, [permissoesLoading, carregarFuncionarios]);

  // Atualiza funções disponíveis quando setor muda
  useEffect(() => {
    if (formData.setor && setoresEFuncoes[formData.setor]) {
      setFuncoesDisponiveis(setoresEFuncoes[formData.setor]);
    } else {
      setFuncoesDisponiveis([]);
    }
  }, [formData.setor]);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET LISTENERS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!socket) return;

    socket.on("funcionario:create", (novoFuncionario) => {
      console.log("🔔 Socket: Novo funcionário criado", novoFuncionario);
      setFuncionarios((prev) => {
        const existe = prev.find((f) => f.cracha === novoFuncionario.cracha);
        if (existe) return prev;
        const novaLista = [...prev, novoFuncionario].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
        );
        addFuncionarioToCache(novoFuncionario);
        return novaLista;
      });
    });

    socket.on("funcionario:update", (funcionarioAtualizado) => {
      console.log("🔔 Socket: Funcionário atualizado", funcionarioAtualizado);
      setFuncionarios((prev) => {
        const novaLista = prev
          .map((f) =>
            f.cracha === funcionarioAtualizado.cracha
              ? funcionarioAtualizado
              : f
          )
          .sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
          );
        updateFuncionarioInCache(
          funcionarioAtualizado.cracha,
          funcionarioAtualizado
        );
        return novaLista;
      });
    });

    return () => {
      socket.off("funcionario:create");
      socket.off("funcionario:update");
    };
  }, [socket]);

  // ═══════════════════════════════════════════════════════════════
  // FILTRO DE BUSCA
  // ═══════════════════════════════════════════════════════════════
  const funcionariosFiltrados = funcionarios.filter((funcionario) => {
    const termo = searchTerm.toLowerCase();
    return (
      funcionario.nome?.toLowerCase().includes(termo) ||
      funcionario.cracha?.toLowerCase().includes(termo) ||
      funcionario.setor?.toLowerCase().includes(termo) ||
      funcionario.funcao?.toLowerCase().includes(termo)
    );
  });

  // Estatísticas
  const totalAtivos = funcionarios.filter((f) => f.ativo).length;
  const totalInativos = funcionarios.filter((f) => !f.ativo).length;

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS - MODAL CADASTRAR/EDITAR
  // ═══════════════════════════════════════════════════════════════
  const handleNovo = () => {
    setFuncionarioEditando(null);
    setFormData({
      cracha: "",
      nome: "",
      setor: "",
      funcao: "",
      data_admissao: new Date().toISOString().split("T")[0],
      ativo: true,
      data_demissao: "",
    });
    setFuncoesDisponiveis([]);
    setModalFormVisible(true);
  };

  const handleEditar = (funcionario) => {
    setFuncionarioEditando(funcionario);
    setFormData({
      cracha: funcionario.cracha || "",
      nome: funcionario.nome || "",
      setor: funcionario.setor || "",
      funcao: funcionario.funcao || "",
      data_admissao: funcionario.data_admissao
        ? funcionario.data_admissao.split("T")[0]
        : "",
      ativo: funcionario.ativo,
      data_demissao: funcionario.data_demissao
        ? funcionario.data_demissao.split("T")[0]
        : "",
    });
    if (funcionario.setor && setoresEFuncoes[funcionario.setor]) {
      setFuncoesDisponiveis(setoresEFuncoes[funcionario.setor]);
    }
    setModalFormVisible(true);
  };

  const handleFecharModalForm = () => {
    setModalFormVisible(false);
    setFuncionarioEditando(null);
    setFormData({
      cracha: "",
      nome: "",
      setor: "",
      funcao: "",
      data_admissao: new Date().toISOString().split("T")[0],
      ativo: true,
      data_demissao: "",
    });
    setFuncoesDisponiveis([]);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();

    // Validações
    if (!formData.nome.trim()) {
      alert("Nome é obrigatório");
      return;
    }
    if (!formData.setor) {
      alert("Setor é obrigatório");
      return;
    }
    if (!formData.funcao) {
      alert("Função é obrigatória");
      return;
    }
    if (!funcionarioEditando && !formData.cracha.trim()) {
      alert("Crachá é obrigatório");
      return;
    }
    if (!funcionarioEditando && formData.cracha.trim().length < 3) {
      alert("Crachá deve ter pelo menos 3 dígitos");
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        nome: formData.nome.trim().toUpperCase(),
        setor: formData.setor,
        funcao: formData.funcao,
        data_admissao: formData.data_admissao
          ? new Date(formData.data_admissao).toISOString()
          : new Date().toISOString(),
        ativo: formData.ativo,
        data_demissao: formData.data_demissao || null,
      };

      if (funcionarioEditando) {
        // Atualizar
        await api.put(`/funcionarios/${funcionarioEditando.cracha}`, payload);
        updateFuncionarioInCache(funcionarioEditando.cracha, {
          ...funcionarioEditando,
          ...payload,
        });
        alert("✅ Funcionário atualizado com sucesso!");
      } else {
        // Criar
        console.log("📤 Enviando dados:", {
          ...payload,
          cracha: formData.cracha.trim(),
        });
        const token = localStorage.getItem("token");
        console.log("🔐 Token presente:", !!token);
        await api.post("/funcionarios", {
          ...payload,
          cracha: formData.cracha.trim(),
        });
        alert("✅ Funcionário cadastrado com sucesso!");
      }

      handleFecharModalForm();
      carregarFuncionarios(true);
    } catch (error) {
      console.error("Erro ao salvar funcionário:", error);
      console.error("❌ Resposta do servidor:", error.response?.data);
      if (error.response?.status === 403) {
        alert("Sem permissão para esta ação");
      } else {
        alert(error.response?.data?.error || "Erro ao salvar funcionário");
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "cracha") {
      setFormData((prev) => ({ ...prev, cracha: value.replace(/\D/g, "") }));
    } else if (name === "nome") {
      setFormData((prev) => ({ ...prev, nome: value.toUpperCase() }));
    } else if (name === "setor") {
      setFormData((prev) => ({ ...prev, setor: value, funcao: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleStatusChange = (e) => {
    const ativo = e.target.value === "ativo";
    setFormData((prev) => ({
      ...prev,
      ativo,
      data_demissao: ativo ? "" : new Date().toISOString().split("T")[0],
    }));
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS - INATIVAR/REATIVAR
  // ═══════════════════════════════════════════════════════════════
  const handleInativar = async (funcionario) => {
    if (!window.confirm(`Deseja inativar o funcionário "${funcionario.nome}"?`))
      return;

    try {
      await api.put(`/funcionarios/${funcionario.cracha}`, {
        ativo: false,
        data_demissao: new Date().toISOString().split("T")[0],
      });
      updateFuncionarioInCache(funcionario.cracha, {
        ativo: false,
        data_demissao: new Date().toISOString().split("T")[0],
      });
      alert("✅ Funcionário inativado!");
      carregarFuncionarios(true);
    } catch (error) {
      console.error("Erro ao inativar:", error);
      alert(error.response?.data?.error || "Erro ao inativar funcionário");
    }
  };

  const handleReativar = async (funcionario) => {
    if (!window.confirm(`Deseja reativar o funcionário "${funcionario.nome}"?`))
      return;

    try {
      await api.put(`/funcionarios/${funcionario.cracha}`, {
        ativo: true,
        data_demissao: null,
      });
      updateFuncionarioInCache(funcionario.cracha, {
        ativo: true,
        data_demissao: null,
      });
      alert("✅ Funcionário reativado!");
      carregarFuncionarios(true);
    } catch (error) {
      console.error("Erro ao reativar:", error);
      alert(error.response?.data?.error || "Erro ao reativar funcionário");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS - MODAL HISTÓRICO
  // ═══════════════════════════════════════════════════════════════
  const formatarDataExibicao = (dataString) => {
    if (!dataString) return "-";
    const data = new Date(dataString);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);
    return data.toLocaleDateString("pt-BR");
  };

  const formatarHoraExibicao = (dataString) => {
    if (!dataString) return "-";
    const data = new Date(dataString);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);
    const horas = data.getHours();
    const minutos = data.getMinutes();
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
  };

  const calcularHorasTrabalhadas = (registro) => {
    if (!registro.hora_entrada || !registro.hora_saida) return "-";
    try {
      const ajustarFuso = (dataString) => {
        const data = new Date(dataString);
        data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);
        return data;
      };
      const entrada = ajustarFuso(registro.hora_entrada);
      const saida = ajustarFuso(registro.hora_saida);
      if (saida <= entrada) return "Inválido";
      const diffMs = saida - entrada;
      const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${String(diffHoras).padStart(2, "0")}:${String(diffMinutos).padStart(2, "0")}`;
    } catch {
      return "Erro";
    }
  };

  const handleVerHistorico = async (funcionario) => {
    setFuncionarioHistorico(funcionario);
    setFiltrosHistorico({ dataInicio: "", dataFim: "" });
    setMostrarFiltros(false);
    setModalHistoricoVisible(true);
    await carregarHistorico(funcionario.cracha);
  };

  const carregarHistorico = async (cracha, filtros = {}) => {
    try {
      setLoadingHistorico(true);
      const params = { cracha };
      if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
      if (filtros.dataFim) params.dataFim = filtros.dataFim;

      const response = await api.get(
        "/funcionarios/registros-ponto/historico",
        {
          params,
        }
      );
      setRegistrosPonto(response.data.registros || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      alert("Erro ao carregar histórico de ponto");
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleFecharModalHistorico = () => {
    setModalHistoricoVisible(false);
    setFuncionarioHistorico(null);
    setRegistrosPonto([]);
    setFiltrosHistorico({ dataInicio: "", dataFim: "" });
    setMostrarFiltros(false);
  };

  const aplicarFiltrosHistorico = async () => {
    if (funcionarioHistorico) {
      await carregarHistorico(funcionarioHistorico.cracha, filtrosHistorico);
    }
  };

  const limparFiltrosHistorico = async () => {
    setFiltrosHistorico({ dataInicio: "", dataFim: "" });
    if (funcionarioHistorico) {
      await carregarHistorico(funcionarioHistorico.cracha);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // PERMISSÕES
  // ═══════════════════════════════════════════════════════════════
  const podeEditar = isAdmin || temPermissao("funcionario_editar");
  const podeCriar = isAdmin || temPermissao("funcionario_criar");

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return <Loading variant="page" message="Carregando funcionários..." />;
  }

  return (
    <div className="funcionarios-container">
      {/* HEADER */}
      <header className="funcionarios-header">
        <div className="header-left">
          <h1>Gerenciar Funcionários</h1>
        </div>
        <div className="header-right">
          {podeCriar && (
            <button className="btn-novo" onClick={handleNovo}>
              <FiPlus size={18} />
              Novo Funcionário
            </button>
          )}
        </div>
      </header>

      {/* BARRA DE BUSCA */}
      <div className="funcionarios-search-bar">
        <div className="search-wrapper">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, crachá, setor ou função..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="btn-clear"
              onClick={() => setSearchTerm("")}
              title="Limpar busca"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
        <div className="funcionarios-search-stats">
          <span className="funcionarios-stat-item">
            <FiUserCheck size={16} />
            {totalAtivos} ativos
          </span>
          <span className="funcionarios-stat-item inactive">
            <FiUserX size={16} />
            {totalInativos} inativos
          </span>
          <span className="funcionarios-total-count">
            {funcionariosFiltrados.length} funcionário(s)
          </span>
        </div>
      </div>

      {/* LISTA DE FUNCIONÁRIOS */}
      <div className="funcionarios-list">
        {funcionariosFiltrados.length === 0 ? (
          <div className="no-results">
            <FiUsers className="empty-icon" />
            <h3>
              {searchTerm
                ? "Nenhum funcionário encontrado"
                : "Nenhum funcionário cadastrado"}
            </h3>
            <p>
              {searchTerm
                ? `Tente refinar sua busca por "${searchTerm}"`
                : "Clique em 'Novo Funcionário' para adicionar"}
            </p>
          </div>
        ) : (
          <table className="funcionarios-table">
            <thead>
              <tr>
                <th>Crachá</th>
                <th>Nome</th>
                <th>Setor</th>
                <th>Função</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcionariosFiltrados.map((funcionario) => (
                <tr
                  key={funcionario.cracha}
                  className={!funcionario.ativo ? "inactive-row" : ""}
                >
                  <td className="cracha-cell">
                    <strong>{funcionario.cracha}</strong>
                  </td>
                  <td className="nome-cell">{funcionario.nome}</td>
                  <td>{funcionario.setor || "-"}</td>
                  <td>{funcionario.funcao || "-"}</td>
                  <td>
                    <span
                      className={`funcionarios-status-badge ${funcionario.ativo ? "active" : "inactive"}`}
                    >
                      {funcionario.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="acoes">
                    <button
                      className="btn-historico"
                      onClick={() => handleVerHistorico(funcionario)}
                      title="Ver Histórico"
                    >
                      <FiClock size={16} />
                    </button>
                    {podeEditar && (
                      <>
                        <button
                          className="btn-editar"
                          onClick={() => handleEditar(funcionario)}
                          title="Editar"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          className={`btn-status ${funcionario.ativo ? "inativar" : "reativar"}`}
                          onClick={() =>
                            funcionario.ativo
                              ? handleInativar(funcionario)
                              : handleReativar(funcionario)
                          }
                          title={funcionario.ativo ? "Inativar" : "Reativar"}
                        >
                          {funcionario.ativo ? (
                            <FiUserX size={16} />
                          ) : (
                            <FiUserCheck size={16} />
                          )}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - CADASTRAR/EDITAR FUNCIONÁRIO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {modalFormVisible && (
        <div className="modal-overlay" onClick={handleFecharModalForm}>
          <div
            className="funcionarios-modal-content modal-form"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                <FiUsers className="icon" />
                {funcionarioEditando
                  ? "Editar Funcionário"
                  : "Novo Funcionário"}
              </h2>
              <button className="btn-fechar" onClick={handleFecharModalForm}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="modal-body">
              {/* Crachá - apenas para novo */}
              {!funcionarioEditando && (
                <div className="funcionarios-form-group">
                  <label htmlFor="cracha">Crachá *</label>
                  <input
                    type="text"
                    id="cracha"
                    name="cracha"
                    value={formData.cracha}
                    onChange={handleFormChange}
                    placeholder="Número do crachá"
                    maxLength={10}
                    required
                  />
                </div>
              )}

              <div className="funcionarios-form-group">
                <label htmlFor="nome">Nome Completo *</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleFormChange}
                  placeholder="NOME DO FUNCIONÁRIO"
                  required
                />
              </div>

              <div className="form-row">
                <div className="funcionarios-form-group">
                  <label htmlFor="setor">Setor *</label>
                  <select
                    id="setor"
                    name="setor"
                    value={formData.setor}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Selecione...</option>
                    {Object.keys(setoresEFuncoes).map((setor) => (
                      <option key={setor} value={setor}>
                        {setor}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="funcionarios-form-group">
                  <label htmlFor="funcao">Função *</label>
                  <select
                    id="funcao"
                    name="funcao"
                    value={formData.funcao}
                    onChange={handleFormChange}
                    required
                    disabled={!formData.setor}
                  >
                    <option value="">Selecione...</option>
                    {funcoesDisponiveis.map((funcao) => (
                      <option key={funcao} value={funcao}>
                        {funcao}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="funcionarios-form-group">
                  <label htmlFor="data_admissao">Data de Admissão</label>
                  <input
                    type="date"
                    id="data_admissao"
                    name="data_admissao"
                    value={formData.data_admissao}
                    onChange={handleFormChange}
                  />
                </div>

                {funcionarioEditando && (
                  <div className="funcionarios-form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      value={formData.ativo ? "ativo" : "inativo"}
                      onChange={handleStatusChange}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                )}
              </div>

              {funcionarioEditando && !formData.ativo && (
                <div className="funcionarios-form-group">
                  <label htmlFor="data_demissao">Data de Demissão</label>
                  <input
                    type="date"
                    id="data_demissao"
                    name="data_demissao"
                    value={formData.data_demissao}
                    onChange={handleFormChange}
                  />
                </div>
              )}

              <div className="funcionarios-modal-actions">
                <button
                  type="submit"
                  className="btn-salvar"
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={handleFecharModalForm}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL - HISTÓRICO DE PONTO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {modalHistoricoVisible && funcionarioHistorico && (
        <div className="modal-overlay" onClick={handleFecharModalHistorico}>
          <div
            className="funcionarios-modal-content modal-historico"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <h2>
                  <FiClock className="icon" />
                  Histórico de Ponto
                </h2>
                <p className="funcionario-info">
                  <strong>{funcionarioHistorico.nome}</strong> | Crachá:{" "}
                  {funcionarioHistorico.cracha} | {funcionarioHistorico.setor}
                </p>
              </div>
              <button
                className="btn-fechar"
                onClick={handleFecharModalHistorico}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Filtros */}
              <div className="historico-toolbar">
                <button
                  className="btn-filtros"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                >
                  <FiFilter size={16} />
                  Filtros
                </button>
              </div>

              {mostrarFiltros && (
                <div className="filtros-container">
                  <div className="filtros-row">
                    <div className="filtro-group">
                      <label>
                        <FiCalendar size={14} />
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={filtrosHistorico.dataInicio}
                        onChange={(e) =>
                          setFiltrosHistorico((prev) => ({
                            ...prev,
                            dataInicio: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="filtro-group">
                      <label>
                        <FiCalendar size={14} />
                        Data Fim
                      </label>
                      <input
                        type="date"
                        value={filtrosHistorico.dataFim}
                        onChange={(e) =>
                          setFiltrosHistorico((prev) => ({
                            ...prev,
                            dataFim: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="filtros-actions">
                    <button
                      className="btn-aplicar"
                      onClick={aplicarFiltrosHistorico}
                    >
                      Aplicar
                    </button>
                    <button
                      className="btn-limpar"
                      onClick={limparFiltrosHistorico}
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              )}

              {/* Tabela de Histórico */}
              <div className="historico-table-container">
                {loadingHistorico ? (
                  <Loading variant="inline" message="Carregando histórico..." />
                ) : registrosPonto.length === 0 ? (
                  <div className="no-historico">
                    <FiClock className="empty-icon" />
                    <p>Nenhum registro de ponto encontrado</p>
                  </div>
                ) : (
                  <table className="historico-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Entrada</th>
                        <th>Saída</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrosPonto.map((registro) => (
                        <tr key={registro.id}>
                          <td>{formatarDataExibicao(registro.data)}</td>
                          <td>
                            {registro.hora_entrada
                              ? formatarHoraExibicao(registro.hora_entrada)
                              : "-"}
                          </td>
                          <td>
                            {registro.hora_saida
                              ? formatarHoraExibicao(registro.hora_saida)
                              : "-"}
                          </td>
                          <td>{calcularHorasTrabalhadas(registro)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="historico-footer">
                <span>Total de registros: {registrosPonto.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
