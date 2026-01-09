// src/pages/GerenciarFuncionarios/styles.js
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  headerGeral: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    padding: 10,
    borderRadius: 8,
    zIndex: 10,
    backgroundColor: "#f0fdf4",
  },
  addButton: {
    padding: 10,
    borderRadius: 8,
    zIndex: 10,
    backgroundColor: "#f0fdf4",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 10,
    marginBottom: 16,
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
  // CARD DE FUNCIONÁRIO
  // ═══════════════════════════════════════════════════════════════
  funcionarioCard: {
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
  funcionarioCardInativo: {
    borderLeftColor: "#ef4444",
    backgroundColor: "#fff5f5",
  },
  funcionarioHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  funcionarioInfo: {
    flex: 1,
  },
  funcionarioNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  funcionarioName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginRight: 8,
  },
  funcionarioNameInativo: {
    color: "#ef4444",
    textDecorationLine: "line-through",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeAtivo: {
    backgroundColor: "#d1fae5",
  },
  statusBadgeInativo: {
    backgroundColor: "#fee2e2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusBadgeTextAtivo: {
    color: "#065f46",
  },
  statusBadgeTextInativo: {
    color: "#991b1b",
  },
  funcionarioDetails: {
    gap: 6,
  },
  funcionarioDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  funcionarioDetailText: {
    fontSize: 13,
    color: "#64748b",
  },

  // ═══════════════════════════════════════════════════════════════
  // AÇÕES DO FUNCIONÁRIO
  // ═══════════════════════════════════════════════════════════════
  funcionarioActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexWrap: "wrap",
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
    minWidth: "30%",
  },
  actionButtonHistory: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionButtonEdit: {
    backgroundColor: "#d1fae5",
  },
  actionButtonInativar: {
    backgroundColor: "#fee2e2",
  },
  actionButtonReativar: {
    backgroundColor: "#d1fae5",
  },
  actionButtonTextHistory: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  actionButtonTextEdit: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  actionButtonTextInativar: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
  },
  actionButtonTextReativar: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
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
