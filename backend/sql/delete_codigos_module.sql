-- ================================================
-- SCRIPT PARA REMOÇÃO COMPLETA DO MÓDULO DE CÓDIGOS
-- Execute este script no banco de dados PostgreSQL
-- ================================================

-- 1. Remover permissões relacionadas a códigos da tabela papeis_permissoes
DELETE FROM papeis_permissoes 
WHERE permissao_id IN (
    SELECT id FROM permissoes 
    WHERE nome LIKE 'codigo_%'
);

-- 2. Remover permissões de códigos da tabela permissoes
DELETE FROM permissoes 
WHERE nome LIKE 'codigo_%';

-- 3. Deletar a tabela de códigos de cadastro
DROP TABLE IF EXISTS codigos_cadastro CASCADE;

-- ================================================
-- VERIFICAÇÃO (opcional - rode para confirmar)
-- ================================================

-- Verificar se permissões foram removidas:
-- SELECT * FROM permissoes WHERE nome LIKE 'codigo_%';

-- Verificar se tabela foi removida:
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'codigos_cadastro');
