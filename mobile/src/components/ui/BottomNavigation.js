/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: BottomNavigation
 * Barra de navegação inferior com estilo iOS/Android moderno
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { cores, tipografia, espacamento, sombras } from "../../styles/tema";

/**
 * Item da navegação inferior
 */
function NavItem({ icone, label, rota, ativo, onPress }) {
  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconeContainer, ativo && styles.iconeContainerAtivo]}
      >
        <Feather
          name={icone}
          size={ativo ? 24 : 22}
          color={ativo ? cores.destaque : cores.cinzaEscuro}
        />
      </View>
      <Text style={[styles.label, ativo && styles.labelAtivo]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Botão central destacado
 */
function BotaoCentral({ icone, onPress }) {
  return (
    <TouchableOpacity
      style={styles.botaoCentral}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.botaoCentralConteudo}>
        <Feather name={icone} size={26} color={cores.branco} />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Barra de navegação inferior
 *
 * @param {Array} itens - Array de objetos {icone, label, rota}
 * @param {object} itemCentral - Item central destacado {icone, rota}
 */
export function BottomNavigation({ itens, itemCentral }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const rotaAtual = route.name;

  // Se tem item central, divide os itens em esquerda e direita
  const metade = Math.ceil(itens.length / 2);
  const itensEsquerda = itemCentral ? itens.slice(0, metade) : itens;
  const itensDireita = itemCentral ? itens.slice(metade) : [];

  const handleNavegar = (rota) => {
    navigation.navigate(rota);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom || espacamento.sm },
      ]}
    >
      <View style={styles.conteudo}>
        {/* Itens da esquerda */}
        {itensEsquerda.map((item, index) => (
          <NavItem
            key={item.rota || index}
            icone={item.icone}
            label={item.label}
            rota={item.rota}
            ativo={rotaAtual === item.rota}
            onPress={() => handleNavegar(item.rota)}
          />
        ))}

        {/* Botão Central */}
        {itemCentral && (
          <BotaoCentral
            icone={itemCentral.icone}
            onPress={() => handleNavegar(itemCentral.rota)}
          />
        )}

        {/* Itens da direita */}
        {itensDireita.map((item, index) => (
          <NavItem
            key={item.rota || index}
            icone={item.icone}
            label={item.label}
            rota={item.rota}
            ativo={rotaAtual === item.rota}
            onPress={() => handleNavegar(item.rota)}
          />
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: cores.primaria,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...sombras.grande,
  },

  conteudo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: espacamento.md,
    paddingTop: espacamento.md,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: espacamento.xs,
    minWidth: 60,
  },

  iconeContainer: {
    padding: espacamento.xs,
    borderRadius: 12,
  },

  iconeContainerAtivo: {
    backgroundColor: "rgba(255, 107, 53, 0.1)",
  },

  label: {
    fontSize: tipografia.tamanhoMicro,
    color: cores.cinzaEscuro,
    marginTop: espacamento.xs,
    fontWeight: tipografia.pesoMedio,
  },

  labelAtivo: {
    color: cores.destaque,
    fontWeight: tipografia.pesoSemibold,
  },

  botaoCentral: {
    marginTop: -30,
  },

  botaoCentralConteudo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
    ...sombras.media,
    borderWidth: 4,
    borderColor: cores.fundoPagina,
  },
});

export default BottomNavigation;
