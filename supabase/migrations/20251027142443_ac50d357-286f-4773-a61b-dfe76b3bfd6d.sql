-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('member', 'team_admin', 'regional_admin', 'global_admin');

-- Create regions table
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(region_id, name)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  next_contact_date DATE,
  source TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create security definer function to get user's team
CREATE OR REPLACE FUNCTION public.get_user_team(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = _user_id
$$;

-- Create security definer function to get user's region
CREATE OR REPLACE FUNCTION public.get_user_region(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT region_id FROM public.profiles WHERE id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for regions
CREATE POLICY "All authenticated users can view regions"
ON public.regions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Global admins can manage regions"
ON public.regions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'global_admin'))
WITH CHECK (public.has_role(auth.uid(), 'global_admin'));

-- RLS Policies for teams
CREATE POLICY "Users can view teams in their region or all if admin"
ON public.teams FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'global_admin') OR
  public.has_role(auth.uid(), 'regional_admin') AND region_id = public.get_user_region(auth.uid()) OR
  id = public.get_user_team(auth.uid())
);

CREATE POLICY "Regional and global admins can manage teams"
ON public.teams FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'global_admin') OR
  (public.has_role(auth.uid(), 'regional_admin') AND region_id = public.get_user_region(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'global_admin') OR
  (public.has_role(auth.uid(), 'regional_admin') AND region_id = public.get_user_region(auth.uid()))
);

-- RLS Policies for leads
CREATE POLICY "Users can view leads based on role"
ON public.leads FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'global_admin') OR
  (public.has_role(auth.uid(), 'regional_admin') AND region_id = public.get_user_region(auth.uid())) OR
  (public.has_role(auth.uid(), 'team_admin') AND team_id = public.get_user_team(auth.uid())) OR
  team_id = public.get_user_team(auth.uid())
);

CREATE POLICY "Users can create leads in their team"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (
  team_id = public.get_user_team(auth.uid()) AND
  region_id = public.get_user_region(auth.uid())
);

CREATE POLICY "Users can update leads based on role"
ON public.leads FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'global_admin') OR
  (public.has_role(auth.uid(), 'regional_admin') AND region_id = public.get_user_region(auth.uid())) OR
  (public.has_role(auth.uid(), 'team_admin') AND team_id = public.get_user_team(auth.uid())) OR
  (team_id = public.get_user_team(auth.uid()) AND assigned_to = auth.uid())
);

CREATE POLICY "Team admins and above can delete leads"
ON public.leads FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'global_admin') OR
  (public.has_role(auth.uid(), 'regional_admin') AND region_id = public.get_user_region(auth.uid())) OR
  (public.has_role(auth.uid(), 'team_admin') AND team_id = public.get_user_team(auth.uid()))
);

-- Trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_regions_updated_at
BEFORE UPDATE ON public.regions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();