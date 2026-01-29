# 🔐 Guia: Criar Nova Função com RBAC

> **Última atualização:** Janeiro 2026

Este guia explica como criar uma nova funcionalidade no backend seguindo o padrão RBAC (Role-Based Access Control) do sistema.

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Passo 1: Criar a Permissão](#2-passo-1-criar-a-permissão)
3. [Passo 2: Atribuir ao Papel](#3-passo-2-atribuir-ao-papel)
4. [Passo 3: Criar o Controller](#4-passo-3-criar-o-controller)
5. [Passo 4: Criar as Rotas](#5-passo-4-criar-as-rotas)
6. [Passo 5: Registrar no Index](#6-passo-5-registrar-no-index)
7. [Exemplo Completo](#7-exemplo-completo)
8. [Boas Práticas](#8-boas-práticas)

---

## 1. Visão Geral

### Fluxo de Criação

```
1. Criar Permissão (SQL)
        │
        ▼
2. Atribuir a Papel (SQL)
        │
        ▼
3. Criar Controller (src/controllers/)
        │
        ▼
4. Criar Rotas (src/routes/)
        │
        ▼
5. Registrar no Index (src/routes/index.js)
        │
        ▼
✅ Funcionalidade pronta!
```

### Convenções de Nomenclatura

| Tipo              | Formato               | Exemplo                  |
| ----------------- | --------------------- | ------------------------ |
| Permissão (chave) | `modulo_acao`         | `relatorio_visualizar`   |
| Controller        | `ModuloController.js` | `RelatorioController.js` |
| Rotas             | `modulo.routes.js`    | `relatorios.routes.js`   |
| Endpoint          | `/modulo`             | `/relatorios`            |

---

## 2. Passo 1: Criar a Permissão

### 2.1 Via SQL (Recomendado para Produção)

Crie um arquivo em `backend/sql/`:

```sql
-- sql/seed_relatorios_permissoes.sql

-- Inserir permissões do módulo Relatórios
INSERT INTO permissoes (chave, descricao)
VALUES
  ('relatorio_visualizar', 'Visualizar relatórios'),
  ('relatorio_exportar', 'Exportar relatórios em PDF/Excel'),
  ('relatorio_criar', 'Criar novos tipos de relatório')
ON CONFLICT (chave) DO NOTHING;
```

### 2.2 Execute no Banco

```bash
# Desenvolvimento
psql -h 34.225.38.222 -p 5432 -U neondb_owner -d neondb -f backend/sql/seed_relatorios_permissoes.sql

# Produção
psql -h 34.225.38.222 -p 5786 -U neondb_owner_prod -d neondb_prod -f backend/sql/seed_relatorios_permissoes.sql
```

---

## 3. Passo 2: Atribuir ao Papel

### 3.1 Atribuir Permissões aos Papéis

```sql
-- sql/seed_relatorios_permissoes.sql (continuação)

-- Atribuir permissões ao papel ADMIN (todas)
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT
  (SELECT id FROM papeis WHERE nome = 'ADMIN'),
  id
FROM permissoes
WHERE chave IN ('relatorio_visualizar', 'relatorio_exportar', 'relatorio_criar')
ON CONFLICT DO NOTHING;

-- Atribuir apenas visualização ao SUPERVISOR
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT
  (SELECT id FROM papeis WHERE nome = 'SUPERVISOR'),
  id
FROM permissoes
WHERE chave = 'relatorio_visualizar'
ON CONFLICT DO NOTHING;
```

---

## 4. Passo 3: Criar o Controller

Crie o arquivo `src/controllers/RelatorioController.js`:

```javascript
/**
 * RelatorioController
 * Gerencia funcionalidades de relatórios
 */

const connection = require("../database/connection");

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR RELATÓRIOS
  // GET /relatorios
  // ═══════════════════════════════════════════════════════════════
  async index(req, res) {
    try {
      const { tipo, data_inicio, data_fim } = req.query;

      let query = connection("relatorios").select("*");

      if (tipo) {
        query = query.where("tipo", tipo);
      }

      if (data_inicio && data_fim) {
        query = query.whereBetween("data_criacao", [data_inicio, data_fim]);
      }

      const relatorios = await query.orderBy("data_criacao", "desc");

      return res.json(relatorios);
    } catch (error) {
      console.error("❌ Erro ao listar relatórios:", error);
      return res.status(500).json({
        error: "Erro ao listar relatórios",
        code: "LIST_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR RELATÓRIO POR ID
  // GET /relatorios/:id
  // ═══════════════════════════════════════════════════════════════
  async show(req, res) {
    const { id } = req.params;

    try {
      const relatorio = await connection("relatorios").where("id", id).first();

      if (!relatorio) {
        return res.status(404).json({
          error: "Relatório não encontrado",
          code: "NOT_FOUND",
        });
      }

      return res.json(relatorio);
    } catch (error) {
      console.error("❌ Erro ao buscar relatório:", error);
      return res.status(500).json({ error: "Erro ao buscar relatório" });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIAR RELATÓRIO
  // POST /relatorios
  // ═══════════════════════════════════════════════════════════════
  async create(req, res) {
    const { titulo, tipo, descricao, configuracoes } = req.body;

    try {
      const [relatorio] = await connection("relatorios")
        .insert({
          titulo,
          tipo,
          descricao,
          configuracoes: JSON.stringify(configuracoes),
          criado_por: req.userId, // ID do usuário logado
          data_criacao: new Date(),
        })
        .returning("*");

      return res.status(201).json(relatorio);
    } catch (error) {
      console.error("❌ Erro ao criar relatório:", error);
      return res.status(500).json({ error: "Erro ao criar relatório" });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // EXPORTAR RELATÓRIO
  // GET /relatorios/:id/exportar
  // ═══════════════════════════════════════════════════════════════
  async exportar(req, res) {
    const { id } = req.params;
    const { formato } = req.query; // 'pdf' ou 'excel'

    try {
      const relatorio = await connection("relatorios").where("id", id).first();

      if (!relatorio) {
        return res.status(404).json({ error: "Relatório não encontrado" });
      }

      // Lógica de exportação aqui...
      // Exemplo: gerar PDF ou Excel

      return res.json({
        message: "Exportação iniciada",
        formato,
        relatorio_id: id,
      });
    } catch (error) {
      console.error("❌ Erro ao exportar relatório:", error);
      return res.status(500).json({ error: "Erro ao exportar relatório" });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR RELATÓRIO
  // DELETE /relatorios/:id
  // ═══════════════════════════════════════════════════════════════
  async delete(req, res) {
    const { id } = req.params;

    try {
      const deleted = await connection("relatorios").where("id", id).del();

      if (!deleted) {
        return res.status(404).json({ error: "Relatório não encontrado" });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar relatório:", error);
      return res.status(500).json({ error: "Erro ao deletar relatório" });
    }
  },
};
```

---

## 5. Passo 4: Criar as Rotas

Crie o arquivo `src/routes/relatorios.routes.js`:

```javascript
/**
 * Rotas de Relatórios
 * /relatorios/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const RelatorioController = require("../controllers/RelatorioController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LISTAR RELATÓRIOS
// GET /relatorios
// Permissão: relatorio_visualizar
// ═══════════════════════════════════════════════════════════════
router.get(
  "/",
  authMiddleware,
  requerPermissao("relatorio_visualizar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      tipo: Joi.string().optional(),
      data_inicio: Joi.string().isoDate().optional(),
      data_fim: Joi.string().isoDate().optional(),
    }),
  }),
  RelatorioController.index,
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR RELATÓRIO POR ID
// GET /relatorios/:id
// Permissão: relatorio_visualizar
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:id",
  authMiddleware,
  requerPermissao("relatorio_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  RelatorioController.show,
);

// ═══════════════════════════════════════════════════════════════
// CRIAR RELATÓRIO
// POST /relatorios
// Permissão: relatorio_criar
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  requerPermissao("relatorio_criar"),
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      titulo: Joi.string().required().min(3).max(200),
      tipo: Joi.string()
        .required()
        .valid("visitantes", "funcionarios", "acessos"),
      descricao: Joi.string().allow("", null).optional(),
      configuracoes: Joi.object().optional(),
    }),
  }),
  RelatorioController.create,
);

// ═══════════════════════════════════════════════════════════════
// EXPORTAR RELATÓRIO
// GET /relatorios/:id/exportar
// Permissão: relatorio_exportar
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:id/exportar",
  authMiddleware,
  requerPermissao("relatorio_exportar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.QUERY]: Joi.object().keys({
      formato: Joi.string().valid("pdf", "excel").default("pdf"),
    }),
  }),
  RelatorioController.exportar,
);

// ═══════════════════════════════════════════════════════════════
// DELETAR RELATÓRIO
// DELETE /relatorios/:id
// Permissão: relatorio_criar (quem cria pode deletar)
// ═══════════════════════════════════════════════════════════════
router.delete(
  "/:id",
  authMiddleware,
  requerPermissao("relatorio_criar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  RelatorioController.delete,
);

module.exports = router;
```

---

## 6. Passo 5: Registrar no Index

Edite `src/routes/index.js`:

```javascript
// Importar nova rota
const relatoriosRoutes = require("./relatorios.routes");

// ... outras importações ...

// Registrar a rota
router.use("/relatorios", relatoriosRoutes);

// ... resto do código ...
```

---

## 7. Exemplo Completo

### 7.1 Estrutura Final

```
backend/
├── sql/
│   └── seed_relatorios_permissoes.sql   # Permissões
├── src/
│   ├── controllers/
│   │   └── RelatorioController.js       # Lógica
│   └── routes/
│       ├── relatorios.routes.js         # Rotas
│       └── index.js                     # Registro
```

### 7.2 SQL Completo

```sql
-- sql/seed_relatorios_permissoes.sql

-- ═══════════════════════════════════════════════════════════════
-- PERMISSÕES DO MÓDULO RELATÓRIOS
-- ═══════════════════════════════════════════════════════════════

-- Criar permissões
INSERT INTO permissoes (chave, descricao)
VALUES
  ('relatorio_visualizar', 'Visualizar relatórios'),
  ('relatorio_exportar', 'Exportar relatórios em PDF/Excel'),
  ('relatorio_criar', 'Criar e deletar relatórios')
ON CONFLICT (chave) DO NOTHING;

-- Atribuir ao ADMIN (todas)
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT
  (SELECT id FROM papeis WHERE nome = 'ADMIN'),
  id
FROM permissoes
WHERE chave LIKE 'relatorio_%'
ON CONFLICT DO NOTHING;

-- Atribuir ao SUPERVISOR (visualizar + exportar)
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT
  (SELECT id FROM papeis WHERE nome = 'SUPERVISOR'),
  id
FROM permissoes
WHERE chave IN ('relatorio_visualizar', 'relatorio_exportar')
ON CONFLICT DO NOTHING;

-- Atribuir ao PORTEIRO (apenas visualizar)
INSERT INTO papeis_permissoes (papel_id, permissao_id)
SELECT
  (SELECT id FROM papeis WHERE nome = 'PORTEIRO'),
  id
FROM permissoes
WHERE chave = 'relatorio_visualizar'
ON CONFLICT DO NOTHING;
```

### 7.3 Endpoints Criados

| Método | Endpoint                   | Permissão              | Descrição     |
| ------ | -------------------------- | ---------------------- | ------------- |
| GET    | `/relatorios`              | `relatorio_visualizar` | Listar todos  |
| GET    | `/relatorios/:id`          | `relatorio_visualizar` | Buscar por ID |
| POST   | `/relatorios`              | `relatorio_criar`      | Criar novo    |
| GET    | `/relatorios/:id/exportar` | `relatorio_exportar`   | Exportar      |
| DELETE | `/relatorios/:id`          | `relatorio_criar`      | Deletar       |

---

## 8. Boas Práticas

### 8.1 Nomenclatura de Permissões

```
✅ Bom:
- usuario_visualizar
- usuario_criar
- usuario_editar
- usuario_deletar

❌ Ruim:
- ver_usuario
- criarUsuario
- EDITAR_USER
```

### 8.2 Granularidade de Permissões

```
✅ Específico (recomendado):
- relatorio_visualizar
- relatorio_exportar
- relatorio_criar

❌ Genérico (evitar):
- relatorio_acesso_total
- admin_relatorios
```

### 8.3 Validação com Celebrate

```javascript
// Sempre valide entrada de dados
celebrate({
  [Segments.BODY]: Joi.object().keys({
    email: Joi.string().email().required(),
    idade: Joi.number().integer().min(0).max(150),
    tipo: Joi.string().valid("A", "B", "C"),
  }),
});
```

### 8.4 Tratamento de Erros

```javascript
// Sempre use try/catch e retorne erros padronizados
try {
  // código...
} catch (error) {
  console.error("❌ Erro ao fazer X:", error);
  return res.status(500).json({
    error: "Mensagem amigável",
    code: "CODIGO_ERRO",
  });
}
```

### 8.5 Verificar Múltiplas Permissões

```javascript
// Precisa de ALGUMA permissão (default)
requerPermissao(["permissao_a", "permissao_b"]);

// Precisa de TODAS as permissões
requerPermissao(["permissao_a", "permissao_b"], { todas: true });
```

---

## 📋 Checklist

- [ ] Permissões criadas no banco (`permissoes`)
- [ ] Permissões atribuídas aos papéis (`papeis_permissoes`)
- [ ] Controller criado em `src/controllers/`
- [ ] Rotas criadas em `src/routes/`
- [ ] Rotas registradas em `src/routes/index.js`
- [ ] Validação com Celebrate nas rotas
- [ ] `authMiddleware` em rotas protegidas
- [ ] `requerPermissao` com permissão correta
- [ ] Tratamento de erros no controller
- [ ] Testado localmente
- [ ] SQL commitado para rodar em produção

---

## 📚 Documentos Relacionados

- [BACKEND_ARQUITETURA.md](BACKEND_ARQUITETURA.md) - Arquitetura completa
- [COMO_FUNCIONA_AMBIENTES.md](COMO_FUNCIONA_AMBIENTES.md) - Configuração de ambientes
- [DEPLOY_PRODUCAO_GUIA.md](DEPLOY_PRODUCAO_GUIA.md) - Deploy em produção
