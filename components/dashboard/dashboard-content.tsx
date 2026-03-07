"use client";

import { Loader2 } from "lucide-react";
import { useDashboard, useChartData } from "@/hooks/use-dashboard";
import { useTransactions } from "@/hooks/use-transactions";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { FinancialChart } from "@/components/dashboard/financial-chart";

export function DashboardContent() {
  const { data: summary, isLoading, error } = useDashboard();
  const { data: result, isLoading: loadingTransactions } = useTransactions({
    pageSize: 5,
    sortBy: "date",
    sortDir: "desc",
  });
  const { data: chartData, isLoading: loadingChart } = useChartData();

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
      <FinancialChart data={chartData ?? []} isLoading={loadingChart} />
      <RecentTransactions
        transactions={result?.data ?? []}
        isLoading={loadingTransactions}
      />
    </div>
  );
}
