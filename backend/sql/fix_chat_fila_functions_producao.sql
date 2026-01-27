-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Criar funções e trigger faltantes para chat_fila em PRODUÇÃO
-- ═══════════════════════════════════════════════════════════════════════════
-- Este script adiciona as funções e triggers que estão faltando no banco
-- de produção e que causam erro 500 ao solicitar atendente no chat.
--
-- ERRO: "function proxima_posicao_fila() does not exist"
-- 
-- Execute com:
-- psql -h 34.225.38.222 -p 5786 -U neondb_owner_prod -d neondb_prod -f fix_chat_fila_functions_producao.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Atualizar posições na fila quando uma conversa é removida
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atualizar_posicoes_fila()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando uma conversa é removida da fila, atualizar posições das seguintes
    UPDATE chat_fila 
    SET posicao = posicao - 1 
    WHERE posicao > OLD.posicao;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION atualizar_posicoes_fila() IS 
'Atualiza automaticamente as posições na fila quando uma conversa é removida';

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Atualizar posições na fila após DELETE
-- ═══════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_atualizar_posicoes_fila ON chat_fila;

CREATE TRIGGER trg_atualizar_posicoes_fila
    AFTER DELETE ON chat_fila
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_posicoes_fila();

COMMENT ON TRIGGER trg_atualizar_posicoes_fila ON chat_fila IS 
'Trigger que dispara atualizar_posicoes_fila() após cada DELETE em chat_fila';

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Calcular próxima posição na fila
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION proxima_posicao_fila()
RETURNS INTEGER AS $$
DECLARE
    ultima_posicao INTEGER;
BEGIN
    SELECT COALESCE(MAX(posicao), 0) INTO ultima_posicao FROM chat_fila;
    RETURN ultima_posicao + 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION proxima_posicao_fila() IS 
'Retorna a próxima posição disponível na fila (MAX + 1)';

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO: Confirmar que as funções foram criadas
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN ('atualizar_posicoes_fila', 'proxima_posicao_fila');
    
    IF func_count = 2 THEN
        RAISE NOTICE 'Sucesso: Funcoes atualizar_posicoes_fila() e proxima_posicao_fila() criadas';
    ELSE
        RAISE EXCEPTION 'Erro: Funcoes nao foram criadas corretamente (encontradas: %)', func_count;
    END IF;
    
    -- Verificar trigger
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_atualizar_posicoes_fila'
    ) THEN
        RAISE NOTICE 'Sucesso: Trigger trg_atualizar_posicoes_fila criado';
    ELSE
        RAISE EXCEPTION 'Erro: Trigger trg_atualizar_posicoes_fila nao foi criado';
    END IF;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- TESTES: Verificar se as funções estão funcionando
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'Teste: proxima_posicao_fila() retorna: ' || proxima_posicao_fila() AS teste_funcao;
