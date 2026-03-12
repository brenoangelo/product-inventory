"use client";

import { Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartDataPoint } from "@/types/database";
import { formatCurrency } from "@/lib/currency";

interface FinancialChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
}

export function FinancialChart({ data, isLoading }: FinancialChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Visão Financeira</h2>
        <div className="flex items-center justify-center py-12">
          <p className="text-[13px] text-muted-foreground">
            Nenhuma transação registrada para exibir o gráfico
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <h2 className="text-sm font-semibold mb-4">Visão Financeira</h2>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                new Intl.NumberFormat("pt-BR", {
                  notation: "compact",
                  compactDisplay: "short",
                }).format(v)
              }
            />
            <Tooltip
              contentStyle={{
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid var(--border)",
                backgroundColor: "var(--popover)",
                color: "var(--popover-foreground)",
              }}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  sales: "Vendas",
                  costs: "Custos",
                  extraCosts: "Custos Extras",
                  netProfit: "Lucro Líquido",
                };
                return [formatCurrency(Number(value ?? 0)), labels[String(name)] ?? String(name)];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  sales: "Vendas",
                  costs: "Custos",
                  extraCosts: "Custos Extras",
                  netProfit: "Lucro Líquido",
                };
                return labels[value] ?? value;
              }}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="costs"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="extraCosts"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="netProfit"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              strokeDasharray="5 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
