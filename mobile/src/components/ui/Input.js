/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: Input
 * Campo de entrada de texto reutilizável
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { cores, tipografia, espacamento, bordas } from "../../styles/tema";

/**
 * Campo de entrada customizado
 *
 * @param {string} label - Rótulo do campo
 * @param {string} placeholder - Placeholder
 * @param {string} valor - Valor do campo
 * @param {function} onChangeText - Callback de mudança
 * @param {string} erro - Mensagem de erro
 * @param {string} tipo - "texto" | "email" | "senha" | "numero" | "telefone" | "cpf"
 * @param {string|ReactNode} iconeEsquerda - Nome do ícone Feather ou componente
 * @param {string|ReactNode} iconeDireita - Nome do ícone Feather ou componente
 * @param {boolean} desabilitado - Desabilita o campo
 */
export function Input({
  label,
  placeholder,
  valor,
  onChangeText,
  erro,
  tipo = "texto",
  iconeEsquerda,
  iconeDireita,
  desabilitado = false,
  multiline = false,
  numeroLinhas = 1,
  obrigatorio = false,
  estilo,
  estiloContainer,
  ...props
}) {
  const [focado, setFocado] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Renderiza ícone - aceita string (nome Feather) ou componente JSX
  const renderizarIcone = (icone) => {
    if (!icone) return null;
    if (typeof icone === "string") {
      return <Feather name={icone} size={20} color={cores.cinzaEscuro} />;
    }
    return icone;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÕES POR TIPO
  // ═══════════════════════════════════════════════════════════════════════════

  const configuracoesTipo = {
    texto: {
      keyboardType: "default",
      autoCapitalize: "sentences",
    },
    email: {
      keyboardType: "email-address",
      autoCapitalize: "none",
      autoComplete: "email",
    },
    senha: {
      keyboardType: "default",
      autoCapitalize: "none",
      secureTextEntry: !mostrarSenha,
    },
    numero: {
      keyboardType: "numeric",
    },
    telefone: {
      keyboardType: "phone-pad",
    },
    cpf: {
      keyboardType: "numeric",
    },
  };

  const config = configuracoesTipo[tipo] || configuracoesTipo.texto;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <View style={[styles.container, estiloContainer]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {obrigatorio && <Text style={styles.obrigatorio}> *</Text>}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          focado && styles.inputFocado,
          erro && styles.inputErro,
          desabilitado && styles.inputDesabilitado,
        ]}
      >
        {iconeEsquerda && (
          <View style={styles.iconeEsquerda}>
            {renderizarIcone(iconeEsquerda)}
          </View>
        )}

        <TextInput
          style={[
            styles.input,
            iconeEsquerda && styles.inputComIconeEsquerda,
            (iconeDireita || tipo === "senha") && styles.inputComIconeDireita,
            multiline && styles.inputMultiline,
            estilo,
          ]}
          placeholder={placeholder}
          placeholderTextColor={cores.textoClaro}
          value={valor}
          onChangeText={onChangeText}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          editable={!desabilitado}
          multiline={multiline}
          numberOfLines={numeroLinhas}
          {...config}
          {...props}
        />

        {tipo === "senha" && (
          <TouchableOpacity
            style={styles.iconeDireita}
            onPress={() => setMostrarSenha(!mostrarSenha)}
          >
            <Feather
              name={mostrarSenha ? "eye-off" : "eye"}
              size={20}
              color={cores.cinzaEscuro}
            />
          </TouchableOpacity>
        )}

        {iconeDireita && tipo !== "senha" && (
          <View style={styles.iconeDireita}>
            {renderizarIcone(iconeDireita)}
          </View>
        )}
      </View>

      {erro && <Text style={styles.erro}>{erro}</Text>}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    marginBottom: espacamento.md,
  },

  label: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoMedio,
    color: cores.texto,
    marginBottom: espacamento.sm,
  },

  obrigatorio: {
    color: cores.erro,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoInput,
    borderRadius: bordas.raio,
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  inputFocado: {
    borderColor: cores.bordaFocada,
    backgroundColor: cores.branco,
  },

  inputErro: {
    borderColor: cores.erro,
  },

  inputDesabilitado: {
    opacity: 0.6,
  },

  input: {
    flex: 1,
    paddingVertical: espacamento.md - 4,
    paddingHorizontal: espacamento.md,
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
  },

  inputComIconeEsquerda: {
    paddingLeft: espacamento.sm,
  },

  inputComIconeDireita: {
    paddingRight: espacamento.sm,
  },

  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },

  iconeEsquerda: {
    paddingLeft: espacamento.md,
  },

  iconeDireita: {
    paddingRight: espacamento.md,
  },

  erro: {
    fontSize: tipografia.tamanhoPequeno,
    color: cores.erro,
    marginTop: espacamento.xs,
  },
});

export default Input;
