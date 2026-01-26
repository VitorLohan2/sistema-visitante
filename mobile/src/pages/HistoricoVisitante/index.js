/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Histórico de Visitantes
 * Lista entradas e saídas de visitantes
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
  StatusBar,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { Loading, EmptyState, Card } from "../../components";

// Services
import { visitantesService } from "../../services";

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

export default function HistoricoVisitante() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { visitanteId } = route.params || {};

  // Estados
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos"); // todos, entrada, saida

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSCAR HISTÓRICO
  // ═══════════════════════════════════════════════════════════════════════════

  const buscarHistorico = async (pagina = 1, limparLista = true) => {
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

      if (visitanteId) {
        params.visitante_id = visitanteId;
      }

      if (filtroTipo !== "todos") {
        params.tipo = filtroTipo;
      }

      const resposta = await visitantesService.listarHistorico(params);

      // Backend retorna array diretamente ou objeto com data
      const dados = Array.isArray(resposta)
        ? resposta
        : resposta.data || resposta;

      if (dados) {
        if (limparLista) {
          setHistorico(Array.isArray(dados) ? dados : []);
        } else {
          setHistorico((prev) => [
            ...prev,
            ...(Array.isArray(dados) ? dados : []),
          ]);
        }
        setTotalPaginas(resposta.totalPages || 1);
        setPaginaAtual(pagina);
      }
    } catch (erro) {
      console.error("Erro ao buscar histórico:", erro);
      Alert.alert("Erro", "Não foi possível carregar o histórico.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
      setCarregandoMais(false);
    }
  };

  // Carrega ao montar e ao focar
  useFocusEffect(
    useCallback(() => {
      buscarHistorico(1);
    }, [filtroTipo])
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAtualizar = () => {
    setAtualizando(true);
    buscarHistorico(1);
  };

  const handleCarregarMais = () => {
    if (!carregandoMais && paginaAtual < totalPaginas) {
      buscarHistorico(paginaAtual + 1, false);
    }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAR ITEM
  // ═══════════════════════════════════════════════════════════════════════════

  const renderItem = ({ item }) => {
    const isEntrada = item.tipo === "entrada";

    return (
      <View style={styles.historicoCard}>
        {/* Indicador de Tipo */}
        <View
          style={[
            styles.tipoIndicador,
            { backgroundColor: isEntrada ? cores.sucesso : cores.erro },
          ]}
        />

        {/* Ícone */}
        <View
          style={[
            styles.iconeContainer,
            {
              backgroundColor: isEntrada
                ? `${cores.sucesso}15`
                : `${cores.erro}15`,
            },
          ]}
        >
          <Feather
            name={isEntrada ? "log-in" : "log-out"}
            size={20}
            color={isEntrada ? cores.sucesso : cores.erro}
          />
        </View>

        {/* Informações */}
        <View style={styles.historicoInfo}>
          <Text style={styles.historicoNome} numberOfLines={1}>
            {item.visitante?.nome || item.visitante_nome || "Visitante"}
          </Text>
          <Text style={styles.historicoTipo}>
            {isEntrada ? "Entrada" : "Saída"}
          </Text>
          <Text style={styles.historicoEmpresa} numberOfLines={1}>
            {item.visitante?.empresa?.nome ||
              item.empresa_nome ||
              "Sem empresa"}
          </Text>
        </View>

        {/* Data e Hora */}
        <View style={styles.historicoDataHora}>
          <Text style={styles.historicoHora}>
            {formatarHora(item.data_hora || item.created_at)}
          </Text>
          <Text style={styles.historicoData}>
            {formatarData(item.data_hora || item.created_at)}
          </Text>
        </View>
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

        <Text style={styles.headerTitulo}>
          {visitanteId ? "Histórico do Visitante" : "Histórico Geral"}
        </Text>

        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo */}
      <View style={styles.conteudo}>
        {/* Filtros */}
        <View style={styles.filtrosContainer}>
          <TouchableOpacity
            style={[
              styles.filtro,
              filtroTipo === "todos" && styles.filtroAtivo,
            ]}
            onPress={() => setFiltroTipo("todos")}
          >
            <Feather
              name="list"
              size={16}
              color={filtroTipo === "todos" ? cores.branco : cores.texto}
            />
            <Text
              style={[
                styles.filtroTexto,
                filtroTipo === "todos" && styles.filtroTextoAtivo,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filtro,
              filtroTipo === "entrada" && styles.filtroAtivoEntrada,
            ]}
            onPress={() => setFiltroTipo("entrada")}
          >
            <Feather
              name="log-in"
              size={16}
              color={filtroTipo === "entrada" ? cores.branco : cores.sucesso}
            />
            <Text
              style={[
                styles.filtroTexto,
                filtroTipo === "entrada" && styles.filtroTextoAtivo,
              ]}
            >
              Entradas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filtro,
              filtroTipo === "saida" && styles.filtroAtivoSaida,
            ]}
            onPress={() => setFiltroTipo("saida")}
          >
            <Feather
              name="log-out"
              size={16}
              color={filtroTipo === "saida" ? cores.branco : cores.erro}
            />
            <Text
              style={[
                styles.filtroTexto,
                filtroTipo === "saida" && styles.filtroTextoAtivo,
              ]}
            >
              Saídas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contador */}
        <Text style={styles.contador}>
          {historico.length} registro{historico.length !== 1 ? "s" : ""}
        </Text>

        {/* Lista ou Loading */}
        {carregando ? (
          <Loading mensagem="Carregando histórico..." />
        ) : historico.length === 0 ? (
          <EmptyState
            icone="clock"
            titulo="Nenhum registro encontrado"
            descricao="Ainda não há registros de entrada ou saída"
          />
        ) : (
          <FlatList
            data={historico}
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
    gap: espacamento.sm,
  },

  filtro: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    borderRadius: bordas.raioMedio,
    backgroundColor: cores.fundoCard,
    gap: espacamento.xs,
    ...sombras.pequena,
  },

  filtroAtivo: {
    backgroundColor: cores.primaria,
  },

  filtroAtivoEntrada: {
    backgroundColor: cores.sucesso,
  },

  filtroAtivoSaida: {
    backgroundColor: cores.erro,
  },

  filtroTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
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

  // Card do Histórico
  historicoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    marginBottom: espacamento.sm,
    overflow: "hidden",
    ...sombras.pequena,
  },

  tipoIndicador: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  iconeContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: espacamento.md,
    marginLeft: espacamento.sm,
  },

  historicoInfo: {
    flex: 1,
  },

  historicoNome: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
    marginBottom: 2,
  },

  historicoTipo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginBottom: 2,
  },

  historicoEmpresa: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoTerciario,
  },

  historicoDataHora: {
    alignItems: "flex-end",
  },

  historicoHora: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  historicoData: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Footer
  footer: {
    paddingVertical: espacamento.md,
    alignItems: "center",
  },
});
