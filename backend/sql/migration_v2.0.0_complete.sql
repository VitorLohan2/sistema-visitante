-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE MIGRAÇÃO COMPLETA - VERSÃO 2.0.0
-- De: neondb (desenvolvimento) Para: neondb_prod (produção)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- INSTRUÇÕES:
-- 1. FAÇA BACKUP do banco de produção antes de executar!
-- 2. Execute este script no banco neondb_prod
-- 3. Verifique se todas as tabelas foram criadas corretamente
-- 
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                        SEÇÃO 1: TABELAS PRINCIPAIS                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: empresa_interno (Empresas dos usuários internos)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresa_interno (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: setor_usuario (Setores dos usuários internos)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS setor_usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: usuarios (Usuários do sistema)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    nascimento VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    email VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(255) NOT NULL,
    cidade VARCHAR(255) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    empresa_id INTEGER REFERENCES empresa_interno(id),
    setor_id INTEGER REFERENCES setor_usuario(id),
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    senha VARCHAR(500),
    reset_token VARCHAR(100),
    reset_token_expira TIMESTAMP WITHOUT TIME ZONE
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: sessions (Sessões de login)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES usuarios(id),
    token VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                      SEÇÃO 2: SISTEMA RBAC (Permissões)                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: papeis (Roles do sistema)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS papeis (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: permissoes (Permissões do sistema)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(150) NOT NULL UNIQUE,
    descricao TEXT
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: papeis_permissoes (Relacionamento N:N)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS papeis_permissoes (
    papel_id INTEGER NOT NULL REFERENCES papeis(id),
    permissao_id INTEGER NOT NULL REFERENCES permissoes(id),
    PRIMARY KEY (papel_id, permissao_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: usuarios_papeis (Relacionamento usuário-papel)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios_papeis (
    usuario_id VARCHAR(255) NOT NULL REFERENCES usuarios(id),
    papel_id INTEGER NOT NULL REFERENCES papeis(id),
    PRIMARY KEY (usuario_id, papel_id)
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 3: VISITANTES                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: empresa_visitante (Empresas dos visitantes)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresa_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    cnpj VARCHAR(14),
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: setor_visitante (Setores para visitantes)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS setor_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: responsavel_visitante (Responsáveis por receber visitantes)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS responsavel_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: funcao_visitante (Funções/Cargos dos visitantes)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funcao_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: cor_veiculo_visitante (Cores de veículos)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cor_veiculo_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: tipo_veiculo_visitante (Tipos de veículos)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipo_veiculo_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: cadastro_visitante (Cadastro de visitantes)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cadastro_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    nascimento VARCHAR(255) NOT NULL,
    cpf VARCHAR(255) NOT NULL,
    telefone VARCHAR(255),
    observacao VARCHAR(255),
    bloqueado BOOLEAN DEFAULT false,
    usuario_id VARCHAR(255) NOT NULL REFERENCES usuarios(id),
    imagem1 VARCHAR(255),
    imagem2 VARCHAR(255),
    imagem3 VARCHAR(255),
    empresa_id INTEGER REFERENCES empresa_visitante(id),
    setor_id INTEGER REFERENCES setor_visitante(id),
    avatar_imagem TEXT,
    placa_veiculo VARCHAR(10),
    cor_veiculo VARCHAR(50),
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    funcao_visitante_id INTEGER REFERENCES funcao_visitante(id),
    veiculo_visitante_id INTEGER
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: veiculo_visitante (Veículos dos visitantes)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS veiculo_visitante (
    id SERIAL PRIMARY KEY,
    visitante_id INTEGER REFERENCES cadastro_visitante(id),
    placa_veiculo VARCHAR(7),
    cor_veiculo_visitante_id INTEGER REFERENCES cor_veiculo_visitante(id),
    tipo_veiculo_visitante_id INTEGER REFERENCES tipo_veiculo_visitante(id),
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar FK para veiculo_visitante_id em cadastro_visitante
ALTER TABLE cadastro_visitante 
ADD CONSTRAINT cadastro_visitante_veiculo_visitante_id_fkey 
FOREIGN KEY (veiculo_visitante_id) REFERENCES veiculo_visitante(id);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: visitante (Visitantes em tempo real - entrada/saída)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(255) NOT NULL,
    empresa VARCHAR(255) NOT NULL,
    setor VARCHAR(255) NOT NULL,
    data_de_entrada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id VARCHAR(255) NOT NULL REFERENCES usuarios(id),
    placa_veiculo VARCHAR(20),
    cor_veiculo VARCHAR(30),
    responsavel VARCHAR(255),
    observacao TEXT,
    tipo_veiculo VARCHAR(100),
    funcao VARCHAR(100)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: historico_visitante (Histórico de visitas)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historico_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(255) NOT NULL,
    empresa VARCHAR(255) NOT NULL,
    setor VARCHAR(255) NOT NULL,
    data_de_entrada TIMESTAMP WITH TIME ZONE NOT NULL,
    data_de_saida TIMESTAMP WITH TIME ZONE NOT NULL,
    usuario_id VARCHAR(255) NOT NULL REFERENCES usuarios(id),
    placa_veiculo VARCHAR(20),
    cor_veiculo VARCHAR(30),
    responsavel VARCHAR(255),
    observacao TEXT,
    tipo_veiculo VARCHAR(100),
    funcao VARCHAR(100)
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 4: AGENDAMENTOS                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: agendamentos (Agendamentos de visitantes)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agendamentos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    setor_id INTEGER NOT NULL,
    setor VARCHAR(100) NOT NULL,
    horario_agendado TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    observacao TEXT,
    criado_por VARCHAR(100) NOT NULL,
    confirmado BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id VARCHAR(255) NOT NULL,
    confirmado_em TIMESTAMP WITHOUT TIME ZONE,
    confirmado_por VARCHAR(100) DEFAULT NULL,
    presente BOOLEAN DEFAULT false,
    presente_em TIMESTAMP WITHOUT TIME ZONE,
    presente_por VARCHAR(255),
    foto_colaborador VARCHAR(255),
    solicitacao_descarga_id INTEGER
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 5: DESCARGA                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: solicitacoes_descarga (Solicitações de descarga)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solicitacoes_descarga (
    id SERIAL PRIMARY KEY,
    empresa_nome VARCHAR(150) NOT NULL,
    empresa_cnpj VARCHAR(18) NOT NULL,
    empresa_email VARCHAR(150) NOT NULL,
    empresa_contato VARCHAR(100) NOT NULL,
    empresa_telefone VARCHAR(20) NOT NULL,
    motorista_nome VARCHAR(150) NOT NULL,
    motorista_cpf VARCHAR(11) NOT NULL,
    placa_veiculo VARCHAR(10) NOT NULL,
    tipo_veiculo VARCHAR(50) NOT NULL,
    tipo_carga VARCHAR(100) NOT NULL,
    observacao TEXT,
    horario_solicitado TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    validado_por VARCHAR(255),
    validado_em TIMESTAMP WITHOUT TIME ZONE,
    email_enviado BOOLEAN DEFAULT false,
    email_enviado_em TIMESTAMP WITHOUT TIME ZONE,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    protocolo VARCHAR(20),
    transportadora_nome VARCHAR(150) NOT NULL,
    notas_fiscais TEXT,
    quantidade_volumes INTEGER NOT NULL
);

-- FK para agendamentos
ALTER TABLE agendamentos 
ADD CONSTRAINT fk_agendamento_descarga 
FOREIGN KEY (solicitacao_descarga_id) REFERENCES solicitacoes_descarga(id);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: solicitacoes_descarga_historico (Histórico de descargas)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solicitacoes_descarga_historico (
    id SERIAL PRIMARY KEY,
    solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes_descarga(id),
    acao VARCHAR(20) NOT NULL,
    observacao TEXT NOT NULL,
    horario_anterior TIMESTAMP WITHOUT TIME ZONE,
    horario_novo TIMESTAMP WITHOUT TIME ZONE,
    usuario_id VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 6: FUNCIONÁRIOS                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: funcionario_interno_cracha (Funcionários com crachá)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funcionario_interno_cracha (
    id SERIAL PRIMARY KEY,
    cracha VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    setor VARCHAR(100),
    funcao VARCHAR(100),
    data_admissao DATE NOT NULL,
    data_demissao DATE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: registro_funcionario_interno_cracha (Registro de entrada/saída)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registro_funcionario_interno_cracha (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER NOT NULL REFERENCES funcionario_interno_cracha(id),
    data DATE NOT NULL,
    hora_entrada TIMESTAMP WITH TIME ZONE,
    hora_saida TIMESTAMP WITH TIME ZONE,
    tempo_total INTERVAL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (funcionario_id, data)
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 7: PONTO ELETRÔNICO                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: registro_ponto_detalhado_funcionario (Registros de ponto)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registro_ponto_detalhado_funcionario (
    id SERIAL PRIMARY KEY,
    funcionario_id VARCHAR(255) NOT NULL,
    nome_funcionario VARCHAR(255) NOT NULL,
    setor_id INTEGER NOT NULL,
    data DATE NOT NULL,
    hora TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    tipo_ponto VARCHAR(50) NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    empresa_id VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: historico_ponto_diario_funcionario (Histórico diário)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historico_ponto_diario_funcionario (
    id SERIAL PRIMARY KEY,
    funcionario_id VARCHAR(255) NOT NULL,
    nome_funcionario VARCHAR(255) NOT NULL,
    setor_id INTEGER NOT NULL,
    data DATE NOT NULL,
    hora_entrada TIMESTAMP WITHOUT TIME ZONE,
    hora_intervalo_entrada TIMESTAMP WITHOUT TIME ZONE,
    hora_intervalo_saida TIMESTAMP WITHOUT TIME ZONE,
    hora_saida TIMESTAMP WITHOUT TIME ZONE,
    total_horas_trabalhadas INTERVAL,
    empresa_id VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 8: RONDAS                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: ronda_pontos_controle (Pontos de controle de ronda)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ronda_pontos_controle (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresa_interno(id),
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(500),
    codigo VARCHAR(50),
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    raio INTEGER NOT NULL DEFAULT 30,
    ordem INTEGER,
    obrigatorio BOOLEAN DEFAULT true,
    ativo BOOLEAN DEFAULT true,
    local_referencia VARCHAR(255),
    setor VARCHAR(100),
    tipo VARCHAR(50) DEFAULT 'checkpoint',
    foto_url VARCHAR(500),
    tempo_minimo_segundos INTEGER DEFAULT 30,
    criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por VARCHAR(255)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: rondas (Rondas de vigilância)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rondas (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(255),
    empresa_id INTEGER REFERENCES empresa_interno(id),
    status VARCHAR(20) NOT NULL DEFAULT 'em_andamento',
    data_inicio TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP WITHOUT TIME ZONE,
    latitude_inicio NUMERIC,
    longitude_inicio NUMERIC,
    latitude_fim NUMERIC,
    longitude_fim NUMERIC,
    tempo_total_segundos INTEGER DEFAULT 0,
    distancia_total_metros NUMERIC DEFAULT 0,
    total_checkpoints INTEGER DEFAULT 0,
    observacoes TEXT,
    versao INTEGER DEFAULT 1,
    criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_pontos_obrigatorios INTEGER DEFAULT 0,
    pontos_visitados INTEGER DEFAULT 0,
    percentual_conclusao NUMERIC DEFAULT 0
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: ronda_checkpoints (Checkpoints registrados)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ronda_checkpoints (
    id SERIAL PRIMARY KEY,
    ronda_id INTEGER NOT NULL REFERENCES rondas(id),
    numero_sequencial INTEGER NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    data_hora TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tempo_desde_anterior_segundos INTEGER DEFAULT 0,
    distancia_desde_anterior_metros NUMERIC DEFAULT 0,
    descricao VARCHAR(500),
    foto_url VARCHAR(500),
    criado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ponto_controle_id INTEGER REFERENCES ronda_pontos_controle(id),
    distancia_validacao NUMERIC,
    precisao_gps NUMERIC,
    validado_offline BOOLEAN DEFAULT false,
    sincronizado_em TIMESTAMP WITHOUT TIME ZONE,
    UNIQUE (ronda_id, numero_sequencial)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: ronda_trajeto (Trajeto das rondas)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ronda_trajeto (
    id SERIAL PRIMARY KEY,
    ronda_id INTEGER NOT NULL REFERENCES rondas(id),
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    precisao_metros NUMERIC,
    altitude_metros NUMERIC,
    velocidade NUMERIC,
    data_hora TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    numero_sequencial INTEGER NOT NULL
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: ronda_auditoria (Auditoria de rondas)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ronda_auditoria (
    id SERIAL PRIMARY KEY,
    ronda_id INTEGER REFERENCES rondas(id),
    usuario_id VARCHAR(255) NOT NULL REFERENCES usuarios(id),
    tipo_acao VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    dados_json JSONB,
    ip_usuario VARCHAR(45),
    user_agent VARCHAR(500),
    data_hora TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 9: TICKETS                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: tickets (Tickets de suporte)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(255) NOT NULL REFERENCES usuarios(id),
    nome_usuario VARCHAR(255) NOT NULL,
    setor_usuario VARCHAR(255) NOT NULL,
    funcionario VARCHAR(255) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    setor_responsavel VARCHAR(255) NOT NULL,
    status VARCHAR(255) DEFAULT 'Aberto',
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_finalizacao TIMESTAMP WITH TIME ZONE,
    data_atualizacao TIMESTAMP WITH TIME ZONE,
    visualizado BOOLEAN NOT NULL DEFAULT false
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 10: CHAT SUPORTE                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: conversas_suporte (Conversas do chat de suporte)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversas_suporte (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(8) NOT NULL REFERENCES usuarios(id),
    usuario_nome VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'aberto',
    assunto VARCHAR(255),
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atendente_id VARCHAR(8),
    atendente_nome VARCHAR(255),
    data_finalizacao TIMESTAMP WITHOUT TIME ZONE
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: mensagens_suporte (Mensagens do chat)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensagens_suporte (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL REFERENCES conversas_suporte(id),
    remetente_id VARCHAR(8) NOT NULL REFERENCES usuarios(id),
    remetente_nome VARCHAR(255) NOT NULL,
    remetente_tipo VARCHAR(10) NOT NULL,
    mensagem TEXT NOT NULL,
    data_envio TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    visualizada BOOLEAN DEFAULT false
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 11: CHAT AVANÇADO (BOT)                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: chat_conversas (Conversas do chat com bot)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversas (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(255) REFERENCES usuarios(id),
    nome_visitante VARCHAR(255) NOT NULL,
    email_visitante VARCHAR(255) NOT NULL,
    atendente_id VARCHAR(255) REFERENCES usuarios(id),
    status VARCHAR(30) NOT NULL DEFAULT 'BOT',
    assunto VARCHAR(255),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    iniciado_em TIMESTAMP WITH TIME ZONE,
    finalizado_em TIMESTAMP WITH TIME ZONE,
    ip_visitante VARCHAR(45),
    user_agent TEXT
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: chat_mensagens (Mensagens do chat)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_mensagens (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL REFERENCES chat_conversas(id),
    origem VARCHAR(20) NOT NULL,
    mensagem TEXT NOT NULL,
    remetente_id VARCHAR(255),
    remetente_nome VARCHAR(255),
    ia_contexto JSONB,
    ia_confianca NUMERIC,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lida BOOLEAN DEFAULT false
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: chat_faq (Perguntas frequentes para bot)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_faq (
    id SERIAL PRIMARY KEY,
    pergunta TEXT NOT NULL,
    palavras_chave TEXT[],
    resposta TEXT NOT NULL,
    categoria VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    vezes_utilizado INTEGER DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: chat_fila (Fila de atendimento)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_fila (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL UNIQUE REFERENCES chat_conversas(id),
    posicao INTEGER NOT NULL,
    prioridade INTEGER DEFAULT 1,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: chat_avaliacoes (Avaliações do atendimento)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_avaliacoes (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL UNIQUE REFERENCES chat_conversas(id),
    nota INTEGER NOT NULL,
    comentario TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: chat_auditoria (Auditoria do chat)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_auditoria (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL REFERENCES chat_conversas(id),
    usuario_id VARCHAR(255) REFERENCES usuarios(id),
    usuario_nome VARCHAR(255),
    usuario_tipo VARCHAR(20),
    acao VARCHAR(50) NOT NULL,
    detalhes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 12: PATCH NOTES                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────────────────────────────────────
-- TABELA: patch_notes (Notas de atualização)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patch_notes (
    id SERIAL PRIMARY KEY,
    versao VARCHAR(20) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'improvement',
    data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 13: ÍNDICES                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Índices para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_visitante_cpf ON visitante(cpf);
CREATE INDEX IF NOT EXISTS idx_visitante_usuario ON visitante(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_cpf ON historico_visitante(cpf);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_visitante(data_de_entrada);
CREATE INDEX IF NOT EXISTS idx_cadastro_cpf ON cadastro_visitante(cpf);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(horario_agendado);
CREATE INDEX IF NOT EXISTS idx_rondas_usuario ON rondas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rondas_status ON rondas(status);
CREATE INDEX IF NOT EXISTS idx_tickets_usuario ON tickets(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║                       SEÇÃO 14: FINALIZAÇÃO                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Mensagem de conclusão
SELECT '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO - VERSÃO 2.0.0' AS status;
SELECT 'Total de tabelas criadas: 42' AS info;
