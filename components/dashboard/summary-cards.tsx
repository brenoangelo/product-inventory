"use client";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import type { FinancialSummary } from "@/types/database";
import { formatCurrency } from "@/lib/currency";

interface SummaryCardsProps {
  summary: FinancialSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      title: "Vendas",
      value: formatCurrency(summary.totalSales),
      icon: TrendingUp,
      iconClass: "text-emerald-500",
      valueClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Custos",
      value: formatCurrency(summary.totalCosts),
      icon: TrendingDown,
      iconClass: "text-red-500",
      valueClass: "text-red-600 dark:text-red-400",
    },
    {
      title: "Lucro Líquido",
      value: formatCurrency(summary.netProfit),
      icon: DollarSign,
      iconClass: summary.netProfit >= 0 ? "text-emerald-500" : "text-red-500",
      valueClass:
        summary.netProfit >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
    },
    {
      title: "Custos Extras",
      value: formatCurrency(summary.totalExtraCosts),
      icon: Receipt,
      iconClass: "text-amber-500",
      valueClass: "text-foreground",
    },
    {
      title: "Produtos",
      value: String(summary.totalProducts),
      icon: Package,
      iconClass: "text-primary",
      valueClass: "text-foreground",
    },
    {
      title: "Estoque Baixo",
      value: String(summary.lowStockProducts),
      icon: AlertTriangle,
      iconClass:
        summary.lowStockProducts > 0 ? "text-amber-500" : "text-emerald-500",
      valueClass: "text-foreground",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted-foreground">
              {card.title}
            </span>
            <card.icon className={`h-4 w-4 ${card.iconClass}`} />
          </div>
          <p className={`mt-2 text-2xl font-semibold tracking-tight ${card.valueClass}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
