/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Menu Vigilante (Hub)
 * Menu principal do módulo de vigilante/rondas
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export default function MenuVigilante() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { temPermissao, temAlgumaPermissao } = usePermissoes();

  // ═══════════════════════════════════════════════════════════════════════════
  // OPÇÕES DO MENU
  // ═══════════════════════════════════════════════════════════════════════════

  const opcoes = [
    {
      id: "ronda",
      titulo: "Realizar Ronda",
      descricao: "Iniciar ou continuar uma ronda",
      icone: "navigation",
      iconeLib: "Feather",
      cor: cores.sucesso,
      tela: "Ronda",
      permissao: "ronda_iniciar",
    },
    {
      id: "historico",
      titulo: "Histórico de Rondas",
      descricao: "Ver suas rondas anteriores",
      icone: "clock",
      iconeLib: "Feather",
      cor: cores.info,
      tela: "HistoricoRondas",
      permissao: "ronda_visualizar_historico",
    },
  ];

  // Filtra opções baseado nas permissões
  const opcoesDisponiveis = opcoes.filter((opcao) => {
    if (!opcao.permissao) return true;
    return temPermissao(opcao.permissao);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

      {/* Header Padronizado igual Home */}
      <View
        style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
      >
        <TouchableOpacity
          style={styles.headerVoltar}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={cores.branco} />
        </TouchableOpacity>

        <Text style={styles.headerTitulo}>Vigilante</Text>

        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Descrição */}
        <View style={styles.descricaoContainer}>
          <MaterialCommunityIcons
            name="shield-account"
            size={48}
            color={cores.destaque}
          />
          <Text style={styles.descricaoTitulo}>Módulo Vigilante</Text>
          <Text style={styles.descricaoTexto}>
            Gerencie suas rondas de vigilância com rastreamento GPS em tempo
            real.
          </Text>
        </View>

        {/* Opções */}
        <View style={styles.opcoesContainer}>
          {opcoesDisponiveis.length === 0 ? (
            <View style={styles.semPermissao}>
              <Feather name="lock" size={48} color={cores.textoSecundario} />
              <Text style={styles.semPermissaoTexto}>
                Você não tem permissão para acessar este módulo.
              </Text>
            </View>
          ) : (
            opcoesDisponiveis.map((opcao) => (
              <TouchableOpacity
                key={opcao.id}
                style={styles.opcaoCard}
                onPress={() => navigation.navigate(opcao.tela)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.opcaoIconeContainer,
                    { backgroundColor: opcao.cor + "20" },
                  ]}
                >
                  {opcao.iconeLib === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons
                      name={opcao.icone}
                      size={28}
                      color={opcao.cor}
                    />
                  ) : (
                    <Feather name={opcao.icone} size={28} color={opcao.cor} />
                  )}
                </View>
                <View style={styles.opcaoTextos}>
                  <Text style={styles.opcaoTitulo}>{opcao.titulo}</Text>
                  <Text style={styles.opcaoDescricao}>{opcao.descricao}</Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={24}
                  color={cores.textoTerciario}
                />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Dica */}
        <View style={styles.dicaContainer}>
          <Feather name="info" size={20} color={cores.info} />
          <Text style={styles.dicaTexto}>
            Durante a ronda, mantenha o GPS ativado para melhor precisão no
            rastreamento.
          </Text>
        </View>
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

  // Scroll com borda arredondada
  scroll: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    padding: espacamento.lg,
  },

  // Descrição
  descricaoContainer: {
    alignItems: "center",
    marginBottom: espacamento.xl,
    paddingVertical: espacamento.lg,
  },
  descricaoTitulo: {
    ...tipografia.h2,
    color: cores.textoPrimario,
    marginTop: espacamento.md,
    marginBottom: espacamento.sm,
  },
  descricaoTexto: {
    ...tipografia.corpo,
    color: cores.textoSecundario,
    textAlign: "center",
    paddingHorizontal: espacamento.lg,
  },

  // Opções
  opcoesContainer: {
    gap: espacamento.md,
  },
  opcaoCard: {
    backgroundColor: cores.branco,
    borderRadius: bordas.medio,
    padding: espacamento.lg,
    flexDirection: "row",
    alignItems: "center",
    ...sombras.pequena,
  },
  opcaoIconeContainer: {
    width: 56,
    height: 56,
    borderRadius: bordas.medio,
    alignItems: "center",
    justifyContent: "center",
    marginRight: espacamento.md,
  },
  opcaoTextos: {
    flex: 1,
  },
  opcaoTitulo: {
    ...tipografia.subtitulo,
    color: cores.textoPrimario,
    marginBottom: espacamento.xs,
  },
  opcaoDescricao: {
    ...tipografia.legenda,
    color: cores.textoSecundario,
  },

  // Sem Permissão
  semPermissao: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: espacamento.xxl,
  },
  semPermissaoTexto: {
    ...tipografia.corpo,
    color: cores.textoSecundario,
    textAlign: "center",
    marginTop: espacamento.md,
  },

  // Dica
  dicaContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.info + "15",
    borderRadius: bordas.medio,
    padding: espacamento.md,
    marginTop: espacamento.xl,
  },
  dicaTexto: {
    ...tipografia.legenda,
    color: cores.info,
    flex: 1,
    marginLeft: espacamento.sm,
  },
});
