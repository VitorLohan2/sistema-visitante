-- ═══════════════════════════════════════════════════════════════
-- SEED: Permissões RBAC faltantes para dados auxiliares
-- Execute este script para adicionar APENAS as permissões que faltam
-- ═══════════════════════════════════════════════════════════════

-- Permissões de Dados Auxiliares (Funções, Cores, Tipos de Veículos)
-- Estas são as ÚNICAS que não existem na tabela atual
INSERT INTO permissoes (nome, descricao, modulo) VALUES 
('funcao_visitante_gerenciar', 'Gerenciar funções de visitantes (CRUD)', 'dados_auxiliares'),
('cor_veiculo_gerenciar', 'Gerenciar cores de veículos (CRUD)', 'dados_auxiliares'),
('tipo_veiculo_gerenciar', 'Gerenciar tipos de veículos (CRUD)', 'dados_auxiliares')
ON CONFLICT (nome) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- VINCULAR NOVAS PERMISSÕES AO PAPEL ADMIN (se existir)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    admin_papel_id INTEGER;
    permissao_id INTEGER;
BEGIN
    -- Buscar ID do papel ADMIN
    SELECT id INTO admin_papel_id FROM papeis WHERE nome = 'ADMIN';
    
    IF admin_papel_id IS NOT NULL THEN
        -- Vincular funcao_visitante_gerenciar
        SELECT id INTO permissao_id FROM permissoes WHERE nome = 'funcao_visitante_gerenciar';
        IF permissao_id IS NOT NULL THEN
            INSERT INTO papeis_permissoes (papel_id, permissao_id)
            VALUES (admin_papel_id, permissao_id)
            ON CONFLICT (papel_id, permissao_id) DO NOTHING;
        END IF;
        
        -- Vincular cor_veiculo_gerenciar
        SELECT id INTO permissao_id FROM permissoes WHERE nome = 'cor_veiculo_gerenciar';
        IF permissao_id IS NOT NULL THEN
            INSERT INTO papeis_permissoes (papel_id, permissao_id)
            VALUES (admin_papel_id, permissao_id)
            ON CONFLICT (papel_id, permissao_id) DO NOTHING;
        END IF;
        
        -- Vincular tipo_veiculo_gerenciar
        SELECT id INTO permissao_id FROM permissoes WHERE nome = 'tipo_veiculo_gerenciar';
        IF permissao_id IS NOT NULL THEN
            INSERT INTO papeis_permissoes (papel_id, permissao_id)
            VALUES (admin_papel_id, permissao_id)
            ON CONFLICT (papel_id, permissao_id) DO NOTHING;
        END IF;
        
        RAISE NOTICE '✅ Novas permissões vinculadas ao papel ADMIN!';
    ELSE
        RAISE NOTICE '⚠️ Papel ADMIN não encontrado. Vincule manualmente.';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICAR PERMISSÕES CRIADAS
-- ═══════════════════════════════════════════════════════════════
SELECT nome, descricao, modulo FROM permissoes 
WHERE nome IN ('funcao_visitante_gerenciar', 'cor_veiculo_gerenciar', 'tipo_veiculo_gerenciar')
ORDER BY nome;
