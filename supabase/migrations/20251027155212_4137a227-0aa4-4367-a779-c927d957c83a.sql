-- Allow global admins to view all profiles
CREATE POLICY "Global admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'global_admin'));

-- Allow regional admins to view profiles in their region
CREATE POLICY "Regional admins can view profiles in their region"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'regional_admin') 
  AND region_id = get_user_region(auth.uid())
);

-- Allow team admins to view profiles in their team
CREATE POLICY "Team admins can view profiles in their team"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'team_admin') 
  AND team_id = get_user_team(auth.uid())
);

-- Allow global admins to update all profiles
CREATE POLICY "Global admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'global_admin'));

-- Allow regional admins to update profiles in their region
CREATE POLICY "Regional admins can update profiles in their region"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'regional_admin') 
  AND region_id = get_user_region(auth.uid())
);

-- Allow team admins to update profiles in their team
CREATE POLICY "Team admins can update profiles in their team"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'team_admin') 
  AND team_id = get_user_team(auth.uid())
);

-- Allow admins to view user roles
CREATE POLICY "Global admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'global_admin'));

CREATE POLICY "Regional admins can view user roles in their region"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'regional_admin')
  AND user_id IN (
    SELECT id FROM public.profiles 
    WHERE region_id = get_user_region(auth.uid())
  )
);

CREATE POLICY "Team admins can view user roles in their team"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'team_admin')
  AND user_id IN (
    SELECT id FROM public.profiles 
    WHERE team_id = get_user_team(auth.uid())
  )
);

-- Allow global admins to manage user roles
CREATE POLICY "Global admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'global_admin'));

CREATE POLICY "Global admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'global_admin'));

CREATE POLICY "Global admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'global_admin'));