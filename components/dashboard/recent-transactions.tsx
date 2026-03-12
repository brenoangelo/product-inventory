"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { TransactionWithProduct } from "@/types/database";
import { formatCurrency } from "@/lib/currency";

interface RecentTransactionsProps {
  transactions: TransactionWithProduct[];
  isLoading: boolean;
}

export function RecentTransactions({
  transactions,
  isLoading,
}: RecentTransactionsProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold">Transações Recentes</h3>
      </div>

      <div className="border-t border-border/40">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-[13px] text-muted-foreground py-10">
            Nenhuma transação registrada ainda.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      t.type === "sale"
                        ? "bg-emerald-50 dark:bg-emerald-950/30"
                        : "bg-red-50 dark:bg-red-950/30"
                    }`}
                  >
                    {t.type === "sale" ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">
                      {t.description || t.products?.name || "Sem descrição"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.date), "dd MMM, HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[13px] font-semibold tabular-nums ${
                    t.type === "sale"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {t.type === "sale" ? "+" : "−"}
                  {formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
