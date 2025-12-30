// src/pages/ComunicadoAdmin/index.js
import React, { useState, useCallback, useEffect } from "react";
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
  const [comunicados, setComunicados] = useState([]);

  // Novo comunicado
  const [showNovoForm, setShowNovoForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [prioridade, setPrioridade] = useState("normal");
  const [comunicadoAtivo, setComunicadoAtivo] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET LISTENERS - ATUALIZAÇÃO EM TEMPO REAL
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!socket) return;

    // ✅ LISTENER: Quando um comunicado se torna o único ativo
    const handleSingleActive = (activeId) => {
      console.log("🔔 Socket: comunicado único ativo:", activeId);
      setComunicados((prev) =>
        prev.map((c) => ({
          ...c,
          ativo: c.id === activeId,
        }))
      );
    };

    // ✅ LISTENER: Novo comunicado criado
    const handleNew = (novoComunicado) => {
      console.log("🔔 Socket: novo comunicado:", novoComunicado);
      setComunicados((prev) => [novoComunicado, ...prev]);
    };

    // ✅ LISTENER: Comunicado atualizado
    const handleUpdate = (comunicadoAtualizado) => {
      console.log("🔔 Socket: comunicado atualizado:", comunicadoAtualizado);
      setComunicados((prev) =>
        prev.map((c) =>
          c.id === comunicadoAtualizado.id ? comunicadoAtualizado : c
        )
      );
    };

    // ✅ LISTENER: Comunicado deletado
    const handleDelete = (deletedId) => {
      console.log("🔔 Socket: comunicado deletado:", deletedId);
      setComunicados((prev) => prev.filter((c) => c.id !== deletedId));
    };

    socket.on("comunicado:single_active", handleSingleActive);
    socket.on("comunicado:new", handleNew);
    socket.on("comunicado:update", handleUpdate);
    socket.on("comunicado:delete", handleDelete);

    return () => {
      socket.off("comunicado:single_active", handleSingleActive);
      socket.off("comunicado:new", handleNew);
      socket.off("comunicado:update", handleUpdate);
      socket.off("comunicado:delete", handleDelete);
    };
  }, [socket]);

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR COMUNICADOS (APENAS NO MOUNT)
  // ═══════════════════════════════════════════════════════════════
  const loadComunicados = useCallback(async () => {
    try {
      setLoading(true);
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const token = await AsyncStorage.getItem("@Auth:token");

      const response = await api.get("/comunicados", {
        headers: { Authorization: `Bearer ${token || ongId}` },
      });

      setComunicados(response.data || []);
    } catch (err) {
      console.log("Erro ao carregar comunicados:", err.message);
      Alert.alert("Erro", "Não foi possível carregar os comunicados");
    } finally {
      setLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CRIAR NOVO COMUNICADO
  // ═══════════════════════════════════════════════════════════════
  const handleCriarComunicado = async () => {
    if (!titulo.trim()) {
      Alert.alert("Atenção", "O título do comunicado é obrigatório");
      return;
    }

    if (!mensagem.trim()) {
      Alert.alert("Atenção", "A mensagem do comunicado é obrigatória");
      return;
    }

    // ✅ SE TENTAR CRIAR COMO ATIVO, AVISAR QUE VAI DESATIVAR OS OUTROS
    if (comunicadoAtivo) {
      const ativoExistente = comunicados.find((c) => c.ativo);

      if (ativoExistente) {
        Alert.alert(
          "⚠️ Atenção",
          `Já existe um comunicado ativo: "${ativoExistente.titulo}".\n\nAo ativar este novo comunicado, o anterior será desativado automaticamente.\n\nDeseja continuar?`,
          [
            {
              text: "Continuar",
              style: "default",
              onPress: () => criarComunicado(),
            },
            { text: "Cancelar", style: "cancel" },
          ]
        );
        return;
      }
    }

    criarComunicado();
  };

  const criarComunicado = async () => {
    try {
      setSaving(true);
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const token = await AsyncStorage.getItem("@Auth:token");

      const data = {
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        prioridade,
        ativo: comunicadoAtivo,
      };

      await api.post("/comunicados", data, {
        headers: { Authorization: `Bearer ${token || ongId}` },
      });

      // ✅ NÃO PRECISA RECARREGAR - SOCKET VAI ATUALIZAR
      Alert.alert("Sucesso", "Comunicado criado com sucesso!", [
        { text: "OK" },
      ]);

      // Limpar formulário
      setTitulo("");
      setMensagem("");
      setPrioridade("normal");
      setComunicadoAtivo(false);
      setShowNovoForm(false);

      // ❌ REMOVIDO: loadComunicados() - Socket faz isso agora
    } catch (err) {
      console.error("Erro ao criar comunicado:", err);
      Alert.alert(
        "Erro",
        err.response?.data?.error || "Erro ao criar comunicado"
      );
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ALTERNAR STATUS (ATIVO/INATIVO)
  // ═══════════════════════════════════════════════════════════════
  const handleToggleStatus = async (comunicado) => {
    const novoStatus = !comunicado.ativo;

    // ✅ SE ESTIVER ATIVANDO E JÁ EXISTE OUTRO ATIVO, AVISAR
    if (novoStatus) {
      const outroAtivo = comunicados.find(
        (c) => c.ativo && c.id !== comunicado.id
      );

      if (outroAtivo) {
        Alert.alert(
          "⚠️ Atenção",
          `O comunicado "${outroAtivo.titulo}" está ativo.\n\nAo ativar "${comunicado.titulo}", o anterior será desativado automaticamente.\n\nDeseja continuar?`,
          [
            {
              text: "Continuar",
              style: "default",
              onPress: () => alterarStatus(comunicado, novoStatus),
            },
            { text: "Cancelar", style: "cancel" },
          ]
        );
        return;
      }
    }

    alterarStatus(comunicado, novoStatus);
  };

  const alterarStatus = async (comunicado, novoStatus) => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const token = await AsyncStorage.getItem("@Auth:token");

      await api.put(
        `/comunicados/${comunicado.id}`,
        { ativo: novoStatus },
        {
          headers: { Authorization: `Bearer ${token || ongId}` },
        }
      );

      // ✅ NÃO PRECISA RECARREGAR - SOCKET VAI ATUALIZAR
      Alert.alert(
        "Sucesso",
        novoStatus ? "Comunicado ativado!" : "Comunicado desativado!"
      );

      // ❌ REMOVIDO: loadComunicados() - Socket faz isso agora
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      Alert.alert("Erro", "Erro ao alterar status do comunicado");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // DELETAR COMUNICADO
  // ═══════════════════════════════════════════════════════════════
  const handleDeletarComunicado = (comunicado) => {
    Alert.alert(
      "Confirmar Exclusão",
      `Deseja realmente excluir o comunicado "${comunicado.titulo}"?`,
      [
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const ongId = await AsyncStorage.getItem("@Auth:ongId");
              const token = await AsyncStorage.getItem("@Auth:token");

              await api.delete(`/comunicados/${comunicado.id}`, {
                headers: { Authorization: `Bearer ${token || ongId}` },
              });

              // ✅ NÃO PRECISA RECARREGAR - SOCKET VAI ATUALIZAR
              Alert.alert("Sucesso", "Comunicado excluído com sucesso!");

              // ❌ REMOVIDO: loadComunicados() - Socket faz isso agora
            } catch (err) {
              console.error("Erro ao deletar:", err);
              Alert.alert("Erro", "Erro ao excluir comunicado");
            }
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // FOCUS EFFECT - CARREGA APENAS QUANDO ENTRA NA TELA
  // ═══════════════════════════════════════════════════════════════
  useFocusEffect(
    useCallback(() => {
      loadComunicados();
    }, [loadComunicados])
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

  // ✅ CONTADOR DE COMUNICADOS ATIVOS
  const comunicadosAtivos = comunicados.filter((c) => c.ativo).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ═══════════════════════════════════════════════════════ */}
        {/* CABEÇALHO */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.headerGeral}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={24} color="#10B981" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gerenciar Comunicados</Text>
            <TouchableOpacity
              onPress={() => setShowNovoForm(!showNovoForm)}
              style={styles.backButton}
            >
              <Feather
                name={showNovoForm ? "x" : "plus"}
                size={24}
                color="#10B981"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* FORMULÁRIO NOVO COMUNICADO */}
        {/* ═══════════════════════════════════════════════════════ */}
        {showNovoForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Novo Comunicado</Text>

            {/* ✅ AVISO: APENAS UM COMUNICADO ATIVO */}
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Feather name="info" size={20} color="#10B981" />
              </View>
              <Text style={styles.infoText}>
                Apenas um comunicado pode estar ativo por vez. Ao ativar um
                novo, o anterior será desativado automaticamente.
              </Text>
            </View>

            {/* SWITCH DE ATIVAÇÃO */}
            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Ativar ao criar</Text>
                <Text style={styles.switchDescription}>
                  {comunicadoAtivo
                    ? "Será publicado imediatamente"
                    : "Criado como rascunho"}
                </Text>
              </View>
              <Switch
                value={comunicadoAtivo}
                onValueChange={setComunicadoAtivo}
                trackColor={{ false: "#ccc", true: "#10B981" }}
                thumbColor="#fff"
              />
            </View>

            {/* PRIORIDADE */}
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
                    prioridade === "urgente" &&
                      styles.prioridadeButtonActiveUrgent,
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
                      prioridade === "urgente" &&
                        styles.prioridadeTextActiveUrgent,
                    ]}
                  >
                    Urgente
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* TÍTULO */}
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

            {/* MENSAGEM */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mensagem</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Digite a mensagem do comunicado..."
                value={mensagem}
                onChangeText={setMensagem}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{mensagem.length}/500</Text>
            </View>

            {/* BOTÃO CRIAR */}
            <TouchableOpacity
              style={[styles.button, styles.buttonSave]}
              onPress={handleCriarComunicado}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Criar Comunicado</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* LISTA DE COMUNICADOS */}
        {/* ═══════════════════════════════════════════════════════ */}
        <View style={styles.listContainer}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.listTitle}>
              Comunicados ({comunicados.length})
            </Text>
            {comunicadosAtivos > 0 && (
              <View style={[styles.badge, styles.badgeActive]}>
                <Text style={[styles.badgeText, styles.badgeTextActive]}>
                  {comunicadosAtivos} ATIVO{comunicadosAtivos > 1 ? "S" : ""}
                </Text>
              </View>
            )}
          </View>

          {comunicados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                Nenhum comunicado criado ainda
              </Text>
              <Text style={styles.emptySubtext}>
                Clique no + para criar seu primeiro comunicado
              </Text>
            </View>
          ) : (
            comunicados.map((comunicado) => (
              <View
                key={comunicado.id}
                style={[
                  styles.comunicadoCard,
                  comunicado.prioridade === "urgente" &&
                    styles.comunicadoCardUrgent,
                ]}
              >
                {/* Header do Card */}
                <View style={styles.comunicadoHeader}>
                  <View style={styles.comunicadoHeaderLeft}>
                    <Feather
                      name={
                        comunicado.prioridade === "urgente"
                          ? "alert-triangle"
                          : "info"
                      }
                      size={20}
                      color={
                        comunicado.prioridade === "urgente"
                          ? "#e02041"
                          : "#20a3e0"
                      }
                    />
                    <Text style={styles.comunicadoTitulo}>
                      {comunicado.titulo}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      comunicado.ativo
                        ? styles.badgeActive
                        : styles.badgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        comunicado.ativo
                          ? styles.badgeTextActive
                          : styles.badgeTextInactive,
                      ]}
                    >
                      {comunicado.ativo ? "ATIVO" : "INATIVO"}
                    </Text>
                  </View>
                </View>

                {/* Mensagem */}
                <Text style={styles.comunicadoMensagem} numberOfLines={3}>
                  {comunicado.mensagem}
                </Text>

                {/* Data */}
                <Text style={styles.comunicadoData}>
                  Criado em:{" "}
                  {new Date(comunicado.created_at).toLocaleDateString("pt-BR")}
                </Text>

                {/* Ações */}
                <View style={styles.comunicadoActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      comunicado.ativo
                        ? styles.actionButtonDeactivate
                        : styles.actionButtonActivate,
                    ]}
                    onPress={() => handleToggleStatus(comunicado)}
                  >
                    <Feather
                      name={comunicado.ativo ? "eye-off" : "eye"}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.actionButtonText}>
                      {comunicado.ativo ? "Desativar" : "Ativar"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDelete]}
                    onPress={() => handleDeletarComunicado(comunicado)}
                  >
                    <Feather name="trash-2" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}
