//controllers/FuncionarioController.js
const connection = require('../database/connection');

module.exports = {
  /**
   * Lista todos os funcionários (ativos por padrão)
   */
  async index(req, res) {
    try {
      const { mostrarInativos = false } = req.query;
      
      let query = connection('funcionarios')
        .select('*')
        .orderBy('nome');

      if (!mostrarInativos) {
        query = query.where('ativo', true);
      }

      const funcionarios = await query;
      return res.json(funcionarios);
    } catch (error) {
      console.error('Erro ao listar funcionários:', error);
      return res.status(500).json({ error: 'Erro interno ao listar funcionários' });
    }
  },

  /**
   * Busca funcionário por crachá
   */
  async buscarPorCracha(req, res) {
    try {
      const { cracha } = req.params;
      
      const funcionario = await connection('funcionarios')
        .where('cracha', cracha)
        .first();

      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionário não encontrado' });
      }

      return res.json(funcionario);
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar funcionário' });
    }
  },

  /**
   * Cria novo funcionário (somente ADM)
   */
  async criar(req, res) {
    try {
      const { cracha, nome, setor, funcao, data_admissao } = req.body;
      
      // Verifica se crachá já existe
      const existe = await connection('funcionarios')
        .where('cracha', cracha)
        .first();
      
      if (existe) {
        return res.status(400).json({ error: 'Crachá já cadastrado' });
      }

      // Insere novo funcionário
      const [id] = await connection('funcionarios')
        .insert({
          cracha,
          nome,
          setor,
          funcao,
          data_admissao: data_admissao || new Date().toISOString().split('T')[0],
          ativo: true
        })
        .returning('id');

      return res.status(201).json({ id, message: 'Funcionário cadastrado com sucesso' });
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      return res.status(500).json({ error: 'Erro interno ao criar funcionário' });
    }
  },

  /**
   * Atualiza funcionário (somente ADM)
   */
  async criar(req, res) {
    try {
      const { cracha, nome, setor, funcao, data_admissao } = req.body;
      
      // Verifica se crachá já existe
      const existe = await connection('funcionarios')
        .where('cracha', cracha)
        .first();
      
      if (existe) {
        return res.status(400).json({ error: 'Crachá já cadastrado' });
      }

      // Formata a data de admissão
      const dataAdmissaoFormatada = data_admissao 
        ? new Date(data_admissao).toISOString()
        : new Date().toISOString();

      // Insere novo funcionário
      await connection('funcionarios').insert({
        cracha,
        nome: nome.toUpperCase(),
        setor,
        funcao,
        data_admissao: dataAdmissaoFormatada,
        ativo: true,
        data_demissao: null
      });

      return res.status(201).json({ cracha, message: 'Funcionário cadastrado com sucesso' });
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      return res.status(500).json({ 
        error: 'Erro interno ao criar funcionário',
        details: error.message
      });
    }
  },

  /**
   * Atualiza funcionário por crachá (somente ADM)
   */
  async atualizar(req, res) {
    try {
      const { cracha } = req.params;
      const { nome, setor, funcao, data_admissao, data_demissao, ativo } = req.body;
      
      // Verifica se funcionário existe
      const funcionario = await connection('funcionarios')
        .where('cracha', cracha)
        .first();
      
      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionário não encontrado' });
      }

      // Prepara dados para atualização
      const dadosAtualizacao = {
        nome: nome ? nome.toUpperCase() : funcionario.nome,
        setor: setor || funcionario.setor,
        funcao: funcao || funcionario.funcao,
        ativo: ativo !== undefined ? ativo : funcionario.ativo
      };

      // Formata data_admissao se fornecida
      if (data_admissao) {
        dadosAtualizacao.data_admissao = new Date(data_admissao).toISOString();
      }

      // Formata data_demissao
      if (data_demissao !== undefined) {
        dadosAtualizacao.data_demissao = data_demissao 
          ? new Date(data_demissao).toISOString()
          : null;
      }

      // Atualiza no banco
      await connection('funcionarios')
        .where('cracha', cracha)
        .update(dadosAtualizacao);

      return res.json({ 
        cracha,
        message: 'Funcionário atualizado com sucesso',
        changes: dadosAtualizacao
      });
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      return res.status(500).json({ 
        error: 'Erro interno ao atualizar funcionário',
        details: error.message
      });
    }
  }
};