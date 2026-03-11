"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, BarChart3, Lock } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useMonthlyFinancial,
  useTransactionTypeBreakdown,
  useTopProducts,
} from "@/hooks/use-charts";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { Button } from "@/components/ui/button";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const MONTHS_OPTIONS = [
  { value: 6, label: "6 meses" },
  { value: 9, label: "9 meses" },
  { value: 12, label: "12 meses" },
];

function ChartCard({
  title,
  children,
  isLoading,
  isEmpty,
  emptyMessage,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  isLoading: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {actions}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-[13px] text-muted-foreground">
            {emptyMessage ?? "Sem dados para exibir"}
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function MonthlyFinancialChart() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useMonthlyFinancial(months);

  return (
    <ChartCard
      title="Lucros e Gastos por Mês"
      isLoading={isLoading}
      isEmpty={!data || data.length === 0}
      emptyMessage="Nenhuma transação encontrada no período"
      actions={
        <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5">
          {MONTHS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMonths(opt.value)}
              className={`rounded-md cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-colors ${
                months === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data ?? []}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
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
                  netProfit: "Lucro Líquido",
                };
                return [
                  formatCurrency(Number(value ?? 0)),
                  labels[String(name)] ?? String(name),
                ];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  sales: "Vendas",
                  costs: "Custos",
                  netProfit: "Lucro Líquido",
                };
                return labels[value] ?? value;
              }}
            />
            <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="costs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="netProfit" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function TransactionTypePieChart() {
  const { data, isLoading } = useTransactionTypeBreakdown();

  const total = (data ?? []).reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard
      title="Distribuição por Tipo de Transação"
      isLoading={isLoading}
      isEmpty={!data || data.length === 0}
      emptyMessage="Nenhuma transação registrada"
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="h-[250px] w-[250px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data ?? []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {(data ?? []).map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--popover)",
                  color: "var(--popover-foreground)",
                }}
                formatter={(value) => [formatCurrency(Number(value ?? 0))]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3 w-full">
          {(data ?? []).map((item) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
            return (
              <div key={item.name} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium truncate">
                      {item.name}
                    </span>
                    <span className="text-[12px] text-muted-foreground ml-2">
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}

function TopProductsChart() {
  const { data, isLoading } = useTopProducts(8);

  return (
    <ChartCard
      title="Produtos Mais Vendidos (por receita)"
      isLoading={isLoading}
      isEmpty={!data || data.length === 0}
      emptyMessage="Nenhuma venda registrada"
    >
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data ?? []}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                new Intl.NumberFormat("pt-BR", {
                  notation: "compact",
                  compactDisplay: "short",
                }).format(v)
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={120}
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
                if (String(name) === "revenue") return [formatCurrency(Number(value ?? 0)), "Receita"];
                return [String(value ?? 0), "Qtd. vendida"];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value: string) =>
                value === "revenue" ? "Receita" : "Qtd. vendida"
              }
            />
            <Bar
              dataKey="revenue"
              fill="#10b981"
              radius={[0, 4, 4, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function ChartsContent() {
  const { hasFinancialChart, isLoading, planLabel } = usePlanLimits();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasFinancialChart) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gráficos</h1>
          <p className="text-[13px] text-muted-foreground">
            Análise visual do desempenho financeiro e operacional
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-8">
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center max-w-sm space-y-1.5">
              <h2 className="text-base font-semibold">
                Gráficos disponíveis a partir do plano Padrão
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Seu plano atual é <strong>{planLabel}</strong>. Faça upgrade
                para acessar gráficos de lucros e gastos mensais, distribuição
                por tipo de transação e ranking de produtos mais vendidos.
              </p>
            </div>
            <Button asChild size="sm" className="mt-2">
              <Link href="/dashboard/configuracoes">Ver planos e fazer upgrade</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Gráficos</h1>
        <p className="text-[13px] text-muted-foreground">
          Análise visual do desempenho financeiro e operacional
        </p>
      </div>

      <MonthlyFinancialChart />

      <div className="grid gap-6 lg:grid-cols-2">
        <TransactionTypePieChart />
        <TopProductsChart />
      </div>
    </div>
  );
}
