/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Sistema Visitante (Hub)
 * Menu principal do módulo de visitantes
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
import { Feather } from "@expo/vector-icons";
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

export default function SistemaVisitante() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { temPermissao, temAlgumaPermissao } = usePermissoes();

  // ═══════════════════════════════════════════════════════════════════════════
  // OPÇÕES DO MENU
  // ═══════════════════════════════════════════════════════════════════════════

  const opcoes = [
    {
      id: "cadastro",
      titulo: "Cadastro de Visitantes",
      descricao: "Cadastrar novos visitantes",
      icone: "user-plus",
      cor: cores.sucesso,
      tela: "Visitante",
      permissao: "cadastro_criar",
    },
    {
      id: "listagem",
      titulo: "Lista de Visitantes",
      descricao: "Visualizar visitantes cadastrados",
      icone: "users",
      cor: cores.info,
      tela: "ListagemVisitante",
      permissao: "cadastro_visualizar",
    },
    {
      id: "historico",
      titulo: "Histórico",
      descricao: "Entradas e saídas de visitantes",
      icone: "clock",
      cor: cores.alerta,
      tela: "HistoricoVisitante",
      permissao: "historico_visualizar",
    },
    {
      id: "agendamentos",
      titulo: "Agendamentos",
      descricao: "Gerenciar visitas agendadas",
      icone: "calendar",
      cor: cores.destaque,
      tela: "ListaAgendamentos",
      permissao: "agendamento_visualizar",
    },
    {
      id: "tickets",
      titulo: "Dashboard de Tickets",
      descricao: "Acompanhar tickets de visitantes",
      icone: "file-text",
      cor: cores.roxo,
      tela: "TicketDashboard",
      permissao: "ticket_visualizar",
    },
    {
      id: "bipar",
      titulo: "Bipar Crachá",
      descricao: "Registrar entrada/saída por crachá",
      icone: "credit-card",
      cor: cores.ciano,
      tela: "BiparCracha",
      permissao: "cadastro_visualizar",
    },
  ];

  // Filtra opções baseado nas permissões
  const opcoesFiltradas = opcoes.filter((opcao) =>
    temPermissao(opcao.permissao)
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

        <Text style={styles.headerTitulo}>Sistema Visitante</Text>

        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Título da seção */}
        <Text style={styles.secaoTitulo}>Menu Principal</Text>
        <Text style={styles.secaoDescricao}>
          Selecione uma opção para continuar
        </Text>

        {/* Lista de opções */}
        <View style={styles.opcoesList}>
          {opcoesFiltradas.map((opcao) => (
            <TouchableOpacity
              key={opcao.id}
              style={styles.opcaoCard}
              onPress={() => navigation.navigate(opcao.tela)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.opcaoIconeContainer,
                  { backgroundColor: `${opcao.cor}15` },
                ]}
              >
                <Feather name={opcao.icone} size={24} color={opcao.cor} />
              </View>

              <View style={styles.opcaoConteudo}>
                <Text style={styles.opcaoTitulo}>{opcao.titulo}</Text>
                <Text style={styles.opcaoDescricao}>{opcao.descricao}</Text>
              </View>

              <Feather
                name="chevron-right"
                size={20}
                color={cores.textoSecundario}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Aviso se sem permissões */}
        {opcoesFiltradas.length === 0 && (
          <View style={styles.semPermissao}>
            <Feather name="lock" size={48} color={cores.textoSecundario} />
            <Text style={styles.semPermissaoTitulo}>Acesso Restrito</Text>
            <Text style={styles.semPermissaoDescricao}>
              Você não possui permissões para acessar este módulo.
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

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  scrollContent: {
    padding: espacamento.lg,
    paddingBottom: espacamento.xxl,
  },

  // Seção
  secaoTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginBottom: espacamento.xs,
  },

  secaoDescricao: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    marginBottom: espacamento.lg,
  },

  // Lista de opções
  opcoesList: {
    gap: espacamento.md,
  },

  opcaoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    ...sombras.pequena,
  },

  opcaoIconeContainer: {
    width: 48,
    height: 48,
    borderRadius: bordas.raioMedio,
    alignItems: "center",
    justifyContent: "center",
    marginRight: espacamento.md,
  },

  opcaoConteudo: {
    flex: 1,
  },

  opcaoTitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
    marginBottom: 2,
  },

  opcaoDescricao: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Sem permissão
  semPermissao: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: espacamento.xxl,
  },

  semPermissaoTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginTop: espacamento.md,
    marginBottom: espacamento.sm,
  },

  semPermissaoDescricao: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    textAlign: "center",
  },
});
