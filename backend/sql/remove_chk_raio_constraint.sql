-- Remove a constraint de limite de raio da tabela ronda_pontos_controle
-- Permite qualquer valor positivo para o raio

ALTER TABLE ronda_pontos_controle DROP CONSTRAINT IF EXISTS chk_raio;

-- Adiciona constraint apenas para garantir valor positivo
ALTER TABLE ronda_pontos_controle ADD CONSTRAINT chk_raio CHECK (raio > 0);
