import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { full_name, email, password, team_id } = await req.json()

    if (!full_name || !email || !password || !team_id) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get region_id from team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('region_id')
      .eq('id', team_id)
      .single()

    if (teamError || !team) {
      return new Response(
        JSON.stringify({ error: 'Equipe não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (signUpError) {
      // Check for duplicate email error
      if (signUpError.message?.includes('already been registered') || signUpError.message?.includes('already exists') || signUpError.status === 422) {
        return new Response(
          JSON.stringify({ error: 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw signUpError
    }
    if (!authData.user) throw new Error('Falha ao criar usuário')

    // Update profile with team and region
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ team_id, region_id: team.region_id })
      .eq('id', authData.user.id)

    if (profileError) throw profileError

    // Assign member role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: authData.user.id, role: 'member' })

    if (roleError) throw roleError

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar conta'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
