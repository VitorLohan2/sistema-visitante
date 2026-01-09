// src/pages/GerenciarFuncionarios/index.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { styles } from "./styles";

export default function GerenciarFuncionarios() {
  const navigation = useNavigation();

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS LOCAIS
  // ═══════════════════════════════════════════════════════════════
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionariosFiltrados, setFuncionariosFiltrados] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS"); // TODOS, ATIVO, INATIVO
  const [userType, setUserType] = useState(null);

  // ═══════════════════════════════════════════════════════════════
  // BOOTSTRAP - CARREGAR FUNCIONÁRIOS
  // ═══════════════════════════════════════════════════════════════
  const bootstrap = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const ongType = await AsyncStorage.getItem("@Auth:ongType");

      if (!ongId) {
        navigation.reset({ index: 0, routes: [{ name: "Logon" }] });
        return;
      }

      // Verificar se é ADM
      if (ongType !== "ADM" && ongType !== "ADMIN") {
        Alert.alert(
          "Acesso Negado",
          "Somente administradores podem acessar esta área"
        );
        navigation.goBack();
        return;
      }

      setUserType(ongType);
      setInitialLoading(true);
      await carregarFuncionarios();
      setInitialLoading(false);
    } catch (error) {
      console.error("Erro no bootstrap:", error);
      setInitialLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
    }, [bootstrap])
  );

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR FUNCIONÁRIOS
  // ═══════════════════════════════════════════════════════════════
  const carregarFuncionarios = async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      const response = await api.get("/funcionarios", {
        params: { mostrarInativos: true },
        headers: { Authorization: ongId },
      });

      // Ordenar por nome
      const ordenados = response.data.sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
      );

      setFuncionarios(ordenados);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);

      if (error.response?.status === 403) {
        Alert.alert(
          "Acesso Negado",
          "Somente administradores podem acessar esta área"
        );
        navigation.goBack();
        return;
      }

      Alert.alert(
        "Erro",
        error.response?.data?.error || "Erro ao carregar funcionários"
      );
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // APLICAR FILTROS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    aplicarFiltros();
  }, [searchText, filtroStatus, funcionarios]);

  const aplicarFiltros = () => {
    let resultado = [...funcionarios];

    // Filtro por texto
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      resultado = resultado.filter(
        (func) =>
          func.nome.toLowerCase().includes(searchLower) ||
          func.cracha.toLowerCase().includes(searchLower) ||
          func.setor?.toLowerCase().includes(searchLower) ||
          func.funcao?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por status
    if (filtroStatus === "ATIVO") {
      resultado = resultado.filter((func) => func.ativo === true);
    } else if (filtroStatus === "INATIVO") {
      resultado = resultado.filter((func) => func.ativo === false);
    }

    setFuncionariosFiltrados(resultado);
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarFuncionarios();
    setRefreshing(false);
  }, []);

  const handleEditarFuncionario = (funcionario) => {
    navigation.navigate("EditarFuncionario", { cracha: funcionario.cracha });
  };

  const handleHistoricoFuncionario = (funcionario) => {
    navigation.navigate("HistoricoFuncionario", { cracha: funcionario.cracha });
  };

  const handleInativarFuncionario = async (funcionario) => {
    Alert.alert(
      "Confirmar Inativação",
      `Deseja realmente inativar o funcionário ${funcionario.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Inativar",
          style: "destructive",
          onPress: async () => {
            try {
              const ongId = await AsyncStorage.getItem("@Auth:ongId");

              await api.put(
                `/funcionarios/${funcionario.cracha}`,
                {
                  ativo: false,
                  data_demissao: new Date().toISOString().split("T")[0],
                },
                { headers: { Authorization: ongId } }
              );

              await carregarFuncionarios();
              Alert.alert("Sucesso", "Funcionário inativado com sucesso!");
            } catch (error) {
              console.error("Erro ao inativar funcionário:", error);

              if (error.response?.status === 403) {
                Alert.alert(
                  "Acesso Negado",
                  "Somente administradores podem realizar esta ação"
                );
                return;
              }

              Alert.alert(
                "Erro",
                error.response?.data?.error || "Erro ao inativar funcionário"
              );
            }
          },
        },
      ]
    );
  };

  const handleReativarFuncionario = async (funcionario) => {
    Alert.alert(
      "Confirmar Reativação",
      `Deseja realmente reativar o funcionário ${funcionario.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reativar",
          onPress: async () => {
            try {
              const ongId = await AsyncStorage.getItem("@Auth:ongId");

              await api.put(
                `/funcionarios/${funcionario.cracha}`,
                {
                  ativo: true,
                  data_demissao: null,
                },
                { headers: { Authorization: ongId } }
              );

              await carregarFuncionarios();
              Alert.alert("Sucesso", "Funcionário reativado com sucesso!");
            } catch (error) {
              console.error("Erro ao reativar funcionário:", error);

              if (error.response?.status === 403) {
                Alert.alert(
                  "Acesso Negado",
                  "Somente administradores podem realizar esta ação"
                );
                return;
              }

              Alert.alert(
                "Erro",
                error.response?.data?.error || "Erro ao reativar funcionário"
              );
            }
          },
        },
      ]
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // LOADING INICIAL
  // ═══════════════════════════════════════════════════════════════
  if (initialLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2083e0" />
        <Text style={styles.loadingText}>Carregando funcionários...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER FUNCIONÁRIO CARD
  // ═══════════════════════════════════════════════════════════════
  const renderFuncionarioCard = (funcionario) => {
    const isAtivo = funcionario.ativo;
    const isAdmin = userType === "ADM" || userType === "ADMIN";

    return (
      <View
        key={funcionario.cracha}
        style={[
          styles.funcionarioCard,
          !isAtivo && styles.funcionarioCardInativo,
        ]}
      >
        <View style={styles.funcionarioHeader}>
          <View style={styles.funcionarioInfo}>
            <View style={styles.funcionarioNameRow}>
              <Text
                style={[
                  styles.funcionarioName,
                  !isAtivo && styles.funcionarioNameInativo,
                ]}
              >
                {funcionario.nome}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isAtivo ? styles.statusBadgeAtivo : styles.statusBadgeInativo,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isAtivo
                      ? styles.statusBadgeTextAtivo
                      : styles.statusBadgeTextInativo,
                  ]}
                >
                  {isAtivo ? "ATIVO" : "INATIVO"}
                </Text>
              </View>
            </View>

            <View style={styles.funcionarioDetails}>
              <View style={styles.funcionarioDetailRow}>
                <Feather name="hash" size={14} color="#64748b" />
                <Text style={styles.funcionarioDetailText}>
                  Crachá: {funcionario.cracha}
                </Text>
              </View>

              {funcionario.setor && (
                <View style={styles.funcionarioDetailRow}>
                  <Feather name="briefcase" size={14} color="#64748b" />
                  <Text style={styles.funcionarioDetailText}>
                    {funcionario.setor}
                  </Text>
                </View>
              )}

              {funcionario.funcao && (
                <View style={styles.funcionarioDetailRow}>
                  <Feather name="user" size={14} color="#64748b" />
                  <Text style={styles.funcionarioDetailText}>
                    {funcionario.funcao}
                  </Text>
                </View>
              )}

              {!isAtivo && funcionario.data_demissao && (
                <View style={styles.funcionarioDetailRow}>
                  <Feather name="calendar" size={14} color="#ef4444" />
                  <Text
                    style={[styles.funcionarioDetailText, { color: "#ef4444" }]}
                  >
                    Demitido em:{" "}
                    {new Date(funcionario.data_demissao).toLocaleDateString(
                      "pt-BR"
                    )}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.funcionarioActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonHistory]}
            onPress={() => handleHistoricoFuncionario(funcionario)}
          >
            <Feather name="clock" size={16} color="#64748b" />
            <Text style={styles.actionButtonTextHistory}>Histórico</Text>
          </TouchableOpacity>

          {isAdmin && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonEdit]}
                onPress={() => handleEditarFuncionario(funcionario)}
              >
                <Feather name="edit-2" size={16} color="#10B981" />
                <Text style={styles.actionButtonTextEdit}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isAtivo
                    ? styles.actionButtonInativar
                    : styles.actionButtonReativar,
                ]}
                onPress={() =>
                  isAtivo
                    ? handleInativarFuncionario(funcionario)
                    : handleReativarFuncionario(funcionario)
                }
              >
                <Feather
                  name={isAtivo ? "x-circle" : "check-circle"}
                  size={16}
                  color={isAtivo ? "#ef4444" : "#10B981"}
                />
                <Text
                  style={
                    isAtivo
                      ? styles.actionButtonTextInativar
                      : styles.actionButtonTextReativar
                  }
                >
                  {isAtivo ? "Inativar" : "Reativar"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      {/* CABEÇALHO */}
      <View style={styles.headerGeral}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#10B981" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Gerenciar Funcionários</Text>

          {userType === "ADM" || userType === "ADMIN" ? (
            <TouchableOpacity
              onPress={() => navigation.navigate("CadastrarFuncionarios")}
              style={styles.addButton}
            >
              <Feather name="plus" size={24} color="#10B981" />
            </TouchableOpacity>
          ) : (
            <View style={styles.addButton} />
          )}
        </View>

        <Text style={styles.headerSubtitle}>
          {funcionariosFiltrados.length} funcionário(s) encontrado(s)
        </Text>

        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, crachá, setor..."
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
              filtroStatus === "TODOS" && styles.filterButtonActive,
            ]}
            onPress={() => setFiltroStatus("TODOS")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filtroStatus === "TODOS" && styles.filterButtonTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filtroStatus === "ATIVO" && styles.filterButtonActive,
            ]}
            onPress={() => setFiltroStatus("ATIVO")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filtroStatus === "ATIVO" && styles.filterButtonTextActive,
              ]}
            >
              Ativos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filtroStatus === "INATIVO" && styles.filterButtonActive,
            ]}
            onPress={() => setFiltroStatus("INATIVO")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filtroStatus === "INATIVO" && styles.filterButtonTextActive,
              ]}
            >
              Inativos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LISTA DE FUNCIONÁRIOS */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2083e0"]}
            tintColor="#2083e0"
          />
        }
      >
        {funcionariosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Nenhum funcionário encontrado</Text>
            <Text style={styles.emptyText}>
              {searchText
                ? "Tente ajustar sua pesquisa"
                : "Não há funcionários cadastrados"}
            </Text>
          </View>
        ) : (
          funcionariosFiltrados.map(renderFuncionarioCard)
        )}

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}
