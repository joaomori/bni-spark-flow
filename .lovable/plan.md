

## Popup de Motivo de Declínio e Alerta para Admins Globais

### Objetivo
Quando o status de um lead for alterado para "Declinado", abrir um popup perguntando o motivo. Se o motivo selecionado for "Conflito de Cadeira", gerar um alerta visível para administradores globais.

### Mudanças no Banco de Dados

**1. Adicionar coluna `decline_reason` na tabela `leads`**
- Armazena o motivo do declínio (texto livre ou valor padronizado)

**2. Criar tabela `admin_alerts`**
- Campos: `id`, `lead_id` (referência ao lead), `alert_type` (ex: "chair_conflict"), `message` (texto do alerta), `read` (boolean), `created_by` (quem gerou), `created_at`
- RLS: apenas global_admins podem visualizar; qualquer autenticado pode inserir
- Será exibida no Dashboard dos admins globais

### Mudanças no Frontend

**3. Adicionar status "Declinado" em todos os componentes**
- Valor interno: `declined`
- Adicionar nos selects de `LeadDialog`, nos mapas de `statusLabels`/`statusColors` de `LeadCard`, `Dashboard`, `LeadKanban` e `WhatsAppReport`

**4. Novo componente `DeclineReasonDialog`**
- Um AlertDialog/Dialog que aparece quando o status é alterado para "declined"
- Contém um Select com opções de motivo:
  - Conflito de Cadeira
  - Sem Interesse
  - Indisponibilidade
  - Outro (com campo de texto livre)
- Ao confirmar:
  - Salva o `decline_reason` no lead
  - Se o motivo for "Conflito de Cadeira", insere um registro na tabela `admin_alerts` com mensagem descritiva (nome do lead, equipe, quem cadastrou)

**5. Integrar o `DeclineReasonDialog` no `LeadDialog`**
- Interceptar o submit quando o status muda para "declined"
- Abrir o dialog de motivo antes de salvar
- Após selecionar o motivo, prosseguir com o salvamento normal

**6. Integrar o `DeclineReasonDialog` no `LeadKanban`**
- Interceptar o drag-and-drop para a coluna "Declinado"
- Abrir o dialog de motivo antes de atualizar o status

**7. Exibir alertas no Dashboard para admins globais**
- Consultar `user_roles` para verificar se o usuário logado é `global_admin`
- Se sim, buscar alertas não lidos da tabela `admin_alerts`
- Exibir como cards de alerta no topo do Dashboard com ícone de aviso e botão para marcar como lido

### Detalhes Técnicos

- A tabela `admin_alerts` terá RLS com policy SELECT restrita a `has_role(auth.uid(), 'global_admin')` e policy INSERT para qualquer `authenticated`
- O componente `DeclineReasonDialog` recebe callbacks `onConfirm(reason)` e `onCancel`
- No Kanban, o drag para coluna "declined" será interceptado: se o motivo não for fornecido, a mudança de status é cancelada
- Alertas de "Conflito de Cadeira" incluirão: nome do lead, telefone, equipe e nome de quem cadastrou

