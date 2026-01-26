-- ============================================================
-- MIGRATION: Reestruturação de Veículos e Funções de Visitantes
-- Banco: PostgreSQL
-- Data: 2026-01-15
-- ============================================================

-- PASSO 1: Criar as novas tabelas de apoio
-- ============================================================

-- Tabela de Funções de Visitantes
CREATE TABLE IF NOT EXISTS funcao_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir funções padrão
INSERT INTO funcao_visitante (nome) VALUES 
    ('Motorista'),
    ('Ajudante'),
    ('Auxiliar de Entrega')
ON CONFLICT (nome) DO NOTHING;

-- Tabela de Cores de Veículos
CREATE TABLE IF NOT EXISTS cor_veiculo_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir cores padrão
INSERT INTO cor_veiculo_visitante (nome) VALUES 
    ('PRETO'),
    ('BRANCO'),
    ('PRATA'),
    ('CINZA'),
    ('VERMELHO'),
    ('AZUL'),
    ('VERDE'),
    ('AMARELO'),
    ('LARANJA')
ON CONFLICT (nome) DO NOTHING;

-- Tabela de Tipos de Veículos
CREATE TABLE IF NOT EXISTS tipo_veiculo_visitante (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir tipos padrão
INSERT INTO tipo_veiculo_visitante (nome) VALUES 
    ('Caminhão Baú'),
    ('Caminhão Truck'),
    ('Carreta'),
    ('Van'),
    ('Furgão'),
    ('Caminhonete'),
    ('Carro de Passeio')
ON CONFLICT (nome) DO NOTHING;

-- PASSO 2: Criar tabela de Veículos de Visitantes
-- ============================================================

CREATE TABLE IF NOT EXISTS veiculo_visitante (
    id SERIAL PRIMARY KEY,
    visitante_id INTEGER REFERENCES cadastro_visitante(id) ON DELETE CASCADE,
    placa_veiculo VARCHAR(7),
    cor_veiculo_visitante_id INTEGER REFERENCES cor_veiculo_visitante(id) ON DELETE SET NULL,
    tipo_veiculo_visitante_id INTEGER REFERENCES tipo_veiculo_visitante(id) ON DELETE SET NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_veiculo_visitante_visitante_id ON veiculo_visitante(visitante_id);
CREATE INDEX IF NOT EXISTS idx_veiculo_visitante_placa ON veiculo_visitante(placa_veiculo);

-- PASSO 3: Adicionar novas colunas na tabela cadastro_visitante
-- ============================================================

-- Adicionar coluna de função do visitante
ALTER TABLE cadastro_visitante 
ADD COLUMN IF NOT EXISTS funcao_visitante_id INTEGER REFERENCES funcao_visitante(id) ON DELETE SET NULL;

-- Adicionar coluna de veículo do visitante
ALTER TABLE cadastro_visitante 
ADD COLUMN IF NOT EXISTS veiculo_visitante_id INTEGER REFERENCES veiculo_visitante(id) ON DELETE SET NULL;

-- PASSO 4: Migrar dados existentes (placa_veiculo e cor_veiculo)
-- ============================================================

-- Migrar dados de veículos existentes
DO $$
DECLARE
    visitante RECORD;
    cor_id INTEGER;
    veiculo_id INTEGER;
BEGIN
    -- Loop por todos os visitantes que têm placa_veiculo preenchida
    FOR visitante IN 
        SELECT id, placa_veiculo, cor_veiculo 
        FROM cadastro_visitante 
        WHERE placa_veiculo IS NOT NULL AND placa_veiculo != ''
    LOOP
        -- Busca o ID da cor se existir
        cor_id := NULL;
        IF visitante.cor_veiculo IS NOT NULL AND visitante.cor_veiculo != '' THEN
            SELECT id INTO cor_id FROM cor_veiculo_visitante WHERE nome = visitante.cor_veiculo;
        END IF;
        
        -- Cria o registro de veículo
        INSERT INTO veiculo_visitante (visitante_id, placa_veiculo, cor_veiculo_visitante_id)
        VALUES (visitante.id, visitante.placa_veiculo, cor_id)
        RETURNING id INTO veiculo_id;
        
        -- Atualiza o cadastro_visitante com o ID do veículo
        UPDATE cadastro_visitante 
        SET veiculo_visitante_id = veiculo_id 
        WHERE id = visitante.id;
    END LOOP;
END $$;

-- PASSO 5: Adicionar novas colunas nas tabelas de visita e histórico
-- ============================================================

-- Tabela visitante (visitas em tempo real)
ALTER TABLE visitante
ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(100);

ALTER TABLE visitante
ADD COLUMN IF NOT EXISTS funcao VARCHAR(100);

-- Tabela historico_visitante
ALTER TABLE historico_visitante
ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(100);

ALTER TABLE historico_visitante
ADD COLUMN IF NOT EXISTS funcao VARCHAR(100);

-- PASSO 6 (OPCIONAL): Remover colunas antigas após validar migração
-- ============================================================
-- ⚠️ ATENÇÃO: Execute este passo SOMENTE após validar que a migração funcionou corretamente
-- e que o sistema está funcionando com as novas tabelas.
--
-- DESCOMENTE as linhas abaixo quando tiver certeza:
--
-- ALTER TABLE cadastro_visitante DROP COLUMN IF EXISTS placa_veiculo;
-- ALTER TABLE cadastro_visitante DROP COLUMN IF EXISTS cor_veiculo;

-- ============================================================
-- VERIFICAÇÃO: Queries para validar a migração
-- ============================================================

-- Verificar se as tabelas foram criadas corretamente
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('funcao_visitante', 'cor_veiculo_visitante', 'tipo_veiculo_visitante', 'veiculo_visitante');

-- Verificar dados nas tabelas de apoio
-- SELECT * FROM funcao_visitante;
-- SELECT * FROM cor_veiculo_visitante;
-- SELECT * FROM tipo_veiculo_visitante;

-- Verificar veículos migrados
-- SELECT cv.nome, cv.cpf, vv.placa_veiculo, cvv.nome as cor
-- FROM cadastro_visitante cv
-- LEFT JOIN veiculo_visitante vv ON cv.veiculo_visitante_id = vv.id
-- LEFT JOIN cor_veiculo_visitante cvv ON vv.cor_veiculo_visitante_id = cvv.id
-- WHERE vv.id IS NOT NULL;

-- Contar quantos veículos foram migrados
-- SELECT COUNT(*) as veiculos_migrados FROM veiculo_visitante;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
