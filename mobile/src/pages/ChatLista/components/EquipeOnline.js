import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";

/**
 * Componente para exibir a equipe de TI online
 * @param {Array} equipeOnline - Lista de membros da equipe online
 * @param {boolean} loadingEquipe - Se está carregando
 */
export default function EquipeOnline({ equipeOnline, loadingEquipe }) {
  return (
    <View style={styles.equipeOnlineContainer}>
      <View style={styles.equipeOnlineHeader}>
        <View style={styles.equipeOnlineHeaderLeft}>
          <Feather name="users" size={18} color="#10b981" />
          <Text style={styles.equipeOnlineTitle}>Equipe de TI</Text>
        </View>

        {loadingEquipe ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : (
          <View style={styles.equipeOnlineCount}>
            <View
              style={[
                styles.onlineDot,
                equipeOnline.length === 0 && styles.offlineDot,
              ]}
            />
            <Text
              style={[
                styles.equipeOnlineCountText,
                equipeOnline.length === 0 && styles.equipeOfflineCountText,
              ]}
            >
              {equipeOnline.length} online
            </Text>
          </View>
        )}
      </View>

      {equipeOnline.length === 0 && !loadingEquipe ? (
        <View style={styles.equipeOfflineContainer}>
          <Feather name="user-x" size={24} color="#94a3b8" />
          <Text style={styles.equipeOfflineText}>
            Nenhum membro da equipe online no momento
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.equipeOnlineScroll}
          contentContainerStyle={styles.equipeOnlineScrollContent}
        >
          {equipeOnline.map((membro) => (
            <View key={membro.id} style={styles.membroCard}>
              <View style={styles.membroAvatarContainer}>
                <View style={styles.membroAvatar}>
                  <Text style={styles.membroAvatarText}>
                    {membro.nome
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.membroOnlineIndicator} />
              </View>
              <Text style={styles.membroNome} numberOfLines={1}>
                {membro.nome}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  equipeOnlineContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  equipeOnlineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  equipeOnlineHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  equipeOnlineTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },

  equipeOnlineCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },

  offlineDot: {
    backgroundColor: "#94a3b8",
  },

  equipeOnlineCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },

  equipeOfflineCountText: {
    color: "#94a3b8",
  },

  equipeOfflineContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },

  equipeOfflineText: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
  },

  equipeOnlineScroll: {
    marginHorizontal: -4,
  },

  equipeOnlineScrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },

  membroCard: {
    alignItems: "center",
    marginRight: 12,
    width: 70,
  },

  membroAvatarContainer: {
    position: "relative",
    marginBottom: 6,
  },

  membroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },

  membroAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },

  membroOnlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
    borderWidth: 3,
    borderColor: "#fff",
  },

  membroNome: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
  },
});
