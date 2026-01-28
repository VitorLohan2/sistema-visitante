-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Criar tabela empresa_atribuida e adicionar coluna nas tabelas de visitante
-- Data: 2026-01-28
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. CRIAR TABELA empresa_atribuida
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS empresa_atribuida (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentário na tabela
COMMENT ON TABLE empresa_atribuida IS 'Empresas de destino dos visitantes (para qual empresa o visitante está indo)';
COMMENT ON COLUMN empresa_atribuida.nome IS 'Nome da empresa atribuída';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. INSERIR DADOS INICIAIS
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO empresa_atribuida (nome) VALUES 
    ('Dime'),
    ('Guepar')
ON CONFLICT (nome) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ADICIONAR COLUNA empresa_atribuida_id NA TABELA visitante
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'visitante' AND column_name = 'empresa_atribuida_id'
    ) THEN
        ALTER TABLE visitante 
        ADD COLUMN empresa_atribuida_id INTEGER REFERENCES empresa_atribuida(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN visitante.empresa_atribuida_id IS 'ID da empresa destino do visitante';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. ADICIONAR COLUNA empresa_atribuida_id NA TABELA historico_visitante
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'historico_visitante' AND column_name = 'empresa_atribuida_id'
    ) THEN
        ALTER TABLE historico_visitante 
        ADD COLUMN empresa_atribuida_id INTEGER REFERENCES empresa_atribuida(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN historico_visitante.empresa_atribuida_id IS 'ID da empresa destino do visitante no momento do registro';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. CRIAR ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_visitante_empresa_atribuida ON visitante(empresa_atribuida_id);
CREATE INDEX IF NOT EXISTS idx_historico_visitante_empresa_atribuida ON historico_visitante(empresa_atribuida_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. (OPCIONAL) CRIAR PERMISSÃO PARA GERENCIAR EMPRESAS ATRIBUÍDAS
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO permissao (nome, descricao, modulo) VALUES 
    ('empresa_atribuida_gerenciar', 'Gerenciar empresas atribuídas (destino dos visitantes)', 'visitantes')
ON CONFLICT (nome) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO: Listar dados inseridos
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT * FROM empresa_atribuida;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'visitante' AND column_name = 'empresa_atribuida_id';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'historico_visitante' AND column_name = 'empresa_atribuida_id';
