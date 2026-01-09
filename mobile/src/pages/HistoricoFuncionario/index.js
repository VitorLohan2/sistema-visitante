// src/pages/HistoricoFuncionario/index.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";

import api from "../../services/api";
import { styles } from "./styles";

export default function HistoricoFuncionario() {
  const navigation = useNavigation();
  const route = useRoute();
  const { cracha } = route.params;

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS LOCAIS
  // ═══════════════════════════════════════════════════════════════
  const [registros, setRegistros] = useState([]);
  const [funcionario, setFuncionario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: null,
    dataFim: null,
  });
  const [showDatePicker, setShowDatePicker] = useState({
    visible: false,
    tipo: null, // 'inicio' ou 'fim'
  });

  // ═══════════════════════════════════════════════════════════════
  // BOOTSTRAP
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    carregarDados();
  }, [cracha]);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES DE DATA
  // ═══════════════════════════════════════════════════════════════
  const formatarDataParaAPI = (date) => {
    if (!date) return "";

    const data = new Date(date);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);
    return data.toISOString().split("T")[0];
  };

  const formatarDataExibicao = (dataString) => {
    if (!dataString) return "-";

    const data = new Date(dataString);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);

    return data.toLocaleDateString("pt-BR");
  };

  const formatarHoraExibicao = (dataString) => {
    if (!dataString) return "-";

    const data = new Date(dataString);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);

    const horas = data.getHours();
    const minutos = data.getMinutes();
    const periodo = horas >= 12 ? "pm" : "am";

    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(
      2,
      "0"
    )} ${periodo}`;
  };

  const calcularHorasTrabalhadas = (registro) => {
    if (!registro.hora_entrada || !registro.hora_saida) return "-";

    try {
      const ajustarFusoBrasil = (dataString) => {
        const data = new Date(dataString);
        data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);
        return data;
      };

      const entrada = ajustarFusoBrasil(registro.hora_entrada);
      const saida = ajustarFusoBrasil(registro.hora_saida);

      if (saida <= entrada) return "Inválido";

      const diffMs = saida - entrada;
      const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `${String(diffHoras).padStart(2, "0")}:${String(
        diffMinutos
      ).padStart(2, "0")}`;
    } catch (error) {
      console.error("Erro ao calcular horas:", error);
      return "Erro";
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR DADOS
  // ═══════════════════════════════════════════════════════════════
  const carregarDados = async () => {
    try {
      setLoading(true);
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      // Carrega dados do funcionário
      const responseFunc = await api.get(`/funcionarios/${cracha}`, {
        headers: { Authorization: ongId },
      });
      setFuncionario(responseFunc.data);

      // Carrega histórico
      await carregarHistorico();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      Alert.alert(
        "Erro",
        error.response?.data?.error || "Erro ao carregar dados"
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const carregarHistorico = async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const params = { cracha };

      if (filtros.dataInicio) {
        params.dataInicio = formatarDataParaAPI(filtros.dataInicio);
      }
      if (filtros.dataFim) {
        const dataFim = new Date(filtros.dataFim);
        dataFim.setDate(dataFim.getDate() + 1);
        params.dataFim = formatarDataParaAPI(dataFim);
      }

      const response = await api.get("/registros-ponto/historico", {
        params,
        headers: { Authorization: ongId },
      });

      setRegistros(response.data.registros);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      Alert.alert(
        "Erro",
        error.response?.data?.error || "Erro ao carregar histórico"
      );
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarHistorico();
    setRefreshing(false);
  }, [filtros]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker({ visible: false, tipo: null });

    if (event.type === "set" && selectedDate) {
      if (showDatePicker.tipo === "inicio") {
        setFiltros({ ...filtros, dataInicio: selectedDate });
      } else if (showDatePicker.tipo === "fim") {
        setFiltros({ ...filtros, dataFim: selectedDate });
      }
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      await carregarHistorico();
      setMostrarFiltros(false);
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = async () => {
    setFiltros({
      dataInicio: null,
      dataFim: null,
    });
    await carregarHistorico();
  };

  // ═══════════════════════════════════════════════════════════════
  // LOADING INICIAL
  // ═══════════════════════════════════════════════════════════════
  if (loading && !funcionario) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2083e0" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER REGISTRO CARD
  // ═══════════════════════════════════════════════════════════════
  const renderRegistroCard = (registro) => {
    const horasTrabalhadas = calcularHorasTrabalhadas(registro);

    return (
      <View key={registro.id} style={styles.registroCard}>
        <View style={styles.registroHeader}>
          <View style={styles.registroDataContainer}>
            <Feather name="calendar" size={18} color="#2083e0" />
            <Text style={styles.registroData}>
              {formatarDataExibicao(registro.data)}
            </Text>
          </View>
          <View style={styles.registroTotalBadge}>
            <Text style={styles.registroTotalText}>{horasTrabalhadas}</Text>
          </View>
        </View>

        <View style={styles.registroDetalhes}>
          <View style={styles.registroDetalheRow}>
            <View style={styles.registroDetalheItem}>
              <Feather name="log-in" size={16} color="#10B981" />
              <View>
                <Text style={styles.registroDetalheLabel}>Entrada</Text>
                <Text style={styles.registroDetalheValor}>
                  {registro.hora_entrada
                    ? formatarHoraExibicao(registro.hora_entrada)
                    : "-"}
                </Text>
              </View>
            </View>

            <View style={styles.registroDetalheItem}>
              <Feather name="log-out" size={16} color="#ef4444" />
              <View>
                <Text style={styles.registroDetalheLabel}>Saída</Text>
                <Text style={styles.registroDetalheValor}>
                  {registro.hora_saida
                    ? formatarHoraExibicao(registro.hora_saida)
                    : "-"}
                </Text>
              </View>
            </View>
          </View>
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
            <Feather name="arrow-left" size={24} color="#2083e0" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Histórico de Pontos</Text>

          <TouchableOpacity
            onPress={() => setMostrarFiltros(!mostrarFiltros)}
            style={styles.filterButton}
          >
            <Feather name="filter" size={24} color="#2083e0" />
          </TouchableOpacity>
        </View>

        {funcionario && (
          <View style={styles.funcionarioInfo}>
            <Text style={styles.funcionarioNome}>{funcionario.nome}</Text>
            <View style={styles.funcionarioDetalhes}>
              <View style={styles.funcionarioDetalheItem}>
                <Feather name="hash" size={14} color="#64748b" />
                <Text style={styles.funcionarioDetalheTexto}>
                  Crachá: {funcionario.cracha}
                </Text>
              </View>
              {funcionario.setor && (
                <View style={styles.funcionarioDetalheItem}>
                  <Feather name="briefcase" size={14} color="#64748b" />
                  <Text style={styles.funcionarioDetalheTexto}>
                    {funcionario.setor}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <Text style={styles.headerSubtitle}>
          {registros.length} registro(s) encontrado(s)
        </Text>
      </View>

      {/* FILTROS */}
      {mostrarFiltros && (
        <View style={styles.filtrosContainer}>
          <Text style={styles.filtrosTitle}>Filtrar por Período</Text>

          <View style={styles.filtroRow}>
            <View style={styles.filtroItem}>
              <Text style={styles.filtroLabel}>Data Início</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() =>
                  setShowDatePicker({ visible: true, tipo: "inicio" })
                }
              >
                <Feather name="calendar" size={16} color="#64748b" />
                <Text style={styles.dateButtonText}>
                  {filtros.dataInicio
                    ? new Date(filtros.dataInicio).toLocaleDateString("pt-BR")
                    : "Selecione"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filtroItem}>
              <Text style={styles.filtroLabel}>Data Fim</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() =>
                  setShowDatePicker({ visible: true, tipo: "fim" })
                }
              >
                <Feather name="calendar" size={16} color="#64748b" />
                <Text style={styles.dateButtonText}>
                  {filtros.dataFim
                    ? new Date(filtros.dataFim).toLocaleDateString("pt-BR")
                    : "Selecione"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filtroActions}>
            <TouchableOpacity
              style={styles.limparButton}
              onPress={limparFiltros}
            >
              <Text style={styles.limparButtonText}>Limpar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aplicarButton}
              onPress={aplicarFiltros}
            >
              <Text style={styles.aplicarButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* LISTA DE REGISTROS */}
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
        {registros.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="clock" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Nenhum registro encontrado</Text>
            <Text style={styles.emptyText}>
              {filtros.dataInicio || filtros.dataFim
                ? "Tente ajustar os filtros de data"
                : "Ainda não há registros de ponto para este funcionário"}
            </Text>
          </View>
        ) : (
          registros.map(renderRegistroCard)
        )}

        <View style={styles.margin} />
      </ScrollView>

      {/* DATE PICKER */}
      {showDatePicker.visible && (
        <DateTimePicker
          value={
            showDatePicker.tipo === "inicio"
              ? filtros.dataInicio || new Date()
              : filtros.dataFim || new Date()
          }
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}
