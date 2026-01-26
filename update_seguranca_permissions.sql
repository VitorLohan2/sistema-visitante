-- ═══════════════════════════════════════════════════════════════
-- Script para Atualizar Permissões do SEGURANÇA
-- Execute este script no DBeaver para corrigir as permissões
-- ═══════════════════════════════════════════════════════════════

-- Adicionar permissões de agendamento ao papel SEGURANÇA
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'SEGURANCA'),
    id
FROM permissoes 
WHERE chave IN (
    'agendamento_visualizar',
    'agendamento_criar', 
    'agendamento_editar',
    'agendamento_deletar'
)
ON CONFLICT DO NOTHING;

-- Verificar se as permissões foram adicionadas
SELECT 
    p.nome as papel,
    perm.chave as permissao,
    perm.descricao
FROM papeis p
JOIN papeis_permissoes pp ON p.id = pp.papel_id  
JOIN permissoes perm ON pp.permissao_id = perm.id
WHERE p.nome = 'SEGURANCA' 
AND perm.chave LIKE 'agendamento_%'
ORDER BY perm.chave;

-- Verificar todos os papéis de um usuário específico (substitua USER_ID pelo ID do usuário)
-- SELECT u.name, p.nome as papel
-- FROM usuarios u
-- JOIN usuarios_papeis up ON u.id = up.usuario_id
-- JOIN papeis p ON up.papel_id = p.id  
-- WHERE u.id = USER_ID;