// routes/feedback.routes.js
const express = require("express");
const router = express.Router();
const FeedbackController = require("../controllers/FeedbackController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Enviar feedback por email (requer autenticação)
router.post("/enviar", authMiddleware, FeedbackController.enviarFeedback);

module.exports = router;
