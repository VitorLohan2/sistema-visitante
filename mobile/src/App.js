import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Routes from "./routes";
import { SocketProvider } from "./contexts/SocketContext";
import { IncidentsProvider } from "./contexts/IncidentsContext";

export default function App() {
  return (
    <SocketProvider>
      <IncidentsProvider>
        <NavigationContainer>
          <Routes />
        </NavigationContainer>
      </IncidentsProvider>
    </SocketProvider>
  );
}
