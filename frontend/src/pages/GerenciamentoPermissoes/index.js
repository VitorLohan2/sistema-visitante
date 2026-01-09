// src/pages/GerenciamentoPermissoes/index.js
import React, { useState, useEffect } from "react";
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
} from "react-icons/fi";
import api from "../../services/api";
import { useSocket } from "../../hooks/useSocket";
import "./styles.css";
import logoImg from "../../assets/logo.svg";

export default function GerenciamentoPermissoes() {
  // Manter conexão do socket ativa
  useSocket();

  // Estados
  const [usuarios, setUsuarios] = useState([]);
  const [papeis, setPapeis] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usuarios"); // usuarios, papeis, permissoes
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [editandoPapel, setEditandoPapel] = useState(null);
  const [papeisSelecionados, setPapeisSelecionados] = useState([]);
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState([]);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [usuariosRes, papeisRes, permissoesRes] = await Promise.all([
        api.get("/usuarios-papeis"),
        api.get("/papeis"),
        api.get("/permissoes"),
      ]);

      setUsuarios(usuariosRes.data);
      setPapeis(papeisRes.data);
      setPermissoes(permissoesRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Erro ao carregar dados de permissões");
    } finally {
      setLoading(false);
    }
  };

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
        : [...prev, papelId]
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
      console.error("Erro ao salvar papéis:", error);
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
      console.error("Erro ao carregar permissões do papel:", error);
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
        : [...prev, permissaoId]
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
      console.error("Erro ao salvar permissões:", error);
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
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="gerenciamento-container">
        <div className="loading">Carregando...</div>
      </div>
    );
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
                                    perm.id
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
                      )
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
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
