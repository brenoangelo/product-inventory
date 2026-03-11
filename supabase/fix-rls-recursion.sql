-- ============================================================
-- FIX: Infinite recursion in RLS policies
-- Run this in Supabase SQL Editor if you already ran the
-- original migration and are hitting the recursion error.
-- ============================================================

-- 1. Drop ALL existing policies on affected tables
DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['organizations', 'organization_members', 'invitations', 'products', 'transactions']
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- 2. Create SECURITY DEFINER helper functions (bypass RLS)
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

-- 3. Re-create all policies using the helper functions

-- organizations
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

-- organization_members
CREATE POLICY "Users can view members of their orgs"
  ON organization_members FOR SELECT
  USING ( organization_id IN (SELECT get_user_org_ids()) );

CREATE POLICY "Users can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids_with_role(ARRAY['owner', 'admin']))
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

-- invitations
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

-- products
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

-- transactions
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

-- 4. Add plan column if missing
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
-- Add check constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_plan_check'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
      CHECK (plan IN ('free', 'standard', 'enterprise'));
  END IF;
END $$;
