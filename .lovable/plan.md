

## Conflito de Cadeira: Redirecionar Lead para Outra Equipe

### Objetivo
Quando o motivo de declinio for "Conflito de Cadeira", exibir um seletor de equipes no dialog. Ao confirmar, o lead sera automaticamente transferido para a equipe selecionada (alterando `team_id` e `region_id`) e o status volta para "new" no pipeline da nova equipe, em vez de ficar como "declined".

### Mudancas

**1. `DeclineReasonDialog` -- adicionar seletor de equipe**
- Quando o motivo selecionado for `chair_conflict`, exibir um Select com as equipes disponiveis
- Buscar equipes do banco via `supabase.from("teams").select("id, name, region_id")`
- O callback `onConfirm` passa a enviar tambem o `targetTeamId` quando aplicavel
- Nova assinatura: `onConfirm(reason: string, targetTeamId?: string)`

**2. `LeadKanban` -- tratar redirecionamento**
- Quando o motivo for `chair_conflict` e um `targetTeamId` for fornecido:
  - Buscar o `region_id` da equipe destino
  - Atualizar o lead com `status: "new"`, `team_id: targetTeamId`, `region_id` da nova equipe
  - Criar o alerta de admin normalmente
- O lead sai da visualizacao atual (pertence a outra equipe agora)

**3. `LeadDialog` -- tratar redirecionamento**
- Mesma logica: quando `chair_conflict` com equipe destino, atualizar `team_id`, `region_id` e resetar status para "new"
- Remover a validacao de equipe/regiao do perfil do usuario ao editar um lead existente (corrige o bug do admin global)

**4. Correcao do bug de edicao para admins**
- No `LeadDialog`, ao editar um lead existente, nao buscar `team_id`/`region_id` do perfil do usuario logado
- Manter os valores originais do lead na edicao
- Somente exigir equipe/regiao ao criar novo lead

### Detalhes Tecnicos

- `DeclineReasonDialog` recebe `onConfirm(reason: string, targetTeamId?: string)`
- Ao buscar equipes, usar query com `region_id` para exibir agrupado ou com nome da regiao
- No update do lead para chair_conflict: `{ status: "new", team_id: targetTeamId, region_id: teamRegionId, decline_reason: "chair_conflict" }`
- O alerta de admin incluira a equipe destino na mensagem
- Na edicao de lead existente no `LeadDialog`, o `leadData` nao incluira `team_id`, `region_id`, `created_by`

