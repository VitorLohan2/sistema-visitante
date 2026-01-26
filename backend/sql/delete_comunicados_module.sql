-- ═══════════════════════════════════════════════════════════════════════════════
-- REMOÇÃO DO MÓDULO DE COMUNICADOS
-- Execute este script para remover todas as permissões relacionadas a comunicados
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Remove vínculos de papéis com permissões de comunicados
DELETE FROM papeis_permissoes 
WHERE permissao_id IN (
    SELECT id FROM permissoes 
    WHERE codigo IN (
        'comunicado_visualizar',
        'comunicado_criar',
        'comunicado_editar',
        'comunicado_deletar'
    )
);

-- 2. Remove as permissões de comunicados
DELETE FROM permissoes 
WHERE codigo IN (
    'comunicado_visualizar',
    'comunicado_criar',
    'comunicado_editar',
    'comunicado_deletar'
);

-- 3. Remove a tabela de comunicados (se existir)
DROP TABLE IF EXISTS comunicados;

-- Confirma a remoção
SELECT 'Módulo de comunicados removido com sucesso!' AS status;
