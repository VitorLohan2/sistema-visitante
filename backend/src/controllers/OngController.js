const generateUniqueId = require('../utils/generateUniqueId')
const connection  = require('../database/connection')

module.exports = {
  async index(request, response) {
  const ongs = await connection('ongs').select('*')

  return response.json(ongs)
 },

  async create(request, response) {

    const { name, birthdate, cpf, empresa, setor, email, whatsapp, city, uf, type } = request.body

    // Limpa o CPF (remove pontos e traço)
    const cleanedCpf = cpf.replace(/\D/g, '')

    const id = generateUniqueId()

    await connection('ongs').insert({
      id,
      name,
      birthdate, // Novo campo
      cpf: cleanedCpf, // Novo campo
      empresa, // Novo campo
      setor, // Novo campo
      email,
      whatsapp,
      city,
      uf,
      type: type || 'USER' // padrão USER, se não for enviado
    })

    return response.json({ id })
  },
    // ✅ NOVO: buscar uma ONG pelo ID
  async show(req, res) {
    const { id } = req.params;

    try {
      const ong = await connection('ongs')
        .where('id', id)
        .select('id', 'name', 'setor', 'type')
        .first();

      if (!ong) {
        return res.status(404).json({ error: 'ONG não encontrada' });
      }

      return res.json(ong);
    } catch (error) {
      console.error('Erro ao buscar ONG:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar ONG' });
    }
  } 
}; 
