-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSÕES DO MÓDULO CONTROL iD - CONTROLE DE ACESSO
-- ═══════════════════════════════════════════════════════════════════════════
-- Execute este script para criar as permissões do módulo de integração
-- com equipamentos Control iD (iDUHF, iDFace, iDBlock, etc.)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERIR PERMISSÕES DO CONTROL iD
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO permissoes (chave, descricao) VALUES
-- Permissões de Visualização
('controlid_visualizar', 'Visualizar equipamentos Control iD cadastrados'),
('controlid_status', 'Visualizar status dos equipamentos em tempo real'),

-- Permissões de Gerenciamento de Equipamentos
('controlid_cadastrar', 'Cadastrar novos equipamentos Control iD'),
('controlid_editar', 'Editar configurações de equipamentos'),
('controlid_excluir', 'Excluir equipamentos cadastrados'),

-- Permissões de Operação (Ações nos equipamentos)
('controlid_abrir_porta', 'Executar comando de abertura de porta/relé'),
('controlid_liberar_catraca', 'Executar comando de liberação de catraca'),

-- Permissões de Gerenciamento de Usuários nos Equipamentos
('controlid_usuarios_visualizar', 'Visualizar usuários cadastrados nos equipamentos'),
('controlid_usuarios_gerenciar', 'Criar/editar/excluir usuários nos equipamentos'),

-- Permissões de Credenciais (Cartões, Tags, QR)
('controlid_credenciais_visualizar', 'Visualizar credenciais (cartões, tags UHF, QR)'),
('controlid_credenciais_gerenciar', 'Gerenciar credenciais nos equipamentos'),

-- Permissões de Logs e Relatórios
('controlid_logs_visualizar', 'Visualizar logs de acesso dos equipamentos'),

-- Permissão Administrativa Total
('controlid_gerenciar', 'Acesso total ao módulo Control iD (administrador)')

ON CONFLICT (chave) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- VINCULAR TODAS AS PERMISSÕES AO PAPEL ADMIN
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'ADMIN' LIMIT 1),
    p.id
FROM permissoes p
WHERE p.chave LIKE 'controlid_%'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- VINCULAR PERMISSÕES BÁSICAS AO PAPEL SEGURANÇA
-- (Visualização e operações de abertura de porta)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'SEGURANÇA' LIMIT 1),
    p.id
FROM permissoes p
WHERE p.chave IN (
    'controlid_visualizar',
    'controlid_status',
    'controlid_abrir_porta',
    'controlid_liberar_catraca',
    'controlid_logs_visualizar'
)
ON CONFLICT DO NOTHING;

-- Também para SEGURANCA (sem acento)
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'SEGURANCA' LIMIT 1),
    p.id
FROM permissoes p
WHERE p.chave IN (
    'controlid_visualizar',
    'controlid_status',
    'controlid_abrir_porta',
    'controlid_liberar_catraca',
    'controlid_logs_visualizar'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- VINCULAR PERMISSÕES DE GESTÃO AO PAPEL GESTOR
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'GESTOR' LIMIT 1),
    p.id
FROM permissoes p
WHERE p.chave IN (
    'controlid_visualizar',
    'controlid_status',
    'controlid_cadastrar',
    'controlid_editar',
    'controlid_abrir_porta',
    'controlid_liberar_catraca',
    'controlid_usuarios_visualizar',
    'controlid_usuarios_gerenciar',
    'controlid_credenciais_visualizar',
    'controlid_credenciais_gerenciar',
    'controlid_logs_visualizar'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════
-- Execute para verificar as permissões criadas:
-- SELECT * FROM permissoes WHERE chave LIKE 'controlid_%' ORDER BY chave;
-- 
-- Verificar permissões por papel:
-- SELECT pa.nome as papel, pe.chave as permissao 
-- FROM papeis pa 
-- JOIN papeis_permissoes pp ON pa.id = pp.papel_id 
-- JOIN permissoes pe ON pp.permissao_id = pe.id 
-- WHERE pe.chave LIKE 'controlid_%'
-- ORDER BY pa.nome, pe.chave;
