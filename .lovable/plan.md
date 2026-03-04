

## Plano: Filtro por equipe na pagina de Leads e Busca Avancada + Remover campos desnecessarios

### Resumo
1. Adicionar filtro por equipe na pagina de Leads (visivel para admins globais/regionais)
2. Adicionar filtro por equipe na Busca Avancada
3. Remover campos "Origem" e "E-mail" de todo o sistema (formularios, cards, busca)

### Mudancas

**1. `Leads.tsx` -- Adicionar filtro por equipe**
- Buscar equipes do banco (`supabase.from("teams").select("id, name")`)
- Adicionar um Select de equipe acima/ao lado da barra de busca
- Filtrar leads pelo `team_id` selecionado na query do Supabase (server-side)
- Quando "Todas" estiver selecionado, nao aplicar filtro

**2. `Search.tsx` -- Adicionar filtro por equipe + remover campos**
- Adicionar Select de equipe nos filtros (buscar equipes do banco)
- Aplicar filtro `.eq("team_id", selectedTeamId)` na query
- Remover campo "E-mail" e "Origem" dos filtros
- Remover coluna "Email" e "Origem" do CSV de exportacao

**3. `LeadDialog.tsx` -- Remover campos**
- Remover campo "E-mail" do formulario
- Remover campo "Origem" do formulario
- Remover `email` e `source` do formData (manter no leadData como null para nao quebrar schema)

**4. `LeadCard.tsx` -- Remover campos**
- Remover exibicao de email (icone Mail + texto)
- Remover exibicao de origem

**5. `LeadKanban.tsx` (DraggableLeadCard) -- Remover campos**
- Remover exibicao de email (icone Mail + texto)

**6. Leads interface** -- Remover `email` e `source` dos tipos onde usados localmente

