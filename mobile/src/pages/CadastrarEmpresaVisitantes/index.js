// src/pages/CadastrarEmpresa/index.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";

import api from "../../services/api";
import logoImg from "../../assets/gd.png";

export default function CadastrarEmpresa() {
  const navigation = useNavigation();

  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [loading, setLoading] = useState(false);

  // Formatar CNPJ
  const formatarCNPJ = (text) => {
    const cleaned = text.replace(/\D/g, "");
    const formatted = cleaned
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
    return formatted;
  };

  // Formatar Telefone
  const formatarTelefone = (text) => {
    const cleaned = text.replace(/\D/g, "");
    const formatted = cleaned
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
    return formatted;
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      Alert.alert("Erro", "Nome da empresa é obrigatório");
      return;
    }

    try {
      setLoading(true);
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      await api.post(
        "/empresas-visitantes",
        {
          nome: nome.trim(),
          cnpj: cnpj.replace(/\D/g, ""),
          telefone: telefone.replace(/\D/g, ""),
          email: email.trim(),
          endereco: endereco.trim(),
        },
        {
          headers: { Authorization: ongId },
        }
      );

      Alert.alert("Sucesso", "Empresa cadastrada com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            setNome("");
            setCnpj("");
            setTelefone("");
            setEmail("");
            setEndereco("");
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error("Erro ao cadastrar empresa:", error);
      Alert.alert(
        "Erro",
        error.response?.data?.error || "Erro ao cadastrar empresa"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Image source={logoImg} style={styles.logo} />
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Feather name="arrow-left" size={24} color="#10B981" />
              </TouchableOpacity>
            </View>
            <Text style={styles.pageTitle}>Cadastrar Empresa</Text>
            <Text style={styles.pageDescription}>
              Adicione uma nova empresa ao sistema
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome da Empresa *</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o nome da empresa"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CNPJ *</Text>
              <TextInput
                style={styles.input}
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChangeText={(text) => setCnpj(formatarCNPJ(text))}
                keyboardType="numeric"
                maxLength={18}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                value={telefone}
                onChangeText={(text) => setTelefone(formatarTelefone(text))}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="empresa@exemplo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Endereço</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Digite o endereço completo"
                value={endereco}
                onChangeText={setEndereco}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Cadastrando..." : "Cadastrar Empresa"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logoRow: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: { width: 54, height: 60 },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: "#f0fdf4" },
  pageTitle: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  pageDescription: { fontSize: 14, color: "#64748b", marginTop: 4 },
  form: { padding: 16, paddingTop: 24 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  textArea: { minHeight: 100 },
  submitButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: "#94a3b8" },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
};
