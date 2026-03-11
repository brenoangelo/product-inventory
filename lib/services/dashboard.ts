import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedOrg } from "@/lib/supabase/get-org";
import { format } from "date-fns";
import type { FinancialSummary, ChartDataPoint } from "@/types/database";

export const DashboardService = {
  async getSummary(): Promise<FinancialSummary> {
    const client = createClient();
    const { organizationId } = await getAuthenticatedOrg();

    const [productsRes, transactionsRes] = await Promise.all([
      client.from("products").select("*").eq("organization_id", organizationId),
      client.from("transactions").select("*").eq("organization_id", organizationId),
    ]);

    if (productsRes.error) throw new Error(productsRes.error.message);
    if (transactionsRes.error) throw new Error(transactionsRes.error.message);

    const products = productsRes.data ?? [];
    const transactions = transactionsRes.data ?? [];

    const totalSales = transactions
      .filter((t) => t.type === "sale")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExtraCosts = transactions
      .filter((t) => t.type === "extra_cost")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalReplenishment = transactions
      .filter((t) => t.type === "stock_replenishment")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalCosts = totalReplenishment + totalExtraCosts;
    const netProfit = totalSales - totalCosts;

    const lowStockProducts = products.filter(
      (p) => p.stock_quantity <= 5
    ).length;

    return {
      totalSales,
      totalCosts,
      totalExtraCosts,
      netProfit,
      totalProducts: products.length,
      lowStockProducts,
    };
  },

  async getChartData(): Promise<ChartDataPoint[]> {
    const client = createClient();
    const { organizationId } = await getAuthenticatedOrg();

    const { data, error } = await client
      .from("transactions")
      .select("type, amount, date")
      .eq("organization_id", organizationId)
      .order("date", { ascending: true });

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    const grouped = new Map<
      string,
      { sales: number; costs: number; extraCosts: number }
    >();

    for (const t of data) {
      const day = format(new Date(t.date), "dd/MM");
      const entry = grouped.get(day) ?? {
        sales: 0,
        costs: 0,
        extraCosts: 0,
      };

      const amount = Number(t.amount);
      if (t.type === "sale") entry.sales += amount;
      else if (t.type === "stock_replenishment") {
        entry.costs += amount;
      } else if (t.type === "extra_cost") {
        entry.costs += amount;
        entry.extraCosts += amount;
      }

      grouped.set(day, entry);
    }

    return Array.from(grouped.entries()).map(([date, vals]) => ({
      date,
      sales: Number(vals.sales.toFixed(2)),
      costs: Number(vals.costs.toFixed(2)),
      extraCosts: Number(vals.extraCosts.toFixed(2)),
      netProfit: Number((vals.sales - vals.costs).toFixed(2)),
    }));
  },
};
