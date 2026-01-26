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
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { cores, tipografia, espacamento, bordas } from "../../styles/tema";

/**
 * Botão customizado
 *
 * @param {string} variante - "primario" | "secundario" | "outline" | "ghost" | "destaque" | "erro"
 * @param {string} tamanho - "pequeno" | "medio" | "grande"
 * @param {boolean} carregando - Exibe indicador de carregamento
 * @param {boolean} desabilitado - Desabilita o botão
 * @param {string|ReactNode} icone - Nome do ícone Feather ou componente de ícone
 * @param {function} onPress - Callback ao pressionar
 * @param {string} texto - Texto do botão
 * @param {string} titulo - Alias para texto (compatibilidade)
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
  titulo, // Alias para compatibilidade
  estilo,
  estiloTexto,
  children,
  ...props
}) {
  // Usa 'titulo' como fallback se 'texto' não for fornecido
  const textoExibido = texto || titulo;
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
          {icone &&
            (typeof icone === "string" ? (
              <Feather
                name={icone}
                size={
                  tamanho === "pequeno" ? 16 : tamanho === "grande" ? 22 : 18
                }
                color={
                  variante === "outline" || variante === "ghost"
                    ? cores.primaria
                    : variante === "secundario"
                      ? cores.texto
                      : cores.branco
                }
              />
            ) : (
              <>{icone}</>
            ))}
          {(textoExibido || children) && (
            <Text
              style={[
                styles.textoBase,
                estiloAtual.texto,
                icone && styles.textoComIcone,
                estiloTexto,
              ]}
            >
              {textoExibido || children}
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
    gap: espacamento.sm,
  },

  // Tamanhos
  pequeno: {
    paddingVertical: espacamento.sm,
    paddingHorizontal: espacamento.md,
    minHeight: 36,
  },
  medio: {
    paddingVertical: espacamento.md,
    paddingHorizontal: espacamento.lg,
    minHeight: 48,
  },
  grande: {
    paddingVertical: espacamento.md + 4,
    paddingHorizontal: espacamento.xl,
    minHeight: 56,
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
    textAlign: "center",
  },
  textoComIcone: {
    marginLeft: 0,
  },

  // Estados
  desabilitado: {
    opacity: 0.5,
  },
});

export default Button;
