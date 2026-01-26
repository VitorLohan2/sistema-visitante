/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Histórico de Rondas
 * Lista o histórico de rondas do usuário logado
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Card da Ronda
// ═══════════════════════════════════════════════════════════════════════════════

function RondaCard({ ronda, onPress }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case "finalizada":
        return {
          label: "Finalizada",
          cor: cores.sucesso,
          icone: "check-circle",
        };
      case "em_andamento":
        return { label: "Em Andamento", cor: cores.info, icone: "navigation" };
      case "cancelada":
        return { label: "Cancelada", cor: cores.erro, icone: "x-circle" };
      default:
        return {
          label: status,
          cor: cores.textoSecundario,
          icone: "help-circle",
        };
    }
  };

  const statusConfig = getStatusConfig(ronda.status);

  const formatarData = (dataString) => {
    if (!dataString) return "-";
    const data = new Date(dataString);
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatarDuracao = (segundos) => {
    if (!segundos) return "-";
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) return `${horas}h ${minutos}min`;
    return `${minutos}min`;
  };

  const formatarDistancia = (metros) => {
    if (!metros) return "0 m";
    if (metros >= 1000) return `${(metros / 1000).toFixed(2)} km`;
    return `${Math.round(metros)} m`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(ronda)}
      activeOpacity={0.7}
    >
      {/* Header do Card */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusConfig.cor + "20" },
          ]}
        >
          <Feather
            name={statusConfig.icone}
            size={14}
            color={statusConfig.cor}
          />
          <Text style={[styles.statusText, { color: statusConfig.cor }]}>
            {statusConfig.label}
          </Text>
        </View>
        <Text style={styles.cardId}>#{ronda.id}</Text>
      </View>

      {/* Info da Ronda */}
      <View style={styles.cardInfo}>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={16} color={cores.textoSecundario} />
          <Text style={styles.infoText}>{formatarData(ronda.data_inicio)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="clock" size={16} color={cores.textoSecundario} />
          <Text style={styles.infoText}>
            Duração: {formatarDuracao(ronda.tempo_total_segundos)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="map-marker-distance"
            size={16}
            color={cores.textoSecundario}
          />
          <Text style={styles.infoText}>
            Distância: {formatarDistancia(ronda.distancia_total_metros)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="flag" size={16} color={cores.textoSecundario} />
          <Text style={styles.infoText}>
            Checkpoints: {ronda.total_checkpoints || 0}
          </Text>
        </View>
      </View>

      {/* Observações */}
      {ronda.observacoes_fim && (
        <View style={styles.observacoesContainer}>
          <Text style={styles.observacoesLabel}>Observações:</Text>
          <Text style={styles.observacoesText} numberOfLines={2}>
            {ronda.observacoes_fim}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.verDetalhes}>Ver detalhes</Text>
        <Feather name="chevron-right" size={18} color={cores.primaria} />
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function HistoricoRondas() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Estados
  const [rondas, setRondas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const LIMITE = 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR RONDAS
  // ═══════════════════════════════════════════════════════════════════════════

  const carregarRondas = useCallback(
    async (paginaAtual = 1, refresh = false) => {
      try {
        if (refresh) {
          setAtualizando(true);
        } else if (paginaAtual === 1) {
          setCarregando(true);
        } else {
          setCarregandoMais(true);
        }

        setErro(null);

        const response = await rondaService.listarHistorico({
          pagina: paginaAtual,
          limite: LIMITE,
        });

        const novasRondas = response.rondas || [];
        const totalPaginas = response.paginacao?.totalPaginas || 1;

        if (paginaAtual === 1) {
          setRondas(novasRondas);
        } else {
          setRondas((prev) => [...prev, ...novasRondas]);
        }

        setTemMais(paginaAtual < totalPaginas);
        setPagina(paginaAtual);
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
        setErro("Não foi possível carregar o histórico de rondas.");
      } finally {
        setCarregando(false);
        setAtualizando(false);
        setCarregandoMais(false);
      }
    },
    [],
  );

  // Carregar ao montar
  useEffect(() => {
    carregarRondas(1);
  }, [carregarRondas]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleRefresh = () => {
    carregarRondas(1, true);
  };

  const handleCarregarMais = () => {
    if (!carregandoMais && temMais) {
      carregarRondas(pagina + 1);
    }
  };

  const handleVerDetalhes = (ronda) => {
    navigation.navigate("DetalhesRonda", { rondaId: ronda.id });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  const renderItem = ({ item }) => (
    <RondaCard ronda={item} onPress={handleVerDetalhes} />
  );

  const renderFooter = () => {
    if (!carregandoMais) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={cores.primaria} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (carregando) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="clipboard-text-clock-outline"
          size={64}
          color={cores.textoTerciario}
        />
        <Text style={styles.emptyTitle}>Nenhuma ronda encontrada</Text>
        <Text style={styles.emptyText}>
          Você ainda não realizou nenhuma ronda.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

      {/* Header igual Home */}
      <View
        style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
      >
        <TouchableOpacity
          style={styles.headerVoltar}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={cores.branco} />
        </TouchableOpacity>

        <Text style={styles.headerTitulo}>Histórico</Text>

        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo */}
      <View style={styles.conteudo}>
        {carregando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={cores.primaria} />
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : erro ? (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={48} color={cores.erro} />
            <Text style={styles.errorText}>{erro}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRefresh}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={rondas}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={atualizando}
                onRefresh={handleRefresh}
                colors={[cores.primaria]}
                tintColor={cores.primaria}
              />
            }
            onEndReached={handleCarregarMais}
            onEndReachedThreshold={0.2}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
          />
        )}
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
    backgroundColor: cores.primaria,
  },

  // Header igual Home
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
    fontSize: 18,
    fontWeight: "700",
    color: cores.branco,
  },
  headerEspaco: {
    width: 40,
  },

  // Conteúdo com borda arredondada
  conteudo: {
    flex: 1,
    backgroundColor: cores.fundo,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // Lista
  listContent: {
    padding: espacamento.lg,
    paddingBottom: espacamento.xxl,
  },

  // Card
  card: {
    backgroundColor: cores.branco,
    borderRadius: bordas.medio,
    padding: espacamento.lg,
    marginBottom: espacamento.md,
    ...sombras.pequena,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: espacamento.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacamento.sm,
    paddingVertical: espacamento.xs,
    borderRadius: bordas.pequeno,
    gap: espacamento.xs,
  },
  statusText: {
    ...tipografia.legenda,
    fontWeight: "600",
  },
  cardId: {
    ...tipografia.legenda,
    color: cores.textoTerciario,
  },
  cardInfo: {
    gap: espacamento.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.sm,
  },
  infoText: {
    ...tipografia.corpo,
    color: cores.textoSecundario,
  },
  observacoesContainer: {
    marginTop: espacamento.md,
    paddingTop: espacamento.md,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  observacoesLabel: {
    ...tipografia.legenda,
    color: cores.textoTerciario,
    marginBottom: espacamento.xs,
  },
  observacoesText: {
    ...tipografia.corpo,
    color: cores.textoSecundario,
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: espacamento.md,
    paddingTop: espacamento.md,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  verDetalhes: {
    ...tipografia.legenda,
    color: cores.primaria,
    fontWeight: "600",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...tipografia.corpo,
    color: cores.textoSecundario,
    marginTop: espacamento.md,
  },
  loadingFooter: {
    paddingVertical: espacamento.lg,
    alignItems: "center",
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: espacamento.xl,
  },
  errorText: {
    ...tipografia.corpo,
    color: cores.textoSecundario,
    textAlign: "center",
    marginTop: espacamento.md,
    marginBottom: espacamento.lg,
  },
  retryButton: {
    backgroundColor: cores.primaria,
    paddingHorizontal: espacamento.xl,
    paddingVertical: espacamento.md,
    borderRadius: bordas.medio,
  },
  retryText: {
    ...tipografia.botao,
    color: cores.branco,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: espacamento.xxl * 2,
  },
  emptyTitle: {
    ...tipografia.subtitulo,
    color: cores.textoPrimario,
    marginTop: espacamento.lg,
  },
  emptyText: {
    ...tipografia.corpo,
    color: cores.textoSecundario,
    textAlign: "center",
    marginTop: espacamento.sm,
  },
});
