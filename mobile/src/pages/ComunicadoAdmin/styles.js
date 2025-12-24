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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },

  // ═══════════════════════════════════════════════════════════════
  // CARD DE INFORMAÇÃO
  // ═══════════════════════════════════════════════════════════════
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#e0f2fe",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#20a3e0",
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
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    marginHorizontal: 16,
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
    marginRight: 12,
  },

  prioridadeButtonLast: {
    marginRight: 0,
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
    minHeight: 150,
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
    marginHorizontal: 16,
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

  margin: {
    marginBottom: 40,
  },
});
