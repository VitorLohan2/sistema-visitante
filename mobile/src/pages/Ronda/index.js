/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Ronda Vigilante
 * Sistema profissional de ronda com GPS e rastreamento em tempo real
 *
 * IMPLEMENTAÇÃO PROFISSIONAL:
 * - Google Maps com PROVIDER_GOOGLE
 * - NÃO recentraliza mapa a cada atualização (apenas no início)
 * - Marker com rotação usando Magnetometer (direcaoInterpolada)
 * - Polyline incremental (não redesenha todo o mapa)
 * - Socket.IO envia a cada 3s (não controla UI)
 * - UI funciona offline
 * - Filtro anti-teleporte integrado
 * - Suavização de movimento
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, {
  Marker,
  Polyline,
  Circle,
  PROVIDER_GOOGLE,
} from "react-native-maps";

// Componentes
import { Button, Loading } from "../../components";

// Hook profissional de alta precisão
import { useRondaPreciso } from "../../hooks";

// Utilitários geográficos
import { formatarVelocidade } from "../../utils/geoUtils";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.003; // Zoom próximo para ambiente empresarial
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Função para classificar a precisão do GPS
const classificarPrecisao = (precisao) => {
  if (!precisao)
    return { nivel: "Sem sinal", cor: "#9CA3AF", icone: "wifi-off" };
  if (precisao <= 5)
    return { nivel: "Excelente", cor: "#22C55E", icone: "radio" };
  if (precisao <= 10) return { nivel: "Bom", cor: "#22C55E", icone: "radio" };
  if (precisao <= 20) return { nivel: "Médio", cor: "#F59E0B", icone: "radio" };
  return { nivel: "Fraco", cor: "#EF4444", icone: "radio" };
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE DO MARKER DO VIGILANTE (otimizado para tempo real)
// ═══════════════════════════════════════════════════════════════════════════════

const MarkerVigilante = React.memo(
  ({ rotacao }) => (
    <View style={styles.markerVigilante}>
      <Feather
        name="navigation"
        size={18}
        color={cores.branco}
        style={{
          transform: [{ rotate: `${Math.round(rotacao || 0)}deg` }],
        }}
      />
    </View>
  ),
  (prevProps, nextProps) => {
    // Só re-renderiza se a rotação mudou mais de 5 graus
    return Math.abs((prevProps.rotacao || 0) - (nextProps.rotacao || 0)) < 5;
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function Ronda() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  // Hook profissional de alta precisão
  const {
    rondaAtual,
    carregando,
    iniciandoRonda,
    trajeto,
    checkpoints,
    tempoDecorrido,
    distanciaTotal,
    posicaoAtual,
    posicaoInterpolada,
    direcao,
    direcaoInterpolada,
    precisaoGPS,
    velocidade,
    gpsAtivo,
    erro,
    erroGPS,
    iniciarRonda,
    finalizarRonda,
    registrarCheckpoint,
    validarPontoProximo,
    obterPosicaoAtual,
    formatarTempo,
    formatarDistancia,
    getDirecaoCardeal,
    // Pontos de Controle
    pontosControle,
    pontosVisitados,
    pontoProximo,
    totalPontosObrigatorios,
    pontosObrigatoriosVisitados,
  } = useRondaPreciso();

  // Estados locais
  const [mapaCentralizado, setMapaCentralizado] = useState(false);
  const [regiaoMapa, setRegiaoMapa] = useState(null);
  const [posicaoInicial, setPosicaoInicial] = useState(null);
  const [obtendoPosicao, setObtendoPosicao] = useState(false);
  const [finalizandoRonda, setFinalizandoRonda] = useState(false);

  // Estados para modal de ponto de controle
  const [modalPontoControle, setModalPontoControle] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState(null);
  const [observacaoCheckpoint, setObservacaoCheckpoint] = useState("");
  const [registrandoCheckpoint, setRegistrandoCheckpoint] = useState(false);

  // Debug - verificar checkpoints (desativado para performance)
  // useEffect(() => {
  //   if (checkpoints && checkpoints.length > 0) {
  //     console.log(
  //       "🚩 Checkpoints atualizados:",
  //       JSON.stringify(checkpoints, null, 2),
  //     );
  //   }
  // }, [checkpoints]);

  // Ref para obterPosicaoAtual (evita loop nos useEffects)
  const obterPosicaoAtualRef = useRef(obterPosicaoAtual);
  obterPosicaoAtualRef.current = obterPosicaoAtual;

  // ═══════════════════════════════════════════════════════════════════════════
  // OBTER POSIÇÃO INICIAL PARA MOSTRAR O MAPA (executar apenas uma vez)
  // ═══════════════════════════════════════════════════════════════════════════

  const posicaoObtidaRef = useRef(false);

  useEffect(() => {
    // Executa apenas uma vez
    if (posicaoObtidaRef.current) return;

    const obterPosicaoInicial = async () => {
      // Espera não estar carregando
      if (carregando) return;

      // Se já tem posição, marca como obtida
      if (posicaoAtual) {
        posicaoObtidaRef.current = true;
        return;
      }

      try {
        posicaoObtidaRef.current = true; // Marca para não repetir
        setObtendoPosicao(true);
        const posicao = await obterPosicaoAtualRef.current();
        if (posicao) {
          setPosicaoInicial(posicao);
        }
      } catch (error) {
        console.log("⚠️ Erro ao obter posição inicial:", error.message);
        posicaoObtidaRef.current = false; // Permite tentar novamente em caso de erro
      } finally {
        setObtendoPosicao(false);
      }
    };

    obterPosicaoInicial();
  }, [carregando, posicaoAtual]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMOIZAÇÃO DO TRAJETO PARA POLYLINE
  // Evita re-renders desnecessários
  // ═══════════════════════════════════════════════════════════════════════════

  const trajetoCoordinates = useMemo(() => {
    if (!trajeto || trajeto.length < 2) return [];
    return trajeto.map((p) => ({
      latitude: parseFloat(p.latitude),
      longitude: parseFloat(p.longitude),
    }));
  }, [trajeto]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CENTRALIZAR MAPA APENAS NO INÍCIO DA RONDA
  // NÃO recentraliza a cada atualização - REGRAS OBRIGATÓRIAS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (rondaAtual && posicaoAtual && mapRef.current && !mapaCentralizado) {
      // Centraliza apenas uma vez no início da ronda
      const novaRegiao = {
        latitude: posicaoAtual.latitude,
        longitude: posicaoAtual.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };

      mapRef.current.animateToRegion(novaRegiao, 500);
      setRegiaoMapa(novaRegiao);
      setMapaCentralizado(true);
    }
  }, [rondaAtual, posicaoAtual, mapaCentralizado]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleIniciarRonda = useCallback(async () => {
    if (!posicaoAtual) {
      try {
        await obterPosicaoAtual();
      } catch (e) {
        Alert.alert("Erro", "Não foi possível obter sua localização.");
        return;
      }
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
              await iniciarRonda();
              setMapaCentralizado(false); // Permite recentralizar na nova ronda
            } catch (erro) {
              Alert.alert(
                "Erro",
                erro.message || "Não foi possível iniciar a ronda.",
              );
            }
          },
        },
      ],
    );
  }, [posicaoAtual, obterPosicaoAtual, iniciarRonda]);

  const handleFinalizarRonda = useCallback(async () => {
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
              setFinalizandoRonda(true);
              await finalizarRonda();
              setMapaCentralizado(false);
              setFinalizandoRonda(false);
              Alert.alert("Sucesso", "Ronda finalizada com sucesso!");
            } catch (erro) {
              setFinalizandoRonda(false);
              Alert.alert("Erro", "Não foi possível finalizar a ronda.");
            }
          },
        },
      ],
    );
  }, [finalizarRonda]);

  const handleRegistrarCheckpoint = useCallback(() => {
    // Checkpoint só pode ser registrado quando dentro do raio de um ponto de controle
    if (pontoProximo) {
      setPontoSelecionado(pontoProximo);
      setObservacaoCheckpoint("");
      setModalPontoControle(true);
    } else {
      // Não está dentro de nenhum raio - mostra alerta
      Alert.alert(
        "Fora da Zona",
        "Você precisa estar dentro do raio de um ponto de controle para registrar o checkpoint.",
        [{ text: "OK" }],
      );
    }
  }, [pontoProximo]);

  // Handler para validar ponto de controle específico
  const handleValidarPontoControle = useCallback(async () => {
    if (registrandoCheckpoint || !pontoSelecionado) return;

    try {
      setRegistrandoCheckpoint(true);
      await registrarCheckpoint(
        observacaoCheckpoint || "",
        pontoSelecionado.id,
      );
      setModalPontoControle(false);
      setPontoSelecionado(null);
      setObservacaoCheckpoint("");
      Alert.alert(
        "✅ Ponto Validado!",
        `${pontoSelecionado.nome} registrado com sucesso!`,
      );
    } catch (erro) {
      Alert.alert(
        "Erro",
        erro?.message || "Não foi possível validar o ponto de controle.",
      );
    } finally {
      setRegistrandoCheckpoint(false);
    }
  }, [
    registrandoCheckpoint,
    registrarCheckpoint,
    observacaoCheckpoint,
    pontoSelecionado,
  ]);

  const handleCentralizarMapa = useCallback(() => {
    const posicao = posicaoInterpolada || posicaoAtual;
    if (posicao && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: posicao.latitude,
          longitude: posicao.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        },
        300,
      );
    }
  }, [posicaoInterpolada, posicaoAtual]);

  const handleIrParaHistorico = useCallback(() => {
    navigation.navigate("HistoricoRondas");
  }, [navigation]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIÁVEIS DERIVADAS (calculadas antes dos returns condicionais)
  // ═══════════════════════════════════════════════════════════════════════════

  // Posição para o marker (usa interpolada para movimento suave, com fallback para posicaoInicial)
  const posicaoMarker = posicaoInterpolada || posicaoAtual || posicaoInicial;

  // Posição para o mapa (usa posicaoInicial como fallback)
  const posicaoMapa = posicaoAtual || posicaoInicial;

  // Região inicial do mapa
  const regiaoInicial = posicaoMapa
    ? {
        latitude: posicaoMapa.latitude,
        longitude: posicaoMapa.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }
    : null;

  // Debug desativado para performance em tempo real
  // useEffect(() => {
  //   console.log("📍 Posição do marker:", {...});
  // }, [posicaoInterpolada, posicaoAtual, posicaoInicial, posicaoMarker, direcaoInterpolada]);

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
          <Text style={styles.headerTitulo}>Ronda</Text>
          <TouchableOpacity
            style={styles.headerBotao}
            onPress={handleIrParaHistorico}
          >
            <Feather name="clock" size={20} color={cores.branco} />
          </TouchableOpacity>
        </View>

        {/* Conteúdo Loading */}
        <View style={styles.conteudo}>
          <Loading texto="Carregando ronda..." />
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - ERRO
  // ═══════════════════════════════════════════════════════════════════════════

  if (erro || erroGPS) {
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
          <Text style={styles.headerTitulo}>Ronda</Text>
          <TouchableOpacity
            style={styles.headerBotao}
            onPress={handleIrParaHistorico}
          >
            <Feather name="clock" size={20} color={cores.branco} />
          </TouchableOpacity>
        </View>

        {/* Conteúdo Erro */}
        <View style={styles.conteudo}>
          <View style={styles.erroContainer}>
            <View style={styles.erroIcone}>
              <Feather name="alert-circle" size={48} color={cores.erro} />
            </View>
            <Text style={styles.erroTitulo}>Erro na Ronda</Text>
            <Text style={styles.erroTexto}>
              {erro || erroGPS || "Ocorreu um erro inesperado"}
            </Text>
            <Button
              titulo="Tentar Novamente"
              onPress={() => navigation.goBack()}
              style={styles.botaoErro}
            />
          </View>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - PRINCIPAL
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
        <Text style={styles.headerTitulo}>
          {rondaAtual ? `Ronda #${rondaAtual.id}` : "Ronda"}
        </Text>
        <TouchableOpacity
          style={styles.headerBotao}
          onPress={handleIrParaHistorico}
        >
          <Feather name="clock" size={20} color={cores.branco} />
        </TouchableOpacity>
      </View>

      {/* Mapa Google Maps */}
      <View style={styles.mapaContainer}>
        {regiaoInicial ? (
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
            moveOnMarkerPress={false}
            loadingEnabled={true}
            loadingIndicatorColor={cores.primaria}
          >
            {/* POLYLINE INCREMENTAL - Trajeto percorrido */}
            {trajetoCoordinates.length > 1 && (
              <Polyline
                coordinates={trajetoCoordinates}
                strokeColor={cores.primaria}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* PONTOS DE CONTROLE - Círculos de raio + Markers */}
            {pontosControle.map((ponto) => {
              const foiVisitado = pontosVisitados.includes(ponto.id);
              const estaProximo = pontoProximo?.id === ponto.id;

              return (
                <React.Fragment key={`ponto-${ponto.id}`}>
                  {/* Círculo do raio de validação */}
                  <Circle
                    center={{
                      latitude: ponto.latitude,
                      longitude: ponto.longitude,
                    }}
                    radius={ponto.raio}
                    fillColor={
                      foiVisitado
                        ? "#22C55E20"
                        : estaProximo
                          ? "#22C55E30"
                          : "#22C55E15"
                    }
                    strokeColor={
                      foiVisitado
                        ? "#22C55E"
                        : estaProximo
                          ? "#22C55E"
                          : "#22C55E"
                    }
                    strokeWidth={estaProximo ? 3 : 1}
                  />

                  {/* Marker do ponto */}
                  <Marker
                    coordinate={{
                      latitude: ponto.latitude,
                      longitude: ponto.longitude,
                    }}
                    title={ponto.nome}
                    description={
                      foiVisitado ? "✓ Validado" : `Raio: ${ponto.raio}m`
                    }
                    onPress={() => {
                      if (!foiVisitado && estaProximo && rondaAtual) {
                        setPontoSelecionado(ponto);
                        setObservacaoCheckpoint("");
                        setModalPontoControle(true);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.markerPontoControle,
                        foiVisitado && styles.markerPontoVisitado,
                        estaProximo &&
                          !foiVisitado &&
                          styles.markerPontoProximo,
                        ponto.obrigatorio &&
                          !foiVisitado &&
                          !estaProximo &&
                          styles.markerPontoObrigatorio,
                      ]}
                    >
                      {foiVisitado ? (
                        <Feather name="check" size={14} color={cores.branco} />
                      ) : (
                        <Text style={styles.markerPontoTexto}>
                          {ponto.ordem || ponto.id}
                        </Text>
                      )}
                    </View>
                  </Marker>
                </React.Fragment>
              );
            })}

            {/* MARKER DO VIGILANTE - Tempo Real */}
            {posicaoMarker &&
              posicaoMarker.latitude &&
              posicaoMarker.longitude && (
                <Marker
                  coordinate={{
                    latitude: parseFloat(posicaoMarker.latitude),
                    longitude: parseFloat(posicaoMarker.longitude),
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  flat={true}
                  tracksViewChanges={true}
                  style={{ zIndex: 999 }}
                >
                  <MarkerVigilante rotacao={direcaoInterpolada || 0} />
                </Marker>
              )}

            {/* CHECKPOINTS */}
            {checkpoints
              .filter((cp) => cp.latitude && cp.longitude)
              .map((cp, index) => (
                <Marker
                  key={cp.id || `checkpoint-${index}`}
                  coordinate={{
                    latitude: parseFloat(cp.latitude),
                    longitude: parseFloat(cp.longitude),
                  }}
                  title={`Checkpoint ${cp.numero_sequencial || index + 1}`}
                  description={cp.descricao || ""}
                  tracksViewChanges={true}
                >
                  <View style={styles.markerCheckpoint}>
                    <Text style={styles.markerCheckpointText}>
                      {cp.numero_sequencial || index + 1}
                    </Text>
                  </View>
                </Marker>
              ))}
          </MapView>
        ) : (
          /* Loading enquanto obtém posição inicial */
          <View style={styles.mapaLoading}>
            <Loading texto="Obtendo localização..." />
          </View>
        )}

        {/* Botão centralizar mapa */}
        {regiaoInicial && (
          <TouchableOpacity
            style={styles.botaoCentralizar}
            onPress={handleCentralizarMapa}
            activeOpacity={0.7}
          >
            <Feather name="crosshair" size={20} color={cores.texto} />
          </TouchableOpacity>
        )}

        {/* Indicador de precisão GPS - sempre mostra quando tem região */}
        {regiaoInicial && (
          <View
            style={[
              styles.indicadorPrecisao,
              {
                borderLeftWidth: 3,
                borderLeftColor: classificarPrecisao(precisaoGPS).cor,
              },
            ]}
          >
            <View
              style={[
                styles.precisaoIcone,
                {
                  backgroundColor: `${classificarPrecisao(precisaoGPS).cor}20`,
                },
              ]}
            >
              <Feather
                name={
                  gpsAtivo ? classificarPrecisao(precisaoGPS).icone : "wifi-off"
                }
                size={12}
                color={classificarPrecisao(precisaoGPS).cor}
              />
            </View>
            <View>
              <Text
                style={[
                  styles.precisaoTexto,
                  { color: classificarPrecisao(precisaoGPS).cor },
                ]}
              >
                {gpsAtivo ? classificarPrecisao(precisaoGPS).nivel : "Sem GPS"}
              </Text>
              <Text style={styles.precisaoSubtexto}>
                {precisaoGPS ? `±${Math.round(precisaoGPS)}m` : "--"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Painel de Informações */}
      <View style={styles.painelInfo}>
        {/* Status da Ronda */}
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <View
              style={[
                styles.statusIcone,
                {
                  backgroundColor: gpsAtivo
                    ? `${cores.sucesso}20`
                    : `${cores.erro}20`,
                },
              ]}
            >
              <Feather
                name={gpsAtivo ? "navigation" : "map-pin"}
                size={16}
                color={gpsAtivo ? cores.sucesso : cores.erro}
              />
            </View>
            <View>
              <Text style={styles.statusLabel}>GPS</Text>
              <Text
                style={[
                  styles.statusValor,
                  { color: gpsAtivo ? cores.sucesso : cores.erro },
                ]}
              >
                {gpsAtivo ? "Ativo" : "Inativo"}
              </Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <View
              style={[
                styles.statusIcone,
                { backgroundColor: `${cores.info}20` },
              ]}
            >
              <Feather name="compass" size={16} color={cores.info} />
            </View>
            <View>
              <Text style={styles.statusLabel}>Direção</Text>
              <Text style={[styles.statusValor, { color: cores.info }]}>
                {getDirecaoCardeal(direcaoInterpolada)}
              </Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <View
              style={[
                styles.statusIcone,
                {
                  backgroundColor: `${classificarPrecisao(precisaoGPS).cor}20`,
                },
              ]}
            >
              <Feather
                name={classificarPrecisao(precisaoGPS).icone}
                size={16}
                color={classificarPrecisao(precisaoGPS).cor}
              />
            </View>
            <View>
              <Text style={styles.statusLabel}>Precisão GPS</Text>
              <Text
                style={[
                  styles.statusValor,
                  { color: classificarPrecisao(precisaoGPS).cor },
                ]}
              >
                {precisaoGPS
                  ? `${classificarPrecisao(precisaoGPS).nivel}`
                  : "--"}
              </Text>
            </View>
          </View>
        </View>

        {/* Métricas */}
        <View style={styles.metricasContainer}>
          <View style={styles.metrica}>
            <Feather name="clock" size={18} color={cores.textoSecundario} />
            <Text style={styles.metricaValor}>
              {formatarTempo(tempoDecorrido)}
            </Text>
            <Text style={styles.metricaLabel}>Tempo</Text>
          </View>

          <View style={styles.metrica}>
            <MaterialCommunityIcons
              name="map-marker-distance"
              size={18}
              color={cores.textoSecundario}
            />
            <Text style={styles.metricaValor}>
              {formatarDistancia(distanciaTotal)}
            </Text>
            <Text style={styles.metricaLabel}>Distância</Text>
          </View>

          <View style={styles.metrica}>
            <Feather name="target" size={18} color={cores.textoSecundario} />
            <Text style={styles.metricaValor}>
              {pontosObrigatoriosVisitados}/{totalPontosObrigatorios}
            </Text>
            <Text style={styles.metricaLabel}>Pontos</Text>
          </View>

          <View style={styles.metrica}>
            <Feather
              name="trending-up"
              size={18}
              color={cores.textoSecundario}
            />
            <Text style={styles.metricaValor}>
              {formatarVelocidade(velocidade)}
            </Text>
            <Text style={styles.metricaLabel}>Velocidade</Text>
          </View>
        </View>

        {/* Indicador de Ponto Próximo */}
        {pontoProximo && rondaAtual && (
          <TouchableOpacity
            style={styles.pontoProximoContainer}
            onPress={() => {
              setPontoSelecionado(pontoProximo);
              setObservacaoCheckpoint("");
              setModalPontoControle(true);
            }}
          >
            <View style={styles.pontoProximoInfo}>
              <Feather name="target" size={20} color={cores.sucesso} />
              <View style={styles.pontoProximoTextos}>
                <Text style={styles.pontoProximoNome}>{pontoProximo.nome}</Text>
                <Text style={styles.pontoProximoDistancia}>
                  Dentro do raio ({pontoProximo.distanciaAtual}m) - Toque para
                  validar
                </Text>
              </View>
            </View>
            <Feather name="check-circle" size={24} color={cores.sucesso} />
          </TouchableOpacity>
        )}

        {/* Botões de Ação */}
        <View style={styles.botoesContainer}>
          {!rondaAtual ? (
            <Button
              titulo="Iniciar Ronda"
              onPress={handleIniciarRonda}
              carregando={iniciandoRonda}
              style={styles.botaoIniciar}
              icone="play"
            />
          ) : (
            <View style={styles.botoesRonda}>
              <TouchableOpacity
                style={[
                  styles.botaoCheckpoint,
                  !pontoProximo && styles.botaoCheckpointDesabilitado,
                ]}
                onPress={handleRegistrarCheckpoint}
                disabled={finalizandoRonda}
              >
                <Feather
                  name="flag"
                  size={20}
                  color={pontoProximo ? "#22C55E" : cores.textoSecundario}
                />
                <Text
                  style={[
                    styles.botaoCheckpointTexto,
                    !pontoProximo && styles.botaoCheckpointTextoDesabilitado,
                  ]}
                >
                  {pontoProximo ? "Checkpoint" : "Fora da Zona"}
                </Text>
              </TouchableOpacity>

              <Button
                titulo={finalizandoRonda ? "Finalizando..." : "Finalizar"}
                onPress={handleFinalizarRonda}
                style={styles.botaoFinalizar}
                variante="outline"
                icone="square"
                carregando={finalizandoRonda}
                desabilitado={finalizandoRonda}
              />
            </View>
          )}
        </View>
      </View>

      {/* Modal de Ponto de Controle */}
      <Modal
        visible={modalPontoControle}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalPontoControle(false)}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior="padding">
          <View style={styles.modalConteudo}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <View style={styles.modalIconePonto}>
                  <Feather name="target" size={24} color={cores.sucesso} />
                </View>
                <View>
                  <Text style={styles.modalTitulo}>Validar Ponto</Text>
                  <Text style={styles.modalSubtitulo}>
                    {pontoSelecionado?.nome}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setModalPontoControle(false)}
                style={styles.modalFechar}
              >
                <Feather name="x" size={24} color={cores.texto} />
              </TouchableOpacity>
            </View>

            {pontoSelecionado && (
              <View style={styles.pontoDadosContainer}>
                <View style={styles.pontoDadoItem}>
                  <Text style={styles.pontoDadoLabel}>Distância</Text>
                  <Text style={styles.pontoDadoValor}>
                    {pontoSelecionado.distanciaAtual || 0}m
                  </Text>
                </View>
                <View style={styles.pontoDadoItem}>
                  <Text style={styles.pontoDadoLabel}>Raio</Text>
                  <Text style={styles.pontoDadoValor}>
                    {pontoSelecionado.raio}m
                  </Text>
                </View>
                <View style={styles.pontoDadoItem}>
                  <Text style={styles.pontoDadoLabel}>Tipo</Text>
                  <Text
                    style={[
                      styles.pontoDadoValor,
                      {
                        color: pontoSelecionado.obrigatorio
                          ? cores.erro
                          : cores.info,
                      },
                    ]}
                  >
                    {pontoSelecionado.obrigatorio ? "Obrigatório" : "Opcional"}
                  </Text>
                </View>
              </View>
            )}

            <TextInput
              style={styles.inputObservacao}
              placeholder="Observação (opcional)"
              value={observacaoCheckpoint}
              onChangeText={setObservacaoCheckpoint}
              multiline={true}
              numberOfLines={3}
              maxLength={200}
            />

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.botaoCancelar}
                onPress={() => setModalPontoControle(false)}
              >
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <Button
                titulo="Validar Ponto"
                onPress={handleValidarPontoControle}
                carregando={registrandoCheckpoint}
                style={[
                  styles.botaoConfirmar,
                  { backgroundColor: cores.sucesso },
                ]}
                icone="check"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Header Padronizado igual Home
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espacamento.md,
    paddingBottom: espacamento.md,
  },
  headerVoltar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },
  headerBotao: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Mapa
  mapaContainer: {
    flex: 1,
    position: "relative",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    backgroundColor: cores.fundoPagina,
  },
  mapa: {
    flex: 1,
  },
  mapaLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: cores.fundoPagina,
  },
  botaoCentralizar: {
    position: "absolute",
    top: espacamento.lg,
    right: espacamento.md,
    backgroundColor: cores.branco,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...sombras.pequena,
  },

  // Indicador de precisão GPS no mapa
  indicadorPrecisao: {
    position: "absolute",
    top: espacamento.lg,
    left: espacamento.md,
    backgroundColor: cores.branco,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacamento.sm,
    paddingVertical: espacamento.xs,
    borderRadius: bordas.raioPequeno,
    gap: espacamento.sm,
    ...sombras.pequena,
  },
  precisaoIcone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  precisaoTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
  },
  precisaoSubtexto: {
    fontSize: 10,
    color: cores.textoSecundario,
  },

  // Marker do Vigilante
  markerVigilante: {
    // width: 32,
    // height: 32,
    borderRadius: 16,
    backgroundColor: "#2256c5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.cianoClaro,
    ...sombras.pequena,
  },
  markerSeta: {
    transform: [{ rotate: "0deg" }],
  },

  // Marker de Checkpoint
  markerCheckpoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#c23b12",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.branco,
  },
  markerCheckpointText: {
    color: cores.branco,
    fontSize: 10,
    fontWeight: "bold",
  },

  // Painel de Informações
  painelInfo: {
    backgroundColor: cores.fundoCard,
    padding: espacamento.lg,
    ...sombras.media,
  },

  // Status
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: espacamento.lg,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.sm,
  },
  statusIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },
  statusValor: {
    fontSize: tipografia.tamanhoTexto,
    fontWeight: tipografia.pesoSemiBold,
  },

  // Métricas
  metricasContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: espacamento.lg,
  },
  metrica: {
    alignItems: "center",
    flex: 1,
  },
  metricaValor: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginTop: espacamento.xs,
  },
  metricaLabel: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginTop: espacamento.xs,
  },

  // Botões
  botoesContainer: {
    gap: espacamento.md,
    marginTop: espacamento.sm,
  },
  botaoIniciar: {
    backgroundColor: "#22C55E",
    borderRadius: bordas.raioGrande,
    paddingVertical: espacamento.sm,
  },
  botoesRonda: {
    flexDirection: "row",
    gap: espacamento.md,
  },
  botaoCheckpoint: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E15",
    paddingVertical: espacamento.md,
    paddingHorizontal: espacamento.md,
    borderRadius: bordas.raioGrande,
    borderWidth: 1,
    borderColor: "#22C55E",
    gap: espacamento.sm,
  },
  botaoCheckpointTexto: {
    fontSize: tipografia.tamanhoTexto,
    fontWeight: tipografia.pesoSemiBold,
    color: "#22C55E",
  },
  botaoCheckpointDesabilitado: {
    backgroundColor: cores.cinzaClaro,
    borderColor: cores.borda,
  },
  botaoCheckpointTextoDesabilitado: {
    color: cores.textoSecundario,
  },
  botaoFinalizar: {
    flex: 1,
    borderRadius: bordas.raioGrande,
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalConteudo: {
    backgroundColor: cores.fundoCard,
    borderTopLeftRadius: bordas.raioGrande,
    borderTopRightRadius: bordas.raioGrande,
    padding: espacamento.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: espacamento.lg,
  },
  modalTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },
  modalFechar: {
    padding: espacamento.xs,
  },
  inputObservacao: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: espacamento.lg,
  },
  modalBotoes: {
    flexDirection: "row",
    gap: espacamento.md,
    marginTop: espacamento.sm,
  },
  botaoCancelar: {
    flex: 1,
    paddingVertical: espacamento.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: bordas.raioGrande,
    backgroundColor: cores.fundoPagina,
    minHeight: 48,
  },
  botaoCancelarTexto: {
    fontSize: tipografia.tamanhoTexto,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.textoSecundario,
  },
  botaoConfirmar: {
    flex: 1,
    minHeight: 48,
    borderRadius: bordas.raioGrande,
  },

  // Estados especiais
  conteudo: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: espacamento.xl,
  },
  erroContainer: {
    alignItems: "center",
    gap: espacamento.lg,
  },
  erroIcone: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${cores.erro}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  erroTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    textAlign: "center",
  },
  erroTexto: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    textAlign: "center",
  },
  botaoErro: {
    minWidth: 200,
  },

  // Marker de Ponto de Controle
  markerPontoControle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.branco,
  },
  markerPontoVisitado: {
    backgroundColor: "#16A34A",
  },
  markerPontoProximo: {
    backgroundColor: "#22C55E",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
  },
  markerPontoObrigatorio: {
    backgroundColor: "#22C55E",
  },
  markerPontoTexto: {
    color: cores.branco,
    fontSize: 10,
    fontWeight: "bold",
  },

  // Indicador de Ponto Próximo
  pontoProximoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: `${cores.sucesso}15`,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    marginBottom: espacamento.md,
    borderWidth: 1,
    borderColor: cores.sucesso,
  },
  pontoProximoInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.sm,
    flex: 1,
  },
  pontoProximoTextos: {
    flex: 1,
  },
  pontoProximoNome: {
    fontSize: tipografia.tamanhoTexto,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },
  pontoProximoDistancia: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.sucesso,
  },

  // Modal de Ponto de Controle
  modalHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.sm,
    flex: 1,
  },
  modalIconePonto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${cores.sucesso}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubtitulo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },
  pontoDadosContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: cores.fundoPagina,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    marginBottom: espacamento.lg,
  },
  pontoDadoItem: {
    alignItems: "center",
    flex: 1,
  },
  pontoDadoLabel: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginBottom: espacamento.xs,
  },
  pontoDadoValor: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },
});
