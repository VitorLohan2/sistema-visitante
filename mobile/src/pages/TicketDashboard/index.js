/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Dashboard de Tickets
 * Acompanhamento de tickets de visitantes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { Loading, EmptyState, Card } from "../../components";

// Services
import { ticketsService } from "../../services";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

const { width } = Dimensions.get("window");

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function TicketDashboard() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Estados
  const [dashboard, setDashboard] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSCAR DADOS
  // ═══════════════════════════════════════════════════════════════════════════

  const buscarDados = async () => {
    try {
      setCarregando(true);

      // Busca dashboard e tickets em paralelo
      const [dashboardResp, ticketsResp] = await Promise.all([
        ticketsService.buscarDashboard(),
        ticketsService.listar({
          status: filtroStatus !== "todos" ? filtroStatus : undefined,
        }),
      ]);

      // Dashboard pode retornar dados diretamente ou em .data
      const dadosDashboard = dashboardResp?.data || dashboardResp;
      if (dadosDashboard) {
        setDashboard(dadosDashboard);
      }

      // Tickets pode retornar array ou objeto com .data
      const dadosTickets = Array.isArray(ticketsResp)
        ? ticketsResp
        : ticketsResp?.data || ticketsResp;
      if (dadosTickets) {
        setTickets(Array.isArray(dadosTickets) ? dadosTickets : []);
      }
    } catch (erro) {
      console.error("Erro ao buscar dados:", erro);
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  // Carrega ao focar
  useFocusEffect(
    useCallback(() => {
      buscarDados();
    }, [filtroStatus])
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAtualizar = () => {
    setAtualizando(true);
    buscarDados();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATADORES E HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "aberto":
        return { cor: cores.alerta, texto: "Aberto", icone: "alert-circle" };
      case "em_andamento":
      case "em andamento":
        return { cor: cores.info, texto: "Em Andamento", icone: "clock" };
      case "fechado":
      case "concluido":
        return {
          cor: cores.sucesso,
          texto: "Concluído",
          icone: "check-circle",
        };
      case "cancelado":
        return { cor: cores.erro, texto: "Cancelado", icone: "x-circle" };
      default:
        return {
          cor: cores.textoSecundario,
          texto: status,
          icone: "help-circle",
        };
    }
  };

  const formatarData = (data) => {
    if (!data) return "-";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CARDS DO DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  const DashboardCard = ({ titulo, valor, icone, cor }) => (
    <View style={[styles.dashboardCard, { borderLeftColor: cor }]}>
      <View style={[styles.dashboardIcone, { backgroundColor: `${cor}15` }]}>
        <Feather name={icone} size={24} color={cor} />
      </View>
      <View style={styles.dashboardInfo}>
        <Text style={styles.dashboardValor}>{valor || 0}</Text>
        <Text style={styles.dashboardTitulo}>{titulo}</Text>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAR ITEM
  // ═══════════════════════════════════════════════════════════════════════════

  const renderItem = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        activeOpacity={0.7}
        onPress={() => {
          // Pode navegar para detalhes do ticket se existir
        }}
      >
        {/* Header */}
        <View style={styles.ticketHeader}>
          <View style={styles.ticketNumero}>
            <Feather name="hash" size={14} color={cores.destaque} />
            <Text style={styles.ticketNumeroTexto}>{item.id}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusConfig.cor}15` },
            ]}
          >
            <Feather
              name={statusConfig.icone}
              size={12}
              color={statusConfig.cor}
            />
            <Text style={[styles.statusTexto, { color: statusConfig.cor }]}>
              {statusConfig.texto}
            </Text>
          </View>
        </View>

        {/* Título */}
        <Text style={styles.ticketTitulo} numberOfLines={2}>
          {item.titulo || item.assunto || "Sem título"}
        </Text>

        {/* Visitante */}
        <View style={styles.ticketVisitante}>
          <Feather name="user" size={14} color={cores.textoSecundario} />
          <Text style={styles.ticketVisitanteNome} numberOfLines={1}>
            {item.visitante?.nome || item.visitante_nome || "Visitante"}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.ticketFooter}>
          <View style={styles.ticketData}>
            <Feather name="calendar" size={12} color={cores.textoTerciario} />
            <Text style={styles.ticketDataTexto}>
              {formatarData(item.created_at)}
            </Text>
          </View>

          {item.prioridade && (
            <View
              style={[
                styles.prioridadeBadge,
                {
                  backgroundColor:
                    item.prioridade === "alta"
                      ? `${cores.erro}15`
                      : item.prioridade === "media"
                        ? `${cores.alerta}15`
                        : `${cores.sucesso}15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.prioridadeTexto,
                  {
                    color:
                      item.prioridade === "alta"
                        ? cores.erro
                        : item.prioridade === "media"
                          ? cores.alerta
                          : cores.sucesso,
                  },
                ]}
              >
                {item.prioridade.charAt(0).toUpperCase() +
                  item.prioridade.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
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

          <Text style={styles.headerTitulo}>Dashboard de Tickets</Text>

          <View style={styles.headerEspaco} />
        </View>
        <View style={styles.loadingContainer}>
          <Loading mensagem="Carregando dashboard..." />
        </View>
      </View>
    );
  }

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

        <Text style={styles.headerTitulo}>Dashboard de Tickets</Text>

        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo */}
      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={handleAtualizar}
            colors={[cores.destaque]}
            tintColor={cores.destaque}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <>
            {/* Cards do Dashboard */}
            <View style={styles.dashboardGrid}>
              <DashboardCard
                titulo="Total"
                valor={dashboard?.total}
                icone="file-text"
                cor={cores.info}
              />
              <DashboardCard
                titulo="Abertos"
                valor={dashboard?.abertos}
                icone="alert-circle"
                cor={cores.alerta}
              />
              <DashboardCard
                titulo="Em Andamento"
                valor={dashboard?.em_andamento}
                icone="clock"
                cor={cores.destaque}
              />
              <DashboardCard
                titulo="Concluídos"
                valor={dashboard?.concluidos}
                icone="check-circle"
                cor={cores.sucesso}
              />
            </View>

            {/* Filtros */}
            <View style={styles.filtrosContainer}>
              <Text style={styles.filtrosTitulo}>Tickets Recentes</Text>
              <View style={styles.filtros}>
                {[
                  { key: "todos", texto: "Todos" },
                  { key: "aberto", texto: "Abertos" },
                  { key: "em_andamento", texto: "Em Andamento" },
                  { key: "fechado", texto: "Concluídos" },
                ].map((filtro) => (
                  <TouchableOpacity
                    key={filtro.key}
                    style={[
                      styles.filtro,
                      filtroStatus === filtro.key && styles.filtroAtivo,
                    ]}
                    onPress={() => setFiltroStatus(filtro.key)}
                  >
                    <Text
                      style={[
                        styles.filtroTexto,
                        filtroStatus === filtro.key && styles.filtroTextoAtivo,
                      ]}
                    >
                      {filtro.texto}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icone="file-text"
            titulo="Nenhum ticket encontrado"
            descricao="Não há tickets para exibir no momento"
          />
        }
      />
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

  // Lista
  lista: {
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: espacamento.md,
    paddingTop: espacamento.lg,
    paddingBottom: espacamento.xxl,
    minHeight: "100%",
  },

  // Dashboard Grid
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.sm,
    marginBottom: espacamento.lg,
  },

  dashboardCard: {
    width: (width - espacamento.md * 2 - espacamento.sm) / 2 - 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    borderLeftWidth: 4,
    ...sombras.pequena,
  },

  dashboardIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: espacamento.sm,
  },

  dashboardInfo: {
    flex: 1,
  },

  dashboardValor: {
    fontSize: 24,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  dashboardTitulo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Filtros
  filtrosContainer: {
    marginBottom: espacamento.md,
  },

  filtrosTitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginBottom: espacamento.sm,
  },

  filtros: {
    flexDirection: "row",
    gap: espacamento.xs,
  },

  filtro: {
    paddingHorizontal: espacamento.sm,
    paddingVertical: espacamento.xs,
    borderRadius: bordas.raioPequeno,
    backgroundColor: cores.fundoCard,
  },

  filtroAtivo: {
    backgroundColor: cores.destaque,
  },

  filtroTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoMedio,
    color: cores.texto,
  },

  filtroTextoAtivo: {
    color: cores.branco,
  },

  // Ticket Card
  ticketCard: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    marginBottom: espacamento.sm,
    ...sombras.pequena,
  },

  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: espacamento.sm,
  },

  ticketNumero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  ticketNumeroTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoBold,
    color: cores.destaque,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacamento.sm,
    paddingVertical: 2,
    borderRadius: bordas.raioPequeno,
    gap: 4,
  },

  statusTexto: {
    fontSize: tipografia.tamanhoTextoMini,
    fontWeight: tipografia.pesoSemiBold,
  },

  ticketTitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
    marginBottom: espacamento.sm,
  },

  ticketVisitante: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.xs,
    marginBottom: espacamento.sm,
  },

  ticketVisitanteNome: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  ticketFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    paddingTop: espacamento.sm,
  },

  ticketData: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ticketDataTexto: {
    fontSize: tipografia.tamanhoTextoMini,
    color: cores.textoTerciario,
  },

  prioridadeBadge: {
    paddingHorizontal: espacamento.sm,
    paddingVertical: 2,
    borderRadius: bordas.raioPequeno,
  },

  prioridadeTexto: {
    fontSize: tipografia.tamanhoTextoMini,
    fontWeight: tipografia.pesoSemiBold,
  },
});
