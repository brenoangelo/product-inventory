import type { OrgPlan } from "@/types/database";

export interface PlanLimits {
  maxProducts: number | null;
  maxTransactionsPerMonth: number | null;
  maxMembers: number | null;
  financialChart: boolean;
}

export interface PlanInfo {
  key: OrgPlan;
  label: string;
  description: string;
  price: string;
  limits: PlanLimits;
  features: string[];
}

export const PLANS: Record<OrgPlan, PlanInfo> = {
  free: {
    key: "free",
    label: "Gratuito",
    description: "Para quem está começando",
    price: "R$ 0",
    limits: {
      maxProducts: 20,
      maxTransactionsPerMonth: 100,
      maxMembers: 1,
      financialChart: false,
    },
    features: [
      "Até 20 produtos",
      "Até 100 transações/mês",
      "1 membro",
      "Dashboard básico",
    ],
  },
  standard: {
    key: "standard",
    label: "Padrão",
    description: "Para pequenas empresas",
    price: "R$ 49/mês",
    limits: {
      maxProducts: 200,
      maxTransactionsPerMonth: 1000,
      maxMembers: 5,
      financialChart: true,
    },
    features: [
      "Até 200 produtos",
      "Até 1.000 transações/mês",
      "Até 5 membros",
      "Gráfico financeiro",
      "Filtro por criador",
    ],
  },
  enterprise: {
    key: "enterprise",
    label: "Empresarial",
    description: "Para grandes operações",
    price: "R$ 149/mês",
    limits: {
      maxProducts: null,
      maxTransactionsPerMonth: null,
      maxMembers: null,
      financialChart: true,
    },
    features: [
      "Produtos ilimitados",
      "Transações ilimitadas",
      "Membros ilimitados",
      "Gráfico financeiro",
      "Filtro por criador",
      "Suporte prioritário",
    ],
  },
};

export function getPlanLimits(plan: OrgPlan): PlanLimits {
  return PLANS[plan].limits;
}

export function getPlanInfo(plan: OrgPlan): PlanInfo {
  return PLANS[plan];
}

export function formatLimit(value: number | null): string {
  return value === null ? "Ilimitado" : value.toLocaleString("pt-BR");
}
