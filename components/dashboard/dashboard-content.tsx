"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, CalendarDays, Crown } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  subDays,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDashboard, useChartData } from "@/hooks/use-dashboard";
import { useTransactions } from "@/hooks/use-transactions";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { FinancialChart } from "@/components/dashboard/financial-chart";
import { Button } from "@/components/ui/button";
import type { DateRange } from "@/lib/services/dashboard";

type PeriodKey = "month" | "30" | "60" | "90";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "month", label: "Mês Atual" },
  { key: "30", label: "30 dias" },
  { key: "60", label: "60 dias" },
  { key: "90", label: "90 dias" },
];

function buildRange(period: PeriodKey): DateRange {
  const now = new Date();
  if (period === "month") {
    return {
      from: startOfMonth(now).toISOString(),
      to: endOfMonth(now).toISOString(),
    };
  }
  const days = Number(period);
  return {
    from: startOfDay(subDays(now, days)).toISOString(),
    to: endOfDay(now).toISOString(),
  };
}

function periodLabel(period: PeriodKey): string {
  const now = new Date();
  if (period === "month") {
    return format(now, "MMMM 'de' yyyy", { locale: ptBR });
  }
  const from = subDays(now, Number(period));
  return `${format(from, "dd/MM")} – ${format(now, "dd/MM/yyyy")}`;
}

export function DashboardContent() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const range = useMemo(() => buildRange(period), [period]);

  const { data: summary, isLoading, error } = useDashboard(range);
  const { data: result, isLoading: loadingTransactions } = useTransactions({
    pageSize: 5,
    sortBy: "date",
    sortDir: "desc",
  });
  const { data: chartData, isLoading: loadingChart } = useChartData(range);
  const { hasFinancialChart, planLabel } = usePlanLimits();
  const isFree = !hasFinancialChart;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-[13px] text-destructive font-medium">
          Erro ao carregar dados do dashboard.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Verifique sua conexão e tente novamente.
        </p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground">
            Visão geral do seu estoque e fluxo de caixa
          </p>
          <p className="text-[13px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {periodLabel(period)}
          </p>
        </div>
        <div className="flex gap-1.5 rounded-lg border border-border/60 bg-muted/40 p-1">
          {PERIOD_OPTIONS.map((opt) => {
            const locked = isFree && (opt.key === "60" || opt.key === "90");
            return (
              <button
                key={opt.key}
                onClick={() => !locked && setPeriod(opt.key)}
                disabled={locked}
                title={locked ? `Disponível a partir do plano Padrão (atual: ${planLabel})` : undefined}
                className={`rounded-md cursor-pointer px-3 py-1.5 text-[12px] font-medium transition-colors flex items-center gap-1 ${locked
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : period === opt.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {opt.label}
                {locked && <Lock className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </div>

      <SummaryCards summary={summary} />

      {hasFinancialChart ? (
        <FinancialChart data={chartData ?? []} isLoading={loadingChart} />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <h2 className="text-sm font-semibold mb-4">Visão Financeira</h2>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-[13px] text-muted-foreground text-center max-w-xs">
              O gráfico financeiro está disponível nos planos Padrão e
              Empresarial.
            </p>
            <Button asChild size="sm" variant="outline" className="text-[12px]">
              <Link href="/dashboard/configuracoes">Ver planos</Link>
            </Button>
          </div>
        </div>
      )}

      <RecentTransactions
        transactions={result?.data ?? []}
        isLoading={loadingTransactions}
      />
    </div>
  );
}
