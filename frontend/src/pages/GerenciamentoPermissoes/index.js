import logger from "../../utils/logger";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GERENCIAMENTO DE PERMISSÕES - Página de Administração de RBAC
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dados: Carregados do cache (useDataLoader é responsável pelo carregamento inicial)
 * Atualização: Via Socket.IO em tempo real
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// src/pages/GerenciamentoPermissoes/index.js
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiUsers,
  FiShield,
  FiKey,
  FiCheck,
  FiX,
  FiEdit2,
  FiSave,
  FiUserPlus,
} from "react-icons/fi";
import api from "../../services/api";
import { getCache, setCache } from "../../services/cacheService";
import * as socketService from "../../services/socketService";
import Loading from "../../components/Loading";
import { useSocket } from "../../hooks/useSocket";
import "./styles.css";

export default function GerenciamentoPermissoes() {
  // Manter conexão do socket ativa
  useSocket();

  // ═══════════════════════════════════════════════════════════════
  // DADOS DO CACHE (carregados pelo useDataLoader)
  // ═══════════════════════════════════════════════════════════════
  const [usuarios, setUsuarios] = useState(() => getCache("allUsuarios") || []);
  const [papeis, setPapeis] = useState(() => getCache("allPapeis") || []);
  const [permissoes, setPermissoes] = useState(
    () => getCache("allPermissoes") || [],
  );

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usuarios"); // usuarios, papeis, permissoes, cadastro
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [editandoPapel, setEditandoPapel] = useState(null);
  const [papeisSelecionados, setPapeisSelecionados] = useState([]);
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState([]);
  const socketListenersRef = useRef([]);

  // Estados para cadastro de usuário interno
  const [empresas, setEmpresas] = useState(
    () => getCache("empresasVisitantes") || [],
  );
  const [setores, setSetores] = useState(
    () => getCache("setoresVisitantes") || [],
  );
  const [cadastrando, setCadastrando] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: "",
    data_nascimento: "",
    cpf: "",
    email: "",
    whatsapp: "",
    empresa_id: "",
    setor_id: "",
    cidade: "",
    uf: "",
    papel_id: "", // Papel do usuário (vincula com usuarios_papeis)
    senha: "",
  });

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO DE DADOS - Primeiro do cache, depois API se necessário
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    carregarDados();
    carregarEmpresasSetores();
  }, []);

  const carregarDados = async (forceRefresh = false) => {
    try {
      setLoading(true);

      // ✅ Primeiro verifica se já tem dados no cache
      const cachedUsuarios = getCache("allUsuarios");
      const cachedPapeis = getCache("allPapeis");
      const cachedPermissoes = getCache("allPermissoes");

      if (cachedUsuarios && cachedPapeis && cachedPermissoes && !forceRefresh) {
        logger.log("📦 Usando dados de permissões do cache");
        setUsuarios(cachedUsuarios);
        setPapeis(cachedPapeis);
        setPermissoes(cachedPermissoes);
        setLoading(false);
        return;
      }

      // Se não tem cache ou forceRefresh, busca da API
      const [usuariosRes, papeisRes, permissoesRes] = await Promise.all([
        api.get("/usuarios-papeis"),
        api.get("/papeis"),
        api.get("/permissoes"),
      ]);

      const usuariosData = usuariosRes.data;
      const papeisData = papeisRes.data;
      const permissoesData = permissoesRes.data;

      setUsuarios(usuariosData);
      setPapeis(papeisData);
      setPermissoes(permissoesData);

      // Salva no cache
      setCache("allUsuarios", usuariosData);
      setCache("allPapeis", papeisData);
      setCache("allPermissoes", permissoesData);
    } catch (error) {
      logger.error("Erro ao carregar dados:", error);
      alert("Erro ao carregar dados de permissões");
    } finally {
      setLoading(false);
    }
  };

  const carregarEmpresasSetores = async () => {
    try {
      // ✅ Primeiro verifica se já tem no cache
      const cachedEmpresas = getCache("empresasVisitantes");
      const cachedSetores = getCache("setoresVisitantes");

      if (cachedEmpresas && cachedSetores) {
        logger.log("📦 Usando empresas e setores do cache");
        setEmpresas(cachedEmpresas);
        setSetores(cachedSetores);
        return;
      }

      // Se não tem cache, busca da API
      const [empresasRes, setoresRes] = await Promise.all([
        api.get("/empresas"),
        api.get("/setores"),
      ]);

      setEmpresas(empresasRes.data);
      setSetores(setoresRes.data);
    } catch (error) {
      logger.error("Erro ao carregar empresas/setores:", error);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO - Sincronização em tempo real
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // Limpa listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // Listener: Usuário atualizado (papéis alterados)
    const unsubUsuarioUpdate = socketService.on(
      "usuario:papeis-updated",
      (dados) => {
        logger.log("📝 Socket: Papéis do usuário atualizados", dados.id);
        setUsuarios((prev) => {
          const novos = prev.map((u) =>
            u.id === dados.id ? { ...u, ...dados } : u,
          );
          setCache("allUsuarios", novos);
          return novos;
        });
      },
    );

    // Listener: Papel atualizado (permissões alteradas)
    const unsubPapelUpdate = socketService.on(
      "papel:permissoes-updated",
      (dados) => {
        logger.log("📝 Socket: Permissões do papel atualizadas", dados.id);
        setPapeis((prev) => {
          const novos = prev.map((p) =>
            p.id === dados.id ? { ...p, ...dados } : p,
          );
          setCache("allPapeis", novos);
          return novos;
        });
      },
    );

    socketListenersRef.current.push(unsubUsuarioUpdate, unsubPapelUpdate);

    // Cleanup ao desmontar
    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES DE USUÁRIOS
  // ═══════════════════════════════════════════════════════════════

  const iniciarEdicaoUsuario = (usuario) => {
    setEditandoUsuario(usuario.id);
    setPapeisSelecionados(usuario.papeis.map((p) => p.id));
  };

  const cancelarEdicaoUsuario = () => {
    setEditandoUsuario(null);
    setPapeisSelecionados([]);
  };

  const togglePapelUsuario = (papelId) => {
    setPapeisSelecionados((prev) =>
      prev.includes(papelId)
        ? prev.filter((id) => id !== papelId)
        : [...prev, papelId],
    );
  };

  const salvarPapeisUsuario = async (usuarioId) => {
    try {
      await api.post(`/usuarios-papeis/${usuarioId}/papeis`, {
        papel_ids: papeisSelecionados,
      });

      alert("Papéis atualizados com sucesso!");
      setEditandoUsuario(null);
      setPapeisSelecionados([]);
      carregarDados();
    } catch (error) {
      logger.error("Erro ao salvar papéis:", error);
      alert(error.response?.data?.error || "Erro ao salvar papéis");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES DE PAPÉIS
  // ═══════════════════════════════════════════════════════════════

  const carregarPermissoesPapel = async (papelId) => {
    try {
      const response = await api.get(`/papeis/${papelId}`);
      setEditandoPapel(response.data);
      setPermissoesSelecionadas(response.data.permissoes.map((p) => p.id));
    } catch (error) {
      logger.error("Erro ao carregar permissões do papel:", error);
    }
  };

  const cancelarEdicaoPapel = () => {
    setEditandoPapel(null);
    setPermissoesSelecionadas([]);
  };

  const togglePermissaoPapel = (permissaoId) => {
    setPermissoesSelecionadas((prev) =>
      prev.includes(permissaoId)
        ? prev.filter((id) => id !== permissaoId)
        : [...prev, permissaoId],
    );
  };

  const salvarPermissoesPapel = async () => {
    if (!editandoPapel) return;

    try {
      await api.post(`/papeis/${editandoPapel.id}/permissoes`, {
        permissao_ids: permissoesSelecionadas,
      });

      alert("Permissões atualizadas com sucesso!");
      setEditandoPapel(null);
      setPermissoesSelecionadas([]);
      carregarDados();
    } catch (error) {
      logger.error("Erro ao salvar permissões:", error);
      alert(error.response?.data?.error || "Erro ao salvar permissões");
    }
  };

  const selecionarTodasPermissoes = () => {
    setPermissoesSelecionadas(permissoes.map((p) => p.id));
  };

  const limparTodasPermissoes = () => {
    setPermissoesSelecionadas([]);
  };

  // ═══════════════════════════════════════════════════════════════
  // AGRUPAMENTO DE PERMISSÕES POR MÓDULO
  // ═══════════════════════════════════════════════════════════════

  const agruparPermissoesPorModulo = () => {
    return permissoes.reduce((acc, perm) => {
      const modulo = perm.chave.split("_")[0];
      if (!acc[modulo]) {
        acc[modulo] = [];
      }
      acc[modulo].push(perm);
      return acc;
    }, {});
  };

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES DE CADASTRO DE USUÁRIO INTERNO
  // ═══════════════════════════════════════════════════════════════

  const estadosECidades = {
    AC: ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira"],
    AL: ["Maceió", "Arapiraca", "Rio Largo"],
    AM: ["Manaus", "Parintins", "Itacoatiara"],
    AP: ["Macapá", "Santana", "Laranjal do Jari"],
    BA: ["Salvador", "Feira de Santana", "Vitória da Conquista"],
    CE: ["Fortaleza", "Caucaia", "Juazeiro do Norte"],
    DF: ["Brasília"],
    ES: ["Vitória", "Vila Velha", "Cariacica"],
    GO: ["Goiânia", "Aparecida de Goiânia", "Anápolis"],
    MA: ["São Luís", "Imperatriz", "Timon"],
    MG: ["Belo Horizonte", "Uberlândia", "Contagem"],
    MS: ["Campo Grande", "Dourados", "Três Lagoas"],
    MT: ["Cuiabá", "Várzea Grande", "Rondonópolis"],
    PA: ["Belém", "Ananindeua", "Santarém"],
    PB: ["João Pessoa", "Campina Grande", "Santa Rita"],
    PE: ["Recife", "Jaboatão dos Guararapes", "Olinda"],
    PI: ["Teresina", "Parnaíba", "Picos"],
    PR: ["Curitiba", "Londrina", "Maringá"],
    RJ: ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias"],
    RN: ["Natal", "Mossoró", "Parnamirim"],
    RO: ["Porto Velho", "Ji-Paraná", "Ariquemes"],
    RR: ["Boa Vista", "Rorainópolis", "Caracaraí"],
    RS: ["Porto Alegre", "Caxias do Sul", "Pelotas"],
    SC: ["Florianópolis", "Joinville", "Blumenau"],
    SE: ["Aracaju", "Nossa Senhora do Socorro", "Lagarto"],
    SP: ["São Paulo", "Guarulhos", "Campinas"],
    TO: ["Palmas", "Araguaína", "Gurupi"],
  };

  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    }
    return cleaned;
  };

  const formatWhatsapp = (value) => {
    return value.replace(/\D/g, "").slice(0, 11);
  };

  const handleNovoUsuarioChange = (e) => {
    const { name, value } = e.target;

    if (name === "cpf") {
      setNovoUsuario((prev) => ({ ...prev, cpf: formatCPF(value) }));
    } else if (name === "whatsapp") {
      setNovoUsuario((prev) => ({ ...prev, whatsapp: formatWhatsapp(value) }));
    } else if (name === "nome") {
      setNovoUsuario((prev) => ({ ...prev, nome: value.toUpperCase() }));
    } else if (name === "uf") {
      setNovoUsuario((prev) => ({ ...prev, uf: value, cidade: "" }));
    } else {
      setNovoUsuario((prev) => ({ ...prev, [name]: value }));
    }
  };

  const limparFormularioCadastro = () => {
    setNovoUsuario({
      nome: "",
      data_nascimento: "",
      cpf: "",
      email: "",
      whatsapp: "",
      empresa_id: "",
      setor_id: "",
      cidade: "",
      uf: "",
      papel_id: "",
      senha: "",
    });
  };

  const handleCadastrarUsuario = async (e) => {
    e.preventDefault();

    // Validações
    const cleanedCpf = novoUsuario.cpf.replace(/\D/g, "");
    if (cleanedCpf.length !== 11) {
      alert("O CPF deve conter 11 dígitos.");
      return;
    }

    if (!novoUsuario.email || !novoUsuario.email.includes("@")) {
      alert("Digite um email válido.");
      return;
    }

    if (!novoUsuario.nome.trim()) {
      alert("Digite o nome do usuário.");
      return;
    }

    if (!novoUsuario.papel_id) {
      alert("Selecione o papel do usuário.");
      return;
    }

    // Valida senha obrigatória
    if (!novoUsuario.senha || novoUsuario.senha.length < 6) {
      alert("A senha é obrigatória e deve ter no mínimo 6 caracteres.");
      return;
    }

    setCadastrando(true);

    try {
      const response = await api.post("/usuarios/interno", {
        nome: novoUsuario.nome.trim(),
        data_nascimento: novoUsuario.data_nascimento || null,
        cpf: novoUsuario.cpf, // Mantém CPF com formatação (pontos e hífen)
        email: novoUsuario.email.toLowerCase(),
        whatsapp: novoUsuario.whatsapp || null,
        empresa_id: novoUsuario.empresa_id
          ? parseInt(novoUsuario.empresa_id)
          : null,
        setor_id: novoUsuario.setor_id ? parseInt(novoUsuario.setor_id) : null,
        cidade: novoUsuario.cidade || null,
        uf: novoUsuario.uf || null,
        papel_id: parseInt(novoUsuario.papel_id),
        senha: novoUsuario.senha,
      });

      alert(`✅ Usuário cadastrado com sucesso!\nID: ${response.data.id}`);
      limparFormularioCadastro();
      carregarDados(); // Recarrega lista de usuários
      setActiveTab("usuarios"); // Volta para aba de usuários
    } catch (error) {
      logger.error("Erro ao cadastrar usuário:", error);
      logger.error("Resposta do servidor:", error.response?.data);
      alert(error.response?.data?.error || "Erro ao cadastrar usuário");
    } finally {
      setCadastrando(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return <Loading variant="page" message="Carregando permissões..." />;
  }

  return (
    <div className="gerenciamento-container">
      <header className="gerenciamento-header">
        <div className="header-content">
          <h1>Gerenciamento de Permissões</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === "usuarios" ? "active" : ""}`}
          onClick={() => setActiveTab("usuarios")}
        >
          <FiUsers size={18} />
          Usuários
        </button>
        <button
          className={`tab-button ${activeTab === "papeis" ? "active" : ""}`}
          onClick={() => setActiveTab("papeis")}
        >
          <FiShield size={18} />
          Papéis
        </button>
        <button
          className={`tab-button ${activeTab === "permissoes" ? "active" : ""}`}
          onClick={() => setActiveTab("permissoes")}
        >
          <FiKey size={18} />
          Permissões
        </button>
        <button
          className={`tab-button ${activeTab === "cadastro" ? "active" : ""}`}
          onClick={() => setActiveTab("cadastro")}
        >
          <FiUserPlus size={18} />
          Novo Usuário
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="tab-content">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: USUÁRIOS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "usuarios" && (
          <div className="usuarios-section">
            <h2>Usuários e seus Papéis</h2>
            <p className="section-description">
              Atribua papéis aos usuários para definir suas permissões no
              sistema.
            </p>

            <div className="usuarios-grid">
              {usuarios.map((usuario) => (
                <div key={usuario.id} className="usuario-card">
                  <div className="usuario-info">
                    <h3>{usuario.name}</h3>
                    <span className="usuario-email">{usuario.email}</span>
                  </div>

                  {editandoUsuario === usuario.id ? (
                    <div className="usuario-edit">
                      <div className="papeis-checkboxes">
                        {papeis.map((papel) => (
                          <label key={papel.id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={papeisSelecionados.includes(papel.id)}
                              onChange={() => togglePapelUsuario(papel.id)}
                            />
                            <span
                              className={`papel-badge ${papel.nome.toLowerCase()}`}
                            >
                              {papel.nome}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="edit-actions">
                        <button
                          className="btn-save"
                          onClick={() => salvarPapeisUsuario(usuario.id)}
                        >
                          <FiSave size={14} /> Salvar
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={cancelarEdicaoUsuario}
                        >
                          <FiX size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="usuario-papeis">
                      <div className="papeis-list">
                        {usuario.papeis.length > 0 ? (
                          usuario.papeis.map((papel) => (
                            <span
                              key={papel.id}
                              className={`papel-badge ${papel.nome.toLowerCase()}`}
                            >
                              {papel.nome}
                            </span>
                          ))
                        ) : (
                          <span className="sem-papel">Sem papel atribuído</span>
                        )}
                      </div>
                      <button
                        className="btn-edit"
                        onClick={() => iniciarEdicaoUsuario(usuario)}
                      >
                        <FiEdit2 size={14} /> Editar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: PAPÉIS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "papeis" && (
          <div className="papeis-section">
            <h2>Papéis e suas Permissões</h2>
            <p className="section-description">
              Configure as permissões de cada papel do sistema.
            </p>

            <div className="papeis-layout">
              <div className="papeis-list-container">
                {papeis.map((papel) => (
                  <div
                    key={papel.id}
                    className={`papel-item ${editandoPapel?.id === papel.id ? "active" : ""}`}
                    onClick={() => carregarPermissoesPapel(papel.id)}
                  >
                    <span className={`papel-badge ${papel.nome.toLowerCase()}`}>
                      {papel.nome}
                    </span>
                    <span className="papel-descricao">{papel.descricao}</span>
                  </div>
                ))}
              </div>

              {editandoPapel && (
                <div className="permissoes-editor">
                  <div className="editor-header">
                    <h3>
                      Permissões do papel:{" "}
                      <span
                        className={`papel-badge ${editandoPapel.nome.toLowerCase()}`}
                      >
                        {editandoPapel.nome}
                      </span>
                    </h3>
                    <div className="editor-actions">
                      <button
                        className="btn-select-all"
                        onClick={selecionarTodasPermissoes}
                      >
                        Selecionar Todas
                      </button>
                      <button
                        className="btn-clear-all"
                        onClick={limparTodasPermissoes}
                      >
                        Limpar Todas
                      </button>
                    </div>
                  </div>

                  <div className="permissoes-modulos">
                    {Object.entries(agruparPermissoesPorModulo()).map(
                      ([modulo, perms]) => (
                        <div key={modulo} className="modulo-group">
                          <h4 className="modulo-title">
                            {modulo.toUpperCase()}
                          </h4>
                          <div className="modulo-permissoes">
                            {perms.map((perm) => (
                              <label
                                key={perm.id}
                                className="permissao-checkbox"
                              >
                                <input
                                  type="checkbox"
                                  checked={permissoesSelecionadas.includes(
                                    perm.id,
                                  )}
                                  onChange={() => togglePermissaoPapel(perm.id)}
                                />
                                <span className="permissao-info">
                                  <span className="permissao-chave">
                                    {perm.chave}
                                  </span>
                                  {perm.descricao && (
                                    <span className="permissao-descricao">
                                      {perm.descricao}
                                    </span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="editor-footer">
                    <button
                      className="btn-save"
                      onClick={salvarPermissoesPapel}
                    >
                      <FiSave size={16} /> Salvar Permissões
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={cancelarEdicaoPapel}
                    >
                      <FiX size={16} /> Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: PERMISSÕES */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "permissoes" && (
          <div className="permissoes-section">
            <h2>Lista de Permissões do Sistema</h2>
            <p className="section-description">
              Todas as permissões disponíveis no sistema, organizadas por
              módulo.
            </p>

            <div className="permissoes-por-modulo">
              {Object.entries(agruparPermissoesPorModulo()).map(
                ([modulo, perms]) => (
                  <div key={modulo} className="modulo-card">
                    <h3 className="modulo-header">{modulo.toUpperCase()}</h3>
                    <table className="permissoes-table">
                      <thead>
                        <tr>
                          <th>Chave</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {perms.map((perm) => (
                          <tr key={perm.id}>
                            <td>
                              <code>{perm.chave}</code>
                            </td>
                            <td>{perm.descricao || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: CADASTRO DE USUÁRIO INTERNO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "cadastro" && (
          <div className="cadastro-section">
            <h2>Cadastrar Usuário Interno</h2>
            <p className="section-description">
              Cadastre novos usuários do sistema sem necessidade de código de
              acesso.
            </p>

            <form className="cadastro-form" onSubmit={handleCadastrarUsuario}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nome">Nome Completo *</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={novoUsuario.nome}
                    onChange={handleNovoUsuarioChange}
                    placeholder="NOME COMPLETO"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={novoUsuario.email}
                    onChange={handleNovoUsuarioChange}
                    placeholder="email@empresa.com"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cpf">CPF *</label>
                  <input
                    type="text"
                    id="cpf"
                    name="cpf"
                    value={novoUsuario.cpf}
                    onChange={handleNovoUsuarioChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="data_nascimento">Data de Nascimento</label>
                  <input
                    type="date"
                    id="data_nascimento"
                    name="data_nascimento"
                    value={novoUsuario.data_nascimento}
                    onChange={handleNovoUsuarioChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="whatsapp">WhatsApp</label>
                  <input
                    type="text"
                    id="whatsapp"
                    name="whatsapp"
                    value={novoUsuario.whatsapp}
                    onChange={handleNovoUsuarioChange}
                    placeholder="11999999999"
                    maxLength={11}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="papel_id">Papel do Usuário *</label>
                  <select
                    id="papel_id"
                    name="papel_id"
                    value={novoUsuario.papel_id}
                    onChange={handleNovoUsuarioChange}
                    required
                  >
                    <option value="">Selecione o papel</option>
                    {papeis.map((papel) => (
                      <option key={papel.id} value={papel.id}>
                        {papel.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="empresa_id">Empresa</label>
                  <select
                    id="empresa_id"
                    name="empresa_id"
                    value={novoUsuario.empresa_id}
                    onChange={handleNovoUsuarioChange}
                  >
                    <option value="">Selecione uma empresa</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="setor_id">Setor</label>
                  <select
                    id="setor_id"
                    name="setor_id"
                    value={novoUsuario.setor_id}
                    onChange={handleNovoUsuarioChange}
                  >
                    <option value="">Selecione um setor</option>
                    {setores.map((setor) => (
                      <option key={setor.id} value={setor.id}>
                        {setor.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group form-group-small">
                  <label htmlFor="uf">UF</label>
                  <select
                    id="uf"
                    name="uf"
                    value={novoUsuario.uf}
                    onChange={handleNovoUsuarioChange}
                  >
                    <option value="">UF</option>
                    {Object.keys(estadosECidades).map((sigla) => (
                      <option key={sigla} value={sigla}>
                        {sigla}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="cidade">Cidade</label>
                  <select
                    id="cidade"
                    name="cidade"
                    value={novoUsuario.cidade}
                    onChange={handleNovoUsuarioChange}
                    disabled={!novoUsuario.uf}
                  >
                    <option value="">Selecione a cidade</option>
                    {novoUsuario.uf &&
                      estadosECidades[novoUsuario.uf]?.map((cidade) => (
                        <option key={cidade} value={cidade}>
                          {cidade}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="senha">Senha *</label>
                  <input
                    type="password"
                    id="senha"
                    name="senha"
                    value={novoUsuario.senha}
                    onChange={handleNovoUsuarioChange}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                  <span className="form-hint">
                    Mínimo 6 caracteres. A senha é usada para fazer login no
                    sistema.
                  </span>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={limparFormularioCadastro}
                >
                  <FiX size={16} /> Limpar
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={cadastrando}
                >
                  {cadastrando ? (
                    "Cadastrando..."
                  ) : (
                    <>
                      <FiUserPlus size={16} /> Cadastrar Usuário
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}


