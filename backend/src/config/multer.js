// src/config/multer.js

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

// Configuração otimizada do storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `visitantes/${req.body.category || "geral"}`,
    allowed_formats: ["jpg", "jpeg", "png"],
    format: "webp", // Conversão automática para formato moderno
    transformation: [{ width: 1080, crop: "limit", quality: "auto" }],
    resource_type: "image",
    public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    metadata: {
      uploadedBy: req.userId || "system", // Exemplo de metadado
    },
  }),
});

// Configuração do Multer
const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // Aumentado para 3MB
    files: 3, // Garantindo o limite de 3 imagens
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/pjpeg",
      "image/png",
      "image/webp",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Tipo de arquivo inválido: ${file.mimetype}. Apenas JPEG, PNG ou WEBP são permitidos.`
        )
      );
    }
  },
});

// Middleware para tratamento de erros
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "Erro no upload",
      details:
        err.code === "LIMIT_FILE_SIZE"
          ? "Tamanho do arquivo excedeu o limite de 3MB"
          : err.message,
    });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

module.exports = { upload, handleUploadErrors };
