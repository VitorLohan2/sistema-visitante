import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from "react-native";

import { Picker } from "@react-native-picker/picker";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import api from "../services/api";

// Importações dos hooks do SocketContext
import { useSocket } from "../contexts/SocketContext";

// Assets
import logoImg from "../assets/gd.png";
import userIconImg from "../assets/user.png";
import notificacaoSom from "../assets/notificacao.mp3";
import { Audio } from "expo-av";

export default function Profile() {
  const socket = useSocket();

  const [incidents, setIncidents] = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const [userData, setUserData] = useState({ setor: "", nome: "" });
  const [empresasVisitantes, setEmpresasVisitantes] = useState([]);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);

  // ESTADOS PARA O MODAL DE VISITA
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");
  const [responsaveisList, setResponsaveisList] = useState([]);

  // ESTADOS PARA O MODAL DO MENU
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const modalPosition = useRef(new Animated.Value(-300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  const unseenRef = useRef(0);
  const isFirstLoad = useRef(true);
  const searchTimeoutRef = useRef(null);

  // ✅ REFS para valores estáveis (NÃO causam re-render)
  const empresasRef = useRef([]);
  const setoresRef = useRef([]);
  const userDataRef = useRef({ setor: "", nome: "" });

  const navigation = useNavigation();
  const { width, height } = Dimensions.get("window");

  // ----------------------
  // TOCAR SOM
  // ----------------------
  const playNotificationSound = useCallback(async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(notificacaoSom);

      // ✅ Configura o callback ANTES de tocar
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish && !status.isLooping) {
          await sound.unloadAsync();
        }
      });

      await sound.playAsync();
    } catch (err) {
      console.log("Erro ao tocar som:", err);
    }
  }, []);

  // ----------------------
  // CARREGAR RESPONSÁVEIS
  // ----------------------
  const carregarResponsaveis = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const response = await api.get("/responsaveis", {
        headers: { Authorization: ongId },
      });
      const nomesResponsaveis = (response.data || []).map((r) => r.nome);
      setResponsaveisList(nomesResponsaveis);
      setResponsavel("");
    } catch (err) {
      console.error("Erro ao carregar responsáveis:", err);
      setResponsaveisList([
        "Portaria",
        "Recepção",
        "Segurança",
        "Administração",
      ]);
      setResponsavel("");
    }
  }, []);

  // ----------------------
  // ✅ BUSCAR DADOS INICIAIS - OTIMIZADA
  // ----------------------
  const fetchInitialData = useCallback(async () => {
    const ongId = await AsyncStorage.getItem("@Auth:ongId");
    const ongName = await AsyncStorage.getItem("@Auth:ongName");

    if (!ongId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Carrega empresas, setores e responsáveis em paralelo
      const [empresasResponse, setoresResponse] = await Promise.all([
        api.get("/empresas-visitantes"),
        api.get("/setores-visitantes"),
      ]);

      const empresas = empresasResponse.data || [];
      const setores = setoresResponse.data || [];

      // ✅ Atualiza TANTO state QUANTO ref
      setEmpresasVisitantes(empresas);
      setSetoresVisitantes(setores);
      empresasRef.current = empresas;
      setoresRef.current = setores;

      // 2. Carrega responsáveis
      await carregarResponsaveis();

      // 3. Carrega dados da ONG
      const ongResponse = await api.get(`ongs/${ongId}`);
      const setor = ongResponse.data.setor || "";
      const nome = ongResponse.data.name || ongName || "";

      setUserData({ setor, nome });
      userDataRef.current = { setor, nome };

      // 4. Carrega todos os incidents
      const profileResponse = await api.get("profile", {
        headers: { Authorization: ongId },
      });

      // 5. Mapeia com nomes de empresa/setor
      const incidentsWithNames = profileResponse.data.map((incident) => ({
        ...incident,
        empresa:
          empresas.find((e) => e.id === incident.empresa_id)?.nome ||
          "Não informado",
        setor:
          setores.find((s) => s.id === incident.setor_id)?.nome ||
          "Não informado",
      }));

      // 6. Salva os dados
      setAllIncidents(incidentsWithNames);
      setIncidents(incidentsWithNames);

      console.log(
        "✅ Dados carregados:",
        incidentsWithNames.length,
        "registros"
      );

      // 7. Lógica de segurança
      if (setor === "Segurança") {
        const unseenResponse = await api.get("/tickets/unseen", {
          headers: { Authorization: ongId },
        });

        const newCount = unseenResponse.data.count;
        unseenRef.current = newCount;
        setUnseenCount(newCount);
        isFirstLoad.current = false;

        // ⚠️ NÃO TOQUE SOM AQUI!
        console.log(`📊 Carregados ${newCount} tickets não vistos (sem som)`);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error.message);
    } finally {
      setLoading(false);
    }
  }, [carregarResponsaveis]);

  // ----------------------
  // ✅ RECARREGAR TICKETS NÃO VISUALIZADOS
  // ----------------------
  const loadUnseenTickets = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      if (userDataRef.current.setor !== "Segurança") {
        return; // Só carrega se for Segurança
      }

      const unseenResponse = await api.get("/tickets/unseen", {
        headers: { Authorization: ongId },
      });

      const newCount = unseenResponse.data.count;

      unseenRef.current = newCount;
      setUnseenCount(newCount);

      console.log(`🎫 Tickets atualizados: ${newCount} não vistos`);
    } catch (error) {
      console.error("Erro ao carregar tickets não visualizados:", error);
    }
  }, []);

  // ----------------------
  // SOCKET.IO LISTENER
  // ----------------------
  useEffect(() => {
    if (!socket) {
      console.log("⚠️ Aguardando socket conectar...");
      return;
    }

    if (!socket.connected) {
      console.log("⚠️ Socket existe mas não está conectado");
      return;
    }

    console.log("🔌 Registrando listeners do Socket no Profile:", socket.id);

    // ✅ REF para controlar se já tocou o som recentemente
    let lastSoundTime = 0;
    const SOUND_COOLDOWN = 1000; // 1 segundo entre sons

    // ✅ HANDLER PARA VISITANTES (SEM SOM)
    const handleSocketUpdate = async (data) => {
      console.log("═══════════════════════════════════════");
      console.log("🔥 EVENTO SOCKET RECEBIDO - VISITANTE");
      console.log("📦 Dados:", data);
      console.log("═══════════════════════════════════════");

      try {
        const ongId = await AsyncStorage.getItem("@Auth:ongId");
        if (!ongId) return;

        const profileResponse = await api.get("profile", {
          headers: { Authorization: ongId },
        });

        const incidentsWithNames = profileResponse.data.map((incident) => ({
          ...incident,
          empresa:
            empresasRef.current.find((e) => e.id === incident.empresa_id)
              ?.nome || "Não informado",
          setor:
            setoresRef.current.find((s) => s.id === incident.setor_id)?.nome ||
            "Não informado",
        }));

        setAllIncidents(incidentsWithNames);
        setIncidents(incidentsWithNames);

        console.log("✅ Lista de visitantes atualizada");
      } catch (error) {
        console.error("❌ Erro ao atualizar visitantes:", error.message);
      }
    };

    // ✅ HANDLER PARA NOVO TICKET (COM SOM + COOLDOWN)
    const handleTicketCreate = async (ticketData) => {
      console.log("🎫 NOVO TICKET CRIADO VIA SOCKET:", ticketData);

      // ⚠️ Só toca se for setor Segurança
      if (userDataRef.current.setor !== "Segurança") {
        console.log("⏭️ Não é Segurança, som não será tocado");
        return;
      }

      // ✅ Cooldown para evitar múltiplos sons
      const now = Date.now();
      if (now - lastSoundTime < SOUND_COOLDOWN) {
        console.log("⏭️ Som bloqueado por cooldown");
        return;
      }

      lastSoundTime = now;

      // 🔊 Toca o som
      console.log("🔊 Tocando notificação...");
      await playNotificationSound();

      // Atualiza contador
      try {
        const ongId = await AsyncStorage.getItem("@Auth:ongId");
        if (ongId) {
          const unseenResponse = await api.get("/tickets/unseen", {
            headers: { Authorization: ongId },
          });

          const newCount = unseenResponse.data.count;
          unseenRef.current = newCount;
          setUnseenCount(newCount);
          console.log(`🔢 Contador atualizado: ${newCount} tickets`);
        }
      } catch (error) {
        console.error("Erro ao atualizar contador:", error);
      }
    };

    // 🔥 HANDLERS PARA ATUALIZAÇÕES (SEM SOM)
    const handleTicketUpdate = async (data) => {
      console.log("📝 Ticket atualizado via Socket");
      await loadUnseenTickets();
    };

    const handleTicketViewed = async (data) => {
      console.log("👁️ Ticket visualizado via Socket");
      await loadUnseenTickets();
    };

    const handleTicketAllViewed = (data) => {
      console.log("👁️ Todos os tickets visualizados via Socket");
      if (userDataRef.current.setor === "Segurança") {
        setUnseenCount(0);
        unseenRef.current = 0;
      }
    };

    // ✅ EVENTOS DE VISITANTES
    const eventosVisitantes = [
      "visitante:create",
      "visitante:update",
      "visitante:delete",
      "visitante:block",
      "bloqueio:created",
      "bloqueio:updated",
    ];

    eventosVisitantes.forEach((evento) => {
      socket.on(evento, handleSocketUpdate);
    });

    // 🔥 EVENTOS DE TICKETS
    socket.on("ticket:create", handleTicketCreate);
    socket.on("ticket:update", handleTicketUpdate);
    socket.on("ticket:viewed", handleTicketViewed);
    socket.on("ticket:all_viewed", handleTicketAllViewed);

    console.log("✅ Listeners do Socket registrados!");

    // ✅ Cleanup
    return () => {
      console.log("🧹 Removendo listeners do Socket");

      eventosVisitantes.forEach((evento) => {
        socket.off(evento, handleSocketUpdate);
      });

      socket.off("ticket:create", handleTicketCreate);
      socket.off("ticket:update", handleTicketUpdate);
      socket.off("ticket:viewed", handleTicketViewed);
      socket.off("ticket:all_viewed", handleTicketAllViewed);
    };
  }, [socket, playNotificationSound, loadUnseenTickets]);

  // ----------------------
  // BUSCA COM DEBOUNCE
  // ----------------------
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (!searchTerm.trim()) {
        setIsSearching(false);
        setIncidents(allIncidents);
        return;
      }

      setIsSearching(true);

      try {
        const searchLower = searchTerm.toLowerCase().trim();
        const cpfNumbers = searchTerm.replace(/\D/g, "");

        const localResults = allIncidents.filter((incident) => {
          const hasName = incident.nome && typeof incident.nome === "string";
          const hasCpf = incident.cpf && typeof incident.cpf === "string";

          let nameMatch = false;
          if (hasName) {
            const nomeNormalizado = incident.nome.toLowerCase().trim();
            nameMatch =
              nomeNormalizado.includes(searchLower) &&
              (nomeNormalizado.startsWith(searchLower) ||
                nomeNormalizado.includes(" " + searchLower) ||
                nomeNormalizado === searchLower);
          }

          let cpfMatch = false;
          if (hasCpf && cpfNumbers.length > 0) {
            cpfMatch =
              incident.cpf.includes(searchTerm) ||
              incident.cpf.replace(/\D/g, "").includes(cpfNumbers);
          }

          return nameMatch || cpfMatch;
        });

        if (localResults.length > 0) {
          setIncidents(localResults);
        } else {
          // Busca na API se não encontrar localmente
          const response = await api.get("/search", {
            params: { query: searchTerm },
          });

          const searchResults = response.data.map((incident) => ({
            ...incident,
            empresa:
              empresasVisitantes.find((e) => e.id === incident.empresa_id)
                ?.nome || "Não informado",
            setor:
              setoresVisitantes.find((s) => s.id === incident.setor_id)?.nome ||
              "Não informado",
          }));

          setIncidents(searchResults);
        }
      } catch (err) {
        console.error("Erro na busca:", err);

        // Fallback para busca local
        const searchLower = searchTerm.toLowerCase().trim();
        const cpfNumbers = searchTerm.replace(/\D/g, "");

        const localResults = allIncidents.filter((incident) => {
          const hasName = incident.nome && typeof incident.nome === "string";
          const hasCpf = incident.cpf && typeof incident.cpf === "string";

          let nameMatch = false;
          if (hasName) {
            const nomeNormalizado = incident.nome.toLowerCase().trim();
            nameMatch =
              nomeNormalizado.includes(searchLower) &&
              (nomeNormalizado.startsWith(searchLower) ||
                nomeNormalizado.includes(" " + searchLower) ||
                nomeNormalizado === searchLower);
          }

          let cpfMatch = false;
          if (hasCpf && cpfNumbers.length > 0) {
            cpfMatch =
              incident.cpf.includes(searchTerm) ||
              incident.cpf.replace(/\D/g, "").includes(cpfNumbers);
          }

          return nameMatch || cpfMatch;
        });

        setIncidents(localResults);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, allIncidents, empresasVisitantes, setoresVisitantes]);

  // ----------------------
  // CICLO DE ATUALIZAÇÃO (Foco na tela)
  // ----------------------
  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [fetchInitialData])
  );

  // ----------------------
  // FILTRO E ORDENAÇÃO
  // ----------------------
  const filteredIncidents = incidents.sort((a, b) =>
    a.nome.localeCompare(b.nome)
  );

  // ----------------------
  // AÇÕES PRINCIPAIS
  // ----------------------
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

  // ----------------------
  // REGISTRAR VISITA
  // ----------------------
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

            const newAllIncidents = allIncidents.filter(
              (incident) => incident.id !== id
            );
            const newIncidents = incidents.filter(
              (incident) => incident.id !== id
            );

            setAllIncidents(newAllIncidents);
            setIncidents(newIncidents);

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

  // ----------------------
  // RENDER ITEM
  // ----------------------
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

  // ----------------------
  // ANIMAÇÕES DO MENU MODAL - CORRIGIDAS
  // ----------------------
  const openMenuModal = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setMenuModalVisible(true);

    // Pequeno delay para garantir que o modal está montado
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

  // ----------------------
  // FORMATAR DATA
  // ----------------------
  function formatarData(data) {
    if (!data) return "Data não informada";
    const dataParte = data.split("T")[0];
    const partes = dataParte.split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return data;
  }

  // ----------------------
  // LOADING
  // ----------------------
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando Listagem...</Text>
      </View>
    );
  }

  // ----------------------
  // INTERFACE PRINCIPAL
  // ----------------------
  return (
    <SafeAreaView style={styles.container}>
      {/* TOPO */}
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
              if (text.trim() === "") {
                setIsSearching(false);
              }
            }}
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

      {/* INFO DA BUSCA */}
      {isSearching && searchTerm && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoText}>
            Buscando por "{searchTerm}" ({filteredIncidents.length} resultados)
          </Text>
        </View>
      )}

      {/* MENU COM CÍRCULOS COLORIDOS INDIVIDUAIS */}
      <View style={styles.menu}>
        {/* VISITANTES - VERDE */}
        <TouchableOpacity
          onPress={handleNavigateToVisitors}
          style={styles.menuButton}
        >
          <View style={[styles.menuIconCircle, styles.visitantesCircle]}>
            <Feather name="users" size={24} color="#000" />
          </View>
          <Text style={styles.menuButtonText}>Visitantes</Text>
        </TouchableOpacity>

        {/* HISTÓRICO - AZUL */}
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

        {/* CRACHÁ - AMARELO */}
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

        {/* MENU - ROXO */}
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

      {/* TÍTULO */}
      <Text style={styles.title}>Visitantes Cadastrados</Text>

      {/* LISTA */}
      <FlatList
        data={filteredIncidents}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderIncident}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm
                ? `Nenhum resultado encontrado para "${searchTerm}"`
                : "Nenhum cadastro encontrado"}
            </Text>
          </View>
        )}
      />

      {/* MODAL PARA REGISTRAR VISITA (AJUSTADO PARA PICKER) */}
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
                      // Se selecionar a opção vazia, o TextInput abaixo pode ser usado
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

                {/* CAMPO DE OBSERVAÇÃO */}
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

      {/* MODAL DO MENU - MODERNO E TECNOLÓGICO - SEMPRE NO DOM */}
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
          {/* CABEÇALHO DO MENU */}
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

          {/* LISTA DE OPÇÕES DO MENU */}
          <View style={styles.menuModalOptions}>
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
                  "Funcionalidade de Relatórios em desenvolvimento"
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
                  "Funcionalidade de Relatórios em desenvolvimento"
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

            {/* CONFIGURAÇÕES */}
            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                Alert.alert(
                  "Em desenvolvimento",
                  "Funcionalidade de Configurações em desenvolvimento"
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

            {/* SUPORTE */}
            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={() => {
                closeMenuModal();
                Alert.alert(
                  "Em desenvolvimento",
                  "Funcionalidade de Suporte em desenvolvimento"
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

            {/* SAIR */}
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

          {/* RODAPÉ DO MENU */}
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

// ----------------------
// ESTILOS ATUALIZADOS
// ----------------------
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: "#fff" },
  header: {},
  logo: { width: 54, height: 60 },
  welcomeText: { fontSize: 16, marginTop: 20, marginBottom: 25 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#ddd",
    borderWidth: 1,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 25,
  },
  searchInput: { flex: 1, height: 40, marginLeft: 8 },
  navButtons: { alignItems: "center" },
  navButton: {
    width: "100%",
    backgroundColor: "#10B981",
    padding: 15,
    borderRadius: 8,
  },
  navButtonText: { textAlign: "center", color: "#fff", fontWeight: "bold" },
  logoutButton: { padding: 8 },
  menu: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
    paddingBottom: 0,
  },
  menuButton: {
    alignItems: "center",
    position: "relative",
    width: 60, // Largura fixa para melhor alinhamento
  },
  menuButtonText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  // NOVOS ESTILOS PARA OS CÍRCULOS DO MENU
  menuIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  visitantesCircle: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  historicoCircle: {
    backgroundColor: "rgba(16, 185, 129, 0.16)",
  },
  ticketsCircle: {
    backgroundColor: "rgba(16, 185, 129, 0.20)",
  },
  crachaCircle: {
    backgroundColor: "rgba(16, 185, 129, 0.24)",
  },
  menuCircle: {
    backgroundColor: "rgba(16, 185, 129, 0.28)",
  },
  notificationBadge: {
    backgroundColor: "#e02041",
    borderRadius: 12,
    paddingHorizontal: 6,
    position: "absolute",
    top: -5,
    right: 0,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  notificationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  // ------------------------------------
  // NOVOS ESTILOS PARA O CARD DE VISITANTE
  // ------------------------------------
  incidentItem: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  incidentItemBlocked: {
    // Estilo para o card quando bloqueado
    borderColor: "#e02041",
    backgroundColor: "#ffebeb",
    borderTopColor: "#e02041",
  },
  cardLeft: {
    // Container para avatar e informações
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardAvatar: {
    // Container do avatar (círculo)
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#eee",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardInfo: {
    flex: 1,
    paddingRight: 10,
  },
  incidentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
    marginTop: 2, // Ajuste vertical
  },
  incidentName: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  blockedName: { color: "#e02041" },
  blockedBadge: {
    // Estilo para o badge "BLOQUEADO"
    backgroundColor: "#bd040a",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  blockedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },

  // ESTILOS NOVOS PARA O LAYOUT LADO A LADO
  cardDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardDetailColumn: {
    width: "48%",
  },
  cardDetailColumnFull: {
    width: "100%",
  },
  detailLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "normal",
    textTransform: "uppercase",
  },
  incidentTextValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },

  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  actionButton: { padding: 8 },
  // ------------------------------------
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  logoRow: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  margin: { marginBottom: 40 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  searchInfo: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  searchInfoText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  // Estilos do Modal de Visita
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalCloseButton: {
    padding: 5,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  // Estilo para o Picker
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
  },
  pickerStyle: {
    height: Platform.OS === "ios" ? 150 : 50,
    width: "100%",
  },
  outroLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    marginBottom: 5,
  },
  responsavelInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: "top",
  },
  observacaoInput: {
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 0.48,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonConfirm: {
    backgroundColor: "#10B981",
  },
  modalButtonDisabled: {
    backgroundColor: "#ccc",
  },
  modalButtonCancelText: {
    color: "#333",
    fontWeight: "600",
  },
  modalButtonConfirmText: {
    color: "white",
    fontWeight: "600",
  },
  // ESTILOS DO MODAL DO MENU - ATUALIZADOS
  menuModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-start",
  },
  menuModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  menuModalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 5,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    overflow: "hidden",
  },
  menuModalHeader: {
    // Cabeçalho Menu Lateral
    backgroundColor: "#f8fafc",
    paddingVertical: 20,
    paddingTop: 50,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  menuModalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  menuModalUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuModalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#edf2f7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuModalUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
  },
  menuModalUserSetor: {
    fontSize: 14,
    color: "#718096",
    marginTop: 2,
  },
  menuModalCloseButton: {
    padding: 4,
  },
  menuModalOptions: {
    flex: 1,
    paddingVertical: 16,
  },
  menuModalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  menuModalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuModalOptionContent: {
    flex: 1,
  },
  menuModalOptionTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#2d3748",
    marginBottom: 2,
  },
  menuModalOptionDescription: {
    fontSize: 12,
    color: "#718096",
  },
  menuModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center",
  },
  menuModalVersion: {
    fontSize: 12,
    color: "#a0aec0",
    marginBottom: 4,
  },
  menuModalCopyright: {
    fontSize: 11,
    color: "#cbd5e0",
  },
});
