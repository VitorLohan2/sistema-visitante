# Sistema de Atualização Automática (Auto-Update)

## Problema Resolvido

Quando uma nova versão do frontend é deployada em produção, usuários que já estavam logados ficavam em um **loop infinito** de carregamento. Isso acontecia porque:

1. O navegador mantinha em cache os arquivos JavaScript/CSS antigos
2. Os arquivos antigos tentavam carregar chunks que não existem mais
3. O sistema ficava em loop tentando carregar recursos inexistentes
4. O usuário precisava limpar manualmente o cache do navegador

## Solução Implementada

### 1. Arquivo de Versão (`public/version.json`)

```json
{
  "version": "2.0.0",
  "buildTime": "2026-01-30T21:02:24.550Z",
  "buildNumber": 1769806944550
}
```

Este arquivo é atualizado automaticamente a cada build com um timestamp único.

### 2. Serviço de Verificação de Versão (`versionService.js`)

O serviço:

- Verifica periodicamente (a cada 30 segundos) se há uma nova versão
- Compara o `buildTime` local com o do servidor
- Se detectar versão nova, limpa cache e força reload
- Implementa cooldown de 1 minuto entre reloads para evitar loops

### 3. Tratamento de Erros de Chunk (`index.js`)

Captura erros de carregamento de chunks (comum após updates):

- `Loading chunk failed`
- `ChunkLoadError`
- `Failed to fetch dynamically imported module`

### 4. Interceptor da API (`api.js`)

Detecta padrões de erro que podem indicar versão incompatível:

- Muitos erros consecutivos (3+)
- Erros 404 em arquivos chunk

## Como Funciona

```
┌─────────────────────────────────────────────────────────────┐
│                      USUÁRIO LOGADO                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               DEPLOY NOVA VERSÃO                           │
│         (version.json é atualizado com novo buildTime)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            VERIFICAÇÃO PERIÓDICA (30s)                     │
│    versionService compara buildTime local vs servidor       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │  VERSÃO IGUAL   │             │  VERSÃO NOVA    │
    │  Continua normal│             │  DETECTADA      │
    └─────────────────┘             └─────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────┐
                              │   LIMPA CACHE E RELOAD      │
                              │  - Service Workers          │
                              │  - Cache API                │
                              │  - SessionStorage           │
                              │  - Força reload sem cache   │
                              └─────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────┐
                              │   USUÁRIO CONTINUA USANDO   │
                              │   (com versão atualizada)   │
                              └─────────────────────────────┘
```

## Arquivos Modificados/Criados

| Arquivo                          | Tipo       | Descrição                             |
| -------------------------------- | ---------- | ------------------------------------- |
| `public/version.json`            | Novo       | Arquivo com versão atual              |
| `scripts/update-version.js`      | Novo       | Script para atualizar versão no build |
| `src/services/versionService.js` | Novo       | Serviço de verificação de versão      |
| `src/App.js`                     | Modificado | Integração com versionService         |
| `src/index.js`                   | Modificado | Tratamento de erros de chunk          |
| `src/services/api.js`            | Modificado | Detecção de erros de versão           |
| `package.json`                   | Modificado | Script prebuild adicionado            |

## Scripts NPM

```bash
# O script prebuild é executado automaticamente antes do build
npm run build
# Equivale a: node scripts/update-version.js && react-scripts build
```

## Proteções Contra Loop

1. **Cooldown de reload**: Mínimo 1 minuto entre reloads automáticos
2. **Cooldown de chunk error**: Mínimo 30 segundos entre reloads por erro de chunk
3. **Contador de erros**: Só verifica atualização após 3+ erros consecutivos
4. **Timestamp salvo localmente**: Evita verificações desnecessárias

## Funcionamento do Cache

### Dados que são limpos no reload:

- **Service Workers**: Desregistrados
- **Cache API**: Todos os caches deletados
- **SessionStorage**: Limpo completamente

### Dados que são preservados:

- **LocalStorage**: Token de autenticação preservado
- **Versão local**: Atualizada antes do reload

## Testando

1. Faça login no sistema
2. Faça uma alteração no código e execute `npm run build`
3. Faça deploy da nova versão
4. Em até 30 segundos, a página deve recarregar automaticamente
5. O usuário continua logado com a nova versão

## Logs no Console

O sistema gera logs informativos:

```
🔍 Iniciando verificação de versão...
📦 Primeira execução, salvando versão: 2.0.0
✅ Verificação de versão ativa (a cada 30s)

// Quando detecta atualização:
🆕 Nova versão detectada!
   Versão local: 2.0.0 2026-01-30T21:02:24.550Z
   Versão servidor: 2.0.1 2026-01-31T10:30:00.000Z
🔄 Nova versão detectada! Limpando cache e recarregando...
```

## Considerações

- O intervalo de 30 segundos pode ser ajustado em `versionService.js` (`CHECK_INTERVAL`)
- O cooldown de 1 minuto pode ser ajustado (`RELOAD_COOLDOWN`)
- Em ambientes com muitos usuários, considere implementar notificação antes do reload
