import React, { useState, useEffect } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import api from '../../services/api'
import './styles.css'
import logoImg from '../../assets/logo.svg'

export default function Register() {
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [cpf, setCpf] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [setor, setSetor] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState('')
  const [uf, setUf] = useState('')
  const [codigoSeguranca, setCodigoSeguranca] = useState('')
  const [codigoValido, setCodigoValido] = useState(false)
  const [verificandoCodigo, setVerificandoCodigo] = useState(false)
  const [erroCodigo, setErroCodigo] = useState('')

  const [empresasDisponiveis, setEmpresasDisponiveis] = useState([])
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([])

  const estadosECidades = {
    'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira'],
    'AL': ['Maceió', 'Arapiraca', 'Rio Largo'],
    'AM': ['Manaus', 'Parintins', 'Itacoatiara'],
    'AP': ['Macapá', 'Santana', 'Laranjal do Jari'],
    'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista'],
    'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte'],
    'DF': ['Brasília'],
    'ES': ['Vitória', 'Vila Velha', 'Cariacica'],
    'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis'],
    'MA': ['São Luís', 'Imperatriz', 'Timon'],
    'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem'],
    'MS': ['Campo Grande', 'Dourados', 'Três Lagoas'],
    'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis'],
    'PA': ['Belém', 'Ananindeua', 'Santarém'],
    'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita'],
    'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda'],
    'PI': ['Teresina', 'Parnaíba', 'Picos'],
    'PR': ['Curitiba', 'Londrina', 'Maringá'],
    'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias'],
    'RN': ['Natal', 'Mossoró', 'Parnamirim'],
    'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes'],
    'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí'],
    'RS': ['Porto Alegre', 'Caxias do Sul', 'Pelotas'],
    'SC': ['Florianópolis', 'Joinville', 'Blumenau'],
    'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto'],
    'SP': ['São Paulo', 'Guarulhos', 'Campinas'],
    'TO': ['Palmas', 'Araguaína', 'Gurupi']
  }

  const history = useHistory()

  async function verificarCodigo() {
    if (!codigoSeguranca || codigoSeguranca.length < 3) {
      setCodigoValido(false)
      return
    }
    setVerificandoCodigo(true)
    setErroCodigo('')
    try {
      const response = await api.get(`codigos/validar/${codigoSeguranca}`)
      if (response.data.valido) {
        setCodigoValido(true)
      } else {
        setCodigoValido(false)
        setErroCodigo(response.data.mensagem || 'Código inválido')
      }
    } catch (err) {
      setCodigoValido(false)
      setErroCodigo('Erro ao verificar código')
      console.error('Erro na verificação:', err)
    } finally {
      setVerificandoCodigo(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      verificarCodigo()
    }, 800)
    return () => clearTimeout(timer)
  }, [codigoSeguranca])

  // 🔹 Busca empresas e setores da API
  useEffect(() => {
    async function fetchEmpresasESetores() {
      try {
        const [empresasRes, setoresRes] = await Promise.all([
          api.get('/empresas'),
          api.get('/setores')
        ])
        setEmpresasDisponiveis(empresasRes.data)
        setSetoresDisponiveis(setoresRes.data)
      } catch (err) {
        console.error('Erro ao carregar empresas ou setores:', err)
      }
    }
    fetchEmpresasESetores()
  }, [])

  async function handleRegister(e) {
    e.preventDefault()
    if (!codigoValido) {
      alert('Por favor, insira um código de segurança válido')
      return
    }
    const cleanedCpf = cpf.replace(/\D/g, '')
    if (cleanedCpf.length !== 11) {
      alert('O CPF deve conter 11 dígitos.')
      return
    }
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '')
    if (cleanedWhatsapp.length !== 11) {
      alert('O número de Telefone deve conter 11 dígitos (DD + número).')
      return
    }
    if (!empresa) {
      alert('Selecione uma empresa!')
      return
    }
    const data = {
      name,
      email,
      whatsapp: cleanedWhatsapp,
      city,
      uf,
      birthdate,
      cpf: cleanedCpf,
      empresa_id:empresa,
      setor_id:setor,
      codigo_acesso: codigoSeguranca
    }
    try {
      const response = await api.post('ongs', data)
      alert(`✅ Cadastro realizado com sucesso! Seu ID de acesso: ${response.data.id}`)
      history.push('/')
    } catch (err) {
      console.error('Erro no cadastro:', err)
      alert(err.response?.data?.message || 'Erro no cadastro, tente novamente')
    }
  }

  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, '')
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/)
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`
    }
    return value
  }

  const handleCpfChange = (e) => {
    setCpf(formatCPF(e.target.value))
  }

  const handleUfChange = (e) => {
    const newUf = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    setUf(newUf)
    setCity('')
  }

  return (
    <div className="register-container">
      <div className="content">
        <section>
          <img src={logoImg} alt="DIME" width={"350px"} />
          <h1>Cadastro</h1>
          <p>Solicite o código de cadastro ao setor de alta performance.</p>
          <Link className="back-link" to="/">
            <FiArrowLeft size={16} color="#e02041" />
            Voltar
          </Link>
        </section>
        <form onSubmit={handleRegister}>
          <input placeholder="Nome" value={name} onChange={e => setName(e.target.value.toUpperCase())} />
          <input type="date" placeholder="Nascimento" value={birthdate} onChange={e => setBirthdate(e.target.value)} />
          <input placeholder="CPF" value={cpf} onChange={handleCpfChange} />

          {/* 🔹 Empresas da API */}
          <select value={empresa} onChange={e => setEmpresa(e.target.value)} className="select-empresa" required>
            <option value="">Selecione sua empresa</option>
            {empresasDisponiveis.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.nome}
              </option>
            ))}
          </select>

          {/* 🔹 Setores da API */}
          <select value={setor} onChange={e => setSetor(e.target.value)} className="select-setor" required>
            <option value="">Selecione seu setor</option>
            {setoresDisponiveis.map(setorOpcao => (
              <option key={setorOpcao.id} value={setorOpcao.id}>
                {setorOpcao.nome}
              </option>
            ))}
          </select>

          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="(DD)99999-9999" value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11))} />

          <div className="input-group">
            <select value={uf} onChange={handleUfChange} style={{ width: 80 }} required>
              <option value="">UF</option>
              {Object.keys(estadosECidades).map(sigla => (
                <option key={sigla} value={sigla}>{sigla}</option>
              ))}
            </select>
            <select value={city} onChange={e => setCity(e.target.value)} disabled={!uf} required>
              <option value="">Selecione a cidade</option>
              {uf && estadosECidades[uf]?.map(cidade => (
                <option key={cidade} value={cidade}>{cidade}</option>
              ))}
            </select>
          </div>

          <div className="codigo-input-container">
            <input
              placeholder="Código de Segurança"
              value={codigoSeguranca}
              onChange={e => setCodigoSeguranca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              required
              maxLength="20"
              pattern="[A-Z0-9]{3,20}"
              title="Digite o código no formato ABC123"
            />
            {verificandoCodigo && <span className="verificando">Verificando...</span>}
            {codigoValido && !verificandoCodigo && <span className="codigo-valido">✓ Código válido</span>}
            {erroCodigo && !verificandoCodigo && <span className="codigo-invalido">{erroCodigo}</span>}
          </div>

          <button className="button" type="submit">Cadastrar</button>
        </form>
      </div>
    </div>
  )
}
