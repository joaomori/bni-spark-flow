

## Importar Leads da Planilha para a Equipe Comitiva

A planilha contém 63 registros de visitantes/leads com as colunas: Data, Nome, Celular, Atividade e Padrinho.

### Mapeamento dos campos

| Planilha | Campo no sistema |
|----------|-----------------|
| Nome | `name` |
| Cel | `phone` |
| Atividade | `specialty` |
| Padrinho | `invited_by` |
| Data | `created_at` |

Dados fixos para todos os registros:
- `team_id`: Comitiva (`15034593-d32b-4139-83de-2a3fc9163a21`)
- `region_id`: Barretos (`b9b10de3-2360-4ad2-adeb-1f02de7dea4c`)
- `created_by`: usuario da equipe Comitiva (`95cd540e-ea15-48e3-847f-7a7f1b6fac4a`)
- `status`: `new`

### Execucao

Inserir os 63 leads na tabela `leads` usando queries INSERT diretas (ferramenta de insert do banco). Os registros serao divididos em lotes para garantir que todos sejam inseridos corretamente.

Os telefones serao normalizados para manter apenas numeros. Registros sem nome de atividade terao o campo `specialty` como nulo.

### Detalhes tecnicos

- Serao executadas queries INSERT em lotes de ~20 registros
- A data original da planilha sera usada como `created_at` para manter o historico
- Nenhuma alteracao de schema e necessaria - todos os campos ja existem na tabela `leads`

