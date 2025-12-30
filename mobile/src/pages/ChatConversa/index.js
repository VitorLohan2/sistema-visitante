import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";

import api from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ChatConversa() {
  const socket = useSocket();
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);

  const { conversa_id, conversa } = route.params;

  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [userData, setUserData] = useState({ id: "", type: "USER" });
  const [conversaAtual, setConversaAtual] = useState(conversa || {});

  // ✅ Buscar dados do usuário
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const ongId = await AsyncStorage.getItem("@Auth:ongId");
        if (!ongId) return;

        const response = await api.get(`ongs/${ongId}`);
        setUserData({
          id: ongId,
          type: response.data.type || "USER",
        });
      } catch (err) {
        console.error("❌ Erro ao buscar dados do usuário:", err.message);
      }
    };

    fetchUserData();
  }, []);

  // ✅ Carregar mensagens
  const carregarMensagens = useCallback(async () => {
    try {
      const response = await api.get(
        `/chat/conversas/${conversa_id}/mensagens`
      );
      setMensagens(response.data.mensagens || []);
      setConversaAtual(response.data.conversa || conversaAtual);

      // Rolar para o final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("❌ Erro ao carregar mensagens:", error);
      Alert.alert("Erro", "Não foi possível carregar as mensagens");
    } finally {
      setLoading(false);
    }
  }, [conversa_id, conversaAtual]);

  useFocusEffect(
    useCallback(() => {
      console.log("👁️ Tela ganhou foco - marcando mensagens como lidas");
      carregarMensagens();
    }, [])
  );

  // ✅ Socket - Entrar na sala da conversa
  useEffect(() => {
    if (!socket?.connected) return;

    socket.emit("entrar_conversa", conversa_id);
    console.log("🚪 Entrou na conversa:", conversa_id);

    return () => {
      socket.emit("sair_conversa", conversa_id);
      console.log("🚪 Saiu da conversa:", conversa_id);
    };
  }, [socket, conversa_id]);

  // ✅ Socket - Ouvir novas mensagens
  useEffect(() => {
    if (!socket?.connected) return;

    const handleNovaMensagem = (msg) => {
      console.log("💬 Nova mensagem recebida:", msg.id);
      setMensagens((prev) => [...prev, msg]);

      // ✅ Se a mensagem não é do usuário atual, marcar como lida automaticamente
      if (msg.remetente_id !== userData.id) {
        // Pequeno delay para garantir que a mensagem foi inserida no banco
        setTimeout(async () => {
          try {
            await api.put(`/chat/conversas/${conversa_id}/visualizar`);
            console.log("✅ Mensagem marcada como lida automaticamente");
          } catch (error) {
            console.error("❌ Erro ao marcar como lida:", error);
          }
        }, 500);
      }

      // Rolar para o final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    const handleConversaAtualizada = (data) => {
      console.log("🔄 Status da conversa atualizado via socket:", data);

      // Se é a conversa atual, atualiza o estado
      if (data.id === conversa_id) {
        setConversaAtual((prev) => ({
          ...prev,
          status: data.status || prev.status,
          data_atualizacao: data.data_atualizacao || prev.data_atualizacao,
        }));
      }
    };

    socket.on("mensagem:nova", handleNovaMensagem);
    socket.on("conversa:atualizada", handleConversaAtualizada);

    return () => {
      socket.off("mensagem:nova", handleNovaMensagem);
      socket.off("conversa:atualizada", handleConversaAtualizada);
    };
  }, [socket, conversa_id, userData.id]);

  // ✅ Enviar mensagem
  const enviarMensagem = useCallback(async () => {
    if (!novaMensagem.trim() || enviando) return;

    const mensagemTexto = novaMensagem.trim();
    setNovaMensagem("");
    setEnviando(true);

    try {
      await api.post(`/chat/conversas/${conversa_id}/mensagens`, {
        mensagem: mensagemTexto,
      });
      // Socket vai atualizar automaticamente
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
      Alert.alert("Erro", "Não foi possível enviar a mensagem");
      setNovaMensagem(mensagemTexto);
    } finally {
      setEnviando(false);
    }
  }, [novaMensagem, enviando, conversa_id]);

  // ✅ Finalizar conversa
  const finalizarConversa = useCallback(async () => {
    Alert.alert(
      "Finalizar Conversa",
      "Deseja marcar esta conversa como resolvida?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Finalizar",
          style: "default",
          onPress: async () => {
            try {
              await api.put(`/chat/conversas/${conversa_id}/status`, {
                status: "resolvido",
              });

              Alert.alert("Sucesso", "Conversa finalizada!", [
                {
                  text: "OK",
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              Alert.alert("Erro", "Não foi possível finalizar a conversa");
            }
          },
        },
      ]
    );
  }, [conversa_id, navigation]);

  // ✅ Cor do status
  const getStatusColor = (status) => {
    switch (status) {
      case "aberto":
        return "#ef4444";
      case "em_atendimento":
        return "#f59e0b";
      case "resolvido":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  // ✅ Render mensagem
  const renderMensagem = useCallback(
    ({ item }) => {
      const ehMinhaMsg = item.remetente_id === userData.id;
      const ehADM = item.remetente_tipo === "ADM";

      return (
        <View
          style={[
            styles.mensagemContainer,
            ehMinhaMsg ? styles.minhaMensagem : styles.outraMensagem,
          ]}
        >
          {!ehMinhaMsg && (
            <View style={styles.remetenteHeader}>
              <Feather
                name={ehADM ? "shield" : "user"}
                size={14}
                color={ehADM ? "#10b981" : "#64748b"}
              />
              <Text style={styles.remetenteName}>{item.remetente_nome}</Text>
            </View>
          )}

          <Text
            style={[
              styles.mensagemText,
              ehMinhaMsg ? styles.minhaMensagemText : styles.outraMensagemText,
            ]}
          >
            {item.mensagem}
          </Text>

          <Text
            style={[
              styles.mensagemHora,
              ehMinhaMsg && styles.mensagemHoraMinha,
            ]}
          >
            {dayjs.utc(item.data_envio).tz("America/Sao_Paulo").format("HH:mm")}
          </Text>
        </View>
      );
    },
    [userData.id]
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando conversa...</Text>
      </View>
    );
  }

  const podeEnviar =
    conversaAtual.status !== "resolvido" && conversaAtual.status !== "fechado";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color="#10b981" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {userData.type === "ADM"
                ? conversaAtual.usuario_nome
                : "Suporte TI"}
            </Text>
            <View style={styles.headerSubtitleContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(conversaAtual.status) },
                ]}
              />
              <Text style={styles.headerSubtitle}>
                {conversaAtual.status === "aberto" && "Aguardando atendimento"}
                {conversaAtual.status === "em_atendimento" && "Em atendimento"}
                {conversaAtual.status === "resolvido" && "Resolvido"}
                {conversaAtual.status === "fechado" && "Fechado"}
              </Text>
            </View>
          </View>

          {podeEnviar && (
            <TouchableOpacity
              style={styles.finalizarButton}
              onPress={finalizarConversa}
              activeOpacity={0.8}
            >
              <Feather name="check-circle" size={24} color="#10b981" />
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de Mensagens */}
        <FlatList
          ref={flatListRef}
          data={mensagens}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMensagem}
          contentContainerStyle={styles.mensagensContainer}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Feather name="message-circle" size={48} color="#ccc" />
              <Text style={styles.emptyMessagesText}>
                Nenhuma mensagem ainda
              </Text>
              <Text style={styles.emptyMessagesSubtext}>
                Inicie a conversa enviando uma mensagem
              </Text>
            </View>
          }
        />

        {/* Aviso se conversa finalizada */}
        {!podeEnviar && (
          <View style={styles.finalizadaContainer}>
            <Feather name="check-circle" size={20} color="#10b981" />
            <Text style={styles.finalizadaText}>
              Esta conversa foi finalizada
            </Text>
          </View>
        )}

        {/* Input de Mensagem */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, !podeEnviar && styles.inputDisabled]}
            placeholder={
              podeEnviar ? "Digite sua mensagem..." : "Conversa finalizada"
            }
            value={novaMensagem}
            onChangeText={setNovaMensagem}
            multiline
            maxLength={1000}
            editable={podeEnviar}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!novaMensagem.trim() || enviando || !podeEnviar) &&
                styles.sendButtonDisabled,
            ]}
            onPress={enviarMensagem}
            disabled={!novaMensagem.trim() || enviando || !podeEnviar}
            activeOpacity={0.7}
          >
            {enviando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    marginTop: 10,
    fontSize: 16,
    color: "#64748b",
  },

  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginTop: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  backButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },

  headerSubtitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#64748b",
  },

  finalizarButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
  },

  mensagensContainer: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },

  mensagemContainer: {
    maxWidth: "75%",
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },

  minhaMensagem: {
    alignSelf: "flex-end",
    backgroundColor: "#10b981",
  },

  outraMensagem: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  remetenteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  remetenteName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginLeft: 4,
  },

  mensagemText: {
    fontSize: 15,
    lineHeight: 20,
  },

  minhaMensagemText: {
    color: "#fff",
  },

  outraMensagemText: {
    color: "#1e293b",
  },

  mensagemHora: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
    alignSelf: "flex-end",
  },

  mensagemHoraMinha: {
    color: "#d1fae5",
  },

  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },

  emptyMessagesText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 16,
    fontWeight: "600",
  },

  emptyMessagesSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
  },

  finalizadaContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1fae5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#a7f3d0",
  },

  finalizadaText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
    marginLeft: 8,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },

  input: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
    color: "#1e293b",
  },

  inputDisabled: {
    backgroundColor: "#f1f5f9",
    color: "#94a3b8",
  },

  sendButton: {
    backgroundColor: "#10b981",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  sendButtonDisabled: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
    elevation: 0,
  },
});
