"use client";

import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/use-organization";
import { getPlanLimits, formatLimit, getPlanInfo } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";
import type { PlanLimits } from "@/lib/plans";

export interface PlanUsage {
  products: number;
  transactionsThisMonth: number;
  members: number;
}

export interface PlanLimitsState {
  limits: PlanLimits;
  usage: PlanUsage;
  isLoading: boolean;
  canCreateProduct: boolean;
  canCreateTransaction: boolean;
  canInviteMember: boolean;
  hasFinancialChart: boolean;
  planLabel: string;
  productsLabel: string;
  transactionsLabel: string;
  membersLabel: string;
}

async function fetchUsage(organizationId: string): Promise<PlanUsage> {
  const client = createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [productsRes, transactionsRes, membersRes] = await Promise.all([
    client
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    client
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", startOfMonth)
      .lte("created_at", endOfMonth),
    client
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  return {
    products: productsRes.count ?? 0,
    transactionsThisMonth: transactionsRes.count ?? 0,
    members: membersRes.count ?? 0,
  };
}

export function usePlanLimits(): PlanLimitsState {
  const { organization, isLoading: orgLoading } = useOrganization();

  const plan = organization?.plan ?? "free";
  const limits = getPlanLimits(plan);
  const info = getPlanInfo(plan);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["plan-usage", organization?.id],
    queryFn: () => fetchUsage(organization!.id),
    enabled: !!organization,
    staleTime: 30 * 1000,
  });

  const safeUsage: PlanUsage = usage ?? { products: 0, transactionsThisMonth: 0, members: 0 };

  const canCreateProduct =
    limits.maxProducts === null || safeUsage.products < limits.maxProducts;

  const canCreateTransaction =
    limits.maxTransactionsPerMonth === null ||
    safeUsage.transactionsThisMonth < limits.maxTransactionsPerMonth;

  const canInviteMember =
    limits.maxMembers === null || safeUsage.members < limits.maxMembers;

  return {
    limits,
    usage: safeUsage,
    isLoading: orgLoading || usageLoading,
    canCreateProduct,
    canCreateTransaction,
    canInviteMember,
    hasFinancialChart: limits.financialChart,
    planLabel: info.label,
    productsLabel: `${safeUsage.products} / ${formatLimit(limits.maxProducts)}`,
    transactionsLabel: `${safeUsage.transactionsThisMonth} / ${formatLimit(limits.maxTransactionsPerMonth)}`,
    membersLabel: `${safeUsage.members} / ${formatLimit(limits.maxMembers)}`,
  };
}
