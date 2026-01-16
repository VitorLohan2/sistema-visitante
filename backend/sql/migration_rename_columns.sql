-- ============================================================
-- MIGRAÇÃO: Renomear colunas para português
-- Data: Janeiro 2025
-- Descrição: Renomeia colunas de tabelas para nomes em português
-- ============================================================

-- ============================================================
-- TABELA: usuarios
-- ============================================================

-- Renomear colunas
ALTER TABLE usuarios RENAME COLUMN name TO nome;
ALTER TABLE usuarios RENAME COLUMN birthdate TO nascimento;
ALTER TABLE usuarios RENAME COLUMN city TO cidade;
ALTER TABLE usuarios RENAME COLUMN updated_at TO atualizado_em;

-- Renomear constraints (se existirem)
ALTER TABLE usuarios RENAME CONSTRAINT ongs_pkey TO usuarios_pkey;
ALTER TABLE usuarios RENAME CONSTRAINT ongs_empresa_id_fkey TO usuarios_empresa_id_fkey;
ALTER TABLE usuarios RENAME CONSTRAINT ongs_setor_id_fkey TO usuarios_setor_id_fkey;

-- ============================================================
-- TABELA: registro_ponto_detalhado_funcionario
-- ============================================================

ALTER TABLE registro_ponto_detalhado_funcionario RENAME COLUMN created_at TO criado_em;
ALTER TABLE registro_ponto_detalhado_funcionario RENAME COLUMN updated_at TO atualizado_em;

-- ============================================================
-- TABELA: patch_notes
-- ============================================================

ALTER TABLE patch_notes RENAME COLUMN created_at TO criado_em;
ALTER TABLE patch_notes RENAME COLUMN updated_at TO atualizado_em;

-- ============================================================
-- TABELA: historico_ponto_diario_funcionario
-- ============================================================

ALTER TABLE historico_ponto_diario_funcionario RENAME COLUMN created_at TO criado_em;

-- ============================================================
-- TABELA: comunicados
-- ============================================================

ALTER TABLE comunicados RENAME COLUMN created_at TO criado_em;
ALTER TABLE comunicados RENAME COLUMN updated_at TO atualizado_em;

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
