"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardService, type DateRange } from "@/lib/services/dashboard";

export function useDashboard(range: DateRange) {
  return useQuery({
    queryKey: ["dashboard", range.from, range.to],
    queryFn: () => DashboardService.getSummary(range),
  });
}

export function useChartData(range: DateRange) {
  return useQuery({
    queryKey: ["dashboard", "chart", range.from, range.to],
    queryFn: () => DashboardService.getChartData(range),
  });
}
