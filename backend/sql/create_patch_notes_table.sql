-- ═══════════════════════════════════════════════════════════════
-- TABELA: patch_notes
-- Armazena as atualizações/notas de versão do sistema
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS patch_notes (
    id SERIAL PRIMARY KEY,
    versao VARCHAR(20) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'improvement' CHECK (tipo IN ('feature', 'improvement', 'fix')),
    data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_patch_notes_data_lancamento ON patch_notes(data_lancamento DESC);

-- Comentários das colunas
COMMENT ON TABLE patch_notes IS 'Armazena as atualizações e notas de versão do sistema';
COMMENT ON COLUMN patch_notes.versao IS 'Número da versão (ex: 2.5.0)';
COMMENT ON COLUMN patch_notes.titulo IS 'Título curto da atualização';
COMMENT ON COLUMN patch_notes.descricao IS 'Descrição detalhada da atualização';
COMMENT ON COLUMN patch_notes.tipo IS 'Tipo: feature (nova funcionalidade), improvement (melhoria), fix (correção)';
COMMENT ON COLUMN patch_notes.data_lancamento IS 'Data de lançamento da versão';

-- ═══════════════════════════════════════════════════════════════
-- DADOS INICIAIS (Seed)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO patch_notes (versao, titulo, descricao, tipo, data_lancamento) VALUES
('2.5.0', 'Nova Página Inicial', 'Dashboard de boas-vindas com visão geral do sistema, relógio em tempo real e atualizações', 'feature', '2026-01-15'),
('2.4.2', 'Modal de Crachá Profissional', 'Novo design para impressão de etiquetas de visitantes com layout 60x40mm', 'improvement', '2026-01-10'),
('2.4.1', 'Modal de Registro de Visita', 'Edição rápida de empresa e veículo ao registrar visita', 'improvement', '2026-01-08'),
('2.4.0', 'Sistema de Descargas', 'Gerenciamento completo de solicitações de descarga com agendamento', 'feature', '2026-01-05'),
('2.3.5', 'Correções de Performance', 'Otimização de carregamento e cache de dados', 'fix', '2026-01-02')
ON CONFLICT DO NOTHING;
