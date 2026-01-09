// src/pages/MarcarPonto/index.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";

import api from "../../services/api";
import { styles } from "./styles";

export default function MarcadorPontoUsuario() {
  const navigation = useNavigation();

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS LOCAIS
  // ═══════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(false);
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [tipoPonto, setTipoPonto] = useState("ENTRADA");
  const [localizacao, setLocalizacao] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [userData, setUserData] = useState(null);
  const [setorId, setSetorId] = useState(null);

  // ═══════════════════════════════════════════════════════════════
  // ✅ BOOTSTRAP - SIMPLIFICADO COMO O CHATLISTA
  // ═══════════════════════════════════════════════════════════════
  const bootstrap = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const ongName = await AsyncStorage.getItem("@Auth:ongName");
      const userSetor = await AsyncStorage.getItem("@Auth:userSetor");
      const authToken = await AsyncStorage.getItem("@Auth:token");

      console.log("📋 Dados de autenticação (MarcarPonto):", {
        ongId,
        ongName,
        userSetor,
        hasToken: !!authToken,
      });

      if (!ongId || !authToken) {
        console.log("❌ Sessão expirada");
        Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
        navigation.reset({ index: 0, routes: [{ name: "Logon" }] });
        return;
      }

      // ✅ Se não tiver setor no AsyncStorage, buscar da API (igual ao ChatLista)
      let setorFinal = userSetor;

      if (!userSetor) {
        try {
          console.log("🔍 Buscando setor do usuário na API...");
          const response = await api.get(`ongs/${ongId}`);
          setorFinal = String(response.data.setor_id);

          // Salvar para uso futuro
          await AsyncStorage.setItem("@Auth:userSetor", setorFinal);
          console.log("✅ Setor buscado da API:", setorFinal);
        } catch (error) {
          console.error("❌ Erro ao buscar setor:", error);
          Alert.alert(
            "Erro",
            "Não foi possível identificar o setor do usuário"
          );
          return;
        }
      }

      setUserData({
        id: ongId,
        name: ongName || "Usuário",
        ongId: ongId,
      });

      setSetorId(setorFinal ? Number(setorFinal) : null);

      await solicitarPermissaoLocalizacao();
    } catch (error) {
      console.error("Erro no bootstrap:", error);
      Alert.alert("Erro", "Erro ao carregar dados do usuário");
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
    }, [bootstrap])
  );

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR HORA A CADA SEGUNDO
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const intervalo = setInterval(() => {
      setHoraAtual(new Date());
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // LOCALIZAÇÃO
  // ═══════════════════════════════════════════════════════════════
  const solicitarPermissaoLocalizacao = async () => {
    try {
      setLoadingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão Negada",
          "Permissão de localização é necessária para marcar o ponto"
        );
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocalizacao({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    } catch (error) {
      console.error("Erro localização:", error);
      Alert.alert("Erro", "Não foi possível obter a localização");
    } finally {
      setLoadingLocation(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FORMATAR HORA
  // ═══════════════════════════════════════════════════════════════
  const formatarHora = (data) => {
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  };

  const formatarData = (data) => {
    return data.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // ✅ MARCAR PONTO - CORRIGIDO
  // ═══════════════════════════════════════════════════════════════
  const handleMarcarPonto = async () => {
    try {
      if (!localizacao) {
        Alert.alert("Erro", "Localização não disponível");
        return;
      }

      if (!setorId) {
        Alert.alert("Erro", "Setor não identificado para o usuário");
        return;
      }

      const token = await AsyncStorage.getItem("@Auth:token");
      if (!token) {
        Alert.alert("Erro", "Usuário não autenticado");
        navigation.reset({ index: 0, routes: [{ name: "Logon" }] });
        return;
      }

      Alert.alert(
        "Confirmar Marcação",
        `Deseja registrar o ponto de ${getTipoPontoLabel(tipoPonto)}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: async () => {
              try {
                setLoading(true);

                console.log("🚀 EXPO - Preparando registro");

                // ✅ SOLUÇÃO EXPO - Usar toISOString (SEMPRE funciona)
                const agora = new Date();
                const iso = agora.toISOString(); // "2026-01-02T19:46:37.813Z"

                console.log("📅 ISO String:", iso);

                // Extrair data: "2026-01-02"
                const [dataParte] = iso.split("T");

                // Extrair hora UTC: "19:46:37"
                const horaParte = iso.split("T")[1].split(".")[0];

                // Converter para Brasília (UTC-3)
                const [h, m, s] = horaParte.split(":").map(Number);
                let horasBR = h - 3;
                let diaBR = parseInt(dataParte.split("-")[2]);

                // Se passou da meia-noite, ajustar dia
                if (horasBR < 0) {
                  horasBR += 24;
                  diaBR -= 1;
                }

                // Reconstruir data
                const ano = dataParte.split("-")[0];
                const mes = dataParte.split("-")[1];
                const dataFinal = `${ano}-${mes}-${String(diaBR).padStart(2, "0")}`;
                const horaFinal = `${String(horasBR).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

                console.log("✅ Formatado:", { dataFinal, horaFinal });

                const registro = {
                  funcionario_id: userData.id,
                  nome_funcionario: userData.name,
                  setor_id: setorId,
                  data: dataFinal,
                  hora: horaFinal,
                  tipo_ponto: tipoPonto,
                  latitude: localizacao.latitude,
                  longitude: localizacao.longitude,
                };

                console.log("📤 Enviando:", registro);

                const response = await api.post("/ponto/registrar", registro);

                console.log("✅ Sucesso:", response.data);

                Alert.alert(
                  "Sucesso!",
                  `Ponto de ${getTipoPontoLabel(tipoPonto)} registrado!`,
                  [{ text: "OK", onPress: () => avancarProximoTipoPonto() }]
                );
              } catch (error) {
                console.error(
                  "❌ Erro:",
                  error.response?.data || error.message
                );

                if (error.response?.status === 401) {
                  Alert.alert("Sessão Expirada", "Faça login novamente", [
                    {
                      text: "OK",
                      onPress: async () => {
                        await AsyncStorage.multiRemove([
                          "@Auth:ongId",
                          "@Auth:ongName",
                          "@Auth:ongType",
                          "@Auth:userSetor",
                          "@Auth:token",
                        ]);
                        navigation.reset({
                          index: 0,
                          routes: [{ name: "Logon" }],
                        });
                      },
                    },
                  ]);
                } else {
                  Alert.alert(
                    "Erro",
                    error.response?.data?.error || "Erro ao registrar ponto"
                  );
                }
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Erro geral:", error);
      Alert.alert("Erro", "Erro ao processar marcação de ponto");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════
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

  const avancarProximoTipoPonto = () => {
    const sequencia = [
      "ENTRADA",
      "INTERVALO_ENTRADA",
      "INTERVALO_SAIDA",
      "SAIDA",
    ];
    const indiceAtual = sequencia.indexOf(tipoPonto);
    if (indiceAtual < sequencia.length - 1) {
      setTipoPonto(sequencia[indiceAtual + 1]);
    }
  };

  const handleVisualizarHistorico = () => {
    navigation.navigate("HistoricoPontoUsuario");
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

          <Text style={styles.headerTitle}>Marcar Ponto</Text>

          <TouchableOpacity
            onPress={handleVisualizarHistorico}
            style={styles.historyButton}
          >
            <Feather name="clock" size={24} color="#2083e0" />
          </TouchableOpacity>
        </View>

        {userData && (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData.name}</Text>
            {setorId && <Text style={styles.userSetor}>Setor: {setorId}</Text>}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* RELÓGIO */}
        <View style={styles.clockContainer}>
          <View style={styles.dateContainer}>
            <Feather name="calendar" size={20} color="#64748b" />
            <Text style={styles.dateText}>{formatarData(horaAtual)}</Text>
          </View>

          <Text style={styles.timeText}>{formatarHora(horaAtual)}</Text>

          <View style={styles.timezoneContainer}>
            <Feather name="map-pin" size={14} color="#64748b" />
            <Text style={styles.timezoneText}>Horário de Brasília</Text>
          </View>
        </View>

        {/* SELETOR DE TIPO DE PONTO */}
        <View style={styles.tipoPontoContainer}>
          <Text style={styles.sectionLabel}>Tipo de Marcação</Text>

          <View style={styles.pickerContainer}>
            <Feather
              name={getTipoPontoIcon(tipoPonto)}
              size={20}
              color={getTipoPontoColor(tipoPonto)}
            />
            <Picker
              selectedValue={tipoPonto}
              onValueChange={(value) => setTipoPonto(value)}
              style={styles.picker}
              dropdownIconColor={getTipoPontoColor(tipoPonto)}
            >
              <Picker.Item label="Entrada" value="ENTRADA" />
              <Picker.Item
                label="Início do Intervalo"
                value="INTERVALO_ENTRADA"
              />
              <Picker.Item label="Fim do Intervalo" value="INTERVALO_SAIDA" />
              <Picker.Item label="Saída" value="SAIDA" />
            </Picker>
          </View>

          <View
            style={[
              styles.tipoPontoBadge,
              { backgroundColor: getTipoPontoColor(tipoPonto) + "20" },
            ]}
          >
            <Text
              style={[
                styles.tipoPontoBadgeText,
                { color: getTipoPontoColor(tipoPonto) },
              ]}
            >
              {getTipoPontoLabel(tipoPonto)}
            </Text>
          </View>
        </View>

        {/* MAPA DE LOCALIZAÇÃO */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionLabel}>Sua Localização</Text>

          <View style={styles.mapContainer}>
            {loadingLocation ? (
              <View style={styles.loadingMap}>
                <ActivityIndicator size="large" color="#2083e0" />
                <Text style={styles.loadingMapText}>
                  Obtendo localização...
                </Text>
              </View>
            ) : localizacao ? (
              <>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  region={localizacao}
                  showsUserLocation
                  showsMyLocationButton
                  loadingEnabled
                >
                  <Marker coordinate={localizacao} title="Sua Localização" />
                </MapView>

                <View style={styles.coordsContainer}>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Latitude:</Text>
                    <Text style={styles.coordValue}>
                      {localizacao.latitude.toFixed(6)}
                    </Text>
                  </View>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Longitude:</Text>
                    <Text style={styles.coordValue}>
                      {localizacao.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.errorMap}>
                <Feather name="map-pin" size={48} color="#cbd5e1" />
                <Text style={styles.errorMapText}>
                  Localização não disponível
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={solicitarPermissaoLocalizacao}
                >
                  <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* BOTÃO DE REGISTRAR */}
        <TouchableOpacity
          style={[
            styles.registerButton,
            { backgroundColor: getTipoPontoColor(tipoPonto) },
            (!localizacao || loading) && styles.registerButtonDisabled,
          ]}
          onPress={handleMarcarPonto}
          disabled={!localizacao || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check-circle" size={20} color="#fff" />
              <Text style={styles.registerButtonText}>Registrar Ponto</Text>
            </>
          )}
        </TouchableOpacity>

        {/* INFORMAÇÕES */}
        <View style={styles.infoContainer}>
          <Feather name="info" size={16} color="#64748b" />
          <Text style={styles.infoText}>
            Certifique-se de estar no local correto antes de registrar o ponto.
            A localização será salva automaticamente.
          </Text>
        </View>

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}
