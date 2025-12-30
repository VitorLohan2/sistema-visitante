import React from "react";
import { View, Text, Image, TouchableOpacity, TextInput } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { styles } from "./styles";
import logoImg from "../../assets/gd.png";

export default function Header({
  userData,
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  onLogout,
  onNavigateNewIncident,
  searchExecuted,
  lastSearchedTerm,
  filteredIncidents,
  flatListRef,
}) {
  return (
    <View style={styles.header}>
      {/* LOGO E BOTÃO DE LOGOUT */}
      <View style={styles.logoRow}>
        <Image source={logoImg} style={styles.logo} />
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Feather name="power" size={24} color="#e02041" />
        </TouchableOpacity>
      </View>

      {/* MENSAGEM DE BOAS-VINDAS */}
      <Text style={styles.welcomeText}>
        Bem-vindo(a), {userData.nome || "Usuário"}
      </Text>

      {/* CAMPO DE BUSCA */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#999" />
        <TextInput
          placeholder="Consultar por nome ou CPF"
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearchSubmit}
          returnKeyType="search"
          blurOnSubmit={false}
        />
      </View>

      {/* BOTÃO DE CADASTRAR VISITANTE */}
      <View style={styles.navButtons}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={onNavigateNewIncident}
        >
          <Text style={styles.navButtonText}>Cadastrar Visitante</Text>
        </TouchableOpacity>
      </View>

      {/* INFO DA BUSCA (MOSTRADO APENAS QUANDO HÁ BUSCA ATIVA) */}
      {searchExecuted && lastSearchedTerm && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoText}>
            Buscando por "{lastSearchedTerm}" ({filteredIncidents.length}{" "}
            resultados)
          </Text>
        </View>
      )}
    </View>
  );
}
