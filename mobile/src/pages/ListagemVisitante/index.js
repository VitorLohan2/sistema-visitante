/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Listagem de Visitantes
 * Lista todos os visitantes cadastrados com busca e filtros
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { Loading, EmptyState, Card } from "../../components";

// Services
import { visitantesService } from "../../services";

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

export default function ListagemVisitante() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { temPermissao } = usePermissoes();

  // Estados
  const [visitantes, setVisitantes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregandoMais, setCarregandoMais] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSCAR VISITANTES
  // ═══════════════════════════════════════════════════════════════════════════

  const buscarVisitantes = async (
    pagina = 1,
    termoBusca = busca,
    limparLista = true
  ) => {
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

      // Se tiver busca, usa endpoint de busca
      let resposta;
      if (termoBusca && termoBusca.trim()) {
        resposta = await visitantesService.buscar(termoBusca);
      } else {
        resposta = await visitantesService.listar(params);
      }

      // Backend retorna array diretamente ou objeto com data
      const dados = Array.isArray(resposta)
        ? resposta
        : resposta.data || resposta;

      if (dados) {
        if (limparLista) {
          setVisitantes(Array.isArray(dados) ? dados : []);
        } else {
          setVisitantes((prev) => [
            ...prev,
            ...(Array.isArray(dados) ? dados : []),
          ]);
        }
        // Total de páginas vem no header X-Total-Count
        setTotalPaginas(
          resposta.totalPages ||
            Math.ceil((resposta.total || dados.length) / 20) ||
            1
        );
        setPaginaAtual(pagina);
      }
    } catch (erro) {
      console.error("Erro ao buscar visitantes:", erro);
      Alert.alert("Erro", "Não foi possível carregar os visitantes.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
      setCarregandoMais(false);
    }
  };

  // Carrega ao montar e ao focar
  useFocusEffect(
    useCallback(() => {
      buscarVisitantes(1, busca);
    }, [])
  );

  // Atualiza quando busca muda (com debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      buscarVisitantes(1, busca);
    }, 500);

    return () => clearTimeout(timer);
  }, [busca]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAtualizar = () => {
    setAtualizando(true);
    buscarVisitantes(1, busca);
  };

  const handleCarregarMais = () => {
    if (!carregandoMais && paginaAtual < totalPaginas) {
      buscarVisitantes(paginaAtual + 1, busca, false);
    }
  };

  const handleVisualizarVisitante = (visitante) => {
    navigation.navigate("VisualizarVisitante", { visitante });
  };

  const handleEditarVisitante = (visitante) => {
    navigation.navigate("EditarCadastroVisitante", { visitante });
  };

  const handleNovoVisitante = () => {
    navigation.navigate("Visitante");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAR ITEM
  // ═══════════════════════════════════════════════════════════════════════════

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.visitanteCard}
      onPress={() => handleVisualizarVisitante(item)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarTexto}>
          {item.nome?.charAt(0)?.toUpperCase() || "V"}
        </Text>
      </View>

      {/* Informações */}
      <View style={styles.visitanteInfo}>
        <Text style={styles.visitanteNome} numberOfLines={1}>
          {item.nome}
        </Text>
        <Text style={styles.visitanteDocumento} numberOfLines={1}>
          {item.cpf || item.rg || "Sem documento"}
        </Text>
        <Text style={styles.visitanteEmpresa} numberOfLines={1}>
          {item.empresa?.nome || item.empresa_nome || "Sem empresa"}
        </Text>
      </View>

      {/* Status */}
      <View style={styles.visitanteAcoes}>
        {item.ativo !== false && (
          <View style={[styles.badge, styles.badgeAtivo]}>
            <Text style={styles.badgeTextoAtivo}>Ativo</Text>
          </View>
        )}

        {/* Botão editar */}
        {temPermissao("cadastro_editar") && (
          <TouchableOpacity
            style={styles.botaoAcao}
            onPress={() => handleEditarVisitante(item)}
          >
            <Feather name="edit-2" size={18} color={cores.info} />
          </TouchableOpacity>
        )}

        <Feather name="chevron-right" size={20} color={cores.textoSecundario} />
      </View>
    </TouchableOpacity>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAR FOOTER (CARREGANDO MAIS)
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

        <Text style={styles.headerTitulo}>Visitantes</Text>

        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo */}
      <View style={styles.conteudo}>
        {/* Barra de busca */}
        <View style={styles.buscaContainer}>
          <View style={styles.buscaInputContainer}>
            <Feather name="search" size={20} color={cores.textoSecundario} />
            <TextInput
              style={styles.buscaInput}
              placeholder="Buscar por nome, CPF ou RG..."
              placeholderTextColor={cores.textoTerciario}
              value={busca}
              onChangeText={setBusca}
              autoCapitalize="none"
            />
            {busca.length > 0 && (
              <TouchableOpacity onPress={() => setBusca("")}>
                <Feather name="x" size={20} color={cores.textoSecundario} />
              </TouchableOpacity>
            )}
          </View>

          {/* Botão novo visitante */}
          {temPermissao("cadastro_criar") && (
            <TouchableOpacity
              style={styles.botaoNovo}
              onPress={handleNovoVisitante}
            >
              <Feather name="plus" size={24} color={cores.branco} />
            </TouchableOpacity>
          )}
        </View>

        {/* Contador */}
        <Text style={styles.contador}>
          {visitantes.length} visitante{visitantes.length !== 1 ? "s" : ""}{" "}
          encontrado{visitantes.length !== 1 ? "s" : ""}
        </Text>

        {/* Lista ou Loading */}
        {carregando ? (
          <Loading mensagem="Carregando visitantes..." />
        ) : visitantes.length === 0 ? (
          <EmptyState
            icone="users"
            titulo="Nenhum visitante encontrado"
            descricao={
              busca
                ? "Tente buscar com outros termos"
                : "Cadastre o primeiro visitante"
            }
            textoBotao={
              temPermissao("cadastro_criar") ? "Cadastrar Visitante" : undefined
            }
            onPressBotao={
              temPermissao("cadastro_criar") ? handleNovoVisitante : undefined
            }
          />
        ) : (
          <FlatList
            data={visitantes}
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

  // Busca
  buscaContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacamento.md,
    marginBottom: espacamento.sm,
    gap: espacamento.sm,
  },

  buscaInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioMedio,
    paddingHorizontal: espacamento.md,
    height: 48,
    ...sombras.pequena,
  },

  buscaInput: {
    flex: 1,
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
    marginLeft: espacamento.sm,
  },

  botaoNovo: {
    width: 48,
    height: 48,
    borderRadius: bordas.raioMedio,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
    ...sombras.media,
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

  // Card do Visitante
  visitanteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    marginBottom: espacamento.sm,
    ...sombras.pequena,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
    marginRight: espacamento.md,
  },

  avatarTexto: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },

  visitanteInfo: {
    flex: 1,
  },

  visitanteNome: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
    marginBottom: 2,
  },

  visitanteDocumento: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginBottom: 2,
  },

  visitanteEmpresa: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoTerciario,
  },

  visitanteAcoes: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.sm,
  },

  badge: {
    paddingHorizontal: espacamento.sm,
    paddingVertical: 2,
    borderRadius: bordas.raioPequeno,
  },

  badgeAtivo: {
    backgroundColor: `${cores.sucesso}20`,
  },

  badgeTextoAtivo: {
    fontSize: tipografia.tamanhoTextoMini,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.sucesso,
  },

  botaoAcao: {
    padding: espacamento.xs,
  },

  // Footer
  footer: {
    paddingVertical: espacamento.md,
    alignItems: "center",
  },
});
