const connection = require('../database/connection');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

module.exports = {
  // Listagem paginada
  async index(request, response) {
    const { page = 1 } = request.query;

    try {
      const [{ count }] = await connection('incidents').count();
      const incidents = await connection('incidents')
        .join('ongs', 'ongs.id', '=', 'incidents.ong_id')
        .limit(5)
        .offset((page - 1) * 5)
        .select([
          'incidents.*',
          'ongs.name',
          'ongs.birthdate',
          'ongs.cpf',
          'ongs.empresa',
          'ongs.setor',
          'ongs.email',
          'ongs.whatsapp',
          'ongs.city',
          'ongs.uf'
        ]);

      response.header('X-Total-Count', Number(count));
      return response.json(incidents);
    } catch (error) {
      console.error('Erro ao listar incidentes:', error);
      return response.status(500).json({ error: 'Erro ao listar cadastros.' });
    }
  },

  // Criação de incidente com upload para Cloudinary
async create(request, response) {
  console.log('Dados recebidos:', {
  body: request.body,
  files: request.files.map(f => ({
    name: f.originalname,
    size: f.size,
    buffer: f.buffer ? 'OK' : 'NULL' // Verifica se o buffer existe
  }))
});
  const { nome, nascimento, cpf, empresa, setor, telefone, observacao } = request.body;
  const ong_id = request.headers.authorization;

  try {
    if (!request.files || request.files.length === 0) {
      return response.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }

    // Upload paralelo para o Cloudinary (usando buffer)
    const uploadPromises = request.files.map(async (file) => {
      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: 'visitantes',
              transformation: { width: 1080, crop: "limit", quality: "auto" },
              resource_type: "image",
              public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file.buffer);
        });
        return result.secure_url;
      } catch (uploadError) {
        throw new Error(`Falha no upload da imagem: ${uploadError.message}`);
      }
    });

    const imageUrls = await Promise.all(uploadPromises);

    // Insere no banco
    const [incident] = await connection('incidents').insert({
      nome,
      nascimento,
      cpf,
      empresa,
      setor,
      telefone,
      observacao,
      imagem1: imageUrls[0] || null,
      imagem2: imageUrls[1] || null,
      imagem3: imageUrls[2] || null,
      ong_id,
    }).returning('id');

    return response.json({ id: incident.id });

  } catch (error) {
    console.error('Erro no cadastro:', error);
    return response.status(500).json({ 
      error: 'Erro ao criar cadastro.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
},
  // Buscar incidente específico
async show(request, response) {
  const { id } = request.params;

  try {
    const incident = await connection('incidents')
      .where('id', id)
      .select('*')
      .first();

    if (!incident) {
      return response.status(404).json({ error: 'Cadastro não encontrado.' });
    }

    // Função para normalizar as imagens
    const normalizeImage = (image) => {
      if (!image) return null;
      
      // Se já for uma URL do Cloudinary
      if (image.startsWith('https://res.cloudinary.com')) {
        return image;
      }
      
      // Se for um nome de arquivo antigo
      return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/visitantes/${image}`;
    };

    // Cria array de fotos normalizadas
    const fotos = [
      normalizeImage(incident.imagem1),
      normalizeImage(incident.imagem2),
      normalizeImage(incident.imagem3)
    ].filter(url => url !== null); // Remove valores nulos

    return response.json({
      ...incident,
      fotos
    });

  } catch (error) {
    console.error('Erro ao buscar cadastro:', error);
    return response.status(500).json({ 
      error: 'Erro ao buscar cadastro.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
},

  // Atualizar incidente
  async update(request, response) {
    const { id } = request.params;
    const ong_id = request.headers.authorization;
    const { nome, nascimento, cpf, empresa, setor, telefone, observacao } = request.body;

    try {
      const incident = await connection('incidents').where('id', id).first();
      if (!incident) {
        return response.status(404).json({ error: 'Cadastro não encontrado.' });
      }

      await connection('incidents').where('id', id).update({
        nome,
        nascimento,
        cpf,
        empresa,
        setor,
        telefone,
        observacao
      });

      return response.status(204).send();
    } catch (error) {
      console.error('Erro na atualização:', error);
      return response.status(500).json({ error: 'Erro na atualização.' });
    }
  },

  // Bloquear/desbloquear incidente
  async blockIncident(request, response) {
    const { id } = request.params;
    const { bloqueado } = request.body;
    const ong_id = request.headers.authorization;

    try {
      const ong = await connection('ongs')
        .where('id', ong_id)
        .where('type', 'ADM')
        .first();

      if (!ong) {
        console.log(`Tentativa de bloqueio não autorizada por: ${ong_id}`);
        return response.status(403).json({
          error: 'Somente administradores podem bloquear cadastros.'
        });
      }

      const incident = await connection('incidents').where('id', id).first();
      if (!incident) {
        return response.status(404).json({ error: 'Cadastro não encontrado.' });
      }

      await connection('incidents')
        .where('id', id)
        .update({ bloqueado: !!bloqueado });

      return response.status(204).send();
    } catch (error) {
      console.error('Erro no bloqueio:', error);
      return response.status(500).json({
        error: 'Erro ao atualizar bloqueio.'
      });
    }
  },

  // Deletar incidente com limpeza no Cloudinary - VERSÃO CORRIGIDA
  async delete(request, response) {
    const { id } = request.params;
    const ong_id = request.headers.authorization;

    try {
      // Verifica se é ADM
      const ong = await connection('ongs')
        .where('id', ong_id)
        .where('type', 'ADM')
        .first();

      if (!ong) {
        return response.status(403).json({
          error: 'Somente administradores podem excluir cadastros.'
        });
      }

      // Busca o incidente para obter as URLs das imagens
      const incident = await connection('incidents')
        .where('id', id)
        .first();

      if (!incident) {
        return response.status(404).json({ error: 'Incidente não encontrado.' });
      }

      // Função auxiliar para deletar imagens do Cloudinary
      const deleteImage = async (url) => {
        if (!url) return;
        try {
          const publicId = url.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error(`Erro ao deletar imagem ${url}:`, error);
        }
      };

      // Deleta todas as imagens em paralelo
      await Promise.all([
        deleteImage(incident.imagem1),
        deleteImage(incident.imagem2),
        deleteImage(incident.imagem3)
      ]);

      // Deleta o registro do banco
      await connection('incidents').where('id', id).delete();

      return response.status(204).send();

    } catch (error) {
      console.error('Erro na exclusão:', error);
      return response.status(500).json({ 
        error: 'Erro ao excluir cadastro.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};
