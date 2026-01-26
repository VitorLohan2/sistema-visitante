-- ================================================================
-- Adicionar colunas criado_em e atualizado_em na tabela cadastro_visitante
-- Execute esta query no PostgreSQL
-- ================================================================

-- Adiciona coluna criado_em (data de criação)
ALTER TABLE cadastro_visitante 
ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Adiciona coluna atualizado_em (data de última atualização)
ALTER TABLE cadastro_visitante 
ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Atualiza registros existentes com a data atual (opcional)
-- UPDATE cadastro_visitante SET criado_em = CURRENT_TIMESTAMP WHERE criado_em IS NULL;
-- UPDATE cadastro_visitante SET atualizado_em = CURRENT_TIMESTAMP WHERE atualizado_em IS NULL;

-- Verifica se as colunas foram criadas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'cadastro_visitante' 
AND column_name IN ('criado_em', 'atualizado_em');
