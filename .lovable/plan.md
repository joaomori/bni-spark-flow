

## Plano: Importar leads da planilha Comitiva

### Dados identificados
- **Equipe destino**: Comitiva (team_id: `15034593-d32b-4139-83de-2a3fc9163a21`, region_id: `b9b10de3-2360-4ad2-adeb-1f02de7dea4c`)
- **Planilha**: ~200+ registros com nome, empresa, especialidade, quem convidou, telefone e status
- **Membro criador**: perfil existente da equipe Comitiva

### Mapeamento de status
| Planilha | Sistema |
|----------|---------|
| Membro / Pago | `closed` (Finalizado Ganho) |
| Não teve interesse / Não é o momento | `lost` (Finalizado Perdido) |
| Conflito de cadeira | `declined` (Aguardando Oportunidade) + `decline_reason` |
| Aguardando pagamento / Assinatura de contrato | `waiting_signature` |
| Entrevista realizada | `interview_done` |
| Sem retorno / Não foi na reunião / Não retornou | `waiting_return` |
| Foi para outro grupo (Raízes etc) | `lost` |
| Vazio / Em andamento | `new` |

### Processo
1. Normalizar telefones (remover espacos, tracos, parenteses) para comparar com os ~95 telefones ja existentes na base
2. Excluir registros sem nome ou duplicados por telefone
3. Inserir leads em lotes via SQL INSERT, preenchendo: `name`, `company`, `specialty`, `invited_by`, `phone`, `status`, `decline_reason` (quando aplicavel), `team_id`, `region_id`, `created_by`
4. Registros duplicados por telefone serao listados e ignorados

### Campos mapeados
- CONVIDADO → `name`
- EMPRESA → `company`
- RAMO DE ATUACAO → `specialty`
- QUEM CONVIDOU → `invited_by`
- TELEFONE → `phone`
- Status (coluna Status + coluna Acao) → `status`

