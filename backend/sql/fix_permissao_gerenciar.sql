-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT: Adicionar permissão 'permissao_gerenciar' ao sistema
-- Execute este script no DBeaver para corrigir a permissão faltante
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Inserir a permissão (se não existir)
INSERT INTO permissoes (chave, descricao) VALUES 
('permissao_gerenciar', 'Gerenciar permissões e papéis de usuários')
ON CONFLICT (chave) DO NOTHING;

-- 2. Atribuir ao papel ADMIN
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'ADMIN' AND perm.chave = 'permissao_gerenciar'
ON CONFLICT DO NOTHING;

-- 3. Verificar se foi inserido corretamente
SELECT 
    p.nome AS papel,
    perm.chave AS permissao,
    perm.descricao
FROM papeis_permissoes pp
JOIN papeis p ON pp.papel_id = p.id
JOIN permissoes perm ON pp.permissao_id = perm.id
WHERE perm.chave = 'permissao_gerenciar';

-- 4. Listar todas as permissões do ADMIN para confirmar
SELECT 
    perm.chave,
    perm.descricao
FROM papeis_permissoes pp
JOIN papeis p ON pp.papel_id = p.id
JOIN permissoes perm ON pp.permissao_id = perm.id
WHERE p.nome = 'ADMIN'
ORDER BY perm.chave;
