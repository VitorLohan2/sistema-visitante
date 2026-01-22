/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: Select
 * Seletor dropdown customizado para formulários
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { cores, tipografia, espacamento, bordas } from "../../styles/tema";

/**
 * Componente Select - Dropdown customizado
 *
 * @param {string} label - Label do campo
 * @param {string} placeholder - Placeholder quando nada selecionado
 * @param {any} value - Valor selecionado (id)
 * @param {function} onValueChange - Callback quando valor muda (recebe o item completo)
 * @param {array} options - Array de opções [{id, nome}]
 * @param {string} labelKey - Campo a ser exibido (padrão: 'nome')
 * @param {string} valueKey - Campo de valor (padrão: 'id')
 * @param {string} icone - Nome do ícone Feather
 * @param {string} erro - Mensagem de erro
 * @param {boolean} obrigatorio - Se o campo é obrigatório
 * @param {boolean} desabilitado - Se o campo está desabilitado
 */
export function Select({
  label,
  placeholder = "Selecione uma opção",
  value,
  onValueChange,
  options = [],
  labelKey = "nome",
  valueKey = "id",
  icone,
  erro,
  obrigatorio = false,
  desabilitado = false,
}) {
  const [modalVisivel, setModalVisivel] = useState(false);

  // Garante que options é sempre um array válido
  const opcoesSeguras = Array.isArray(options)
    ? options.filter((item) => item != null)
    : [];

  // Encontra o item selecionado para exibir
  const itemSelecionado = opcoesSeguras.find(
    (item) => item && item[valueKey] === value,
  );
  const textoExibido = itemSelecionado ? itemSelecionado[labelKey] : null;

  const handleSelecionar = (item) => {
    if (item && onValueChange) {
      onValueChange(item[valueKey], item);
    }
    setModalVisivel(false);
  };

  const handleLimpar = () => {
    if (onValueChange) {
      onValueChange(null, null);
    }
  };

  const renderItem = ({ item }) => {
    if (!item) return null;
    const selecionado = item[valueKey] === value;

    return (
      <TouchableOpacity
        style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
        onPress={() => handleSelecionar(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.opcaoTexto,
            selecionado && styles.opcaoTextoSelecionado,
          ]}
        >
          {item[labelKey]}
        </Text>
        {selecionado && (
          <Feather name="check" size={20} color={cores.destaque} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && (
        <Text style={styles.label}>
          {label}
          {obrigatorio && <Text style={styles.obrigatorio}> *</Text>}
        </Text>
      )}

      {/* Campo */}
      <TouchableOpacity
        style={[
          styles.campo,
          erro && styles.campoErro,
          desabilitado && styles.campoDesabilitado,
        ]}
        onPress={() => !desabilitado && setModalVisivel(true)}
        activeOpacity={desabilitado ? 1 : 0.7}
      >
        {/* Ícone esquerda */}
        {icone && (
          <View style={styles.iconeContainer}>
            <Feather
              name={icone}
              size={20}
              color={erro ? cores.erro : cores.textoSecundario}
            />
          </View>
        )}

        {/* Texto */}
        <Text
          style={[
            styles.texto,
            !textoExibido && styles.placeholder,
            desabilitado && styles.textoDesabilitado,
          ]}
          numberOfLines={1}
        >
          {textoExibido || placeholder}
        </Text>

        {/* Botão limpar ou seta */}
        {textoExibido && !desabilitado ? (
          <TouchableOpacity
            style={styles.botaoLimpar}
            onPress={handleLimpar}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={18} color={cores.textoSecundario} />
          </TouchableOpacity>
        ) : (
          <Feather
            name="chevron-down"
            size={20}
            color={cores.textoSecundario}
          />
        )}
      </TouchableOpacity>

      {/* Erro */}
      {erro && <Text style={styles.erroTexto}>{erro}</Text>}

      {/* Modal de seleção */}
      <Modal
        visible={modalVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <SafeAreaView style={styles.modalContent}>
              {/* Header do modal */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo}>{label || "Selecione"}</Text>
                <TouchableOpacity
                  style={styles.modalFechar}
                  onPress={() => setModalVisivel(false)}
                >
                  <Feather name="x" size={24} color={cores.texto} />
                </TouchableOpacity>
              </View>

              {/* Lista de opções */}
              {opcoesSeguras.length > 0 ? (
                <FlatList
                  data={opcoesSeguras}
                  keyExtractor={(item, index) =>
                    item ? String(item[valueKey]) : String(index)
                  }
                  renderItem={renderItem}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listaContent}
                />
              ) : (
                <View style={styles.vazio}>
                  <Feather
                    name="inbox"
                    size={48}
                    color={cores.textoSecundario}
                  />
                  <Text style={styles.vazioTexto}>
                    Nenhuma opção disponível
                  </Text>
                </View>
              )}
            </SafeAreaView>
          </View>
        </View>
      </Modal>
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
    fontWeight: tipografia.pesoMedium,
    color: cores.texto,
    marginBottom: espacamento.xs,
  },

  obrigatorio: {
    color: cores.erro,
  },

  campo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoCard,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: bordas.medio,
    paddingHorizontal: espacamento.md,
    height: 50,
  },

  campoErro: {
    borderColor: cores.erro,
  },

  campoDesabilitado: {
    backgroundColor: cores.fundoPagina,
    opacity: 0.7,
  },

  iconeContainer: {
    marginRight: espacamento.sm,
  },

  texto: {
    flex: 1,
    fontSize: tipografia.tamanhoTextoNormal,
    color: cores.texto,
  },

  placeholder: {
    color: cores.textoSecundario,
  },

  textoDesabilitado: {
    color: cores.textoTerciario,
  },

  botaoLimpar: {
    padding: espacamento.xs,
  },

  erroTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.erro,
    marginTop: espacamento.xs,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: cores.fundoCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    minHeight: 300,
  },

  modalContent: {
    flex: 1,
    minHeight: 250,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espacamento.lg,
    paddingVertical: espacamento.md,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },

  modalTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  modalFechar: {
    padding: espacamento.xs,
  },

  listaContent: {
    paddingHorizontal: espacamento.lg,
    paddingVertical: espacamento.md,
  },

  opcao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: espacamento.md,
    paddingHorizontal: espacamento.md,
    borderRadius: bordas.medio,
    marginBottom: espacamento.xs,
  },

  opcaoSelecionada: {
    backgroundColor: `${cores.destaque}15`,
  },

  opcaoTexto: {
    fontSize: tipografia.tamanhoTextoNormal,
    color: cores.texto,
  },

  opcaoTextoSelecionado: {
    fontWeight: tipografia.pesoMedium,
    color: cores.destaque,
  },

  vazio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: espacamento.xxl,
  },

  vazioTexto: {
    fontSize: tipografia.tamanhoTextoNormal,
    color: cores.textoSecundario,
    marginTop: espacamento.md,
  },
});

export default Select;
