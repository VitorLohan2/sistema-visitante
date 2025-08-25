// ===== CODIGOCONTROLLER  =====

const connection = require('../database/connection');

// ✅ Helper para extrair token do Bearer (igual ao TicketController)
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
  // ✅ LISTAR CÓDIGOS (Para ADMs) - COM DEBUG
  async listarCodigos(request, response) {
    const criado_por = getBearerToken(request); // ✅ USAR HELPER

    try {
      // ✅ DEBUG DETALHADO:
      console.log('=== DEBUG LISTAR CÓDIGOS ===');
      console.log('Authorization header:', criado_por);
      console.log('Tipo do criado_por:', typeof criado_por);
      
      if (!criado_por) {
        return response.status(401).json({ error: 'Authorization header é obrigatório' });
      }

      // Buscar ONG primeiro (sem filtro de type)
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
          error: 'Somente administradores tem permissão!',
          userType: ong.type,
          redirectTo: '/profile', // ✅ ADICIONAR REDIRECT
          tipoPossivelProblema: 'Valor do campo type está incorreto'
        });
      }

      console.log('✅ ONG é administrador, buscando códigos...');

      // ✅ BUSCAR TODOS OS CÓDIGOS (não apenas os criados por este ADM)
      const codigos = await connection('codigos_cadastro')
        .leftJoin('ongs', 'codigos_cadastro.criado_por', 'ongs.id')
        .select(
          'codigos_cadastro.*',
          'ongs.name as criado_por_nome'
        )
        .orderBy('codigos_cadastro.criado_em', 'desc')
        .catch(async (error) => {
          // Se der erro, tentar com 'codigos' (sem _cadastro)
          if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes('doesn\'t exist')) {
            console.log('Tabela codigos_cadastro não existe, tentando tabela "codigos"...');
            return await connection('codigos')
              .leftJoin('ongs', 'codigos.criado_por', 'ongs.id')
              .select(
                'codigos.*',
                'ongs.name as criado_por_nome'
              )
              .orderBy('codigos.created_at', 'desc');
          }
          throw error;
        });

      console.log('Códigos encontrados:', codigos.length);
      return response.json(codigos);

    } catch (error) {
      console.error('Erro ao listar códigos:', error);
      return response.status(500).json({ 
        error: 'Erro ao listar códigos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // ✅ GERAR CÓDIGO (Somente para ADMs) - CORRIGIDO
  async gerarCodigo(request, response) {
    const { codigo, limite_usos } = request.body;
    const criado_por = getBearerToken(request); // ✅ USAR HELPER

    try {
      // ✅ ACEITAR TANTO ADM QUANTO ADMIN:
      const ong = await connection('ongs')
        .where('id', criado_por)
        .whereIn('type', ['ADM', 'ADMIN']) // ✅ Aceita ambos
        .first();

      if (!ong) {
        console.log(`Tentativa de gerar código não autorizada por: ${criado_por}`);
        return response.status(403).json({ 
          error: 'Somente administradores podem gerar códigos.',
          redirectTo: '/profile' // ✅ ADICIONAR REDIRECT
        });
      }

      // Tentar inserir na tabela correta
      const [novoCodigo] = await connection('codigos_cadastro')
        .insert({
          codigo: codigo.toUpperCase(),
          criado_por,
          limite_usos: limite_usos || 1,
          ativo: true
        })
        .returning('*')
        .catch(async (error) => {
          // Se der erro de tabela, tentar 'codigos'
          if (error.code === 'ER_NO_SUCH_TABLE') {
            return await connection('codigos')
              .insert({
                codigo: codigo.toUpperCase(),
                criado_por,
                limite_usos: limite_usos || 1,
                ativo: true
              })
              .returning('*');
          }
          throw error;
        });

      return response.status(201).json(novoCodigo);

    } catch (error) {
      console.error('Erro ao gerar código:', error);
      if (error.code === '23505') {
        return response.status(400).json({ error: 'Este código já existe' });
      }
      return response.status(500).json({ 
        error: 'Erro interno no servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ DESATIVAR CÓDIGO - CORRIGIDO
  async desativarCodigo(request, response) {
    const { id } = request.params;
    const criado_por = getBearerToken(request); // ✅ USAR HELPER

    try {
      // ✅ ACEITAR TANTO ADM QUANTO ADMIN:
      const ong = await connection('ongs')
        .where('id', criado_por)
        .whereIn('type', ['ADM', 'ADMIN'])
        .first();

      if (!ong) {
        return response.status(403).json({ 
          error: 'Somente administradores podem desativar códigos.',
          redirectTo: '/profile' // ✅ ADICIONAR REDIRECT
        });
      }

      const result = await connection('codigos_cadastro')
        .where({ id, criado_por })
        .update({ ativo: false })
        .catch(async (error) => {
          if (error.code === 'ER_NO_SUCH_TABLE') {
            return await connection('codigos')
              .where({ id, criado_por })
              .update({ ativo: false });
          }
          throw error;
        });

      if (result === 0) {
        return response.status(404).json({ error: 'Permissão Negada!' });
      }

      return response.status(204).send();

    } catch (error) {
      console.error('Erro ao desativar código:', error);
      return response.status(500).json({ 
        error: 'Erro ao desativar código',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ ATIVAR CÓDIGO - CORRIGIDO
  async ativarCodigo(request, response) {
    const { id } = request.params;
    const criado_por = getBearerToken(request); // ✅ USAR HELPER

    try {
      // ✅ ACEITAR TANTO ADM QUANTO ADMIN:
      const ong = await connection('ongs')
        .where('id', criado_por)
        .whereIn('type', ['ADM', 'ADMIN'])
        .first();

      if (!ong) {
        return response.status(403).json({ 
          error: 'Somente administradores podem ativar códigos.',
          redirectTo: '/profile' // ✅ ADICIONAR REDIRECT
        });
      }

      const codigo = await connection('codigos_cadastro')
        .where({ id, criado_por })
        .select('usos_atuais', 'limite_usos')
        .first()
        .catch(async (error) => {
          if (error.code === 'ER_NO_SUCH_TABLE') {
            return await connection('codigos')
              .where({ id, criado_por })
              .select('usos_atuais', 'limite_usos')
              .first();
          }
          throw error;
        });

      if (!codigo) {
        return response.status(404).json({ error: 'Permissão Negada!' });
      }

      if (codigo.usos_atuais >= codigo.limite_usos) {
        return response.status(400).json({ error: 'Código já atingiu o limite de usos' });
      }

      await connection('codigos_cadastro')
        .where({ id, criado_por })
        .update({ ativo: true })
        .catch(async (error) => {
          if (error.code === 'ER_NO_SUCH_TABLE') {
            return await connection('codigos')
              .where({ id, criado_por })
              .update({ ativo: true });
          }
          throw error;
        });

      return response.status(200).json({ message: 'Código reativado com sucesso' });

    } catch (error) {
      console.error('Erro ao reativar código:', error);
      return response.status(500).json({ 
        error: 'Erro ao reativar código',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ DELETAR CÓDIGO - CORRIGIDO
  async deleteCodigo(request, response) {
    const { id } = request.params;
    const criado_por = getBearerToken(request); // ✅ USAR HELPER

    try {
      // ✅ ACEITAR TANTO ADM QUANTO ADMIN:
      const ong = await connection('ongs')
        .where('id', criado_por)
        .whereIn('type', ['ADM', 'ADMIN'])
        .first();

      if (!ong) {
        return response.status(403).json({ 
          error: 'Somente administradores podem deletar códigos.',
          redirectTo: '/profile' // ✅ ADICIONAR REDIRECT
        });
      }

      const result = await connection('codigos_cadastro')
        .where({ id, criado_por })
        .del()
        .catch(async (error) => {
          if (error.code === 'ER_NO_SUCH_TABLE') {
            return await connection('codigos')
              .where({ id, criado_por })
              .del();
          }
          throw error;
        });

      if (result === 0) {
        return response.status(404).json({ error: 'Permissão Negada!' });
      }

      return response.status(204).send();

    } catch (error) {
      console.error('Erro ao deletar código:', error);
      return response.status(500).json({ 
        error: 'Erro ao deletar código',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ VALIDAR CÓDIGO (público)
  async validarCodigo(request, response) {
    const { codigo } = request.params;

    try {
      const codigoValido = await connection('codigos_cadastro')
        .where({
          codigo: codigo.toUpperCase(),
          ativo: true
        })
        .whereRaw('usos_atuais < limite_usos')
        .first()
        .catch(async (error) => {
          if (error.code === 'ER_NO_SUCH_TABLE') {
            return await connection('codigos')
              .where({
                codigo: codigo.toUpperCase(),
                ativo: true
              })
              .whereRaw('usos_atuais < limite_usos')
              .first();
          }
          throw error;
        });

      if (!codigoValido) {
        return response.status(400).json({ 
          valido: false,
          error: 'Código inválido ou limite de usos atingido' 
        });
      }

      return response.json({ 
        valido: true,
        usos_restantes: codigoValido.limite_usos - codigoValido.usos_atuais
      });

    } catch (error) {
      console.error('Erro ao validar código:', error);
      return response.status(500).json({ 
        error: 'Erro ao validar código',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};