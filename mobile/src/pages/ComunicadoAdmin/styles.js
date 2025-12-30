// src/pages/ComunicadoAdmin/styles.js
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
  // CABEÇALHO
  // ═══════════════════════════════════════════════════════════════
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },

  backButton: {
    padding: 10,
    borderRadius: 8,
    left: 0,
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

  // ═══════════════════════════════════════════════════════════════
  // FORMULÁRIO NOVO COMUNICADO
  // ═══════════════════════════════════════════════════════════════
  formContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },

  // ═══════════════════════════════════════════════════════════════
  // CARD DE INFORMAÇÃO
  // ═══════════════════════════════════════════════════════════════
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#e0f2fe",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#20a3e0",
    marginBottom: 16,
  },

  infoIcon: {
    marginRight: 12,
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#0c4a6e",
    lineHeight: 20,
  },

  // ═══════════════════════════════════════════════════════════════
  // SWITCH
  // ═══════════════════════════════════════════════════════════════
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  switchInfo: {
    flex: 1,
    marginRight: 12,
  },

  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },

  switchDescription: {
    fontSize: 13,
    color: "#64748b",
  },

  // ═══════════════════════════════════════════════════════════════
  // SEÇÕES
  // ═══════════════════════════════════════════════════════════════
  section: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIORIDADE
  // ═══════════════════════════════════════════════════════════════
  prioridadeContainer: {
    flexDirection: "row",
    gap: 12,
  },

  prioridadeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },

  prioridadeButtonActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#20a3e0",
  },

  prioridadeButtonActiveUrgent: {
    backgroundColor: "#fee2e2",
    borderColor: "#e02041",
  },

  prioridadeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
    marginLeft: 8,
  },

  prioridadeTextActive: {
    color: "#20a3e0",
  },

  prioridadeTextActiveUrgent: {
    color: "#e02041",
  },

  // ═══════════════════════════════════════════════════════════════
  // INPUTS
  // ═══════════════════════════════════════════════════════════════
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1e293b",
  },

  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },

  charCount: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 4,
  },

  // ═══════════════════════════════════════════════════════════════
  // PRÉ-VISUALIZAÇÃO
  // ═══════════════════════════════════════════════════════════════
  previewCard: {
    backgroundColor: "#e0f2fe",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#20a3e0",
  },

  previewCardUrgent: {
    backgroundColor: "#fee2e2",
    borderLeftColor: "#e02041",
  },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  previewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginLeft: 8,
  },

  previewMessage: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },

  // ═══════════════════════════════════════════════════════════════
  // BOTÕES
  // ═══════════════════════════════════════════════════════════════
  buttonsContainer: {
    marginTop: 8,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  buttonSave: {
    backgroundColor: "#10B981",
  },

  buttonDelete: {
    backgroundColor: "#e02041",
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTA DE COMUNICADOS
  // ═══════════════════════════════════════════════════════════════
  listContainer: {
    marginHorizontal: 16,
    marginTop: 10,
  },

  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },

  // ═══════════════════════════════════════════════════════════════
  // ESTADO VAZIO
  // ═══════════════════════════════════════════════════════════════
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  emptyText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
  },

  // ═══════════════════════════════════════════════════════════════
  // CARD DE COMUNICADO
  // ═══════════════════════════════════════════════════════════════
  comunicadoCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#20a3e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  comunicadoCardUrgent: {
    borderLeftColor: "#e02041",
  },

  comunicadoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  comunicadoHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },

  comunicadoTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginLeft: 8,
    flex: 1,
  },

  comunicadoMensagem: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 12,
  },

  comunicadoData: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 16,
  },

  // ═══════════════════════════════════════════════════════════════
  // BADGES
  // ═══════════════════════════════════════════════════════════════
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },

  badgeActive: {
    backgroundColor: "#d1fae5",
  },

  badgeInactive: {
    backgroundColor: "#f1f5f9",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  badgeTextActive: {
    color: "#059669",
  },

  badgeTextInactive: {
    color: "#64748b",
  },

  // ═══════════════════════════════════════════════════════════════
  // AÇÕES DO COMUNICADO
  // ═══════════════════════════════════════════════════════════════
  comunicadoActions: {
    flexDirection: "row",
    gap: 10,
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

  actionButtonActivate: {
    backgroundColor: "#10B981",
  },

  actionButtonDeactivate: {
    backgroundColor: "#F59E0B",
  },

  actionButtonDelete: {
    backgroundColor: "#e02041",
  },

  actionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  // ═══════════════════════════════════════════════════════════════
  // MARGEM FINAL
  // ═══════════════════════════════════════════════════════════════
  margin: {
    marginBottom: 40,
  },
});
