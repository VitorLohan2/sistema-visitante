const connection = require('../database/connection');

// ✅ Helper para extrair token do Bearer (igual ao CodigoController)
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
  async index(request, response) {
    try {
      const empresasVisitantes = await connection('empresas_visitantes')
        .select('id', 'nome')
        .orderBy('nome');

      return response.json(empresasVisitantes);
    } catch (error) {
      console.error('Erro ao buscar empresas de visitantes:', error);
      return response.status(500).json({ error: 'Erro ao buscar empresas de visitantes.' });
    }
  },

  // ✅ CADASTRAR EMPRESA (Somente para ADMs) - COM AUTENTICAÇÃO
  async create(request, response) {
    const { nome } = request.body;
    const criado_por = getBearerToken(request); // ✅ USAR HELPER

    try {
      // ✅ DEBUG DETALHADO:
      console.log('=== DEBUG CADASTRAR EMPRESA VISITANTE ===');
      console.log('Authorization header:', criado_por);
      console.log('Tipo do criado_por:', typeof criado_por);
      
      if (!criado_por) {
        return response.status(401).json({ error: 'Authorization header é obrigatório' });
      }

      // Buscar ONG primeiro
      const ong = await connection('ongs')
        .where('id', criado_por)
        .first();

      console.log('ONG encontrada:', ong);

      if (!ong) {
        console.log('❌ ONG não encontrada para ID:', criado_por);
        return response.status(404).json({ 
          error: 'ONG não encontrada',
          id_enviado: criado_por
        });
      }

      console.log('Tipo da ONG encontrada:', ong.type);

      // ✅ VERIFICAR AMBOS OS VALORES (ADM e ADMIN):
      if (ong.type !== 'ADM' && ong.type !== 'ADMIN') {
        console.log('❌ ONG não é ADM nem ADMIN. Tipo atual:', ong.type);
        return response.status(403).json({ 
          error: 'Somente administradores podem cadastrar empresas de visitantes!',
          userType: ong.type,
          redirectTo: '/profile', // ✅ ADICIONAR REDIRECT
          tipoPossivelProblema: 'Valor do campo type está incorreto'
        });
      }

      console.log('✅ ONG é administrador, prosseguindo com cadastro...');

      // Validação básica
      if (!nome || nome.trim() === '') {
        return response.status(400).json({ error: 'Nome da empresa é obrigatório.' });
      }

      // Verificar se já existe uma empresa com o mesmo nome
      const empresaExistente = await connection('empresas_visitantes')
        .where({ nome: nome.trim().toUpperCase() })
        .first();

      if (empresaExistente) {
        return response.status(400).json({ error: 'Já existe uma empresa com este nome.' });
      }

      // Inserir a nova empresa
      const [empresa] = await connection('empresas_visitantes')
        .insert({
          nome: nome.trim().toUpperCase()
        })
        .returning(['id', 'nome']);

      console.log('✅ Empresa cadastrada com sucesso:', empresa);

      return response.json({ 
        ...empresa,
        message: 'Empresa cadastrada com sucesso!' 
      });

    } catch (error) {
      console.error('Erro ao cadastrar empresa de visitantes:', error);
      return response.status(500).json({ 
        error: 'Erro ao cadastrar empresa de visitantes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};