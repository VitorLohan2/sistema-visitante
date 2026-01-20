/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: Button
 * Botão reutilizável com variantes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { cores, tipografia, espacamento, bordas } from "../../styles/tema";

/**
 * Botão customizado
 *
 * @param {string} variante - "primario" | "secundario" | "outline" | "ghost" | "destaque"
 * @param {string} tamanho - "pequeno" | "medio" | "grande"
 * @param {boolean} carregando - Exibe indicador de carregamento
 * @param {boolean} desabilitado - Desabilita o botão
 * @param {ReactNode} icone - Ícone opcional à esquerda
 * @param {function} onPress - Callback ao pressionar
 * @param {string} texto - Texto do botão
 * @param {object} estilo - Estilos adicionais
 */
export function Button({
  variante = "primario",
  tamanho = "medio",
  carregando = false,
  desabilitado = false,
  icone,
  onPress,
  texto,
  estilo,
  estiloTexto,
  children,
  ...props
}) {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTILOS DINÂMICOS
  // ═══════════════════════════════════════════════════════════════════════════

  const estilosVariante = {
    primario: {
      container: styles.primario,
      texto: styles.textoPrimario,
    },
    secundario: {
      container: styles.secundario,
      texto: styles.textoSecundario,
    },
    outline: {
      container: styles.outline,
      texto: styles.textoOutline,
    },
    ghost: {
      container: styles.ghost,
      texto: styles.textoGhost,
    },
    destaque: {
      container: styles.destaque,
      texto: styles.textoDestaque,
    },
    erro: {
      container: styles.erro,
      texto: styles.textoErro,
    },
  };

  const estilosTamanho = {
    pequeno: styles.pequeno,
    medio: styles.medio,
    grande: styles.grande,
  };

  const estiloAtual = estilosVariante[variante] || estilosVariante.primario;
  const tamanhoAtual = estilosTamanho[tamanho] || estilosTamanho.medio;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <TouchableOpacity
      style={[
        styles.base,
        estiloAtual.container,
        tamanhoAtual,
        desabilitado && styles.desabilitado,
        estilo,
      ]}
      onPress={onPress}
      disabled={desabilitado || carregando}
      activeOpacity={0.7}
      {...props}
    >
      {carregando ? (
        <ActivityIndicator
          color={
            variante === "outline" || variante === "ghost"
              ? cores.primaria
              : cores.branco
          }
          size="small"
        />
      ) : (
        <>
          {icone && <>{icone}</>}
          {(texto || children) && (
            <Text
              style={[
                styles.textoBase,
                estiloAtual.texto,
                icone && styles.textoComIcone,
                estiloTexto,
              ]}
            >
              {texto || children}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Base
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: bordas.raio,
  },

  // Tamanhos
  pequeno: {
    paddingVertical: espacamento.sm,
    paddingHorizontal: espacamento.md,
  },
  medio: {
    paddingVertical: espacamento.md - 4,
    paddingHorizontal: espacamento.lg,
  },
  grande: {
    paddingVertical: espacamento.md,
    paddingHorizontal: espacamento.xl,
  },

  // Variantes - Container
  primario: {
    backgroundColor: cores.primaria,
  },
  secundario: {
    backgroundColor: cores.cinzaClaro,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: cores.primaria,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  destaque: {
    backgroundColor: cores.destaque,
  },
  erro: {
    backgroundColor: cores.erro,
  },

  // Variantes - Texto
  textoPrimario: {
    color: cores.branco,
  },
  textoSecundario: {
    color: cores.texto,
  },
  textoOutline: {
    color: cores.primaria,
  },
  textoGhost: {
    color: cores.primaria,
  },
  textoDestaque: {
    color: cores.branco,
  },
  textoErro: {
    color: cores.branco,
  },

  // Texto base
  textoBase: {
    fontSize: tipografia.tamanhoTexto,
    fontWeight: tipografia.pesoSemibold,
  },
  textoComIcone: {
    marginLeft: espacamento.sm,
  },

  // Estados
  desabilitado: {
    opacity: 0.5,
  },
});

export default Button;
