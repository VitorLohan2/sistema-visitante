/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Visualizar Visitante
 * Exibe detalhes completos de um visitante
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { Button, Card, Loading } from "../../components";

// Services
import { visitantesService } from "../../services";

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

  const handleRegistrarEntrada = async () => {
    Alert.alert(
      "Registrar Entrada",
      `Confirma a entrada do visitante ${visitante?.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setRegistrandoEntrada(true);
              await visitantesService.registrarEntrada(visitante.id);
              Alert.alert("Sucesso", "Entrada registrada com sucesso!");
            } catch (erro) {
              Alert.alert("Erro", "Não foi possível registrar a entrada.");
            } finally {
              setRegistrandoEntrada(false);
            }
          },
        },
      ]
    );
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
              Alert.alert("Sucesso", "Saída registrada com sucesso!");
            } catch (erro) {
              Alert.alert("Erro", "Não foi possível registrar a saída.");
            } finally {
              setRegistrandoSaida(false);
            }
          },
        },
      ]
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
        {/* Header Padronizado */}
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

      {/* Header Padronizado */}
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
            {visitante.foto_url ? (
              <Image source={{ uri: visitante.foto_url }} style={styles.foto} />
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
            {visitante.empresa?.nome || visitante.empresa_nome || "Sem empresa"}
          </Text>

          {/* Badges */}
          <View style={styles.badges}>
            {visitante.ativo !== false && (
              <View style={[styles.badge, styles.badgeAtivo]}>
                <Feather name="check-circle" size={14} color={cores.sucesso} />
                <Text style={styles.badgeTextoAtivo}>Ativo</Text>
              </View>
            )}
            {visitante.funcao && (
              <View style={[styles.badge, styles.badgeFuncao]}>
                <Feather name="briefcase" size={14} color={cores.info} />
                <Text style={styles.badgeTextoFuncao}>{visitante.funcao}</Text>
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
          <InfoItem icone="file-text" titulo="RG" valor={visitante.rg} />
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
            valor={visitante.empresa?.nome || visitante.empresa_nome}
          />
          <InfoItem icone="award" titulo="Função" valor={visitante.funcao} />
        </Card>

        {/* Observações */}
        {visitante.observacao && (
          <Card titulo="Observações" style={styles.card}>
            <Text style={styles.observacao}>{visitante.observacao}</Text>
          </Card>
        )}

        {/* Botões de Registro */}
        <View style={styles.botoesRegistro}>
          <Button
            titulo="Registrar Entrada"
            onPress={handleRegistrarEntrada}
            carregando={registrandoEntrada}
            variante="primario"
            icone="log-in"
            estilo={{ flex: 1 }}
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

  // Header Padronizado
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
    gap: espacamento.sm,
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
});
