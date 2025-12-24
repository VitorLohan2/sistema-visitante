import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from "react-native";

import { styles } from "./Profile/styles";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Audio } from "expo-av";

import api from "../services/api";
import { useSocket } from "../contexts/SocketContext";
import { useIncidents } from "../contexts/IncidentsContext";

// Assets
import logoImg from "../assets/gd.png";
import userIconImg from "../assets/user.png";
import notificacaoSom from "../assets/notificacao.mp3";

export default function Profile() {
  // ═══════════════════════════════════════════════════════════════
  // 1. HOOKS DE CONTEXTO
  // ═══════════════════════════════════════════════════════════════
  const socket = useSocket();
  const navigation = useNavigation();
  const { width } = Dimensions.get("window");

  // ✅ Context de Incidents (Cache Global)
  const {
    incidents,
    allIncidents,
    empresasVisitantes,
    setoresVisitantes,
    responsaveisList,
    loading: contextLoading,
    loadIncidents,
    removeIncident,
    syncFromSocket,
    setIncidents,
  } = useIncidents();

  // ═══════════════════════════════════════════════════════════════
  // 2. ESTADOS - DADOS PRINCIPAIS
  // ═══════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const [userData, setUserData] = useState({ setor: "", nome: "" });
  const [displayedIncidents, setDisplayedIncidents] = useState([]);
  // ═══════════════════════════════════════════════════════════════
  // 3. ESTADOS - UI E BUSCA
  // ═══════════════════════════════════════════════════════════════
  const [searchTerm, setSearchTerm] = useState("");
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchedTerm, setLastSearchedTerm] = useState("");
  // ═══════════════════════════════════════════════════════════════
  // 4. ESTADOS - MODAL DE VISITA
  // ═══════════════════════════════════════════════════════════════
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");

  // ═══════════════════════════════════════════════════════════════
  // 5. ESTADOS - MODAL DO MENU
  // ═══════════════════════════════════════════════════════════════
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // 6. REFS - VALORES ESTÁVEIS (NÃO CAUSAM RE-RENDER)
  // ═══════════════════════════════════════════════════════════════
  const userDataRef = useRef({ setor: "", nome: "" });

  // ✅ REF para controle de cooldown do som
  const lastSoundTimeRef = useRef(0);
  const SOUND_COOLDOWN = 3000; // 3 segundos entre sons

  // ✅ REF para controlar tickets já processados (PREVINE DUPLICAÇÃO)
  const processedTicketsRef = useRef(new Set());

  // ✅ REF para prevenir duplicação de listeners
  const ticketListenersRegisteredRef = useRef(false);

  // Refs para busca
  const searchTimeoutRef = useRef(null);

  // ✅ REF para controlar o scroll da FlatList
  const flatListRef = useRef(null);

  // const shouldScrollToTopRef = useRef(false);

  // Refs para animações do menu
  const modalPosition = useRef(new Animated.Value(-300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // ═══════════════════════════════════════════════════════════════
  // 7. CALLBACKS - FUNÇÕES AUXILIARES
  // ═══════════════════════════════════════════════════════════════

  // ✅ TOCAR SOM DE NOTIFICAÇÃO (COM COOLDOWN)
  const playNotificationSound = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastSoundTimeRef.current < SOUND_COOLDOWN) {
        console.log("⏭️ Som bloqueado por cooldown");
        return;
      }

      lastSoundTimeRef.current = now;
      console.log("🔊 Tocando som de notificação...");

      const { sound } = await Audio.Sound.createAsync(notificacaoSom);

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish && !status.isLooping) {
          await sound.unloadAsync();
        }
      });

      await sound.playAsync();
    } catch (err) {
      console.log("❌ Erro ao tocar som:", err);
    }
  }, []);

  // ✅ RECARREGAR TICKETS NÃO VISUALIZADOS
  const loadUnseenTickets = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      if (userDataRef.current.setor !== "Segurança") {
        return;
      }

      const unseenResponse = await api.get("/tickets/unseen", {
        headers: { Authorization: ongId },
      });

      const newCount = Number(unseenResponse.data.count) || 0;
      setUnseenCount(newCount);

      console.log(`🎫 Tickets sincronizados: ${newCount} não vistos`);
    } catch (error) {
      console.error("Erro ao carregar tickets não visualizados:", error);
    }
  }, []);

  // ✅ BUSCAR DADOS INICIAIS (VERSÃO OTIMIZADA)
  const fetchInitialData = useCallback(async () => {
    console.log("🔄 fetchInitialData chamado");

    const ongId = await AsyncStorage.getItem("@Auth:ongId");
    const ongName = await AsyncStorage.getItem("@Auth:ongName");

    if (!ongId) {
      setLoading(false);
      return;
    }

    try {
      // ✅ Carrega dados dos visitantes (apenas 1x via Context)
      await loadIncidents();

      // ✅ Carrega dados da ONG
      const ongResponse = await api.get(`ongs/${ongId}`);
      const setor = ongResponse.data.setor || "";
      const nome = ongResponse.data.name || ongName || "";

      setUserData({ setor, nome });
      userDataRef.current = { setor, nome };

      // ✅ Carrega tickets não vistos (se for Segurança)
      if (setor === "Segurança") {
        const unseenResponse = await api.get("/tickets/unseen", {
          headers: { Authorization: ongId },
        });

        const newCount = Number(unseenResponse.data.count) || 0;
        setUnseenCount(newCount);

        console.log(`📊 ${newCount} tickets não vistos`);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error.message);
    } finally {
      setLoading(false);
    }
  }, [loadIncidents]);

  // ═══════════════════════════════════════════════════════════════
  // 8. HANDLERS - TICKETS
  // ═══════════════════════════════════════════════════════════════

  // ✅ HANDLER PARA NOVO TICKET (COM PROTEÇÃO ANTI-DUPLICAÇÃO)
  const handleTicketCreate = useCallback(
    async (ticketData) => {
      console.log("🎫 Evento ticket:create recebido:", ticketData);

      // Validação de setor
      if (userDataRef.current.setor !== "Segurança") {
        console.log("⏭️ Não é Segurança, ignorando");
        return;
      }

      // ✅ GERAR ID ÚNICO DO TICKET PARA CONTROLE DE DUPLICAÇÃO
      const ticketId = ticketData?.id
        ? `ticket-${ticketData.id}`
        : `ticket-${ticketData?.funcionario}-${Date.now()}`;

      // ✅ PREVENIR PROCESSAMENTO DUPLICADO
      if (processedTicketsRef.current.has(ticketId)) {
        console.log("⏭️ Ticket já processado, ignorando duplicata:", ticketId);
        return;
      }

      // Marcar como processado
      processedTicketsRef.current.add(ticketId);

      // Limpar após 10 segundos (previne crescimento infinito da memória)
      setTimeout(() => {
        processedTicketsRef.current.delete(ticketId);
      }, 10000);

      console.log(`✅ Processando novo ticket: ${ticketId}`);

      // Tocar som
      await playNotificationSound();

      // Incrementar contador
      setUnseenCount((prev) => {
        const prevNum = Number(prev) || 0;
        const newCount = prevNum + 1;
        console.log(`🔢 Contador: ${prevNum} → ${newCount}`);
        return newCount;
      });
    },
    [playNotificationSound]
  );

  // ✅ HANDLER PARA TICKET VISUALIZADO
  const handleTicketViewed = useCallback(() => {
    console.log("👁️ Ticket visualizado via Socket");

    if (userDataRef.current.setor === "Segurança") {
      setUnseenCount((prev) => {
        const prevNum = Number(prev) || 0;
        const newCount = Math.max(0, prevNum - 1);
        console.log(`🔢 Contador decrementado: ${prevNum} → ${newCount}`);
        return newCount;
      });
    }
  }, []);

  // ✅ HANDLER PARA TODOS TICKETS VISUALIZADOS
  const handleTicketAllViewed = useCallback(() => {
    console.log("👁️ Todos tickets visualizados via Socket");

    if (userDataRef.current.setor === "Segurança") {
      console.log("🔢 Contador zerado");
      setUnseenCount(0);
    }
  }, []);

  // ✅ HANDLER PARA TICKET ATUALIZADO
  const handleTicketUpdate = useCallback((ticketData) => {
    console.log("📝 Ticket atualizado via Socket:", ticketData);
    // Apenas log - o estado será atualizado quando entrar na tela de tickets
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // 9. HANDLERS - VISITANTES (CORRIGIDOS)
  // ═══════════════════════════════════════════════════════════════

  // ✅ HANDLER PARA VISITANTE CRIADO
  const handleVisitanteCreate = useCallback(
    async (data) => {
      console.log("🔥 visitante:create recebido:", data);

      // Se recebeu apenas ID ou dados incompletos, busca dados completos
      if (data.id && (!data.nome || !data.empresa_id)) {
        console.log(
          "⚠️ Dados incompletos no create, buscando visitante completo..."
        );

        try {
          const ongId = await AsyncStorage.getItem("@Auth:ongId");
          const response = await api.get(`/incidents/${data.id}`, {
            headers: { Authorization: ongId },
          });

          const fullData = response.data;

          // Adiciona nomes de empresa e setor
          const visitanteCompleto = {
            ...fullData,
            empresa:
              empresasVisitantes.find((e) => e.id === fullData.empresa_id)
                ?.nome || "Não informado",
            setor:
              setoresVisitantes.find((s) => s.id === fullData.setor_id)?.nome ||
              "Não informado",
          };

          console.log(
            "✅ Dados completos do create obtidos:",
            visitanteCompleto
          );

          syncFromSocket({
            type: "create",
            data: visitanteCompleto,
          });
        } catch (err) {
          console.error("❌ Erro ao buscar dados completos do create:", err);
        }
      } else {
        // Dados já estão completos, adiciona nomes de empresa e setor se necessário
        const visitanteCompleto = {
          ...data,
          empresa:
            data.empresa ||
            empresasVisitantes.find((e) => e.id === data.empresa_id)?.nome ||
            "Não informado",
          setor:
            data.setor ||
            setoresVisitantes.find((s) => s.id === data.setor_id)?.nome ||
            "Não informado",
        };

        syncFromSocket({
          type: "create",
          data: visitanteCompleto,
        });
      }
    },
    [syncFromSocket, empresasVisitantes, setoresVisitantes]
  );

  // ✅ HANDLER PARA VISITANTE ATUALIZADO
  const handleVisitanteUpdate = useCallback(
    async (data) => {
      console.log("🔥 visitante:update recebido:", data);

      // Se recebeu apenas ID, busca dados completos
      if (data.id && Object.keys(data).length <= 2) {
        console.log("⚠️ Dados incompletos, buscando visitante completo...");

        try {
          const ongId = await AsyncStorage.getItem("@Auth:ongId");
          const response = await api.get(`/incidents/${data.id}`, {
            headers: { Authorization: ongId },
          });

          const fullData = response.data;

          // Adiciona nomes de empresa e setor
          const visitanteCompleto = {
            ...fullData,
            empresa:
              empresasVisitantes.find((e) => e.id === fullData.empresa_id)
                ?.nome || "Não informado",
            setor:
              setoresVisitantes.find((s) => s.id === fullData.setor_id)?.nome ||
              "Não informado",
          };

          console.log("✅ Dados completos obtidos:", visitanteCompleto);

          syncFromSocket({
            type: "update",
            data: visitanteCompleto,
          });
        } catch (err) {
          console.error("❌ Erro ao buscar dados completos:", err);
        }
      } else {
        // Dados já estão completos
        syncFromSocket({
          type: "update",
          data: data,
        });
      }
    },
    [syncFromSocket, empresasVisitantes, setoresVisitantes]
  );

  // ✅ HANDLER PARA VISITANTE DELETADO
  const handleVisitanteDelete = useCallback(
    (data) => {
      console.log("🔥 visitante:delete recebido:", data);

      syncFromSocket({
        type: "delete",
        data: data,
      });
    },
    [syncFromSocket]
  );

  // ✅ HANDLER PARA BLOQUEIO
  const handleVisitanteBloqueio = useCallback(
    async (data) => {
      console.log("🔥 visitante:block/bloqueio recebido:", data);

      // Bloqueio retorna dados mínimos, precisa buscar completo
      if (data.id) {
        console.log("🔍 Buscando dados completos do bloqueio...");

        try {
          const ongId = await AsyncStorage.getItem("@Auth:ongId");
          const response = await api.get(`/incidents/${data.id}`, {
            headers: { Authorization: ongId },
          });

          const fullData = response.data;

          const visitanteCompleto = {
            ...fullData,
            empresa:
              empresasVisitantes.find((e) => e.id === fullData.empresa_id)
                ?.nome || "Não informado",
            setor:
              setoresVisitantes.find((s) => s.id === fullData.setor_id)?.nome ||
              "Não informado",
          };

          console.log("✅ Dados completos do bloqueio:", visitanteCompleto);

          syncFromSocket({
            type: "update",
            data: visitanteCompleto,
          });
        } catch (err) {
          console.error("❌ Erro ao buscar dados do bloqueio:", err);
        }
      }
    },
    [syncFromSocket, empresasVisitantes, setoresVisitantes]
  );

  // ═══════════════════════════════════════════════════════════════
  // 10. EFFECTS - SOCKET.IO LISTENERS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // ✅ Validações iniciais
    if (!socket) {
      console.log("⚠️ Socket não existe");
      return;
    }

    if (!socket.connected) {
      console.log("⚠️ Socket não conectado");
      return;
    }

    if (ticketListenersRegisteredRef.current) {
      console.log("⚠️ Listeners já registrados, ignorando");
      return;
    }

    console.log("🔌 Registrando listeners do Socket:", socket.id);
    ticketListenersRegisteredRef.current = true;

    // ✅ REMOVER TODOS OS LISTENERS ANTIGOS
    console.log("🧹 Removendo listeners antigos...");

    // Tickets
    socket.removeAllListeners("ticket:create");
    socket.removeAllListeners("ticket:update");
    socket.removeAllListeners("ticket:viewed");
    socket.removeAllListeners("ticket:all_viewed");

    // Visitantes
    socket.removeAllListeners("visitante:create");
    socket.removeAllListeners("visitante:update");
    socket.removeAllListeners("visitante:delete");
    socket.removeAllListeners("visitante:block");
    socket.removeAllListeners("bloqueio:created");
    socket.removeAllListeners("bloqueio:updated");

    // ✅ REGISTRAR NOVOS LISTENERS
    console.log("📝 Registrando novos listeners...");

    // Listeners de tickets
    socket.on("ticket:create", handleTicketCreate);
    socket.on("ticket:update", handleTicketUpdate);
    socket.on("ticket:viewed", handleTicketViewed);
    socket.on("ticket:all_viewed", handleTicketAllViewed);

    // Listeners de visitantes (CORRIGIDOS)
    socket.on("visitante:create", handleVisitanteCreate);
    socket.on("visitante:update", handleVisitanteUpdate);
    socket.on("visitante:delete", handleVisitanteDelete);
    socket.on("visitante:block", handleVisitanteBloqueio);
    socket.on("bloqueio:created", handleVisitanteBloqueio);
    socket.on("bloqueio:updated", handleVisitanteBloqueio);

    console.log("✅ Listeners registrados com sucesso!");

    // ✅ CLEANUP FUNCTION
    return () => {
      console.log("🧹 Cleanup: Removendo todos os listeners");

      // Tickets
      socket.removeAllListeners("ticket:create");
      socket.removeAllListeners("ticket:update");
      socket.removeAllListeners("ticket:viewed");
      socket.removeAllListeners("ticket:all_viewed");

      // Visitantes
      socket.removeAllListeners("visitante:create");
      socket.removeAllListeners("visitante:update");
      socket.removeAllListeners("visitante:delete");
      socket.removeAllListeners("visitante:block");
      socket.removeAllListeners("bloqueio:created");
      socket.removeAllListeners("bloqueio:updated");

      ticketListenersRegisteredRef.current = false;
      processedTicketsRef.current.clear();

      console.log("✅ Cleanup concluído");
    };
  }, [
    socket,
    handleTicketCreate,
    handleTicketUpdate,
    handleTicketViewed,
    handleTicketAllViewed,
    handleVisitanteCreate,
    handleVisitanteUpdate,
    handleVisitanteDelete,
    handleVisitanteBloqueio,
  ]);

  // ═══════════════════════════════════════════════════════════════
  // 11. EFFECTS - BUSCA ULTRA-RÁPIDA (INSTANTÂNEA LOCAL + API DEBOUNCE)
  // ═══════════════════════════════════════════════════════════════

  // ✅ REF para controlar última busca API
  // const lastAPISearchRef = useRef("");
  // const apiSearchTimeoutRef = useRef(null);
  // const searchStartTimeRef = useRef(0);

  const executeSearch = useCallback(async () => {
    const query = searchTerm.trim();

    // Limpar busca
    if (!query) {
      setDisplayedIncidents(allIncidents);
      setIsSearching(false);
      setSearchExecuted(false); // ✅ MARCA QUE NÃO HÁ BUSCA ATIVA

      // ✅ SCROLL PARA O TOPO QUANDO LIMPAR
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({
            offset: 0,
            animated: true,
          });
        }
      }, 100);

      return;
    }

    console.log(`🔍 Executando busca: "${query}"`);
    setSearchExecuted(true); // ✅ MARCA QUE BUSCA FOI EXECUTADA
    setLastSearchedTerm(query);

    // Scroll para o topo com pequeno delay para garantir que a lista já foi atualizada
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: 0,
          animated: false,
        });
      }
    }, 100);

    // Busca local INSTANTÂNEA
    const cpfNumbers = query.replace(/\D/g, "");
    const localResults = allIncidents.filter((item) => {
      if (item.nome && item.nome.toLowerCase().includes(query.toLowerCase())) {
        return true;
      }
      if (
        item.cpf &&
        cpfNumbers.length > 0 &&
        item.cpf.replace(/\D/g, "").includes(cpfNumbers)
      ) {
        return true;
      }
      return false;
    });

    if (localResults.length > 0) {
      setDisplayedIncidents(localResults);
      setIsSearching(false);
      console.log(`⚡ ${localResults.length} resultados locais`);
      return;
    }

    // Busca na API se não encontrou localmente
    setIsSearching(true);
    try {
      const response = await api.get("/search", {
        params: { query },
        timeout: 5000,
      });

      const apiResults = response.data.map((incident) => ({
        ...incident,
        empresa:
          empresasVisitantes.find((e) => e.id === incident.empresa_id)?.nome ||
          "Não informado",
        setor:
          setoresVisitantes.find((s) => s.id === incident.setor_id)?.nome ||
          "Não informado",
      }));

      setDisplayedIncidents(apiResults);
      console.log(`🌐 ${apiResults.length} resultados da API`);
    } catch (err) {
      console.error("❌ Erro na busca:", err);
      setDisplayedIncidents([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, allIncidents, empresasVisitantes, setoresVisitantes]);

  // Sincroniza displayedIncidents com allIncidents APENAS quando allIncidents muda
  useEffect(() => {
    // Só atualiza se não há termo de busca ativo
    if (!searchTerm.trim()) {
      setDisplayedIncidents(allIncidents);
    }
  }, [allIncidents]);

  // ═══════════════════════════════════════════════════════════════
  // 12. EFFECTS - CICLO DE ATUALIZAÇÃO (FOCO NA TELA)
  // ═══════════════════════════════════════════════════════════════
  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [fetchInitialData])
  );

  // ═══════════════════════════════════════════════════════════════
  // 13. FUNÇÕES AUXILIARES - NAVEGAÇÃO E AÇÕES
  // ═══════════════════════════════════════════════════════════════

  function handleLogout() {
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      {
        text: "Sair",
        style: "destructive",
        onPress: () => {
          AsyncStorage.clear();
          navigation.reset({ index: 0, routes: [{ name: "Logon" }] });
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  function handleNavigateToVisitors() {
    navigation.navigate("Visitors");
  }

  function handleNavigateToHistory() {
    navigation.navigate("History");
  }

  function handleNavigateToTickets() {
    navigation.navigate("TicketDashboard");
  }

  function handleNavigateToBipagem() {
    navigation.navigate("BiparCracha");
  }

  // REGISTRAR VISITA
  async function handleRegisterVisit(id) {
    try {
      const incident = incidents.find((inc) => inc.id === id);

      if (!incident || incident.bloqueado) {
        Alert.alert("Acesso Negado", "Visitante bloqueado ou não encontrado.");
        return;
      }

      setSelectedIncident(incident);
      setResponsavel("");
      setObservacao("");
      setModalVisible(true);
    } catch (err) {
      Alert.alert("Erro", err.message);
    }
  }

  async function confirmarVisita() {
    if (!selectedIncident || !responsavel.trim()) {
      Alert.alert("Erro", "Selecione quem liberou a visita.");
      return;
    }

    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      const response = await api.post(
        "/visitors",
        {
          name: selectedIncident.nome,
          cpf: selectedIncident.cpf,
          company: selectedIncident.empresa,
          sector: selectedIncident.setor,
          placa_veiculo: selectedIncident.placa_veiculo || "",
          cor_veiculo: selectedIncident.cor_veiculo || "",
          responsavel: responsavel,
          observacao: observacao,
        },
        {
          headers: { Authorization: ongId },
        }
      );

      if (response.status === 201) {
        Alert.alert("Sucesso", "Visita registrada!");
        setModalVisible(false);
        setResponsavel("");
        setObservacao("");
        setSelectedIncident(null);
        navigation.navigate("Visitors");
      }
    } catch (err) {
      Alert.alert("Erro", err.response?.data?.error || err.message);
    }
  }

  function handleDeleteIncident(id) {
    Alert.alert("Confirmação", "Deseja deletar este cadastro?", [
      {
        text: "Deletar",
        style: "destructive",
        onPress: async () => {
          try {
            const ongId = await AsyncStorage.getItem("@Auth:ongId");

            await api.delete(`incidents/${id}`, {
              headers: { Authorization: ongId },
            });

            // ✅ Remove do cache do Context
            removeIncident(id);

            Alert.alert("Sucesso", "Cadastro deletado!");
          } catch (err) {
            const error = err.response?.data?.error || err.message;
            Alert.alert(`Acesso Bloqueado: ${error}`);
          }
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  function handleEditProfile(id) {
    navigation.navigate("EditIncident", { id });
  }

  function handleViewProfile(id) {
    navigation.navigate("ViewVisitor", { id });
  }

  // ANIMAÇÕES DO MENU MODAL
  const openMenuModal = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setMenuModalVisible(true);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(modalPosition, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimating(false);
      });
    }, 10);
  };

  const closeMenuModal = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    Animated.parallel([
      Animated.timing(modalPosition, {
        toValue: -300,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMenuModalVisible(false);
      setIsAnimating(false);
    });
  };

  // FORMATAR DATA
  function formatarData(data) {
    if (!data) return "Data não informada";
    const dataParte = data.split("T")[0];
    const partes = dataParte.split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // 12. RENDER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  // RENDER ITEM DA LISTA
  function renderIncident({ item }) {
    const avatarSource = item.avatar_imagem
      ? { uri: item.avatar_imagem }
      : userIconImg;

    return (
      <View
        style={[
          styles.incidentItem,
          item.bloqueado && styles.incidentItemBlocked,
        ]}
      >
        <View style={styles.cardLeft}>
          <View style={styles.cardAvatar}>
            <Image source={avatarSource} style={styles.avatarImage} />
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.incidentNameRow}>
              <Text
                style={[
                  styles.incidentName,
                  item.bloqueado && styles.blockedName,
                ]}
              >
                {item.nome}
              </Text>
              {item.bloqueado && (
                <View style={styles.blockedBadge}>
                  <Text style={styles.blockedBadgeText}>BLOQUEADO</Text>
                </View>
              )}
            </View>

            <View style={styles.cardDetailRow}>
              <View style={styles.cardDetailColumn}>
                <Text style={styles.detailLabel}>Nascimento</Text>
                <Text style={styles.incidentTextValue}>
                  {formatarData(item.nascimento)}
                </Text>
              </View>
              <View style={styles.cardDetailColumn}>
                <Text style={styles.detailLabel}>CPF</Text>
                <Text style={styles.incidentTextValue}>{item.cpf}</Text>
              </View>
            </View>

            <View style={styles.cardDetailRow}>
              <View style={styles.cardDetailColumn}>
                <Text style={styles.detailLabel}>Empresa</Text>
                <Text style={styles.incidentTextValue}>{item.empresa}</Text>
              </View>
              <View style={styles.cardDetailColumn}>
                <Text style={styles.detailLabel}>Setor</Text>
                <Text style={styles.incidentTextValue}>{item.setor}</Text>
              </View>
            </View>

            <View style={styles.cardDetailRow}>
              <View style={styles.cardDetailColumn}>
                <Text style={styles.detailLabel}>Placa</Text>
                <Text style={styles.incidentTextValue}>
                  {item.placa_veiculo || "-"}
                </Text>
              </View>
              <View style={styles.cardDetailColumn}>
                <Text style={styles.detailLabel}>Cor</Text>
                <Text style={styles.incidentTextValue}>
                  {item.cor_veiculo || "-"}
                </Text>
              </View>
            </View>

            <View style={styles.cardDetailRow}>
              <View style={styles.cardDetailColumnFull}>
                <Text style={styles.detailLabel}>Telefone</Text>
                <Text style={styles.incidentTextValue}>{item.telefone}</Text>
              </View>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.actionsContainer,
            item.bloqueado && styles.incidentItemBlocked,
          ]}
        >
          <TouchableOpacity
            onPress={() => handleRegisterVisit(item.id)}
            style={[styles.actionButton, styles.actionVisit]}
            disabled={item.bloqueado}
          >
            <Feather
              name="user-plus"
              size={20}
              color={item.bloqueado ? "#ccc" : "#34CB79"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleViewProfile(item.id)}
            style={styles.actionButton}
          >
            <Feather name="search" size={20} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleEditProfile(item.id)}
            style={styles.actionButton}
          >
            <Feather name="edit" size={20} color="#20a3e0" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Alert.alert("Crachá", "Funcionalidade de crachá.");
            }}
            style={styles.actionButton}
          >
            <Feather name="user-check" size={20} color="#f9a825" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteIncident(item.id)}
            style={styles.actionButton}
          >
            <Feather name="trash-2" size={20} color="#e02041" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sortedAllIncidents = useMemo(() => {
    return [...allIncidents].sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || "")
    );
  }, [allIncidents]);

  const filteredIncidents = useMemo(() => {
    // Se displayedIncidents estiver vazio E não houver busca ativa, mostra tudo ordenado
    if (displayedIncidents.length === 0 && !searchTerm.trim()) {
      return sortedAllIncidents;
    }

    // Se há resultados em displayedIncidents (de uma busca), ordena e retorna
    if (displayedIncidents.length > 0) {
      return [...displayedIncidents].sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "")
      );
    }

    // Caso contrário, retorna array vazio (nenhum resultado)
    return [];
  }, [displayedIncidents, searchTerm, sortedAllIncidents]);

  // ═══════════════════════════════════════════════════════════════
  // 13. LOADING STATE
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando Listagem...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* CABEÇALHO */}
      {/* ═══════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={logoImg} style={styles.logo} />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Feather name="power" size={24} color="#e02041" />
          </TouchableOpacity>
        </View>

        <Text style={styles.welcomeText}>
          Bem-vindo(a), {userData.nome || "Usuário"}
        </Text>

        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#999" />
          <TextInput
            placeholder="Consultar por nome ou CPF"
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              // ✅ Se limpar o campo, executa a limpeza imediatamente
              if (text.trim() === "") {
                setDisplayedIncidents(allIncidents);
                setIsSearching(false);
                setSearchExecuted(false); // ✅ MARCA QUE NÃO HÁ BUSCA

                // ✅ SCROLL PARA O TOPO AO LIMPAR
                setTimeout(() => {
                  if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({
                      offset: 0,
                      animated: true,
                    });
                  }
                }, 100);
              }
            }}
            onSubmitEditing={executeSearch}
            returnKeyType="search"
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate("NewIncident")}
          >
            <Text style={styles.navButtonText}>Cadastrar Visitante</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* INFO DA BUSCA */}
      {/* ═══════════════════════════════════════════════════════ */}
      {searchExecuted && lastSearchedTerm && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoText}>
            Buscando por "{lastSearchedTerm}" ({filteredIncidents.length}{" "}
            resultados)
          </Text>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MENU PRINCIPAL COM CÍRCULOS COLORIDOS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <View style={styles.menu}>
        <TouchableOpacity
          onPress={handleNavigateToVisitors}
          style={styles.menuButton}
        >
          <View style={[styles.menuIconCircle, styles.visitantesCircle]}>
            <Feather name="users" size={24} color="#000" />
          </View>
          <Text style={styles.menuButtonText}>Visitantes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNavigateToHistory}
          style={styles.menuButton}
        >
          <View style={[styles.menuIconCircle, styles.historicoCircle]}>
            <Feather name="clock" size={24} color="#000" />
          </View>
          <Text style={styles.menuButtonText}>Histórico</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNavigateToTickets}
          style={styles.menuButton}
        >
          <View style={[styles.menuIconCircle, styles.ticketsCircle]}>
            <Feather name="message-square" size={24} color="#000" />
          </View>
          <Text style={styles.menuButtonText}>Tickets</Text>
          {userData.setor === "Segurança" && unseenCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>
                {unseenCount > 9 ? "9+" : unseenCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNavigateToBipagem}
          style={styles.menuButton}
        >
          <View style={[styles.menuIconCircle, styles.crachaCircle]}>
            <MaterialCommunityIcons
              name="barcode-scan"
              size={24}
              color="#000"
            />
          </View>
          <Text style={styles.menuButtonText}>Cracha</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openMenuModal}
          style={styles.menuButton}
          disabled={isAnimating}
        >
          <View style={[styles.menuIconCircle, styles.menuCircle]}>
            <MaterialCommunityIcons name="menu" size={24} color="#000" />
          </View>
          <Text style={styles.menuButtonText}>Menu</Text>
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TÍTULO E LISTA DE VISITANTES */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Text style={styles.title}>Visitantes Cadastrados</Text>

      <FlatList
        ref={flatListRef}
        data={filteredIncidents}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderIncident}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm.trim()
                ? `Nenhum resultado encontrado para "${searchTerm.trim()}"`
                : "Nenhum cadastro encontrado"}
            </Text>
          </View>
        )}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL DE REGISTRAR VISITA */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setResponsavel("");
          setObservacao("");
          setSelectedIncident(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Visita</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setResponsavel("");
                  setObservacao("");
                  setSelectedIncident(null);
                }}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedIncident && (
              <>
                <Text style={styles.modalText}>
                  Registrar visita para:{" "}
                  <Text style={{ fontWeight: "bold" }}>
                    {selectedIncident.nome}
                  </Text>
                </Text>

                <Text style={styles.modalLabel}>Quem liberou?</Text>

                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={responsavel}
                    onValueChange={(itemValue) => {
                      setResponsavel(itemValue);
                    }}
                    style={styles.pickerStyle}
                  >
                    <Picker.Item
                      label="Selecione um responsável"
                      value=""
                      color="#999"
                    />
                    {responsaveisList.map((resp, index) => (
                      <Picker.Item key={index} label={resp} value={resp} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.modalLabel}>Observação:</Text>
                <TextInput
                  style={[styles.responsavelInput, styles.observacaoInput]}
                  placeholder="Adicione uma observação para esta visita..."
                  value={observacao}
                  onChangeText={setObservacao}
                  multiline={true}
                  numberOfLines={4}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setModalVisible(false);
                      setResponsavel("");
                      setObservacao("");
                      setSelectedIncident(null);
                    }}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalButtonConfirm,
                      !responsavel.trim() && styles.modalButtonDisabled,
                    ]}
                    onPress={confirmarVisita}
                    disabled={!responsavel.trim()}
                  >
                    <Text style={styles.modalButtonConfirmText}>
                      Confirmar Visita
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL DO MENU LATERAL */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Animated.View
        style={[
          styles.menuModalOverlay,
          {
            opacity: overlayOpacity,
            display: menuModalVisible ? "flex" : "none",
          },
        ]}
        pointerEvents={menuModalVisible ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles.menuModalBackdrop}
          activeOpacity={1}
          onPress={closeMenuModal}
        />
        <Animated.View
          style={[
            styles.menuModalContainer,
            {
              transform: [{ translateX: modalPosition }],
              width: width * 0.75,
            },
          ]}
        >
          <View style={styles.menuModalHeader}>
            <View style={styles.menuModalHeaderContent}>
              <View style={styles.menuModalUserInfo}>
                <View style={styles.menuModalAvatar}>
                  <Feather name="user" size={40} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.menuModalUserName}>
                    {userData.nome || "Usuário"}
                  </Text>
                  <Text style={styles.menuModalUserSetor}>
                    {userData.setor || "Setor não informado"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={closeMenuModal}
                style={styles.menuModalCloseButton}
                disabled={isAnimating}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.menuModalOptions}>
            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                navigation.navigate("Admin");
              }}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.menuModalIcon,
                  { backgroundColor: "rgba(249, 168, 37, 0.1)" },
                ]}
              >
                <Feather name="globe" size={24} color="#f9a825" />
              </View>
              <View style={styles.menuModalOptionContent}>
                <Text style={styles.menuModalOptionTitle}>Painel Admin</Text>
                <Text style={styles.menuModalOptionDescription}>
                  Sistema Administrador
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                navigation.navigate("Agendamentos");
              }}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.menuModalIcon,
                  { backgroundColor: "rgba(16, 185, 129, 0.1)" },
                ]}
              >
                <Feather name="calendar" size={24} color="#10B981" />
              </View>
              <View style={styles.menuModalOptionContent}>
                <Text style={styles.menuModalOptionTitle}>Agendamentos</Text>
                <Text style={styles.menuModalOptionDescription}>
                  Visitas Agendadas
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                Alert.alert(
                  "Em desenvolvimento",
                  "Funcionalidade em desenvolvimento"
                );
              }}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.menuModalIcon,
                  { backgroundColor: "rgba(32, 163, 224, 0.1)" },
                ]}
              >
                <Feather name="users" size={24} color="#20a3e0" />
              </View>
              <View style={styles.menuModalOptionContent}>
                <Text style={styles.menuModalOptionTitle}>
                  Gerenciador de Funcionários
                </Text>
                <Text style={styles.menuModalOptionDescription}>
                  Controle de Funcionários
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                Alert.alert(
                  "Em desenvolvimento",
                  "Funcionalidade em desenvolvimento"
                );
              }}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.menuModalIcon,
                  { backgroundColor: "rgba(32, 45, 224, 0.1)" },
                ]}
              >
                <Feather name="briefcase" size={24} color="#202de0ff" />
              </View>
              <View style={styles.menuModalOptionContent}>
                <Text style={styles.menuModalOptionTitle}>
                  Cadastrar Empresas
                </Text>
                <Text style={styles.menuModalOptionDescription}>
                  Empresa não cadastrado
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                Alert.alert(
                  "Em desenvolvimento",
                  "Funcionalidade em desenvolvimento"
                );
              }}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.menuModalIcon,
                  { backgroundColor: "rgba(249, 168, 37, 0.1)" },
                ]}
              >
                <Feather name="check-square" size={24} color="#f9a825" />
              </View>
              <View style={styles.menuModalOptionContent}>
                <Text style={styles.menuModalOptionTitle}>
                  Marcador de Ponto
                </Text>
                <Text style={styles.menuModalOptionDescription}>
                  Marque seu ponto
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                Alert.alert(
                  "Em desenvolvimento",
                  "Funcionalidade em desenvolvimento"
                );
              }}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.menuModalIcon,
                  { backgroundColor: "rgba(249, 168, 37, 0.1)" },
                ]}
              >
                <Feather name="settings" size={24} color="#f9a825" />
              </View>
              <View style={styles.menuModalOptionContent}>
                <Text style={styles.menuModalOptionTitle}>Configurações</Text>
                <Text style={styles.menuModalOptionDescription}>
                  Configurações do sistema
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                Alert.alert(
                  "Em desenvolvimento",
                  "Funcionalidade em desenvolvimento"
                );
              }}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.menuModalIcon,
                  { backgroundColor: "rgba(224, 32, 65, 0.1)" },
                ]}
              >
                <Feather name="help-circle" size={24} color="#e02041" />
              </View>
              <View style={styles.menuModalOptionContent}>
                <Text style={styles.menuModalOptionTitle}>Suporte</Text>
                <Text style={styles.menuModalOptionDescription}>
                  Central de ajuda e suporte
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                handleLogout();
              }}
              disabled={isAnimating}
            >
              <View
                style={[
                  styles.menuModalIcon,
                  { backgroundColor: "rgba(160, 174, 192, 0.1)" },
                ]}
              >
                <Feather name="log-out" size={24} color="#a0aec0" />
              </View>
              <View style={styles.menuModalOptionContent}>
                <Text style={styles.menuModalOptionTitle}>Sair</Text>
                <Text style={styles.menuModalOptionDescription}>
                  Sair do sistema
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.menuModalFooter}>
            <Text style={styles.menuModalVersion}>v1.0.0</Text>
            <Text style={styles.menuModalCopyright}>
              © 2025 Sistema Liberaê
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      <View style={styles.margin}></View>
    </SafeAreaView>
  );
}
