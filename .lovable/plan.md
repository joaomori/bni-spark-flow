

## Problema: Status e observações não atualizam ao editar lead

### Causa raiz
O `useEffect` no `LeadDialog` que inicializa o formulário depende apenas de `[lead]`. Como o Radix Dialog mantém o conteúdo montado mesmo quando `open=false`, e o React pode não detectar mudança de referência do `lead` corretamente em todos os cenários, o formulário pode não re-inicializar com os dados atualizados ao reabrir o dialog.

### Correção

**`src/components/LeadDialog.tsx`**
- Adicionar `open` como dependência do `useEffect` que inicializa o formulário:
  ```tsx
  useEffect(() => {
    if (lead && open) {
      setFormData({ ...from lead... });
    } else if (!lead) {
      setFormData({ ...reset... });
    }
  }, [lead, open]);
  ```
- Isso garante que toda vez que o dialog abre, o formulário é re-populado com os dados mais recentes do lead

**`src/pages/Leads.tsx`**
- Garantir que `handleDialogClose` aguarda o `fetchLeads` antes de permitir nova interação (atualmente não há `await`)
- O `handleDialogClose` deve passar corretamente o boolean `false` ao invés de ser chamado como callback direto

### Detalhes técnicos
- O `useEffect` atual com `[lead]` funciona na maioria dos casos, mas pode falhar quando o dialog é reaberto rapidamente antes de `fetchLeads` atualizar o array
- Adicionando `open` na dependência, o formulário sempre re-inicializa ao abrir, independente da referência do `lead`
- Mudança mínima, sem impacto em outros componentes

