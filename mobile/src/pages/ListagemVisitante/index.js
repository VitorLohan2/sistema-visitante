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
import { visitantesService, setCache, getCacheAsync } from "../../services";

// Hooks
import { usePermissoes } from "../../hooks";

// Chave do cache
const CACHE_KEY = "visitantes_cadastrados";

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
  const [todosVisitantes, setTodosVisitantes] = useState([]);
  const [visitantesFiltrados, setVisitantesFiltrados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [busca, setBusca] = useState("");

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR VISITANTES (CACHE)
  // ═══════════════════════════════════════════════════════════════════════════

  const carregarVisitantes = async (forcarAtualizacao = false) => {
    try {
      setCarregando(true);

      // Tenta carregar do cache primeiro
      if (!forcarAtualizacao) {
        const cache = await getCacheAsync(CACHE_KEY);
        if (cache && Array.isArray(cache) && cache.length > 0) {
          setTodosVisitantes(cache);
          setVisitantesFiltrados(cache);
          setCarregando(false);
          // Atualiza em background
          atualizarEmBackground();
          return;
        }
      }

      // Busca todos da API (limit alto para pegar todos)
      const resposta = await visitantesService.listar({ page: 1, limit: 9999 });
      const dados = resposta.data || resposta;
      const lista = Array.isArray(dados) ? dados : [];

      // Salva no cache
      await setCache(CACHE_KEY, lista);
      setTodosVisitantes(lista);
      setVisitantesFiltrados(lista);
    } catch (erro) {
      console.error("Erro ao carregar visitantes:", erro);
      Alert.alert("Erro", "Não foi possível carregar os visitantes.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  const atualizarEmBackground = async () => {
    try {
      const resposta = await visitantesService.listar({ page: 1, limit: 9999 });
      const dados = resposta.data || resposta;
      const lista = Array.isArray(dados) ? dados : [];
      await setCache(CACHE_KEY, lista);
      setTodosVisitantes(lista);
      // Atualiza filtrados mantendo o filtro atual
      if (busca.trim()) {
        filtrarVisitantes(lista, busca);
      } else {
        setVisitantesFiltrados(lista);
      }
    } catch (erro) {
      console.error("Erro ao atualizar em background:", erro);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTRAR VISITANTES LOCALMENTE
  // ═══════════════════════════════════════════════════════════════════════════

  const filtrarVisitantes = (lista, termo) => {
    if (!termo || !termo.trim()) {
      setVisitantesFiltrados(lista);
      return;
    }

    const termoLower = termo.toLowerCase().trim();
    const filtrados = lista.filter((v) => {
      const nome = (v.nome || "").toLowerCase();
      const cpf = (v.cpf || "").replace(/\D/g, "");
      const empresa = (v.empresa_nome || v.empresa?.nome || "").toLowerCase();
      const termoNumeros = termoLower.replace(/\D/g, "");

      return (
        nome.includes(termoLower) ||
        cpf.includes(termoNumeros) ||
        empresa.includes(termoLower)
      );
    });

    setVisitantesFiltrados(filtrados);
  };

  // Carrega ao montar e ao focar
  useFocusEffect(
    useCallback(() => {
      carregarVisitantes();
    }, []),
  );

  // Filtra quando busca muda
  const handleBuscaChange = (texto) => {
    setBusca(texto);
    if (!texto || !texto.trim()) {
      setVisitantesFiltrados(todosVisitantes);
      return;
    }

    const termoLower = texto.toLowerCase().trim();
    const termoNumeros = termoLower.replace(/\D/g, "");

    const filtrados = todosVisitantes.filter((v) => {
      const nome = (v.nome || "").toLowerCase();
      const cpf = (v.cpf || "").replace(/\D/g, "");
      const empresa = (v.empresa_nome || v.empresa?.nome || "").toLowerCase();

      return (
        nome.includes(termoLower) ||
        (termoNumeros && cpf.includes(termoNumeros)) ||
        empresa.includes(termoLower)
      );
    });

    setVisitantesFiltrados(filtrados);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAtualizar = () => {
    setAtualizando(true);
    carregarVisitantes(true);
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
              placeholder="Buscar por nome, CPF ou empresa..."
              placeholderTextColor={cores.textoTerciario}
              value={busca}
              onChangeText={handleBuscaChange}
              autoCapitalize="none"
            />
            {busca.length > 0 && (
              <TouchableOpacity onPress={() => handleBuscaChange("")}>
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
          {visitantesFiltrados.length} visitante
          {visitantesFiltrados.length !== 1 ? "s" : ""} encontrado
          {visitantesFiltrados.length !== 1 ? "s" : ""}
        </Text>

        {/* Lista ou Loading */}
        {carregando ? (
          <Loading mensagem="Carregando visitantes..." />
        ) : visitantesFiltrados.length === 0 ? (
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
            data={visitantesFiltrados}
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
