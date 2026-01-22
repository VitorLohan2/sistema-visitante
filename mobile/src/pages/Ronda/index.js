/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Ronda
 * Módulo de ronda para vigilantes com mapa em tempo real
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

// Componentes
import { Button, Loading, Card } from "../../components";

// Hooks
import { useRonda } from "../../hooks";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function Ronda() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  // Hook da Ronda
  const {
    rondaAtiva,
    carregando,
    trajeto,
    checkpoints,
    tempoDecorrido,
    distanciaTotal,
    iniciarRonda,
    finalizarRonda,
    registrarCheckpoint,
    erro,
  } = useRonda();

  // Estados locais
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [permissaoLocalizacao, setPermissaoLocalizacao] = useState(null);
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(true);
  const [mapaCarregado, setMapaCarregado] = useState(false);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(true);

  // ═══════════════════════════════════════════════════════════════════════════
  // OBTER PERMISSÃO DE LOCALIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    (async () => {
      try {
        setCarregandoLocalizacao(true);

        // Solicita permissão de localização em primeiro plano
        const { status: foregroundStatus } =
          await Location.requestForegroundPermissionsAsync();

        if (foregroundStatus !== "granted") {
          setPermissaoLocalizacao(false);
          Alert.alert(
            "Permissão Necessária",
            "Permita o acesso à localização para usar a funcionalidade de ronda.",
          );
          return;
        }

        // Tenta permissão em segundo plano (para tracking contínuo)
        if (Platform.OS === "android") {
          const { status: backgroundStatus } =
            await Location.requestBackgroundPermissionsAsync();
          if (backgroundStatus !== "granted") {
            console.log("Permissão de background não concedida");
          }
        }

        setPermissaoLocalizacao(true);

        // Obtém localização atual
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLocalizacaoAtual({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (erro) {
        console.error("Erro ao obter localização:", erro);
        setPermissaoLocalizacao(false);
      } finally {
        setCarregandoLocalizacao(false);
      }
    })();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ATUALIZAR LOCALIZAÇÃO DURANTE RONDA
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    let subscription = null;

    if (rondaAtiva && permissaoLocalizacao) {
      (async () => {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // Atualiza a cada 5 segundos
            distanceInterval: 10, // Ou a cada 10 metros
          },
          (location) => {
            const novaLocalizacao = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            setLocalizacaoAtual(novaLocalizacao);

            // Centraliza no mapa
            mapRef.current?.animateToRegion({
              ...novaLocalizacao,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            });
          },
        );
      })();
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [rondaAtiva, permissaoLocalizacao]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleIniciarRonda = async () => {
    if (!localizacaoAtual) {
      Alert.alert("Erro", "Não foi possível obter sua localização.");
      return;
    }

    Alert.alert(
      "Iniciar Ronda",
      "Deseja iniciar uma nova ronda? Sua localização será rastreada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Iniciar",
          onPress: async () => {
            try {
              await iniciarRonda(localizacaoAtual);
            } catch (erro) {
              Alert.alert("Erro", "Não foi possível iniciar a ronda.");
            }
          },
        },
      ],
    );
  };

  const handleFinalizarRonda = async () => {
    Alert.alert(
      "Finalizar Ronda",
      "Tem certeza que deseja finalizar a ronda?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Finalizar",
          style: "destructive",
          onPress: async () => {
            try {
              await finalizarRonda();
              Alert.alert("Sucesso", "Ronda finalizada com sucesso!");
            } catch (erro) {
              Alert.alert("Erro", "Não foi possível finalizar a ronda.");
            }
          },
        },
      ],
    );
  };

  const handleRegistrarCheckpoint = async () => {
    if (!localizacaoAtual) {
      Alert.alert("Erro", "Não foi possível obter sua localização.");
      return;
    }

    Alert.prompt(
      "Registrar Checkpoint",
      "Adicione uma observação (opcional):",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Registrar",
          onPress: async (observacao) => {
            try {
              await registrarCheckpoint(localizacaoAtual, observacao || "");
              Alert.alert("Sucesso", "Checkpoint registrado!");
            } catch (erro) {
              Alert.alert("Erro", "Não foi possível registrar o checkpoint.");
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const handleCentralizarMapa = () => {
    if (localizacaoAtual && mapRef.current) {
      mapRef.current.animateToRegion({
        ...localizacaoAtual,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATADORES
  // ═══════════════════════════════════════════════════════════════════════════

  const formatarTempo = (segundos) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;

    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, "0")}m`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatarDistancia = (metros) => {
    if (metros < 1000) {
      return `${Math.round(metros)} m`;
    }
    return `${(metros / 1000).toFixed(2)} km`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  if (carregandoLocalizacao) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

        {/* Header Padronizado */}
        <View
          style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
        >
          <TouchableOpacity
            style={styles.headerVoltar}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={cores.branco} />
          </TouchableOpacity>

          <Text style={styles.headerTitulo}>Ronda Vigilante</Text>

          <View style={styles.headerEspaco} />
        </View>

        <View style={styles.loadingContainer}>
          <Loading mensagem="Obtendo localização..." />
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - SEM PERMISSÃO
  // ═══════════════════════════════════════════════════════════════════════════

  if (permissaoLocalizacao === false) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

        {/* Header Padronizado */}
        <View
          style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
        >
          <TouchableOpacity
            style={styles.headerVoltar}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={cores.branco} />
          </TouchableOpacity>

          <Text style={styles.headerTitulo}>Ronda Vigilante</Text>

          <View style={styles.headerEspaco} />
        </View>

        <View style={styles.semPermissao}>
          <Feather name="map-pin" size={64} color={cores.textoSecundario} />
          <Text style={styles.semPermissaoTitulo}>Localização Necessária</Text>
          <Text style={styles.semPermissaoDescricao}>
            Para usar a funcionalidade de ronda, permita o acesso à sua
            localização nas configurações do dispositivo.
          </Text>
          <Button
            titulo="Voltar"
            onPress={() => navigation.goBack()}
            variante="outline"
          />
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

      {/* Header Padronizado */}
      <View
        style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
      >
        <TouchableOpacity
          style={styles.headerVoltar}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={cores.branco} />
        </TouchableOpacity>

        <Text style={styles.headerTitulo}>Ronda Vigilante</Text>

        <View style={styles.headerEspaco} />
      </View>

      {/* Mapa */}
      <View style={styles.mapaContainer}>
        {localizacaoAtual && (
          <MapView
            ref={mapRef}
            style={styles.mapa}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              ...localizacaoAtual,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            onMapReady={() => setMapaCarregado(true)}
          >
            {/* Trajeto da Ronda */}
            {trajeto.length > 1 && (
              <Polyline
                coordinates={trajeto}
                strokeColor={cores.destaque}
                strokeWidth={4}
                lineDashPattern={[0]}
              />
            )}

            {/* Checkpoints */}
            {checkpoints.map((checkpoint, index) => (
              <Marker
                key={checkpoint.id || index}
                coordinate={{
                  latitude: checkpoint.latitude,
                  longitude: checkpoint.longitude,
                }}
                title={`Checkpoint ${index + 1}`}
                description={checkpoint.observacao || "Sem observação"}
              >
                <View style={styles.checkpointMarker}>
                  <Feather name="flag" size={16} color={cores.branco} />
                </View>
              </Marker>
            ))}

            {/* Marcador de Início */}
            {trajeto.length > 0 && (
              <Marker
                coordinate={trajeto[0]}
                title="Início da Ronda"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.inicioMarker}>
                  <Feather name="play" size={14} color={cores.branco} />
                </View>
              </Marker>
            )}
          </MapView>
        )}

        {/* Botões do Mapa */}
        <View style={styles.mapaControles}>
          <TouchableOpacity
            style={styles.mapaControle}
            onPress={handleCentralizarMapa}
          >
            <Feather name="crosshair" size={24} color={cores.texto} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapaControle}
            onPress={() => setMostrarDetalhes(!mostrarDetalhes)}
          >
            <Feather
              name={mostrarDetalhes ? "chevron-down" : "chevron-up"}
              size={24}
              color={cores.texto}
            />
          </TouchableOpacity>
        </View>

        {/* Status da Ronda */}
        {rondaAtiva && (
          <View style={styles.statusBadge}>
            <View style={styles.statusIndicador} />
            <Text style={styles.statusTexto}>Ronda em andamento</Text>
          </View>
        )}
      </View>

      {/* Painel de Controle */}
      {mostrarDetalhes && (
        <View style={styles.painelControle}>
          {/* Métricas */}
          <View style={styles.metricas}>
            <View style={styles.metrica}>
              <Feather name="clock" size={20} color={cores.destaque} />
              <Text style={styles.metricaValor}>
                {rondaAtiva ? formatarTempo(tempoDecorrido) : "--:--"}
              </Text>
              <Text style={styles.metricaLabel}>Tempo</Text>
            </View>

            <View style={styles.metricaDivisor} />

            <View style={styles.metrica}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={20}
                color={cores.sucesso}
              />
              <Text style={styles.metricaValor}>
                {rondaAtiva ? formatarDistancia(distanciaTotal) : "-- m"}
              </Text>
              <Text style={styles.metricaLabel}>Distância</Text>
            </View>

            <View style={styles.metricaDivisor} />

            <View style={styles.metrica}>
              <Feather name="flag" size={20} color={cores.info} />
              <Text style={styles.metricaValor}>{checkpoints.length}</Text>
              <Text style={styles.metricaLabel}>Checkpoints</Text>
            </View>
          </View>

          {/* Botões de Ação */}
          <View style={styles.acoes}>
            {!rondaAtiva ? (
              <Button
                titulo="Iniciar Ronda"
                onPress={handleIniciarRonda}
                carregando={carregando}
                variante="destaque"
                icone="play"
                tamanho="grande"
              />
            ) : (
              <>
                <Button
                  titulo="Registrar Checkpoint"
                  onPress={handleRegistrarCheckpoint}
                  carregando={carregando}
                  variante="primario"
                  icone="flag"
                  estilo={{ marginBottom: espacamento.sm }}
                />
                <Button
                  titulo="Finalizar Ronda"
                  onPress={handleFinalizarRonda}
                  variante="erro"
                  icone="stop-circle"
                />
              </>
            )}
          </View>
        </View>
      )}

      {/* Mensagem de Erro */}
      {erro && (
        <View style={styles.erroContainer}>
          <Feather name="alert-circle" size={16} color={cores.erro} />
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.primaria,
  },

  // Header Padronizado
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espacamento.md,
    paddingBottom: espacamento.md,
  },

  headerVoltar: {
    padding: espacamento.xs,
  },

  headerTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },

  headerEspaco: {
    width: 40,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // Sem Permissão
  semPermissao: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: espacamento.xl,
  },

  semPermissaoTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginTop: espacamento.md,
    marginBottom: espacamento.sm,
  },

  semPermissaoDescricao: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    textAlign: "center",
    marginBottom: espacamento.lg,
  },

  // Mapa
  mapaContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },

  mapa: {
    flex: 1,
  },

  mapaControles: {
    position: "absolute",
    top: espacamento.md,
    right: espacamento.md,
    gap: espacamento.sm,
  },

  mapaControle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cores.fundoCard,
    alignItems: "center",
    justifyContent: "center",
    ...sombras.media,
  },

  statusBadge: {
    position: "absolute",
    top: espacamento.md,
    left: espacamento.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoCard,
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    borderRadius: bordas.raioMedio,
    ...sombras.media,
  },

  statusIndicador: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: cores.sucesso,
    marginRight: espacamento.sm,
  },

  statusTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
  },

  // Marcadores
  checkpointMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.info,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.branco,
  },

  inicioMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.sucesso,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.branco,
  },

  // Painel de Controle
  painelControle: {
    backgroundColor: cores.fundoCard,
    paddingHorizontal: espacamento.lg,
    paddingTop: espacamento.lg,
    paddingBottom: espacamento.xl,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    ...sombras.grande,
  },

  // Métricas
  metricas: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: espacamento.lg,
  },

  metrica: {
    alignItems: "center",
    flex: 1,
  },

  metricaValor: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginTop: espacamento.xs,
  },

  metricaLabel: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginTop: 2,
  },

  metricaDivisor: {
    width: 1,
    height: "100%",
    backgroundColor: cores.borda,
  },

  // Ações
  acoes: {
    gap: espacamento.sm,
  },

  // Erro
  erroContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${cores.erro}15`,
    padding: espacamento.sm,
    gap: espacamento.xs,
  },

  erroTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.erro,
  },
});
