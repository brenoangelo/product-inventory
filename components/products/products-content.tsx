"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/use-products";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import type { Product } from "@/types/database";
import type { ProductFormData } from "@/lib/validations/product";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { ProductForm } from "./product-form";
import { PlanLimitBanner } from "@/components/ui/plan-limit-banner";

type SortKey = "stock_quantity" | "cost_price" | "sale_price" | "margin" | "expiry_date";
type SortDir = "asc" | "desc";

function getMargin(p: Product) {
  return p.sale_price > 0
    ? ((p.sale_price - p.cost_price) / p.sale_price) * 100
    : 0;
}

export function ProductsContent() {
  const { data: products, isLoading, error } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { canCreateProduct, productsLabel } = usePlanLimits();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    const term = search.toLowerCase().trim();
    let result = products;

    if (term) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.brand && p.brand.toLowerCase().includes(term))
      );
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let av: number;
        let bv: number;

        switch (sortKey) {
          case "stock_quantity":
            av = a.stock_quantity;
            bv = b.stock_quantity;
            break;
          case "cost_price":
            av = a.cost_price;
            bv = b.cost_price;
            break;
          case "sale_price":
            av = a.sale_price;
            bv = b.sale_price;
            break;
          case "margin":
            av = getMargin(a);
            bv = getMargin(b);
            break;
          case "expiry_date":
            av = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
            bv = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
            break;
        }

        return sortDir === "asc" ? av - bv : bv - av;
      });
    }

    return result;
  }, [products, search, sortKey, sortDir]);

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  }

  function handleNew() {
    setEditingProduct(undefined);
    setDialogOpen(true);
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Produto excluído com sucesso!");
    } catch {
      toast.error("Erro ao excluir produto.");
    }
  }

  async function handleSubmit(data: ProductFormData) {
    try {
      const payload = {
        ...data,
        description: data.description || null,
        brand: data.brand || null,
        expiry_date: data.expiry_date || null,
      };

      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          data: payload,
        });
        toast.success("Produto atualizado com sucesso!");
      } else {
        await createProduct.mutateAsync(payload);
        toast.success("Produto criado com sucesso!");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar produto.");
    }
  }

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
          Erro ao carregar produtos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-[13px] text-muted-foreground">
            Gerencie seu catálogo de produtos ({productsLabel})
          </p>
        </div>
        <Button size="sm" onClick={handleNew} disabled={!canCreateProduct}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {!canCreateProduct && (
        <div className="mt-3">
          <PlanLimitBanner message="Você atingiu o limite de produtos do seu plano. Faça upgrade para cadastrar mais." />
        </div>
      )}

      {!products || products.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border/60 bg-card">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Nenhum produto cadastrado</p>
            <p className="text-[13px] text-muted-foreground mt-1 mb-4">
              Comece adicionando seu primeiro produto
            </p>
            <Button size="sm" onClick={handleNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar Produto
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-[13px]"
            />
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[13px]">Nome</TableHead>
                    <TableHead className="text-[13px]">Marca</TableHead>
                    <TableHead
                      className="text-[13px] text-right cursor-pointer select-none"
                      onClick={() => toggleSort("stock_quantity")}
                    >
                      Estoque
                      <SortIcon column="stock_quantity" />
                    </TableHead>
                    <TableHead
                      className="text-[13px] text-right cursor-pointer select-none"
                      onClick={() => toggleSort("cost_price")}
                    >
                      Custo
                      <SortIcon column="cost_price" />
                    </TableHead>
                    <TableHead
                      className="text-[13px] text-right cursor-pointer select-none"
                      onClick={() => toggleSort("sale_price")}
                    >
                      Venda
                      <SortIcon column="sale_price" />
                    </TableHead>
                    <TableHead
                      className="text-[13px] text-right cursor-pointer select-none"
                      onClick={() => toggleSort("margin")}
                    >
                      Margem
                      <SortIcon column="margin" />
                    </TableHead>
                    <TableHead
                      className="text-[13px] cursor-pointer select-none"
                      onClick={() => toggleSort("expiry_date")}
                    >
                      Validade
                      <SortIcon column="expiry_date" />
                    </TableHead>
                    <TableHead className="text-[13px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-[13px] text-muted-foreground py-10"
                      >
                        Nenhum produto encontrado para &quot;{search}&quot;
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const margin = getMargin(product).toFixed(1);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="text-[13px] font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell className="text-[13px] text-muted-foreground">
                            {product.brand || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                product.stock_quantity <= 5
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs tabular-nums"
                            >
                              {product.stock_quantity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums">
                            {formatCurrency(product.cost_price)}
                          </TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums">
                            {formatCurrency(product.sale_price)}
                          </TableCell>
                          <TableCell className="text-[13px] text-right tabular-nums">
                            <span
                              className={
                                Number(margin) >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }
                            >
                              {margin}%
                            </span>
                          </TableCell>
                          <TableCell className="text-[13px] text-muted-foreground">
                            {product.expiry_date
                              ? format(new Date(product.expiry_date), "dd/MM/yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleEdit(product)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDelete(product.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </SheetTitle>
            <SheetDescription>
              {editingProduct
                ? "Atualize as informações do produto"
                : "Preencha os dados do novo produto"}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <ProductForm
              key={editingProduct?.id ?? "new"}
              product={editingProduct}
              onSubmit={handleSubmit}
              isLoading={
                createProduct.isPending || updateProduct.isPending
              }
              onCancel={() => setDialogOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
