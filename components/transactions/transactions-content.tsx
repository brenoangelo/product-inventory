"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Trash2,
  Loader2,
  ArrowLeftRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import {
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
} from "@/hooks/use-transactions";
import { useProducts } from "@/hooks/use-products";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import type { TransactionType } from "@/types/database";
import type { TransactionListParams } from "@/lib/services/transactions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionForm, type TransactionFormPayload } from "./transaction-form";
import { PlanLimitBanner } from "@/components/ui/plan-limit-banner";
import { formatCurrency, toCents, fromCents } from "@/lib/currency";

type SortKey = "amount" | "quantity" | "date";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

export function TransactionsContent() {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<TransactionType | "">("");
  const [search, setSearch] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const params: TransactionListParams = {
    page,
    pageSize: PAGE_SIZE,
    type: filterType || undefined,
    search: search || undefined,
    createdBy: createdBy || undefined,
    sortBy,
    sortDir,
  };

  const { data: result, isLoading, error } = useTransactions(params);
  const { data: products } = useProducts();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const { canCreateTransaction, transactionsLabel } = usePlanLimits();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const transactions = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortBy !== column)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  }

  function handleFilterChange() {
    setPage(1);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteTransaction.mutateAsync(deleteId);
      toast.success("Transação excluída com sucesso!");
    } catch {
      toast.error("Erro ao excluir transação.");
    } finally {
      setDeleteId(null);
    }
  }

  async function handleSubmit(data: TransactionFormPayload) {
    try {
      const isoDate = data.date ? new Date(data.date).toISOString() : undefined;

      if (data.items.length === 0) {
        // extra_cost — single transaction without product
        await createTransaction.mutateAsync({
          type: data.type,
          amount: data.amount ?? 0,
          description: data.description || null,
          product_id: null,
          date: isoDate,
        });
      } else {
        // Create one transaction per product line
        for (const item of data.items) {
          const totalCents = toCents(item.unit_price) * item.quantity;
          await createTransaction.mutateAsync({
            type: data.type,
            amount: fromCents(totalCents),
            quantity: item.quantity,
            cost_price: item.cost_price,
            description: data.description || null,
            product_id: item.product_id,
            date: isoDate,
          });
        }
      }

      const count = Math.max(data.items.length, 1);
      toast.success(
        count > 1
          ? `${count} transações registradas com sucesso!`
          : "Transação registrada com sucesso!"
      );
      setDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao registrar transação."
      );
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-[13px] text-destructive font-medium">
          Erro ao carregar transações.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Transações</h1>
          <p className="text-[13px] text-muted-foreground">
            Registre vendas, reposições e custos extras ({transactionsLabel} este mês)
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!canCreateTransaction}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {!canCreateTransaction && (
        <div className="mt-3">
          <PlanLimitBanner message="Você atingiu o limite de transações do mês no seu plano. Faça upgrade para registrar mais." />
        </div>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              handleFilterChange();
            }}
            className="pl-9 h-9 text-[13px]"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(v) => {
            setFilterType(v === "all" ? "" : (v as TransactionType));
            handleFilterChange();
          }}
        >
          <SelectTrigger className="h-9 w-[160px] text-[13px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="sale">Venda</SelectItem>
            <SelectItem value="extra_cost">Custo Extra</SelectItem>
            <SelectItem value="stock_replenishment">Reposição</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative min-w-[160px] max-w-[220px]">
          <Input
            placeholder="Filtrar por criador..."
            value={createdBy}
            onChange={(e) => {
              setCreatedBy(e.target.value);
              handleFilterChange();
            }}
            className="h-9 text-[13px]"
          />
        </div>

        {(search || filterType || createdBy) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFilterType("");
              setCreatedBy("");
              setPage(1);
            }}
            className="text-[13px] text-muted-foreground"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 && !search && !filterType && !createdBy ? (
        <div className="mt-4 rounded-xl border border-border/60 bg-card">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
              <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Nenhuma transação registrada</p>
            <p className="text-[13px] text-muted-foreground mt-1 mb-4">
              Comece registrando uma venda ou custo
            </p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Registrar Transação
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[13px]">Tipo</TableHead>
                    <TableHead className="text-[13px]">Descrição</TableHead>
                    <TableHead className="text-[13px]">Produto</TableHead>
                    <TableHead
                      className="text-[13px] text-right cursor-pointer select-none"
                      onClick={() => toggleSort("amount")}
                    >
                      Valor
                      <SortIcon column="amount" />
                    </TableHead>
                    <TableHead
                      className="text-[13px] text-right cursor-pointer select-none"
                      onClick={() => toggleSort("quantity")}
                    >
                      Qtd
                      <SortIcon column="quantity" />
                    </TableHead>
                    <TableHead
                      className="text-[13px] cursor-pointer select-none"
                      onClick={() => toggleSort("date")}
                    >
                      Data
                      <SortIcon column="date" />
                    </TableHead>
                    <TableHead className="text-[13px]">Criado por</TableHead>
                    <TableHead className="text-[13px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-[13px] text-muted-foreground py-10"
                      >
                        Nenhuma transação encontrada com os filtros atuais
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge
                            variant={
                              t.type === "sale"
                                ? "secondary"
                                : t.type === "stock_replenishment"
                                  ? "outline"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {t.type === "sale"
                              ? "Venda"
                              : t.type === "stock_replenishment"
                                ? "Reposição"
                                : "Custo Extra"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {t.description || "—"}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {t.products?.name || "—"}
                        </TableCell>
                        <TableCell className="text-[13px] text-right tabular-nums">
                          <span
                            className={
                              t.type === "sale"
                                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                : t.type === "stock_replenishment"
                                  ? "text-blue-600 dark:text-blue-400 font-medium"
                                  : "text-red-600 dark:text-red-400 font-medium"
                            }
                          >
                            {t.type === "sale" ? "+" : "\u2212"}
                            {formatCurrency(Number(t.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="text-[13px] text-right tabular-nums text-muted-foreground">
                          {t.quantity}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground tabular-nums">
                          {format(new Date(t.date), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {t.created_by || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteId(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between text-[13px]">
            <p className="text-muted-foreground">
              {totalCount} transaç{totalCount !== 1 ? "ões" : "ão"} · Página{" "}
              {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Nova Transação</SheetTitle>
            <SheetDescription>
              Registre uma venda, reposição ou custo extra
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <TransactionForm
              products={products ?? []}
              onSubmit={handleSubmit}
              isLoading={createTransaction.isPending}
              onCancel={() => setDialogOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
              </div>
              <DialogTitle>Excluir transação</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-[13px]">
              Tem certeza que deseja excluir esta transação? Essa ação pode
              impactar os dados financeiros do dashboard, incluindo vendas,
              custos e lucro líquido.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteTransaction.isPending}
              onClick={confirmDelete}
            >
              {deleteTransaction.isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
