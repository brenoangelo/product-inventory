"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanLimitBannerProps {
  message: string;
}

export function PlanLimitBanner({ message }: PlanLimitBannerProps) {
  return (
    <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-950/30 p-3 flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-[12px] text-amber-800 dark:text-amber-200 flex-1">
        {message}
      </p>
      <Button asChild size="sm" variant="outline" className="shrink-0 text-[12px] h-7">
        <Link href="/dashboard/configuracoes">Ver planos</Link>
      </Button>
    </div>
  );
}
