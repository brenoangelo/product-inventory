import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedOrg } from "@/lib/supabase/get-org";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface MonthlyFinancial {
  month: string;
  sales: number;
  costs: number;
  netProfit: number;
}

export interface TransactionTypeBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface TopProduct {
  name: string;
  revenue: number;
  quantity: number;
}

export const ChartsService = {
  async getMonthlyFinancial(months = 6): Promise<MonthlyFinancial[]> {
    const client = createClient();
    const { organizationId } = await getAuthenticatedOrg();

    const now = new Date();
    const from = startOfMonth(subMonths(now, months - 1));
    const to = endOfMonth(now);

    const { data, error } = await client
      .from("transactions")
      .select("type, amount, date")
      .eq("organization_id", organizationId)
      .gte("date", from.toISOString())
      .lte("date", to.toISOString())
      .order("date", { ascending: true });

    if (error) throw new Error(error.message);

    const grouped = new Map<string, { sales: number; costs: number }>();

    // Pre-fill all months
    for (let i = months - 1; i >= 0; i--) {
      const m = subMonths(now, i);
      const key = format(m, "yyyy-MM");
      grouped.set(key, { sales: 0, costs: 0 });
    }

    for (const t of data ?? []) {
      const key = format(new Date(t.date), "yyyy-MM");
      const entry = grouped.get(key);
      if (!entry) continue;

      const amount = Number(t.amount);
      if (t.type === "sale") {
        entry.sales += amount;
      } else {
        entry.costs += amount;
      }
    }

    return Array.from(grouped.entries()).map(([key, vals]) => ({
      month: format(new Date(key + "-01"), "MMM/yy", { locale: ptBR }),
      sales: Number(vals.sales.toFixed(2)),
      costs: Number(vals.costs.toFixed(2)),
      netProfit: Number((vals.sales - vals.costs).toFixed(2)),
    }));
  },

  async getTransactionTypeBreakdown(): Promise<TransactionTypeBreakdown[]> {
    const client = createClient();
    const { organizationId } = await getAuthenticatedOrg();

    const now = new Date();
    const from = startOfMonth(subMonths(now, 5));
    const to = endOfMonth(now);

    const { data, error } = await client
      .from("transactions")
      .select("type, amount")
      .eq("organization_id", organizationId)
      .gte("date", from.toISOString())
      .lte("date", to.toISOString());

    if (error) throw new Error(error.message);

    const totals = { sale: 0, extra_cost: 0, stock_replenishment: 0 };

    for (const t of data ?? []) {
      const amount = Number(t.amount);
      if (t.type in totals) {
        totals[t.type as keyof typeof totals] += amount;
      }
    }

    return [
      { name: "Vendas", value: Number(totals.sale.toFixed(2)), color: "#10b981" },
      { name: "Custos Extras", value: Number(totals.extra_cost.toFixed(2)), color: "#ef4444" },
      { name: "Reposição", value: Number(totals.stock_replenishment.toFixed(2)), color: "#f59e0b" },
    ].filter((item) => item.value > 0);
  },

  async getTopProducts(limit = 8): Promise<TopProduct[]> {
    const client = createClient();
    const { organizationId } = await getAuthenticatedOrg();

    const { data: transactions, error: txErr } = await client
      .from("transactions")
      .select("product_id, amount, quantity")
      .eq("organization_id", organizationId)
      .eq("type", "sale")
      .not("product_id", "is", null);

    if (txErr) throw new Error(txErr.message);

    const { data: products, error: prodErr } = await client
      .from("products")
      .select("id, name")
      .eq("organization_id", organizationId);

    if (prodErr) throw new Error(prodErr.message);

    const productMap = new Map<string, string>();
    for (const p of products ?? []) {
      productMap.set(p.id, p.name);
    }

    const agg = new Map<string, { revenue: number; quantity: number }>();
    for (const t of transactions ?? []) {
      if (!t.product_id) continue;
      const entry = agg.get(t.product_id) ?? { revenue: 0, quantity: 0 };
      entry.revenue += Number(t.amount);
      entry.quantity += Number(t.quantity ?? 1);
      agg.set(t.product_id, entry);
    }

    return Array.from(agg.entries())
      .map(([id, vals]) => ({
        name: productMap.get(id) ?? "Produto removido",
        revenue: Number(vals.revenue.toFixed(2)),
        quantity: vals.quantity,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },
};
