

## Trocar "Cargo" por "Especialidade"

Renomear o campo "Cargo" (position) para "Especialidade" em toda a aplicação.

### Alteracoes

1. **Banco de dados** - Renomear a coluna `position` para `specialty` na tabela `leads` via migration SQL:
   ```sql
   ALTER TABLE leads RENAME COLUMN position TO specialty;
   ```

2. **LeadDialog.tsx** - Atualizar o formulario:
   - Trocar `position` por `specialty` no estado do formulario e no objeto `leadData`
   - Trocar o label "Cargo" por "Especialidade"
   - Trocar o id do input de "position" para "specialty"

3. **LeadCard.tsx** - Atualizar a exibicao:
   - Trocar `(lead as any).position` por `(lead as any).specialty`
   - Trocar o texto "Cargo:" por "Especialidade:"

### Detalhes tecnicos

- A migration SQL renomeia a coluna sem perda de dados
- Todos os dados existentes serao preservados automaticamente
- Os tipos TypeScript serao atualizados automaticamente apos a migration

