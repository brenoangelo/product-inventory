"use client";

import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { useDashboard, useChartData } from "@/hooks/use-dashboard";
import { useTransactions } from "@/hooks/use-transactions";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { FinancialChart } from "@/components/dashboard/financial-chart";
import { Button } from "@/components/ui/button";

export function DashboardContent() {
  const { data: summary, isLoading, error } = useDashboard();
  const { data: result, isLoading: loadingTransactions } = useTransactions({
    pageSize: 5,
    sortBy: "date",
    sortDir: "desc",
  });
  const { data: chartData, isLoading: loadingChart } = useChartData();
  const { hasFinancialChart } = usePlanLimits();

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
