/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Central de Tickets
 * Acompanhamento de tickets (igual ao frontend)
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
import { Loading, EmptyState } from "../../components";

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
  const [dashboard, setDashboard] = useState({
    total: 0,
    abertos: 0,
    em_andamento: 0,
    concluidos: 0,
  });
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

      // Busca todos os tickets
      const ticketsResp = await ticketsService.listar();
      const dadosTickets = Array.isArray(ticketsResp)
        ? ticketsResp
        : ticketsResp?.data || [];

      // Calcula estatísticas
      const total = dadosTickets.length;
      const abertos = dadosTickets.filter(
        (t) => t.status?.toLowerCase() === "aberto",
      ).length;
      const em_andamento = dadosTickets.filter(
        (t) =>
          t.status?.toLowerCase() === "em andamento" ||
          t.status?.toLowerCase() === "em_andamento",
      ).length;
      const concluidos = dadosTickets.filter(
        (t) =>
          t.status?.toLowerCase() === "resolvido" ||
          t.status?.toLowerCase() === "fechado" ||
          t.status?.toLowerCase() === "concluido",
      ).length;

      setDashboard({ total, abertos, em_andamento, concluidos });

      // Filtra se necessário
      let ticketsFiltrados = dadosTickets;
      if (filtroStatus !== "todos") {
        ticketsFiltrados = dadosTickets.filter((t) => {
          const status = t.status?.toLowerCase();
          if (filtroStatus === "aberto") return status === "aberto";
          if (filtroStatus === "em_andamento")
            return status === "em andamento" || status === "em_andamento";
          if (filtroStatus === "fechado")
            return (
              status === "resolvido" ||
              status === "fechado" ||
              status === "concluido"
            );
          return true;
        });
      }

      setTickets(ticketsFiltrados);
    } catch (erro) {
      console.error("Erro ao buscar dados:", erro);
      Alert.alert("Erro", "Não foi possível carregar os tickets.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  // Carrega ao focar
  useFocusEffect(
    useCallback(() => {
      buscarDados();
    }, [filtroStatus]),
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAtualizar = () => {
    setAtualizando(true);
    buscarDados();
  };

  const handleCriarTicket = () => {
    navigation.navigate("CriarTicket");
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
      case "resolvido":
      case "fechado":
      case "concluido":
        return {
          cor: cores.sucesso,
          texto: "Resolvido",
          icone: "check-circle",
        };
      case "cancelado":
        return { cor: cores.erro, texto: "Cancelado", icone: "x-circle" };
      default:
        return {
          cor: cores.textoSecundario,
          texto: status || "Pendente",
          icone: "help-circle",
        };
    }
  };

  const getMotivoCor = (motivo) => {
    const motivoLower = (motivo || "").toLowerCase();
    if (motivoLower.includes("urgente") || motivoLower.includes("incidente")) {
      return cores.erro;
    }
    if (motivoLower.includes("suporte") || motivoLower.includes("duvida")) {
      return cores.info;
    }
    if (motivoLower.includes("sugestao") || motivoLower.includes("objeto")) {
      return cores.sucesso;
    }
    return cores.destaque;
  };

  const formatarData = (data) => {
    if (!data) return "-";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CARDS DO DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  const DashboardCard = ({ titulo, valor, icone, cor, onPress, ativo }) => (
    <TouchableOpacity
      style={[
        styles.dashboardCard,
        { borderLeftColor: cor },
        ativo && styles.dashboardCardAtivo,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.dashboardIcone, { backgroundColor: `${cor}15` }]}>
        <Feather name={icone} size={20} color={cor} />
      </View>
      <View style={styles.dashboardInfo}>
        <Text style={styles.dashboardValor}>{valor || 0}</Text>
        <Text style={styles.dashboardTitulo}>{titulo}</Text>
      </View>
    </TouchableOpacity>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAR ITEM (IGUAL AO FRONTEND)
  // ═══════════════════════════════════════════════════════════════════════════

  const renderItem = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);
    const motivoCor = getMotivoCor(item.motivo);

    return (
      <View style={styles.ticketCard}>
        {/* Menu de 3 pontos */}
        <TouchableOpacity style={styles.ticketMenu}>
          <Feather
            name="more-vertical"
            size={18}
            color={cores.textoSecundario}
          />
        </TouchableOpacity>

        {/* Header com ID e Descrição */}
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketId}>#{item.id}</Text>
          <Text style={styles.ticketSeparador}> - </Text>
          <Text style={styles.ticketDescricao} numberOfLines={1}>
            {item.funcionario || "Sem funcionário"}
          </Text>
        </View>

        {/* Descrição do ticket */}
        <Text style={styles.ticketTexto} numberOfLines={2}>
          {item.descricao || "Sem descrição"}
        </Text>

        {/* Tags: Motivo e Setor */}
        <View style={styles.tagsContainer}>
          {/* Tag Motivo */}
          <View style={[styles.tag, { backgroundColor: `${motivoCor}15` }]}>
            <Text style={[styles.tagTexto, { color: motivoCor }]}>
              {item.motivo || "objeto"}
            </Text>
          </View>

          {/* Tag Setor */}
          <View style={[styles.tag, { backgroundColor: `${cores.info}15` }]}>
            <Text style={[styles.tagTexto, { color: cores.info }]}>
              {item.setor_responsavel || item.setor_usuario || "segurança"}
            </Text>
          </View>
        </View>

        {/* Footer: Data e Usuário */}
        <View style={styles.ticketFooter}>
          <View style={styles.ticketData}>
            <Feather name="calendar" size={14} color={cores.textoTerciario} />
            <Text style={styles.ticketDataTexto}>
              {formatarData(item.data_criacao || item.created_at)}
            </Text>
          </View>

          {/* Avatar do usuário que abriu */}
          <View style={styles.ticketUsuario}>
            <View style={styles.avatarPequeno}>
              <Text style={styles.avatarPequenoTexto}>
                {(item.nome_usuario || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  if (carregando) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />
        <View
          style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
        >
          <TouchableOpacity
            style={styles.headerVoltar}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={cores.branco} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Central de Tickets</Text>
          <View style={styles.headerEspaco} />
        </View>
        <View style={styles.loadingContainer}>
          <Loading mensagem="Carregando tickets..." />
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

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
      >
        <TouchableOpacity
          style={styles.headerVoltar}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={cores.branco} />
        </TouchableOpacity>

        <Text style={styles.headerTitulo}>Central de Tickets</Text>

        <TouchableOpacity
          style={styles.headerBotao}
          onPress={handleCriarTicket}
        >
          <Feather name="plus" size={24} color={cores.branco} />
        </TouchableOpacity>
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
                valor={dashboard.total}
                icone="file-text"
                cor={cores.primaria}
                onPress={() => setFiltroStatus("todos")}
                ativo={filtroStatus === "todos"}
              />
              <DashboardCard
                titulo="Abertos"
                valor={dashboard.abertos}
                icone="alert-circle"
                cor={cores.alerta}
                onPress={() => setFiltroStatus("aberto")}
                ativo={filtroStatus === "aberto"}
              />
              <DashboardCard
                titulo="Em Andamento"
                valor={dashboard.em_andamento}
                icone="clock"
                cor={cores.info}
                onPress={() => setFiltroStatus("em_andamento")}
                ativo={filtroStatus === "em_andamento"}
              />
              <DashboardCard
                titulo="Resolvidos"
                valor={dashboard.concluidos}
                icone="check-circle"
                cor={cores.sucesso}
                onPress={() => setFiltroStatus("fechado")}
                ativo={filtroStatus === "fechado"}
              />
            </View>

            {/* Título da seção */}
            <Text style={styles.secaoTitulo}>
              {filtroStatus === "todos"
                ? "Todos os Tickets"
                : filtroStatus === "aberto"
                  ? "Tickets Abertos"
                  : filtroStatus === "em_andamento"
                    ? "Em Andamento"
                    : "Resolvidos"}
            </Text>
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

  // Header
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

  headerBotao: {
    padding: espacamento.xs,
    backgroundColor: cores.destaque,
    borderRadius: bordas.raioPequeno,
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

  dashboardCardAtivo: {
    borderWidth: 2,
    borderColor: cores.destaque,
  },

  dashboardIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: espacamento.sm,
  },

  dashboardInfo: {
    flex: 1,
  },

  dashboardValor: {
    fontSize: 20,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  dashboardTitulo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Seção
  secaoTitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginBottom: espacamento.md,
  },

  // Ticket Card (Igual ao Frontend)
  ticketCard: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    marginBottom: espacamento.sm,
    position: "relative",
    ...sombras.pequena,
  },

  ticketMenu: {
    position: "absolute",
    top: espacamento.sm,
    right: espacamento.sm,
    padding: espacamento.xs,
  },

  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: espacamento.xs,
    paddingRight: espacamento.xl,
  },

  ticketId: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  ticketSeparador: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.textoSecundario,
  },

  ticketDescricao: {
    flex: 1,
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoMedium,
    color: cores.texto,
  },

  ticketTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginBottom: espacamento.sm,
    lineHeight: 18,
  },

  // Tags
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.xs,
    marginBottom: espacamento.sm,
  },

  tag: {
    paddingHorizontal: espacamento.sm,
    paddingVertical: 4,
    borderRadius: bordas.raioPequeno,
  },

  tagTexto: {
    fontSize: tipografia.tamanhoTextoMini,
    fontWeight: tipografia.pesoMedium,
  },

  // Footer
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
    gap: espacamento.xs,
  },

  ticketDataTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoTerciario,
  },

  ticketUsuario: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarPequeno: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarPequenoTexto: {
    fontSize: 12,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },
});
