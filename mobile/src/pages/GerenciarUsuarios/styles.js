// src/pages/GerenciarUsuarios/styles.js
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
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
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
  // BARRA DE PESQUISA
  // ═══════════════════════════════════════════════════════════════
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#1e293b",
  },

  // ═══════════════════════════════════════════════════════════════
  // FILTROS
  // ═══════════════════════════════════════════════════════════════
  filterContainer: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterButtonActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  filterButtonTextActive: {
    color: "#fff",
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTEÚDO
  // ═══════════════════════════════════════════════════════════════
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ═══════════════════════════════════════════════════════════════
  // CARD DE USUÁRIO
  // ═══════════════════════════════════════════════════════════════
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  userCardAdmin: {
    borderLeftColor: "#9333EA",
    backgroundColor: "#faf5ff",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeUser: {
    backgroundColor: "#dbeafe",
  },
  typeBadgeAdmin: {
    backgroundColor: "#f3e8ff",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  typeBadgeTextUser: {
    color: "#1e40af",
  },
  typeBadgeTextAdmin: {
    color: "#7c3aed",
  },
  userDetails: {
    gap: 6,
  },
  userDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userDetailText: {
    fontSize: 13,
    color: "#64748b",
  },

  // ═══════════════════════════════════════════════════════════════
  // AÇÕES DO USUÁRIO
  // ═══════════════════════════════════════════════════════════════
  userActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonEdit: {
    backgroundColor: "#dbeafe",
  },
  actionButtonDelete: {
    backgroundColor: "#fee2e2",
  },
  actionButtonTextEdit: {
    fontSize: 14,
    fontWeight: "600",
    color: "#20a3e0",
  },
  actionButtonTextDelete: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
  },

  // ═══════════════════════════════════════════════════════════════
  // BLOQUEIO ADMIN
  // ═══════════════════════════════════════════════════════════════
  adminLockContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3e8ff",
    gap: 6,
  },
  adminLockText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9333EA",
  },

  // ═══════════════════════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════════════════════
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#64748b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },

  // ═══════════════════════════════════════════════════════════════
  // MARGIN
  // ═══════════════════════════════════════════════════════════════
  margin: {
    marginBottom: 40,
  },
});
