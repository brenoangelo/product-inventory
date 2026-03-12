import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedOrg } from "@/lib/supabase/get-org";
import { format } from "date-fns";
import { toMoney } from "@/lib/utils";
import type { FinancialSummary, ChartDataPoint } from "@/types/database";

export interface DateRange {
  from: string; // ISO string
  to: string;   // ISO string
}

export const DashboardService = {
  async getSummary(range: DateRange): Promise<FinancialSummary> {
    const client = createClient();
    const { organizationId } = await getAuthenticatedOrg();

    const [productsRes, transactionsRes] = await Promise.all([
      client.from("products").select("*").eq("organization_id", organizationId),
      client
        .from("transactions")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("date", range.from)
        .lte("date", range.to),
    ]);

    if (productsRes.error) throw new Error(productsRes.error.message);
    if (transactionsRes.error) throw new Error(transactionsRes.error.message);

    const products = productsRes.data ?? [];
    const transactions = transactionsRes.data ?? [];

    const totalSales = toMoney(
      transactions
        .filter((t) => t.type === "sale")
        .reduce((sum, t) => sum + Number(t.amount), 0)
    );

    const totalExtraCosts = toMoney(
      transactions
        .filter((t) => t.type === "extra_cost")
        .reduce((sum, t) => sum + Number(t.amount), 0)
    );

    const totalReplenishment = toMoney(
      transactions
        .filter((t) => t.type === "stock_replenishment")
        .reduce((sum, t) => sum + Number(t.amount), 0)
    );

    const totalCosts = toMoney(totalReplenishment + totalExtraCosts);
    const netProfit = toMoney(totalSales - totalCosts);

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

  async getChartData(range: DateRange): Promise<ChartDataPoint[]> {
    const client = createClient();
    const { organizationId } = await getAuthenticatedOrg();

    const { data, error } = await client
      .from("transactions")
      .select("type, amount, date")
      .eq("organization_id", organizationId)
      .gte("date", range.from)
      .lte("date", range.to)
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

      const amount = toMoney(Number(t.amount));
      if (t.type === "sale") entry.sales = toMoney(entry.sales + amount);
      else if (t.type === "stock_replenishment") {
        entry.costs = toMoney(entry.costs + amount);
      } else if (t.type === "extra_cost") {
        entry.costs = toMoney(entry.costs + amount);
        entry.extraCosts = toMoney(entry.extraCosts + amount);
      }

      grouped.set(day, entry);
    }

    return Array.from(grouped.entries()).map(([date, vals]) => ({
      date,
      sales: vals.sales,
      costs: vals.costs,
      extraCosts: vals.extraCosts,
      netProfit: toMoney(vals.sales - vals.costs),
    }));
  },
};
