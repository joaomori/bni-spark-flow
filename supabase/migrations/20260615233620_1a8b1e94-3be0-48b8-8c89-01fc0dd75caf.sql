
-- WhatsApp Backoffice: instances and automations

CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  api_key TEXT,
  evolution_api_url TEXT NOT NULL DEFAULT 'http://2.25.132.164:8080',
  status TEXT NOT NULL DEFAULT 'disconnected',
  phone_number TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'keyword',
  trigger_config JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL DEFAULT 'send_message',
  action_config JSONB NOT NULL DEFAULT '{}',
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_region ON public.whatsapp_instances(region_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_team ON public.whatsapp_instances(team_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_automations_instance ON public.whatsapp_automations(instance_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_instances TO authenticated;
GRANT ALL ON public.whatsapp_instances TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_automations TO authenticated;
GRANT ALL ON public.whatsapp_automations TO service_role;

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;

-- Admins (global/regional/team) manage instances
CREATE POLICY "wa_instances_admin_all" ON public.whatsapp_instances
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'global_admin')
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'team_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'global_admin')
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'team_admin')
  );

-- Regular users see instances matching their region/team
CREATE POLICY "wa_instances_user_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'global_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (whatsapp_instances.region_id IS NULL OR p.region_id = whatsapp_instances.region_id)
        AND (whatsapp_instances.team_id IS NULL OR p.team_id = whatsapp_instances.team_id)
    )
  );

-- Admins manage automations
CREATE POLICY "wa_automations_admin_all" ON public.whatsapp_automations
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'global_admin')
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'team_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'global_admin')
    OR public.has_role(auth.uid(), 'regional_admin')
    OR public.has_role(auth.uid(), 'team_admin')
  );

-- Users read automations for their scope
CREATE POLICY "wa_automations_user_select" ON public.whatsapp_automations
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'global_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (whatsapp_automations.region_id IS NULL OR p.region_id = whatsapp_automations.region_id)
        AND (whatsapp_automations.team_id IS NULL OR p.team_id = whatsapp_automations.team_id)
    )
  );

CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_automations_updated_at
  BEFORE UPDATE ON public.whatsapp_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
