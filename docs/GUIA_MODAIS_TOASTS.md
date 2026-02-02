# Guia de Uso: Modais e Toasts Profissionais

Este documento explica como usar os novos componentes de UI que substituem os `alert()` e `window.confirm()` nativos do navegador.

## 📦 Componentes Criados

### 1. **ConfirmModal** + **useConfirm**

Modal de confirmação profissional que substitui `window.confirm()`.

### 2. **Toast** + **useToast**

Notificações elegantes que substituem `alert()`.

---

## 🚀 Como Usar

### useConfirm - Modal de Confirmação

```javascript
import { useConfirm } from "../../hooks/useConfirm";

function MeuComponente() {
  const { confirm, ConfirmDialog } = useConfirm();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Excluir Item",
      message:
        "Tem certeza que deseja excluir? Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      variant: "danger", // "danger" | "warning" | "success" | "info"
    });

    if (!confirmed) return;

    // Continua com a exclusão...
    await api.delete(`/items/${id}`);
  };

  return (
    <>
      <button onClick={handleDelete}>Excluir</button>

      {/* IMPORTANTE: Adicione no final do JSX */}
      <ConfirmDialog />
    </>
  );
}
```

### useToast - Notificações Toast

```javascript
import { useToast } from "../../hooks/useToast";

function MeuComponente() {
  const { showToast, ToastContainer } = useToast();

  const handleSave = async () => {
    try {
      await api.post("/items", data);
      showToast("Item salvo com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao salvar item", "error");
    }
  };

  const handleValidation = () => {
    if (!nome) {
      showToast("Nome é obrigatório", "warning");
      return false;
    }
    return true;
  };

  return (
    <>
      <button onClick={handleSave}>Salvar</button>

      {/* IMPORTANTE: Adicione no final do JSX */}
      <ToastContainer />
    </>
  );
}
```

### Usando Ambos Juntos

```javascript
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";

function MeuComponente() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastContainer } = useToast();

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Excluir Item",
      message: "Tem certeza?",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await api.delete(`/items/${id}`);
      showToast("Item excluído com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao excluir item", "error");
    }
  };

  return (
    <>
      {/* ... conteúdo ... */}

      {/* Modais de UI - sempre no final */}
      <ConfirmDialog />
      <ToastContainer />
    </>
  );
}
```

---

## 🎨 Variantes Disponíveis

### ConfirmModal Variants

| Variant   | Cor      | Uso Recomendado                   |
| --------- | -------- | --------------------------------- |
| `danger`  | Vermelho | Ações destrutivas (excluir, etc.) |
| `warning` | Amarelo  | Ações que precisam atenção        |
| `success` | Verde    | Confirmações positivas            |
| `info`    | Azul     | Informações gerais                |

### Toast Types

| Type      | Cor      | Uso Recomendado         |
| --------- | -------- | ----------------------- |
| `success` | Verde    | Operações bem-sucedidas |
| `error`   | Vermelho | Erros e falhas          |
| `warning` | Amarelo  | Avisos e alertas        |
| `info`    | Azul     | Informações gerais      |

---

## ⚠️ Migrando de alert() e window.confirm()

### Antes (ruim):

```javascript
const handleDelete = async () => {
  if (!window.confirm("Tem certeza?")) return;

  try {
    await api.delete(`/items/${id}`);
    alert("✅ Item excluído!");
  } catch (error) {
    alert("❌ Erro ao excluir");
  }
};
```

### Depois (bom):

```javascript
const handleDelete = async () => {
  const confirmed = await confirm({
    title: "Excluir Item",
    message: "Tem certeza?",
    variant: "danger",
  });

  if (!confirmed) return;

  try {
    await api.delete(`/items/${id}`);
    showToast("Item excluído com sucesso!", "success");
  } catch (error) {
    showToast("Erro ao excluir item", "error");
  }
};
```

---

## 📋 Checklist de Migração

1. [ ] Adicionar imports dos hooks
2. [ ] Inicializar hooks no início do componente
3. [ ] Substituir `window.confirm()` por `await confirm()`
4. [ ] Substituir `alert()` por `showToast()`
5. [ ] Adicionar `<ConfirmDialog />` e `<ToastContainer />` no final do JSX
6. [ ] Testar todas as funcionalidades

---

## 📁 Arquivos dos Componentes

- `src/components/ConfirmModal/index.js` - Componente do modal
- `src/components/ConfirmModal/styles.css` - Estilos do modal
- `src/hooks/useConfirm.js` - Hook para usar o modal
- `src/components/Toast/index.js` - Componente do toast
- `src/components/Toast/styles.css` - Estilos do toast
- `src/hooks/useToast.js` - Hook para usar o toast
