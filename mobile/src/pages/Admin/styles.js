// src/pages/Admin/styles.js
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // CONTAINER E CABEÇALHO
  // ═══════════════════════════════════════════════════════════════
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logoRow: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 54,
    height: 60,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },
  welcomeContainer: {
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  adminName: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },

  // ═══════════════════════════════════════════════════════════════
  // CARDS DE ESTATÍSTICAS
  // ═══════════════════════════════════════════════════════════════
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: "#34CB79",
  },
  statCardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: "#20a3e0",
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: "#f9a825",
  },
  statCardPurple: {
    borderLeftWidth: 4,
    borderLeftColor: "#9333EA",
  },
  statCardOrange: {
    borderLeftWidth: 4,
    borderLeftColor: "#ea580c",
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },

  // ═══════════════════════════════════════════════════════════════
  // AÇÕES ADMINISTRATIVAS
  // ═══════════════════════════════════════════════════════════════
  actionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: "#64748b",
  },

  // ═══════════════════════════════════════════════════════════════
  // MARGIN
  // ═══════════════════════════════════════════════════════════════
  margin: {
    marginBottom: 40,
  },
});
