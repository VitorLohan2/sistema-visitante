import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import api from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale("pt-br");

export default function ChatLista() {
  const socket = useSocket();
  const navigation = useNavigation();

  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userData, setUserData] = useState({ type: "USER" });

  // ✅ Carregar dados do usuário
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoadingUser(true);
        const ongId = await AsyncStorage.getItem("@Auth:ongId");
        if (!ongId) {
          console.log("⚠️ OngId não encontrado no AsyncStorage");
          setLoadingUser(false);
          return;
        }

        console.log("🔍 Buscando dados do usuário:", ongId);
        const response = await api.get(`ongs/${ongId}`);

        const userType = response.data.type || "USER";
        console.log("✅ Tipo de usuário:", userType);

        setUserData({
          type: userType,
        });
      } catch (err) {
        console.error("❌ Erro ao buscar dados do usuário:", err.message);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, []);

  // ✅ Carregar conversas (apenas na primeira vez e no pull-to-refresh)
  const carregarConversas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/chat/conversas");
      setConversas(response.data || []);
    } catch (error) {
      console.error("❌ Erro ao carregar conversas:", error);
      Alert.alert("Erro", "Não foi possível carregar as conversas");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Pull to refresh (manual)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarConversas();
    setRefreshing(false);
  }, [carregarConversas]);

  // ✅ Socket listeners - OTIMIZADO SEM RECARREGAR TUDO
  useEffect(() => {
    if (!socket?.connected) return;

    // 🆕 Nova conversa criada - Adiciona no topo da lista
    const handleNovaConversa = (novaConversa) => {
      console.log("🆕 Nova conversa criada via socket:", novaConversa.id);
      setConversas((prev) => [novaConversa, ...prev]);
    };

    // 🔄 Conversa atualizada - Atualiza apenas a conversa específica
    const handleConversaAtualizada = async (data) => {
      console.log("🔄 Conversa atualizada via socket:", data.id);

      try {
        // Busca apenas os dados atualizados desta conversa
        const response = await api.get(`/chat/conversas/${data.id}/detalhes`);
        const conversaAtualizada = response.data;

        setConversas((prev) =>
          prev
            .map((c) =>
              c.id === data.id ? { ...c, ...conversaAtualizada } : c
            )
            .sort(
              (a, b) =>
                new Date(b.data_atualizacao) - new Date(a.data_atualizacao)
            )
        );
      } catch (error) {
        console.error("❌ Erro ao buscar detalhes da conversa:", error);
        // Fallback: atualiza apenas os campos que vieram no evento
        setConversas((prev) =>
          prev
            .map((c) =>
              c.id === data.id
                ? { ...c, ...data, data_atualizacao: new Date().toISOString() }
                : c
            )
            .sort(
              (a, b) =>
                new Date(b.data_atualizacao) - new Date(a.data_atualizacao)
            )
        );
      }
    };

    // 👁️ Mensagens visualizadas - Zera contador
    const handleMensagensVisualizadas = ({ conversa_id }) => {
      console.log("👁️ Mensagens visualizadas na conversa:", conversa_id);

      setConversas((prev) =>
        prev.map((conversa) =>
          conversa.id === conversa_id
            ? { ...conversa, mensagens_nao_lidas: 0 }
            : conversa
        )
      );
    };

    // 💬 Nova mensagem - Incrementa contador e atualiza timestamp
    const handleNovaMensagem = ({ conversa_id, remetente_id }) => {
      console.log("💬 Nova mensagem na conversa:", conversa_id);

      setConversas((prev) =>
        prev
          .map((conversa) => {
            if (conversa.id === conversa_id) {
              // Se a mensagem não é do usuário atual, incrementa o contador
              const isOutrasPessoas = remetente_id !== userData.id;

              return {
                ...conversa,
                mensagens_nao_lidas: isOutrasPessoas
                  ? (conversa.mensagens_nao_lidas || 0) + 1
                  : conversa.mensagens_nao_lidas,
                data_atualizacao: new Date().toISOString(),
              };
            }
            return conversa;
          })
          .sort(
            (a, b) =>
              new Date(b.data_atualizacao) - new Date(a.data_atualizacao)
          )
      );
    };

    socket.on("conversa:nova", handleNovaConversa);
    socket.on("conversa:atualizada", handleConversaAtualizada);
    socket.on("mensagens:visualizadas", handleMensagensVisualizadas);
    socket.on("mensagem:nova", handleNovaMensagem);

    return () => {
      socket.off("conversa:nova", handleNovaConversa);
      socket.off("conversa:atualizada", handleConversaAtualizada);
      socket.off("mensagens:visualizadas", handleMensagensVisualizadas);
      socket.off("mensagem:nova", handleNovaMensagem);
    };
  }, [socket, userData.id]);

  // ✅ Recarregar APENAS ao focar na tela (não sempre)
  useFocusEffect(
    useCallback(() => {
      // Só recarrega se a lista estiver vazia
      if (conversas.length === 0) {
        carregarConversas();
      }
    }, [conversas.length, carregarConversas])
  );

  // ✅ Carregar na montagem inicial
  useEffect(() => {
    carregarConversas();
  }, []);

  // ✅ Criar nova conversa
  const criarNovaConversa = useCallback(async () => {
    try {
      const response = await api.post("/chat/conversas", {
        assunto: "Suporte Técnico",
      });

      navigation.navigate("ChatConversa", {
        conversa_id: response.data.id,
        conversa: response.data,
      });
    } catch (error) {
      if (error.response?.status === 400) {
        Alert.alert(
          "Aviso",
          "Você já possui uma conversa aberta. Por favor, finalize-a antes de abrir outra.",
          [
            {
              text: "OK",
              onPress: () => {
                const conversaExistente = error.response.data.conversa_id;
                if (conversaExistente) {
                  const conversa = conversas.find(
                    (c) => c.id === conversaExistente
                  );
                  if (conversa) {
                    navigation.navigate("ChatConversa", {
                      conversa_id: conversaExistente,
                      conversa,
                    });
                  }
                }
              },
            },
          ]
        );
      } else {
        Alert.alert("Erro", "Não foi possível criar a conversa");
      }
    }
  }, [conversas, navigation]);

  // ✅ Abrir conversa
  const abrirConversa = useCallback(
    (conversa) => {
      navigation.navigate("ChatConversa", {
        conversa_id: conversa.id,
        conversa,
      });
    },
    [navigation]
  );

  // ✅ Voltar
  const handleNavigateBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ✅ Cor do status
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case "aberto":
        return "#ef4444";
      case "em_atendimento":
        return "#f59e0b";
      case "resolvido":
        return "#10b981";
      case "fechado":
        return "#6b7280";
      default:
        return "#999";
    }
  }, []);

  // ✅ Traduzir status
  const getStatusText = useCallback((status) => {
    switch (status) {
      case "aberto":
        return "Aberto";
      case "em_atendimento":
        return "Em Atendimento";
      case "resolvido":
        return "Resolvido";
      case "fechado":
        return "Fechado";
      default:
        return status;
    }
  }, []);

  // ✅ Ícone do status
  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case "aberto":
        return "alert-circle";
      case "em_atendimento":
        return "clock";
      case "resolvido":
        return "check-circle";
      case "fechado":
        return "x-circle";
      default:
        return "help-circle";
    }
  }, []);

  // ✅ Contador de conversas abertas
  const conversasAbertas = useMemo(
    () =>
      conversas.filter(
        (c) => c.status === "aberto" || c.status === "em_atendimento"
      ).length,
    [conversas]
  );

  // ✅ Total de mensagens não lidas
  const totalMensagensNaoLidas = useMemo(
    () =>
      conversas.reduce((total, conversa) => {
        return total + Number(conversa.mensagens_nao_lidas || 0);
      }, 0),
    [conversas]
  );

  // ✅ LOADING
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10B981"]}
            tintColor="#10B981"
          />
        }
      >
        {/* CABEÇALHO */}
        <View style={styles.headerGeral}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleNavigateBack}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={24} color="#10B981" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Suporte TI</Text>

            {!loadingUser && userData.type !== "ADM" && (
              <TouchableOpacity
                onPress={criarNovaConversa}
                style={styles.backButton}
              >
                <Feather name="plus" size={24} color="#10B981" />
              </TouchableOpacity>
            )}

            {!loadingUser && userData.type === "ADM" && (
              <View style={styles.backButton} />
            )}

            {loadingUser && (
              <View style={styles.backButton}>
                <ActivityIndicator size="small" color="#10B981" />
              </View>
            )}
          </View>
        </View>

        {/* LISTA DE CONVERSAS */}
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <View style={styles.listTitleContainer}>
              <Text style={styles.listTitle}>
                Conversas ({conversas.length})
              </Text>

              {totalMensagensNaoLidas > 0 && (
                <View style={styles.badgeMensagensNaoLidas}>
                  <Text style={styles.badgeMensagensNaoLidasText}>
                    {totalMensagensNaoLidas}{" "}
                    {totalMensagensNaoLidas > 1
                      ? "Novas Mensagens"
                      : "Nova Mensagem"}
                  </Text>
                </View>
              )}
            </View>

            {conversasAbertas > 0 && (
              <View style={[styles.badge, styles.badgeActive]}>
                <Text style={[styles.badgeText, styles.badgeTextActive]}>
                  {conversasAbertas} ABERTA{conversasAbertas > 1 ? "S" : ""}
                </Text>
              </View>
            )}
          </View>

          {conversas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma conversa ainda</Text>

              {!loadingUser && userData.type !== "ADM" && (
                <>
                  <Text style={styles.emptySubtext}>
                    Clique no + para iniciar um atendimento
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={criarNovaConversa}
                  >
                    <Feather name="plus-circle" size={20} color="#fff" />
                    <Text style={styles.emptyButtonText}>Iniciar Suporte</Text>
                  </TouchableOpacity>
                </>
              )}

              {!loadingUser && userData.type === "ADM" && (
                <Text style={styles.emptySubtext}>
                  Aguardando solicitações de suporte dos usuários
                </Text>
              )}
            </View>
          ) : (
            conversas.map((conversa) => {
              const temMensagensNovas = conversa.mensagens_nao_lidas > 0;

              return (
                <TouchableOpacity
                  key={conversa.id}
                  style={[
                    styles.conversaCard,
                    conversa.status === "aberto" && styles.conversaCardAberto,
                    conversa.status === "em_atendimento" &&
                      styles.conversaCardAtendimento,
                  ]}
                  onPress={() => abrirConversa(conversa)}
                  activeOpacity={0.7}
                >
                  <View style={styles.conversaHeader}>
                    <View style={styles.conversaHeaderLeft}>
                      <Feather
                        name={getStatusIcon(conversa.status)}
                        size={20}
                        color={getStatusColor(conversa.status)}
                      />
                      <Text style={styles.conversaTitulo} numberOfLines={1}>
                        {userData.type === "ADM"
                          ? conversa.usuario_nome
                          : conversa.assunto || "Suporte Técnico"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        conversa.status === "aberto" && styles.badgeAberto,
                        conversa.status === "em_atendimento" &&
                          styles.badgeAtendimento,
                        conversa.status === "resolvido" &&
                          styles.badgeResolvido,
                        conversa.status === "fechado" && styles.badgeFechado,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          conversa.status === "aberto" &&
                            styles.badgeTextAberto,
                          conversa.status === "em_atendimento" &&
                            styles.badgeTextAtendimento,
                          conversa.status === "resolvido" &&
                            styles.badgeTextResolvido,
                          conversa.status === "fechado" &&
                            styles.badgeTextFechado,
                        ]}
                      >
                        {getStatusText(conversa.status).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {conversa.atendente_nome && (
                    <View style={styles.atendenteContainer}>
                      <Feather name="user" size={14} color="#10b981" />
                      <Text style={styles.atendenteText}>
                        {conversa.atendente_nome}
                      </Text>
                    </View>
                  )}

                  <View style={styles.datasContainer}>
                    <Text style={styles.conversaData}>
                      Aberto em{" "}
                      {dayjs
                        .utc(conversa.data_criacao)
                        .tz("America/Sao_Paulo")
                        .format("DD/MM/YYYY HH:mm")}
                    </Text>

                    {conversa.status === "resolvido" &&
                      conversa.data_finalizacao && (
                        <Text style={styles.conversaData}>
                          Finalizado em{" "}
                          {dayjs
                            .utc(conversa.data_finalizacao)
                            .tz("America/Sao_Paulo")
                            .format("DD/MM/YYYY HH:mm")}
                        </Text>
                      )}

                    <Text style={styles.conversaDataAtualizada}>
                      Atualizado{" "}
                      {dayjs
                        .utc(conversa.data_atualizacao)
                        .tz("America/Sao_Paulo")
                        .format("HH:mm")}
                    </Text>
                  </View>

                  {temMensagensNovas && (
                    <View style={styles.badgeNaoLidas}>
                      <Text style={styles.badgeNaoLidasText}>
                        {conversa.mensagens_nao_lidas}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },

  headerGeral: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },

  backButton: {
    padding: 10,
    borderRadius: 8,
    left: 0,
    zIndex: 10,
    backgroundColor: "#f0fdf4",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },

  listContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },

  listTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },

  badgeMensagensNaoLidas: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  badgeMensagensNaoLidasText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  emptyText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
    marginBottom: 24,
  },

  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },

  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  conversaCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#6b7280",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },

  conversaCardAberto: {
    borderLeftColor: "#ef4444",
  },

  conversaCardAtendimento: {
    borderLeftColor: "#f59e0b",
  },

  conversaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  conversaHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },

  conversaTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginLeft: 8,
    flex: 1,
  },

  atendenteContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  atendenteText: {
    fontSize: 13,
    color: "#10b981",
    marginLeft: 6,
    fontStyle: "italic",
  },

  datasContainer: {
    gap: 2,
  },

  conversaData: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },

  conversaDataAtualizada: {
    fontSize: 12,
    color: "#94a3b8",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },

  badgeActive: {
    backgroundColor: "#fee2e2",
  },

  badgeAberto: {
    backgroundColor: "#fee2e2",
  },

  badgeAtendimento: {
    backgroundColor: "#fef3c7",
  },

  badgeResolvido: {
    backgroundColor: "#d1fae5",
  },

  badgeFechado: {
    backgroundColor: "#f1f5f9",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  badgeTextActive: {
    color: "#dc2626",
  },

  badgeTextAberto: {
    color: "#dc2626",
  },

  badgeTextAtendimento: {
    color: "#d97706",
  },

  badgeTextResolvido: {
    color: "#059669",
  },

  badgeTextFechado: {
    color: "#64748b",
  },

  badgeNaoLidas: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  badgeNaoLidasText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  margin: {
    marginBottom: 40,
  },
});
