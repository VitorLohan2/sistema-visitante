/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ROTAS - Configuração de Navegação
 * Sistema de rotas com proteção RBAC
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Contexto
import { useAuth } from "./contexts";

// Páginas
import {
  // Autenticação
  Login,
  RecuperarSenha,
  // Principal
  Home,
  // Sistema Visitante
  SistemaVisitante,
  ListagemVisitante,
  Visitante,
  VisualizarVisitante,
  EditarCadastroVisitante,
  HistoricoVisitante,
  ListaAgendamentos,
  TicketDashboard,
  CriarTicket,
  BiparCracha,
  // Vigilante
  MenuVigilante,
  Ronda,
  HistoricoRondas,
  DetalhesRonda,
} from "./pages";

// Estilos
import { cores } from "./styles/tema";

// ═══════════════════════════════════════════════════════════════════════════════
// STACKS DE NAVEGAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

const Stack = createNativeStackNavigator();

// ═══════════════════════════════════════════════════════════════════════════════
// STACK DE AUTENTICAÇÃO (Usuário não logado)
// ═══════════════════════════════════════════════════════════════════════════════

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="RecuperarSenha" component={RecuperarSenha} />
    </Stack.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STACK PRINCIPAL (Usuário logado)
// ═══════════════════════════════════════════════════════════════════════════════

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
      initialRouteName="Home"
    >
      {/* Home */}
      <Stack.Screen name="Home" component={Home} />

      {/* Sistema Visitante */}
      <Stack.Screen name="SistemaVisitante" component={SistemaVisitante} />
      <Stack.Screen name="ListagemVisitante" component={ListagemVisitante} />
      <Stack.Screen name="Visitante" component={Visitante} />
      <Stack.Screen
        name="VisualizarVisitante"
        component={VisualizarVisitante}
      />
      <Stack.Screen
        name="EditarCadastroVisitante"
        component={EditarCadastroVisitante}
      />
      <Stack.Screen name="HistoricoVisitante" component={HistoricoVisitante} />
      <Stack.Screen name="ListaAgendamentos" component={ListaAgendamentos} />
      <Stack.Screen name="TicketDashboard" component={TicketDashboard} />
      <Stack.Screen name="CriarTicket" component={CriarTicket} />
      <Stack.Screen name="BiparCracha" component={BiparCracha} />

      {/* Vigilante */}
      <Stack.Screen name="MenuVigilante" component={MenuVigilante} />
      <Stack.Screen name="Ronda" component={Ronda} />
      <Stack.Screen name="HistoricoRondas" component={HistoricoRondas} />
      <Stack.Screen name="DetalhesRonda" component={DetalhesRonda} />
    </Stack.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL DE ROTAS
// ═══════════════════════════════════════════════════════════════════════════════

export default function Routes() {
  const { autenticado, carregando } = useAuth();

  // Tela de loading enquanto verifica autenticação
  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={cores.destaque} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {autenticado ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: cores.fundoPagina,
  },
});
