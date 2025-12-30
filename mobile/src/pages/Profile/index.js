import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

// Importações dos componentes separados
import { styles } from "./styles";
import Header from "./Header.js";
import Menu from "./Menu.js";
import MenuLateral from "./MenuLateral.js";
import RegistroVisitaModal from "./RegistroVisitaModal.js";
import CardVisitantes from "./CardVisitantes.js";
import ComunicadoAviso from "./ComunicadoAviso.js";

// Importações dos hooks customizados
import { useProfileData } from "../hooks/useProfileData.js";
import { useProfileSearch } from "../hooks/useProfileSearch.js";
import { useProfileHandlers } from "../hooks/useProfileHandlers.js";
import { useTicketHandlers } from "../hooks/useTicketHandlers.js";
import { useIncidents } from "../contexts/IncidentsContext";

export default function Profile() {
  const navigation = useNavigation();

  // ═══════════════════════════════════════════════════════════════
  // HOOKS CUSTOMIZADOS
  // ═══════════════════════════════════════════════════════════════

  // Hook para dados principais (userData, loading, incidents, etc)
  const {
    loading,
    userData,
    unseenCount,
    comunicadoAtivo,
    comunicadoVisible,
    setComunicadoVisible,
    flatListRef,
  } = useProfileData();

  // Hook para busca
  const {
    searchTerm,
    setSearchTerm,
    searchExecuted,
    isSearching,
    lastSearchedTerm,
    filteredIncidents,
    executeSearch,
    allIncidents,
  } = useProfileSearch();

  // Hook para handlers de ações (navegação, logout, delete, edit, etc)
  const {
    modalVisible,
    setModalVisible,
    selectedIncident,
    setSelectedIncident,
    responsavel,
    setResponsavel,
    observacao,
    setObservacao,
    menuModalVisible,
    setMenuModalVisible,
    isAnimating,
    modalPosition,
    overlayOpacity,
    handleLogout,
    handleRegisterVisit,
    confirmarVisita,
    handleDeleteIncident,
    handleEditProfile,
    handleViewProfile,
    openMenuModal,
    closeMenuModal,
    width,
  } = useProfileHandlers();

  // Hook para handlers de tickets (Socket.IO)
  useTicketHandlers();

  // Context para pegar responsaveisList
  const { responsaveisList } = useIncidents();

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÃO AUXILIAR - FORMATAR DATA
  // ═══════════════════════════════════════════════════════════════
  function formatarData(data) {
    if (!data) return "Data não informada";
    const dataParte = data.split("T")[0];
    const partes = dataParte.split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS DE NAVEGAÇÃO (FALTAVAM NO HOOK)
  // ═══════════════════════════════════════════════════════════════
  function handleNavigateToVisitors() {
    navigation.navigate("Visitors");
  }

  function handleNavigateToHistory() {
    navigation.navigate("History");
  }

  function handleNavigateToTickets() {
    navigation.navigate("TicketDashboard");
  }

  function handleNavigateToBipagem() {
    navigation.navigate("BiparCracha");
  }

  function handleNavigateToNewIncident() {
    navigation.navigate("NewIncident");
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER LOADING
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando Listagem...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      {/* CABEÇALHO */}
      <Header
        userData={userData}
        searchTerm={searchTerm}
        onSearchChange={(text) => {
          setSearchTerm(text);
          // Se limpar o campo, executa a limpeza imediatamente
          if (text.trim() === "") {
            executeSearch();
          }
        }}
        onSearchSubmit={executeSearch}
        onLogout={handleLogout}
        onNavigateNewIncident={handleNavigateToNewIncident}
        searchExecuted={searchExecuted}
        lastSearchedTerm={lastSearchedTerm}
        filteredIncidents={filteredIncidents}
        flatListRef={flatListRef}
      />

      {/* MENU PRINCIPAL */}
      <Menu
        userData={userData}
        unseenCount={unseenCount}
        userSetor={userData.setor}
        onNavigateVisitors={handleNavigateToVisitors}
        onNavigateHistory={handleNavigateToHistory}
        onNavigateTickets={handleNavigateToTickets}
        onNavigateBipagem={handleNavigateToBipagem}
        onOpenMenu={openMenuModal}
        isAnimating={isAnimating}
      />

      {/* TÍTULO */}
      <Text style={styles.title}>Visitantes Cadastrados</Text>

      {/* LISTA DE VISITANTES */}
      <FlatList
        ref={flatListRef}
        data={filteredIncidents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CardVisitantes
            item={item}
            onRegisterVisit={handleRegisterVisit}
            onViewProfile={handleViewProfile}
            onEditProfile={handleEditProfile}
            onDelete={handleDeleteIncident}
            formatarData={formatarData}
          />
        )}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm.trim()
                ? `Nenhum resultado encontrado para "${searchTerm.trim()}"`
                : "Nenhum cadastro encontrado"}
            </Text>
          </View>
        )}
      />

      {/* MODAL DE REGISTRO DE VISITA */}
      <RegistroVisitaModal
        visible={modalVisible}
        selectedIncident={selectedIncident}
        responsavel={responsavel}
        observacao={observacao}
        responsaveisList={responsaveisList}
        onClose={() => {
          setModalVisible(false);
          setResponsavel("");
          setObservacao("");
          setSelectedIncident(null);
        }}
        onResponsavelChange={setResponsavel}
        onObservacaoChange={setObservacao}
        onConfirm={confirmarVisita}
      />

      {/* MODAL DO MENU LATERAL */}
      <MenuLateral
        visible={menuModalVisible}
        userData={userData}
        width={width}
        isAnimating={isAnimating}
        modalPosition={modalPosition}
        overlayOpacity={overlayOpacity}
        onClose={closeMenuModal}
        onNavigateAdmin={() => {
          closeMenuModal();
          navigation.navigate("Admin");
        }}
        onNavigateAgendamentos={() => {
          closeMenuModal();
          navigation.navigate("Agendamentos");
        }}
        onNavigateChat={() => {
          closeMenuModal();
          navigation.navigate("ChatLista");
        }}
        onLogout={handleLogout}
      />

      {/* MARGEM INFERIOR */}
      <View style={styles.margin}></View>

      {/* MODAL DE COMUNICADO */}
      <ComunicadoAviso
        visible={comunicadoVisible}
        comunicado={comunicadoAtivo}
        onClose={() => setComunicadoVisible(false)}
      />
    </SafeAreaView>
  );
}
