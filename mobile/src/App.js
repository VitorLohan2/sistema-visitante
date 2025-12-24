import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Routes from "./routes";
import { SocketProvider } from "./contexts/SocketContext";
import { IncidentsProvider } from "./contexts/IncidentsContext";
import { TicketsProvider } from "./contexts/TicketsContext";
import { EmpresasProvider } from "./contexts/EmpresasContext";
import { UsuariosProvider } from "./contexts/UsuariosContext";

export default function App() {
  return (
    <SocketProvider>
      <IncidentsProvider>
        <TicketsProvider>
          <EmpresasProvider>
            <UsuariosProvider>
              <NavigationContainer>
                <Routes />
              </NavigationContainer>
            </UsuariosProvider>
          </EmpresasProvider>
        </TicketsProvider>
      </IncidentsProvider>
    </SocketProvider>
  );
}
