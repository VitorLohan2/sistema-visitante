// controllers/TicketController.js
const connection = require('../database/connection');
const moment = require('moment-timezone'); // ✅ Importa moment com timezone

module.exports = {
  async create(req, res) {
    const { funcionario, motivo, descricao, setorResponsavel, nomeUsuario, setorUsuario } = req.body;
    const ong_id = req.headers.authorization;
    
    if (!funcionario || !motivo || !descricao || !setorResponsavel || !nomeUsuario || !setorUsuario) {
      return res.status(400).json({ 
        error: 'Todos os campos são obrigatórios',
        campos_faltantes: {
          funcionario: !funcionario,
          motivo: !motivo,  
          descricao: !descricao,
          setorResponsavel: !setorResponsavel,
          nomeUsuario: !nomeUsuario,
          setorUsuario: !setorUsuario
        }
      });
    }

    try {
      console.log('Dados para criar ticket:', req.body);
      const data_criacao = moment().tz("America/Sao_Paulo").format('YYYY-MM-DD HH:mm:ss');

      const [ticket] = await connection('tickets')
        .insert({
          ong_id,
          funcionario,
          motivo,
          descricao,
          setor_responsavel: setorResponsavel,
          nome_usuario: nomeUsuario,
          setor_usuario: setorUsuario,
          status: 'Aberto',
          data_criacao
        })
        .returning('id'); // ✅ PostgreSQL

      return res.status(201).json({ 
        id: ticket.id,
        message: 'Ticket criado com sucesso',
        data: {
          funcionario,
          motivo,
          setorResponsavel,
          criadoPor: nomeUsuario,
          setorUsuario
        }
      });

    } catch (err) {
      console.error('Erro ao criar ticket:', err);
      return res.status(500).json({ 
        error: 'Erro ao criar o ticket',
        detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },

  async index(req, res) {
    const ong_id = req.headers.authorization;

    try {
      const ong = await connection('ongs')
        .where('id', ong_id)
        .select('type')
        .first();

      if (!ong) {
        return res.status(404).json({ error: 'ONG não encontrada' });
      }

      const tickets = await connection('tickets')
        .select(
          'tickets.*',
          'ongs.name as ong_name',
          'ongs.setor as ong_setor'
        )
        .leftJoin('ongs', 'tickets.ong_id', 'ongs.id')
        .orderBy('tickets.data_criacao', 'desc');

      return res.json(tickets);

    } catch (err) {
      console.error('Erro ao buscar tickets:', err);
      return res.status(500).json({ 
        error: 'Erro ao buscar tickets',
        detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },

  async update(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const ong_id = req.headers.authorization;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do ticket deve ser numérico' });
    }

    const statusValidos = ['Aberto', 'Em andamento', 'Resolvido'];
    if (!status || !statusValidos.includes(status)) {
      return res.status(400).json({ 
        error: 'Status inválido',
        status_validos: statusValidos
      });
    }

    try {
      const ong = await connection('ongs')
        .where('id', ong_id)
        .select('type', 'setor')
        .first();

      if (!ong) {
        return res.status(404).json({ error: 'ONG não encontrada' });
      }

      const ticket = await connection('tickets')
        .where('id', id)
        .first();

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
      }

      const isAdmin = ong.type === 'ADMIN';
      const isSeguranca = ong.setor === 'Segurança';

      if (!isAdmin && !isSeguranca) {
        return res.status(403).json({ 
          error: 'Acesso permitido apenas para administradores ou setor de Segurança'
        });
      }

      const data_atualizacao = moment().tz("America/Sao_Paulo").format('YYYY-MM-DD HH:mm:ss');

      const updateData = { 
        status,
        data_atualizacao,
        visualizado: true
      };

      if (status === 'Resolvido') {
        updateData.data_finalizacao = moment().tz("America/Sao_Paulo").format('YYYY-MM-DD HH:mm:ss');
      }

      await connection('tickets')
        .where('id', id)
        .update(updateData);

      return res.json({ 
        success: true,
        message: 'Status atualizado com sucesso',
        ticket_id: id,
        novo_status: status
      });

    } catch (err) {
      console.error('Erro ao atualizar ticket:', err);
      return res.status(500).json({ 
        error: 'Erro interno ao atualizar ticket',
        detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },
    
  async show(req, res) {
    const { id } = req.params;
    const ong_id = req.headers.authorization;

    try {
      const ticket = await connection('tickets')
        .where('tickets.id', id)
        .select(
          'tickets.*',
          'ongs.name as ong_name',
          'ongs.setor as ong_setor'
        )
        .leftJoin('ongs', 'tickets.ong_id', 'ongs.id')
        .first();

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
      }

      const ong = await connection('ongs')
        .where('id', ong_id)
        .first();

      if (ong.type !== 'ADMIN' && ticket.ong_id !== ong_id) {
        return res.status(403).json({ error: 'Acesso negado ao ticket' });
      }

      if (!ticket.visualizado) {
        const data_atualizacao = moment().tz("America/Sao_Paulo").format('YYYY-MM-DD HH:mm:ss');

        await connection('tickets')
          .where('id', id)
          .update({
            visualizado: true,
            data_atualizacao
          });

        ticket.visualizado = true;
      }

      return res.json(ticket);

    } catch (err) {
      console.error('Erro ao buscar ticket:', err);
      return res.status(500).json({ 
        error: 'Erro ao buscar ticket',
        detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },

  async countUnseen(req, res) {
    const ong_id = req.headers.authorization;
    
    try {
      const ong = await connection('ongs')
        .where('id', ong_id)
        .first();

      if (!ong || ong.setor !== 'Segurança') {
        return res.json({ count: 0 });
      }

      const count = await connection('tickets')
        .where({
          setor_responsavel: 'Segurança',
          visualizado: false,
          status: 'Aberto'
        })
        .count('id as total');

      return res.json({ count: count[0].total || 0 });
    } catch (err) {
      console.error('Erro ao contar tickets:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }
  },

  async markAllSeen(req, res) {
    const ong_id = req.headers.authorization;
    
    try {
      await connection('tickets')
        .where({
          setor_responsavel: 'Segurança',
          visualizado: false
        })
        .update({ visualizado: true });
      
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao atualizar tickets' });
    }
  }
};
