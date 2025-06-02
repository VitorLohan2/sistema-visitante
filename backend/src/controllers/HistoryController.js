const connection = require('../database/connection');

module.exports = {
  async index(request, response) {
    const ong_id = request.headers.authorization;
    
    try {
      const history = await connection('history')
        //.where('ong_id', ong_id)
        .select([
          'id',
          'name',
          'cpf',
          'company',
          'sector',
          'entry_date',
          'exit_date'
        ])
        .orderBy('exit_date', 'desc');

      // Formata datas para o frontend
      const formattedHistory = history.map(record => ({
        ...record,
        entry_date: new Date(record.entry_date).toLocaleString('pt-BR'),
        exit_date: new Date(record.exit_date).toLocaleString('pt-BR'),
        duration: this.calculateDuration(record.entry_date, record.exit_date)
      }));

      return response.json(formattedHistory);
    } catch (err) {
      console.error('Erro no histórico:', err);
      return response.status(500).json({ 
        error: 'Erro ao carregar histórico',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },

  async create(request, response) {
    const transaction = await connection.transaction(); // Inicia transação
    
    try {
      const { name, cpf, company, sector, entry_date } = request.body;
      const ong_id = request.headers.authorization;

      // Validação básica
      if (!name || !cpf || !company || !sector) {
        await transaction.rollback();
        return response.status(400).json({ error: 'Dados incompletos' });
      }

      const historyRecord = {
        name,
        cpf,
        company,
        sector,
        entry_date: entry_date || new Date().toISOString(),
        exit_date: new Date().toISOString(),
        ong_id
      };

      const [id] = await connection('history')
        .transacting(transaction)
        .insert(historyRecord);

      await transaction.commit();
      
      return response.status(201).json({
        id,
        ...historyRecord,
        message: 'Registro criado com sucesso'
      });

    } catch (err) {
      await transaction.rollback();
      console.error('Erro ao criar histórico:', err);
      return response.status(400).json({
        error: 'Erro ao criar registro',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },

  async stats(request, response) {
    const ong_id = request.headers.authorization;
    
    try {
      const stats = await connection('history')
        //.where('ong_id', ong_id)
        .select(
          connection.raw('COUNT(*) as total_visits'),
          connection.raw('AVG(TIMESTAMPDIFF(MINUTE, entry_date, exit_date)) as avg_duration'),
          connection.raw('MAX(TIMESTAMPDIFF(MINUTE, entry_date, exit_date)) as max_duration'),
          connection.raw('MIN(TIMESTAMPDIFF(MINUTE, entry_date, exit_date)) as min_duration'),
          connection.raw('SUM(TIMESTAMPDIFF(MINUTE, entry_date, exit_date)) as total_time')
        )
        .first();

      // Formatação dos resultados
      const formattedStats = {
        ...stats,
        avg_duration: this.formatDuration(stats.avg_duration),
        max_duration: this.formatDuration(stats.max_duration),
        min_duration: this.formatDuration(stats.min_duration),
        total_time: this.formatDuration(stats.total_time)
      };

      return response.json(formattedStats);
    } catch (err) {
      console.error('Erro nas estatísticas:', err);
      return response.status(500).json({
        error: 'Erro ao calcular estatísticas',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },

  // Métodos utilitários (não expostos via rotas)
  calculateDuration(entryDate, exitDate) {
    const minutes = Math.floor((new Date(exitDate) - new Date(entryDate)) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  },

  formatDuration(minutes) {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
};