import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Routes from "./routes";
import { SocketProvider } from "./contexts/SocketContext";
import { IncidentsProvider } from "./contexts/IncidentsContext";
import { TicketsProvider } from "./contexts/TicketsContext";

export default function App() {
  return (
    <SocketProvider>
      <IncidentsProvider>
        <NavigationContainer>
          <TicketsProvider>
            <Routes />
          </TicketsProvider>
        </NavigationContainer>
      </IncidentsProvider>
    </SocketProvider>
  );
}
