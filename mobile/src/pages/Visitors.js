// Página dos Visitantes que estão no Local (Triagem) em React Native
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import api from "../services/api";
import { useSocket } from "../contexts/SocketContext"; // ✅ Usar o contexto

export default function VisitorsScreen() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const [ongName, setOngName] = useState("");
  const socket = useSocket(); // ✅ Obter socket do contexto

  const loadVisitors = async () => {
    try {
      console.log("Iniciando visitantes...");
      const [ongId, name] = await Promise.all([
        AsyncStorage.getItem("@Auth:ongId"),
        AsyncStorage.getItem("@Auth:ongName"),
      ]);

      console.log("ONG ID:", ongId);
      console.log("ONG Name:", name);

      if (!ongId) {
        throw new Error("Cadastro não autenticado");
      }

      console.log("Fazendo requisição para /visitors...");
      const response = await api.get("/visitors", {
        headers: { Authorization: ongId },
      });

      console.log("Resposta recebida:", response);
      console.log("Dados recebidos:", response.data);

      if (!response.data) {
        throw new Error("Dados inválidos recebidos");
      }

      setVisitors(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Erro completo:", err);
      console.error("Resposta de erro:", err.response);
      Alert.alert(
        "Erro",
        err.response?.data?.message || "Erro ao carregar visitantes"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmEndVisit = (id) => {
    Alert.alert(
      "Confirmação",
      "Deseja realmente encerrar esta visita?",
      [
        {
          text: "Sim",
          onPress: () => handleEndVisit(id),
        },
        {
          text: "Não",
          onPress: () => console.log("Visita não encerrada"),
          style: "cancel",
        },
      ],
      { cancelable: false }
    );
  };

  const handleEndVisit = async (id) => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      await api.put(
        `/visitors/${id}/exit`,
        {},
        {
          headers: { Authorization: ongId },
        }
      );

      setVisitors((prev) => prev.filter((visitor) => visitor.id !== id));
      Alert.alert("Sucesso", "Visita finalizada com sucesso!");
    } catch (err) {
      console.error("Erro ao finalizar visita:", err);
      Alert.alert(
        "Erro",
        err.response?.data?.message || "Erro ao encerrar visita"
      );
    }
  };

  // ✅ CONFIGURAR SOCKET LISTENERS usando o contexto
  useEffect(() => {
    if (!socket) {
      console.log("⚠️ Socket não disponível ainda");
      return;
    }

    console.log("🔌 Configurando listeners do socket para visitantes...");

    // ✅ Listener para novo visitante criado
    const handleVisitorCreate = (data) => {
      console.log("📥 Novo visitante recebido via socket:", data);

      setVisitors((prevVisitors) => {
        // Verificar se o visitante já existe
        const exists = prevVisitors.some((v) => v.id === data.id);
        if (exists) {
          console.log("⚠️ Visitante já existe na lista");
          return prevVisitors;
        }

        // Adicionar novo visitante no início da lista
        console.log("✅ Adicionando novo visitante à lista");
        return [data, ...prevVisitors];
      });
    };

    // ✅ Listener para visitante removido/encerrado
    const handleVisitorDelete = (data) => {
      console.log("🗑️ Visitante encerrado via socket:", data);

      setVisitors((prevVisitors) => {
        const filtered = prevVisitors.filter((v) => v.id !== data.id);
        console.log(`✅ Visitante ${data.id} removido da lista`);
        return filtered;
      });
    };

    // ✅ Listener para visitante encerrado (evento alternativo)
    const handleVisitorEnd = (data) => {
      console.log("🚪 Visitante saiu via socket:", data);

      setVisitors((prevVisitors) => {
        const filtered = prevVisitors.filter((v) => v.id !== data.id);
        return filtered;
      });
    };

    // ✅ Registrar listeners
    socket.on("visitor:create", handleVisitorCreate);
    socket.on("visitor:delete", handleVisitorDelete);
    socket.on("visitor:end", handleVisitorEnd);

    console.log("✅ Listeners de visitantes registrados");

    // ✅ Cleanup: remover listeners quando o componente desmontar
    return () => {
      console.log("🔌 Removendo listeners do socket de visitantes");
      socket.off("visitor:create", handleVisitorCreate);
      socket.off("visitor:delete", handleVisitorDelete);
      socket.off("visitor:end", handleVisitorEnd);
    };
  }, [socket]); // ✅ Dependência: reconectar listeners quando socket mudar

  useFocusEffect(
    React.useCallback(() => {
      loadVisitors();
    }, [])
  );

  const renderItem = ({ item, index }) => (
    <View style={styles.item}>
      <Text style={styles.itemText}>
        {index + 1}. {item.name || "Visitante"}
      </Text>
      <Text style={styles.itemSubText}>CPF: {item.cpf || "Não informado"}</Text>
      <Text style={styles.itemSubText}>
        Empresa: {item.company || item.empresa || "Não informado"}
      </Text>
      <Text style={styles.itemSubText}>
        Setor: {item.sector || item.setor || "Não informado"}
      </Text>
      <Text style={styles.itemSubText}>
        Placa: {item.placa_veiculo || "Não informado"}
      </Text>
      <Text style={styles.itemSubText}>
        Cor: {item.cor_veiculo || "Não informado"}
      </Text>
      <Text style={styles.itemSubText}>
        Responsavel: {item.responsavel || "Não informado"}
      </Text>
      <Text style={styles.itemSubText}>
        Entrada: {new Date(item.entry_date || item.created_at).toLocaleString()}
      </Text>

      {!item.exit_date && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => confirmEndVisit(item.id)}
        >
          <Text style={styles.buttonText}>Encerrar Visita</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e02041" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { flex: 1 }]}
        >
          <Feather name="arrow-left" size={24} color="#e02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Visitantes</Text>
      <Text style={styles.subtitle}>Histórico de visitas</Text>

      <FlatList
        data={visitors}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum visitante encontrado</Text>
        }
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadVisitors();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 30,
  },
  backText: {
    fontSize: 18,
    marginLeft: 5,
    //fontWeight: 'bold',
    color: "#000",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#13131a",
  },
  subtitle: {
    fontSize: 16,
    color: "#737380",
    marginBottom: 20,
  },
  empty: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 16,
    color: "#999",
  },
  listContent: {
    paddingBottom: 20,
  },
  item: {
    backgroundColor: "#f0f0f5",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  itemSubText: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  button: {
    marginTop: 12,
    backgroundColor: "#e02041",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
