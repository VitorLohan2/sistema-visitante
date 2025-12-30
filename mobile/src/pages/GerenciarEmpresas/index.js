// src/pages/GerenciarEmpresas/index.js
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
import Feather from "react-native-vector-icons/Feather";

import { useEmpresas } from "../../contexts/EmpresasContext";
import { useSocket } from "../../contexts/SocketContext";
import api from "../../services/api";
import { styles } from "./styles";

// Assets
import logoImg from "../../assets/gd.png";

export default function GerenciarEmpresas() {
  const navigation = useNavigation();
  const socket = useSocket();

  // ═══════════════════════════════════════════════════════════════
  // CONTEXT
  // ═══════════════════════════════════════════════════════════════
  const {
    empresas,
    loading,
    loadEmpresas,
    refreshEmpresas,
    addEmpresa,
    updateEmpresa,
    removeEmpresa,
  } = useEmpresas();

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS LOCAIS
  // ═══════════════════════════════════════════════════════════════
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [empresasFiltradas, setEmpresasFiltradas] = useState([]);
  const [searchText, setSearchText] = useState("");

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR EMPRESAS (apenas 1x ao abrir a tela)
  // ═══════════════════════════════════════════════════════════════
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        setInitialLoading(true);
        await loadEmpresas();
        if (isActive) setInitialLoading(false);
      };

      load();

      return () => {
        isActive = false;
      };
    }, [loadEmpresas])
  );

  // ═══════════════════════════════════════════════════════════════
  // APLICAR FILTROS (quando empresas ou searchText mudam)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    aplicarFiltros();
  }, [searchText, empresas]);

  const aplicarFiltros = () => {
    let resultado = [...empresas];

    // Filtro por texto
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      resultado = resultado.filter(
        (empresa) =>
          empresa.nome.toLowerCase().includes(searchLower) ||
          empresa.cnpj?.includes(searchText) ||
          empresa.email?.toLowerCase().includes(searchLower) ||
          empresa.telefone?.includes(searchText)
      );
    }

    setEmpresasFiltradas(resultado);
  };

  // ═══════════════════════════════════════════════════════════════
  // SOCKET LISTENERS (atualiza o cache em tempo real)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!socket?.connected) {
      console.log("⚠️ Socket GerenciarEmpresas não conectado");
      return;
    }

    console.log("🔌 Registrando listeners do GerenciarEmpresas");

    const handleEmpresaCreate = (data) => {
      console.log("🏢 empresa:create recebido", data);
      addEmpresa(data);
    };

    const handleEmpresaUpdate = (data) => {
      console.log("✏️ empresa:update recebido", data);
      updateEmpresa(data);
    };

    const handleEmpresaDelete = (data) => {
      console.log("🗑️ empresa:delete recebido", data);
      removeEmpresa(data.id);
    };

    socket.off("empresa:create");
    socket.off("empresa:update");
    socket.off("empresa:delete");

    socket.on("empresa:create", handleEmpresaCreate);
    socket.on("empresa:update", handleEmpresaUpdate);
    socket.on("empresa:delete", handleEmpresaDelete);

    return () => {
      console.log("🧹 Removendo listeners do GerenciarEmpresas");
      socket.off("empresa:create", handleEmpresaCreate);
      socket.off("empresa:update", handleEmpresaUpdate);
      socket.off("empresa:delete", handleEmpresaDelete);
    };
  }, [socket, addEmpresa, updateEmpresa, removeEmpresa]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEmpresas();
    setRefreshing(false);
  }, [refreshEmpresas]);

  const handleEditarEmpresa = (empresa) => {
    navigation.navigate("EditarEmpresa", { empresaId: empresa.id });
  };

  const handleDeletarEmpresa = async (empresa) => {
    Alert.alert(
      "Confirmar Exclusão",
      `Deseja realmente excluir a empresa ${empresa.nome}?`,
      [
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletando(true);
              await api.delete(`/empresas-visitantes/${empresa.id}`);

              // Não precisa chamar removeEmpresa aqui, o socket vai fazer isso
              Alert.alert("Sucesso", "Empresa excluída com sucesso!");
            } catch (error) {
              console.error("Erro ao deletar empresa:", error);
              const errorMessage =
                error.response?.data?.error ||
                "Não foi possível excluir a empresa";
              Alert.alert("Erro", errorMessage);
            } finally {
              setDeletando(false);
            }
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const handleCadastrarEmpresa = () => {
    navigation.navigate("CadastrarEmpresa");
  };

  // ═══════════════════════════════════════════════════════════════
  // LOADING REAL (TELA BLOQUEADA)
  // ═══════════════════════════════════════════════════════════════
  if (initialLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando empresas...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER EMPRESA CARD
  // ═══════════════════════════════════════════════════════════════
  const renderEmpresaCard = (empresa) => {
    return (
      <View key={empresa.id} style={styles.empresaCard}>
        <View style={styles.empresaHeader}>
          <View style={styles.empresaInfo}>
            <Text style={styles.empresaNome}>{empresa.nome}</Text>

            <View style={styles.empresaDetails}>
              {empresa.cnpj && (
                <View style={styles.empresaDetailRow}>
                  <Feather name="file-text" size={14} color="#64748b" />
                  <Text style={styles.empresaDetailText}>
                    CNPJ: {formatCNPJ(empresa.cnpj)}
                  </Text>
                </View>
              )}
              {empresa.email && (
                <View style={styles.empresaDetailRow}>
                  <Feather name="mail" size={14} color="#64748b" />
                  <Text style={styles.empresaDetailText}>{empresa.email}</Text>
                </View>
              )}
              {empresa.telefone && (
                <View style={styles.empresaDetailRow}>
                  <Feather name="phone" size={14} color="#64748b" />
                  <Text style={styles.empresaDetailText}>
                    {formatTelefone(empresa.telefone)}
                  </Text>
                </View>
              )}
              {empresa.endereco && (
                <View style={styles.empresaDetailRow}>
                  <Feather name="map-pin" size={14} color="#64748b" />
                  <Text style={styles.empresaDetailText}>
                    {empresa.endereco}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.empresaActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonEdit]}
            onPress={() => handleEditarEmpresa(empresa)}
          >
            <Feather name="edit-2" size={16} color="#20a3e0" />
            <Text style={styles.actionButtonTextEdit}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDelete]}
            onPress={() => handleDeletarEmpresa(empresa)}
          >
            <Feather name="trash-2" size={16} color="#ef4444" />
            <Text style={styles.actionButtonTextDelete}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // FORMATADORES
  // ═══════════════════════════════════════════════════════════════
  const formatCNPJ = (cnpj) => {
    if (!cnpj) return "";
    return cnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  };

  const formatTelefone = (telefone) => {
    if (!telefone) return "";
    if (telefone.length === 11) {
      return telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    }
    if (telefone.length === 10) {
      return telefone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }
    return telefone;
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (loading && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando empresas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* CABEÇALHO */}
      {/* ═══════════════════════════════════════════════════════ */}
      <View style={styles.headerGeral}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#10B981" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Gerenciar Empresas</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {empresasFiltradas.length} empresa(s) encontrada(s)
        </Text>
        {deletando && (
          <View style={styles.deletingIndicator}>
            <ActivityIndicator size="small" color="#ef4444" />
            <Text style={styles.deletingText}>Excluindo empresa...</Text>
          </View>
        )}

        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, CNPJ, email..."
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

        {/* Botão Cadastrar */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCadastrarEmpresa}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Nova Empresa</Text>
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* LISTA DE EMPRESAS */}
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
        {empresasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="briefcase" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Nenhuma empresa encontrada</Text>
            <Text style={styles.emptyText}>
              {searchText
                ? "Tente ajustar sua pesquisa"
                : "Nenhuma empresa cadastrada ainda"}
            </Text>
            {!searchText && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleCadastrarEmpresa}
              >
                <Feather name="plus" size={20} color="#10B981" />
                <Text style={styles.emptyButtonText}>
                  Cadastrar Primeira Empresa
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          empresasFiltradas.map(renderEmpresaCard)
        )}

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}
