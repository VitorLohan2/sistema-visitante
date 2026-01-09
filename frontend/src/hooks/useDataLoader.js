/**
 * useDataLoader - Hook para carregamento de dados com cache e Socket.IO
 *
 * - Carrega todos os dados uma única vez no login
 * - Usa cache em memória/sessionStorage para navegação rápida
 * - Sincroniza em tempo real via Socket.IO
 * - Progresso REAL baseado nas requisições concluídas
 */

import { useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import * as socketService from "../services/socketService";
import {
  setCache,
  getCache,
  isCacheLoaded,
  removeVisitanteFromCache,
  addVisitanteToCache,
  updateVisitanteInCache,
} from "../services/cacheService";

export function useDataLoader(userId) {
  // 🔥 INÍCIO: Verifica se já tem cache para não mostrar loading desnecessário
  const hasInitialCacheRef = useRef(isCacheLoaded());

  const [loading, setLoading] = useState(!hasInitialCacheRef.current);
  const [progress, setProgress] = useState(
    hasInitialCacheRef.current ? 100 : 0
  );
  const [progressMessage, setProgressMessage] = useState(
    hasInitialCacheRef.current ? "Pronto!" : "Iniciando..."
  );
  const [error, setError] = useState(null);

  // Dados carregados - inicializa com cache se existir
  const [visitantes, setVisitantes] = useState(
    () => getCache("visitantes") || []
  );
  const [empresas, setEmpresas] = useState(() => getCache("empresas") || []);
  const [setores, setSetores] = useState(() => getCache("setores") || []);
  const [responsaveis, setResponsaveis] = useState(
    () => getCache("responsaveis") || []
  );
  const [userData, setUserData] = useState(() => getCache("userData"));

  // Controle de carregamento e socket
  const isLoadingRef = useRef(false);
  const isDataLoadedRef = useRef(false);
  const socketListenersRef = useRef([]);

  /**
   * Configura listeners do Socket.IO para atualização em tempo real
   */
  const setupSocketListeners = useCallback(() => {
    // Remove listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // ═══════════════════════════════════════════════════════════════
    // LISTENER: Novo visitante criado
    // ═══════════════════════════════════════════════════════════════
    const unsubCreated = socketService.on("visitante:created", (visitante) => {
      console.log("📥 Socket: Novo visitante recebido", visitante.nome);
      setVisitantes((prev) => {
        // Evita duplicatas
        if (prev.find((v) => v.id === visitante.id)) {
          return prev;
        }
        const novosVisitantes = [...prev, visitante].sort((a, b) => {
          const nomeA = (a.nome || "").toLowerCase();
          const nomeB = (b.nome || "").toLowerCase();
          return nomeA.localeCompare(nomeB, "pt-BR");
        });
        return novosVisitantes;
      });
    });

    // ═══════════════════════════════════════════════════════════════
    // LISTENER: Visitante atualizado
    // ═══════════════════════════════════════════════════════════════
    const unsubUpdated = socketService.on("visitante:updated", (dados) => {
      console.log("📝 Socket: Visitante atualizado", dados.id);
      setVisitantes((prev) => {
        const novosVisitantes = prev
          .map((v) => (v.id === dados.id ? { ...v, ...dados } : v))
          .sort((a, b) => {
            const nomeA = (a.nome || "").toLowerCase();
            const nomeB = (b.nome || "").toLowerCase();
            return nomeA.localeCompare(nomeB, "pt-BR");
          });
        return novosVisitantes;
      });
    });

    // ═══════════════════════════════════════════════════════════════
    // LISTENER: Visitante deletado
    // ═══════════════════════════════════════════════════════════════
    const unsubDeleted = socketService.on("visitante:deleted", (dados) => {
      console.log("🗑️ Socket: Visitante deletado", dados.id);
      setVisitantes((prev) => prev.filter((v) => v.id !== dados.id));
    });

    // ═══════════════════════════════════════════════════════════════
    // LISTENER: Empresa criada
    // ═══════════════════════════════════════════════════════════════
    const unsubEmpresaCreated = socketService.on(
      "empresa:created",
      (empresa) => {
        console.log("🏢 Socket: Nova empresa", empresa.nome);
        setEmpresas((prev) => {
          if (prev.find((e) => e.id === empresa.id)) return prev;
          return [...prev, empresa].sort((a, b) =>
            (a.nome || "").localeCompare(b.nome || "", "pt-BR")
          );
        });
      }
    );

    // ═══════════════════════════════════════════════════════════════
    // LISTENER: Empresa atualizada
    // ═══════════════════════════════════════════════════════════════
    const unsubEmpresaUpdated = socketService.on("empresa:updated", (dados) => {
      console.log("🏢 Socket: Empresa atualizada", dados.id);
      setEmpresas((prev) =>
        prev.map((e) => (e.id === dados.id ? { ...e, ...dados } : e))
      );
    });

    // ═══════════════════════════════════════════════════════════════
    // LISTENER: Empresa deletada
    // ═══════════════════════════════════════════════════════════════
    const unsubEmpresaDeleted = socketService.on("empresa:deleted", (dados) => {
      console.log("🏢 Socket: Empresa deletada", dados.id);
      setEmpresas((prev) => prev.filter((e) => e.id !== dados.id));
    });

    // ═══════════════════════════════════════════════════════════════
    // LISTENER: Setor criado
    // ═══════════════════════════════════════════════════════════════
    const unsubSetorCreated = socketService.on("setor:created", (setor) => {
      console.log("📁 Socket: Novo setor", setor.nome);
      setSetores((prev) => {
        if (prev.find((s) => s.id === setor.id)) return prev;
        return [...prev, setor].sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR")
        );
      });
    });

    // ═══════════════════════════════════════════════════════════════
    // LISTENER: Setor atualizado
    // ═══════════════════════════════════════════════════════════════
    const unsubSetorUpdated = socketService.on("setor:updated", (dados) => {
      console.log("📁 Socket: Setor atualizado", dados.id);
      setSetores((prev) =>
        prev.map((s) => (s.id === dados.id ? { ...s, ...dados } : s))
      );
    });

    // ═══════════════════════════════════════════════════════════════
    // LISTENER: Setor deletado
    // ═══════════════════════════════════════════════════════════════
    const unsubSetorDeleted = socketService.on("setor:deleted", (dados) => {
      console.log("📁 Socket: Setor deletado", dados.id);
      setSetores((prev) => prev.filter((s) => s.id !== dados.id));
    });

    // Guarda referências para cleanup
    socketListenersRef.current = [
      unsubCreated,
      unsubUpdated,
      unsubDeleted,
      unsubEmpresaCreated,
      unsubEmpresaUpdated,
      unsubEmpresaDeleted,
      unsubSetorCreated,
      unsubSetorUpdated,
      unsubSetorDeleted,
    ];

    console.log(
      "🔌 Socket listeners configurados para sincronização em tempo real"
    );
  }, []);

  /**
   * Carrega todos os dados necessários com progresso real
   */
  const loadAllData = useCallback(
    async (forceReload = false) => {
      if (!userId) {
        setLoading(false);
        return;
      }

      // Evita carregamentos duplicados
      if (isLoadingRef.current) {
        console.log("⏳ Carregamento já em andamento...");
        return;
      }

      // Verifica se já tem cache válido e não é reload forçado
      if (!forceReload && isCacheLoaded()) {
        console.log("📦 Usando dados do cache");

        const cachedVisitantes = getCache("visitantes") || [];
        const cachedEmpresas = getCache("empresas") || [];
        const cachedSetores = getCache("setores") || [];
        const cachedResponsaveis = getCache("responsaveis") || [];
        const cachedUserData = getCache("userData");

        setVisitantes(cachedVisitantes);
        setEmpresas(cachedEmpresas);
        setSetores(cachedSetores);
        setResponsaveis(cachedResponsaveis);
        setUserData(cachedUserData);

        // Conecta ao Socket para atualizações em tempo real
        const token = localStorage.getItem("token");
        if (token) {
          socketService.connect(token);
          setupSocketListeners();
        }

        setProgress(100);
        setLoading(false);
        isDataLoadedRef.current = true;
        return;
      }

      isLoadingRef.current = true;
      setLoading(true);
      setProgress(0);
      setError(null);

      try {
        // ═══════════════════════════════════════════════════════════════
        // ETAPA 1: Carregar empresas e setores (20%)
        // ═══════════════════════════════════════════════════════════════
        setProgressMessage("Carregando empresas e setores...");

        const [empresasRes, setoresRes] = await Promise.all([
          api.get("/empresas-visitantes"),
          api.get("/setores-visitantes"),
        ]);

        const empresasData = empresasRes.data || [];
        const setoresData = setoresRes.data || [];

        setEmpresas(empresasData);
        setSetores(setoresData);
        setCache("empresas", empresasData);
        setCache("setores", setoresData);

        setProgress(20);

        // ═══════════════════════════════════════════════════════════════
        // ETAPA 2: Carregar dados do usuário (35%)
        // ═══════════════════════════════════════════════════════════════
        setProgressMessage("Carregando dados do usuário...");

        const userRes = await api.get(`usuarios/${userId}`);
        const userDataLoaded = userRes.data;

        setUserData(userDataLoaded);
        setCache("userData", userDataLoaded);

        setProgress(35);

        // ═══════════════════════════════════════════════════════════════
        // ETAPA 3: Carregar responsáveis (50%)
        // ═══════════════════════════════════════════════════════════════
        setProgressMessage("Carregando responsáveis...");

        // ✅ ATUALIZADO: Usando nova rota /visitantes/responsaveis
        const responsaveisRes = await api.get("/visitantes/responsaveis");
        const responsaveisData = responsaveisRes.data || [];

        setResponsaveis(responsaveisData);
        setCache("responsaveis", responsaveisData);

        setProgress(50);

        // ═══════════════════════════════════════════════════════════════
        // ETAPA 4: Carregar TODOS os visitantes (75%)
        // ═══════════════════════════════════════════════════════════════
        setProgressMessage("Carregando cadastros de visitantes...");

        const visitantesRes = await api.get("cadastro-visitantes?limit=10000", {
          headers: { Authorization: userId },
        });

        setProgress(75);
        setProgressMessage("Processando dados...");

        // Mapeia visitantes com nomes de empresa/setor e ordena alfabeticamente
        const visitantesProcessados = (visitantesRes.data || [])
          .map((visitante) => ({
            ...visitante,
            empresa:
              empresasData.find((e) => e.id === visitante.empresa_id)?.nome ||
              "Não informado",
            setor:
              setoresData.find((s) => s.id === visitante.setor_id)?.nome ||
              "Não informado",
          }))
          .sort((a, b) => {
            const nomeA = (a.nome || "").toLowerCase();
            const nomeB = (b.nome || "").toLowerCase();
            return nomeA.localeCompare(nomeB, "pt-BR");
          });

        setVisitantes(visitantesProcessados);
        setCache("visitantes", visitantesProcessados);

        setProgress(90);

        // ═══════════════════════════════════════════════════════════════
        // ETAPA 5: Conectar ao Socket.IO (100%)
        // ═══════════════════════════════════════════════════════════════
        setProgressMessage("Conectando sincronização em tempo real...");

        const token = localStorage.getItem("token");
        if (token) {
          socketService.connect(token);
          setupSocketListeners();
        }

        setProgress(100);
        setProgressMessage("Concluído!");

        console.log(
          `✅ Dados carregados: ${visitantesProcessados.length} visitantes`
        );
        isDataLoadedRef.current = true;
      } catch (err) {
        console.error("❌ Erro ao carregar dados:", err);
        setError(err.response?.data?.error || err.message);
        setProgress(0);
      } finally {
        isLoadingRef.current = false;

        // Pequeno delay para mostrar 100% antes de esconder loading
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }
    },
    [userId, setupSocketListeners]
  );

  /**
   * Recarrega apenas visitantes (após criar/editar/deletar)
   */
  const reloadVisitantes = useCallback(async () => {
    if (!userId) return;

    try {
      const empresasData = getCache("empresas") || [];
      const setoresData = getCache("setores") || [];

      const visitantesRes = await api.get("cadastro-visitantes?limit=10000", {
        headers: { Authorization: userId },
      });

      const visitantesProcessados = (visitantesRes.data || [])
        .map((visitante) => ({
          ...visitante,
          empresa:
            empresasData.find((e) => e.id === visitante.empresa_id)?.nome ||
            "Não informado",
          setor:
            setoresData.find((s) => s.id === visitante.setor_id)?.nome ||
            "Não informado",
        }))
        .sort((a, b) => {
          const nomeA = (a.nome || "").toLowerCase();
          const nomeB = (b.nome || "").toLowerCase();
          return nomeA.localeCompare(nomeB, "pt-BR");
        });

      setVisitantes(visitantesProcessados);
      setCache("visitantes", visitantesProcessados);

      console.log(
        `🔄 Visitantes recarregados: ${visitantesProcessados.length}`
      );
      return visitantesProcessados;
    } catch (err) {
      console.error("❌ Erro ao recarregar visitantes:", err);
      throw err;
    }
  }, [userId]);

  /**
   * Remove visitante localmente (sem recarregar da API)
   */
  const removeVisitante = useCallback((id) => {
    const novosVisitantes = removeVisitanteFromCache(id);
    setVisitantes(novosVisitantes);
    return novosVisitantes;
  }, []);

  /**
   * Adiciona visitante localmente
   */
  const addVisitante = useCallback((visitante) => {
    const empresasData = getCache("empresas") || [];
    const setoresData = getCache("setores") || [];

    const visitanteProcessado = {
      ...visitante,
      empresa:
        empresasData.find((e) => e.id === visitante.empresa_id)?.nome ||
        "Não informado",
      setor:
        setoresData.find((s) => s.id === visitante.setor_id)?.nome ||
        "Não informado",
    };

    const novosVisitantes = addVisitanteToCache(visitanteProcessado);
    setVisitantes(novosVisitantes);
    return novosVisitantes;
  }, []);

  /**
   * Atualiza visitante localmente
   */
  const updateVisitante = useCallback((id, dados) => {
    const empresasData = getCache("empresas") || [];
    const setoresData = getCache("setores") || [];

    const dadosProcessados = {
      ...dados,
      empresa:
        empresasData.find((e) => e.id === dados.empresa_id)?.nome ||
        dados.empresa ||
        "Não informado",
      setor:
        setoresData.find((s) => s.id === dados.setor_id)?.nome ||
        dados.setor ||
        "Não informado",
    };

    const novosVisitantes = updateVisitanteInCache(id, dadosProcessados);
    setVisitantes(novosVisitantes);
    return novosVisitantes;
  }, []);

  /**
   * Limpa todos os dados e cache e desconecta socket
   */
  const clearAllData = useCallback(() => {
    // Desconecta socket
    socketService.disconnect();

    // Remove listeners
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // Limpa estados
    setVisitantes([]);
    setEmpresas([]);
    setSetores([]);
    setResponsaveis([]);
    setUserData(null);
    isDataLoadedRef.current = false;
  }, []);

  // Carrega dados automaticamente quando userId muda
  useEffect(() => {
    if (userId && !isDataLoadedRef.current) {
      loadAllData();
    }
  }, [userId, loadAllData]);

  // 🔥 NOVO: Conecta socket se já tem cache mas socket não está conectado
  useEffect(() => {
    if (userId && hasInitialCacheRef.current && !socketService.isConnected()) {
      console.log("🔌 Reconectando socket após navegação com cache...");
      const token = localStorage.getItem("token");
      if (token) {
        socketService.connect(token);
        setupSocketListeners();
        isDataLoadedRef.current = true;
      }
    }
  }, [userId, setupSocketListeners]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
  }, []);

  return {
    // Estado
    loading,
    progress,
    progressMessage,
    error,

    // Dados
    visitantes,
    empresas,
    setores,
    responsaveis,
    userData,

    // Ações
    loadAllData,
    reloadVisitantes,
    removeVisitante,
    addVisitante,
    updateVisitante,
    clearAllData,

    // Helpers
    isDataLoaded: isDataLoadedRef.current,
    totalVisitantes: visitantes.length,
    isSocketConnected: socketService.isConnected(),
  };
}

export default useDataLoader;
