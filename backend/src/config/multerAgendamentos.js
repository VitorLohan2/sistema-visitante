const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `agendamentos`, // 🔹 sempre salva na pasta agendamentos
    allowed_formats: ['jpg', 'jpeg', 'png'],
    format: 'webp',
    transformation: [
      { width: 1080, crop: "limit", quality: "auto" }
    ],
    resource_type: 'image',
    public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
  })
});

const uploadAgendamento = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Arquivo inválido: ${file.mimetype}. Apenas JPEG, PNG e WEBP são aceitos.`));
    }
  }
});

module.exports = uploadAgendamento;
