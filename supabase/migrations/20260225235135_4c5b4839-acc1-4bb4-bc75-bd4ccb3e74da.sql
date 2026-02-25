
-- Add decline_reason column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS decline_reason text;

-- Create admin_alerts table
CREATE TABLE public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Only global admins can view alerts
CREATE POLICY "Global admins can view alerts"
  ON public.admin_alerts
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'global_admin'::app_role));

-- Any authenticated user can insert alerts
CREATE POLICY "Authenticated users can insert alerts"
  ON public.admin_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Global admins can update alerts (mark as read)
CREATE POLICY "Global admins can update alerts"
  ON public.admin_alerts
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'global_admin'::app_role));
