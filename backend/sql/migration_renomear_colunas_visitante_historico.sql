-- ============================================================
-- MIGRATION: Renomear Colunas das Tabelas visitante e historico_visitante
-- Banco: PostgreSQL
-- Data: 2026-01-15
-- ============================================================

-- PASSO 1: Renomear colunas na tabela VISITANTE
-- ============================================================

-- Renomear name -> nome
ALTER TABLE visitante 
RENAME COLUMN "name" TO nome;

-- Renomear company -> empresa
ALTER TABLE visitante 
RENAME COLUMN company TO empresa;

-- Renomear sector -> setor
ALTER TABLE visitante 
RENAME COLUMN sector TO setor;

-- Renomear entry_date -> data_de_entrada
ALTER TABLE visitante 
RENAME COLUMN entry_date TO data_de_entrada;

-- Renomear created_at -> criado_em
ALTER TABLE visitante 
RENAME COLUMN created_at TO criado_em;

-- PASSO 2: Renomear colunas na tabela HISTORICO_VISITANTE
-- ============================================================

-- Renomear name -> nome
ALTER TABLE historico_visitante 
RENAME COLUMN "name" TO nome;

-- Renomear company -> empresa
ALTER TABLE historico_visitante 
RENAME COLUMN company TO empresa;

-- Renomear sector -> setor
ALTER TABLE historico_visitante 
RENAME COLUMN sector TO setor;

-- Renomear entry_date -> data_de_entrada
ALTER TABLE historico_visitante 
RENAME COLUMN entry_date TO data_de_entrada;

-- Renomear exit_date -> data_de_saida
ALTER TABLE historico_visitante 
RENAME COLUMN exit_date TO data_de_saida;

-- PASSO 3: Renomear CONSTRAINTS na tabela VISITANTE
-- ============================================================

-- Renomear constraint de chave primária: visitors_pkey -> visitante_pkey
ALTER TABLE visitante 
RENAME CONSTRAINT visitors_pkey TO visitante_pkey;

-- Renomear constraint de chave estrangeira: visitors_ong_id_foreign -> visitante_usuario_id_fkey
ALTER TABLE visitante 
RENAME CONSTRAINT visitors_ong_id_foreign TO visitante_usuario_id_fkey;

-- PASSO 4: Renomear CONSTRAINTS na tabela HISTORICO_VISITANTE
-- ============================================================

-- Renomear constraint de chave primária: history_pkey -> historico_visitante_pkey
ALTER TABLE historico_visitante 
RENAME CONSTRAINT history_pkey TO historico_visitante_pkey;

-- Renomear constraint de chave estrangeira: history_ong_id_foreign -> historico_visitante_usuario_id_fkey
ALTER TABLE historico_visitante 
RENAME CONSTRAINT history_ong_id_foreign TO historico_visitante_usuario_id_fkey;

-- ============================================================
-- VERIFICAÇÃO: Queries para validar a migração
-- ============================================================

-- Verificar estrutura da tabela visitante
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'visitante';

-- Verificar constraints da tabela visitante
-- SELECT conname FROM pg_constraint WHERE conrelid = 'visitante'::regclass;

-- Verificar estrutura da tabela historico_visitante
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'historico_visitante';

-- Verificar constraints da tabela historico_visitante
-- SELECT conname FROM pg_constraint WHERE conrelid = 'historico_visitante'::regclass;

-- Testar se os dados ainda estão acessíveis
-- SELECT id, nome, cpf, empresa, setor, data_de_entrada, criado_em FROM visitante LIMIT 5;
-- SELECT id, nome, cpf, empresa, setor, data_de_entrada, data_de_saida FROM historico_visitante LIMIT 5;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
