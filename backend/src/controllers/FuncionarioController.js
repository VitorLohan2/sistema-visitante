//controllers/FuncionarioController.js
const connection = require('../database/connection');

// ✅ Helper para extrair token do Bearer (igual aos outros controllers)
function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1]; // retorna só o ID
  }
  return authHeader; // Se não tem Bearer, retorna como está
}

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
   * Cria novo funcionário (SOMENTE ADM) - COM AUTENTICAÇÃO
   */
  async criar(req, res) {
    const { cracha, nome, setor, funcao, data_admissao } = req.body;
    const criado_por = getBearerToken(req); // ✅ USAR HELPER

    try {
      // ✅ DEBUG DETALHADO:
      console.log('=== DEBUG CADASTRAR FUNCIONÁRIO ===');
      console.log('Authorization header:', criado_por);
      console.log('Tipo do criado_por:', typeof criado_por);
      
      if (!criado_por) {
        return res.status(401).json({ error: 'Authorization header é obrigatório' });
      }

      // Buscar ONG primeiro
      const ong = await connection('ongs')
        .where('id', criado_por)
        .first();

      console.log('ONG encontrada:', ong);

      if (!ong) {
        console.log('❌ ONG não encontrada para ID:', criado_por);
        return res.status(404).json({ 
          error: 'ONG não encontrada',
          id_enviado: criado_por
        });
      }

      console.log('Tipo da ONG encontrada:', ong.type);

      // ✅ VERIFICAR AMBOS OS VALORES (ADM e ADMIN):
      if (ong.type !== 'ADM' && ong.type !== 'ADMIN') {
        console.log('❌ ONG não é ADM nem ADMIN. Tipo atual:', ong.type);
        return res.status(403).json({ 
          error: 'Somente administradores tem permissão!',
          userType: ong.type,
          redirectTo: '/profile', // ✅ ADICIONAR REDIRECT
          tipoPossivelProblema: 'Valor do campo type está incorreto'
        });
      }

      console.log('✅ ONG é administrador, prosseguindo com cadastro...');

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

      console.log('✅ Funcionário cadastrado com sucesso:', cracha);

      return res.status(201).json({ 
        cracha, 
        message: 'Funcionário cadastrado com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      return res.status(500).json({ 
        error: 'Erro interno ao criar funcionário',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Atualiza funcionário por crachá (SOMENTE ADM) - COM AUTENTICAÇÃO
   */
  async atualizar(req, res) {
    const { cracha } = req.params;
    const { nome, setor, funcao, data_admissao, data_demissao, ativo } = req.body;
    const criado_por = getBearerToken(req); // ✅ USAR HELPER

    try {
      // ✅ VERIFICAÇÃO DE AUTENTICAÇÃO ADM
      if (!criado_por) {
        return res.status(401).json({ error: 'Authorization header é obrigatório' });
      }

      const ong = await connection('ongs')
        .where('id', criado_por)
        .first();

      if (!ong) {
        return res.status(404).json({ 
          error: 'ONG não encontrada',
          id_enviado: criado_por
        });
      }

      // ✅ VERIFICAR AMBOS OS VALORES (ADM e ADMIN):
      if (ong.type !== 'ADM' && ong.type !== 'ADMIN') {
        return res.status(403).json({ 
          error: 'Somente administradores tem permissão!',
          userType: ong.type,
          redirectTo: '/profile'
        });
      }

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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};