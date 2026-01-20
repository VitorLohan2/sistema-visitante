/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APP - Aplicação Principal
 * Sistema Visitante Mobile - Refatorado com RBAC
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Rotas
import Routes from "./routes";

// Providers
import { AuthProvider } from "./contexts";

// Estilos
import { cores } from "./styles/tema";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={cores.primaria}
          translucent={false}
        />
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
