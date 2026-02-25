
## Excluir Usuários (Admin Global)

### Objetivo
Adicionar um botão "Excluir" nos cards de usuários e um diálogo de confirmação, permitindo que administradores globais removam usuários do sistema.

### Mudanças

**1. Nova Edge Function `supabase/functions/delete-user/index.ts`**
- Recebe o `user_id` a ser excluído
- Verifica se o usuário autenticado é `global_admin`
- Usa o service role para chamar `auth.admin.deleteUser()` (que também remove cascata do `user_roles` e `profiles` via FK)
- Retorna sucesso ou erro

**2. Atualizar `supabase/config.toml`**
- Adicionar configuração `[functions.delete-user]` com `verify_jwt = false`

**3. Atualizar `src/pages/UsersManagement.tsx`**
- Adicionar botão "Excluir" (ícone Trash2, vermelho) ao lado do botão "Editar" em cada card de usuário
- Ao clicar, abre um AlertDialog de confirmação com o nome do usuário
- Ao confirmar, chama `supabase.functions.invoke('delete-user', { body: { user_id } })`
- Exibe toast de sucesso/erro e recarrega a lista

### Detalhes técnicos

- A Edge Function valida o role do chamador consultando `user_roles` com o service role client
- `auth.admin.deleteUser()` remove o usuário do auth, e os registros em `profiles` e `user_roles` são removidos por cascade (FK `on delete cascade`)
- O AlertDialog usa os componentes existentes de `@/components/ui/alert-dialog`
- Impede que o admin exclua a si mesmo (verificação no frontend e backend)
