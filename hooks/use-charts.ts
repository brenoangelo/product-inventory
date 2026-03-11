"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartsService } from "@/lib/services/charts";

export function useMonthlyFinancial(months = 6) {
  return useQuery({
    queryKey: ["charts", "monthly-financial", months],
    queryFn: () => ChartsService.getMonthlyFinancial(months),
  });
}

export function useTransactionTypeBreakdown() {
  return useQuery({
    queryKey: ["charts", "transaction-type-breakdown"],
    queryFn: ChartsService.getTransactionTypeBreakdown,
  });
}

export function useTopProducts(limit = 8) {
  return useQuery({
    queryKey: ["charts", "top-products", limit],
    queryFn: () => ChartsService.getTopProducts(limit),
  });
}
