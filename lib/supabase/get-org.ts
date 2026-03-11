import { createClient } from "@/lib/supabase/client";
import type { OrgPlan } from "@/types/database";
import type { User } from "@supabase/supabase-js";

interface AuthenticatedOrg {
  user: User;
  organizationId: string;
  role: string;
  plan: OrgPlan;
}

const CACHE_TTL = 30_000; // 30 seconds
let _cache: { data: AuthenticatedOrg; expiresAt: number } | null = null;
let _inflight: Promise<AuthenticatedOrg> | null = null;

export function invalidateOrgCache() {
  _cache = null;
  _inflight = null;
}

export async function getAuthenticatedOrg(): Promise<AuthenticatedOrg> {
  // Return cached result if still valid
  if (_cache && Date.now() < _cache.expiresAt) {
    return _cache.data;
  }

  // If a fetch is already in-flight, reuse the same promise
  if (_inflight) {
    return _inflight;
  }

  _inflight = _fetchOrg();
  try {
    return await _inflight;
  } finally {
    _inflight = null;
  }
}

async function _fetchOrg(): Promise<AuthenticatedOrg> {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data: memberships, error: memErr } = await client
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1);

  if (memErr) {
    console.error("getAuthenticatedOrg: membership query failed", memErr);
    throw new Error(memErr.message);
  }

  const membership = memberships?.[0];
  if (!membership) throw new Error("Usuário não pertence a nenhuma organização");

  let plan: OrgPlan = "free";
  const { data: orgData, error: orgErr } = await client
    .from("organizations")
    .select("plan")
    .eq("id", membership.organization_id)
    .limit(1);

  if (!orgErr && orgData && orgData.length > 0 && orgData[0]?.plan) {
    plan = orgData[0].plan as OrgPlan;
  }

  const result: AuthenticatedOrg = {
    user,
    organizationId: membership.organization_id as string,
    role: membership.role as string,
    plan,
  };

  _cache = { data: result, expiresAt: Date.now() + CACHE_TTL };
  return result;
}
