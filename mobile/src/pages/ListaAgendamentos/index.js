/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Lista de Agendamentos
 * Gerencia visitas agendadas
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { Loading, EmptyState, Button } from "../../components";

// Services
import { agendamentosService } from "../../services";

// Hooks
import { usePermissoes } from "../../hooks";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function ListaAgendamentos() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { temPermissao } = usePermissoes();

  // Estados
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos"); // todos, pendente, confirmado, cancelado

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSCAR AGENDAMENTOS
  // ═══════════════════════════════════════════════════════════════════════════

  const buscarAgendamentos = async (pagina = 1, limparLista = true) => {
    try {
      if (pagina === 1) {
        setCarregando(true);
      } else {
        setCarregandoMais(true);
      }

      const params = {
        page: pagina,
        limit: 20,
      };

      if (filtroStatus !== "todos") {
        params.status = filtroStatus;
      }

      const resposta = await agendamentosService.listar(params);

      // Backend retorna array diretamente ou objeto com data
      const dados = Array.isArray(resposta)
        ? resposta
        : resposta.data || resposta;

      if (dados) {
        if (limparLista) {
          setAgendamentos(Array.isArray(dados) ? dados : []);
        } else {
          setAgendamentos((prev) => [
            ...prev,
            ...(Array.isArray(dados) ? dados : []),
          ]);
        }
        setTotalPaginas(resposta.totalPages || 1);
        setPaginaAtual(pagina);
      }
    } catch (erro) {
      console.error("Erro ao buscar agendamentos:", erro);
      Alert.alert("Erro", "Não foi possível carregar os agendamentos.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
      setCarregandoMais(false);
    }
  };

  // Carrega ao focar
  useFocusEffect(
    useCallback(() => {
      buscarAgendamentos(1);
    }, [filtroStatus])
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAtualizar = () => {
    setAtualizando(true);
    buscarAgendamentos(1);
  };

  const handleCarregarMais = () => {
    if (!carregandoMais && paginaAtual < totalPaginas) {
      buscarAgendamentos(paginaAtual + 1, false);
    }
  };

  const handleConfirmar = async (id) => {
    Alert.alert("Confirmar Agendamento", "Deseja confirmar este agendamento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          try {
            await agendamentosService.confirmar(id);
            Alert.alert("Sucesso", "Agendamento confirmado!");
            buscarAgendamentos(1);
          } catch (erro) {
            Alert.alert("Erro", "Não foi possível confirmar o agendamento.");
          }
        },
      },
    ]);
  };

  const handleCancelar = async (id) => {
    Alert.alert(
      "Cancelar Agendamento",
      "Tem certeza que deseja cancelar este agendamento?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, Cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              await agendamentosService.cancelar(id);
              Alert.alert("Sucesso", "Agendamento cancelado!");
              buscarAgendamentos(1);
            } catch (erro) {
              Alert.alert("Erro", "Não foi possível cancelar o agendamento.");
            }
          },
        },
      ]
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATADORES
  // ═══════════════════════════════════════════════════════════════════════════

  const formatarData = (data) => {
    if (!data) return "-";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatarHora = (data) => {
    if (!data) return "-";
    const d = new Date(data);
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "confirmado":
        return {
          cor: cores.sucesso,
          texto: "Confirmado",
          icone: "check-circle",
        };
      case "pendente":
        return { cor: cores.alerta, texto: "Pendente", icone: "clock" };
      case "cancelado":
        return { cor: cores.erro, texto: "Cancelado", icone: "x-circle" };
      case "concluido":
        return { cor: cores.info, texto: "Concluído", icone: "check" };
      default:
        return {
          cor: cores.textoSecundario,
          texto: status,
          icone: "help-circle",
        };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICAR SE É HOJE OU PRÓXIMO
  // ═══════════════════════════════════════════════════════════════════════════

  const isHoje = (data) => {
    if (!data) return false;
    const hoje = new Date();
    const d = new Date(data);
    return d.toDateString() === hoje.toDateString();
  };

  const isAmanha = (data) => {
    if (!data) return false;
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const d = new Date(data);
    return d.toDateString() === amanha.toDateString();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAR ITEM
  // ═══════════════════════════════════════════════════════════════════════════

  const renderItem = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);
    const hoje = isHoje(item.data_agendamento);
    const amanha = isAmanha(item.data_agendamento);

    return (
      <View style={styles.agendamentoCard}>
        {/* Badge de Hoje/Amanhã */}
        {(hoje || amanha) && (
          <View
            style={[
              styles.badgeDestaque,
              { backgroundColor: hoje ? cores.destaque : cores.info },
            ]}
          >
            <Text style={styles.badgeDestaqueTexto}>
              {hoje ? "HOJE" : "AMANHÃ"}
            </Text>
          </View>
        )}

        {/* Header do Card */}
        <View style={styles.cardHeader}>
          <View style={styles.visitanteInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>
                {item.visitante?.nome?.charAt(0)?.toUpperCase() ||
                  item.visitante_nome?.charAt(0)?.toUpperCase() ||
                  "V"}
              </Text>
            </View>
            <View>
              <Text style={styles.visitanteNome} numberOfLines={1}>
                {item.visitante?.nome || item.visitante_nome || "Visitante"}
              </Text>
              <Text style={styles.visitanteEmpresa} numberOfLines={1}>
                {item.visitante?.empresa?.nome ||
                  item.empresa_nome ||
                  "Sem empresa"}
              </Text>
            </View>
          </View>

          {/* Status */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusConfig.cor}15` },
            ]}
          >
            <Feather
              name={statusConfig.icone}
              size={14}
              color={statusConfig.cor}
            />
            <Text style={[styles.statusTexto, { color: statusConfig.cor }]}>
              {statusConfig.texto}
            </Text>
          </View>
        </View>

        {/* Detalhes */}
        <View style={styles.cardDetalhes}>
          <View style={styles.detalheItem}>
            <Feather name="calendar" size={16} color={cores.textoSecundario} />
            <Text style={styles.detalheTexto}>
              {formatarData(item.data_agendamento)}
            </Text>
          </View>

          <View style={styles.detalheItem}>
            <Feather name="clock" size={16} color={cores.textoSecundario} />
            <Text style={styles.detalheTexto}>
              {formatarHora(item.data_agendamento)}
            </Text>
          </View>

          {item.setor && (
            <View style={styles.detalheItem}>
              <Feather name="map-pin" size={16} color={cores.textoSecundario} />
              <Text style={styles.detalheTexto} numberOfLines={1}>
                {item.setor.nome || item.setor}
              </Text>
            </View>
          )}
        </View>

        {/* Motivo */}
        {item.motivo && (
          <Text style={styles.motivo} numberOfLines={2}>
            {item.motivo}
          </Text>
        )}

        {/* Ações */}
        {item.status === "pendente" && temPermissao("agendamento_editar") && (
          <View style={styles.cardAcoes}>
            <TouchableOpacity
              style={[styles.botaoAcao, styles.botaoConfirmar]}
              onPress={() => handleConfirmar(item.id)}
            >
              <Feather name="check" size={18} color={cores.branco} />
              <Text style={styles.botaoAcaoTexto}>Confirmar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botaoAcao, styles.botaoCancelar]}
              onPress={() => handleCancelar(item.id)}
            >
              <Feather name="x" size={18} color={cores.erro} />
              <Text style={[styles.botaoAcaoTexto, { color: cores.erro }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAR FOOTER
  // ═══════════════════════════════════════════════════════════════════════════

  const renderFooter = () => {
    if (!carregandoMais) return null;

    return (
      <View style={styles.footer}>
        <Loading tamanho="small" />
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
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

        <Text style={styles.headerTitulo}>Agendamentos</Text>

        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo */}
      <View style={styles.conteudo}>
        {/* Filtros */}
        <View style={styles.filtrosContainer}>
          {[
            { key: "todos", texto: "Todos" },
            { key: "pendente", texto: "Pendentes" },
            { key: "confirmado", texto: "Confirmados" },
            { key: "cancelado", texto: "Cancelados" },
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

        {/* Contador */}
        <Text style={styles.contador}>
          {agendamentos.length} agendamento
          {agendamentos.length !== 1 ? "s" : ""}
        </Text>

        {/* Lista ou Loading */}
        {carregando ? (
          <Loading mensagem="Carregando agendamentos..." />
        ) : agendamentos.length === 0 ? (
          <EmptyState
            icone="calendar"
            titulo="Nenhum agendamento encontrado"
            descricao="Não há visitas agendadas no momento"
          />
        ) : (
          <FlatList
            data={agendamentos}
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
            onEndReached={handleCarregarMais}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lista}
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

  conteudo: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: espacamento.md,
  },

  // Filtros
  filtrosContainer: {
    flexDirection: "row",
    paddingHorizontal: espacamento.md,
    marginBottom: espacamento.sm,
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

  // Contador
  contador: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    paddingHorizontal: espacamento.md,
    marginBottom: espacamento.sm,
  },

  // Lista
  lista: {
    paddingHorizontal: espacamento.md,
    paddingBottom: espacamento.xxl,
  },

  // Card do Agendamento
  agendamentoCard: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    marginBottom: espacamento.md,
    ...sombras.pequena,
  },

  badgeDestaque: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: espacamento.sm,
    paddingVertical: 2,
    borderTopRightRadius: bordas.raioMedio,
    borderBottomLeftRadius: bordas.raioPequeno,
  },

  badgeDestaqueTexto: {
    fontSize: 10,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: espacamento.sm,
  },

  visitanteInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
    marginRight: espacamento.sm,
  },

  avatarTexto: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },

  visitanteNome: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
  },

  visitanteEmpresa: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacamento.sm,
    paddingVertical: espacamento.xs,
    borderRadius: bordas.raioPequeno,
    gap: 4,
  },

  statusTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
  },

  // Detalhes
  cardDetalhes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.md,
    marginBottom: espacamento.sm,
  },

  detalheItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  detalheTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Motivo
  motivo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.texto,
    fontStyle: "italic",
    marginBottom: espacamento.sm,
  },

  // Ações
  cardAcoes: {
    flexDirection: "row",
    gap: espacamento.sm,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    paddingTop: espacamento.sm,
  },

  botaoAcao: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    borderRadius: bordas.raioPequeno,
    gap: espacamento.xs,
  },

  botaoConfirmar: {
    backgroundColor: cores.sucesso,
  },

  botaoCancelar: {
    backgroundColor: `${cores.erro}15`,
    borderWidth: 1,
    borderColor: cores.erro,
  },

  botaoAcaoTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.branco,
  },

  // Footer
  footer: {
    paddingVertical: espacamento.md,
    alignItems: "center",
  },
});
