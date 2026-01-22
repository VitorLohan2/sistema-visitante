/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Visualizar Visitante (COMPLETO - Com Modal de Registro)
 * Exibe detalhes completos de um visitante e permite registrar entrada/saída
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { Button, Card, Loading, Select } from "../../components";

// Services
import { visitantesService, dadosApoioService } from "../../services";
import { getCacheAsync, setCache } from "../../services/cacheService";

// Hooks
import { usePermissoes } from "../../hooks";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function VisualizarVisitante() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { temPermissao } = usePermissoes();
  const { visitante } = route.params || {};

  // Estados
  const [registrandoEntrada, setRegistrandoEntrada] = useState(false);
  const [registrandoSaida, setRegistrandoSaida] = useState(false);

  // Modal de registro de visita
  const [modalVisivel, setModalVisivel] = useState(false);
  const [responsaveis, setResponsaveis] = useState([]);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState("");
  const [observacaoVisita, setObservacaoVisita] = useState("");
  const [carregandoResponsaveis, setCarregandoResponsaveis] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR RESPONSÁVEIS
  // ═══════════════════════════════════════════════════════════════════════════

  const carregarResponsaveis = async () => {
    try {
      setCarregandoResponsaveis(true);

      // Tenta pegar do cache primeiro
      let resp = await getCacheAsync("responsaveis");

      if (!resp) {
        resp = await dadosApoioService.listarResponsaveis(false);
        await setCache("responsaveis", resp);
      }

      // Formata para o Select
      const responsaveisFormatados = (resp || []).map((r) => ({
        id: r.id || r.nome,
        nome: r.nome,
      }));

      setResponsaveis(responsaveisFormatados);
    } catch (error) {
      console.error("Erro ao carregar responsáveis:", error);
    } finally {
      setCarregandoResponsaveis(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATADORES
  // ═══════════════════════════════════════════════════════════════════════════

  const formatarCPF = (cpf) => {
    if (!cpf) return "-";
    const numeros = cpf.replace(/\D/g, "");
    return numeros
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2");
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return "-";
    const numeros = telefone.replace(/\D/g, "");
    if (numeros.length <= 10) {
      return numeros
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numeros
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  const formatarData = (data) => {
    if (!data) return "-";
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleEditar = () => {
    navigation.navigate("EditarCadastroVisitante", { visitante });
  };

  const handleLigar = () => {
    if (visitante?.telefone) {
      Linking.openURL(`tel:${visitante.telefone.replace(/\D/g, "")}`);
    }
  };

  const handleEnviarEmail = () => {
    if (visitante?.email) {
      Linking.openURL(`mailto:${visitante.email}`);
    }
  };

  // Abre o modal para selecionar responsável
  const handleAbrirModalEntrada = async () => {
    // Verifica se visitante está bloqueado
    if (visitante?.bloqueado) {
      Alert.alert(
        "Acesso Bloqueado",
        "Este visitante está bloqueado e não pode fazer check-in.",
        [{ text: "OK" }],
      );
      return;
    }

    await carregarResponsaveis();
    setResponsavelSelecionado("");
    setObservacaoVisita("");
    setModalVisivel(true);
  };

  // Registra a entrada após selecionar responsável
  const handleConfirmarEntrada = async () => {
    if (!responsavelSelecionado) {
      Alert.alert(
        "Atenção",
        "Por favor, selecione o responsável pela liberação.",
      );
      return;
    }

    try {
      setRegistrandoEntrada(true);
      setModalVisivel(false);

      // Encontra o nome do responsável
      const respNome =
        responsaveis.find((r) => r.id === responsavelSelecionado)?.nome ||
        responsavelSelecionado;

      // Prepara os dados completos para a visita
      const dadosVisita = {
        nome: visitante.nome,
        cpf: visitante.cpf?.replace(/\D/g, "") || "",
        empresa: visitante.empresa || visitante.empresa_nome || "",
        setor: visitante.setor || visitante.setor_nome || "",
        placa_veiculo: visitante.placa_veiculo || "",
        cor_veiculo: visitante.cor_veiculo_nome || visitante.cor_veiculo || "",
        tipo_veiculo:
          visitante.tipo_veiculo_nome || visitante.tipo_veiculo || "",
        funcao: visitante.funcao_nome || visitante.funcao || "",
        responsavel: respNome,
        observacao: observacaoVisita || "",
      };

      console.log("📡 Registrando entrada:", dadosVisita);

      await visitantesService.registrarEntrada(dadosVisita);

      Alert.alert("Sucesso", "Entrada registrada com sucesso!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (erro) {
      console.error("Erro ao registrar entrada:", erro);
      Alert.alert(
        "Erro",
        erro.response?.data?.message ||
          erro.response?.data?.error ||
          "Não foi possível registrar a entrada. Verifique os dados e tente novamente.",
      );
    } finally {
      setRegistrandoEntrada(false);
    }
  };

  const handleRegistrarSaida = async () => {
    Alert.alert(
      "Registrar Saída",
      `Confirma a saída do visitante ${visitante?.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setRegistrandoSaida(true);
              await visitantesService.registrarSaida(visitante.id);
              Alert.alert("Sucesso", "Saída registrada com sucesso!", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (erro) {
              console.error("Erro ao registrar saída:", erro);
              Alert.alert("Erro", "Não foi possível registrar a saída.");
            } finally {
              setRegistrandoSaida(false);
            }
          },
        },
      ],
    );
  };

  const handleVerHistorico = () => {
    navigation.navigate("HistoricoVisitante", { visitanteId: visitante.id });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENTES AUXILIARES
  // ═══════════════════════════════════════════════════════════════════════════

  const InfoItem = ({ icone, titulo, valor }) => (
    <View style={styles.infoItem}>
      <View style={styles.infoIcone}>
        <Feather name={icone} size={18} color={cores.textoSecundario} />
      </View>
      <View style={styles.infoConteudo}>
        <Text style={styles.infoTitulo}>{titulo}</Text>
        <Text style={styles.infoValor}>{valor || "-"}</Text>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  if (!visitante) {
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
          <Text style={styles.headerTitulo}>Visitante</Text>
          <View style={styles.headerEspaco} />
        </View>
        <View style={styles.vazio}>
          <Feather name="user-x" size={64} color={cores.textoSecundario} />
          <Text style={styles.vazioTexto}>Visitante não encontrado</Text>
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
        <Text style={styles.headerTitulo}>Detalhes do Visitante</Text>
        <View style={styles.headerEspaco} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Principal */}
        <View style={styles.cardPrincipal}>
          {/* Foto */}
          <View style={styles.fotoContainer}>
            {visitante.foto_url || visitante.avatar_imagem ? (
              <Image
                source={{ uri: visitante.foto_url || visitante.avatar_imagem }}
                style={styles.foto}
              />
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Text style={styles.fotoTexto}>
                  {visitante.nome?.charAt(0)?.toUpperCase() || "V"}
                </Text>
              </View>
            )}
          </View>

          {/* Nome e Status */}
          <Text style={styles.nome}>{visitante.nome}</Text>
          <Text style={styles.empresa}>
            {visitante.empresa?.nome ||
              visitante.empresa_nome ||
              visitante.empresa ||
              "Sem empresa"}
          </Text>

          {/* Badges */}
          <View style={styles.badges}>
            {visitante.bloqueado ? (
              <View style={[styles.badge, styles.badgeBloqueado]}>
                <Feather name="lock" size={14} color={cores.erro} />
                <Text style={styles.badgeTextoBloqueado}>Bloqueado</Text>
              </View>
            ) : visitante.ativo !== false ? (
              <View style={[styles.badge, styles.badgeAtivo]}>
                <Feather name="check-circle" size={14} color={cores.sucesso} />
                <Text style={styles.badgeTextoAtivo}>Ativo</Text>
              </View>
            ) : null}

            {(visitante.funcao || visitante.funcao_nome) && (
              <View style={[styles.badge, styles.badgeFuncao]}>
                <Feather name="briefcase" size={14} color={cores.info} />
                <Text style={styles.badgeTextoFuncao}>
                  {visitante.funcao || visitante.funcao_nome}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Ações Rápidas */}
        <View style={styles.acoesRapidas}>
          {visitante.telefone && (
            <TouchableOpacity style={styles.acaoRapida} onPress={handleLigar}>
              <View
                style={[
                  styles.acaoRapidaIcone,
                  { backgroundColor: `${cores.sucesso}15` },
                ]}
              >
                <Feather name="phone" size={20} color={cores.sucesso} />
              </View>
              <Text style={styles.acaoRapidaTexto}>Ligar</Text>
            </TouchableOpacity>
          )}

          {visitante.email && (
            <TouchableOpacity
              style={styles.acaoRapida}
              onPress={handleEnviarEmail}
            >
              <View
                style={[
                  styles.acaoRapidaIcone,
                  { backgroundColor: `${cores.info}15` },
                ]}
              >
                <Feather name="mail" size={20} color={cores.info} />
              </View>
              <Text style={styles.acaoRapidaTexto}>E-mail</Text>
            </TouchableOpacity>
          )}

          {temPermissao("historico_visualizar") && (
            <TouchableOpacity
              style={styles.acaoRapida}
              onPress={handleVerHistorico}
            >
              <View
                style={[
                  styles.acaoRapidaIcone,
                  { backgroundColor: `${cores.alerta}15` },
                ]}
              >
                <Feather name="clock" size={20} color={cores.alerta} />
              </View>
              <Text style={styles.acaoRapidaTexto}>Histórico</Text>
            </TouchableOpacity>
          )}

          {temPermissao("cadastro_editar") && (
            <TouchableOpacity style={styles.acaoRapida} onPress={handleEditar}>
              <View
                style={[
                  styles.acaoRapidaIcone,
                  { backgroundColor: `${cores.roxo}15` },
                ]}
              >
                <Feather name="edit-2" size={20} color={cores.roxo} />
              </View>
              <Text style={styles.acaoRapidaTexto}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dados Pessoais */}
        <Card titulo="Dados Pessoais" style={styles.card}>
          <InfoItem
            icone="user"
            titulo="Nome Completo"
            valor={visitante.nome}
          />
          <InfoItem
            icone="credit-card"
            titulo="CPF"
            valor={formatarCPF(visitante.cpf)}
          />
          <InfoItem
            icone="calendar"
            titulo="Nascimento"
            valor={formatarData(visitante.nascimento)}
          />
        </Card>

        {/* Contato */}
        <Card titulo="Contato" style={styles.card}>
          <InfoItem
            icone="phone"
            titulo="Telefone"
            valor={formatarTelefone(visitante.telefone)}
          />
          <InfoItem icone="mail" titulo="E-mail" valor={visitante.email} />
        </Card>

        {/* Empresa */}
        <Card titulo="Empresa" style={styles.card}>
          <InfoItem
            icone="briefcase"
            titulo="Empresa"
            valor={
              visitante.empresa?.nome ||
              visitante.empresa_nome ||
              visitante.empresa
            }
          />
          <InfoItem
            icone="grid"
            titulo="Setor"
            valor={
              visitante.setor?.nome || visitante.setor_nome || visitante.setor
            }
          />
          <InfoItem
            icone="award"
            titulo="Função"
            valor={visitante.funcao || visitante.funcao_nome}
          />
        </Card>

        {/* Veículo (se houver) */}
        {(visitante.placa_veiculo ||
          visitante.tipo_veiculo ||
          visitante.cor_veiculo) && (
          <Card titulo="Veículo" style={styles.card}>
            <InfoItem
              icone="hash"
              titulo="Placa"
              valor={visitante.placa_veiculo}
            />
            <InfoItem
              icone="truck"
              titulo="Tipo"
              valor={visitante.tipo_veiculo_nome || visitante.tipo_veiculo}
            />
            <InfoItem
              icone="droplet"
              titulo="Cor"
              valor={visitante.cor_veiculo_nome || visitante.cor_veiculo}
            />
          </Card>
        )}

        {/* Observações */}
        {visitante.observacao && (
          <Card titulo="Observações" style={styles.card}>
            <Text style={styles.observacao}>{visitante.observacao}</Text>
          </Card>
        )}

        {/* Botões de Registro */}
        <View style={styles.botoesRegistro}>
          <Button
            titulo={
              visitante.bloqueado ? "Visitante Bloqueado" : "Registrar Entrada"
            }
            onPress={handleAbrirModalEntrada}
            carregando={registrandoEntrada}
            variante="primario"
            icone={visitante.bloqueado ? "lock" : "log-in"}
            estilo={{ flex: 1 }}
            desabilitado={visitante.bloqueado}
          />
          <Button
            titulo="Registrar Saída"
            onPress={handleRegistrarSaida}
            carregando={registrandoSaida}
            variante="secundario"
            icone="log-out"
            estilo={{ flex: 1 }}
          />
        </View>
      </ScrollView>

      {/* Modal de Registro de Entrada */}
      <Modal
        visible={modalVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header do Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Registrar Entrada</Text>
              <TouchableOpacity
                style={styles.modalFechar}
                onPress={() => setModalVisivel(false)}
              >
                <Feather name="x" size={24} color={cores.texto} />
              </TouchableOpacity>
            </View>

            {/* Conteúdo do Modal */}
            <ScrollView style={styles.modalScroll}>
              {/* Info do Visitante */}
              <View style={styles.modalVisitanteInfo}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarTexto}>
                    {visitante.nome?.charAt(0)?.toUpperCase() || "V"}
                  </Text>
                </View>
                <View style={styles.modalVisitanteTextos}>
                  <Text style={styles.modalVisitanteNome}>
                    {visitante.nome}
                  </Text>
                  <Text style={styles.modalVisitanteEmpresa}>
                    {visitante.empresa_nome ||
                      visitante.empresa ||
                      "Sem empresa"}
                  </Text>
                </View>
              </View>

              {/* Select de Responsável */}
              {carregandoResponsaveis ? (
                <View style={styles.carregandoContainer}>
                  <Loading mensagem="Carregando responsáveis..." />
                </View>
              ) : (
                <Select
                  label="Responsável pela Liberação"
                  placeholder="Selecione quem está liberando"
                  value={responsavelSelecionado}
                  onValueChange={(valor) => setResponsavelSelecionado(valor)}
                  options={responsaveis}
                  icone="user-check"
                  obrigatorio
                />
              )}

              {/* Campo de Observação */}
              <View style={styles.campoContainer}>
                <Text style={styles.campoLabel}>Observação (opcional)</Text>
                <TextInput
                  style={styles.campoTextArea}
                  placeholder="Informe algo relevante sobre a visita..."
                  placeholderTextColor={cores.textoSecundario}
                  value={observacaoVisita}
                  onChangeText={setObservacaoVisita}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Botões do Modal */}
            <View style={styles.modalBotoes}>
              <Button
                titulo="Cancelar"
                onPress={() => setModalVisivel(false)}
                variante="outline"
                tamanho="grande"
                estilo={{ flex: 1 }}
              />
              <Button
                titulo="Confirmar Entrada"
                onPress={handleConfirmarEntrada}
                carregando={registrandoEntrada}
                variante="primario"
                icone="check"
                tamanho="grande"
                estilo={{ flex: 1 }}
              />
            </View>
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

  scroll: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  scrollContent: {
    padding: espacamento.lg,
    paddingBottom: espacamento.xxl,
  },

  // Vazio
  vazio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  vazioTexto: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.textoSecundario,
    marginTop: espacamento.md,
  },

  // Card Principal
  cardPrincipal: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioGrande,
    padding: espacamento.lg,
    alignItems: "center",
    marginBottom: espacamento.lg,
    ...sombras.media,
  },

  fotoContainer: {
    marginBottom: espacamento.md,
  },

  foto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: cores.destaque,
  },

  fotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
  },

  fotoTexto: {
    fontSize: 36,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },

  nome: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    textAlign: "center",
    marginBottom: espacamento.xs,
  },

  empresa: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    textAlign: "center",
    marginBottom: espacamento.md,
  },

  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.sm,
    justifyContent: "center",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: espacamento.sm,
    paddingVertical: espacamento.xs,
    borderRadius: bordas.raioPequeno,
    gap: 4,
  },

  badgeAtivo: {
    backgroundColor: `${cores.sucesso}15`,
  },

  badgeTextoAtivo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.sucesso,
  },

  badgeBloqueado: {
    backgroundColor: `${cores.erro}15`,
  },

  badgeTextoBloqueado: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.erro,
  },

  badgeFuncao: {
    backgroundColor: `${cores.info}15`,
  },

  badgeTextoFuncao: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.info,
  },

  // Ações Rápidas
  acoesRapidas: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: espacamento.lg,
  },

  acaoRapida: {
    alignItems: "center",
    gap: espacamento.xs,
  },

  acaoRapidaIcone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  acaoRapidaTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Cards
  card: {
    marginBottom: espacamento.md,
  },

  // Info Item
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: espacamento.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },

  infoIcone: {
    width: 32,
    alignItems: "center",
    marginRight: espacamento.sm,
    marginTop: 2,
  },

  infoConteudo: {
    flex: 1,
  },

  infoTitulo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginBottom: 2,
  },

  infoValor: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
    fontWeight: tipografia.pesoMedio,
  },

  // Observação
  observacao: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
    lineHeight: 22,
  },

  // Botões de Registro
  botoesRegistro: {
    flexDirection: "row",
    gap: espacamento.md,
    marginTop: espacamento.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: cores.overlay,
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: cores.fundoCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: espacamento.lg,
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

  modalScroll: {
    padding: espacamento.lg,
  },

  modalVisitanteInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoPagina,
    padding: espacamento.md,
    borderRadius: bordas.raioMedio,
    marginBottom: espacamento.lg,
  },

  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
    marginRight: espacamento.md,
  },

  modalAvatarTexto: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },

  modalVisitanteTextos: {
    flex: 1,
  },

  modalVisitanteNome: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
  },

  modalVisitanteEmpresa: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  carregandoContainer: {
    paddingVertical: espacamento.lg,
  },

  campoContainer: {
    marginTop: espacamento.md,
  },

  campoLabel: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoMedio,
    color: cores.texto,
    marginBottom: espacamento.xs,
  },

  campoTextArea: {
    backgroundColor: cores.fundoPagina,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
    minHeight: 80,
  },

  modalBotoes: {
    flexDirection: "row",
    gap: espacamento.md,
    padding: espacamento.lg,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
});
