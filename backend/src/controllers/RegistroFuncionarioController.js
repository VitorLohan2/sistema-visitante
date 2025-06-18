//controllers/RegistroFuncionarioController.js

const connection = require('../database/connection');

module.exports = {
  /**
   * Registra entrada/saída do funcionário
   */
  async registrarPonto(req, res) {
    const { cracha } = req.body;

    if (!cracha) {
      return res.status(400).json({ error: 'Número do crachá é obrigatório' });
    }

    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Busca funcionário por crachá (sem filtrar por ativo ainda)
      const funcionario = await connection('funcionarios')
        .where('cracha', cracha)
        .first();

      // Se não encontrou nenhum
      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionário não encontrado' });
      }

      // Se encontrou, mas está inativo
      if (!funcionario.ativo) {
        return res.status(403).json({ error: 'ACESSO NÃO PERMITIDO!!' });
      }

      // Verifica registro do dia
      const registro = await connection('registros_funcionarios')
        .where('funcionario_id', funcionario.id)
        .where('data', hoje)
        .first();

      if (!registro) {
        const [novoRegistro] = await connection('registros_funcionarios')
          .insert({
            funcionario_id: funcionario.id,
            data: hoje,
            hora_entrada: new Date()
          })
          .returning('*');

        return res.json({
          mensagem: 'Entrada registrada com sucesso',
          registro: {
            ...novoRegistro,
            tipo: 'entrada'
          },
          nomeFuncionario: funcionario.nome,
          tipo: 'entrada'
        });
      }

      if (!registro.hora_saida) {
        const horaSaida = new Date();
        const diffMs = horaSaida - new Date(registro.hora_entrada);
        const horasTrabalhadas = (diffMs / (1000 * 60 * 60)).toFixed(2);

        const [registroAtualizado] = await connection('registros_funcionarios')
          .where('id', registro.id)
          .update({
            hora_saida: horaSaida,
            tempo_total: horasTrabalhadas,
            atualizado_em: new Date()
          })
          .returning('*');

        return res.json({
          mensagem: 'Saída registrada com sucesso',
          registro: {
            ...registroAtualizado,
            tipo: 'saida'
          },
          nomeFuncionario: funcionario.nome,
          tipo: 'saida'
        });
      }

      return res.status(400).json({ 
        error: 'Já existe registro completo para hoje',
        nomeFuncionario: funcionario.nome
      });

    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
      return res.status(500).json({ 
        error: 'Erro interno ao registrar ponto',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Busca histórico de registros
   */
  async historico(req, res) {
    try {
      const { cracha, dataInicio, dataFim } = req.query;
      
      // Busca funcionário
      const funcionario = await connection('funcionarios')
        .where('cracha', cracha)
        .first();
      
      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionário não encontrado' });
      }

      // Monta query de registros
      let query = connection('registros_funcionarios')
        .where('funcionario_id', funcionario.id)
        .orderBy('data', 'desc');

      if (dataInicio) {
        query = query.where('data', '>=', dataInicio);
      }

      if (dataFim) {
        query = query.where('data', '<=', dataFim);
      }

      const registros = await query;

      return res.json({
        funcionario: {
          id: funcionario.id,
          nome: funcionario.nome,
          cracha: funcionario.cracha
        },
        registros
      });
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar histórico' });
    }
  }
};