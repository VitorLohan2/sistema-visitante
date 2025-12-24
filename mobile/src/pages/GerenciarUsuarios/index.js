// src/pages/GerenciarUsuarios/index.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";

import api from "../../services/api";
import { useUsuarios } from "../../contexts/UsuariosContext";
import { useSocket } from "../../contexts/SocketContext";
import { styles } from "./styles";

// Assets
import logoImg from "../../assets/gd.png";

export default function GerenciarUsuarios() {
  const navigation = useNavigation();
  const socket = useSocket();

  // ═══════════════════════════════════════════════════════════════
  // CONTEXT
  // ═══════════════════════════════════════════════════════════════
  const {
    usuarios,
    loading,
    loadUsuarios,
    refreshUsuarios,
    addUsuario,
    updateUsuario,
    removeUsuario,
  } = useUsuarios();

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS LOCAIS
  // ═══════════════════════════════════════════════════════════════
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS"); // TODOS, USER, ADM

  // ═══════════════════════════════════════════════════════════════
  // BOOTSTRAP - CARREGAR USUÁRIOS (apenas 1x ao abrir a tela)
  // ═══════════════════════════════════════════════════════════════
  const bootstrap = useCallback(async () => {
    const ongId = await AsyncStorage.getItem("@Auth:ongId");

    if (!ongId) {
      navigation.reset({ index: 0, routes: [{ name: "Logon" }] });
      return;
    }

    setInitialLoading(true);
    await loadUsuarios();
    setInitialLoading(false);
  }, [loadUsuarios, navigation]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        await bootstrap();
      };

      load();

      return () => {
        isActive = false;
      };
    }, [bootstrap])
  );

  // ═══════════════════════════════════════════════════════════════
  // APLICAR FILTROS (quando usuarios, searchText ou filtroTipo mudam)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    aplicarFiltros();
  }, [searchText, filtroTipo, usuarios]);

  const aplicarFiltros = () => {
    let resultado = [...usuarios];

    // Filtro por texto
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      resultado = resultado.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.cpf?.includes(searchText) ||
          user.whatsapp?.includes(searchText)
      );
    }

    // Filtro por tipo
    if (filtroTipo !== "TODOS") {
      resultado = resultado.filter((user) => user.type === filtroTipo);
    }

    setUsuariosFiltrados(resultado);
  };

  // ═══════════════════════════════════════════════════════════════
  // SOCKET LISTENERS (atualiza o cache em tempo real)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!socket?.connected) {
      console.log("⚠️ Socket GerenciarUsuarios não conectado");
      return;
    }

    console.log("🔌 Registrando listeners do GerenciarUsuarios");

    const handleUsuarioCreated = async (data) => {
      console.log("🆕 usuario:created recebido", data);

      try {
        const response = await api.get(`/ongs/${data.id}`);
        addUsuario(response.data);
      } catch (err) {
        console.error("Erro ao buscar usuário criado:", err);
      }
    };

    const handleUsuarioUpdated = async ({ id }) => {
      console.log("✏️ usuario:updated recebido", id);

      try {
        const response = await api.get(`/ongs/${id}`);
        updateUsuario(response.data);
      } catch (err) {
        console.error("Erro ao buscar usuário atualizado:", err);
      }
    };

    const handleUsuarioDeleted = ({ id }) => {
      console.log("🗑️ usuario:deleted recebido", id);
      removeUsuario(id);
    };

    socket.off("usuario:created");
    socket.off("usuario:updated");
    socket.off("usuario:deleted");

    socket.on("usuario:created", handleUsuarioCreated);
    socket.on("usuario:updated", handleUsuarioUpdated);
    socket.on("usuario:deleted", handleUsuarioDeleted);

    return () => {
      console.log("🧹 Removendo listeners do GerenciarUsuarios");
      socket.off("usuario:created", handleUsuarioCreated);
      socket.off("usuario:updated", handleUsuarioUpdated);
      socket.off("usuario:deleted", handleUsuarioDeleted);
    };
  }, [socket, addUsuario, updateUsuario, removeUsuario]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUsuarios();
    setRefreshing(false);
  }, [refreshUsuarios]);

  const handleEditarUsuario = (usuario) => {
    if (usuario.type === "ADM") {
      Alert.alert("Ação não permitida", "Usuários ADM não podem ser editados");
      return;
    }
    navigation.navigate("EditarUsuario", { usuarioId: usuario.id });
  };

  const handleDeletarUsuario = async (usuario) => {
    if (usuario.type === "ADM") {
      Alert.alert("Ação não permitida", "Usuários ADM não podem ser excluídos");
      return;
    }

    Alert.alert(
      "Confirmar Exclusão",
      `Deseja realmente excluir o usuário ${usuario.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`ongs/${usuario.id}`);
              // Não precisa chamar removeUsuario aqui, o socket vai fazer isso
              Alert.alert("Sucesso", "Usuário excluído com sucesso!");
            } catch (error) {
              console.error("Erro ao deletar usuário:", error);
              const errorMessage =
                error.response?.data?.error ||
                "Não foi possível excluir o usuário";
              Alert.alert("Erro", errorMessage);
            }
          },
        },
      ]
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // LOADING REAL (TELA BLOQUEADA)
  // ═══════════════════════════════════════════════════════════════
  if (initialLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando usuários...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER USUÁRIO CARD
  // ═══════════════════════════════════════════════════════════════
  const renderUsuarioCard = (usuario) => {
    const isAdmin = usuario.type === "ADM";

    return (
      <View
        key={usuario.id}
        style={[styles.userCard, isAdmin && styles.userCardAdmin]}
      >
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{usuario.name}</Text>
              <View
                style={[
                  styles.typeBadge,
                  isAdmin ? styles.typeBadgeAdmin : styles.typeBadgeUser,
                ]}
              >
                <Text
                  style={[
                    styles.typeBadgeText,
                    isAdmin
                      ? styles.typeBadgeTextAdmin
                      : styles.typeBadgeTextUser,
                  ]}
                >
                  {usuario.type}
                </Text>
              </View>
            </View>

            <View style={styles.userDetails}>
              <View style={styles.userDetailRow}>
                <Feather name="mail" size={14} color="#64748b" />
                <Text style={styles.userDetailText}>{usuario.email}</Text>
              </View>
              {usuario.whatsapp && (
                <View style={styles.userDetailRow}>
                  <Feather name="phone" size={14} color="#64748b" />
                  <Text style={styles.userDetailText}>{usuario.whatsapp}</Text>
                </View>
              )}
              {usuario.cpf && (
                <View style={styles.userDetailRow}>
                  <Feather name="credit-card" size={14} color="#64748b" />
                  <Text style={styles.userDetailText}>{usuario.cpf}</Text>
                </View>
              )}
              {usuario.city && usuario.uf && (
                <View style={styles.userDetailRow}>
                  <Feather name="map-pin" size={14} color="#64748b" />
                  <Text style={styles.userDetailText}>
                    {usuario.city}, {usuario.uf}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {!isAdmin && (
          <View style={styles.userActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonEdit]}
              onPress={() => handleEditarUsuario(usuario)}
            >
              <Feather name="edit-2" size={16} color="#20a3e0" />
              <Text style={styles.actionButtonTextEdit}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDelete]}
              onPress={() => handleDeletarUsuario(usuario)}
            >
              <Feather name="trash-2" size={16} color="#ef4444" />
              <Text style={styles.actionButtonTextDelete}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAdmin && (
          <View style={styles.adminLockContainer}>
            <Feather name="lock" size={16} color="#9333EA" />
            <Text style={styles.adminLockText}>
              Usuário protegido - sem edição
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (loading && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando usuários...</Text>
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Gerenciar Usuários</Text>
          <Text style={styles.headerSubtitle}>
            {usuariosFiltrados.length} usuário(s) encontrado(s)
          </Text>
        </View>

        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, email, CPF..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Feather name="x" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filtroTipo === "TODOS" && styles.filterButtonActive,
            ]}
            onPress={() => setFiltroTipo("TODOS")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filtroTipo === "TODOS" && styles.filterButtonTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filtroTipo === "USER" && styles.filterButtonActive,
            ]}
            onPress={() => setFiltroTipo("USER")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filtroTipo === "USER" && styles.filterButtonTextActive,
              ]}
            >
              Usuários
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filtroTipo === "ADM" && styles.filterButtonActive,
            ]}
            onPress={() => setFiltroTipo("ADM")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filtroTipo === "ADM" && styles.filterButtonTextActive,
              ]}
            >
              Admins
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* LISTA DE USUÁRIOS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <ScrollView
        style={styles.content}
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
        {usuariosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
            <Text style={styles.emptyText}>
              {searchText
                ? "Tente ajustar sua pesquisa"
                : "Não há usuários cadastrados"}
            </Text>
          </View>
        ) : (
          usuariosFiltrados.map(renderUsuarioCard)
        )}

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}
