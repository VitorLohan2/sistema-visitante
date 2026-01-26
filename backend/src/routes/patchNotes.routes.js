// routes/patchNotes.routes.js
const express = require("express");
const router = express.Router();
const PatchNotesController = require("../controllers/PatchNotesController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");

// Listar todas as atualizações (público para usuários autenticados)
router.get("/", authMiddleware, PatchNotesController.listar);

// Buscar atualização por ID
router.get("/:id", authMiddleware, PatchNotesController.buscarPorId);

// Criar nova atualização (requer permissão)
router.post(
  "/",
  authMiddleware,
  requerPermissao("patch_notes_gerenciar"),
  PatchNotesController.criar
);

// Atualizar atualização (requer permissão)
router.put(
  "/:id",
  authMiddleware,
  requerPermissao("patch_notes_gerenciar"),
  PatchNotesController.atualizar
);

// Deletar atualização (requer permissão)
router.delete(
  "/:id",
  authMiddleware,
  requerPermissao("patch_notes_gerenciar"),
  PatchNotesController.deletar
);

module.exports = router;
