import { createClient } from 'npm:@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const SYSTEM_PROMPT = `Você é um assistente que extrai informações de contatos/leads a partir de imagens (cartões de visita, listas, prints, fotos de cadernos, etc.).
Retorne SOMENTE JSON válido seguindo o schema fornecido. Não invente dados: se um campo não estiver visível na imagem, use string vazia.
Para cada lead, informe um "confidence" entre 0 e 1 e um "source_excerpt" curto com o trecho da imagem que justifica a extração.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token)
    if (claimsErr || !claims?.claims) {
      return json({ error: 'Não autenticado' }, 401)
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return json({ error: 'OPENAI_API_KEY não configurada no projeto' }, 500)
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Body inválido (JSON esperado)' }, 400)
    }

    const { image_base64, mime_type, file_name } = body ?? {}
    if (!image_base64 || typeof image_base64 !== 'string') {
      return json({ error: 'image_base64 é obrigatório' }, 400)
    }
    const mime = (typeof mime_type === 'string' && mime_type) || 'image/png'

    const dataUrl = image_base64.startsWith('data:')
      ? image_base64
      : `data:${mime};base64,${image_base64}`

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        leads: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              phone: { type: 'string' },
              company: { type: 'string' },
              specialty: { type: 'string' },
              invited_by: { type: 'string' },
              notes: { type: 'string' },
              confidence: { type: 'number' },
              source_excerpt: { type: 'string' },
            },
            required: ['name', 'phone', 'company', 'specialty', 'invited_by', 'notes', 'confidence', 'source_excerpt'],
          },
        },
      },
      required: ['leads'],
    }

    const userText = `Extraia todos os leads/contatos visíveis nesta imagem${
      file_name ? ` (arquivo: ${file_name})` : ''
    }. Foque em nome, telefone, empresa, especialidade/profissão, quem indicou (invited_by) e observações.`

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: userText },
              { type: 'input_image', image_url: dataUrl },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'leads_extraction',
            schema,
            strict: true,
          },
        },
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('OpenAI error', openaiRes.status, errText)
      return json({ error: 'Falha ao chamar OpenAI', details: errText }, 502)
    }

    const data = await openaiRes.json()
    let outputText: string | undefined = data.output_text
    if (!outputText && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item?.content) {
          for (const c of item.content) {
            if (typeof c?.text === 'string') {
              outputText = c.text
              break
            }
          }
        }
        if (outputText) break
      }
    }

    if (!outputText) {
      return json({ error: 'Resposta vazia da OpenAI', raw: data }, 502)
    }

    let parsed: any
    try {
      parsed = JSON.parse(outputText)
    } catch {
      return json({ error: 'Resposta da OpenAI não é JSON válido', raw: outputText }, 502)
    }

    return json({ leads: parsed.leads ?? [] }, 200)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro inesperado'
    console.error('extract-leads-from-image error', err)
    return json({ error: message }, 500)
  }
})
