// Edge Function temporária: exporta todo o banco em JSON
// Acesso restrito a usuários com role 'global_admin'.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const TABLES = [
  "regions",
  "teams",
  "profiles",
  "user_roles",
  "leads",
  "admin_alerts",
  "whatsapp_instances",
  "whatsapp_automations",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Valida JWT e identifica usuário
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub;

    // Cliente admin (bypass RLS)
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Checa role global_admin
    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "global_admin")
      .maybeSingle();
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!roleRow) return json({ error: "Forbidden: global_admin only" }, 403);

    // Dump de todas as tabelas
    const dump: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      project_ref: "jbgmysayiddpxoyuciio",
      tables: {},
    };
    const tables = dump.tables as Record<string, unknown>;

    for (const t of TABLES) {
      const { data, error, count } = await admin
        .from(t)
        .select("*", { count: "exact" });
      tables[t] = error
        ? { error: error.message }
        : { count: count ?? data?.length ?? 0, rows: data ?? [] };
    }

    return new Response(JSON.stringify(dump, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="bni-spark-flow-export-${
          new Date().toISOString().slice(0, 10)
        }.json"`,
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
