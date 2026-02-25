## Relatório para WhatsApp - Coordenador de Afiliação

### Objetivo

Criar uma nova página acessível pelo menu lateral que exibe os leads pendentes dos últimos 15 dias em formato texto, com botão para copiar o conteúdo e enviar no WhatsApp.

### Mudanças

**1. Nova página `src/pages/WhatsAppReport.tsx**`

- Busca leads criados nos últimos 15 dias
- Gera um texto formatado com as informações de cada lead (nome, telefone, especialidade, padrinho, status, data)
- Exibe o texto em um campo de texto (textarea) de somente leitura
- Botão "Copiar" que copia o conteúdo para a área de transferência com feedback visual (toast)
- Inclui cabeçalho com titulo e contagem de leads pendentes

**2. Atualizar `src/components/AppSidebar.tsx**`

- Adicionar novo item "Relatório WhatsApp" no menu principal com ícone `MessageCircle`
- Link para `/whatsapp-report`

**3. Atualizar `src/App.tsx**`

- Importar e adicionar rota `/whatsapp-report` dentro das rotas protegidas

### Formato do texto gerado

```text
📋 RELATÓRIO DE CANDIDATURAS PENDENTES
📅 Período: DD/MM/YYYY a DD/MM/YYYY
📊 Total: X candidatos

1. Nome: João Silva
   📱 Tel: (17) 99999-9999
   🏢 Atividade: Consultoria
   👤 Padrinho: Carlos
   📌 Status: Novo Contato
   📅 Cadastro: 15/02/2026

2. Nome: Maria Santos
   ...
```

### Detalhes técnicos

- Query filtra por `created_at >= 15 dias atrás` e `status NOT IN ('closed', 'lost')`
- Usa `navigator.clipboard.writeText()` para copiar
- Reutiliza os mapeamentos de `statusLabels` do `LeadCard`
- Formatação de datas com `date-fns` e locale `ptBR`