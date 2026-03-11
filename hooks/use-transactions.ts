"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TransactionsService,
  type TransactionListParams,
} from "@/lib/services/transactions";
import type { TransactionInsert } from "@/types/database";

const TRANSACTIONS_KEY = ["transactions"];

export function useTransactions(params: TransactionListParams = {}) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, params],
    queryFn: () => TransactionsService.list(params),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transaction: TransactionInsert) =>
      TransactionsService.create(transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TransactionsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
    },
  });
}
