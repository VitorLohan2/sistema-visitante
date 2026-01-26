-- ═══════════════════════════════════════════════════════════════════════════
-- MÓDULO DE SOLICITAÇÕES DE DESCARGA
-- Script SQL para criação de tabelas e permissões
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CRIAÇÃO DAS TABELAS
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela principal de solicitações de descarga
CREATE TABLE IF NOT EXISTS solicitacoes_descarga (
    id SERIAL PRIMARY KEY,
    protocolo VARCHAR(20) UNIQUE NOT NULL,
    
    -- Dados da empresa solicitante
    empresa_nome VARCHAR(255) NOT NULL,
    empresa_cnpj_cpf VARCHAR(18) NOT NULL,
    empresa_email VARCHAR(255) NOT NULL,
    empresa_telefone VARCHAR(20) NOT NULL,
    
    -- Dados do motorista
    motorista_nome VARCHAR(255) NOT NULL,
    motorista_cpf VARCHAR(14) NOT NULL,
    motorista_cnh VARCHAR(20) NOT NULL,
    motorista_telefone VARCHAR(20) NOT NULL,
    
    -- Dados do veículo e carga
    placa_veiculo VARCHAR(10) NOT NULL,
    tipo_carga VARCHAR(255) NOT NULL,
    
    -- Agendamento
    data_pretendida DATE NOT NULL,
    horario_pretendido TIME NOT NULL,
    observacoes TEXT,
    
    -- Status e controle
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'ajuste_solicitado')),
    motivo_rejeicao TEXT,
    data_resposta TIMESTAMP,
    respondido_por INTEGER REFERENCES usuarios(id),
    
    -- Vinculo com agendamento (quando aprovado)
    agendamento_id INTEGER REFERENCES agendamentos(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_descarga_status ON solicitacoes_descarga(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_descarga_protocolo ON solicitacoes_descarga(protocolo);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_descarga_data ON solicitacoes_descarga(data_pretendida);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_descarga_empresa ON solicitacoes_descarga(empresa_cnpj_cpf);

-- Tabela de histórico de alterações
CREATE TABLE IF NOT EXISTS solicitacoes_descarga_historico (
    id SERIAL PRIMARY KEY,
    solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes_descarga(id) ON DELETE CASCADE,
    acao VARCHAR(50) NOT NULL,
    descricao TEXT,
    dados_anteriores JSONB,
    dados_novos JSONB,
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para histórico
CREATE INDEX IF NOT EXISTS idx_solicitacoes_historico_solicitacao ON solicitacoes_descarga_historico(solicitacao_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CRIAÇÃO DAS PERMISSÕES
-- ═══════════════════════════════════════════════════════════════════════════

-- Inserir novas permissões para o módulo de descarga
INSERT INTO permissoes (chave, descricao) VALUES
    ('descarga_visualizar', 'Visualizar solicitações de descarga'),
    ('descarga_aprovar', 'Aprovar/Rejeitar solicitações de descarga'),
    ('descarga_editar', 'Editar solicitações de descarga (ajustar horário)')
ON CONFLICT (chave) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CRIAÇÃO DOS PAPÉIS LOGISTICA E ESTOQUE (se não existirem)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO papeis (nome, descricao) VALUES
    ('LOGISTICA', 'Responsável pela logística e recebimento de mercadorias'),
    ('ESTOQUE', 'Responsável pelo controle de estoque e armazenamento')
ON CONFLICT (nome) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VINCULAR PERMISSÕES AOS PAPÉIS
-- ═══════════════════════════════════════════════════════════════════════════

-- Vincular permissões ao papel LOGISTICA
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'LOGISTICA' 
AND perm.nome IN ('descarga_visualizar', 'descarga_aprovar', 'descarga_editar')
ON CONFLICT (papel_id, permissao_id) DO NOTHING;

-- Vincular permissões ao papel ESTOQUE
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'ESTOQUE' 
AND perm.nome IN ('descarga_visualizar', 'descarga_aprovar', 'descarga_editar')
ON CONFLICT (papel_id, permissao_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DO updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_solicitacoes_descarga_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_solicitacoes_descarga ON solicitacoes_descarga;
CREATE TRIGGER trigger_update_solicitacoes_descarga
    BEFORE UPDATE ON solicitacoes_descarga
    FOR EACH ROW
    EXECUTE FUNCTION update_solicitacoes_descarga_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════

-- Verificar se as tabelas foram criadas
SELECT 'Tabelas criadas:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'solicitacoes_descarga%';

-- Verificar permissões criadas
SELECT 'Permissões de descarga:' as info;
SELECT id, nome, descricao, modulo FROM permissoes WHERE modulo = 'Descargas';

-- Verificar papéis com permissões de descarga
SELECT 'Papéis com acesso a descargas:' as info;
SELECT p.nome as papel, perm.nome as permissao
FROM papeis p
JOIN papeis_permissoes pp ON p.id = pp.papel_id
JOIN permissoes perm ON pp.permissao_id = perm.id
WHERE perm.modulo = 'Descargas';
