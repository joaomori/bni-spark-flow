-- Public candidate QR flow without Edge Function dependency.

CREATE OR REPLACE FUNCTION public.get_candidate_qr_team(
  p_team_id UUID,
  p_qr_date DATE
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  region_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_sp_date DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF p_team_id IS NULL OR p_qr_date IS NULL THEN
    RAISE EXCEPTION 'QR Code inválido. Solicite um novo QR Code para a equipe.';
  END IF;

  IF p_qr_date <> current_sp_date THEN
    RAISE EXCEPTION 'Este QR Code expirou. Solicite o QR Code de hoje para a equipe.';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    r.name AS region_name
  FROM public.teams t
  LEFT JOIN public.regions r ON r.id = t.region_id
  WHERE t.id = p_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipe não encontrada para este QR Code.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_candidate_qr(
  p_team_id UUID,
  p_qr_date DATE,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_specialty TEXT DEFAULT NULL,
  p_invited_by TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_sp_date DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  target_team public.teams%ROWTYPE;
  owner_id UUID;
  new_lead_id UUID;
  clean_name TEXT := NULLIF(BTRIM(p_name), '');
  clean_phone TEXT := NULLIF(BTRIM(p_phone), '');
  clean_email TEXT := NULLIF(BTRIM(p_email), '');
  clean_company TEXT := NULLIF(BTRIM(p_company), '');
  clean_specialty TEXT := NULLIF(BTRIM(p_specialty), '');
  clean_invited_by TEXT := NULLIF(BTRIM(p_invited_by), '');
  clean_notes TEXT := NULLIF(BTRIM(p_notes), '');
  qr_notes TEXT;
BEGIN
  IF p_team_id IS NULL OR p_qr_date IS NULL THEN
    RAISE EXCEPTION 'QR Code inválido. Solicite um novo QR Code para a equipe.';
  END IF;

  IF p_qr_date <> current_sp_date THEN
    RAISE EXCEPTION 'Este QR Code expirou. Solicite o QR Code de hoje para a equipe.';
  END IF;

  IF clean_name IS NULL OR clean_phone IS NULL THEN
    RAISE EXCEPTION 'Nome e telefone são obrigatórios.';
  END IF;

  SELECT *
  INTO target_team
  FROM public.teams
  WHERE id = p_team_id;

  IF target_team.id IS NULL THEN
    RAISE EXCEPTION 'Equipe não encontrada para este QR Code.';
  END IF;

  SELECT p.id
  INTO owner_id
  FROM public.profiles p
  LEFT JOIN public.user_roles ur
    ON ur.user_id = p.id
    AND ur.role IN ('team_admin', 'regional_admin', 'global_admin')
  WHERE p.team_id = target_team.id
  ORDER BY
    CASE ur.role
      WHEN 'team_admin' THEN 1
      WHEN 'regional_admin' THEN 2
      WHEN 'global_admin' THEN 3
      ELSE 4
    END,
    p.created_at ASC
  LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Esta equipe ainda não tem um usuário responsável para receber candidatos.';
  END IF;

  qr_notes := CONCAT_WS(
    E'\n\n',
    clean_notes,
    FORMAT('Cadastro recebido pelo QR Code diário da equipe em %s.', p_qr_date)
  );

  INSERT INTO public.leads (
    name,
    email,
    phone,
    company,
    specialty,
    invited_by,
    notes,
    source,
    status,
    team_id,
    region_id,
    created_by,
    assigned_to
  )
  VALUES (
    clean_name,
    clean_email,
    clean_phone,
    clean_company,
    clean_specialty,
    clean_invited_by,
    qr_notes,
    FORMAT('QR Code diário - %s', target_team.name),
    'new',
    target_team.id,
    target_team.region_id,
    owner_id,
    owner_id
  )
  RETURNING id INTO new_lead_id;

  RETURN new_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_candidate_qr_team(UUID, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_candidate_qr(UUID, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;