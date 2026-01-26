-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Ronda Baseada em Pontos de Controle
-- 
-- Esta migração adapta o sistema de rondas para funcionar com pontos de controle
-- pré-cadastrados ao invés de tracking contínuo de GPS.
--
-- MUDANÇAS:
-- 1. Nova tabela `ronda_pontos_controle` - checkpoints fixos pré-cadastrados
-- 2. Alteração em `ronda_checkpoints` - referência ao ponto de controle
-- 3. Tabela `ronda_trajeto` é mantida para histórico mas não mais utilizada
--
-- Executar em: PostgreSQL
-- Data: Janeiro 2026
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABELA: ronda_pontos_controle
-- Pontos de controle fixos para validação de presença durante a ronda
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ronda_pontos_controle (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresa_interno(id) ON DELETE CASCADE,
    
    -- Identificação do ponto
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(500),
    codigo VARCHAR(50), -- Código identificador (QR Code, NFC, etc)
    
    -- Localização
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    raio INTEGER NOT NULL DEFAULT 30, -- Raio de validação em metros (20-100)
    
    -- Ordem sugerida de visita (opcional)
    ordem INTEGER,
    
    -- Obrigatoriedade
    obrigatorio BOOLEAN DEFAULT true,
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    
    -- Metadados
    local_referencia VARCHAR(255), -- Ex: "Portaria Principal", "Bloco A"
    setor VARCHAR(100), -- Setor/área do ponto
    tipo VARCHAR(50) DEFAULT 'checkpoint', -- 'checkpoint', 'entrada', 'saida'
    
    -- Foto do local (para confirmação visual)
    foto_url VARCHAR(500),
    
    -- Configurações antifraude
    tempo_minimo_segundos INTEGER DEFAULT 30, -- Tempo mínimo desde último checkpoint
    
    -- Timestamps
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por VARCHAR(255),
    
    -- Constraint de coordenadas válidas
    CONSTRAINT chk_latitude CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT chk_longitude CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT chk_raio CHECK (raio >= 10 AND raio <= 100)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pontos_controle_empresa ON ronda_pontos_controle(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pontos_controle_ativo ON ronda_pontos_controle(ativo);
CREATE INDEX IF NOT EXISTS idx_pontos_controle_ordem ON ronda_pontos_controle(empresa_id, ordem);
CREATE INDEX IF NOT EXISTS idx_pontos_controle_coordenadas ON ronda_pontos_controle(latitude, longitude);

-- Comentários
COMMENT ON TABLE ronda_pontos_controle IS 'Pontos de controle fixos para validação de presença em rondas';
COMMENT ON COLUMN ronda_pontos_controle.raio IS 'Raio de validação em metros (10-100). Vigilante deve estar dentro deste raio para validar.';
COMMENT ON COLUMN ronda_pontos_controle.tempo_minimo_segundos IS 'Tempo mínimo desde último checkpoint (antifraude)';


-- ═══════════════════════════════════════════════════════════════════════════════
-- ALTERAÇÕES EM ronda_checkpoints
-- Adiciona referência ao ponto de controle e dados de validação
-- ═══════════════════════════════════════════════════════════════════════════════

-- Adiciona coluna de referência ao ponto de controle
ALTER TABLE ronda_checkpoints 
ADD COLUMN IF NOT EXISTS ponto_controle_id INTEGER REFERENCES ronda_pontos_controle(id);

-- Adiciona distância registrada no momento da validação
ALTER TABLE ronda_checkpoints 
ADD COLUMN IF NOT EXISTS distancia_validacao DECIMAL(8, 2);

-- Adiciona precisão do GPS no momento da validação
ALTER TABLE ronda_checkpoints 
ADD COLUMN IF NOT EXISTS precisao_gps DECIMAL(8, 2);

-- Adiciona flag para identificar validações offline
ALTER TABLE ronda_checkpoints 
ADD COLUMN IF NOT EXISTS validado_offline BOOLEAN DEFAULT false;

-- Adiciona timestamp da sincronização (se offline)
ALTER TABLE ronda_checkpoints 
ADD COLUMN IF NOT EXISTS sincronizado_em TIMESTAMP;

-- Índice para ponto de controle
CREATE INDEX IF NOT EXISTS idx_checkpoints_ponto_controle ON ronda_checkpoints(ponto_controle_id);

-- Comentários atualizados
COMMENT ON COLUMN ronda_checkpoints.ponto_controle_id IS 'Referência ao ponto de controle pré-cadastrado';
COMMENT ON COLUMN ronda_checkpoints.distancia_validacao IS 'Distância em metros do ponto de controle no momento da validação';
COMMENT ON COLUMN ronda_checkpoints.precisao_gps IS 'Precisão do GPS em metros no momento da validação';
COMMENT ON COLUMN ronda_checkpoints.validado_offline IS 'Se foi validado em modo offline';


-- ═══════════════════════════════════════════════════════════════════════════════
-- ALTERAÇÕES EM rondas
-- Adiciona métricas específicas para pontos de controle
-- ═══════════════════════════════════════════════════════════════════════════════

-- Total de pontos de controle obrigatórios
ALTER TABLE rondas 
ADD COLUMN IF NOT EXISTS total_pontos_obrigatorios INTEGER DEFAULT 0;

-- Total de pontos de controle visitados
ALTER TABLE rondas 
ADD COLUMN IF NOT EXISTS pontos_visitados INTEGER DEFAULT 0;

-- Percentual de conclusão da ronda
ALTER TABLE rondas 
ADD COLUMN IF NOT EXISTS percentual_conclusao DECIMAL(5, 2) DEFAULT 0;

-- Comentários
COMMENT ON COLUMN rondas.total_pontos_obrigatorios IS 'Total de pontos de controle obrigatórios para esta ronda';
COMMENT ON COLUMN rondas.pontos_visitados IS 'Quantidade de pontos de controle já visitados';
COMMENT ON COLUMN rondas.percentual_conclusao IS 'Percentual de conclusão da ronda (0-100)';


-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Atualizar timestamp de modificação em pontos_controle
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION atualizar_timestamp_ponto_controle()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_timestamp_ponto_controle ON ronda_pontos_controle;
CREATE TRIGGER trigger_atualizar_timestamp_ponto_controle
    BEFORE UPDATE ON ronda_pontos_controle
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_ponto_controle();


-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Atualizar progresso da ronda ao registrar checkpoint
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION atualizar_progresso_ronda()
RETURNS TRIGGER AS $$
DECLARE
    v_total_obrigatorios INTEGER;
    v_visitados INTEGER;
    v_percentual DECIMAL(5,2);
BEGIN
    -- Conta pontos de controle obrigatórios da empresa
    SELECT COUNT(*) INTO v_total_obrigatorios
    FROM ronda_pontos_controle pc
    JOIN rondas r ON r.empresa_id = pc.empresa_id
    WHERE r.id = NEW.ronda_id
    AND pc.ativo = true
    AND pc.obrigatorio = true;

    -- Conta checkpoints validados
    SELECT COUNT(DISTINCT ponto_controle_id) INTO v_visitados
    FROM ronda_checkpoints
    WHERE ronda_id = NEW.ronda_id
    AND ponto_controle_id IS NOT NULL;

    -- Calcula percentual
    IF v_total_obrigatorios > 0 THEN
        v_percentual := (v_visitados::DECIMAL / v_total_obrigatorios) * 100;
    ELSE
        v_percentual := 100;
    END IF;

    -- Atualiza ronda
    UPDATE rondas
    SET 
        total_pontos_obrigatorios = v_total_obrigatorios,
        pontos_visitados = v_visitados,
        percentual_conclusao = LEAST(v_percentual, 100)
    WHERE id = NEW.ronda_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_progresso_ronda ON ronda_checkpoints;
CREATE TRIGGER trigger_atualizar_progresso_ronda
    AFTER INSERT ON ronda_checkpoints
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_progresso_ronda();


-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Validar proximidade de checkpoint (antifraude no backend)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION validar_proximidade_checkpoint(
    p_ponto_controle_id INTEGER,
    p_latitude DECIMAL(10,8),
    p_longitude DECIMAL(11,8)
)
RETURNS TABLE (
    valido BOOLEAN,
    distancia DECIMAL(10,2),
    raio INTEGER,
    mensagem TEXT
) AS $$
DECLARE
    v_ponto RECORD;
    v_distancia DECIMAL(10,2);
BEGIN
    -- Busca ponto de controle
    SELECT * INTO v_ponto
    FROM ronda_pontos_controle
    WHERE id = p_ponto_controle_id AND ativo = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 0, 'Ponto de controle não encontrado'::TEXT;
        RETURN;
    END IF;

    -- Calcula distância usando Haversine
    v_distancia := 6371000 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(p_latitude - v_ponto.latitude) / 2), 2) +
        COS(RADIANS(v_ponto.latitude)) * COS(RADIANS(p_latitude)) *
        POWER(SIN(RADIANS(p_longitude - v_ponto.longitude) / 2), 2)
    ));

    -- Retorna resultado
    IF v_distancia <= v_ponto.raio THEN
        RETURN QUERY SELECT 
            true, 
            v_distancia, 
            v_ponto.raio, 
            'Dentro do raio de validação'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            false, 
            v_distancia, 
            v_ponto.raio, 
            ('Fora do raio. Distância: ' || ROUND(v_distancia) || 'm, Raio: ' || v_ponto.raio || 'm')::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW: Resumo de pontos de controle por empresa
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW view_pontos_controle_empresa AS
SELECT 
    e.id AS empresa_id,
    e.nome AS empresa_nome,
    COUNT(pc.id) AS total_pontos,
    COUNT(CASE WHEN pc.obrigatorio THEN 1 END) AS pontos_obrigatorios,
    COUNT(CASE WHEN NOT pc.obrigatorio THEN 1 END) AS pontos_opcionais,
    COUNT(CASE WHEN pc.ativo THEN 1 END) AS pontos_ativos,
    ROUND(AVG(pc.raio)) AS raio_medio
FROM empresa_interno e
LEFT JOIN ronda_pontos_controle pc ON pc.empresa_id = e.id
GROUP BY e.id, e.nome;


-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW: Progresso das rondas do dia
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW view_rondas_progresso_hoje AS
SELECT 
    r.id AS ronda_id,
    r.usuario_id,
    u.nome AS usuario_nome,
    r.empresa_id,
    e.nome AS empresa_nome,
    r.status,
    r.data_inicio,
    r.data_fim,
    r.total_pontos_obrigatorios,
    r.pontos_visitados,
    r.percentual_conclusao,
    r.tempo_total_segundos,
    CASE 
        WHEN r.percentual_conclusao >= 100 THEN 'Completa'
        WHEN r.percentual_conclusao >= 50 THEN 'Em andamento'
        ELSE 'Iniciada'
    END AS situacao
FROM rondas r
JOIN usuarios u ON r.usuario_id = u.id
LEFT JOIN empresa_interno e ON r.empresa_id = e.id
WHERE DATE(r.data_inicio) = CURRENT_DATE
ORDER BY r.data_inicio DESC;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PERMISSÕES RBAC - Adiciona permissões de gestão de pontos de controle
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO permissoes (chave, descricao) VALUES 
('ronda_pontos_controle_gerenciar', 'Gerenciar pontos de controle de rondas (criar, editar, excluir)'),
('ronda_pontos_controle_visualizar', 'Visualizar pontos de controle de rondas')
ON CONFLICT (chave) DO NOTHING;

-- Associa permissões ao papel GESTOR
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'GESTOR'
AND perm.chave IN (
    'ronda_pontos_controle_gerenciar',
    'ronda_pontos_controle_visualizar'
)
ON CONFLICT DO NOTHING;

-- Associa permissão de visualização ao papel SEGURANCA
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'SEGURANCA'
AND perm.chave = 'ronda_pontos_controle_visualizar'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DADOS DE EXEMPLO (opcional - descomentar para ambiente de desenvolvimento)
-- ═══════════════════════════════════════════════════════════════════════════════

-- INSERT INTO ronda_pontos_controle (empresa_id, nome, descricao, latitude, longitude, raio, ordem, obrigatorio, local_referencia, setor)
-- SELECT 
--     e.id,
--     'Portaria Principal',
--     'Entrada principal da empresa',
--     -23.550520, -- Exemplo: coordenadas de São Paulo
--     -46.633308,
--     30, -- Raio de 30 metros
--     1, -- Primeiro ponto
--     true,
--     'Entrada principal',
--     'Recepção'
-- FROM empresa_interno e
-- WHERE e.id = 1
-- ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- MENSAGEM DE CONCLUSÃO
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Migração de Ronda por Pontos de Controle concluída!';
    RAISE NOTICE '';
    RAISE NOTICE 'TABELAS CRIADAS/ALTERADAS:';
    RAISE NOTICE '  - ronda_pontos_controle (NOVA)';
    RAISE NOTICE '  - ronda_checkpoints (ALTERADA - nova coluna ponto_controle_id)';
    RAISE NOTICE '  - rondas (ALTERADA - novas colunas de progresso)';
    RAISE NOTICE '';
    RAISE NOTICE 'FUNCIONALIDADES:';
    RAISE NOTICE '  - Pontos de controle pré-cadastrados por empresa';
    RAISE NOTICE '  - Validação de proximidade com raio configurável';
    RAISE NOTICE '  - Progresso automático da ronda';
    RAISE NOTICE '  - Suporte a validação offline';
    RAISE NOTICE '  - Função de validação antifraude no banco';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASSOS:';
    RAISE NOTICE '  1. Cadastrar pontos de controle para cada empresa';
    RAISE NOTICE '  2. Atualizar endpoints do backend';
    RAISE NOTICE '  3. Testar validação de proximidade';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
