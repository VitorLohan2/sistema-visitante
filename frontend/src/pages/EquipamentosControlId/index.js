/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Equipamentos Control iD
 * Interface de gerenciamento de equipamentos de controle de acesso Control iD
 *
 * Funcionalidades:
 * - Listar equipamentos cadastrados
 * - Cadastrar novos equipamentos
 * - Editar configurações
 * - Verificar status em tempo real
 * - Testar conexão (abrir porta/catraca)
 * - Visualizar logs de acesso
 *
 * Permissões RBAC:
 * - controlid_visualizar: Visualizar equipamentos
 * - controlid_status: Ver status em tempo real
 * - controlid_cadastrar: Cadastrar novos equipamentos
 * - controlid_editar: Editar equipamentos
 * - controlid_excluir: Excluir equipamentos
 * - controlid_abrir_porta: Abrir portas/relés
 * - controlid_liberar_catraca: Liberar catracas
 * - controlid_gerenciar: Acesso total (admin)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  FiWifi,
  FiWifiOff,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiRefreshCw,
  FiSettings,
  FiActivity,
  FiUnlock,
  FiInfo,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiServer,
  FiCpu,
  FiLayers,
} from "react-icons/fi";
import { usePermissoes } from "../../hooks/usePermissoes";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import controlIdService from "../../services/controlIdService";
import Loading from "../../components/Loading";
import "./styles.css";

// Modelos de equipamentos Control iD com ícones
const MODELOS_INFO = {
  iDUHF: { nome: "iDUHF", tipo: "Leitor UHF", icon: "📡" },
  iDFace: { nome: "iDFace", tipo: "Reconhecimento Facial", icon: "👤" },
  "iDFace Max": {
    nome: "iDFace Max",
    tipo: "Reconhecimento Facial",
    icon: "👤",
  },
  iDBlock: { nome: "iDBlock", tipo: "Leitor de Acesso", icon: "🔐" },
  "iDBlock Next": {
    nome: "iDBlock Next",
    tipo: "Leitor de Acesso",
    icon: "🔐",
  },
  iDFlex: { nome: "iDFlex", tipo: "Controlador de Acesso", icon: "🎛️" },
  iDAccess: { nome: "iDAccess", tipo: "Controle de Acesso", icon: "🚪" },
  "iDAccess Pro": {
    nome: "iDAccess Pro",
    tipo: "Controle de Acesso Pro",
    icon: "🚪",
  },
  "iDAccess Nano": {
    nome: "iDAccess Nano",
    tipo: "Controle de Acesso Nano",
    icon: "🚪",
  },
  iDBox: { nome: "iDBox", tipo: "SecBox", icon: "📦" },
  iDFit: { nome: "iDFit", tipo: "Biométrico", icon: "☝️" },
};

export default function EquipamentosControlId() {
  // ═══════════════════════════════════════════════════════════════════════════
  // HOOKS E PERMISSÕES
  // ═══════════════════════════════════════════════════════════════════════════
  const { temPermissao, loading: permissoesLoading } = usePermissoes();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const podeVisualizar = temPermissao("controlid_visualizar");
  const podeStatus = temPermissao("controlid_status");
  const podeCadastrar = temPermissao("controlid_cadastrar");
  const podeEditar = temPermissao("controlid_editar");
  const podeExcluir = temPermissao("controlid_excluir");
  const podeAbrirPorta = temPermissao("controlid_abrir_porta");
  const podeLiberarCatraca = temPermissao("controlid_liberar_catraca");
  const podeGerenciar = temPermissao("controlid_gerenciar");

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════════════════
  const [dispositivos, setDispositivos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [servicoOnline, setServicoOnline] = useState(null);
  const [verificandoStatus, setVerificandoStatus] = useState({});

  // Busca
  const [termoBusca, setTermoBusca] = useState("");

  // Modal de formulário
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Formulário
  const [formData, setFormData] = useState({
    name: "",
    ip: "",
    port: 80,
    login: "admin",
    password: "admin",
    model: "iDUHF",
    description: "",
    location: "",
  });
  const [formErros, setFormErros] = useState({});

  // Modal de detalhes
  const [dispositivoDetalhes, setDispositivoDetalhes] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR DADOS
  // ═══════════════════════════════════════════════════════════════════════════
  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      // Verificar se o microserviço está online
      const health = await controlIdService.healthCheck();
      setServicoOnline(health.online);

      if (!health.online) {
        setErro(
          "O serviço de equipamentos Control iD não está disponível. Verifique se o microserviço está rodando.",
        );
        setLoading(false);
        return;
      }

      // Carregar dispositivos e modelos em paralelo
      const [dispositivosResponse, modelosResponse] = await Promise.all([
        controlIdService.listarDispositivos(),
        controlIdService
          .listarModelos()
          .catch(() => ({ models: Object.keys(MODELOS_INFO) })),
      ]);

      // A API retorna { success, data, total } - usar 'data' ou 'devices'
      setDispositivos(
        dispositivosResponse.data || dispositivosResponse.devices || [],
      );
      setModelos(modelosResponse.models || Object.keys(MODELOS_INFO));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setErro(error.message || "Erro ao carregar equipamentos");
      setServicoOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar ao montar
  useEffect(() => {
    if (!permissoesLoading && podeVisualizar) {
      carregarDados();
    }
  }, [permissoesLoading, podeVisualizar, carregarDados]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICAR STATUS DE UM DISPOSITIVO
  // ═══════════════════════════════════════════════════════════════════════════
  const verificarStatusDispositivo = async (id) => {
    setVerificandoStatus((prev) => ({ ...prev, [id]: true }));

    try {
      const status = await controlIdService.verificarStatus(id);

      // Atualizar dispositivo na lista
      setDispositivos((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: status.online ? "online" : "offline",
                last_status_check: new Date().toISOString(),
              }
            : d,
        ),
      );

      showToast(
        status.online ? "Dispositivo online!" : "Dispositivo offline",
        status.online ? "success" : "warning",
      );
    } catch (error) {
      showToast(error.message || "Erro ao verificar status", "error");
    } finally {
      setVerificandoStatus((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ABRIR PORTA
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAbrirPorta = async (dispositivo) => {
    const confirmado = await confirm({
      title: "Abrir Porta",
      message: `Deseja abrir a porta do equipamento "${dispositivo.name}"?`,
      confirmText: "Abrir Porta",
      variant: "warning",
    });

    if (!confirmado) return;

    try {
      await controlIdService.abrirPorta(dispositivo.id, 1);
      showToast("Porta aberta com sucesso!", "success");
    } catch (error) {
      showToast(error.message || "Erro ao abrir porta", "error");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LIBERAR CATRACA
  // ═══════════════════════════════════════════════════════════════════════════
  const handleLiberarCatraca = async (dispositivo) => {
    const confirmado = await confirm({
      title: "Liberar Catraca",
      message: `Deseja liberar a catraca do equipamento "${dispositivo.name}"?`,
      confirmText: "Liberar",
      variant: "warning",
    });

    if (!confirmado) return;

    try {
      await controlIdService.liberarCatraca(dispositivo.id, "clockwise");
      showToast("Catraca liberada com sucesso!", "success");
    } catch (error) {
      showToast(error.message || "Erro ao liberar catraca", "error");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD - FORMULÁRIO
  // ═══════════════════════════════════════════════════════════════════════════
  const abrirModal = (dispositivo = null) => {
    if (dispositivo) {
      setEditando(dispositivo);
      setFormData({
        name: dispositivo.name || "",
        ip: dispositivo.ip || "",
        port: dispositivo.port || 80,
        login: dispositivo.login || "admin",
        password: "", // Não exibir senha
        model: dispositivo.model || "iDUHF",
        description: dispositivo.description || "",
        location: dispositivo.location || "",
      });
    } else {
      setEditando(null);
      setFormData({
        name: "",
        ip: "",
        port: 80,
        login: "admin",
        password: "admin",
        model: "iDUHF",
        description: "",
        location: "",
      });
    }
    setFormErros({});
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setFormErros({});
  };

  const validarFormulario = () => {
    const erros = {};

    if (!formData.name.trim()) {
      erros.name = "Nome é obrigatório";
    }

    if (!formData.ip.trim()) {
      erros.ip = "IP é obrigatório";
    } else {
      // Validar formato IP
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(formData.ip)) {
        erros.ip = "IP inválido";
      }
    }

    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      erros.port = "Porta inválida (1-65535)";
    }

    setFormErros(erros);
    return Object.keys(erros).length === 0;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) return;

    setSalvando(true);

    try {
      const dados = { ...formData };

      // Se editando e senha vazia, remover do payload
      if (editando && !dados.password) {
        delete dados.password;
      }

      if (editando) {
        await controlIdService.atualizarDispositivo(editando.id, dados);
        showToast("Equipamento atualizado com sucesso!", "success");
      } else {
        await controlIdService.cadastrarDispositivo(dados);
        showToast("Equipamento cadastrado com sucesso!", "success");
      }

      fecharModal();
      carregarDados();
    } catch (error) {
      showToast(error.message || "Erro ao salvar equipamento", "error");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (dispositivo) => {
    const confirmado = await confirm({
      title: "Excluir Equipamento",
      message: `Deseja realmente excluir o equipamento "${dispositivo.name}"? Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      variant: "danger",
    });

    if (!confirmado) return;

    try {
      await controlIdService.removerDispositivo(dispositivo.id);
      showToast("Equipamento excluído com sucesso!", "success");
      carregarDados();
    } catch (error) {
      showToast(error.message || "Erro ao excluir equipamento", "error");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VER DETALHES DO DISPOSITIVO
  // ═══════════════════════════════════════════════════════════════════════════
  const verDetalhes = async (dispositivo) => {
    setDispositivoDetalhes(dispositivo);
    setCarregandoDetalhes(true);

    try {
      const info = await controlIdService.buscarInfoSistema(dispositivo.id);
      setDispositivoDetalhes({ ...dispositivo, systemInfo: info });
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTRAR DISPOSITIVOS
  // ═══════════════════════════════════════════════════════════════════════════
  const dispositivosFiltrados = dispositivos.filter((d) => {
    const termo = termoBusca.toLowerCase();
    return (
      d.name?.toLowerCase().includes(termo) ||
      d.ip?.toLowerCase().includes(termo) ||
      d.model?.toLowerCase().includes(termo) ||
      d.location?.toLowerCase().includes(termo)
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO CONDICIONAL
  // ═══════════════════════════════════════════════════════════════════════════
  if (permissoesLoading) {
    return <Loading />;
  }

  if (!podeVisualizar) {
    return (
      <div className="controlid-page">
        <div className="controlid-erro">
          <FiAlertTriangle size={48} />
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="controlid-page">
      {/* Header */}
      <header className="controlid-header">
        <div className="controlid-header-content">
          <div className="controlid-header-title">
            <FiServer size={28} />
            <div>
              <h1>Equipamentos Control iD</h1>
              <p>Gerenciamento de dispositivos de controle de acesso</p>
            </div>
          </div>

          <div className="controlid-header-actions">
            {/* Status do serviço */}
            <div
              className={`controlid-service-status ${servicoOnline ? "online" : "offline"}`}
            >
              {servicoOnline ? <FiCheckCircle /> : <FiXCircle />}
              <span>Serviço {servicoOnline ? "Online" : "Offline"}</span>
            </div>

            {/* Botão atualizar */}
            <button
              className="btn-secondary"
              onClick={carregarDados}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "spin" : ""} />
              Atualizar
            </button>

            {/* Botão cadastrar */}
            {podeCadastrar && (
              <button
                className="btn-primary"
                onClick={() => abrirModal()}
                disabled={!servicoOnline}
              >
                <FiPlus />
                Novo Equipamento
              </button>
            )}
          </div>
        </div>

        {/* Barra de busca */}
        <div className="controlid-search-bar">
          <FiSearch />
          <input
            type="text"
            placeholder="Buscar por nome, IP, modelo ou localização..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="controlid-content">
        {loading ? (
          <div className="controlid-loading">
            <Loading />
            <p>Carregando equipamentos...</p>
          </div>
        ) : erro ? (
          <div className="controlid-erro">
            <FiAlertTriangle size={48} />
            <h2>Erro ao carregar</h2>
            <p>{erro}</p>
            <button className="btn-primary" onClick={carregarDados}>
              <FiRefreshCw /> Tentar novamente
            </button>
          </div>
        ) : dispositivosFiltrados.length === 0 ? (
          <div className="controlid-vazio">
            <FiServer size={48} />
            <h2>Nenhum equipamento encontrado</h2>
            <p>
              {dispositivos.length === 0
                ? "Cadastre seu primeiro equipamento Control iD."
                : "Nenhum equipamento corresponde à busca."}
            </p>
            {podeCadastrar && dispositivos.length === 0 && (
              <button className="btn-primary" onClick={() => abrirModal()}>
                <FiPlus /> Cadastrar Equipamento
              </button>
            )}
          </div>
        ) : (
          <div className="controlid-grid">
            {dispositivosFiltrados.map((dispositivo) => (
              <div
                key={dispositivo.id}
                className={`controlid-card ${dispositivo.status || "unknown"}`}
              >
                {/* Header do card */}
                <div className="controlid-card-header">
                  <div className="controlid-card-icon">
                    <span>{MODELOS_INFO[dispositivo.model]?.icon || "📡"}</span>
                  </div>
                  <div className="controlid-card-status">
                    {dispositivo.status === "online" ? (
                      <span className="status-badge online">
                        <FiWifi /> Online
                      </span>
                    ) : dispositivo.status === "offline" ? (
                      <span className="status-badge offline">
                        <FiWifiOff /> Offline
                      </span>
                    ) : (
                      <span className="status-badge unknown">
                        <FiActivity /> Desconhecido
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo do card */}
                <div className="controlid-card-body">
                  <h3>{dispositivo.name}</h3>
                  <div className="controlid-card-info">
                    <p>
                      <FiCpu /> <strong>Modelo:</strong> {dispositivo.model}
                    </p>
                    <p>
                      <FiServer /> <strong>IP:</strong> {dispositivo.ip}:
                      {dispositivo.port}
                    </p>
                    {dispositivo.location && (
                      <p>
                        <FiLayers /> <strong>Local:</strong>{" "}
                        {dispositivo.location}
                      </p>
                    )}
                    {dispositivo.last_status_check && (
                      <p className="controlid-card-timestamp">
                        <FiClock /> Última verificação:{" "}
                        {new Date(dispositivo.last_status_check).toLocaleString(
                          "pt-BR",
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações do card */}
                <div className="controlid-card-actions">
                  {/* Verificar status */}
                  {podeStatus && (
                    <button
                      className="controlid-action-btn status"
                      onClick={() => verificarStatusDispositivo(dispositivo.id)}
                      disabled={verificandoStatus[dispositivo.id]}
                      title="Verificar Status"
                    >
                      {verificandoStatus[dispositivo.id] ? (
                        <FiRefreshCw className="spin" />
                      ) : (
                        <FiActivity />
                      )}
                    </button>
                  )}

                  {/* Abrir porta */}
                  {podeAbrirPorta && dispositivo.status === "online" && (
                    <button
                      className="controlid-action-btn unlock"
                      onClick={() => handleAbrirPorta(dispositivo)}
                      title="Abrir Porta"
                    >
                      <FiUnlock />
                    </button>
                  )}

                  {/* Ver detalhes */}
                  <button
                    className="controlid-action-btn info"
                    onClick={() => verDetalhes(dispositivo)}
                    title="Ver Detalhes"
                  >
                    <FiInfo />
                  </button>

                  {/* Editar */}
                  {podeEditar && (
                    <button
                      className="controlid-action-btn edit"
                      onClick={() => abrirModal(dispositivo)}
                      title="Editar"
                    >
                      <FiEdit2 />
                    </button>
                  )}

                  {/* Excluir */}
                  {podeExcluir && (
                    <button
                      className="controlid-action-btn delete"
                      onClick={() => handleExcluir(dispositivo)}
                      title="Excluir"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Formulário */}
      {modalAberto && (
        <div className="controlid-modal-overlay" onClick={fecharModal}>
          <div className="controlid-modal" onClick={(e) => e.stopPropagation()}>
            <div className="controlid-modal-header">
              <h2>{editando ? "Editar Equipamento" : "Novo Equipamento"}</h2>
              <button className="controlid-modal-close" onClick={fecharModal}>
                ×
              </button>
            </div>

            <div className="controlid-modal-body">
              <div className="controlid-form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Entrada Principal"
                  className={formErros.name ? "error" : ""}
                />
                {formErros.name && (
                  <span className="controlid-form-error">{formErros.name}</span>
                )}
              </div>

              <div className="controlid-form-row">
                <div className="controlid-form-group">
                  <label>Endereço IP *</label>
                  <input
                    type="text"
                    value={formData.ip}
                    onChange={(e) =>
                      setFormData({ ...formData, ip: e.target.value })
                    }
                    placeholder="Ex: 192.168.1.100"
                    className={formErros.ip ? "error" : ""}
                  />
                  {formErros.ip && (
                    <span className="controlid-form-error">{formErros.ip}</span>
                  )}
                </div>

                <div className="controlid-form-group">
                  <label>Porta</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        port: parseInt(e.target.value) || 80,
                      })
                    }
                    min="1"
                    max="65535"
                    className={formErros.port ? "error" : ""}
                  />
                  {formErros.port && (
                    <span className="controlid-form-error">
                      {formErros.port}
                    </span>
                  )}
                </div>
              </div>

              <div className="controlid-form-group">
                <label>Modelo</label>
                <select
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                >
                  {modelos.map((modelo) => (
                    <option key={modelo} value={modelo}>
                      {MODELOS_INFO[modelo]?.icon || "📡"} {modelo} -{" "}
                      {MODELOS_INFO[modelo]?.tipo || "Equipamento"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="controlid-form-row">
                <div className="controlid-form-group">
                  <label>Login</label>
                  <input
                    type="text"
                    value={formData.login}
                    onChange={(e) =>
                      setFormData({ ...formData, login: e.target.value })
                    }
                    placeholder="admin"
                  />
                </div>

                <div className="controlid-form-group">
                  <label>Senha {editando && "(deixe vazio para manter)"}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={editando ? "••••••" : "admin"}
                  />
                </div>
              </div>

              <div className="controlid-form-group">
                <label>Localização</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Ex: Portaria Principal"
                />
              </div>

              <div className="controlid-form-group">
                <label>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Observações sobre o equipamento..."
                  rows={3}
                />
              </div>
            </div>

            <div className="controlid-modal-footer">
              <button
                className="btn-primary"
                onClick={handleSalvar}
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <FiRefreshCw className="spin" /> Salvando...
                  </>
                ) : (
                  <>
                    {editando ? <FiEdit2 /> : <FiPlus />}
                    {editando ? "Salvar Alterações" : "Cadastrar"}
                  </>
                )}
              </button>
              <button
                className="btn-secondary"
                onClick={fecharModal}
                disabled={salvando}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {dispositivoDetalhes && (
        <div
          className="controlid-modal-overlay"
          onClick={() => setDispositivoDetalhes(null)}
        >
          <div
            className="controlid-modal controlid-modal-detalhes"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="controlid-modal-header">
              <h2>
                {MODELOS_INFO[dispositivoDetalhes.model]?.icon || "📡"}{" "}
                {dispositivoDetalhes.name}
              </h2>
              <button
                className="controlid-modal-close"
                onClick={() => setDispositivoDetalhes(null)}
              >
                ×
              </button>
            </div>

            <div className="controlid-modal-body">
              {carregandoDetalhes ? (
                <div className="controlid-loading-detalhes">
                  <FiRefreshCw className="spin" />
                  <p>Carregando informações...</p>
                </div>
              ) : (
                <>
                  <div className="controlid-detalhes-section">
                    <h3>
                      <FiSettings /> Configuração
                    </h3>
                    <div className="controlid-detalhes-grid">
                      <div>
                        <strong>Modelo:</strong>
                        <span>{dispositivoDetalhes.model}</span>
                      </div>
                      <div>
                        <strong>IP:</strong>
                        <span>
                          {dispositivoDetalhes.ip}:{dispositivoDetalhes.port}
                        </span>
                      </div>
                      <div>
                        <strong>Status:</strong>
                        <span
                          className={`status-badge ${dispositivoDetalhes.status || "unknown"}`}
                        >
                          {dispositivoDetalhes.status || "Desconhecido"}
                        </span>
                      </div>
                      {dispositivoDetalhes.location && (
                        <div>
                          <strong>Localização:</strong>
                          <span>{dispositivoDetalhes.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {dispositivoDetalhes.systemInfo && (
                    <div className="controlid-detalhes-section">
                      <h3>
                        <FiInfo /> Informações do Sistema
                      </h3>
                      <div className="controlid-detalhes-grid">
                        {dispositivoDetalhes.systemInfo.serial_number && (
                          <div>
                            <strong>Número de Série:</strong>
                            <span>
                              {dispositivoDetalhes.systemInfo.serial_number}
                            </span>
                          </div>
                        )}
                        {dispositivoDetalhes.systemInfo.firmware_version && (
                          <div>
                            <strong>Firmware:</strong>
                            <span>
                              {dispositivoDetalhes.systemInfo.firmware_version}
                            </span>
                          </div>
                        )}
                        {dispositivoDetalhes.systemInfo.device_name && (
                          <div>
                            <strong>Nome do Dispositivo:</strong>
                            <span>
                              {dispositivoDetalhes.systemInfo.device_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {dispositivoDetalhes.description && (
                    <div className="controlid-detalhes-section">
                      <h3>
                        <FiInfo /> Descrição
                      </h3>
                      <p>{dispositivoDetalhes.description}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="controlid-modal-footer">
              {podeAbrirPorta && dispositivoDetalhes.status === "online" && (
                <button
                  className="controlid-btn-warning"
                  onClick={() => {
                    handleAbrirPorta(dispositivoDetalhes);
                  }}
                >
                  <FiUnlock /> Abrir Porta
                </button>
              )}
              <button
                className="btn-secondary"
                onClick={() => setDispositivoDetalhes(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmação */}
      <ConfirmDialog />
    </div>
  );
}
