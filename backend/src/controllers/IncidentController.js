const connection = require('../database/connection');

module.exports = {
  // Listagem paginada
  async index(request, response) {
    const { page = 1 } = request.query;

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
  },

  // Criação de incidente
  async create(request, response) {
    const { nome, nascimento, cpf, empresa, setor, telefone, observacao } = request.body;
    const ong_id = request.headers.authorization;

    // Verifica se há arquivos enviados
    const imagens = request.files?.map(file => file.filename) || [];

    const [incident] = await connection('incidents')
      .insert({
        nome,
        nascimento,
        cpf,
        empresa,
        setor,
        telefone,
        observacao,
        imagem1: imagens[0] || null,
        imagem2: imagens[1] || null,
        imagem3: imagens[2] || null,
        ong_id,
      })
      .returning('id');

    const id = incident.id;
    return response.json({ id });
  },

  // Buscar incidente específico (para edição)
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

      // Criar array de fotos a partir dos campos individuais
      const fotos = [];
      if (incident.imagem1) fotos.push(incident.imagem1);
      if (incident.imagem2) fotos.push(incident.imagem2);
      if (incident.imagem3) fotos.push(incident.imagem3);

      return response.json({
        ...incident,
        fotos // Adiciona o array de fotos ao retorno
      });
    } catch (err) {
      return response.status(500).json({ error: 'Erro ao buscar cadastro.' });
    }
  },

  // Atualizar incidente (qualquer usuário pode editar campos normais)
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
    } catch (err) {
      return response.status(500).json({ error: 'Erro na atualização.' });
    }
  },

  // Bloquear/desbloquear incidente (exclusivo para ADMs)
  async blockIncident(request, response) {
    const { id } = request.params;
    const { bloqueado } = request.body;
    const ong_id = request.headers.authorization;

    try {
      // Verificação estrita de ADM (igual ao delete)
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

      // PostgreSQL espera boolean, não 0/1
      await connection('incidents')
        .where('id', id)
        .update({ bloqueado: !!bloqueado });

      return response.status(204).send();
    } catch (err) {
      console.error('Erro no bloqueio:', err);
      return response.status(500).json({
        error: 'Erro ao atualizar bloqueio.'
      });
    }
  },

  // Deletar incidente (exclusivo para ADMs)
  async delete(request, response) {
    const { id } = request.params;
    const ong_id = request.headers.authorization;

    const ong = await connection('ongs')
      .where('id', ong_id)
      .where('type', 'ADM')
      .first();

    if (!ong) {
      return response.status(403).json({
        error: 'Somente administradores podem excluir cadastros.'
      });
    }

    const incident = await connection('incidents')
      .where('id', id)
      .first();

    if (!incident) {
      return response.status(404).json({ error: 'Incidente não encontrado.' });
    }

    await connection('incidents').where('id', id).delete();

    return response.status(204).send();
  }
};
