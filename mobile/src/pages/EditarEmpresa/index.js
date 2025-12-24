// src/pages/EditarEmpresa/index.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Feather from "react-native-vector-icons/Feather";
import { TextInputMask } from "react-native-masked-text";

import api from "../../services/api";
import { styles } from "./styles";

// Assets
import logoImg from "../../assets/gd.png";

export default function EditarEmpresa() {
  const navigation = useNavigation();
  const route = useRoute();
  const { empresaId } = route.params;

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [empresa, setEmpresa] = useState(null);

  // Campos do formulário
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR DADOS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar empresa
      const response = await api.get(`empresas-visitantes/${empresaId}`);
      const empresaData = response.data;

      setEmpresa(empresaData);
      setNome(empresaData.nome || "");
      setCnpj(empresaData.cnpj || "");
      setTelefone(empresaData.telefone || "");
      setEmail(empresaData.email || "");
      setEndereco(empresaData.endereco || "");
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados da empresa", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleSalvar = async () => {
    // Validações
    if (!nome.trim()) {
      Alert.alert("Atenção", "O nome da empresa é obrigatório");
      return;
    }

    try {
      setSalvando(true);

      const data = {
        nome: nome.trim(),
        cnpj: cnpj ? cnpj.replace(/\D/g, "") : null,
        telefone: telefone ? telefone.replace(/\D/g, "") : null,
        email: email ? email.trim().toLowerCase() : null,
        endereco: endereco ? endereco.trim() : null,
      };

      await api.put(`empresas-visitantes/${empresaId}`, data);

      Alert.alert("Sucesso!", "Empresa atualizada com sucesso!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      const errorMessage =
        error.response?.data?.error || "Não foi possível atualizar a empresa";
      Alert.alert("Erro", errorMessage);
    } finally {
      setSalvando(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* CABEÇALHO */}
      {/* ═══════════════════════════════════════════════════════ */}
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

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Editar Empresa</Text>
          <Text style={styles.headerSubtitle}>
            ID: {empresaId} (não editável)
          </Text>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FORMULÁRIO */}
      {/* ═══════════════════════════════════════════════════════ */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nome */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Nome da Empresa <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome da empresa"
            value={nome}
            onChangeText={setNome}
          />
        </View>

        {/* CNPJ */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CNPJ</Text>
          <TextInputMask
            type="cnpj"
            style={styles.input}
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChangeText={setCnpj}
            keyboardType="numeric"
          />
        </View>

        {/* Telefone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefone</Text>
          <TextInputMask
            type="cel-phone"
            options={{
              maskType: "BRL",
              withDDD: true,
              dddMask: "(99) ",
            }}
            style={styles.input}
            placeholder="(00) 00000-0000"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="exemplo@empresa.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Endereço */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Endereço</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Rua, número, bairro, cidade - UF"
            value={endereco}
            onChangeText={setEndereco}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, salvando && styles.saveButtonDisabled]}
          onPress={handleSalvar}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}
