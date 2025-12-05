import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Routes from "./routes";
import NotificationListener from "./components/NotificationListener";
import { SocketProvider } from "./contexts/SocketContext";

export default function App() {
  return (
    <SocketProvider>
      <NotificationListener />
      <NavigationContainer>
        <Routes />
      </NavigationContainer>
    </SocketProvider>
  );
}
