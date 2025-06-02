
const request = require('supertest')
const app = require('../../src/app')
const connection = require('../../src/database/connection')

describe('ONG', () => {
  beforeEach(async () => {
    await connection.migrate.rollback()
    await connection.migrate.latest()
  })

  afterAll(async () => {
    await connection.destroy()
  })

  it('should be able to create a new ONG', async () => {
    const response = await request(app).post('/ongs').send({
	    name: "APAD2",
	    email: "contato@contato.com",
	    whatsapp: "4700000000",
	    city: "Rio do Sul",
	    uf: "SC",
      birthdate: "1990-01-01", // Adicionando data de nascimento
      cpf: "12345678901", // Adicionando CPF
      empresa: "DIME", // Adicionando empresa
      setor: "Segurança" // Adicionando setor
    })

    expect(response.body).toHaveProperty('id')
    expect(response.body.id).toHaveLength(8) // Verifique se o ID gerado tem o comprimento correto
  })
})
