import { createClient } from "@/lib/supabase/client";
import { getPlanLimits } from "@/lib/plans";
import type { OrgPlan } from "@/types/database";

export async function checkProductLimit(organizationId: string, plan: OrgPlan): Promise<void> {
  const limits = getPlanLimits(plan);
  if (limits.maxProducts === null) return;

  const client = createClient();
  const { count } = await client
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if ((count ?? 0) >= limits.maxProducts) {
    throw new Error(
      `Limite de produtos atingido (${limits.maxProducts}). Faça upgrade do plano para adicionar mais produtos.`
    );
  }
}

export async function checkTransactionLimit(organizationId: string, plan: OrgPlan): Promise<void> {
  const limits = getPlanLimits(plan);
  if (limits.maxTransactionsPerMonth === null) return;

  const client = createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { count } = await client
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", startOfMonth)
    .lte("created_at", endOfMonth);

  if ((count ?? 0) >= limits.maxTransactionsPerMonth) {
    throw new Error(
      `Limite de transações do mês atingido (${limits.maxTransactionsPerMonth}). Faça upgrade do plano para registrar mais transações.`
    );
  }
}

export async function checkMemberLimit(organizationId: string, plan: OrgPlan): Promise<void> {
  const limits = getPlanLimits(plan);
  if (limits.maxMembers === null) return;

  const client = createClient();
  const { count } = await client
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if ((count ?? 0) >= limits.maxMembers) {
    throw new Error(
      `Limite de membros atingido (${limits.maxMembers}). Faça upgrade do plano para convidar mais membros.`
    );
  }
}
