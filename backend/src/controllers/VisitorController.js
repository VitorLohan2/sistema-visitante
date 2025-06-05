const connection = require('../database/connection');

module.exports = {
  // Listar visitantes atuais
  async index(request, response) {
    const ong_id = request.headers.authorization;

    const visitors = await connection('visitors')
      //.where('ong_id', ong_id) // Ative se for multi-ONG
      .select([
        'id',
        'name',
        'cpf',
        'company',
        'sector',
        'entry_date',
        'created_at'
      ]);

    return response.json(visitors);
  },

  // Registrar nova entrada
  async create(request, response) {
    const { name, cpf, company, sector } = request.body;
    const ong_id = request.headers.authorization;
    const entry_date = new Date();

    const [visitor] = await connection('visitors')
      .insert({
        name,
        cpf,
        company,
        sector,
        entry_date,
        ong_id,
      })
      .returning('id');

    return response.status(201).json({ id: visitor.id, entry_date });
  },

  // Encerrar visita e mover para histórico
  async endVisit(request, response) {
    const { id } = request.params;

    try {
      const visitor = await connection('visitors').where('id', id).first();

      if (!visitor) {
        return response.status(404).json({ error: 'Visitante não encontrado' });
      }

      await connection('history').insert({
        name: visitor.name,
        cpf: visitor.cpf,
        company: visitor.company,
        sector: visitor.sector,
        entry_date: visitor.entry_date,
        exit_date: new Date().toISOString(),
        ong_id: visitor.ong_id
      });

      await connection('visitors').where('id', id).delete();

      return response.status(204).send();
    } catch (err) {
      console.error('Erro ao encerrar visita:', err);
      return response.status(500).json({ error: 'Erro ao encerrar visita' });
    }
  },

  // Histórico completo de visitas
  async history(request, response) {
    const ongId = request.headers.authorization;

    try {
      const results = await connection('history')
        //.where('ong_id', ongId) // Descomente se multi-ONG
        .select('*');

      return response.json(results);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      return response.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  }
};
