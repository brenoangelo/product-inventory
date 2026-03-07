"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardService } from "@/lib/services/dashboard";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: DashboardService.getSummary,
  });
}

export function useChartData() {
  return useQuery({
    queryKey: ["dashboard", "chart"],
    queryFn: DashboardService.getChartData,
  });
}
