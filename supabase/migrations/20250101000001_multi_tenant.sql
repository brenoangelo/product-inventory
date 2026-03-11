-- ============================================================
-- Multi-Tenant SaaS Migration
-- Adds organizations, members, invitations, and org-level RLS
-- ============================================================

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Organization members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 3. Invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- 4. Add organization_id to existing tables
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================================
-- SECURITY DEFINER helper functions (bypass RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_ids_with_role(allowed_roles text[])
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND role = ANY(allowed_roles);
$$;

CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Creates an org (if name doesn't exist) and adds the caller as owner.
-- Called via rpc() right after signUp — SECURITY DEFINER bypasses RLS.
CREATE OR REPLACE FUNCTION public.create_org_for_user(org_name text)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already belongs to an org
  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = v_user_id) THEN
    SELECT organization_id INTO v_org_id
    FROM organization_members WHERE user_id = v_user_id LIMIT 1;
    RETURN v_org_id;
  END IF;

  -- Check if org with this name exists
  SELECT id INTO v_org_id FROM organizations WHERE name = org_name LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name) VALUES (org_name)
    RETURNING id INTO v_org_id;
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN v_org_id;
END;
$$;

-- ============================================================
-- Enable RLS on new tables
-- ============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Drop old user-level policies on products & transactions
-- ============================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname);
  END LOOP;
END $$;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'transactions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.transactions', pol.policyname);
  END LOOP;
END $$;

-- ============================================================
-- Organization-level RLS policies
-- ============================================================

-- organizations
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING ( id IN (SELECT public.get_user_org_ids()) );

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK ( auth.uid() IS NOT NULL );

CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING ( id IN (SELECT public.get_user_org_ids_with_role(ARRAY['owner'])) );

CREATE POLICY "Owners can delete their organizations"
  ON public.organizations FOR DELETE
  USING ( id IN (SELECT public.get_user_org_ids_with_role(ARRAY['owner'])) );

-- organization_members
CREATE POLICY "Users can view members of their orgs"
  ON public.organization_members FOR SELECT
  USING ( organization_id IN (SELECT public.get_user_org_ids()) );

CREATE POLICY "Users can insert members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids_with_role(ARRAY['owner', 'admin']))
    OR user_id = auth.uid()
  );

CREATE POLICY "Owners can update member roles"
  ON public.organization_members FOR UPDATE
  USING ( organization_id IN (SELECT public.get_user_org_ids_with_role(ARRAY['owner'])) );

CREATE POLICY "Owners can remove members or users can leave"
  ON public.organization_members FOR DELETE
  USING (
    organization_id IN (SELECT public.get_user_org_ids_with_role(ARRAY['owner']))
    OR user_id = auth.uid()
  );

-- invitations
CREATE POLICY "Org members can view invitations"
  ON public.invitations FOR SELECT
  USING (
    organization_id IN (SELECT public.get_user_org_ids())
    OR email = public.get_user_email()
  );

CREATE POLICY "Owners and admins can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids_with_role(ARRAY['owner', 'admin']))
  );

CREATE POLICY "Owners can delete invitations"
  ON public.invitations FOR DELETE
  USING (
    organization_id IN (SELECT public.get_user_org_ids_with_role(ARRAY['owner', 'admin']))
  );

CREATE POLICY "Invited users can update invitations (accept)"
  ON public.invitations FOR UPDATE
  USING (
    email = public.get_user_email()
  );

-- products (org-level)
CREATE POLICY "Users can view org products"
  ON public.products FOR SELECT
  USING ( organization_id IN (SELECT public.get_user_org_ids()) );

CREATE POLICY "Users can create org products"
  ON public.products FOR INSERT
  WITH CHECK ( organization_id IN (SELECT public.get_user_org_ids()) );

CREATE POLICY "Users can update org products"
  ON public.products FOR UPDATE
  USING ( organization_id IN (SELECT public.get_user_org_ids()) );

CREATE POLICY "Users can delete org products"
  ON public.products FOR DELETE
  USING ( organization_id IN (SELECT public.get_user_org_ids()) );

-- transactions (org-level)
CREATE POLICY "Users can view org transactions"
  ON public.transactions FOR SELECT
  USING ( organization_id IN (SELECT public.get_user_org_ids()) );

CREATE POLICY "Users can create org transactions"
  ON public.transactions FOR INSERT
  WITH CHECK ( organization_id IN (SELECT public.get_user_org_ids()) );

CREATE POLICY "Users can update org transactions"
  ON public.transactions FOR UPDATE
  USING ( organization_id IN (SELECT public.get_user_org_ids()) );

CREATE POLICY "Users can delete org transactions"
  ON public.transactions FOR DELETE
  USING ( organization_id IN (SELECT public.get_user_org_ids()) );

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON public.transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
