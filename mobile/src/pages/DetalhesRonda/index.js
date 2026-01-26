/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Detalhes da Ronda
 * Exibe detalhes completos de uma ronda finalizada
 *
 * LAYOUT PADRONIZADO igual ao sistema de visitantes:
 * - Header com fundo primário e cantos arredondados no conteúdo
 * - Cards com sombras e bordas arredondadas
 * - Seções bem organizadas
 * - Cores e tipografia consistentes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

// Serviços
import rondaService from "../../services/rondaService";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

const { width } = Dimensions.get("window");
const ASPECT_RATIO = width / 300;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function DetalhesRonda() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const { rondaId } = route.params || {};

  const [ronda, setRonda] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR DADOS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const carregarDetalhes = async () => {
      if (!rondaId) {
        setErro("ID da ronda não informado");
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        setErro(null);
        const response = await rondaService.buscarRonda(rondaId);
        setRonda(response.ronda || response);
      } catch (err) {
        console.error("Erro ao carregar detalhes:", err);
        setErro("Não foi possível carregar os detalhes da ronda.");
      } finally {
        setCarregando(false);
      }
    };

    carregarDetalhes();
  }, [rondaId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AJUSTAR MAPA
  // ═══════════════════════════════════════════════════════════════════════════

  const ajustarMapaAoTrajeto = () => {
    if (!mapRef.current || !ronda?.trajeto?.length) return;

    const coordenadas = ronda.trajeto.map((p) => ({
      latitude: parseFloat(p.latitude),
      longitude: parseFloat(p.longitude),
    }));

    mapRef.current.fitToCoordinates(coordenadas, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATADORES
  // ═══════════════════════════════════════════════════════════════════════════

  const formatarData = (dataString) => {
    if (!dataString) return "-";
    const data = new Date(dataString);
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatarHora = (dataString) => {
    if (!dataString) return "-";
    const data = new Date(dataString);
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatarDuracao = (segundos) => {
    if (!segundos) return "-";
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    if (horas > 0) return `${horas}h ${minutos}min ${segs}s`;
    if (minutos > 0) return `${minutos}min ${segs}s`;
    return `${segs}s`;
  };

  const formatarDistancia = (metros) => {
    if (!metros) return "0 m";
    if (metros >= 1000) return `${(metros / 1000).toFixed(2)} km`;
    return `${Math.round(metros)} m`;
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "finalizada":
        return {
          label: "Finalizada",
          cor: cores.sucesso,
          icone: "check-circle",
          bgCor: `${cores.sucesso}15`,
        };
      case "em_andamento":
        return {
          label: "Em Andamento",
          cor: cores.info,
          icone: "navigation",
          bgCor: `${cores.info}15`,
        };
      case "cancelada":
        return {
          label: "Cancelada",
          cor: cores.erro,
          icone: "x-circle",
          bgCor: `${cores.erro}15`,
        };
      default:
        return {
          label: status || "Desconhecido",
          cor: cores.textoSecundario,
          icone: "help-circle",
          bgCor: `${cores.textoSecundario}15`,
        };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  if (carregando) {
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
          <Text style={styles.headerTitulo}>Detalhes da Ronda</Text>
          <View style={styles.headerEspaco} />
        </View>

        {/* Conteúdo Loading */}
        <View style={styles.conteudo}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={cores.primaria} />
            <Text style={styles.loadingText}>Carregando detalhes...</Text>
          </View>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - ERRO
  // ═══════════════════════════════════════════════════════════════════════════

  if (erro || !ronda) {
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
          <Text style={styles.headerTitulo}>Detalhes da Ronda</Text>
          <View style={styles.headerEspaco} />
        </View>

        {/* Conteúdo Erro */}
        <View style={styles.conteudo}>
          <View style={styles.erroContainer}>
            <View style={styles.erroIconeContainer}>
              <Feather name="alert-circle" size={48} color={cores.erro} />
            </View>
            <Text style={styles.erroTitulo}>Ops! Algo deu errado</Text>
            <Text style={styles.erroTexto}>
              {erro || "Ronda não encontrada"}
            </Text>
            <TouchableOpacity
              style={styles.botaoVoltar}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={18} color={cores.branco} />
              <Text style={styles.botaoVoltarTexto}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - DETALHES
  // ═══════════════════════════════════════════════════════════════════════════

  const statusConfig = getStatusConfig(ronda.status);
  const trajeto = ronda.trajeto || [];
  const checkpoints = ronda.checkpoints || [];

  // Região inicial do mapa
  const regiaoInicial =
    trajeto.length > 0
      ? {
          latitude: parseFloat(trajeto[0].latitude),
          longitude: parseFloat(trajeto[0].longitude),
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }
      : null;

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
        <Text style={styles.headerTitulo}>Ronda #{ronda.id}</Text>
        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo com Scroll */}
      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={styles.conteudoScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Status */}
        <View style={styles.card}>
          <View style={styles.cardStatusHeader}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusConfig.bgCor },
              ]}
            >
              <Feather
                name={statusConfig.icone}
                size={18}
                color={statusConfig.cor}
              />
              <Text style={[styles.statusTexto, { color: statusConfig.cor }]}>
                {statusConfig.label}
              </Text>
            </View>
            <Text style={styles.rondaId}>#{ronda.id}</Text>
          </View>

          {/* Métricas Principais */}
          <View style={styles.metricasGrid}>
            <View style={styles.metricaItem}>
              <View
                style={[
                  styles.metricaIcone,
                  { backgroundColor: `${cores.destaque}15` },
                ]}
              >
                <Feather name="clock" size={20} color={cores.destaque} />
              </View>
              <View>
                <Text style={styles.metricaLabel}>Duração</Text>
                <Text style={styles.metricaValor}>
                  {formatarDuracao(ronda.tempo_total_segundos)}
                </Text>
              </View>
            </View>

            <View style={styles.metricaItem}>
              <View
                style={[
                  styles.metricaIcone,
                  { backgroundColor: `${cores.sucesso}15` },
                ]}
              >
                <MaterialCommunityIcons
                  name="map-marker-distance"
                  size={20}
                  color={cores.sucesso}
                />
              </View>
              <View>
                <Text style={styles.metricaLabel}>Distância</Text>
                <Text style={styles.metricaValor}>
                  {formatarDistancia(ronda.distancia_total_metros)}
                </Text>
              </View>
            </View>

            <View style={styles.metricaItem}>
              <View
                style={[
                  styles.metricaIcone,
                  { backgroundColor: `${cores.info}15` },
                ]}
              >
                <Feather name="flag" size={20} color={cores.info} />
              </View>
              <View>
                <Text style={styles.metricaLabel}>Checkpoints</Text>
                <Text style={styles.metricaValor}>
                  {ronda.total_checkpoints || checkpoints.length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Card Mapa */}
        {regiaoInicial && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons
                name="map-marker-path"
                size={20}
                color={cores.primaria}
              />
              <Text style={styles.cardTitulo}>Trajeto Percorrido</Text>
            </View>

            <View style={styles.mapaContainer}>
              <MapView
                ref={mapRef}
                style={styles.mapa}
                provider={PROVIDER_GOOGLE}
                initialRegion={regiaoInicial}
                onMapReady={ajustarMapaAoTrajeto}
                showsCompass={false}
              >
                {/* Linha do Trajeto */}
                {trajeto.length > 1 && (
                  <Polyline
                    coordinates={trajeto.map((p) => ({
                      latitude: parseFloat(p.latitude),
                      longitude: parseFloat(p.longitude),
                    }))}
                    strokeColor={cores.primaria}
                    strokeWidth={4}
                  />
                )}

                {/* Marcador de Início */}
                {trajeto.length > 0 && (
                  <Marker
                    coordinate={{
                      latitude: parseFloat(trajeto[0].latitude),
                      longitude: parseFloat(trajeto[0].longitude),
                    }}
                    title="Início"
                  >
                    <View style={styles.marcadorInicio}>
                      <Feather name="play" size={12} color={cores.branco} />
                    </View>
                  </Marker>
                )}

                {/* Marcador de Fim */}
                {trajeto.length > 1 && (
                  <Marker
                    coordinate={{
                      latitude: parseFloat(
                        trajeto[trajeto.length - 1].latitude,
                      ),
                      longitude: parseFloat(
                        trajeto[trajeto.length - 1].longitude,
                      ),
                    }}
                    title="Fim"
                  >
                    <View style={styles.marcadorFim}>
                      <Feather name="square" size={10} color={cores.branco} />
                    </View>
                  </Marker>
                )}

                {/* Checkpoints */}
                {checkpoints.map((cp, index) => (
                  <Marker
                    key={cp.id || index}
                    coordinate={{
                      latitude: parseFloat(cp.latitude),
                      longitude: parseFloat(cp.longitude),
                    }}
                    title={`Checkpoint ${cp.numero_sequencial || index + 1}`}
                    description={cp.descricao || ""}
                  >
                    <View style={styles.marcadorCheckpoint}>
                      <Text style={styles.marcadorCheckpointText}>
                        {cp.numero_sequencial || index + 1}
                      </Text>
                    </View>
                  </Marker>
                ))}
              </MapView>

              {/* Botão centralizar */}
              <TouchableOpacity
                style={styles.botaoCentralizar}
                onPress={ajustarMapaAoTrajeto}
              >
                <Feather name="maximize-2" size={18} color={cores.texto} />
              </TouchableOpacity>
            </View>

            {/* Legenda */}
            <View style={styles.legendaContainer}>
              <View style={styles.legendaItem}>
                <View
                  style={[
                    styles.legendaCor,
                    { backgroundColor: cores.sucesso },
                  ]}
                />
                <Text style={styles.legendaTexto}>Início</Text>
              </View>
              <View style={styles.legendaItem}>
                <View
                  style={[styles.legendaCor, { backgroundColor: cores.erro }]}
                />
                <Text style={styles.legendaTexto}>Fim</Text>
              </View>
              <View style={styles.legendaItem}>
                <View
                  style={[styles.legendaCor, { backgroundColor: cores.info }]}
                />
                <Text style={styles.legendaTexto}>Checkpoint</Text>
              </View>
            </View>
          </View>
        )}

        {/* Card Informações */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="info" size={20} color={cores.primaria} />
            <Text style={styles.cardTitulo}>Informações</Text>
          </View>

          <View style={styles.infoLista}>
            <View style={styles.infoItem}>
              <View style={styles.infoIcone}>
                <Feather
                  name="calendar"
                  size={16}
                  color={cores.textoSecundario}
                />
              </View>
              <View style={styles.infoConteudo}>
                <Text style={styles.infoLabel}>Data</Text>
                <Text style={styles.infoValor}>
                  {formatarData(ronda.data_inicio)}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIcone}>
                <Feather
                  name="play-circle"
                  size={16}
                  color={cores.textoSecundario}
                />
              </View>
              <View style={styles.infoConteudo}>
                <Text style={styles.infoLabel}>Início</Text>
                <Text style={styles.infoValor}>
                  {formatarHora(ronda.data_inicio)}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIcone}>
                <Feather
                  name="stop-circle"
                  size={16}
                  color={cores.textoSecundario}
                />
              </View>
              <View style={styles.infoConteudo}>
                <Text style={styles.infoLabel}>Término</Text>
                <Text style={styles.infoValor}>
                  {formatarHora(ronda.data_fim)}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIcone}>
                <Feather
                  name="map-pin"
                  size={16}
                  color={cores.textoSecundario}
                />
              </View>
              <View style={styles.infoConteudo}>
                <Text style={styles.infoLabel}>Pontos no Trajeto</Text>
                <Text style={styles.infoValor}>{trajeto.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Card Checkpoints */}
        {checkpoints.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="flag" size={20} color={cores.primaria} />
              <Text style={styles.cardTitulo}>
                Checkpoints ({checkpoints.length})
              </Text>
            </View>

            <View style={styles.checkpointLista}>
              {checkpoints.map((cp, index) => (
                <View key={cp.id || index} style={styles.checkpointItem}>
                  <View style={styles.checkpointNumero}>
                    <Text style={styles.checkpointNumeroText}>
                      {cp.numero_sequencial || index + 1}
                    </Text>
                  </View>
                  <View style={styles.checkpointConteudo}>
                    <View style={styles.checkpointHeader}>
                      <Text style={styles.checkpointHora}>
                        {formatarHora(cp.data_hora)}
                      </Text>
                      {cp.tempo_desde_anterior && (
                        <Text style={styles.checkpointTempo}>
                          +{cp.tempo_desde_anterior}
                        </Text>
                      )}
                    </View>
                    {cp.descricao && (
                      <Text style={styles.checkpointDescricao}>
                        {cp.descricao}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Card Observações */}
        {(ronda.observacoes || ronda.observacoes_fim) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="file-text" size={20} color={cores.primaria} />
              <Text style={styles.cardTitulo}>Observações</Text>
            </View>
            <Text style={styles.observacoesTexto}>
              {ronda.observacoes_fim || ronda.observacoes}
            </Text>
          </View>
        )}
      </ScrollView>
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

  // Header Padronizado (igual às outras páginas)
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

  // Conteúdo
  conteudo: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  conteudoScroll: {
    padding: espacamento.md,
    paddingBottom: espacamento.xxl,
  },

  // Cards
  card: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    marginBottom: espacamento.md,
    ...sombras.pequena,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: espacamento.md,
    paddingBottom: espacamento.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
    gap: espacamento.sm,
  },
  cardTitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
  },

  // Status Header
  cardStatusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: espacamento.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    borderRadius: bordas.raioCompleto,
    gap: espacamento.xs,
  },
  statusTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
  },
  rondaId: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Métricas
  metricasGrid: {
    gap: espacamento.md,
  },
  metricaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.md,
  },
  metricaIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  metricaLabel: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginBottom: 2,
  },
  metricaValor: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  // Mapa
  mapaContainer: {
    position: "relative",
    borderRadius: bordas.raioMedio,
    overflow: "hidden",
  },
  mapa: {
    width: "100%",
    height: 220,
  },
  botaoCentralizar: {
    position: "absolute",
    top: espacamento.sm,
    right: espacamento.sm,
    backgroundColor: cores.branco,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...sombras.pequena,
  },

  // Marcadores do mapa
  marcadorInicio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: cores.sucesso,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.branco,
  },
  marcadorFim: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: cores.erro,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.branco,
  },
  marcadorCheckpoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: cores.info,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.branco,
  },
  marcadorCheckpointText: {
    color: cores.branco,
    fontSize: 10,
    fontWeight: "bold",
  },

  // Legenda
  legendaContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: espacamento.lg,
    marginTop: espacamento.md,
    paddingTop: espacamento.md,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  legendaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.xs,
  },
  legendaCor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendaTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Informações
  infoLista: {
    gap: espacamento.md,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.md,
  },
  infoIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoPagina,
    alignItems: "center",
    justifyContent: "center",
  },
  infoConteudo: {
    flex: 1,
  },
  infoLabel: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginBottom: 2,
  },
  infoValor: {
    fontSize: tipografia.tamanhoTexto,
    fontWeight: tipografia.pesoMedio,
    color: cores.texto,
  },

  // Checkpoints
  checkpointLista: {
    gap: espacamento.sm,
  },
  checkpointItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espacamento.md,
    paddingBottom: espacamento.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },
  checkpointNumero: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${cores.info}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  checkpointNumeroText: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoBold,
    color: cores.info,
  },
  checkpointConteudo: {
    flex: 1,
  },
  checkpointHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.sm,
  },
  checkpointHora: {
    fontSize: tipografia.tamanhoTexto,
    fontWeight: tipografia.pesoMedio,
    color: cores.texto,
  },
  checkpointTempo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    backgroundColor: cores.fundoPagina,
    paddingHorizontal: espacamento.xs,
    paddingVertical: 2,
    borderRadius: bordas.raioPequeno,
  },
  checkpointDescricao: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginTop: espacamento.xs,
  },

  // Observações
  observacoesTexto: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    fontStyle: "italic",
    lineHeight: 22,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    marginTop: espacamento.md,
  },

  // Erro
  erroContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: espacamento.xl,
  },
  erroIconeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${cores.erro}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espacamento.md,
  },
  erroTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginBottom: espacamento.sm,
  },
  erroTexto: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    textAlign: "center",
    marginBottom: espacamento.lg,
  },
  botaoVoltar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.primaria,
    paddingHorizontal: espacamento.lg,
    paddingVertical: espacamento.md,
    borderRadius: bordas.raioMedio,
    gap: espacamento.sm,
  },
  botaoVoltarTexto: {
    fontSize: tipografia.tamanhoTexto,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.branco,
  },
});
