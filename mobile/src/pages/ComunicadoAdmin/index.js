// src/pages/ComunicadoAdmin/index.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "react-native-vector-icons/Feather";

import api from "../../services/api";
import { useSocket } from "../../contexts/SocketContext";
import { styles } from "./styles";

export default function ComunicadoAdmin() {
  const navigation = useNavigation();
  const socket = useSocket();

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comunicadoAtivo, setComunicadoAtivo] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [prioridade, setPrioridade] = useState("normal"); // normal, urgente

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR COMUNICADO EXISTENTE
  // ═══════════════════════════════════════════════════════════════
  const loadComunicado = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      const response = await api.get("/comunicado", {
        headers: { Authorization: ongId },
      });

      if (response.data) {
        setComunicadoAtivo(response.data.ativo || false);
        setTitulo(response.data.titulo || "");
        setMensagem(response.data.mensagem || "");
        setPrioridade(response.data.prioridade || "normal");
      }
    } catch (err) {
      console.log("Nenhum comunicado ativo ou erro:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SALVAR/ATUALIZAR COMUNICADO
  // ═══════════════════════════════════════════════════════════════
  const handleSalvarComunicado = async () => {
    if (!titulo.trim()) {
      Alert.alert("Atenção", "O título do comunicado é obrigatório");
      return;
    }

    if (!mensagem.trim()) {
      Alert.alert("Atenção", "A mensagem do comunicado é obrigatória");
      return;
    }

    try {
      setSaving(true);
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      const data = {
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        prioridade,
        ativo: comunicadoAtivo,
      };

      await api.post("/comunicado", data, {
        headers: { Authorization: ongId },
      });

      // Emitir evento via Socket para atualizar em tempo real
      if (socket?.connected) {
        socket.emit("comunicado:update", data);
      }

      Alert.alert(
        "Sucesso",
        comunicadoAtivo
          ? "Comunicado publicado com sucesso!"
          : "Comunicado salvo como rascunho",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error("Erro ao salvar comunicado:", err);
      Alert.alert(
        "Erro",
        err.response?.data?.error || "Erro ao salvar comunicado"
      );
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // DESATIVAR COMUNICADO
  // ═══════════════════════════════════════════════════════════════
  const handleDesativarComunicado = () => {
    Alert.alert(
      "Desativar Comunicado",
      "Deseja realmente desativar o comunicado? Ele não será mais exibido aos usuários.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desativar",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              const ongId = await AsyncStorage.getItem("@Auth:ongId");

              await api.delete("/comunicado", {
                headers: { Authorization: ongId },
              });

              // Emitir evento via Socket
              if (socket?.connected) {
                socket.emit("comunicado:delete");
              }

              setComunicadoAtivo(false);
              setTitulo("");
              setMensagem("");
              setPrioridade("normal");

              Alert.alert("Sucesso", "Comunicado desativado!");
            } catch (err) {
              Alert.alert("Erro", "Erro ao desativar comunicado");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // FOCUS EFFECT
  // ═══════════════════════════════════════════════════════════════
  useFocusEffect(
    useCallback(() => {
      loadComunicado();
    }, [loadComunicado])
  );

  // ═══════════════════════════════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ═══════════════════════════════════════════════════════ */}
        {/* CABEÇALHO */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#10B981" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gerenciar Comunicado</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* INFORMAÇÃO */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Feather name="info" size={24} color="#10B981" />
          </View>
          <Text style={styles.infoText}>
            O comunicado será exibido na tela inicial para todos os usuários do
            sistema
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SWITCH DE ATIVAÇÃO */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.switchContainer}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Comunicado Ativo</Text>
            <Text style={styles.switchDescription}>
              {comunicadoAtivo
                ? "O comunicado está sendo exibido"
                : "O comunicado está inativo"}
            </Text>
          </View>
          <Switch
            value={comunicadoAtivo}
            onValueChange={setComunicadoAtivo}
            trackColor={{ false: "#ccc", true: "#10B981" }}
            thumbColor="#fff"
          />
        </View>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PRIORIDADE */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nível de Prioridade</Text>
          <View style={styles.prioridadeContainer}>
            <TouchableOpacity
              style={[
                styles.prioridadeButton,
                prioridade === "normal" && styles.prioridadeButtonActive,
              ]}
              onPress={() => setPrioridade("normal")}
            >
              <Feather
                name="info"
                size={20}
                color={prioridade === "normal" ? "#20a3e0" : "#666"}
              />
              <Text
                style={[
                  styles.prioridadeText,
                  prioridade === "normal" && styles.prioridadeTextActive,
                ]}
              >
                Normal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.prioridadeButton,
                prioridade === "urgente" && styles.prioridadeButtonActiveUrgent,
              ]}
              onPress={() => setPrioridade("urgente")}
            >
              <Feather
                name="alert-triangle"
                size={20}
                color={prioridade === "urgente" ? "#e02041" : "#666"}
              />
              <Text
                style={[
                  styles.prioridadeText,
                  prioridade === "urgente" && styles.prioridadeTextActiveUrgent,
                ]}
              >
                Urgente
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TÍTULO */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Título do Comunicado</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Manutenção no Sistema"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={100}
          />
          <Text style={styles.charCount}>{titulo.length}/100</Text>
        </View>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MENSAGEM */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensagem</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Digite a mensagem do comunicado..."
            value={mensagem}
            onChangeText={setMensagem}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{mensagem.length}/500</Text>
        </View>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PRÉ-VISUALIZAÇÃO */}
        {/* ═══════════════════════════════════════════════════════ */}
        {(titulo || mensagem) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pré-visualização</Text>
            <View
              style={[
                styles.previewCard,
                prioridade === "urgente" && styles.previewCardUrgent,
              ]}
            >
              <View style={styles.previewHeader}>
                <Feather
                  name={prioridade === "urgente" ? "alert-triangle" : "info"}
                  size={20}
                  color={prioridade === "urgente" ? "#e02041" : "#20a3e0"}
                />
                <Text style={styles.previewTitle}>
                  {titulo || "Título do comunicado"}
                </Text>
              </View>
              <Text style={styles.previewMessage}>
                {mensagem || "Mensagem do comunicado..."}
              </Text>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* BOTÕES DE AÇÃO */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSave]}
            onPress={handleSalvarComunicado}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.buttonText}>
                  {comunicadoAtivo ? "Publicar" : "Salvar Rascunho"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {(titulo || mensagem) && (
            <TouchableOpacity
              style={[styles.button, styles.buttonDelete]}
              onPress={handleDesativarComunicado}
              disabled={saving}
            >
              <Feather name="trash-2" size={20} color="#fff" />
              <Text style={styles.buttonText}>Desativar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}
