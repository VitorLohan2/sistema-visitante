const connection = require('../database/connection');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

// Função auxiliar para extrair token do header Authorization
function getBearerToken(request) {
  const authHeader = request.headers.authorization
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2) return null

  const [scheme, token] = parts
  if (!/^Bearer$/i.test(scheme)) return null

  return token
}

module.exports = {
  // Listagem paginada
  async index(request, response) {
    const { page = 1 } = request.query;

    try {
      const [{ count }] = await connection('incidents').count();
      const incidents = await connection('incidents')
      .leftJoin('empresas_visitantes', 'empresas_visitantes.id', '=', 'incidents.empresa_id')
      .leftJoin('setores_visitantes', 'setores_visitantes.id', '=', 'incidents.setor_id')
      .join('ongs', 'ongs.id', '=', 'incidents.ong_id') // Mantém o JOIN com ongs se necessário
      .limit(5)
      .offset((page - 1) * 5)
      .select([
        'incidents.*', // Retornado Tudo
        'empresas_visitantes.nome as empresa_nome',
        'setores_visitantes.nome as setor_nome',
        'ongs.name' // Se precisar do nome da ONG
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
      buffer: f.buffer ? 'OK' : 'NULL'
    }))
  });

  const { nome, nascimento, cpf, empresa, setor, telefone, observacao, placa_veiculo, cor_veiculo } = request.body;
  const ong_id = getBearerToken(request);

  try {
    if (!request.files || request.files.length === 0) {
      return response.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }

    // Upload das imagens para o Cloudinary
    const uploadPromises = request.files.map(file => new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'visitantes',
          transformation: { width: 1080, crop: "limit", quality: "auto" },
          resource_type: "image",
          public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      ).end(file.buffer);
    }));

    const imageUrls = await Promise.all(uploadPromises);

    // Inserir no banco
    const [incident] = await connection('incidents').insert({
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
      avatar_imagem: imageUrls[0] || null, // Define primeira imagem como avatar padrão
      ong_id
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
        .leftJoin('empresas_visitantes', 'empresas_visitantes.id', '=', 'incidents.empresa_id')
        .leftJoin('setores_visitantes', 'setores_visitantes.id', '=', 'incidents.setor_id')
        .where('incidents.id', id)
        .select(
          'incidents.*',
          'empresas_visitantes.nome as empresa',
          'setores_visitantes.nome as setor'
        )
        .first();

      if (!incident) {
        return response.status(404).json({ error: 'Cadastro não encontrado.' });
      }

      // Normaliza todas as imagens
      const normalizeImage = (image) => {
        if (!image) return null;
        if (image.startsWith('https://res.cloudinary.com')) return image;
        return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/visitantes/${image}`;
      };

      const fotos = [
        normalizeImage(incident.imagem1),
        normalizeImage(incident.imagem2),
        normalizeImage(incident.imagem3)
      ].filter(url => url !== null);

      // Avatar_imagem já é a URL completa armazenada no banco
      const avatarUrl = normalizeImage(incident.avatar_imagem);

      console.log('Dados do show:', {
        id: incident.id,
        fotos: fotos,
        avatar_imagem_db: incident.avatar_imagem,
        avatar_normalizado: avatarUrl
      });

      return response.json({
        ...incident,
        fotos,
        avatar_imagem: avatarUrl
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
  async update(req, res) {
    const { id } = req.params;
    const { nome, nascimento, cpf, empresa, setor, telefone, observacao, placa_veiculo, cor_veiculo, avatar_imagem } = req.body;

    console.log('Update recebido:', {
      id,
      avatar_imagem,
      body: req.body
    });

    try {
      // Buscar id da empresa pelo nome
      const empresaData = await connection('empresas_visitantes')
        .where('nome', empresa)
        .select('id')
        .first();

      if (!empresaData) {
        return res.status(400).json({ error: 'Empresa não encontrada.' });
      }

      // Buscar id do setor pelo nome
      const setorData = await connection('setores_visitantes')
        .where('nome', setor)
        .select('id')
        .first();

      if (!setorData) {
        return res.status(400).json({ error: 'Setor não encontrado.' });
      }

      // Buscar o incidente atual para validar se a URL do avatar existe nas imagens
      const currentIncident = await connection('incidents')
        .where('id', id)
        .select('imagem1', 'imagem2', 'imagem3')
        .first();

      if (!currentIncident) {
        return res.status(404).json({ error: 'Cadastro não encontrado.' });
      }

      // Validar se o avatar_imagem é uma das URLs válidas
      let avatarToSave = null;
      if (avatar_imagem) {
        const validImages = [
          currentIncident.imagem1,
          currentIncident.imagem2,
          currentIncident.imagem3
        ].filter(img => img !== null);

        if (validImages.includes(avatar_imagem)) {
          avatarToSave = avatar_imagem;
        } else {
          console.log('Avatar inválido:', avatar_imagem);
          console.log('Imagens válidas:', validImages);
        }
      }

      console.log('Avatar a ser salvo:', avatarToSave);

      await connection('incidents')
        .where('id', id)
        .update({
          nome,
          nascimento,
          cpf,
          empresa_id: empresaData.id,
          setor_id: setorData.id,
          telefone,
          observacao,
          placa_veiculo, 
          cor_veiculo,   
          avatar_imagem: avatarToSave // Salva a URL completa ou null
        });

      return res.status(200).json({ 
        message: 'Cadastro atualizado com sucesso.',
        avatar_saved: avatarToSave
      });

    } catch (error) {
      console.error('Erro ao atualizar incidente:', error);
      return res.status(500).json({ error: 'Erro ao atualizar incidente.' });
    }
  },

  // Bloquear/desbloquear incidente
  async blockIncident(request, response) {
    const { id } = request.params;
    const { bloqueado } = request.body;
    const ong_id = getBearerToken(request);

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

  // Deletar incidente com limpeza no Cloudinary
  async delete(request, response) {
    const { id } = request.params;
    const ong_id = getBearerToken(request);

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
  },
   // 🔹 Função para buscar dados do colaborador e retornar para o modal
  async showBadge(request, response) {
    const { id } = request.params;

    try {
      const badgeData = await connection('incidents')
        .leftJoin('empresas_visitantes', 'empresas_visitantes.id', '=', 'incidents.empresa_id')
        .leftJoin('setores_visitantes', 'setores_visitantes.id', '=', 'incidents.setor_id')
        .where('incidents.id', id)
        .select(
          'incidents.id',
          'incidents.nome',
          'incidents.cpf',
          'incidents.telefone',
          'incidents.placa_veiculo',
          'incidents.cor_veiculo',  
          'empresas_visitantes.nome as empresa',
          'setores_visitantes.nome as setor',
          'incidents.avatar_imagem' // Retorna o avatar selecionado
        )
        .first();

      if (!badgeData) {
        return response.status(404).json({ error: 'Colaborador não encontrado.' });
      }

      return response.json(badgeData);
    } catch (error) {
      console.error('Erro ao buscar crachá:', error);
      return response.status(500).json({ error: 'Erro interno no servidor' });
    }
  },
    // Verificar se CPF já está cadastrado
  async checkCpf(request, response) {
    const { cpf } = request.params;

    try {
      const cpfLimpo = cpf.replace(/\D/g, ''); // Remove pontos e traços
      const visitante = await connection('incidents')
        .where('cpf', cpfLimpo)
        .first();

      return response.json({ exists: !!visitante });
    } catch (error) {
      console.error('Erro ao verificar CPF:', error);
      return response.status(500).json({ error: 'Erro ao verificar CPF.' });
    }
  },
// 🔎 Buscar visitantes por nome ou CPF (SEM AUTENTICAÇÃO)
async search(request, response) {
  const { query } = request.query;

  if (!query || query.trim() === '') {
    return response.status(400).json({ error: 'Parâmetro de busca não informado.' });
  }

  try {
    // 🔹 BUSCA TODOS OS CAMPOS NECESSÁRIOS (sem filtrar por ONG)
    const incidents = await connection('incidents')
      .where(function() {
        this.where('nome', 'ILIKE', `%${query}%`)
            .orWhere('cpf', 'ILIKE', `%${query}%`);
      })
      .select([
        'id', 'nome', 'cpf', 'telefone', 'nascimento', 
        'empresa_id', 'setor_id', 'avatar_imagem', 
        'bloqueado', 'ong_id', 'placa_veiculo', 'cor_veiculo'
      ]); // 🔹 Retorna todos os campos necessários

    return response.json(incidents);

  } catch (error) {
    console.error('Erro na busca:', error);
    return response.status(500).json({ error: 'Erro ao realizar busca' });
  }
}

};