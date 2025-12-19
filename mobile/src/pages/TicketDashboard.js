import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import api from "../services/api";
import { useSocket } from "../contexts/SocketContext";
import { useTickets } from "../contexts/TicketsContext";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

function formatDate(dateString) {
  return dayjs
    .utc(dateString)
    .tz("America/Sao_Paulo")
    .format("DD/MM/YYYY HH:mm");
}

export default function TicketDashboard() {
  const socket = useSocket();
  const navigation = useNavigation();

  // ✅ CONTEXT DE TICKETS (Cache Global)
  const {
    tickets,
    loading: contextLoading,
    loadTickets,
    addTicket,
    updateTicket,
    markAsViewed,
    markAllAsViewed,
    refreshTickets,
  } = useTickets();

  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({ setor: "", nome: "" });

  const userDataFetchedRef = useRef(false);
  const updatingTicketsRef = useRef(new Set());

  // ✅ BUSCA DADOS DA ONG (UMA VEZ)
  useEffect(() => {
    const fetchUserData = async () => {
      if (userDataFetchedRef.current) return;

      try {
        const ongId = await AsyncStorage.getItem("@Auth:ongId");
        if (!ongId) return;

        const ongResponse = await api.get(`ongs/${ongId}`);
        const setor = ongResponse.data.setor || "";
        const nome = ongResponse.data.name || "";

        setUserData({ setor, nome });
        userDataFetchedRef.current = true;
      } catch (err) {
        console.error("❌ Erro ao buscar dados da ONG:", err.message);
      }
    };

    fetchUserData();
  }, []);

  // ✅ PULL TO REFRESH
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTickets();
    setRefreshing(false);
  }, [refreshTickets]);

  // 🔥 SOCKET LISTENERS - REGISTRA UMA VEZ E REMOVE CORRETAMENTE
  useEffect(() => {
    if (!socket?.connected) {
      console.log("⚠️ Socket não conectado");
      return;
    }

    console.log("🔌 Registrando listeners do Socket");

    const handleTicketCreate = (newTicket) => {
      console.log("🎫 Evento ticket:create recebido:", newTicket.id);
      addTicket(newTicket); // ✅ Usa função do Context
    };

    const handleTicketUpdate = (updatedData) => {
      if (updatingTicketsRef.current.has(updatedData.id)) {
        console.log(
          `⏭️ Ticket ${updatedData.id} sendo atualizado manualmente, ignorando Socket`
        );
        return;
      }

      console.log("🔄 Ticket atualizado via Socket:", updatedData.id);
      updateTicket(updatedData);
    };

    const handleTicketViewed = (data) => {
      console.log("👁️ Ticket visualizado:", data.id);
      markAsViewed(data.id); // ✅ Usa função do Context
    };

    const handleAllViewed = () => {
      console.log("👁️ Todos visualizados");
      markAllAsViewed(); // ✅ Usa função do Context
    };

    // ✅ REMOVE LISTENERS ANTIGOS
    socket.off("ticket:create");
    socket.off("ticket:update");
    socket.off("ticket:viewed");
    socket.off("ticket:all_viewed");

    // ✅ REGISTRA NOVOS LISTENERS
    socket.on("ticket:create", handleTicketCreate);
    socket.on("ticket:update", handleTicketUpdate);
    socket.on("ticket:viewed", handleTicketViewed);
    socket.on("ticket:all_viewed", handleAllViewed);

    return () => {
      console.log("🧹 Removendo listeners do Socket");
      socket.off("ticket:create", handleTicketCreate);
      socket.off("ticket:update", handleTicketUpdate);
      socket.off("ticket:viewed", handleTicketViewed);
      socket.off("ticket:all_viewed", handleAllViewed);
    };
  }, [socket, addTicket, updateTicket, markAsViewed, markAllAsViewed]);

  // ✅ CARREGA TICKETS APENAS NA PRIMEIRA VEZ
  useFocusEffect(
    useCallback(() => {
      console.log("📱 Tela focada");
      loadTickets(); // ✅ Context cuida do cache
    }, [loadTickets])
  );

  // ✅ FILTRO MEMOIZADO
  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;

    const termo = searchTerm.toLowerCase();
    return tickets.filter((ticket) => {
      return (
        ticket.nome_usuario?.toLowerCase().includes(termo) ||
        ticket.mensagem?.toLowerCase().includes(termo) ||
        ticket.setor_usuario?.toLowerCase().includes(termo) ||
        ticket.funcionario?.toLowerCase().includes(termo) ||
        ticket.descricao?.toLowerCase().includes(termo)
      );
    });
  }, [tickets, searchTerm]);

  // ✅ ATUALIZAR STATUS
  const handleChangeStatus = useCallback(
    async (id, currentStatus) => {
      // ✅ PREVINE DUPLO CLIQUE ACIDENTAL (< 500ms)
      if (updatingTicketsRef.current.has(id)) {
        console.log(`⏭️ Ticket ${id} aguarde a atualização anterior`);
        return;
      }

      if (currentStatus === "Resolvido" || currentStatus === "Finalizado") {
        Alert.alert("Aviso", "Tickets resolvidos não podem ser alterados.");
        return;
      }

      let nextStatus;
      if (currentStatus === "Aberto" || currentStatus === "Não iniciado") {
        nextStatus = "Em andamento";
      } else if (currentStatus === "Em andamento") {
        nextStatus = "Resolvido";
      } else {
        nextStatus = "Aberto";
      }

      // ✅ Marca como "em atualização"
      updatingTicketsRef.current.add(id);

      const timestamp = Date.now();
      console.log(
        `⏱️ Atualizando ticket ${id}: ${currentStatus} → ${nextStatus}`
      );

      try {
        const ongId = await AsyncStorage.getItem("@Auth:ongId");

        // ✅ Atualização otimista via Context
        updateTicket({
          id,
          status: nextStatus,
          visualizado: true,
          data_atualizacao: dayjs()
            .tz("America/Sao_Paulo")
            .format("YYYY-MM-DD HH:mm:ss"),
        });

        await api.put(
          `/tickets/${id}`,
          { status: nextStatus },
          { headers: { Authorization: ongId } }
        );

        const duration = Date.now() - timestamp;
        console.log(`✅ Ticket ${id} atualizado (${duration}ms)`);
      } catch (err) {
        // ✅ Reverte em caso de erro
        updateTicket({ id, status: currentStatus });

        Alert.alert("Erro", "Não foi possível atualizar o status.");
        console.error("❌ Erro:", err.response?.data || err.message);
      } finally {
        // ✅ Libera após 500ms (permite cliques intencionais)
        setTimeout(() => {
          updatingTicketsRef.current.delete(id);
        }, 500);
      }
    },
    [updateTicket]
  );

  const handleNavigateToCreateTicket = useCallback(() => {
    navigation.navigate("Tickets");
  }, [navigation]);

  const handleNavigateToProfile = useCallback(() => {
    navigation.navigate("Profile");
  }, [navigation]);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case "Aberto":
      case "Não iniciado":
        return "🔴";
      case "Em andamento":
        return "🟡";
      case "Resolvido":
      case "Finalizado":
        return "🟢";
      default:
        return "❔";
    }
  }, []);

  // ✅ RENDER ITEM MEMOIZADO
  const renderTicket = useCallback(
    ({ item }) => {
      return (
        <View
          style={[styles.ticketItem, item.visualizado && styles.ticketSeen]}
        >
          <View style={styles.ticketMeta}>
            <Text style={[styles.dateText, { fontWeight: "bold" }]}>
              {item.data_criacao
                ? formatDate(item.data_criacao)
                : "Data indisponível"}
            </Text>
            <View
              style={[
                styles.statusDot,
                (item.status === "Aberto" || item.status === "Não iniciado") &&
                  styles.statusDotRed,
                item.status === "Em andamento" && styles.statusDotYellow,
                (item.status === "Resolvido" || item.status === "Finalizado") &&
                  styles.statusDotGreen,
              ]}
            />
          </View>
          <Text style={styles.ticketText}>Criado por: {item.nome_usuario}</Text>
          <Text style={styles.ticketText}>Setor: {item.setor_usuario}</Text>
          <Text style={styles.ticketText}>Funcionário: {item.funcionario}</Text>
          <Text style={styles.ticketText}>Mensagem: {item.descricao}</Text>
          <Text
            style={[styles.ticketText, { fontWeight: "bold", marginTop: 8 }]}
          >
            Status: {getStatusIcon(item.status)} {item.status}
          </Text>

          <View style={styles.actionsContainer}>
            <Text
              style={{
                marginRight: 20,
                color: item.visualizado ? "#16a34a" : "#dc2626",
                fontWeight: "600",
              }}
            >
              {item.visualizado ? "Lido" : "Não Lido"}
            </Text>
            <TouchableOpacity
              onPress={() => handleChangeStatus(item.id, item.status)}
              style={[
                styles.actionButton,
                (item.status === "Resolvido" ||
                  item.status === "Finalizado") && { opacity: 0.5 },
              ]}
              disabled={
                item.status === "Resolvido" || item.status === "Finalizado"
              }
            >
              <Feather name="refresh-cw" size={20} color="#fff" />
              <Text style={[styles.actionText, { color: "#fff" }]}>
                {item.status === "Aberto" || item.status === "Não iniciado"
                  ? "Iniciar"
                  : item.status === "Em andamento"
                    ? "Resolver"
                    : "Reabrir"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [getStatusIcon, handleChangeStatus]
  );

  const EmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum ticket encontrado.</Text>
      </View>
    ),
    []
  );

  if (contextLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando tickets...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { flex: 1 }]}
          onPress={handleNavigateToProfile}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color="#e02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <View style={{ flex: 2, alignItems: "center" }}>
          <Text style={styles.logoText}>Tickets</Text>
        </View>

        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleNavigateToCreateTicket}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#999" />
        <TextInput
          placeholder="Buscar por nome ou mensagem"
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTicket}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={10}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={EmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10B981"]}
            tintColor="#10B981"
          />
        }
      />
      <View style={styles.margin}></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  ticketMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    marginTop: 50,
    marginBottom: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
  },
  backText: {
    color: "#000",
    fontSize: 18,
    marginLeft: 5,
  },
  logoText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#ddd",
    borderWidth: 1,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 30,
  },
  searchInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
  },
  ticketItem: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  ticketSeen: {
    backgroundColor: "#f0f0f0",
  },
  ticketText: {
    marginTop: 6,
    fontSize: 14,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotRed: {
    backgroundColor: "#e02041",
  },
  statusDotYellow: {
    backgroundColor: "#ffc107",
  },
  statusDotGreen: {
    backgroundColor: "#4CAF50",
  },
  actionsContainer: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    // Sombra para iOS
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    // Sombra para Android
    elevation: 3,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 8,
    color: "#10B981",
  },
  dateText: {
    fontSize: 12,
    color: "#000",
    marginRight: 6,
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
  emptyContainer: {
    marginTop: 50,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  createButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  margin: {
    marginBottom: 40,
  },
});
