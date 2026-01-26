/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: MapaCheckpoints
 * Mapa Google Maps para visualização de checkpoints na ronda
 *
 * REGRAS:
 * - Exibe markers fixos para cada ponto de controle
 * - Marker do vigilante mostra posição atual
 * - NÃO desenha Polyline contínua durante a ronda
 * - Círculos indicam raio de validação de cada checkpoint
 * - Checkpoints visitados têm visual diferenciado
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import MapView, {
  Marker,
  Circle,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Cores do tema
const CORES = {
  primaria: "#1565C0",
  sucesso: "#4CAF50",
  alerta: "#FF9800",
  erro: "#F44336",
  branco: "#FFFFFF",
  texto: "#333333",
  cinzaClaro: "#E0E0E0",
  checkpointPendente: "#1565C0",
  checkpointVisitado: "#4CAF50",
  checkpointProximo: "#FF9800",
  raioCheckpoint: "rgba(21, 101, 192, 0.15)",
  raioCheckpointVisitado: "rgba(76, 175, 80, 0.15)",
  raioCheckpointProximo: "rgba(255, 152, 0, 0.25)",
  linhaHistorico: "#4CAF50",
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Marker customizado do vigilante
 */
const MarkerVigilante = memo(({ precisao }) => (
  <View style={styles.markerVigilante}>
    <View style={styles.markerVigilanteInner}>
      <Feather name="user" size={16} color={CORES.branco} />
    </View>
    {precisao && (
      <View
        style={[
          styles.precisaoIndicador,
          { backgroundColor: precisao <= 15 ? CORES.sucesso : CORES.alerta },
        ]}
      >
        <Text style={styles.precisaoTexto}>±{Math.round(precisao)}m</Text>
      </View>
    )}
  </View>
));

/**
 * Marker customizado de checkpoint
 */
const MarkerCheckpoint = memo(({ numero, visitado, proximo, nome }) => (
  <View style={styles.markerCheckpointContainer}>
    <View
      style={[
        styles.markerCheckpoint,
        visitado && styles.markerCheckpointVisitado,
        proximo && !visitado && styles.markerCheckpointProximo,
      ]}
    >
      {visitado ? (
        <Feather name="check" size={14} color={CORES.branco} />
      ) : (
        <Text style={styles.markerCheckpointNumero}>{numero}</Text>
      )}
    </View>
    {nome && (
      <View style={styles.markerCheckpointLabel}>
        <Text style={styles.markerCheckpointLabelText} numberOfLines={1}>
          {nome}
        </Text>
      </View>
    )}
  </View>
));

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} CheckpointMapa
 * @property {number} id - ID do checkpoint
 * @property {number} latitude - Latitude
 * @property {number} longitude - Longitude
 * @property {number} raio - Raio de validação em metros
 * @property {string} [nome] - Nome do checkpoint
 * @property {number} [ordem] - Ordem sugerida
 */

/**
 * @typedef {Object} MapaCheckpointsProps
 * @property {Object} posicaoVigilante - Posição atual do vigilante
 * @property {number} [precisaoGPS] - Precisão do GPS em metros
 * @property {Array<CheckpointMapa>} checkpoints - Lista de checkpoints
 * @property {Set<number>} checkpointsVisitados - IDs dos checkpoints visitados
 * @property {number} [checkpointProximoId] - ID do checkpoint mais próximo
 * @property {Array} [historicoValidacoes] - Histórico para desenhar linhas (opcional)
 * @property {boolean} [mostrarLinhasHistorico=false] - Se deve conectar checkpoints visitados
 * @property {Function} [onCheckpointPress] - Callback ao pressionar checkpoint
 * @property {Object} [style] - Estilos customizados
 */

function MapaCheckpoints({
  posicaoVigilante,
  precisaoGPS,
  checkpoints = [],
  checkpointsVisitados = new Set(),
  checkpointProximoId,
  historicoValidacoes = [],
  mostrarLinhasHistorico = false,
  onCheckpointPress,
  style,
}) {
  const mapRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // REGIÃO INICIAL
  // ─────────────────────────────────────────────────────────────────────────────

  const regiaoInicial = useMemo(() => {
    if (posicaoVigilante?.latitude && posicaoVigilante?.longitude) {
      return {
        latitude: posicaoVigilante.latitude,
        longitude: posicaoVigilante.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
    }

    // Fallback: centro dos checkpoints
    if (checkpoints.length > 0) {
      const lats = checkpoints.map((c) => c.latitude);
      const lons = checkpoints.map((c) => c.longitude);
      return {
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lons) + Math.max(...lons)) / 2,
        latitudeDelta: LATITUDE_DELTA * 2,
        longitudeDelta: LONGITUDE_DELTA * 2,
      };
    }

    return null;
  }, [posicaoVigilante, checkpoints]);

  // ─────────────────────────────────────────────────────────────────────────────
  // LINHAS DO HISTÓRICO (opcional - conecta checkpoints visitados)
  // ─────────────────────────────────────────────────────────────────────────────

  const coordenadasHistorico = useMemo(() => {
    if (!mostrarLinhasHistorico || historicoValidacoes.length < 2) {
      return [];
    }

    return historicoValidacoes
      .filter((v) => v.latitude && v.longitude)
      .map((v) => ({
        latitude: parseFloat(v.latitude),
        longitude: parseFloat(v.longitude),
      }));
  }, [mostrarLinhasHistorico, historicoValidacoes]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCentralizar = useCallback(() => {
    if (posicaoVigilante && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: posicaoVigilante.latitude,
          longitude: posicaoVigilante.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        },
        300,
      );
    }
  }, [posicaoVigilante]);

  const handleCheckpointPress = useCallback(
    (checkpoint) => {
      if (onCheckpointPress) {
        onCheckpointPress(checkpoint);
      }
    },
    [onCheckpointPress],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER - SEM REGIÃO
  // ─────────────────────────────────────────────────────────────────────────────

  if (!regiaoInicial) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <MaterialCommunityIcons
          name="map-marker-question"
          size={48}
          color={CORES.cinzaClaro}
        />
        <Text style={styles.loadingText}>Aguardando localização...</Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER - PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.mapa}
        provider={PROVIDER_GOOGLE}
        initialRegion={regiaoInicial}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={false}
        rotateEnabled={true}
        pitchEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor={CORES.primaria}
      >
        {/* CÍRCULOS DE RAIO DOS CHECKPOINTS */}
        {checkpoints.map((checkpoint) => {
          const visitado = checkpointsVisitados.has(checkpoint.id);
          const proximo = checkpoint.id === checkpointProximoId;

          return (
            <Circle
              key={`circle-${checkpoint.id}`}
              center={{
                latitude: checkpoint.latitude,
                longitude: checkpoint.longitude,
              }}
              radius={checkpoint.raio || 30}
              fillColor={
                visitado
                  ? CORES.raioCheckpointVisitado
                  : proximo
                    ? CORES.raioCheckpointProximo
                    : CORES.raioCheckpoint
              }
              strokeColor={
                visitado
                  ? CORES.checkpointVisitado
                  : proximo
                    ? CORES.checkpointProximo
                    : CORES.checkpointPendente
              }
              strokeWidth={2}
            />
          );
        })}

        {/* LINHAS CONECTANDO CHECKPOINTS VISITADOS (opcional) */}
        {coordenadasHistorico.length > 1 && (
          <Polyline
            coordinates={coordenadasHistorico}
            strokeColor={CORES.linhaHistorico}
            strokeWidth={3}
            lineCap="round"
            lineJoin="round"
            lineDashPattern={[10, 5]}
          />
        )}

        {/* MARKERS DOS CHECKPOINTS */}
        {checkpoints.map((checkpoint, index) => {
          const visitado = checkpointsVisitados.has(checkpoint.id);
          const proximo = checkpoint.id === checkpointProximoId;

          return (
            <Marker
              key={`marker-${checkpoint.id}`}
              coordinate={{
                latitude: checkpoint.latitude,
                longitude: checkpoint.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleCheckpointPress(checkpoint)}
              tracksViewChanges={false}
            >
              <MarkerCheckpoint
                numero={checkpoint.ordem || index + 1}
                visitado={visitado}
                proximo={proximo}
                nome={checkpoint.nome}
              />
            </Marker>
          );
        })}

        {/* MARKER DO VIGILANTE */}
        {posicaoVigilante?.latitude && posicaoVigilante?.longitude && (
          <Marker
            coordinate={{
              latitude: posicaoVigilante.latitude,
              longitude: posicaoVigilante.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <MarkerVigilante precisao={precisaoGPS} />
          </Marker>
        )}
      </MapView>

      {/* BOTÃO CENTRALIZAR */}
      <TouchableOpacity
        style={styles.botaoCentralizar}
        onPress={handleCentralizar}
        activeOpacity={0.7}
      >
        <Feather name="crosshair" size={20} color={CORES.texto} />
      </TouchableOpacity>

      {/* INDICADOR DE GPS */}
      <View style={styles.indicadorGPS}>
        <View
          style={[
            styles.gpsIcone,
            {
              backgroundColor:
                precisaoGPS && precisaoGPS <= 15
                  ? `${CORES.sucesso}20`
                  : `${CORES.alerta}20`,
            },
          ]}
        >
          <Feather
            name="radio"
            size={12}
            color={
              precisaoGPS && precisaoGPS <= 15 ? CORES.sucesso : CORES.alerta
            }
          />
        </View>
        <Text style={styles.gpsTexto}>
          {precisaoGPS ? `±${Math.round(precisaoGPS)}m` : "--"}
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  mapa: {
    flex: 1,
  },

  // Marker do Vigilante
  markerVigilante: {
    alignItems: "center",
  },
  markerVigilanteInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CORES.primaria,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: CORES.branco,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  precisaoIndicador: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  precisaoTexto: {
    fontSize: 10,
    color: CORES.branco,
    fontWeight: "600",
  },

  // Marker de Checkpoint
  markerCheckpointContainer: {
    alignItems: "center",
  },
  markerCheckpoint: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CORES.checkpointPendente,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: CORES.branco,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  markerCheckpointVisitado: {
    backgroundColor: CORES.checkpointVisitado,
  },
  markerCheckpointProximo: {
    backgroundColor: CORES.checkpointProximo,
    borderWidth: 3,
  },
  markerCheckpointNumero: {
    fontSize: 12,
    fontWeight: "bold",
    color: CORES.branco,
  },
  markerCheckpointLabel: {
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 80,
  },
  markerCheckpointLabelText: {
    fontSize: 10,
    color: CORES.texto,
    textAlign: "center",
  },

  // Botão Centralizar
  botaoCentralizar: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CORES.branco,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },

  // Indicador GPS
  indicadorGPS: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CORES.branco,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  gpsIcone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  gpsTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: CORES.texto,
  },
});

export default memo(MapaCheckpoints);
