-- ═══════════════════════════════════════════════════════════════
-- Script para Popular Papéis e Permissões do Sistema
-- Execute este script no DBeaver após criar as tabelas
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- INSERIR PAPÉIS PADRÃO
-- ═══════════════════════════════════════════════════════════════
INSERT INTO papeis (nome, descricao) VALUES 
('ADMIN', 'Administrador com acesso total ao sistema'),
('USUARIO', 'Usuário padrão com permissões básicas'),
('GESTOR', 'Gestor com permissões de gerenciamento'),
('SEGURANCA', 'Setor de segurança'),
('SUPORTE', 'Suporte técnico')
ON CONFLICT (nome) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- INSERIR PERMISSÕES DO SISTEMA
-- ═══════════════════════════════════════════════════════════════

-- Módulo: Usuários
INSERT INTO permissoes (chave, descricao) VALUES 
('usuario_visualizar', 'Visualizar lista de usuários'),
('usuario_criar', 'Criar novos usuários'),
('usuario_editar', 'Editar dados de usuários'),
('usuario_deletar', 'Deletar usuários'),
('usuario_gerenciar', 'Gerenciar papéis e permissões de usuários')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Papéis
INSERT INTO permissoes (chave, descricao) VALUES 
('papel_visualizar', 'Visualizar papéis'),
('papel_criar', 'Criar novos papéis'),
('papel_editar', 'Editar papéis'),
('papel_deletar', 'Deletar papéis'),
('papel_gerenciar_permissoes', 'Gerenciar permissões dos papéis')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Permissões
INSERT INTO permissoes (chave, descricao) VALUES 
('permissao_visualizar', 'Visualizar permissões')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Cadastro de Visitantes
INSERT INTO permissoes (chave, descricao) VALUES 
('cadastro_visualizar', 'Visualizar cadastros de visitantes'),
('cadastro_criar', 'Criar novo cadastro de visitante'),
('cadastro_editar', 'Editar cadastro de visitante'),
('cadastro_deletar', 'Deletar cadastro de visitante')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Visitantes (entrada/saída)
INSERT INTO permissoes (chave, descricao) VALUES 
('visitante_visualizar', 'Visualizar visitantes em tempo real'),
('visitante_registrar_entrada', 'Registrar entrada de visitante'),
('visitante_registrar_saida', 'Registrar saída de visitante'),
('visitante_historico', 'Visualizar histórico de visitas')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Empresas
INSERT INTO permissoes (chave, descricao) VALUES 
('empresa_visualizar', 'Visualizar empresas'),
('empresa_criar', 'Criar novas empresas'),
('empresa_editar', 'Editar empresas'),
('empresa_deletar', 'Deletar empresas')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Setores
INSERT INTO permissoes (chave, descricao) VALUES 
('setor_visualizar', 'Visualizar setores'),
('setor_criar', 'Criar novos setores'),
('setor_editar', 'Editar setores'),
('setor_deletar', 'Deletar setores')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Funcionários
INSERT INTO permissoes (chave, descricao) VALUES 
('funcionario_visualizar', 'Visualizar funcionários'),
('funcionario_criar', 'Criar funcionários'),
('funcionario_editar', 'Editar funcionários'),
('funcionario_deletar', 'Deletar funcionários'),
('funcionario_historico', 'Visualizar histórico de funcionários')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Agendamentos
INSERT INTO permissoes (chave, descricao) VALUES 
('agendamento_visualizar', 'Visualizar agendamentos'),
('agendamento_criar', 'Criar agendamentos'),
('agendamento_editar', 'Editar agendamentos'),
('agendamento_deletar', 'Deletar agendamentos')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Tickets
INSERT INTO permissoes (chave, descricao) VALUES 
('ticket_visualizar', 'Visualizar tickets'),
('ticket_criar', 'Criar tickets'),
('ticket_editar', 'Editar/atualizar status de tickets'),
('ticket_deletar', 'Deletar tickets')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Comunicados
INSERT INTO permissoes (chave, descricao) VALUES 
('comunicado_visualizar', 'Visualizar comunicados'),
('comunicado_criar', 'Criar comunicados'),
('comunicado_editar', 'Editar comunicados'),
('comunicado_deletar', 'Deletar comunicados')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Códigos de Acesso
INSERT INTO permissoes (chave, descricao) VALUES 
('codigo_visualizar', 'Visualizar códigos de acesso'),
('codigo_criar', 'Criar códigos de acesso'),
('codigo_ativar', 'Ativar/desativar códigos de acesso'),
('codigo_deletar', 'Deletar códigos de acesso')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Ponto
INSERT INTO permissoes (chave, descricao) VALUES 
('ponto_visualizar', 'Visualizar registros de ponto'),
('ponto_registrar', 'Registrar ponto'),
('ponto_editar', 'Editar registros de ponto')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Dashboard
INSERT INTO permissoes (chave, descricao) VALUES 
('dashboard_visualizar', 'Visualizar dashboard')
ON CONFLICT (chave) DO NOTHING;

-- Módulo: Chat
INSERT INTO permissoes (chave, descricao) VALUES 
('chat_visualizar', 'Visualizar chat'),
('chat_enviar', 'Enviar mensagens no chat')
ON CONFLICT (chave) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- ATRIBUIR TODAS AS PERMISSÕES AO PAPEL ADMIN
-- ═══════════════════════════════════════════════════════════════
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'ADMIN'),
    id
FROM permissoes
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- ATRIBUIR PERMISSÕES BÁSICAS AO PAPEL USUARIO
-- ═══════════════════════════════════════════════════════════════
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'USUARIO'),
    id
FROM permissoes 
WHERE chave IN (
    'cadastro_visualizar',
    'cadastro_criar',
    'cadastro_editar',
    'visitante_visualizar',
    'visitante_registrar_entrada',
    'visitante_registrar_saida',
    'visitante_historico',
    'empresa_visualizar',
    'setor_visualizar',
    'agendamento_visualizar',
    'agendamento_criar',
    'ticket_visualizar',
    'ticket_criar',
    'comunicado_visualizar',
    'ponto_visualizar',
    'ponto_registrar',
    'chat_visualizar',
    'chat_enviar'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- ATRIBUIR PERMISSÕES AO PAPEL GESTOR
-- ═══════════════════════════════════════════════════════════════
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'GESTOR'),
    id
FROM permissoes 
WHERE chave IN (
    'usuario_visualizar',
    'cadastro_visualizar',
    'cadastro_criar',
    'cadastro_editar',
    'cadastro_deletar',
    'visitante_visualizar',
    'visitante_registrar_entrada',
    'visitante_registrar_saida',
    'visitante_historico',
    'empresa_visualizar',
    'empresa_criar',
    'empresa_editar',
    'setor_visualizar',
    'setor_criar',
    'setor_editar',
    'funcionario_visualizar',
    'funcionario_criar',
    'funcionario_editar',
    'funcionario_historico',
    'agendamento_visualizar',
    'agendamento_criar',
    'agendamento_editar',
    'agendamento_deletar',
    'ticket_visualizar',
    'ticket_criar',
    'ticket_editar',
    'comunicado_visualizar',
    'comunicado_criar',
    'dashboard_visualizar',
    'ponto_visualizar',
    'ponto_registrar',
    'ponto_editar',
    'chat_visualizar',
    'chat_enviar'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- ATRIBUIR PERMISSÕES AO PAPEL SEGURANCA
-- ═══════════════════════════════════════════════════════════════
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'SEGURANCA'),
    id
FROM permissoes 
WHERE chave IN (
    'cadastro_visualizar',
    'visitante_visualizar',
    'visitante_registrar_entrada',
    'visitante_registrar_saida',
    'visitante_historico',
    'empresa_visualizar',
    'setor_visualizar',
    'funcionario_visualizar',
    'ticket_visualizar',
    'ticket_criar',
    'ticket_editar',
    'comunicado_visualizar',
    'ponto_visualizar',
    'ponto_registrar',
    'chat_visualizar',
    'chat_enviar'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- ATRIBUIR PERMISSÕES AO PAPEL SUPORTE
-- ═══════════════════════════════════════════════════════════════
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT 
    (SELECT id FROM papeis WHERE nome = 'SUPORTE'),
    id
FROM permissoes 
WHERE chave IN (
    'usuario_visualizar',
    'cadastro_visualizar',
    'cadastro_criar',
    'cadastro_editar',
    'visitante_visualizar',
    'visitante_historico',
    'empresa_visualizar',
    'setor_visualizar',
    'funcionario_visualizar',
    'agendamento_visualizar',
    'ticket_visualizar',
    'ticket_criar',
    'ticket_editar',
    'comunicado_visualizar',
    'codigo_visualizar',
    'ponto_visualizar',
    'chat_visualizar',
    'chat_enviar'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICAR DADOS INSERIDOS
-- ═══════════════════════════════════════════════════════════════
SELECT 'Papéis criados:' as info, COUNT(*) as total FROM papeis;
SELECT 'Permissões criadas:' as info, COUNT(*) as total FROM permissoes;
SELECT 'Permissões por papel:' as info;
SELECT p.nome, COUNT(pp.permissao_id) as total_permissoes 
FROM papeis p 
LEFT JOIN papeis_permissoes pp ON p.id = pp.papel_id 
GROUP BY p.nome 
ORDER BY p.nome;
