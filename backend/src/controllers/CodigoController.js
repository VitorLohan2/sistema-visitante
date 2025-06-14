const connection = require('../database/connection');

module.exports = {
  // ✅ GERAR CÓDIGO (Somente para ADMs)
  async gerarCodigo(request, response) {
    const { codigo, limite_usos } = request.body;
    const criado_por = request.headers.authorization; // Pega do header (igual ao IncidentController)

    try {
      // Verifica se é ADM (igual ao seu método blockIncident)
      const ong = await connection('ongs')
        .where('id', criado_por)
        .where('type', 'ADM')
        .first();

      if (!ong) {
        console.log(`Tentativa de gerar código não autorizada por: ${criado_por}`);
        return response.status(403).json({ 
          error: 'Somente administradores podem gerar códigos.' 
        });
      }

      // Insere o novo código
      const [novoCodigo] = await connection('codigos_cadastro')
        .insert({
          codigo: codigo.toUpperCase(),
          criado_por,
          limite_usos: limite_usos || 1, // Default: 1 uso
          ativo: true
        })
        .returning('*');

      return response.status(201).json(novoCodigo);

    } catch (error) {
      console.error('Erro ao gerar código:', error);
      if (error.code === '23505') { // Código duplicado
        return response.status(400).json({ error: 'Este código já existe' });
      }
      return response.status(500).json({ 
        error: 'Erro interno no servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ VALIDAR CÓDIGO (Durante cadastro)
  async validarCodigo(request, response) {
    const { codigo } = request.params;

    try {
      const codigoValido = await connection('codigos_cadastro')
        .where({
          codigo: codigo.toUpperCase(),
          ativo: true
        })
        .whereRaw('usos_atuais < limite_usos')
        .first();

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
  },

  // ✅ LISTAR CÓDIGOS (Para ADMs)
  async listarCodigos(request, response) {
    const criado_por = request.headers.authorization;

    try {
      // Verifica se é ADM
      const ong = await connection('ongs')
        .where('id', criado_por)
        .where('type', 'ADM')
        .first();

      if (!ong) {
        return response.status(403).json({ 
          error: 'Somente administradores podem listar códigos.' 
        });
      }

      const codigos = await connection('codigos_cadastro')
        .where('criado_por', criado_por)
        .select('*')
        .orderBy('criado_em', 'desc');

      return response.json(codigos);

    } catch (error) {
      console.error('Erro ao listar códigos:', error);
      return response.status(500).json({ 
        error: 'Erro ao listar códigos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ DESATIVAR CÓDIGO (Para ADMs)
  async desativarCodigo(request, response) {
    const { id } = request.params;
    const criado_por = request.headers.authorization;

    try {
      // Verifica se é ADM
      const ong = await connection('ongs')
        .where('id', criado_por)
        .where('type', 'ADM')
        .first();

      if (!ong) {
        return response.status(403).json({ 
          error: 'Somente administradores podem desativar códigos.' 
        });
      }

      const result = await connection('codigos_cadastro')
        .where({ id, criado_por })
        .update({ ativo: false });

      if (result === 0) {
        return response.status(404).json({ error: 'Código não encontrado' });
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

  // ✅ (OPCIONAL) INCREMENTAR USO - Chamado pelo OngController após validação
  async incrementarUso(codigo) {
    try {
      await connection('codigos_cadastro')
        .where('codigo', codigo.toUpperCase())
        .increment('usos_atuais', 1);
    } catch (error) {
      console.error('Erro ao incrementar uso do código:', error);
      throw error;
    }
  },

  // ✅ DELETAR CÓDIGO (Para ADMs)
    async deleteCodigo(request, response) {
    const { id } = request.params;
    const criado_por = request.headers.authorization;

    try {
        // Verifica se é ADM
        const ong = await connection('ongs')
        .where('id', criado_por)
        .where('type', 'ADM')
        .first();

        if (!ong) {
        return response.status(403).json({ 
            error: 'Somente administradores podem deletar códigos.' 
        });
        }

        const result = await connection('codigos_cadastro')
        .where({ id, criado_por })
        .del();

        if (result === 0) {
        return response.status(404).json({ error: 'Código não encontrado' });
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
    
    // ✅ REATIVAR CÓDIGO (Para ADMs)
async ativarCodigo(request, response) {
  const { id } = request.params;
  const criado_por = request.headers.authorization;

  try {
    // Verifica se é ADM
    const ong = await connection('ongs')
      .where('id', criado_por)
      .where('type', 'ADM')
      .first();

    if (!ong) {
      return response.status(403).json({ 
        error: 'Somente administradores podem ativar códigos.' 
      });
    }

    const codigo = await connection('codigos_cadastro')
      .where({ id, criado_por })
      .select('usos_atuais', 'limite_usos')
      .first();

    if (!codigo) {
      return response.status(404).json({ error: 'Código não encontrado' });
    }

    if (codigo.usos_atuais >= codigo.limite_usos) {
      return response.status(400).json({ error: 'Código já atingiu o limite de usos' });
    }

    await connection('codigos_cadastro')
      .where({ id, criado_por })
      .update({ ativo: true });

    return response.status(200).json({ message: 'Código reativado com sucesso' });

  } catch (error) {
    console.error('Erro ao reativar código:', error);
    return response.status(500).json({ 
      error: 'Erro ao reativar código',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


};