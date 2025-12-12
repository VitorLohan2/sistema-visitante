import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const IncidentsContext = createContext({});

export function IncidentsProvider({ children }) {
  // ═══════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════
  const [incidents, setIncidents] = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [empresasVisitantes, setEmpresasVisitantes] = useState([]);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);
  const [responsaveisList, setResponsaveisList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // ✅ AGORA É STATE

  // ═══════════════════════════════════════════════════════════════
  // REFS - Controle de carregamento
  // ═══════════════════════════════════════════════════════════════
  const loadingRef = useRef(false);
  const empresasRef = useRef([]); // ✅ REF para sincronização
  const setoresRef = useRef([]); // ✅ REF para sincronização

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÃO PRINCIPAL - CARREGAR DADOS (APENAS 1X)
  // ═══════════════════════════════════════════════════════════════
  const loadIncidents = useCallback(
    async (forceReload = false) => {
      // ✅ Se já está carregando, não faz nada
      if (loadingRef.current) {
        console.log("⏭️ Já está carregando, ignorando...");
        return;
      }

      // ✅ Se já carregou e não é reload forçado, não faz nada
      if (isDataLoaded && !forceReload) {
        console.log("✅ Dados já carregados, usando cache");
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);

        console.log("🔄 Carregando dados dos visitantes...");

        const ongId = await AsyncStorage.getItem("@Auth:ongId");
        if (!ongId) {
          console.log("❌ ONG ID não encontrado");
          return;
        }

        // 1. Carregar empresas e setores
        const [empresasResponse, setoresResponse] = await Promise.all([
          api.get("/empresas-visitantes"),
          api.get("/setores-visitantes"),
        ]);

        const empresas = empresasResponse.data || [];
        const setores = setoresResponse.data || [];

        setEmpresasVisitantes(empresas);
        setSetoresVisitantes(setores);
        empresasRef.current = empresas; // ✅ Salva no REF
        setoresRef.current = setores; // ✅ Salva no REF

        // 2. Carregar responsáveis
        try {
          const respResponse = await api.get("/responsaveis", {
            headers: { Authorization: ongId },
          });
          const nomesResponsaveis = (respResponse.data || []).map(
            (r) => r.nome
          );
          setResponsaveisList(nomesResponsaveis);
        } catch (err) {
          console.error("Erro ao carregar responsáveis:", err);
          setResponsaveisList([
            "Portaria",
            "Recepção",
            "Segurança",
            "Administração",
          ]);
        }

        // 3. Carregar incidents
        const profileResponse = await api.get("profile", {
          headers: { Authorization: ongId },
        });

        const incidentsWithNames = profileResponse.data.map((incident) => ({
          ...incident,
          empresa:
            empresas.find((e) => e.id === incident.empresa_id)?.nome ||
            "Não informado",
          setor:
            setores.find((s) => s.id === incident.setor_id)?.nome ||
            "Não informado",
        }));

        setAllIncidents(incidentsWithNames);
        setIncidents(incidentsWithNames);

        // ✅ Marca como carregado (AGORA USA STATE)
        setIsDataLoaded(true);

        console.log(
          `✅ ${incidentsWithNames.length} visitantes carregados com sucesso!`
        );
      } catch (error) {
        console.error("❌ Erro ao carregar dados:", error.message);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [isDataLoaded]
  ); // ✅ Adiciona dependência

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÃO - ADICIONAR NOVO VISITANTE (SEM RECARREGAR TUDO)
  // ═══════════════════════════════════════════════════════════════
  const addIncident = useCallback((newIncident) => {
    console.log("➕ Adicionando novo visitante ao cache:", newIncident);

    const incidentWithNames = {
      ...newIncident,
      empresa:
        empresasRef.current.find((e) => e.id === newIncident.empresa_id)
          ?.nome || "Não informado",
      setor:
        setoresRef.current.find((s) => s.id === newIncident.setor_id)?.nome ||
        "Não informado",
    };

    setAllIncidents((prev) => {
      // ✅ Verifica se já existe (previne duplicação)
      if (prev.some((item) => item.id === incidentWithNames.id)) {
        console.log("⚠️ Visitante já existe no cache, ignorando");
        return prev;
      }
      return [incidentWithNames, ...prev];
    });

    setIncidents((prev) => {
      if (prev.some((item) => item.id === incidentWithNames.id)) {
        return prev;
      }
      return [incidentWithNames, ...prev];
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÃO - ATUALIZAR VISITANTE (SEM RECARREGAR TUDO)
  // ═══════════════════════════════════════════════════════════════
  const updateIncident = useCallback((id, updatedData) => {
    // console.log("📝 Atualizando visitante no cache:", id, updatedData);

    const updateList = (list) =>
      list.map((incident) =>
        incident.id === id
          ? {
              ...incident,
              ...updatedData,
              empresa:
                empresasRef.current.find(
                  (e) =>
                    e.id === (updatedData.empresa_id || incident.empresa_id)
                )?.nome || incident.empresa,
              setor:
                setoresRef.current.find(
                  (s) => s.id === (updatedData.setor_id || incident.setor_id)
                )?.nome || incident.setor,
            }
          : incident
      );

    setAllIncidents(updateList);
    setIncidents(updateList);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÃO - REMOVER VISITANTE (SEM RECARREGAR TUDO)
  // ═══════════════════════════════════════════════════════════════
  const removeIncident = useCallback((id) => {
    console.log("🗑️ Removendo visitante do cache:", id);

    setAllIncidents((prev) => prev.filter((incident) => incident.id !== id));
    setIncidents((prev) => prev.filter((incident) => incident.id !== id));
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÃO - SINCRONIZAR VIA SOCKET
  // ═══════════════════════════════════════════════════════════════
  const syncFromSocket = useCallback(
    (socketData) => {
      // console.log("🔄 Sincronizando dados via Socket:", socketData);

      // ✅ AGUARDA OS DADOS ESTAREM CARREGADOS
      if (!isDataLoaded) {
        console.log("⏳ Aguardando carregamento inicial dos dados...");
        setTimeout(() => syncFromSocket(socketData), 500);
        return;
      }

      if (socketData.type === "create") {
        addIncident(socketData.data);
      } else if (socketData.type === "update") {
        updateIncident(socketData.data.id, socketData.data);
      } else if (socketData.type === "delete") {
        removeIncident(socketData.data.id);
      }
    },
    [addIncident, updateIncident, removeIncident, isDataLoaded] // ✅ Adiciona isDataLoaded
  );

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÃO - LIMPAR CACHE (LOGOUT)
  // ═══════════════════════════════════════════════════════════════
  const clearCache = useCallback(() => {
    console.log("🧹 Limpando cache de dados");

    setIncidents([]);
    setAllIncidents([]);
    setEmpresasVisitantes([]);
    setSetoresVisitantes([]);
    setResponsaveisList([]);
    setIsDataLoaded(false); // ✅ Agora usa setState
    loadingRef.current = false;
    empresasRef.current = [];
    setoresRef.current = [];
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER VALUE
  // ═══════════════════════════════════════════════════════════════
  const value = {
    // Estados
    incidents,
    allIncidents,
    empresasVisitantes,
    setoresVisitantes,
    responsaveisList,
    loading,
    isDataLoaded, // ✅ Agora é um state que atualiza

    // Funções
    loadIncidents,
    addIncident,
    updateIncident,
    removeIncident,
    syncFromSocket,
    clearCache,

    // Setters diretos (para busca)
    setIncidents,
  };

  return (
    <IncidentsContext.Provider value={value}>
      {children}
    </IncidentsContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOOK CUSTOMIZADO
// ═══════════════════════════════════════════════════════════════
export function useIncidents() {
  const context = useContext(IncidentsContext);

  if (!context) {
    throw new Error("useIncidents deve ser usado dentro de IncidentsProvider");
  }

  return context;
}
