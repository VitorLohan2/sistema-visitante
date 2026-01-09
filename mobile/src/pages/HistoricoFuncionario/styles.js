// src/pages/HistoricoFuncionario/styles.js
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
    backgroundColor: "#eff6ff",
  },
  filterButton: {
    padding: 10,
    borderRadius: 8,
    zIndex: 10,
    backgroundColor: "#eff6ff",
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
  // INFORMAÇÕES DO FUNCIONÁRIO
  // ═══════════════════════════════════════════════════════════════
  funcionarioInfo: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  funcionarioNome: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  funcionarioDetalhes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  funcionarioDetalheItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  funcionarioDetalheTexto: {
    fontSize: 13,
    color: "#64748b",
  },

  // ═══════════════════════════════════════════════════════════════
  // FILTROS
  // ═══════════════════════════════════════════════════════════════
  filtrosContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  filtrosTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  filtroRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  filtroItem: {
    flex: 1,
  },
  filtroLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateButtonText: {
    fontSize: 14,
    color: "#1e293b",
  },
  filtroActions: {
    flexDirection: "row",
    gap: 8,
  },
  limparButton: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  limparButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  aplicarButton: {
    flex: 1,
    backgroundColor: "#2083e0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  aplicarButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
  // CARD DE REGISTRO
  // ═══════════════════════════════════════════════════════════════
  registroCard: {
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
    borderLeftColor: "#2083e0",
  },
  registroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  registroDataContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  registroData: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  registroTotalBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  registroTotalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2083e0",
  },
  registroDetalhes: {
    gap: 12,
  },
  registroDetalheRow: {
    flexDirection: "row",
    gap: 16,
  },
  registroDetalheItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
  },
  registroDetalheLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  registroDetalheValor: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
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
    paddingHorizontal: 32,
  },

  // ═══════════════════════════════════════════════════════════════
  // MARGIN
  // ═══════════════════════════════════════════════════════════════
  margin: {
    marginBottom: 40,
  },
});
