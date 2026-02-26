

## Melhorar Alertas de Admin Global no Dashboard

### Objetivo
Transformar a seção de alertas do dashboard em um componente mais robusto e visualmente destacado, com funcionalidades adicionais.

### Mudanças em `src/pages/Dashboard.tsx`

**1. Card dedicado para alertas (em vez de simples Alert inline)**
- Substituir os componentes `Alert` soltos por um `Card` com cabeçalho, contagem de alertas e botao "Marcar todos como lidos"
- Ícone de sino (Bell) no cabeçalho com badge de contagem
- Fundo com gradiente vermelho sutil para chamar atenção

**2. Botao "Marcar todos como lidos"**
- Adicionar funcao `markAllAlertsAsRead` que faz update em batch de todos os alertas nao lidos
- Botao no cabeçalho do card, ao lado do titulo

**3. Detalhes em cada alerta**
- Exibir data/hora formatada do alerta (`created_at`)
- Exibir tipo do alerta com badge colorido (ex: "Conflito de Cadeira" em vermelho)
- Buscar nome de quem criou o alerta (join com `profiles` via `created_by`)

**4. Estado vazio melhorado**
- Quando admin global e sem alertas, mostrar mensagem positiva "Nenhum alerta pendente" com ícone de check

### Detalhes Tecnicos

- Importar `Bell`, `CheckCheck` do lucide-react
- Query de alertas passa a incluir join com profiles: `.select("*, profiles:created_by(full_name)")`
- Nova funcao `markAllAlertsAsRead`: faz `supabase.from("admin_alerts").update({ read: true }).eq("read", false)` e limpa o state
- Formatacao de data com `format(new Date(alert.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })`
- Mapeamento de `alert_type` para labels: `{ chair_conflict: "Conflito de Cadeira" }`

