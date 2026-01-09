// src/pages/CadastrarFuncionario/index.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";
import { Picker } from "@react-native-picker/picker";

import api from "../../services/api";
import { styles } from "./styles";

// Dados estruturais dos setores e funções
const setoresEFuncoes = {
  EXPEDIÇÃO: [
    "TRAINEE GESTÃO LOGÍSTICA",
    "TRAINEE ASSIST. DE EXPEDIÇÃO",
    "ASSISTENTE DE EXPEDIÇÃO I",
    "ASSIST. DE EXPEDIÇÃO II",
    "ASSIST. DE EXPEDIÇÃO III",
    "ASSIST. DE EXPEDIÇÃO IV",
    "AUXILIAR DE EXPEDIÇÃO",
    "ASSIST. DE SALA NOBRE",
    "CONFERENTE DE CARGA I",
    "CONFERENTE DE CARGA II",
    "AUX. CONFERENTE DE CARGA",
    "MECANICO DE VEICULOS",
    "MANOBRISTA",
    "LAVADOR DE VEICULOS II",
  ],
  ADMINISTRATIVO: [
    "ASSISTENTE ADMINISTRATIVO",
    "ANALISTA ADMINISTRATIVO",
    "GERENTE ADMINISTRATIVO",
  ],
};

export default function CadastrarFuncionario() {
  const navigation = useNavigation();

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════
  const [form, setForm] = useState({
    cracha: "",
    nome: "",
    setor: "",
    funcao: "",
    data_admissao: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [funcoesDisponiveis, setFuncoesDisponiveis] = useState([]);
  const [userType, setUserType] = useState(null);

  // ═══════════════════════════════════════════════════════════════
  // VERIFICAR AUTENTICAÇÃO ADM
  // ═══════════════════════════════════════════════════════════════
  const checkAuth = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const ongType = await AsyncStorage.getItem("@Auth:ongType");

      if (!ongId) {
        Alert.alert("Sessão Expirada", "Faça login novamente.");
        navigation.reset({ index: 0, routes: [{ name: "Logon" }] });
        return false;
      }

      if (ongType !== "ADM" && ongType !== "ADMIN") {
        Alert.alert(
          "Acesso Negado",
          "Somente administradores podem cadastrar funcionários"
        );
        navigation.goBack();
        return false;
      }

      setUserType(ongType);
      return true;
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      navigation.goBack();
      return false;
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [checkAuth])
  );

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR FUNÇÕES QUANDO SETOR MUDA
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (form.setor && setoresEFuncoes[form.setor]) {
      setFuncoesDisponiveis(setoresEFuncoes[form.setor]);
      setForm((prev) => ({ ...prev, funcao: "" }));
    } else {
      setFuncoesDisponiveis([]);
    }
  }, [form.setor]);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleCrachaChange = (text) => {
    // Remove todos os caracteres não numéricos
    const value = text.replace(/\D/g, "");
    setForm({ ...form, cracha: value });
  };

  const handleNomeChange = (text) => {
    // Converte para maiúsculas
    setForm({ ...form, nome: text.toUpperCase() });
  };

  const handleSubmit = async () => {
    // Validações
    if (!form.cracha.trim()) {
      Alert.alert("Erro", "Por favor, informe o crachá");
      return;
    }

    if (!form.nome.trim()) {
      Alert.alert("Erro", "Por favor, informe o nome");
      return;
    }

    if (!form.setor) {
      Alert.alert("Erro", "Por favor, selecione o setor");
      return;
    }

    if (!form.funcao) {
      Alert.alert("Erro", "Por favor, selecione a função");
      return;
    }

    if (!form.data_admissao) {
      Alert.alert("Erro", "Por favor, informe a data de admissão");
      return;
    }

    try {
      setLoading(true);
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      await api.post("/funcionarios", form, {
        headers: { Authorization: ongId },
      });

      Alert.alert("Sucesso", "Funcionário cadastrado com sucesso!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Erro ao cadastrar funcionário:", error);

      if (error.response?.status === 403) {
        Alert.alert(
          "Acesso Negado",
          "Somente administradores podem cadastrar funcionários"
        );
        navigation.goBack();
        return;
      }

      Alert.alert(
        "Erro",
        error.response?.data?.error || "Erro ao cadastrar funcionário"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (
      form.cracha ||
      form.nome ||
      form.setor ||
      form.funcao ||
      form.data_admissao !== new Date().toISOString().split("T")[0]
    ) {
      Alert.alert(
        "Cancelar Cadastro",
        "Deseja realmente cancelar? Os dados não serão salvos.",
        [
          { text: "Não", style: "cancel" },
          { text: "Sim", onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#2083e0" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Cadastrar Funcionário</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* FORMULÁRIO */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            {/* CRACHÁ */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Crachá <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Feather
                  name="hash"
                  size={20}
                  color="#94a3b8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={form.cracha}
                  onChangeText={handleCrachaChange}
                  placeholder="Digite o número do crachá"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  maxLength={20}
                />
              </View>
            </View>

            {/* NOME */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nome Completo <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Feather
                  name="user"
                  size={20}
                  color="#94a3b8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={form.nome}
                  onChangeText={handleNomeChange}
                  placeholder="Digite o nome completo"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* SETOR */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Setor <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                <Feather
                  name="briefcase"
                  size={20}
                  color="#94a3b8"
                  style={styles.pickerIcon}
                />
                <Picker
                  selectedValue={form.setor}
                  onValueChange={(value) => setForm({ ...form, setor: value })}
                  style={styles.picker}
                  dropdownIconColor="#2083e0"
                >
                  <Picker.Item label="Selecione um setor" value="" />
                  {Object.keys(setoresEFuncoes).map((setor) => (
                    <Picker.Item key={setor} label={setor} value={setor} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* FUNÇÃO */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Função <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.pickerContainer,
                  !form.setor && styles.pickerContainerDisabled,
                ]}
              >
                <Feather
                  name="award"
                  size={20}
                  color={!form.setor ? "#cbd5e1" : "#94a3b8"}
                  style={styles.pickerIcon}
                />
                <Picker
                  enabled={!!form.setor}
                  selectedValue={form.funcao}
                  onValueChange={(value) => setForm({ ...form, funcao: value })}
                  style={styles.picker}
                  dropdownIconColor={!form.setor ? "#cbd5e1" : "#2083e0"}
                >
                  <Picker.Item
                    label={
                      !form.setor
                        ? "Selecione um setor primeiro"
                        : "Selecione uma função"
                    }
                    value=""
                  />
                  {funcoesDisponiveis.map((funcao) => (
                    <Picker.Item key={funcao} label={funcao} value={funcao} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* DATA DE ADMISSÃO */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Data de Admissão <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Feather
                  name="calendar"
                  size={20}
                  color="#94a3b8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={form.data_admissao}
                  onChangeText={(text) =>
                    setForm({ ...form, data_admissao: text })
                  }
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <Text style={styles.helperText}>
                Formato: AAAA-MM-DD (ex: 2024-01-15)
              </Text>
            </View>

            {/* INFORMAÇÃO */}
            <View style={styles.infoBox}>
              <Feather name="info" size={16} color="#2083e0" />
              <Text style={styles.infoText}>
                Todos os campos marcados com * são obrigatórios
              </Text>
            </View>
          </View>

          {/* BOTÕES */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.buttonTextPrimary}>Salvando...</Text>
              ) : (
                <>
                  <Feather name="check" size={20} color="#fff" />
                  <Text style={styles.buttonTextPrimary}>
                    Cadastrar Funcionário
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Feather name="x" size={20} color="#64748b" />
              <Text style={styles.buttonTextSecondary}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.margin} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
