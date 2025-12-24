// src/pages/Admin/index.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import api from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import { useIncidents } from "../../contexts/IncidentsContext"; // ✅ AQUI
import { styles } from "./styles";

// Assets
import logoImg from "../../assets/gd.png";

export default function Admin() {
  const navigation = useNavigation();
  const socket = useSocket();
  const { width } = Dimensions.get("window");

  // ═══════════════════════════════════════════════════════════════
  // CONTEXT
  // ═══════════════════════════════════════════════════════════════
  const { allIncidents, isDataLoaded } = useIncidents(); // ✅ CACHE DE VISITANTES

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({ setor: "", nome: "" });

  const [dashboardData, setDashboardData] = useState({
    totalVisitantes: 0,
    visitantesHoje: 0,
    visitantesMes: 0,
    totalEmpresas: 0,
    visitasHoje: 0,
    visitasMes: 0,
  });

  const userDataFetchedRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR DADOS DO DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  const loadDashboardData = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const ongName = await AsyncStorage.getItem("@Auth:ongName");

      if (!ongId) {
        navigation.reset({ index: 0, routes: [{ name: "Logon" }] });
        return;
      }

      // 🔹 Busca dados da ONG (uma vez)
      if (!userDataFetchedRef.current) {
        const ongResponse = await api.get(`ongs/${ongId}`);
        setUserData({
          setor: ongResponse.data.setor || "",
          nome: ongResponse.data.name || ongName || "",
        });
        userDataFetchedRef.current = true;
      }

      // 🔹 Aguarda cache de visitantes estar pronto
      if (!isDataLoaded) {
        console.log("⏳ Aguardando cache de visitantes...");
        return;
      }

      // 🔹 Busca empresas e histórico
      const [empresasRes, historicoRes] = await Promise.all([
        api.get("/empresas-visitantes"),
        api.get("history", { headers: { Authorization: ongId } }),
      ]);

      const empresas = empresasRes.data || [];
      const historico = historicoRes.data || [];

      const hoje = new Date().toISOString().split("T")[0];
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();

      // ✅ VISITANTES → CACHE (IncidentsContext)
      const visitantesHoje = allIncidents.filter(
        (v) => v.created_at?.split("T")[0] === hoje
      ).length;

      const visitantesMes = allIncidents.filter((v) => {
        if (!v.created_at) return false;
        const d = new Date(v.created_at);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      }).length;

      const visitasHoje = historico.filter(
        (h) => h.entry_time?.split("T")[0] === hoje
      ).length;

      const visitasMes = historico.filter((h) => {
        if (!h.entry_time) return false;
        const d = new Date(h.entry_time);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      }).length;

      setDashboardData({
        totalVisitantes: allIncidents.length, // ✅ CORRETO
        visitantesHoje,
        visitantesMes,
        totalEmpresas: empresas.length,
        visitasHoje,
        visitasMes,
      });
    } catch (err) {
      console.error("❌ Erro ao carregar dashboard:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, allIncidents, isDataLoaded]);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET LISTENERS (MANTIDO)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!socket?.connected) return;

    const reload = () => loadDashboardData();

    socket.off("visitante:create");
    socket.off("empresa:create");
    socket.off("empresa:update");
    socket.off("empresa:delete");
    socket.off("visita:create");

    socket.on("visitante:create", reload);
    socket.on("empresa:create", reload);
    socket.on("empresa:update", reload);
    socket.on("empresa:delete", reload);
    socket.on("visita:create", reload);

    return () => {
      socket.off("visitante:create", reload);
      socket.off("empresa:create", reload);
      socket.off("empresa:update", reload);
      socket.off("empresa:delete", reload);
      socket.off("visita:create", reload);
    };
  }, [socket, loadDashboardData]);

  // ═══════════════════════════════════════════════════════════════
  // FOCUS EFFECT
  // ═══════════════════════════════════════════════════════════════
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // ═══════════════════════════════════════════════════════════════
  // REFRESH
  // ═══════════════════════════════════════════════════════════════
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogout = () => {
    navigation.goBack();
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando Painel Admin...</Text>
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
        {/* ═══════════════════════════════════════════════════════ */}
        {/* CABEÇALHO */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image source={logoImg} style={styles.logo} />
            <TouchableOpacity onPress={handleLogout} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#10B981" />
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Painel Administrativo</Text>
            <Text style={styles.adminName}>{userData.nome || "Admin"}</Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* CARDS DE ESTATÍSTICAS */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Dashboard Geral</Text>

          {/* Linha 1 */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <View style={styles.statIconContainer}>
                <Feather name="users" size={28} color="#10B981" />
              </View>
              <Text style={styles.statValue}>
                {dashboardData.totalVisitantes}
              </Text>
              <Text style={styles.statLabel}>Total Visitantes</Text>
              <Text style={styles.statSubLabel}>Cadastrados</Text>
            </View>

            <View style={[styles.statCard, styles.statCardSuccess]}>
              <View style={styles.statIconContainer}>
                <Feather name="user-check" size={28} color="#34CB79" />
              </View>
              <Text style={styles.statValue}>
                {dashboardData.visitantesHoje}
              </Text>
              <Text style={styles.statLabel}>Visitantes Hoje</Text>
              <Text style={styles.statSubLabel}>Novos cadastros</Text>
            </View>
          </View>

          {/* Linha 2 */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardInfo]}>
              <View style={styles.statIconContainer}>
                <Feather name="calendar" size={28} color="#20a3e0" />
              </View>
              <Text style={styles.statValue}>
                {dashboardData.visitantesMes}
              </Text>
              <Text style={styles.statLabel}>Visitantes Mês</Text>
              <Text style={styles.statSubLabel}>
                {new Date().toLocaleDateString("pt-BR", { month: "long" })}
              </Text>
            </View>

            <View style={[styles.statCard, styles.statCardWarning]}>
              <View style={styles.statIconContainer}>
                <Feather name="briefcase" size={28} color="#f9a825" />
              </View>
              <Text style={styles.statValue}>
                {dashboardData.totalEmpresas}
              </Text>
              <Text style={styles.statLabel}>Empresas</Text>
              <Text style={styles.statSubLabel}>Cadastradas</Text>
            </View>
          </View>

          {/* Linha 3 */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardPurple]}>
              <View style={styles.statIconContainer}>
                <Feather name="log-in" size={28} color="#9333EA" />
              </View>
              <Text style={styles.statValue}>{dashboardData.visitasHoje}</Text>
              <Text style={styles.statLabel}>Visitas Hoje</Text>
              <Text style={styles.statSubLabel}>Registradas</Text>
            </View>

            <View style={[styles.statCard, styles.statCardOrange]}>
              <View style={styles.statIconContainer}>
                <Feather name="trending-up" size={28} color="#ea580c" />
              </View>
              <Text style={styles.statValue}>{dashboardData.visitasMes}</Text>
              <Text style={styles.statLabel}>Visitas Mês</Text>
              <Text style={styles.statSubLabel}>Total do período</Text>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* AÇÕES ADMINISTRATIVAS */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Ações Administrativas</Text>

          {/* Cadastrar Funcionário */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Cadastro")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#e3f2fd" }]}>
              <Feather name="user-plus" size={24} color="#20a3e0" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Cadastrar Usuário</Text>
              <Text style={styles.actionDescription}>
                Adicione funcionários ao sistema
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Gerenciar Usuários */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("GerenciarUsuarios")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#e3f2fd" }]}>
              <Feather name="users" size={24} color="#20a3e0" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Gerenciar Usuários</Text>
              <Text style={styles.actionDescription}>
                Controle de acessos e permissões
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Cadastrar Empresa */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("CadastrarEmpresa")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#e8f5e9" }]}>
              <MaterialCommunityIcons
                name="office-building"
                size={24}
                color="#10B981"
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Cadastrar Empresa</Text>
              <Text style={styles.actionDescription}>
                Adicione novas empresas ao sistema
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Gerenciar Usuários */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("GerenciarEmpresas")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#e8f5e9" }]}>
              <MaterialCommunityIcons
                name="office-building"
                size={24}
                color="#10B981"
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Gerenciar Empresas</Text>
              <Text style={styles.actionDescription}>Empresas Registradas</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Gerenciar Setores */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("GerenciarSetores")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#e0f2f1" }]}>
              <MaterialCommunityIcons
                name="office-building"
                size={24}
                color="#009688"
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Gerenciar Setores</Text>
              <Text style={styles.actionDescription}>
                Configure os setores da empresa
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Relatórios */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Relatorios")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#fce4ec" }]}>
              <Feather name="bar-chart-2" size={24} color="#e91e63" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Relatórios</Text>
              <Text style={styles.actionDescription}>
                Baixar relatórios detalhados
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* Configurações do Sistema */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("ComunicadoAdmin")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#fff3e0" }]}>
              <Feather name="alert-triangle" size={24} color="#f9a825" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Aviso de Comunicado</Text>
              <Text style={styles.actionDescription}>Notificação Global</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}
