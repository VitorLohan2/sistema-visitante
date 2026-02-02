import logger from "../../utils/logger";
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Gestão de Pontos de Controle de Ronda
 * Interface administrativa para cadastrar e gerenciar pontos de controle
 *
 * Dados: Carregados do cache (useDataLoader é responsável pelo carregamento inicial)
 * Atualização: API + Cache sync
 *
 * Permissões RBAC:
 * - ronda_pontos_controle_visualizar: Visualizar lista e detalhes
 * - ronda_pontos_controle_gerenciar: Criar, editar, excluir
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FiMapPin,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiTarget,
  FiMove,
  FiSave,
  FiX,
  FiAlertTriangle,
  FiList,
  FiMap,
  FiBarChart2,
  FiNavigation,
  FiCrosshair,
} from "react-icons/fi";
import { usePermissoes } from "../../hooks/usePermissoes";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { getCache, setCache } from "../../services/cacheService";
import rondaService from "../../services/rondaService";
import "./styles.css";

/**
 * Carrega os scripts do Leaflet dinamicamente (OpenStreetMap - GRATUITO)
 */
const carregarLeaflet = () => {
  return new Promise((resolve, reject) => {
    // Verifica se já está carregado
    if (window.L) {
      resolve(window.L);
      return;
    }

    // Carrega CSS do Leaflet
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const linkCSS = document.createElement("link");
      linkCSS.rel = "stylesheet";
      linkCSS.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      linkCSS.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      linkCSS.crossOrigin = "";
      document.head.appendChild(linkCSS);
    }

    // Carrega JS do Leaflet
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function PontosControle() {
  // ═══════════════════════════════════════════════════════════════════════════
  // HOOKS E PERMISSÕES
  // ═══════════════════════════════════════════════════════════════════════════
  const { temPermissao } = usePermissoes();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();
  const podeGerenciar = temPermissao("ronda_pontos_controle_gerenciar");
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const circlesRef = useRef([]);
  const primeiraRenderizacaoRef = useRef(true); // ✅ Controla se é a primeira renderização

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════════════════
  const [abaAtiva, setAbaAtiva] = useState("lista"); // lista, mapa, estatisticas
  const [pontos, setPontos] = useState(() => getCache("pontosControle") || []);
  const [setores, setSetores] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [carregando, setCarregando] = useState(false); // ✅ Dados carregados no login via useDataLoader
  const [erro, setErro] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    ativo: "",
    obrigatorio: "",
    setor: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Modal de formulário
  const [modalAberto, setModalAberto] = useState(false);
  const [pontoEditando, setPontoEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Formulário
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    codigo: "",
    latitude: "",
    longitude: "",
    raio: 30,
    ordem: "",
    obrigatorio: true,
    local_referencia: "",
    setor: "",
    tipo: "checkpoint",
    tempo_minimo_segundos: 30,
  });
  const [formErros, setFormErros] = useState({});

  // Mapa
  const [mapCarregado, setMapCarregado] = useState(false);
  const [modoSelecaoMapa, setModoSelecaoMapa] = useState(false);
  const [coordenadasSelecionadas, setCoordenadasSelecionadas] = useState(null);

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({
    aberto: false,
    pontoId: null,
    nome: "",
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAR MARCADORES NO MAPA LEAFLET
  // ═══════════════════════════════════════════════════════════════════════════
  const renderizarMarcadores = useCallback(() => {
    if (!leafletMapRef.current || !window.L) return;

    const L = window.L;

    // Limpa marcadores anteriores
    markersRef.current.forEach((marker) => marker.remove());
    circlesRef.current.forEach((circle) => circle.remove());
    markersRef.current = [];
    circlesRef.current = [];

    // Bounds para ajustar zoom
    const bounds = [];

    // Cria novos marcadores
    pontos.forEach((ponto) => {
      const posicao = [parseFloat(ponto.latitude), parseFloat(ponto.longitude)];
      bounds.push(posicao);

      // Cor baseada no status
      const cor = ponto.ativo
        ? ponto.obrigatorio
          ? "#27ae60"
          : "#3498db"
        : "#95a5a6";

      // Ícone customizado
      const icone = L.divIcon({
        className: "ponto-controle-marker",
        html: `<div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${cor};
          border: 3px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 11px;
          font-weight: bold;
        ">${ponto.ordem || ""}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      // Marcador
      const marker = L.marker(posicao, { icon: icone }).addTo(
        leafletMapRef.current,
      ).bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #1a1a2e;">${ponto.nome}</h4>
            ${ponto.codigo ? `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Código:</strong> ${ponto.codigo}</p>` : ""}
            ${ponto.setor ? `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Setor:</strong> ${ponto.setor}</p>` : ""}
            <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Raio:</strong> ${ponto.raio}m</p>
            <p style="margin: 0 0 4px 0; font-size: 12px;">
              <strong>Status:</strong> 
              <span style="color: ${ponto.ativo ? "#27ae60" : "#95a5a6"}">
                ${ponto.ativo ? "Ativo" : "Inativo"}
              </span>
            </p>
            <p style="margin: 0; font-size: 12px;">
              <strong>Tipo:</strong> 
              <span style="color: ${ponto.obrigatorio ? "#27ae60" : "#3498db"}">
                ${ponto.obrigatorio ? "Obrigatório" : "Opcional"}
              </span>
            </p>
          </div>
        `);

      markersRef.current.push(marker);

      // Círculo do raio
      const circle = L.circle(posicao, {
        radius: ponto.raio,
        fillColor: cor,
        fillOpacity: 0.15,
        color: cor,
        weight: 1,
        opacity: 0.5,
      }).addTo(leafletMapRef.current);

      circlesRef.current.push(circle);
    });

    // Ajusta zoom para mostrar todos os pontos
    if (bounds.length > 1) {
      leafletMapRef.current.fitBounds(bounds, { padding: [30, 30] });
    } else if (bounds.length === 1) {
      leafletMapRef.current.setView(bounds[0], 16);
    }
  }, [pontos]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR LEAFLET (OpenStreetMap - GRATUITO)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    carregarLeaflet()
      .then(() => {
        setMapCarregado(true);
        logger.log("✅ Leaflet carregado com sucesso");
      })
      .catch((err) => {
        logger.error("❌ Erro ao carregar Leaflet:", err);
      });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // INICIALIZAR MAPA LEAFLET
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!mapCarregado || !mapRef.current || abaAtiva !== "mapa" || !window.L)
      return;

    // Limpa mapa anterior se existir
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Centraliza no Brasil
    const centro =
      pontos.length > 0
        ? [parseFloat(pontos[0].latitude), parseFloat(pontos[0].longitude)]
        : [-23.5505, -46.6333];

    // Cria o mapa Leaflet
    const L = window.L;
    leafletMapRef.current = L.map(mapRef.current).setView(centro, 15);

    // Adiciona camada do OpenStreetMap (GRATUITO)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletMapRef.current);

    // Click no mapa para selecionar coordenadas (quando em modo seleção)
    leafletMapRef.current.on("click", (e) => {
      if (modoSelecaoMapa) {
        const coords = {
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        };
        setCoordenadasSelecionadas(coords);
        setFormData((prev) => ({
          ...prev,
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        }));
        setModoSelecaoMapa(false);
      }
    });

    renderizarMarcadores();

    // Cleanup ao desmontar
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapCarregado, abaAtiva, modoSelecaoMapa, renderizarMarcadores]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ATUALIZAR MARCADORES QUANDO PONTOS MUDAREM
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (leafletMapRef.current && mapCarregado && abaAtiva === "mapa") {
      renderizarMarcadores();
    }
  }, [pontos, mapCarregado, abaAtiva, renderizarMarcadores]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR DADOS - Primeiro do cache, depois API se necessário
  // ═══════════════════════════════════════════════════════════════════════════
  const carregarDados = useCallback(
    async (forceRefresh = false) => {
      setErro(null);
      const isPrimeiraRenderizacao = primeiraRenderizacaoRef.current;
      primeiraRenderizacaoRef.current = false;

      try {
        // ✅ Se já tem pontos do cache (estado inicial) e não é forceRefresh, só carrega setores
        if (pontos.length > 0 && !forceRefresh) {
          logger.log("📦 Usando pontos de controle do cache (estado inicial)");
          // Carrega setores da API (não cacheia por enquanto)
          const setoresResp = await rondaService.listarSetoresPontosControle();
          setSetores(setoresResp.setores || []);
          return;
        }

        // ✅ Só mostra carregando se não for a primeira renderização
        if (!isPrimeiraRenderizacao) {
          setCarregando(true);
        }

        const [pontosResp, setoresResp] = await Promise.all([
          rondaService.listarPontosControle(filtros),
          rondaService.listarSetoresPontosControle(),
        ]);

        const pontosData = pontosResp.pontos || [];
        setPontos(pontosData);
        setSetores(setoresResp.setores || []);

        // Salva no cache
        setCache("pontosControle", pontosData);
      } catch (err) {
        logger.error("Erro ao carregar pontos:", err);
        setErro("Erro ao carregar pontos de controle");
      } finally {
        setCarregando(false);
      }
    },
    [filtros, pontos.length],
  );

  const carregarEstatisticas = useCallback(async () => {
    if (!podeGerenciar) return; // Só carrega se tiver permissão
    try {
      const resp = await rondaService.estatisticasPontosControle();
      setEstatisticas(resp.estatisticas);
    } catch (err) {
      logger.error("Erro ao carregar estatísticas:", err);
    }
  }, [podeGerenciar]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (abaAtiva === "estatisticas") {
      carregarEstatisticas();
    }
  }, [abaAtiva, carregarEstatisticas]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DO FORMULÁRIO
  // ═══════════════════════════════════════════════════════════════════════════
  const abrirModalNovo = () => {
    setPontoEditando(null);
    setFormData({
      nome: "",
      descricao: "",
      codigo: "",
      latitude: "",
      longitude: "",
      raio: 30,
      ordem: "",
      obrigatorio: true,
      local_referencia: "",
      setor: "",
      tipo: "checkpoint",
      tempo_minimo_segundos: 30,
    });
    setFormErros({});
    setModalAberto(true);
  };

  const abrirModalEdicao = (ponto) => {
    setPontoEditando(ponto);
    setFormData({
      nome: ponto.nome || "",
      descricao: ponto.descricao || "",
      codigo: ponto.codigo || "",
      latitude: ponto.latitude || "",
      longitude: ponto.longitude || "",
      raio: ponto.raio || 30,
      ordem: ponto.ordem || "",
      obrigatorio: ponto.obrigatorio !== false,
      local_referencia: ponto.local_referencia || "",
      setor: ponto.setor || "",
      tipo: ponto.tipo || "checkpoint",
      tempo_minimo_segundos: ponto.tempo_minimo_segundos || 30,
    });
    setFormErros({});
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setPontoEditando(null);
    setModoSelecaoMapa(false);
    setCoordenadasSelecionadas(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Limpa erro do campo
    if (formErros[name]) {
      setFormErros((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validarFormulario = () => {
    const erros = {};

    if (!formData.nome || formData.nome.trim().length < 3) {
      erros.nome = "Nome deve ter pelo menos 3 caracteres";
    }
    if (!formData.latitude || isNaN(parseFloat(formData.latitude))) {
      erros.latitude = "Latitude inválida";
    }
    if (!formData.longitude || isNaN(parseFloat(formData.longitude))) {
      erros.longitude = "Longitude inválida";
    }
    if (!formData.raio || formData.raio < 1) {
      erros.raio = "Raio deve ser maior que 0";
    }

    setFormErros(erros);
    return Object.keys(erros).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    setSalvando(true);
    try {
      const dados = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        raio: parseInt(formData.raio, 10),
        ordem: formData.ordem ? parseInt(formData.ordem, 10) : null,
        tempo_minimo_segundos: parseInt(formData.tempo_minimo_segundos, 10),
      };

      if (pontoEditando) {
        await rondaService.atualizarPontoControle(pontoEditando.id, dados);
      } else {
        await rondaService.criarPontoControle(dados);
      }

      fecharModal();
      carregarDados();
    } catch (err) {
      logger.error("Erro ao salvar ponto:", err);
      setFormErros({
        geral: err.response?.data?.error || "Erro ao salvar ponto de controle",
      });
    } finally {
      setSalvando(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCLUSÃO
  // ═══════════════════════════════════════════════════════════════════════════
  const confirmarExclusao = (ponto) => {
    setModalConfirmacao({
      aberto: true,
      pontoId: ponto.id,
      nome: ponto.nome,
    });
  };

  const executarExclusao = async () => {
    try {
      await rondaService.excluirPontoControle(modalConfirmacao.pontoId);
      setModalConfirmacao({ aberto: false, pontoId: null, nome: "" });
      carregarDados();
    } catch (err) {
      logger.error("Erro ao excluir ponto:", err);
      showToast(err.response?.data?.error || "Erro ao excluir ponto", "error");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OBTER LOCALIZAÇÃO ATUAL
  // ═══════════════════════════════════════════════════════════════════════════
  const obterLocalizacaoAtual = () => {
    if (!navigator.geolocation) {
      showToast("Geolocalização não suportada pelo navegador", "warning");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
      },
      (error) => {
        logger.error("Erro de geolocalização:", error);
        showToast("Não foi possível obter sua localização", "error");
      },
      { enableHighAccuracy: true },
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ALTERNAR STATUS ATIVO
  // ═══════════════════════════════════════════════════════════════════════════
  const alternarAtivo = async (ponto) => {
    try {
      await rondaService.atualizarPontoControle(ponto.id, {
        ativo: !ponto.ativo,
      });
      carregarDados();
    } catch (err) {
      logger.error("Erro ao alterar status:", err);
      showToast("Erro ao alterar status do ponto", "error");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════
  const tiposLabels = {
    checkpoint: "Checkpoint",
    entrada: "Entrada",
    saida: "Saída",
    ponto_critico: "Ponto Crítico",
    area_comum: "Área Comum",
  };

  return (
    <div className="pontos-controle-container">
      {/* Header */}
      <div className="pontos-controle-header">
        <div className="pc-header-titulo">
          <FiMapPin size={28} />
          <h1>Pontos de Controle</h1>
        </div>
        <div className="pc-header-acoes">
          <button
            className="pc-btn-filtros"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <FiFilter size={18} />
            Filtros
          </button>
          <button className="pc-btn-atualizar" onClick={carregarDados}>
            <FiRefreshCw size={18} />
            Atualizar
          </button>
          {podeGerenciar && (
            <button className="pc-btn-novo" onClick={abrirModalNovo}>
              <FiPlus size={18} />
              Novo Ponto
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="pc-filtros-container">
          <div className="pc-filtros-grupo">
            <label>Status</label>
            <select
              value={filtros.ativo}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, ativo: e.target.value }))
              }
            >
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
          <div className="pc-filtros-grupo">
            <label>Tipo</label>
            <select
              value={filtros.obrigatorio}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, obrigatorio: e.target.value }))
              }
            >
              <option value="">Todos</option>
              <option value="true">Obrigatórios</option>
              <option value="false">Opcionais</option>
            </select>
          </div>
          <div className="pc-filtros-grupo">
            <label>Setor</label>
            <select
              value={filtros.setor}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, setor: e.target.value }))
              }
            >
              <option value="">Todos</option>
              {setores.map((setor) => (
                <option key={setor} value={setor}>
                  {setor}
                </option>
              ))}
            </select>
          </div>
          <button
            className="pc-btn-limpar"
            onClick={() =>
              setFiltros({ ativo: "", obrigatorio: "", setor: "" })
            }
          >
            Limpar
          </button>
        </div>
      )}

      {/* Abas */}
      <div className="pc-abas-container">
        <button
          className={`pc-aba ${abaAtiva === "lista" ? "ativa" : ""}`}
          onClick={() => setAbaAtiva("lista")}
        >
          <FiList size={18} />
          Lista ({pontos.length})
        </button>
        <button
          className={`pc-aba ${abaAtiva === "mapa" ? "ativa" : ""}`}
          onClick={() => setAbaAtiva("mapa")}
        >
          <FiMap size={18} />
          Mapa
        </button>
        {podeGerenciar && (
          <button
            className={`pc-aba ${abaAtiva === "estatisticas" ? "ativa" : ""}`}
            onClick={() => setAbaAtiva("estatisticas")}
          >
            <FiBarChart2 size={18} />
            Estatísticas
          </button>
        )}
      </div>

      {/* Conteúdo */}
      {erro && (
        <div className="erro-container">
          <FiAlertTriangle size={20} />
          <span>{erro}</span>
        </div>
      )}

      {carregando ? (
        <div className="carregando-container">
          <div className="spinner"></div>
          <span>Carregando pontos de controle...</span>
        </div>
      ) : (
        <>
          {/* Lista */}
          {abaAtiva === "lista" && (
            <div className="lista-pontos">
              {pontos.length === 0 ? (
                <div className="sem-dados">
                  <FiMapPin size={48} />
                  <p>Nenhum ponto de controle cadastrado</p>
                  {podeGerenciar && (
                    <button className="pc-btn-novo" onClick={abrirModalNovo}>
                      <FiPlus size={18} />
                      Cadastrar primeiro ponto
                    </button>
                  )}
                </div>
              ) : (
                <table className="tabela-pontos">
                  <thead>
                    <tr>
                      <th>Ordem</th>
                      <th>Nome</th>
                      <th>Código</th>
                      <th>Setor</th>
                      <th>Raio</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pontos.map((ponto) => (
                      <tr
                        key={ponto.id}
                        className={!ponto.ativo ? "inativo" : ""}
                      >
                        <td className="coluna-ordem">{ponto.ordem || "-"}</td>
                        <td className="coluna-nome">
                          <strong>{ponto.nome}</strong>
                          {ponto.local_referencia && (
                            <small>{ponto.local_referencia}</small>
                          )}
                        </td>
                        <td>{ponto.codigo || "-"}</td>
                        <td>{ponto.setor || "-"}</td>
                        <td>{ponto.raio}m</td>
                        <td>
                          <span
                            className={`badge ${ponto.obrigatorio ? "obrigatorio" : "opcional"}`}
                          >
                            {ponto.obrigatorio ? "Obrigatório" : "Opcional"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${ponto.ativo ? "ativo" : "inativo"}`}
                          >
                            {ponto.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="coluna-acoes">
                          {podeGerenciar && (
                            <>
                              <button
                                className="btn-acao editar"
                                onClick={() => abrirModalEdicao(ponto)}
                                title="Editar"
                              >
                                <FiEdit2 size={16} />
                              </button>
                              <button
                                className="btn-acao status"
                                onClick={() => alternarAtivo(ponto)}
                                title={ponto.ativo ? "Desativar" : "Ativar"}
                              >
                                {ponto.ativo ? (
                                  <FiXCircle size={16} />
                                ) : (
                                  <FiCheckCircle size={16} />
                                )}
                              </button>
                              <button
                                className="btn-acao excluir"
                                onClick={() => confirmarExclusao(ponto)}
                                title="Excluir"
                              >
                                <FiTrash2 size={16} />
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
          )}

          {/* Mapa */}
          {abaAtiva === "mapa" && (
            <div className="mapa-container">
              {!mapCarregado ? (
                <div className="sem-dados">
                  <FiRefreshCw size={48} className="spin" />
                  <p>Carregando mapa...</p>
                </div>
              ) : (
                <>
                  {modoSelecaoMapa && (
                    <div className="mapa-selecao-aviso">
                      <FiCrosshair size={20} />
                      <span>Clique no mapa para selecionar as coordenadas</span>
                      <button onClick={() => setModoSelecaoMapa(false)}>
                        <FiX size={18} />
                      </button>
                    </div>
                  )}
                  <div
                    ref={mapRef}
                    className="leaflet-map"
                    style={{ width: "100%", height: "600px" }}
                  />
                  <div className="legenda-mapa">
                    <div className="legenda-item">
                      <span className="legenda-cor obrigatorio"></span>
                      <span>Obrigatório</span>
                    </div>
                    <div className="legenda-item">
                      <span className="legenda-cor opcional"></span>
                      <span>Opcional</span>
                    </div>
                    <div className="legenda-item">
                      <span className="legenda-cor inativo"></span>
                      <span>Inativo</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Estatísticas */}
          {abaAtiva === "estatisticas" && estatisticas && (
            <div className="estatisticas-container">
              <div className="stats-cards">
                <div className="stat-card">
                  <div className="stat-icon total">
                    <FiMapPin size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estatisticas.total}</span>
                    <span className="stat-label">Total de Pontos</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon ativo">
                    <FiCheckCircle size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estatisticas.ativos}</span>
                    <span className="stat-label">Ativos</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon inativo">
                    <FiXCircle size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estatisticas.inativos}</span>
                    <span className="stat-label">Inativos</span>
                  </div>
                </div>
              </div>

              {estatisticas.por_setor && estatisticas.por_setor.length > 0 && (
                <div className="stat-section">
                  <h3>Pontos por Setor</h3>
                  <div className="setores-lista">
                    {estatisticas.por_setor.map((s, idx) => (
                      <div key={idx} className="setor-item">
                        <span className="setor-nome">{s.setor}</span>
                        <span className="setor-qtd">{s.quantidade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {estatisticas.mais_validados &&
                estatisticas.mais_validados.length > 0 && (
                  <div className="stat-section">
                    <h3>Pontos Mais Validados</h3>
                    <div className="validados-lista">
                      {estatisticas.mais_validados.map((p, idx) => (
                        <div key={idx} className="validado-item">
                          <span className="ranking">#{idx + 1}</span>
                          <span className="ponto-nome">{p.nome}</span>
                          <span className="validacoes">
                            {p.total_validacoes} validações
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </>
      )}

      {/* Modal de Formulário */}
      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div
            className="modal-conteudo modal-formulario"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {pontoEditando ? (
                  <>
                    <FiEdit2 size={20} /> Editar Ponto
                  </>
                ) : (
                  <>
                    <FiPlus size={20} /> Novo Ponto de Controle
                  </>
                )}
              </h2>
              <button className="btn-fechar" onClick={fecharModal}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formErros.geral && (
                <div className="form-erro-geral">
                  <FiAlertTriangle size={16} />
                  {formErros.geral}
                </div>
              )}

              <div className="form-row">
                <div className="form-grupo">
                  <label htmlFor="nome">Nome *</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Ex: Guarita Principal"
                    className={formErros.nome ? "erro" : ""}
                  />
                  {formErros.nome && (
                    <span className="form-erro">{formErros.nome}</span>
                  )}
                </div>
                <div className="form-grupo">
                  <label htmlFor="codigo">Código</label>
                  <input
                    type="text"
                    id="codigo"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleInputChange}
                    placeholder="Ex: CP001"
                  />
                </div>
              </div>

              <div className="form-grupo">
                <label htmlFor="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  placeholder="Descrição detalhada do ponto de controle"
                  rows={2}
                />
              </div>

              <div className="form-row coordenadas-row">
                <div className="form-grupo">
                  <label htmlFor="latitude">Latitude *</label>
                  <input
                    type="text"
                    id="latitude"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="-23.550520"
                    className={formErros.latitude ? "erro" : ""}
                  />
                  {formErros.latitude && (
                    <span className="form-erro">{formErros.latitude}</span>
                  )}
                </div>
                <div className="form-grupo">
                  <label htmlFor="longitude">Longitude *</label>
                  <input
                    type="text"
                    id="longitude"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="-46.633308"
                    className={formErros.longitude ? "erro" : ""}
                  />
                  {formErros.longitude && (
                    <span className="form-erro">{formErros.longitude}</span>
                  )}
                </div>
                <div className="btns-coordenadas">
                  <button
                    type="button"
                    className="btn-coord"
                    onClick={obterLocalizacaoAtual}
                    title="Usar localização atual"
                  >
                    <FiNavigation size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn-coord"
                    onClick={() => {
                      setModoSelecaoMapa(true);
                      setAbaAtiva("mapa");
                    }}
                    title="Selecionar no mapa"
                  >
                    <FiCrosshair size={18} />
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label htmlFor="raio">Raio (metros) *</label>
                  <input
                    type="number"
                    id="raio"
                    name="raio"
                    value={formData.raio}
                    onChange={handleInputChange}
                    min="1"
                    className={formErros.raio ? "erro" : ""}
                  />
                  {formErros.raio && (
                    <span className="form-erro">{formErros.raio}</span>
                  )}
                </div>
                <div className="form-grupo">
                  <label htmlFor="ordem">Ordem</label>
                  <input
                    type="number"
                    id="ordem"
                    name="ordem"
                    value={formData.ordem}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="Automático"
                  />
                </div>
                <div className="form-grupo">
                  <label htmlFor="tempo_minimo_segundos">
                    Tempo Mín. (seg)
                  </label>
                  <input
                    type="number"
                    id="tempo_minimo_segundos"
                    name="tempo_minimo_segundos"
                    value={formData.tempo_minimo_segundos}
                    onChange={handleInputChange}
                    min="0"
                    max="600"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label htmlFor="setor">Setor</label>
                  <input
                    type="text"
                    id="setor"
                    name="setor"
                    value={formData.setor}
                    onChange={handleInputChange}
                    placeholder="Ex: Área Externa"
                    list="setores-lista"
                  />
                  <datalist id="setores-lista">
                    {setores.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="form-grupo">
                  <label htmlFor="tipo">Tipo</label>
                  <select
                    id="tipo"
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                  >
                    {Object.entries(tiposLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grupo">
                <label htmlFor="local_referencia">Local de Referência</label>
                <input
                  type="text"
                  id="local_referencia"
                  name="local_referencia"
                  value={formData.local_referencia}
                  onChange={handleInputChange}
                  placeholder="Ex: Ao lado do estacionamento"
                />
              </div>

              <div className="form-grupo checkbox-grupo">
                <label>
                  <input
                    type="checkbox"
                    name="obrigatorio"
                    checked={formData.obrigatorio}
                    onChange={handleInputChange}
                  />
                  <span>Ponto obrigatório</span>
                </label>
                <small>
                  Pontos obrigatórios devem ser visitados em todas as rondas
                </small>
              </div>

              <div className="modal-acoes">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-salvar"
                  disabled={salvando}
                >
                  {salvando ? (
                    <>
                      <div className="spinner-btn"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FiSave size={18} />
                      {pontoEditando ? "Atualizar" : "Criar"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalConfirmacao.aberto && (
        <div
          className="modal-overlay"
          onClick={() =>
            setModalConfirmacao({ aberto: false, pontoId: null, nome: "" })
          }
        >
          <div
            className="modal-conteudo modal-confirmacao"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirmacao-icone">
              <FiAlertTriangle size={48} />
            </div>
            <h3>Confirmar Exclusão</h3>
            <p>
              Deseja realmente excluir o ponto{" "}
              <strong>{modalConfirmacao.nome}</strong>?
            </p>
            <p className="aviso">
              Se o ponto já tiver sido usado em rondas, será apenas desativado.
            </p>
            <div className="modal-acoes">
              <button
                className="btn-cancelar"
                onClick={() =>
                  setModalConfirmacao({
                    aberto: false,
                    pontoId: null,
                    nome: "",
                  })
                }
              >
                Cancelar
              </button>
              <button className="btn-excluir" onClick={executarExclusao}>
                <FiTrash2 size={18} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais de UI */}
      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}
