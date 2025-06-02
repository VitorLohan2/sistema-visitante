const connection = require('../database/connection')

module.exports = {
  async create(request, response) {
    const { id } = request.body

    const ong = await connection('ongs')
      .where('id', id)
      .select('name', 'type')
      .first()

    if (!ong) {
      return response.status(400).json({ error: 'Nenhuma CADASTRO encontrada com este ID' })
    }

   return response.json({
    name: ong.name,
    type: ong.type // ← Isso vai para o frontend
    });
  }
}