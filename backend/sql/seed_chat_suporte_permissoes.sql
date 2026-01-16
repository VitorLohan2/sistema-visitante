-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSÕES DO SISTEMA DE CHAT DE SUPORTE
-- ═══════════════════════════════════════════════════════════════════════════
-- Execute este script APÓS criar as tabelas do chat
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERIR PERMISSÕES DO CHAT
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO permissoes (nome, descricao, modulo) VALUES
-- Permissões do Painel de Atendimento
('chat_atendente_acessar_painel', 'Acesso ao painel de atendimento do chat', 'Chat Suporte'),
('chat_atendente_aceitar', 'Aceitar conversas da fila de atendimento', 'Chat Suporte'),
('chat_atendente_transferir', 'Transferir conversas para outros atendentes', 'Chat Suporte'),
('chat_atendente_finalizar', 'Finalizar conversas de atendimento', 'Chat Suporte'),

-- Permissões de Gestão
('chat_gerenciar_faq', 'Gerenciar perguntas frequentes (FAQ)', 'Chat Suporte'),
('chat_visualizar_auditoria', 'Visualizar logs de auditoria do chat', 'Chat Suporte'),
('chat_visualizar_relatorios', 'Visualizar relatórios e métricas do chat', 'Chat Suporte'),
('chat_gerenciar_configuracoes', 'Gerenciar configurações do chat', 'Chat Suporte')

ON CONFLICT (nome) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- VINCULAR PERMISSÕES AO PAPEL ADMIN
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'ADMIN' LIMIT 1),
    p.id
FROM permissoes p
WHERE p.modulo = 'Chat Suporte'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CRIAR PAPEL DE ATENDENTE (se não existir)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO papeis (nome, descricao)
VALUES ('ATENDENTE_CHAT', 'Atendente do chat de suporte')
ON CONFLICT (nome) DO NOTHING;

-- Vincular permissões básicas ao papel ATENDENTE_CHAT
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'ATENDENTE_CHAT' LIMIT 1),
    p.id
FROM permissoes p
WHERE p.nome IN (
    'chat_atendente_acessar_painel',
    'chat_atendente_aceitar',
    'chat_atendente_finalizar'
)
ON CONFLICT DO NOTHING;
