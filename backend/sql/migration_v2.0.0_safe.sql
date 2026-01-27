-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE MIGRAÇÃO SEGURA - VERSÃO 2.0.0
-- Banco: neondb_prod (PRODUÇÃO)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- ⚠️ INSTRUÇÕES IMPORTANTES:
-- 1. FAÇA BACKUP COMPLETO DO BANCO ANTES DE EXECUTAR!
--    pg_dump -h 34.225.38.222 -p 5786 -U neondb_owner_prod -d neondb_prod > backup_v1.sql
-- 
-- 2. Execute este script em uma transação para poder fazer rollback se necessário
-- 
-- 3. Verifique os dados após cada seção
--
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 1: RENOMEAR TABELAS (preserva dados)                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 1.1 Renomear tabelas existentes
ALTER TABLE IF EXISTS empresas RENAME TO empresa_interno;
ALTER TABLE IF EXISTS empresas_visitantes RENAME TO empresa_visitante;
ALTER TABLE IF EXISTS setores RENAME TO setor_usuario;
ALTER TABLE IF EXISTS setores_visitantes RENAME TO setor_visitante;
ALTER TABLE IF EXISTS responsaveis RENAME TO responsavel_visitante;
ALTER TABLE IF EXISTS funcionarios RENAME TO funcionario_interno_cracha;
ALTER TABLE IF EXISTS registros_funcionarios RENAME TO registro_funcionario_interno_cracha;
ALTER TABLE IF EXISTS ongs RENAME TO usuarios;
ALTER TABLE IF EXISTS incidents RENAME TO cadastro_visitante;
ALTER TABLE IF EXISTS visitors RENAME TO visitante;
ALTER TABLE IF EXISTS history RENAME TO historico_visitante;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 2: RENOMEAR COLUNAS - TABELA USUARIOS (era: ongs)                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 2.1 Renomear colunas em usuarios
ALTER TABLE usuarios RENAME COLUMN name TO nome;
ALTER TABLE usuarios RENAME COLUMN birthdate TO nascimento;
ALTER TABLE usuarios RENAME COLUMN city TO cidade;

-- 2.2 Adicionar novas colunas em usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha VARCHAR(500);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token_expira TIMESTAMP WITHOUT TIME ZONE;

-- 2.3 Remover coluna type (não existe mais)
ALTER TABLE usuarios DROP COLUMN IF EXISTS type;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 3: RENOMEAR COLUNAS - TABELA VISITANTE (era: visitors)                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 3.1 Renomear colunas
ALTER TABLE visitante RENAME COLUMN name TO nome;
ALTER TABLE visitante RENAME COLUMN company TO empresa;
ALTER TABLE visitante RENAME COLUMN sector TO setor;
ALTER TABLE visitante RENAME COLUMN entry_date TO data_de_entrada;
ALTER TABLE visitante RENAME COLUMN created_at TO criado_em;
ALTER TABLE visitante RENAME COLUMN ong_id TO usuario_id;

-- 3.2 Adicionar novas colunas
ALTER TABLE visitante ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(100);
ALTER TABLE visitante ADD COLUMN IF NOT EXISTS funcao VARCHAR(100);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 4: RENOMEAR COLUNAS - TABELA HISTORICO_VISITANTE (era: history)         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 4.1 Renomear colunas
ALTER TABLE historico_visitante RENAME COLUMN name TO nome;
ALTER TABLE historico_visitante RENAME COLUMN company TO empresa;
ALTER TABLE historico_visitante RENAME COLUMN sector TO setor;
ALTER TABLE historico_visitante RENAME COLUMN entry_date TO data_de_entrada;
ALTER TABLE historico_visitante RENAME COLUMN exit_date TO data_de_saida;
ALTER TABLE historico_visitante RENAME COLUMN ong_id TO usuario_id;

-- 4.2 Adicionar novas colunas
ALTER TABLE historico_visitante ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(100);
ALTER TABLE historico_visitante ADD COLUMN IF NOT EXISTS funcao VARCHAR(100);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 5: RENOMEAR COLUNAS - TABELA CADASTRO_VISITANTE (era: incidents)        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 5.1 Renomear coluna ong_id para usuario_id
ALTER TABLE cadastro_visitante RENAME COLUMN ong_id TO usuario_id;

-- 5.2 Adicionar novas colunas
ALTER TABLE cadastro_visitante ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE cadastro_visitante ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE cadastro_visitante ADD COLUMN IF NOT EXISTS funcao_visitante_id INTEGER;
ALTER TABLE cadastro_visitante ADD COLUMN IF NOT EXISTS veiculo_visitante_id INTEGER;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 6: RENOMEAR COLUNAS - TABELA TICKETS                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 6.1 Renomear coluna ong_id para usuario_id
ALTER TABLE tickets RENAME COLUMN ong_id TO usuario_id;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 7: RENOMEAR COLUNAS - TABELA AGENDAMENTOS                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 7.1 Renomear coluna ong_id para usuario_id
ALTER TABLE agendamentos RENAME COLUMN ong_id TO usuario_id;

-- 7.2 Adicionar nova coluna
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS solicitacao_descarga_id INTEGER;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 8: ADICIONAR NOVAS COLUNAS - EMPRESA_VISITANTE                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE empresa_visitante ADD COLUMN IF NOT EXISTS cnpj VARCHAR(14);
ALTER TABLE empresa_visitante ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
ALTER TABLE empresa_visitante ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE empresa_visitante ADD COLUMN IF NOT EXISTS endereco TEXT;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 9: CRIAR NOVAS TABELAS - SISTEMA RBAC (Permissões)                      ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 9.1 Tabela de papéis (roles)
CREATE TABLE IF NOT EXISTS papeis (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT
);

-- 9.2 Tabela de permissões
CREATE TABLE IF NOT EXISTS permissoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(150) NOT NULL UNIQUE,
    descricao TEXT
);

-- 9.3 Relacionamento papéis-permissões
CREATE TABLE IF NOT EXISTS papeis_permissoes (
    papel_id INTEGER NOT NULL REFERENCES papeis(id),
    permissao_id INTEGER NOT NULL REFERENCES permissoes(id),
    PRIMARY KEY (papel_id, permissao_id)
);

-- 9.4 Relacionamento usuários-papéis
CREATE TABLE IF NOT EXISTS usuarios_papeis (
    usuario_id VARCHAR(255) NOT NULL REFERENCES usuarios(id),
    papel_id INTEGER NOT NULL REFERENCES papeis(id),
    PRIMARY KEY (usuario_id, papel_id)
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 10: CRIAR NOVAS TABELAS - VEÍCULOS E FUNÇÕES VISITANTES                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 10.1 Cores de veículos
CREATE TABLE IF NOT EXISTS cor_veiculo_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10.2 Tipos de veículos
CREATE TABLE IF NOT EXISTS tipo_veiculo_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10.3 Funções de visitantes
CREATE TABLE IF NOT EXISTS funcao_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10.4 Veículos de visitantes
CREATE TABLE IF NOT EXISTS veiculo_visitante (
    id SERIAL PRIMARY KEY,
    visitante_id INTEGER REFERENCES cadastro_visitante(id),
    placa_veiculo VARCHAR(7),
    cor_veiculo_visitante_id INTEGER REFERENCES cor_veiculo_visitante(id),
    tipo_veiculo_visitante_id INTEGER REFERENCES tipo_veiculo_visitante(id),
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 11: CRIAR NOVAS TABELAS - SISTEMA DE RONDAS                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 11.1 Pontos de controle de ronda
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

-- 11.2 Rondas
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

-- 11.3 Checkpoints de ronda
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

-- 11.4 Trajeto de ronda
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

-- 11.5 Auditoria de rondas
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
-- ║ SEÇÃO 12: CRIAR NOVAS TABELAS - SISTEMA DE DESCARGA                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 12.1 Solicitações de descarga
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

-- 12.2 Histórico de descargas
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

-- FK para agendamentos (verifica se já existe antes de criar)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agendamento_descarga') THEN
        ALTER TABLE agendamentos ADD CONSTRAINT fk_agendamento_descarga 
        FOREIGN KEY (solicitacao_descarga_id) REFERENCES solicitacoes_descarga(id);
    END IF;
END $$;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 13: CRIAR NOVAS TABELAS - SISTEMA DE PONTO                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 13.1 Registro detalhado de ponto
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

-- 13.2 Histórico diário de ponto
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
-- ║ SEÇÃO 14: CRIAR NOVAS TABELAS - CHAT DE SUPORTE                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 14.1 Conversas de suporte
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

-- 14.2 Mensagens de suporte
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
-- ║ SEÇÃO 15: CRIAR NOVAS TABELAS - CHAT AVANÇADO (BOT)                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- 15.1 Conversas do chat
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

-- 15.2 Mensagens do chat
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

-- 15.3 FAQ para bot
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

-- 15.4 Fila de atendimento
CREATE TABLE IF NOT EXISTS chat_fila (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL UNIQUE REFERENCES chat_conversas(id),
    posicao INTEGER NOT NULL,
    prioridade INTEGER DEFAULT 1,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15.5 Avaliações
CREATE TABLE IF NOT EXISTS chat_avaliacoes (
    id SERIAL PRIMARY KEY,
    conversa_id INTEGER NOT NULL UNIQUE REFERENCES chat_conversas(id),
    nota INTEGER NOT NULL,
    comentario TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15.6 Auditoria do chat
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
-- ║ SEÇÃO 16: CRIAR NOVAS TABELAS - PATCH NOTES                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

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
-- ║ SEÇÃO 17: ADICIONAR FKs FALTANTES                                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- FK para veiculo_visitante em cadastro_visitante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cadastro_visitante_veiculo_fkey') THEN
        ALTER TABLE cadastro_visitante ADD CONSTRAINT cadastro_visitante_veiculo_fkey 
        FOREIGN KEY (veiculo_visitante_id) REFERENCES veiculo_visitante(id);
    END IF;
END $$;

-- FK para funcao_visitante em cadastro_visitante
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cadastro_visitante_funcao_fkey') THEN
        ALTER TABLE cadastro_visitante ADD CONSTRAINT cadastro_visitante_funcao_fkey 
        FOREIGN KEY (funcao_visitante_id) REFERENCES funcao_visitante(id);
    END IF;
END $$;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 18: CRIAR ÍNDICES PARA PERFORMANCE                                      ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

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
-- ║ SEÇÃO 19: LIMPAR TABELA OBSOLETA                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Remover tabela codigos_cadastro (não existe mais no novo sistema)
DROP TABLE IF EXISTS codigos_cadastro;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEÇÃO 20: VERIFICAÇÃO FINAL                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Listar todas as tabelas após migração
SELECT 'MIGRAÇÃO v2.0.0 CONCLUÍDA!' AS status;

SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS colunas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Se tudo estiver OK, confirma a transação
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- EM CASO DE ERRO, EXECUTE: ROLLBACK;
-- ═══════════════════════════════════════════════════════════════════════════════
