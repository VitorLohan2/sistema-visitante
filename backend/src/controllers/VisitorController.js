const connection = require('../database/connection');

module.exports = {
  async index(request, response) {
    const ong_id = request.headers.authorization;

    const visitors = await connection('visitors')
      //.where('ong_id', ong_id)
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

  async create(request, response) {
    const { name, cpf, company, sector } = request.body;
    const ong_id = request.headers.authorization;
    const entry_date = new Date();

    const [id] = await connection('visitors').insert({
      name,
      cpf,
      company,
      sector,
      entry_date,
      ong_id,
    });

    return response.json({ id, entry_date });
  },

  async endVisit(request, response) {    
    const { id } = request.params;

    try {
      // Busca o visitante pelo id
      const visitor = await connection('visitors').where('id', id).first();

      if (!visitor) {
        return response.status(404).json({ error: 'Visitante não encontrado' });
      }

      // Insere na tabela history com exit_date atual
      await connection('history').insert({
        name: visitor.name,
        cpf: visitor.cpf,
        company: visitor.company,
        sector: visitor.sector,
        entry_date: visitor.entry_date,
        exit_date: new Date().toISOString(),
        ong_id: visitor.ong_id
      });

      // Remove da tabela visitors
      await connection('visitors').where('id', id).del();

      return response.status(204).send();
    } catch (err) {
      console.error(err);
      return response.status(500).json({ error: 'Erro ao encerrar visita' });
    }
  },

  async history(request, response) {
    const ongId = request.headers.authorization;

    try {
      const results = await connection('history')
        //.where('ong_id', ongId)
        .select('*');

      return response.json(results);
    } catch (err) {
      return response.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  }
};
