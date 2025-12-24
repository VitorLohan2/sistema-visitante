const cloudinary = require("../../config/cloudinary");
const VisitanteRepository = require("../repositories/VisitanteRepository");
const Events = require("../sockets/visitanteEvents");

module.exports = async function (request, ong_id) {
  const {
    nome,
    nascimento,
    cpf,
    empresa,
    setor,
    telefone,
    observacao,
    placa_veiculo,
    cor_veiculo,
  } = request.body;

  if (!request.files || request.files.length === 0) {
    const error = new Error("Nenhuma imagem enviada");
    error.statusCode = 400;
    throw error;
  }

  const uploadPromises = request.files.map(
    (file) =>
      new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "visitantes",
              transformation: {
                width: 1080,
                crop: "limit",
                quality: "auto:low",
                fetch_format: "auto",
              },
              resource_type: "image",
              public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          )
          .end(file.buffer);
      })
  );

  const imageUrls = await Promise.all(uploadPromises);

  const [incident] = await VisitanteRepository.create({
    nome,
    nascimento,
    cpf,
    empresa_id: empresa,
    setor_id: setor,
    telefone,
    observacao,
    placa_veiculo,
    cor_veiculo,
    imagem1: imageUrls[0] || null,
    imagem2: imageUrls[1] || null,
    imagem3: imageUrls[2] || null,
    avatar_imagem: imageUrls[0] || null,
    ong_id,
  });

  Events.created(incident.id, ong_id);

  return incident.id;
};
