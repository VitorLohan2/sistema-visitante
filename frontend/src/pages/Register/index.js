import React, { useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'

import api from '../../services/api'
import './styles.css'

import logoImg from '../../assets/logo.svg'

export default function Register() {
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('') // Novo estado para data de nascimento
  const [cpf, setCpf] = useState('') // Novo estado para CPF
  const [empresa, setEmpresa] = useState('') // Novo estado para empresa
  const [setor, setSetor] = useState('') // Novo estado para setor
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState('')
  const [uf, setUf] = useState('')
  
  // Lista de empresas disponíveis para seleção
  const empresasDisponiveis = [
    "Dime",
    "Prestadora de Serviço",
    "Outros"
  ];

  const setoresDisponiveis = [
  "Segurança",
  "Recepção"
  ];

  const history = useHistory()

  async function handleRegister(e) {
    e.preventDefault()

    // Validação do CPF
    const cleanedCpf = cpf.replace(/\D/g, '')
    if (cleanedCpf.length !== 11) {
      alert('O CPF deve conter 11 dígitos.')
      return
    }

    // Validação do WhatsApp
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '')
    if (cleanedWhatsapp.length !== 11) {
      alert('O número de Telefone deve conter 11 dígitos (DD + número).')
      return
    }

    // Validação da empresa (agora obrigatória da lista)
    if (!empresa) {
      alert('Selecione uma empresa!');
      return;
    }
    
    const data = {
      name,
      email,
      whatsapp,
      city,
      uf,
      birthdate, // Incluindo data de nascimento
      cpf, // Incluindo CPF
      empresa, // Usa diretamente o valor selecionado
      setor, // Incluindo setor
    }
    
    try {
      const response = await api.post('ongs', data)
    
      alert(`Seu ID de acesso: ${response.data.id}`)
      history.push('/')
    } catch (err) {
      alert('Erro no cadastro, tente novamente')
    }
  }

  // Função para formatar o CPF
  const formatCPF = (value) => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '')

    // Adiciona a pontuação
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/)
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`
    }
    
    return value
  }

  const handleCpfChange = (e) => {
    const formattedCpf = formatCPF(e.target.value)
    setCpf(formattedCpf)
  }

  return (
    <div className="register-container">
      <div className="content">
        <section>
          <img src={logoImg} alt="DIME" width={"350px"}/>
          <h1> Cadastro </h1>
          <p> Solicite o código de cadastro ao setor de alta performance.</p>
          <Link className="back-link" to="/">
            <FiArrowLeft size={16} color="#e02041" />
            Voltar
          </Link>
        </section>
        <form onSubmit={handleRegister}>
          <input placeholder="Nome" value={name} onChange={e => setName(e.target.value.toUpperCase())} />
           <input 
            type="date" 
            placeholder="Nascimento" 
            value={birthdate} 
            onChange={e => setBirthdate(e.target.value)} 
          />
          <input 
            placeholder="CPF" 
            value={cpf} 
            onChange={handleCpfChange} // Usando a nova função
          />

          <select  
            value={empresa} 
            onChange={e => setEmpresa(e.target.value)} 
            className="select-empresa"
            required
          >
          <option value="">Selecione sua empresa</option>
            {empresasDisponiveis.map((emp, index) => (
              <option key={index} value={emp}>
                {emp}
              </option>
            ))}
          </select>

          <select
            value={setor}
            onChange={e => setSetor(e.target.value)}
            className="select-setor"  // Usaremos a mesma classe do select de empresa
            required
          >
          <option value="">Selecione seu setor</option>
            {setoresDisponiveis.map((setorOpcao, index) => (
              <option key={index} value={setorOpcao}>
                {setorOpcao}
              </option>
            ))}
          </select>

          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="(DD)99999-9999" value={whatsapp} onChange={e => { const value = e.target.value.replace(/\D/g, '').slice(0, 11) 
          setWhatsapp(value)}} />
          <div className="input-group">
            <input placeholder="Cidade" value={city} onChange={e => setCity(e.target.value.toUpperCase())} />
            <input placeholder="UF" value={uf} onChange={e => { const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) 
            setUf(value)}} style={{ width: 80 }} />
          </div>
          <button className="button" type="submit"> Cadastrar </button>
        </form>
      </div>
    </div>
  )
}