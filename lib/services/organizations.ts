import { createClient } from "@/lib/supabase/client";
import { invalidateOrgCache } from "@/lib/supabase/get-org";
import { checkMemberLimit } from "@/lib/services/plan-checks";
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberWithEmail,
  Invitation,
  MemberRole,
  OrgPlan,
} from "@/types/database";

export const OrganizationsService = {
  async getCurrent(): Promise<{
    organization: Organization;
    membership: OrganizationMember;
  } | null> {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return null;

    const { data: memberships, error: memErr } = await client
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);

    if (memErr) {
      console.error("getCurrent: membership query failed", memErr);
      return null;
    }

    const membership = memberships?.[0];
    if (!membership) return null;

    const { data: orgs, error: orgErr } = await client
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .limit(1);

    if (orgErr) {
      console.error("getCurrent: organization query failed", orgErr);
      return null;
    }

    const org = orgs?.[0];
    if (!org) return null;

    return {
      organization: org as Organization,
      membership: {
        id: membership.id,
        organization_id: membership.organization_id,
        user_id: membership.user_id,
        role: membership.role,
        created_at: membership.created_at,
      },
    };
  },

  async create(name: string): Promise<Organization> {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data: org, error: orgError } = await client
      .from("organizations")
      .insert({ name })
      .select()
      .single();

    if (orgError) throw new Error(orgError.message);

    const { error: memberError } = await client
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) throw new Error(memberError.message);

    invalidateOrgCache();
    return org;
  },

  async update(
    id: string,
    data: { name: string }
  ): Promise<Organization> {
    const client = createClient();
    const { data: org, error } = await client
      .from("organizations")
      .update({ name: data.name, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    invalidateOrgCache();
    return org;
  },

  async listMembers(
    organizationId: string
  ): Promise<OrganizationMemberWithEmail[]> {
    const client = createClient();
    const { data, error } = await client
      .from("organization_members")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const members: OrganizationMemberWithEmail[] = [];
    for (const member of data ?? []) {
      const { data: userData } = await client
        .from("organization_members")
        .select("user_id")
        .eq("id", member.id)
        .single();

      members.push({
        ...member,
        email: userData?.user_id ?? member.user_id,
      });
    }

    return data as unknown as OrganizationMemberWithEmail[];
  },

  async updateMemberRole(
    memberId: string,
    role: MemberRole
  ): Promise<void> {
    const client = createClient();
    const { error } = await client
      .from("organization_members")
      .update({ role })
      .eq("id", memberId);

    if (error) throw new Error(error.message);
  },

  async removeMember(memberId: string): Promise<void> {
    const client = createClient();
    const { error } = await client
      .from("organization_members")
      .delete()
      .eq("id", memberId);

    if (error) throw new Error(error.message);
  },

  async invite(
    organizationId: string,
    email: string,
    role: MemberRole = "member"
  ): Promise<Invitation> {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Fetch org plan to check member limit
    const { data: org } = await client
      .from("organizations")
      .select("plan")
      .eq("id", organizationId)
      .single();

    await checkMemberLimit(organizationId, (org?.plan as OrgPlan) ?? "free");

    const { data, error } = await client
      .from("invitations")
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Este email já foi convidado para esta organização.");
      }
      throw new Error(error.message);
    }
    return data;
  },

  async listInvitations(organizationId: string): Promise<Invitation[]> {
    const client = createClient();
    const { data, error } = await client
      .from("invitations")
      .select("*")
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    const client = createClient();
    const { error } = await client
      .from("invitations")
      .delete()
      .eq("id", invitationId);

    if (error) throw new Error(error.message);
  },

  async acceptInvitation(token: string): Promise<void> {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data: invitation, error: fetchError } = await client
      .from("invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .single();

    if (fetchError || !invitation) {
      throw new Error("Convite não encontrado ou já utilizado.");
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error("Este convite expirou.");
    }

    if (invitation.email !== user.email) {
      throw new Error("Este convite foi enviado para outro email.");
    }

    const { error: memberError } = await client
      .from("organization_members")
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError) {
      if (memberError.code === "23505") {
        throw new Error("Você já faz parte desta organização.");
      }
      throw new Error(memberError.message);
    }

    await client
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);
  },

  async getPendingInviteForUser(): Promise<Invitation | null> {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user?.email) return null;

    const { data } = await client
      .from("invitations")
      .select("*")
      .eq("email", user.email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    return data;
  },
};
