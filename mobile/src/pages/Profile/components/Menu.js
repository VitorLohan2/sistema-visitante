// Menu circular
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { styles } from "../Profile/styles";

export default function Menu({
  unseenCount,
  userData,
  userSetor,
  onNavigateVisitors,
  onNavigateHistory,
  onNavigateTickets,
  onNavigateBipagem,
  onOpenMenu,
  isAnimating,
}) {
  return (
    <View style={styles.menu}>
      <TouchableOpacity onPress={onNavigateVisitors} style={styles.menuButton}>
        <View style={[styles.menuIconCircle, styles.visitantesCircle]}>
          <Feather name="users" size={24} color="#000" />
        </View>
        <Text style={styles.menuButtonText}>Visitantes</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onNavigateHistory} style={styles.menuButton}>
        <View style={[styles.menuIconCircle, styles.historicoCircle]}>
          <Feather name="clock" size={24} color="#000" />
        </View>
        <Text style={styles.menuButtonText}>Histórico</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onNavigateTickets} style={styles.menuButton}>
        <View style={[styles.menuIconCircle, styles.ticketsCircle]}>
          <Feather name="message-square" size={24} color="#000" />
        </View>
        <Text style={styles.menuButtonText}>Tickets</Text>
        {userData.setor === "Segurança" && unseenCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>
              {unseenCount > 9 ? "9+" : unseenCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onNavigateBipagem} style={styles.menuButton}>
        <View style={[styles.menuIconCircle, styles.crachaCircle]}>
          <MaterialCommunityIcons name="barcode-scan" size={24} color="#000" />
        </View>
        <Text style={styles.menuButtonText}>Cracha</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOpenMenu}
        style={styles.menuButton}
        disabled={isAnimating}
      >
        <View style={[styles.menuIconCircle, styles.menuCircle]}>
          <MaterialCommunityIcons name="menu" size={24} color="#000" />
        </View>
        <Text style={styles.menuButtonText}>Menu</Text>
      </TouchableOpacity>
    </View>
  );
}
