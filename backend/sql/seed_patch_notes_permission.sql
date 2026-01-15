-- ═══════════════════════════════════════════════════════════════
-- PERMISSÃO PARA GERENCIAMENTO DE PATCH NOTES
-- Executa este script para adicionar a nova permissão
-- ═══════════════════════════════════════════════════════════════

-- 1. Inserir a permissão de gerenciamento de patch notes
INSERT INTO permissoes (chave, nome, descricao, ativo, criado_em)
VALUES (
  'patch_notes_gerenciar',
  'Gerenciar Patch Notes',
  'Permite criar, editar e excluir atualizações do sistema (patch notes) na página Home',
  true,
  NOW()
)
ON CONFLICT (chave) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = true;

-- 2. Verificar se a permissão foi criada
SELECT id, chave, nome, descricao FROM permissoes WHERE chave = 'patch_notes_gerenciar';

-- ═══════════════════════════════════════════════════════════════
-- PARA ATRIBUIR A PERMISSÃO A UM PAPEL ESPECÍFICO (exemplo)
-- Descomente e ajuste o nome do papel conforme necessário
-- ═══════════════════════════════════════════════════════════════

-- Exemplo: Atribuir ao papel ADMIN
/*
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'ADMIN' AND perm.chave = 'patch_notes_gerenciar'
ON CONFLICT DO NOTHING;
*/

-- Exemplo: Atribuir ao papel SUPORTE
/*
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM papeis p, permissoes perm
WHERE p.nome = 'SUPORTE' AND perm.chave = 'patch_notes_gerenciar'
ON CONFLICT DO NOTHING;
*/

-- ═══════════════════════════════════════════════════════════════
-- COLUNAS PARA RECUPERAÇÃO DE SENHA (caso ainda não existam)
-- ═══════════════════════════════════════════════════════════════

-- Adiciona coluna reset_token se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'reset_token'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN reset_token VARCHAR(255);
  END IF;
END $$;

-- Adiciona coluna reset_token_expira se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'reset_token_expira'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN reset_token_expira TIMESTAMP;
  END IF;
END $$;

-- Criar índice para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_usuarios_reset_token ON usuarios(reset_token);

-- ═══════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════

-- Verifica se as colunas existem
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name IN ('reset_token', 'reset_token_expira');

COMMIT;
