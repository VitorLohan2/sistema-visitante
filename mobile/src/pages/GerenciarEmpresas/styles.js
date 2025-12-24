// src/pages/GerenciarEmpresas/styles.js
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
  // BOTÃO ADICIONAR
  // ═══════════════════════════════════════════════════════════════
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },

  addButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTEÚDO
  // ═══════════════════════════════════════════════════════════════
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // ═══════════════════════════════════════════════════════════════
  // EMPRESA CARD
  // ═══════════════════════════════════════════════════════════════
  empresaCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  empresaHeader: {
    marginBottom: 16,
  },

  empresaInfo: {
    flex: 1,
  },

  empresaNome: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1e293b",
    marginBottom: 12,
  },

  empresaDetails: {
    gap: 8,
  },

  empresaDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  empresaDetailText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#64748b",
    flex: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // AÇÕES
  // ═══════════════════════════════════════════════════════════════
  empresaActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 16,
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
    backgroundColor: "#e0f2fe",
  },

  actionButtonDelete: {
    backgroundColor: "#fee2e2",
  },

  actionButtonTextEdit: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#20a3e0",
  },

  actionButtonTextDelete: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#ef4444",
  },

  // ═══════════════════════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════════════════════
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },

  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
  },

  emptyButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#10B981",
  },

  // ═══════════════════════════════════════════════════════════════
  // MARGEM FINAL
  // ═══════════════════════════════════════════════════════════════
  margin: {
    height: 20,
  },
});
