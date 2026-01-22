/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Criar Ticket
 * Formulário para criar novo ticket de suporte
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { Button, Input, Loading, Select } from "../../components";

// Services
import { ticketsService } from "../../services";
import { getCacheAsync } from "../../services/cacheService";

// Contexto
import { useAuth } from "../../contexts/AuthContext";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

// Motivos predefinidos
const MOTIVOS = [
  { id: "suporte_tecnico", nome: "Suporte Técnico" },
  { id: "duvida", nome: "Dúvida" },
  { id: "reclamacao", nome: "Reclamação" },
  { id: "sugestao", nome: "Sugestão" },
  { id: "incidente", nome: "Incidente" },
  { id: "solicitacao", nome: "Solicitação" },
  { id: "outro", nome: "Outro" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function CriarTicket() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();

  // Estados do formulário
  const [form, setForm] = useState({
    funcionario: "",
    motivo: "",
    descricao: "",
    setorResponsavel: "",
    nomeUsuario: usuario?.nome || "",
    setorUsuario: "",
  });

  // Dados de apoio
  const [setores, setSetores] = useState([]);

  // Estados de controle
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR DADOS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setCarregando(true);

      // Carrega setores do cache
      let setoresCache = await getCacheAsync("setores");
      if (!setoresCache || setoresCache.length === 0) {
        setoresCache = await getCacheAsync("setoresVisitantes");
      }

      if (setoresCache && Array.isArray(setoresCache)) {
        setSetores(setoresCache);
      }

      // Preenche dados do usuário
      if (usuario) {
        setForm((prev) => ({
          ...prev,
          nomeUsuario: usuario.nome || "",
          setorUsuario: usuario.setor?.nome || usuario.setor_nome || "",
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setCarregando(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  const validar = () => {
    const novosErros = {};

    if (!form.funcionario?.trim()) {
      novosErros.funcionario = "Informe o funcionário relacionado";
    }

    if (!form.motivo?.trim()) {
      novosErros.motivo = "Selecione o motivo";
    }

    if (!form.descricao?.trim()) {
      novosErros.descricao = "Descreva o problema ou solicitação";
    } else if (form.descricao.trim().length < 10) {
      novosErros.descricao = "Descrição muito curta (mínimo 10 caracteres)";
    }

    if (!form.setorResponsavel?.trim()) {
      novosErros.setorResponsavel = "Selecione o setor responsável";
    }

    if (!form.nomeUsuario?.trim()) {
      novosErros.nomeUsuario = "Informe seu nome";
    }

    if (!form.setorUsuario?.trim()) {
      novosErros.setorUsuario = "Informe seu setor";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    // Limpa erro do campo quando o usuário começa a digitar
    if (erros[campo]) {
      setErros((prev) => ({ ...prev, [campo]: null }));
    }
  };

  const handleSalvar = async () => {
    if (!validar()) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setSalvando(true);

      await ticketsService.criar(form);

      Alert.alert("Sucesso", "Ticket criado com sucesso!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Erro ao criar ticket:", error);
      const mensagem =
        error.response?.data?.error || "Não foi possível criar o ticket.";
      Alert.alert("Erro", mensagem);
    } finally {
      setSalvando(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  if (carregando) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />
        <View
          style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
        >
          <TouchableOpacity
            style={styles.headerVoltar}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={cores.branco} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Criar Ticket</Text>
          <View style={styles.headerEspaco} />
        </View>
        <View style={styles.loadingContainer}>
          <Loading mensagem="Carregando..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
      >
        <TouchableOpacity
          style={styles.headerVoltar}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={cores.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Criar Ticket</Text>
        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo */}
      <KeyboardAvoidingView
        style={styles.conteudo}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Informações do Usuário */}
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Seus Dados</Text>

            <Input
              label="Seu Nome"
              placeholder="Seu nome completo"
              value={form.nomeUsuario}
              onChangeText={(v) => handleChange("nomeUsuario", v)}
              icone="user"
              erro={erros.nomeUsuario}
              obrigatorio
            />

            <Input
              label="Seu Setor"
              placeholder="Setor em que você trabalha"
              value={form.setorUsuario}
              onChangeText={(v) => handleChange("setorUsuario", v)}
              icone="briefcase"
              erro={erros.setorUsuario}
              obrigatorio
            />
          </View>

          {/* Detalhes do Ticket */}
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Detalhes do Ticket</Text>

            <Input
              label="Funcionário Relacionado"
              placeholder="Nome do funcionário envolvido"
              value={form.funcionario}
              onChangeText={(v) => handleChange("funcionario", v)}
              icone="users"
              erro={erros.funcionario}
              obrigatorio
            />

            <Select
              label="Motivo"
              placeholder="Selecione o motivo"
              value={form.motivo}
              onValueChange={(v) => handleChange("motivo", v)}
              options={MOTIVOS}
              icone="tag"
              erro={erros.motivo}
              obrigatorio
            />

            <Select
              label="Setor Responsável"
              placeholder="Selecione o setor responsável"
              value={form.setorResponsavel}
              onValueChange={(v) => handleChange("setorResponsavel", v)}
              options={setores}
              icone="home"
              erro={erros.setorResponsavel}
              obrigatorio
            />

            <Input
              label="Descrição"
              placeholder="Descreva detalhadamente o problema ou solicitação..."
              value={form.descricao}
              onChangeText={(v) => handleChange("descricao", v)}
              multiline
              numberOfLines={5}
              icone="file-text"
              erro={erros.descricao}
              obrigatorio
            />
          </View>

          {/* Botão Salvar */}
          <Button
            titulo={salvando ? "Criando..." : "Criar Ticket"}
            onPress={handleSalvar}
            carregando={salvando}
            icone="send"
            estilo={styles.botaoSalvar}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.primaria,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espacamento.md,
    paddingBottom: espacamento.md,
  },

  headerVoltar: {
    padding: espacamento.xs,
  },

  headerTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },

  headerEspaco: {
    width: 40,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // Conteúdo
  conteudo: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  scrollContent: {
    padding: espacamento.md,
    paddingBottom: espacamento.xxl,
  },

  // Seções
  secao: {
    marginBottom: espacamento.lg,
  },

  secaoTitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginBottom: espacamento.md,
  },

  // Botão
  botaoSalvar: {
    marginTop: espacamento.md,
  },
});
