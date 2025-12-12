import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "../services/api";
import { useSocket } from "../contexts/SocketContext";

export default function ListaAgendamentos() {
  const navigation = useNavigation();
  const socket = useSocket();

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({
    id: "",
    name: "",
    setor_id: null,
    type: "",
  });

  // ═══════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════
  const socketListenersRegistered = useRef(false);
  const processedAgendamentos = useRef(new Set());
  const userDataRef = useRef({ id: "", name: "", setor_id: null, type: "" });

  // ═══════════════════════════════════════════════════════════════
  // PERMISSÕES
  // ═══════════════════════════════════════════════════════════════
  const userPodeCriar = userData.type === "ADM" && userData.setor_id === 6;
  const userPodeConfirmar = userData.type === "ADM" || userData.setor_id === 4;
  const userPodeExcluir = userData.type === "ADM";

  // ═══════════════════════════════════════════════════════════════
  // CONTADOR DE AGENDAMENTOS PENDENTES (SEM PRESENÇA)
  // ═══════════════════════════════════════════════════════════════
  const agendamentosPendentes = agendamentos.filter(
    (ag) => !ag.presente
  ).length;

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR DADOS INICIAIS
  // ═══════════════════════════════════════════════════════════════
  const loadUserData = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const ongName = await AsyncStorage.getItem("@Auth:ongName");

      if (ongId) {
        const response = await api.get(`ongs/${ongId}`);
        const user = {
          id: ongId,
          name: ongName || response.data.name,
          setor_id: response.data.setor_id,
          type: response.data.type,
        };

        setUserData(user);
        userDataRef.current = user; // ✅ Atualizar ref também
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
  }, []);

  const loadAgendamentos = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ REQUISIÇÃO PÚBLICA - sem header de autorização
      const response = await api.get("/agendamentos");

      setAgendamentos(response.data);
      console.log(`✅ ${response.data.length} agendamentos carregados`);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      Alert.alert("Erro", "Não foi possível carregar os agendamentos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS - SOCKET.IO
  // ═══════════════════════════════════════════════════════════════

  // ✅ HANDLER PARA NOVO AGENDAMENTO
  const handleAgendamentoCreate = useCallback((data) => {
    console.log("🔥 agendamento:create recebido:", data);

    const agendamentoId = `agendamento-${data.id}`;

    if (processedAgendamentos.current.has(agendamentoId)) {
      console.log("⏭️ Agendamento já processado, ignorando duplicata");
      return;
    }

    processedAgendamentos.current.add(agendamentoId);

    setTimeout(() => {
      processedAgendamentos.current.delete(agendamentoId);
    }, 10000);

    // ✅ Backend agora envia dados completos, não precisa buscar
    setAgendamentos((prev) => [data, ...prev]);
    console.log("✅ Novo agendamento adicionado com dados completos");
  }, []);

  // ✅ HANDLER PARA AGENDAMENTO ATUALIZADO
  const handleAgendamentoUpdate = useCallback((data) => {
    console.log("🔥 agendamento:update recebido:", data);

    // ✅ Backend envia dados completos, apenas atualizar
    setAgendamentos((prev) =>
      prev.map((ag) => (ag.id === data.id ? { ...ag, ...data } : ag))
    );
    console.log("✅ Agendamento atualizado com dados completos");
  }, []);

  // ✅ HANDLER PARA AGENDAMENTO DELETADO
  const handleAgendamentoDelete = useCallback((data) => {
    console.log("🔥 agendamento:delete recebido:", data);

    setAgendamentos((prev) => prev.filter((ag) => ag.id !== data.id));
    console.log("✅ Agendamento removido");
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS - SOCKET.IO
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

    if (socketListenersRegistered.current) {
      console.log("⚠️ Listeners já registrados, ignorando");
      return;
    }

    console.log("🔌 Registrando listeners de agendamentos:", socket.id);
    socketListenersRegistered.current = true;

    // ✅ Remover listeners antigos
    console.log("🧹 Removendo listeners antigos...");
    socket.removeAllListeners("agendamento:create");
    socket.removeAllListeners("agendamento:update");
    socket.removeAllListeners("agendamento:delete");

    // ✅ Registrar novos listeners
    console.log("📝 Registrando novos listeners...");
    socket.on("agendamento:create", handleAgendamentoCreate);
    socket.on("agendamento:update", handleAgendamentoUpdate);
    socket.on("agendamento:delete", handleAgendamentoDelete);

    console.log("✅ Listeners de agendamentos registrados com sucesso!");

    // ✅ CLEANUP FUNCTION
    return () => {
      console.log("🧹 Cleanup: Removendo todos os listeners de agendamentos");
      socket.removeAllListeners("agendamento:create");
      socket.removeAllListeners("agendamento:update");
      socket.removeAllListeners("agendamento:delete");
      socketListenersRegistered.current = false;
      processedAgendamentos.current.clear();
      console.log("✅ Cleanup concluído");
    };
  }, [
    socket,
    handleAgendamentoCreate,
    handleAgendamentoUpdate,
    handleAgendamentoDelete,
  ]);

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS - CARREGAR DADOS
  // ═══════════════════════════════════════════════════════════════
  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadAgendamentos();
    }, [loadUserData, loadAgendamentos])
  );

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS - AÇÕES
  // ═══════════════════════════════════════════════════════════════
  const handleConfirmarAgendamento = async (id) => {
    Alert.alert("Confirmar Agendamento", "Deseja confirmar este agendamento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          try {
            const response = await api.put(
              `/agendamentos/${id}/confirmar`,
              {},
              {
                headers: { Authorization: userDataRef.current.id },
              }
            );

            // ✅ Atualizar localmente (o socket também vai atualizar)
            setAgendamentos((prev) =>
              prev.map((ag) =>
                ag.id === id ? { ...ag, ...response.data.agendamento } : ag
              )
            );

            Alert.alert("Sucesso", "Agendamento confirmado!");
          } catch (error) {
            console.error("Erro ao confirmar agendamento:", error);

            let errorMessage = "Erro ao confirmar agendamento";
            if (error.response) {
              switch (error.response.status) {
                case 403:
                  errorMessage =
                    "Somente Segurança e Administradores podem confirmar";
                  break;
                case 401:
                  errorMessage = "Não autorizado. Faça login novamente.";
                  break;
                case 404:
                  errorMessage = "Agendamento não encontrado";
                  break;
                case 400:
                  errorMessage = "Agendamento já confirmado";
                  break;
              }
            }

            Alert.alert("Erro", errorMessage);
          }
        },
      },
    ]);
  };

  const handleRegistrarPresenca = async (id) => {
    Alert.alert(
      "Registrar Presença",
      "Deseja registrar a presença deste visitante?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Registrar",
          onPress: async () => {
            try {
              const response = await api.put(
                `/agendamentos/${id}/presenca`,
                {},
                {
                  headers: { Authorization: userDataRef.current.id },
                }
              );

              // ✅ Atualizar localmente (o socket também vai atualizar)
              setAgendamentos((prev) =>
                prev.map((ag) =>
                  ag.id === id ? { ...ag, ...response.data.agendamento } : ag
                )
              );

              Alert.alert("Sucesso", "Presença registrada!");
            } catch (error) {
              console.error("Erro ao registrar presença:", error);
              Alert.alert(
                "Erro",
                error.response?.data?.error || "Erro ao registrar presença"
              );
            }
          },
        },
      ]
    );
  };

  const handleExcluirAgendamento = async (id) => {
    Alert.alert(
      "Excluir Agendamento",
      "Tem certeza que deseja excluir este agendamento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/agendamentos/${id}`, {
                headers: { Authorization: userDataRef.current.id },
              });

              // ✅ Atualizar localmente (o socket também vai atualizar)
              setAgendamentos((prev) => prev.filter((ag) => ag.id !== id));
              Alert.alert("Sucesso", "Agendamento excluído!");
            } catch (error) {
              console.error("Erro ao excluir agendamento:", error);
              Alert.alert(
                "Erro",
                error.response?.data?.error || "Erro ao excluir agendamento"
              );
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAgendamentos();
  };

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES AUXILIARES
  // ═══════════════════════════════════════════════════════════════
  const formatarData = (data) => {
    if (!data) return "Data não informada";

    const date = new Date(data);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER ITEM
  // ═══════════════════════════════════════════════════════════════
  const renderAgendamento = ({ item }) => {
    return (
      <View style={styles.card}>
        {/* Header do Card */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Feather name="user" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>{item.nome}</Text>
          </View>
          <View style={styles.cardTimeRow}>
            <Feather name="clock" size={16} color="#666" />
            <Text style={styles.cardTime}>
              {formatarData(item.horario_agendado)}
            </Text>
          </View>
        </View>

        {/* Foto */}
        {item.foto_colaborador && (
          <Image
            source={{ uri: item.foto_colaborador }}
            style={styles.cardPhoto}
            resizeMode="contain"
          />
        )}

        {/* Informações */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CPF:</Text>
            <Text style={styles.infoValue}>{formatarCPF(item.cpf)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Setor:</Text>
            <Text style={styles.infoValue}>{item.setor}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Criado por:</Text>
            <Text style={styles.infoValue}>{item.criado_por}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View
              style={[
                styles.badge,
                item.confirmado ? styles.badgeConfirmed : styles.badgeScheduled,
              ]}
            >
              <Text style={styles.badgeText}>
                {item.confirmado ? "Confirmado" : "Agendado"}
              </Text>
            </View>
          </View>

          {item.confirmado && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Confirmado por:</Text>
                <Text style={styles.infoValue}>{item.confirmado_por}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Confirmado em:</Text>
                <Text style={styles.infoValue}>
                  {formatarData(item.confirmado_em)}
                </Text>
              </View>
            </>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Presença:</Text>
            <View
              style={[
                styles.badge,
                item.presente ? styles.badgePresent : styles.badgeAbsent,
              ]}
            >
              <Text style={styles.badgeText}>
                {item.presente ? "Presente" : "Não compareceu"}
              </Text>
            </View>
          </View>

          {item.presente && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Registrado por:</Text>
                <Text style={styles.infoValue}>{item.presente_por}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Registrado em:</Text>
                <Text style={styles.infoValue}>
                  {formatarData(item.presente_em)}
                </Text>
              </View>
            </>
          )}

          {item.observacao && (
            <View style={styles.observacaoContainer}>
              <Text style={styles.infoLabel}>Observação:</Text>
              <Text style={styles.observacaoText}>{item.observacao}</Text>
            </View>
          )}
        </View>

        {/* Ações */}
        {userData.id && (
          <View style={styles.cardActions}>
            {userPodeConfirmar && item.confirmado && !item.presente && (
              <TouchableOpacity
                style={[styles.actionButton, styles.presenceButton]}
                onPress={() => handleRegistrarPresenca(item.id)}
              >
                <Feather name="user-check" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Presença</Text>
              </TouchableOpacity>
            )}

            {userPodeConfirmar && !item.confirmado && (
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => handleConfirmarAgendamento(item.id)}
              >
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Confirmar</Text>
              </TouchableOpacity>
            )}

            {userPodeExcluir && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleExcluirAgendamento(item.id)}
              >
                <Feather name="trash-2" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Excluir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════════
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando agendamentos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#E02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.logoText}>Agendamentos</Text>
        {/* ✅ MOSTRA APENAS AGENDAMENTOS SEM PRESENÇA REGISTRADA */}
        {agendamentosPendentes > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeCount}>{agendamentosPendentes}</Text>
          </View>
        )}
      </View>

      {/* Lista */}
      {agendamentos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="calendar" size={64} color="#ddd" />
          <Text style={styles.emptyText}>Nenhum agendamento encontrado</Text>
          {userPodeCriar && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate("NovoAgendamento")}
            >
              <Text style={styles.createButtonText}>
                Criar Primeiro Agendamento
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={agendamentos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAgendamento}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#10B981"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 16,
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  logoText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
  },
  badgeContainer: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 10,
  },
  badgeCount: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  loadingContainer: {
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 20,
    textAlign: "center",
  },
  createButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 8,
  },
  cardTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTime: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  cardPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: "#000",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeConfirmed: {
    backgroundColor: "#10B981",
  },
  badgeScheduled: {
    backgroundColor: "#F59E0B",
  },
  badgePresent: {
    backgroundColor: "#3B82F6",
  },
  badgeAbsent: {
    backgroundColor: "#EF4444",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  observacaoContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  observacaoText: {
    fontSize: 14,
    color: "#000",
    marginTop: 4,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  presenceButton: {
    backgroundColor: "#3B82F6",
  },
  confirmButton: {
    backgroundColor: "#10B981",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
