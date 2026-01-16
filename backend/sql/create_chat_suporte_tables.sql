-- ═══════════════════════════════════════════════════════════════════════════
-- SISTEMA DE CHAT DE SUPORTE - CRIAÇÃO DAS TABELAS
-- ═══════════════════════════════════════════════════════════════════════════
-- Este script cria as tabelas necessárias para o sistema de chat de suporte
-- com atendimento híbrido (IA + humano)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: chat_conversas
-- Armazena as conversas do chat de suporte
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_conversas (
    id SERIAL PRIMARY KEY,
    
    -- Identificação do usuário (pode ser logado ou visitante)
    usuario_id VARCHAR(255) NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    nome_visitante VARCHAR(255) NOT NULL,
    email_visitante VARCHAR(255) NOT NULL,
    
    -- Atendente responsável (quando em atendimento humano)
    atendente_id VARCHAR(255) NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    
    -- Status da conversa
    -- BOT: Sendo atendida pela IA
    -- AGUARDANDO_ATENDENTE: Na fila aguardando atendente humano
    -- EM_ATENDIMENTO: Sendo atendida por um humano
    -- FINALIZADA: Conversa encerrada
    status VARCHAR(30) NOT NULL DEFAULT 'BOT' 
        CHECK (status IN ('BOT', 'AGUARDANDO_ATENDENTE', 'EM_ATENDIMENTO', 'FINALIZADA')),
    
    -- Assunto/Título da conversa (opcional)
    assunto VARCHAR(255) NULL,
    
    -- Timestamps
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    iniciado_em TIMESTAMPTZ NULL, -- Quando o atendente humano iniciou o atendimento
    finalizado_em TIMESTAMPTZ NULL,
    
    -- Metadados
    ip_visitante VARCHAR(45) NULL,
    user_agent TEXT NULL
);

-- Índices para chat_conversas
CREATE INDEX IF NOT EXISTS idx_chat_conversas_usuario_id ON chat_conversas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_atendente_id ON chat_conversas(atendente_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_status ON chat_conversas(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_criado_em ON chat_conversas(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_email ON chat_conversas(email_visitante);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: chat_mensagens
-- Armazena as mensagens de cada conversa
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_mensagens (
    id SERIAL PRIMARY KEY,
    
    -- Referência à conversa
    conversa_id INTEGER NOT NULL REFERENCES chat_conversas(id) ON DELETE CASCADE,
    
    -- Origem da mensagem
    -- USUARIO: Mensagem enviada pelo usuário/visitante
    -- BOT: Mensagem da IA
    -- ATENDENTE: Mensagem do atendente humano
    -- SISTEMA: Mensagens automáticas do sistema (ex: "Aguardando atendente...")
    origem VARCHAR(20) NOT NULL 
        CHECK (origem IN ('USUARIO', 'BOT', 'ATENDENTE', 'SISTEMA')),
    
    -- Conteúdo da mensagem
    mensagem TEXT NOT NULL,
    
    -- ID do remetente (se aplicável)
    remetente_id VARCHAR(255) NULL,
    remetente_nome VARCHAR(255) NULL,
    
    -- Metadados para IA
    ia_contexto JSONB NULL, -- Contexto usado pela IA para responder
    ia_confianca DECIMAL(3,2) NULL, -- Nível de confiança da resposta (0.00 a 1.00)
    
    -- Timestamps
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Flag para mensagens lidas
    lida BOOLEAN DEFAULT FALSE
);

-- Índices para chat_mensagens
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_conversa_id ON chat_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_origem ON chat_mensagens(origem);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_criado_em ON chat_mensagens(criado_em);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_conversa_criado ON chat_mensagens(conversa_id, criado_em);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: chat_fila
-- Fila FIFO de conversas aguardando atendimento humano
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_fila (
    id SERIAL PRIMARY KEY,
    
    -- Referência à conversa
    conversa_id INTEGER NOT NULL UNIQUE REFERENCES chat_conversas(id) ON DELETE CASCADE,
    
    -- Posição na fila (calculada dinamicamente, mas armazenada para referência rápida)
    posicao INTEGER NOT NULL,
    
    -- Prioridade (para futuras implementações)
    -- 1 = Normal, 2 = Alta, 3 = Urgente
    prioridade INTEGER DEFAULT 1 CHECK (prioridade BETWEEN 1 AND 3),
    
    -- Timestamps
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para chat_fila
CREATE INDEX IF NOT EXISTS idx_chat_fila_conversa_id ON chat_fila(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_fila_posicao ON chat_fila(posicao);
CREATE INDEX IF NOT EXISTS idx_chat_fila_prioridade_posicao ON chat_fila(prioridade DESC, posicao ASC);
CREATE INDEX IF NOT EXISTS idx_chat_fila_criado_em ON chat_fila(criado_em);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: chat_auditoria
-- Log de auditoria de todas as ações do sistema de chat
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_auditoria (
    id SERIAL PRIMARY KEY,
    
    -- Referência à conversa
    conversa_id INTEGER NOT NULL REFERENCES chat_conversas(id) ON DELETE CASCADE,
    
    -- Quem executou a ação (pode ser null para ações do sistema)
    usuario_id VARCHAR(255) NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nome VARCHAR(255) NULL,
    usuario_tipo VARCHAR(20) NULL, -- 'VISITANTE', 'USUARIO', 'ATENDENTE', 'SISTEMA'
    
    -- Ação executada
    acao VARCHAR(50) NOT NULL CHECK (acao IN (
        'CONVERSA_CRIADA',
        'MENSAGEM_ENVIADA',
        'MENSAGEM_BOT_ENVIADA',
        'USUARIO_SOLICITOU_ATENDENTE',
        'CONVERSA_ENTROU_FILA',
        'ATENDENTE_ACEITOU',
        'ATENDENTE_TRANSFERIU',
        'CONVERSA_FINALIZADA',
        'CONVERSA_REABERTA',
        'AVALIACAO_ENVIADA'
    )),
    
    -- Detalhes adicionais em JSON
    detalhes JSONB NULL,
    
    -- IP e informações da sessão
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    -- Timestamp
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para chat_auditoria
CREATE INDEX IF NOT EXISTS idx_chat_auditoria_conversa_id ON chat_auditoria(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_auditoria_usuario_id ON chat_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chat_auditoria_acao ON chat_auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_chat_auditoria_criado_em ON chat_auditoria(criado_em DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: chat_faq (Base de conhecimento para a IA)
-- Perguntas frequentes para treinamento/consulta da IA
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_faq (
    id SERIAL PRIMARY KEY,
    
    -- Pergunta e variações
    pergunta TEXT NOT NULL,
    palavras_chave TEXT[] NULL, -- Array de palavras-chave para matching
    
    -- Resposta
    resposta TEXT NOT NULL,
    
    -- Categoria
    categoria VARCHAR(100) NULL,
    
    -- Status
    ativo BOOLEAN DEFAULT TRUE,
    
    -- Estatísticas
    vezes_utilizado INTEGER DEFAULT 0,
    
    -- Timestamps
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para chat_faq
CREATE INDEX IF NOT EXISTS idx_chat_faq_categoria ON chat_faq(categoria);
CREATE INDEX IF NOT EXISTS idx_chat_faq_ativo ON chat_faq(ativo);
CREATE INDEX IF NOT EXISTS idx_chat_faq_palavras_chave ON chat_faq USING GIN(palavras_chave);

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELA: chat_avaliacoes
-- Avaliações do atendimento pelos usuários
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_avaliacoes (
    id SERIAL PRIMARY KEY,
    
    -- Referência à conversa
    conversa_id INTEGER NOT NULL UNIQUE REFERENCES chat_conversas(id) ON DELETE CASCADE,
    
    -- Avaliação (1 a 5 estrelas)
    nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
    
    -- Comentário opcional
    comentario TEXT NULL,
    
    -- Timestamp
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índice para chat_avaliacoes
CREATE INDEX IF NOT EXISTS idx_chat_avaliacoes_conversa_id ON chat_avaliacoes(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_avaliacoes_nota ON chat_avaliacoes(nota);

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

-- Trigger para atualizar posições
DROP TRIGGER IF EXISTS trg_atualizar_posicoes_fila ON chat_fila;
CREATE TRIGGER trg_atualizar_posicoes_fila
    AFTER DELETE ON chat_fila
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_posicoes_fila();

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

-- ═══════════════════════════════════════════════════════════════════════════
-- INSERIR FAQs INICIAIS (Base de conhecimento)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO chat_faq (pergunta, palavras_chave, resposta, categoria) VALUES
(
    'Como faço para cadastrar um visitante?',
    ARRAY['cadastrar', 'visitante', 'cadastro', 'registrar', 'novo visitante'],
    'Para cadastrar um novo visitante, acesse o menu lateral e clique em "Cadastrar Visitante". Preencha os dados obrigatórios como nome, documento, empresa de origem e setor de destino. Após preencher, clique em "Salvar".',
    'Cadastro'
),
(
    'Como registro a entrada de um visitante?',
    ARRAY['entrada', 'registrar entrada', 'chegou', 'receber visitante', 'check-in'],
    'Para registrar a entrada de um visitante já cadastrado, acesse "Visitantes Cadastrados", localize o visitante desejado e clique em "Registrar Entrada". O sistema irá registrar o horário automaticamente.',
    'Visitas'
),
(
    'Como registro a saída de um visitante?',
    ARRAY['saída', 'saida', 'registrar saída', 'foi embora', 'check-out'],
    'Para registrar a saída, acesse "Visitas do Dia", encontre o visitante que está no local e clique em "Registrar Saída". O horário será registrado automaticamente.',
    'Visitas'
),
(
    'Como faço para criar um agendamento?',
    ARRAY['agendamento', 'agendar', 'agenda', 'marcar visita', 'programar'],
    'Para criar um agendamento, acesse o menu "Agendamentos" e clique em "Novo Agendamento". Selecione ou cadastre o visitante, informe a data e hora prevista, o motivo da visita e o responsável. Clique em "Salvar" para confirmar.',
    'Agendamentos'
),
(
    'Como visualizo o histórico de visitas?',
    ARRAY['histórico', 'historico', 'visitas anteriores', 'consultar', 'passado'],
    'Para ver o histórico de visitas, acesse o menu "Histórico" no painel lateral. Você pode filtrar por período, visitante ou empresa. O sistema mostrará todas as visitas registradas com data, hora de entrada e saída.',
    'Histórico'
),
(
    'Esqueci minha senha, o que faço?',
    ARRAY['senha', 'esqueci', 'recuperar', 'redefinir', 'não lembro'],
    'Para recuperar sua senha, clique em "Esqueci minha senha" na tela de login. Informe seu e-mail cadastrado e você receberá um link para criar uma nova senha. Se não receber o e-mail, verifique a pasta de spam.',
    'Acesso'
),
(
    'Como altero meus dados de usuário?',
    ARRAY['alterar', 'dados', 'perfil', 'editar', 'atualizar cadastro'],
    'Para alterar seus dados, clique no seu nome no canto superior direito e selecione "Perfil". Lá você pode atualizar suas informações pessoais e de contato. Lembre-se de salvar as alterações.',
    'Conta'
),
(
    'Preciso falar com um atendente',
    ARRAY['atendente', 'humano', 'pessoa', 'suporte', 'ajuda humana', 'falar com alguém'],
    'Entendi que você precisa falar com um atendente humano. Vou transferir você para nossa equipe de suporte. Por favor, aguarde um momento enquanto um atendente fica disponível.',
    'Suporte'
),
(
    'O sistema está lento, o que fazer?',
    ARRAY['lento', 'devagar', 'travando', 'demora', 'carregando'],
    'Se o sistema está lento, tente as seguintes soluções: 1) Atualize a página (F5); 2) Limpe o cache do navegador; 3) Verifique sua conexão com a internet; 4) Tente usar outro navegador. Se o problema persistir, entre em contato com o suporte.',
    'Problemas'
),
(
    'Como gero um relatório?',
    ARRAY['relatório', 'relatorio', 'exportar', 'pdf', 'excel', 'imprimir'],
    'Para gerar relatórios, acesse a seção desejada (Visitas, Histórico, etc.) e procure pelo botão "Exportar" ou "Gerar Relatório". Você pode escolher o formato (PDF ou Excel) e o período desejado.',
    'Relatórios'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS NAS TABELAS
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON TABLE chat_conversas IS 'Armazena as conversas do sistema de chat de suporte';
COMMENT ON TABLE chat_mensagens IS 'Armazena as mensagens de cada conversa';
COMMENT ON TABLE chat_fila IS 'Fila FIFO de conversas aguardando atendimento humano';
COMMENT ON TABLE chat_auditoria IS 'Log de auditoria de todas as ações do chat';
COMMENT ON TABLE chat_faq IS 'Base de conhecimento para respostas automáticas da IA';
COMMENT ON TABLE chat_avaliacoes IS 'Avaliações do atendimento pelos usuários';

COMMENT ON COLUMN chat_conversas.status IS 'BOT=IA, AGUARDANDO_ATENDENTE=Na fila, EM_ATENDIMENTO=Com humano, FINALIZADA=Encerrada';
COMMENT ON COLUMN chat_mensagens.origem IS 'USUARIO=Visitante/Cliente, BOT=IA, ATENDENTE=Humano, SISTEMA=Automático';
COMMENT ON COLUMN chat_fila.prioridade IS '1=Normal, 2=Alta, 3=Urgente';
