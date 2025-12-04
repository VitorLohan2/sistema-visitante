// Página de Agendamentos em React Native
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function Agendamentos() {
  const navigation = useNavigation();

  const handleVisitasAgendadas = () => {
    // Navegar para a tela de Visitas Agendadas
    navigation.navigate("VisitasAgendadas");
  };

  const handleEmpresasAgendadas = () => {
    // Navegar para a tela de Empresas Agendadas
    navigation.navigate("EmpresasAgendadas");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { flex: 1 }]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#E02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 0, alignItems: "center" }}>
        <Text style={styles.logoText}>Agendamentos</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleVisitasAgendadas}
        >
          <View style={styles.menuIconContainer}>
            <Feather name="users" size={40} color="#10B981" />
          </View>
          <Text style={styles.menuButtonText}>Visitas Agendadas</Text>
          <Text style={styles.menuButtonSubtext}>
            Visualize e gerencie visitas agendadas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleEmpresasAgendadas}
        >
          <View style={styles.menuIconContainer}>
            <Feather name="briefcase" size={40} color="#10B981" />
          </View>
          <Text style={styles.menuButtonText}>Empresas Agendadas</Text>
          <Text style={styles.menuButtonSubtext}>
            Visualize e gerencie empresas agendadas
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 50,
    marginBottom: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
  },
  backText: {
    color: "#000",
    fontSize: 18,
    marginLeft: 5,
  },
  logoText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  menuContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  menuButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#10B981",
    borderRadius: 12,
    padding: 30,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuIconContainer: {
    marginBottom: 15,
  },
  menuButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  menuButtonSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
