-- ============================================================
-- MULTI-TENANT SaaS MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Organization members (links users to orgs with roles)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 3. Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- 4. Add organization_id to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 5. Add organization_id to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- These bypass RLS to avoid infinite recursion when policies
-- on organization_members reference organization_members itself.
-- ============================================================

-- Returns all org IDs the current user belongs to
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid();
$$;

-- Returns all org IDs where the current user has a given role (or list of roles)
CREATE OR REPLACE FUNCTION get_user_org_ids_with_role(allowed_roles text[])
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
    AND role = ANY(allowed_roles);
$$;

-- Returns the email of the current authenticated user
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ---------- organizations ----------

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING ( id IN (SELECT get_user_org_ids()) );

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING ( id IN (SELECT get_user_org_ids_with_role(ARRAY['owner'])) );

CREATE POLICY "Owners can delete their organizations"
  ON organizations FOR DELETE
  USING ( id IN (SELECT get_user_org_ids_with_role(ARRAY['owner'])) );

-- ---------- organization_members ----------

CREATE POLICY "Users can view members of their orgs"
  ON organization_members FOR SELECT
  USING ( organization_id IN (SELECT get_user_org_ids()) );

CREATE POLICY "Users can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (
    -- Owners/admins can add members
    organization_id IN (SELECT get_user_org_ids_with_role(ARRAY['owner', 'admin']))
    -- OR user is adding themselves (first org creation / accepting invite)
    OR user_id = auth.uid()
  );

CREATE POLICY "Owners can update member roles"
  ON organization_members FOR UPDATE
  USING ( organization_id IN (SELECT get_user_org_ids_with_role(ARRAY['owner'])) );

CREATE POLICY "Owners can remove members or users can leave"
  ON organization_members FOR DELETE
  USING (
    organization_id IN (SELECT get_user_org_ids_with_role(ARRAY['owner']))
    OR user_id = auth.uid()
  );

-- ---------- invitations ----------

CREATE POLICY "Org members can view invitations"
  ON invitations FOR SELECT
  USING (
    organization_id IN (SELECT get_user_org_ids())
    OR email = get_user_email()
  );

CREATE POLICY "Owners and admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids_with_role(ARRAY['owner', 'admin']))
  );

CREATE POLICY "Owners can delete invitations"
  ON invitations FOR DELETE
  USING (
    organization_id IN (SELECT get_user_org_ids_with_role(ARRAY['owner', 'admin']))
  );

CREATE POLICY "Invited users can update invitations (accept)"
  ON invitations FOR UPDATE
  USING (
    email = get_user_email()
  );

-- ---------- products (replace existing RLS) ----------

-- Drop existing policies on products (adjust names if different)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON products', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view org products"
  ON products FOR SELECT
  USING ( organization_id IN (SELECT get_user_org_ids()) );

CREATE POLICY "Users can create org products"
  ON products FOR INSERT
  WITH CHECK ( organization_id IN (SELECT get_user_org_ids()) );

CREATE POLICY "Users can update org products"
  ON products FOR UPDATE
  USING ( organization_id IN (SELECT get_user_org_ids()) );

CREATE POLICY "Users can delete org products"
  ON products FOR DELETE
  USING ( organization_id IN (SELECT get_user_org_ids()) );

-- ---------- transactions (replace existing RLS) ----------

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'transactions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view org transactions"
  ON transactions FOR SELECT
  USING ( organization_id IN (SELECT get_user_org_ids()) );

CREATE POLICY "Users can create org transactions"
  ON transactions FOR INSERT
  WITH CHECK ( organization_id IN (SELECT get_user_org_ids()) );

CREATE POLICY "Users can update org transactions"
  ON transactions FOR UPDATE
  USING ( organization_id IN (SELECT get_user_org_ids()) );

CREATE POLICY "Users can delete org transactions"
  ON transactions FOR DELETE
  USING ( organization_id IN (SELECT get_user_org_ids()) );

-- ============================================================
-- PLAN COLUMN (for existing organizations)
-- ============================================================

-- If the organizations table already exists without the plan column, add it:
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'standard', 'enterprise'));

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
