-- ═══════════════════════════════════════════════════════════════════════════════
-- MÓDULO: RONDA DE VIGILANTE
-- Script para criar tabelas do módulo de rondas
-- Execute este script no PostgreSQL para criar a estrutura completa
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA: rondas
-- Armazena informações principais de cada ronda realizada
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rondas (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(255) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    empresa_id INTEGER REFERENCES empresa_interno(id) ON DELETE SET NULL,
    
    -- Status da ronda: 'em_andamento', 'finalizada', 'cancelada'
    status VARCHAR(20) NOT NULL DEFAULT 'em_andamento',
    
    -- Datas e horários
    data_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP,
    
    -- Localização inicial e final
    latitude_inicio DECIMAL(10, 8),
    longitude_inicio DECIMAL(11, 8),
    latitude_fim DECIMAL(10, 8),
    longitude_fim DECIMAL(11, 8),
    
    -- Métricas calculadas
    tempo_total_segundos INTEGER DEFAULT 0,
    distancia_total_metros DECIMAL(10, 2) DEFAULT 0,
    total_checkpoints INTEGER DEFAULT 0,
    
    -- Observações
    observacoes TEXT,
    
    -- Controle de concorrência
    versao INTEGER DEFAULT 1,
    
    -- Timestamps de auditoria
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_rondas_usuario_id ON rondas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rondas_empresa_id ON rondas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_rondas_status ON rondas(status);
CREATE INDEX IF NOT EXISTS idx_rondas_data_inicio ON rondas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_rondas_data_fim ON rondas(data_fim);

-- Comentários na tabela
COMMENT ON TABLE rondas IS 'Tabela principal de rondas de vigilante';
COMMENT ON COLUMN rondas.status IS 'Status: em_andamento, finalizada, cancelada';
COMMENT ON COLUMN rondas.versao IS 'Controle de concorrência otimista';


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA: ronda_checkpoints
-- Armazena os pontos de verificação registrados durante a ronda
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ronda_checkpoints (
    id SERIAL PRIMARY KEY,
    ronda_id INTEGER NOT NULL REFERENCES rondas(id) ON DELETE CASCADE,
    
    -- Número sequencial do checkpoint na ronda
    numero_sequencial INTEGER NOT NULL,
    
    -- Localização do checkpoint
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Data e hora do registro
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Tempo desde o checkpoint anterior (em segundos)
    tempo_desde_anterior_segundos INTEGER DEFAULT 0,
    
    -- Distância desde o checkpoint anterior (em metros)
    distancia_desde_anterior_metros DECIMAL(10, 2) DEFAULT 0,
    
    -- Descrição/observação do checkpoint
    descricao VARCHAR(500),
    
    -- Foto do checkpoint (URL ou base64)
    foto_url VARCHAR(500),
    
    -- Timestamps de auditoria
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_ronda_checkpoints_ronda_id ON ronda_checkpoints(ronda_id);
CREATE INDEX IF NOT EXISTS idx_ronda_checkpoints_data_hora ON ronda_checkpoints(data_hora);

-- Constraint única para evitar duplicação de número sequencial na mesma ronda
ALTER TABLE ronda_checkpoints 
ADD CONSTRAINT uk_ronda_checkpoint_sequencial UNIQUE (ronda_id, numero_sequencial);

-- Comentários
COMMENT ON TABLE ronda_checkpoints IS 'Pontos de verificação registrados durante a ronda';
COMMENT ON COLUMN ronda_checkpoints.numero_sequencial IS 'Ordem do checkpoint na ronda (1, 2, 3...)';


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA: ronda_trajeto
-- Armazena o trajeto GPS completo da ronda em tempo real
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ronda_trajeto (
    id SERIAL PRIMARY KEY,
    ronda_id INTEGER NOT NULL REFERENCES rondas(id) ON DELETE CASCADE,
    
    -- Coordenadas do ponto do trajeto
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Precisão do GPS (em metros)
    precisao_metros DECIMAL(8, 2),
    
    -- Altitude (se disponível)
    altitude_metros DECIMAL(10, 2),
    
    -- Velocidade (m/s)
    velocidade DECIMAL(8, 2),
    
    -- Data e hora do registro
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Número sequencial do ponto no trajeto
    numero_sequencial INTEGER NOT NULL
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_ronda_trajeto_ronda_id ON ronda_trajeto(ronda_id);
CREATE INDEX IF NOT EXISTS idx_ronda_trajeto_data_hora ON ronda_trajeto(data_hora);

-- Comentários
COMMENT ON TABLE ronda_trajeto IS 'Trajeto GPS completo da ronda para exibição no mapa';
COMMENT ON COLUMN ronda_trajeto.precisao_metros IS 'Precisão do GPS no momento da captura';


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA: ronda_auditoria
-- Registra todas as ações realizadas no módulo de rondas
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ronda_auditoria (
    id SERIAL PRIMARY KEY,
    ronda_id INTEGER REFERENCES rondas(id) ON DELETE SET NULL,
    usuario_id VARCHAR(255) NOT NULL,
    
    -- Tipo de ação: 'INICIO', 'CHECKPOINT', 'TRAJETO', 'FINALIZACAO', 'CANCELAMENTO', 'VISUALIZACAO'
    tipo_acao VARCHAR(50) NOT NULL,
    
    -- Descrição detalhada da ação
    descricao TEXT NOT NULL,
    
    -- Dados adicionais em JSON (coordenadas, valores antigos/novos, etc.)
    dados_json JSONB,
    
    -- IP do usuário
    ip_usuario VARCHAR(45),
    
    -- User agent do navegador/app
    user_agent VARCHAR(500),
    
    -- Data e hora da ação
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_ronda_auditoria_ronda_id ON ronda_auditoria(ronda_id);
CREATE INDEX IF NOT EXISTS idx_ronda_auditoria_usuario_id ON ronda_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ronda_auditoria_tipo_acao ON ronda_auditoria(tipo_acao);
CREATE INDEX IF NOT EXISTS idx_ronda_auditoria_data_hora ON ronda_auditoria(data_hora);

-- Comentários
COMMENT ON TABLE ronda_auditoria IS 'Registro de auditoria de todas as ações no módulo de rondas';
COMMENT ON COLUMN ronda_auditoria.tipo_acao IS 'Tipos: INICIO, CHECKPOINT, TRAJETO, FINALIZACAO, CANCELAMENTO, VISUALIZACAO';
COMMENT ON COLUMN ronda_auditoria.dados_json IS 'Dados adicionais da ação em formato JSON';


-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Atualizar timestamp de modificação
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atualizar_timestamp_ronda()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_timestamp_ronda ON rondas;
CREATE TRIGGER trigger_atualizar_timestamp_ronda
    BEFORE UPDATE ON rondas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_ronda();


-- ═══════════════════════════════════════════════════════════════════════════════
-- PERMISSÕES RBAC DO MÓDULO DE RONDA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO permissoes (chave, descricao) VALUES 
('ronda_iniciar', 'Iniciar uma nova ronda de vigilante'),
('ronda_registrar_checkpoint', 'Registrar checkpoint durante a ronda'),
('ronda_registrar_trajeto', 'Registrar trajeto GPS durante a ronda'),
('ronda_finalizar', 'Finalizar uma ronda em andamento'),
('ronda_gerenciar', 'Gerenciar e visualizar todas as rondas (painel administrativo)'),
('ronda_visualizar_historico', 'Visualizar histórico de rondas próprias'),
('ronda_cancelar', 'Cancelar uma ronda em andamento'),
('permissao_gerenciar', 'Gerenciar permissões e papéis de usuários'),
('ticket_editar', 'Editar tickets de suporte'),
('cadastro_bloquear', 'Bloquear ou desbloquear cadastros de visitantes')
ON CONFLICT (chave) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- ASSOCIAR PERMISSÕES AOS PAPÉIS
-- ═══════════════════════════════════════════════════════════════════════════════

-- SEGURANÇA: Todas as permissões de ronda operacional + editar tickets
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'SEGURANCA'
AND perm.chave IN (
    'ronda_iniciar',
    'ronda_registrar_checkpoint',
    'ronda_registrar_trajeto',
    'ronda_finalizar',
    'ronda_visualizar_historico',
    'ronda_cancelar',
    'ticket_editar'
)
ON CONFLICT DO NOTHING;

-- GESTOR: Permissão de gerenciar (painel administrativo) + bloquear cadastros
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'GESTOR'
AND perm.chave IN (
    'ronda_gerenciar',
    'ronda_visualizar_historico',
    'cadastro_bloquear',
    'ticket_editar'
)
ON CONFLICT DO NOTHING;

-- ADMIN: Permissão de gerenciar permissões e bloquear cadastros
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'ADMIN'
AND perm.chave IN (
    'permissao_gerenciar',
    'cadastro_bloquear',
    'ticket_editar'
)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEWS ÚTEIS PARA CONSULTAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- View: Resumo de rondas por usuário
CREATE OR REPLACE VIEW view_resumo_rondas_usuario AS
SELECT 
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    e.nome AS empresa_nome,
    COUNT(r.id) AS total_rondas,
    COUNT(CASE WHEN r.status = 'finalizada' THEN 1 END) AS rondas_finalizadas,
    COUNT(CASE WHEN r.status = 'em_andamento' THEN 1 END) AS rondas_em_andamento,
    COUNT(CASE WHEN r.status = 'cancelada' THEN 1 END) AS rondas_canceladas,
    COALESCE(SUM(r.tempo_total_segundos), 0) AS tempo_total_segundos,
    COALESCE(SUM(r.distancia_total_metros), 0) AS distancia_total_metros,
    COALESCE(SUM(r.total_checkpoints), 0) AS total_checkpoints
FROM usuarios u
LEFT JOIN rondas r ON r.usuario_id = u.id
LEFT JOIN empresa_interno e ON u.empresa_id = e.id
GROUP BY u.id, u.nome, e.nome;

-- View: Rondas do dia atual
CREATE OR REPLACE VIEW view_rondas_hoje AS
SELECT 
    r.*,
    u.nome AS usuario_nome,
    e.nome AS empresa_nome,
    (SELECT COUNT(*) FROM ronda_checkpoints rc WHERE rc.ronda_id = r.id) AS checkpoints_count
FROM rondas r
JOIN usuarios u ON r.usuario_id = u.id
LEFT JOIN empresa_interno e ON r.empresa_id = e.id
WHERE DATE(r.data_inicio) = CURRENT_DATE
ORDER BY r.data_inicio DESC;


-- ═══════════════════════════════════════════════════════════════════════════════
-- MENSAGEM DE CONCLUSÃO
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Módulo de Ronda de Vigilante criado com sucesso!';
    RAISE NOTICE 'Tabelas criadas: rondas, ronda_checkpoints, ronda_trajeto, ronda_auditoria';
    RAISE NOTICE 'Permissões RBAC configuradas';
    RAISE NOTICE 'Views auxiliares criadas';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
