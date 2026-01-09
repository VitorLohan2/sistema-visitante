// src/pages/HistoricoPontoUsuario/index.js
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
  Linking,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";

import api from "../../services/api";
import { styles } from "./styles";

export default function HistoricoPontoUsuario() {
  const navigation = useNavigation();

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS LOCAIS
  // ═══════════════════════════════════════════════════════════════
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: null,
    dataFim: null,
  });
  const [showDatePicker, setShowDatePicker] = useState({
    visible: false,
    tipo: null,
  });

  // ═══════════════════════════════════════════════════════════════
  // BOOTSTRAP - CORRIGIDO
  // ═══════════════════════════════════════════════════════════════
  const bootstrap = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const ongName = await AsyncStorage.getItem("@Auth:ongName");

      console.log("📋 Dados de autenticação (Histórico):", {
        ongId,
        ongName,
      });

      if (!ongId) {
        Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
        navigation.reset({ index: 0, routes: [{ name: "Logon" }] });
        return;
      }

      setUserData({
        id: ongId,
        name: ongName || "Usuário",
      });

      await carregarHistorico(ongId);
    } catch (error) {
      console.error("❌ Erro no bootstrap:", error);
      Alert.alert("Erro", "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
    }, [bootstrap])
  );

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR HISTÓRICO - CORRIGIDO
  // ═══════════════════════════════════════════════════════════════
  const carregarHistorico = async (funcionarioId) => {
    try {
      const params = { funcionario_id: funcionarioId || userData?.id };

      if (filtros.dataInicio) {
        params.dataInicio = filtros.dataInicio.toISOString().split("T")[0];
      }
      if (filtros.dataFim) {
        params.dataFim = filtros.dataFim.toISOString().split("T")[0];
      }

      console.log("🔍 Buscando histórico com params:", params);

      const response = await api.get("/ponto/usuario", { params });

      console.log("✅ Histórico recebido:", response.data.length, "registros");

      // Agrupar registros por data
      const registrosAgrupados = agruparPorData(response.data);
      setRegistros(registrosAgrupados);
    } catch (error) {
      console.error("❌ Erro ao carregar histórico:", error);

      if (error.response?.status === 401) {
        Alert.alert("Sessão Expirada", "Faça login novamente", [
          {
            text: "OK",
            onPress: () =>
              navigation.reset({ index: 0, routes: [{ name: "Logon" }] }),
          },
        ]);
      } else {
        Alert.alert(
          "Erro",
          error.response?.data?.error || "Erro ao carregar histórico"
        );
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // AGRUPAR REGISTROS POR DATA
  // ═══════════════════════════════════════════════════════════════
  const agruparPorData = (registros) => {
    const grupos = {};

    registros.forEach((registro) => {
      const data = registro.data;
      if (!grupos[data]) {
        grupos[data] = {
          data: data,
          registros: [],
        };
      }
      grupos[data].registros.push(registro);
    });

    // Ordenar por tipo de ponto
    Object.keys(grupos).forEach((data) => {
      grupos[data].registros.sort((a, b) => {
        const ordem = [
          "ENTRADA",
          "INTERVALO_ENTRADA",
          "INTERVALO_SAIDA",
          "SAIDA",
        ];
        return ordem.indexOf(a.tipo_ponto) - ordem.indexOf(b.tipo_ponto);
      });
    });

    // Converter para array e ordenar por data (mais recente primeiro)
    return Object.values(grupos).sort(
      (a, b) => new Date(b.data) - new Date(a.data)
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // FORMATAR - CORRIGIDO
  // ═══════════════════════════════════════════════════════════════
  const formatarData = (dataString) => {
    try {
      // Remove timestamp se existir
      const dataLimpa = dataString.split("T")[0];
      const [ano, mes, dia] = dataLimpa.split("-");

      // Cria data corretamente
      const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));

      // Valida
      if (isNaN(data.getTime())) {
        return "Data inválida";
      }
      return data.toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Data inválida";
    }
  };

  const formatarHora = (horaTimestamp) => {
    // horaTimestamp vem como "2026-01-02T20:28:43.000Z" ou "2026-01-02 17:28:43"
    let horaStr = horaTimestamp;

    if (typeof horaStr === "string") {
      // Se tiver "T", é ISO
      if (horaStr.includes("T")) {
        const data = new Date(horaStr);
        return data.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        });
      }
      // Se tiver espaço, extrair hora
      if (horaStr.includes(" ")) {
        horaStr = horaStr.split(" ")[1];
      }
      // Retornar apenas HH:MM
      return horaStr.substring(0, 5);
    }

    return "00:00";
  };

  const getTipoPontoLabel = (tipo) => {
    const labels = {
      ENTRADA: "Entrada",
      INTERVALO_ENTRADA: "Início do Intervalo",
      INTERVALO_SAIDA: "Fim do Intervalo",
      SAIDA: "Saída",
    };
    return labels[tipo] || tipo;
  };

  const getTipoPontoIcon = (tipo) => {
    const icons = {
      ENTRADA: "log-in",
      INTERVALO_ENTRADA: "coffee",
      INTERVALO_SAIDA: "refresh-cw",
      SAIDA: "log-out",
    };
    return icons[tipo] || "clock";
  };

  const getTipoPontoColor = (tipo) => {
    const colors = {
      ENTRADA: "#10B981",
      INTERVALO_ENTRADA: "#F59E0B",
      INTERVALO_SAIDA: "#8B5CF6",
      SAIDA: "#EF4444",
    };
    return colors[tipo] || "#64748b";
  };

  const calcularTotalHoras = (registrosDoDia) => {
    const entrada = registrosDoDia.find((r) => r.tipo_ponto === "ENTRADA");
    const saida = registrosDoDia.find((r) => r.tipo_ponto === "SAIDA");

    if (!entrada || !saida) return "-";

    // Extrair hora do timestamp
    const extrairHora = (timestamp) => {
      if (typeof timestamp === "string") {
        if (timestamp.includes("T")) {
          return new Date(timestamp);
        }
        if (timestamp.includes(" ")) {
          const [data, hora] = timestamp.split(" ");
          return new Date(`${data}T${hora}Z`);
        }
      }
      return new Date(timestamp);
    };

    const horaEntrada = extrairHora(entrada.hora);
    const horaSaida = extrairHora(saida.hora);

    const diffMs = horaSaida - horaEntrada;
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${String(diffHoras).padStart(2, "0")}:${String(diffMinutos).padStart(2, "0")}`;
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const onRefresh = useCallback(async () => {
    if (!userData?.id) return;
    setRefreshing(true);
    await carregarHistorico(userData.id);
    setRefreshing(false);
  }, [userData, filtros]);

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
    if (!userData?.id) return;

    try {
      setLoading(true);
      await carregarHistorico(userData.id);
      setMostrarFiltros(false);
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = async () => {
    if (!userData?.id) return;

    setFiltros({ dataInicio: null, dataFim: null });
    await carregarHistorico(userData.id);
  };

  const visualizarLocalizacao = (registro) => {
    if (!registro.latitude || !registro.longitude) {
      Alert.alert("Aviso", "Localização não disponível para este registro");
      return;
    }

    Alert.alert(
      "Localização",
      `Latitude: ${registro.latitude}\nLongitude: ${registro.longitude}`,
      [
        {
          text: "Abrir no Mapa",
          onPress: () => {
            const url = `https://www.google.com/maps?q=${registro.latitude},${registro.longitude}`;
            Linking.openURL(url);
          },
        },
        { text: "Fechar" },
      ]
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════════════════════
  if (loading && !userData) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2083e0" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER REGISTRO
  // ═══════════════════════════════════════════════════════════════
  const renderRegistro = (registro) => {
    return (
      <View key={registro.id} style={styles.registroItem}>
        <View
          style={[
            styles.registroIndicator,
            { backgroundColor: getTipoPontoColor(registro.tipo_ponto) },
          ]}
        />

        <View style={styles.registroContent}>
          <View style={styles.registroHeader}>
            <View style={styles.registroTipoContainer}>
              <Feather
                name={getTipoPontoIcon(registro.tipo_ponto)}
                size={16}
                color={getTipoPontoColor(registro.tipo_ponto)}
              />
              <Text
                style={[
                  styles.registroTipo,
                  { color: getTipoPontoColor(registro.tipo_ponto) },
                ]}
              >
                {getTipoPontoLabel(registro.tipo_ponto)}
              </Text>
            </View>

            <Text style={styles.registroHora}>
              {formatarHora(registro.hora)}
            </Text>
          </View>

          {(registro.latitude || registro.longitude) && (
            <TouchableOpacity
              style={styles.localizacaoContainer}
              onPress={() => visualizarLocalizacao(registro)}
            >
              <Feather name="map-pin" size={12} color="#94a3b8" />
              <Text style={styles.localizacaoTexto}>Ver localização</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER DIA
  // ═══════════════════════════════════════════════════════════════
  const renderDia = (grupo) => {
    const totalHoras = calcularTotalHoras(grupo.registros);

    return (
      <View key={grupo.data} style={styles.diaCard}>
        <View style={styles.diaHeader}>
          <View style={styles.diaInfo}>
            <Feather name="calendar" size={18} color="#2083e0" />
            <Text style={styles.diaData}>{formatarData(grupo.data)}</Text>
          </View>

          {totalHoras !== "-" && (
            <View style={styles.totalHorasBadge}>
              <Feather name="clock" size={14} color="#2083e0" />
              <Text style={styles.totalHorasTexto}>{totalHoras}h</Text>
            </View>
          )}
        </View>

        <View style={styles.registrosList}>
          {grupo.registros.map(renderRegistro)}
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

          <Text style={styles.headerTitle}>Meu Histórico</Text>

          <TouchableOpacity
            onPress={() => setMostrarFiltros(!mostrarFiltros)}
            style={styles.filterButton}
          >
            <Feather name="filter" size={24} color="#2083e0" />
          </TouchableOpacity>
        </View>

        {userData && <Text style={styles.headerSubtitle}>{userData.name}</Text>}

        <Text style={styles.headerInfo}>
          {registros.length} dia(s) com registro
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
                    ? filtros.dataInicio.toLocaleDateString("pt-BR")
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
                    ? filtros.dataFim.toLocaleDateString("pt-BR")
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
                : "Você ainda não possui registros de ponto"}
            </Text>
          </View>
        ) : (
          registros.map(renderDia)
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
