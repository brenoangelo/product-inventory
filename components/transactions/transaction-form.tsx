"use client";

import { useState, useCallback } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, TransactionType } from "@/types/database";
import { formatCurrency, toCents, fromCents } from "@/lib/currency";

export interface TransactionItemLine {
  product_id: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
}

export interface TransactionFormPayload {
  type: TransactionType;
  description: string;
  date: string;
  items: TransactionItemLine[];
  amount?: number;
}

interface TransactionFormProps {
  products: Product[];
  onSubmit: (data: TransactionFormPayload) => void;
  isLoading: boolean;
  onCancel: () => void;
}

const EMPTY_ITEM: TransactionItemLine = {
  product_id: "",
  quantity: 1,
  unit_price: 0,
};

export function TransactionForm({
  products,
  onSubmit,
  isLoading,
  onCancel,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>("sale");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [items, setItems] = useState<TransactionItemLine[]>([{ ...EMPTY_ITEM }]);
  const [extraCostAmount, setExtraCostAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showProducts = type === "sale" || type === "stock_replenishment";

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  function updateItem(index: number, patch: Partial<TransactionItemLine>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleProductChange(index: number, productId: string) {
    const product = getProduct(productId);
    if (!product) return;

    const price =
      type === "sale" ? product.sale_price : product.cost_price;

    updateItem(index, {
      product_id: productId,
      quantity: 1,
      unit_price: price,
      cost_price: type === "stock_replenishment" ? product.cost_price : undefined,
    });
  }

  function handleQuantityChange(index: number, qty: number) {
    updateItem(index, { quantity: qty });
  }

  function handleUnitPriceChange(index: number, price: number) {
    updateItem(index, { unit_price: price });
  }

  function handleCostPriceChange(index: number, cost: number) {
    const item = items[index];
    updateItem(index, {
      cost_price: cost,
      unit_price: cost,
    });
  }

  function getItemTotal(item: TransactionItemLine): number {
    return fromCents(toCents(item.unit_price) * item.quantity);
  }

  const grandTotal = showProducts
    ? items.reduce((sum, item) => sum + toCents(item.unit_price) * item.quantity, 0)
    : toCents(parseFloat(extraCostAmount) || 0);

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (showProducts) {
      if (items.length === 0) {
        errs.items = "Adicione pelo menos um produto.";
      }
      items.forEach((item, i) => {
        if (!item.product_id) {
          errs[`item_${i}_product`] = "Selecione um produto.";
        }
        if (item.quantity < 1) {
          errs[`item_${i}_qty`] = "Mínimo 1.";
        }
        if (type === "sale") {
          const product = getProduct(item.product_id);
          if (product && item.quantity > product.stock_quantity) {
            errs[`item_${i}_qty`] = `Estoque: ${product.stock_quantity}`;
          }
        }
        if (item.unit_price <= 0) {
          errs[`item_${i}_price`] = "Valor inválido.";
        }
      });
      // Check duplicate products
      const productIds = items.map((i) => i.product_id).filter(Boolean);
      const dupes = productIds.filter((id, idx) => productIds.indexOf(id) !== idx);
      if (dupes.length > 0) {
        dupes.forEach((id) => {
          const idx = items.findIndex((i) => i.product_id === id);
          errs[`item_${idx}_product`] = "Produto duplicado.";
        });
      }
    } else {
      const amt = parseFloat(extraCostAmount);
      if (!amt || amt <= 0) {
        errs.amount = "Valor deve ser positivo.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (showProducts) {
      onSubmit({
        type,
        description,
        date,
        items,
      });
    } else {
      onSubmit({
        type,
        description,
        date,
        items: [],
        amount: parseFloat(extraCostAmount),
      });
    }
  }

  // Products already used in other lines (for filtering)
  function usedProductIds(excludeIndex: number): Set<string> {
    return new Set(
      items.filter((_, i) => i !== excludeIndex).map((i) => i.product_id).filter(Boolean)
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col h-full">
      <div className="flex-1 space-y-4">
        {/* Type */}
        <div className="space-y-1.5">
          <Label className="text-[13px]">Tipo *</Label>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as TransactionType);
              setItems([{ ...EMPTY_ITEM }]);
              setExtraCostAmount("");
              setErrors({});
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">Venda</SelectItem>
              <SelectItem value="extra_cost">Custo Extra</SelectItem>
              <SelectItem value="stock_replenishment">Reposição de Estoque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-[13px]">Descrição</Label>
          <Input
            placeholder="Descrição opcional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label className="text-[13px]">Data</Label>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Extra cost: single amount */}
        {type === "extra_cost" && (
          <div className="space-y-1.5">
            <Label className="text-[13px]">Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={extraCostAmount}
              onChange={(e) => setExtraCostAmount(e.target.value)}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount}</p>
            )}
          </div>
        )}

        {/* Product lines */}
        {showProducts && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[13px] font-medium">Produtos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addItem}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>

            {items.map((item, index) => {
              const product = getProduct(item.product_id);
              const used = usedProductIds(index);
              const itemTotal = getItemTotal(item);

              return (
                <div
                  key={index}
                  className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Produto</Label>
                      <Select
                        value={item.product_id || ""}
                        onValueChange={(v) => handleProductChange(index, v)}
                      >
                        <SelectTrigger className="h-8 text-[13px]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {products
                            .filter((p) => !used.has(p.id))
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                                <span className="text-muted-foreground ml-1">
                                  (Est: {p.stock_quantity})
                                </span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {errors[`item_${index}_product`] && (
                        <p className="text-xs text-destructive">
                          {errors[`item_${index}_product`]}
                        </p>
                      )}
                    </div>

                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-5 shrink-0"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {item.product_id && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          max={type === "sale" && product ? product.stock_quantity : undefined}
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(index, parseInt(e.target.value) || 1)
                          }
                          className="h-8 text-[13px]"
                        />
                        {errors[`item_${index}_qty`] && (
                          <p className="text-xs text-destructive">
                            {errors[`item_${index}_qty`]}
                          </p>
                        )}
                      </div>

                      {type === "stock_replenishment" ? (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Custo un. (R$)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost_price ?? item.unit_price}
                            onChange={(e) =>
                              handleCostPriceChange(index, parseFloat(e.target.value) || 0)
                            }
                            className="h-8 text-[13px]"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Valor un. (R$)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleUnitPriceChange(index, parseFloat(e.target.value) || 0)
                            }
                            className="h-8 text-[13px]"
                          />
                          {errors[`item_${index}_price`] && (
                            <p className="text-xs text-destructive">
                              {errors[`item_${index}_price`]}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Subtotal</Label>
                        <div className="flex h-8 items-center rounded-md bg-muted/50 px-2 text-[13px] font-medium tabular-nums">
                          {formatCurrency(itemTotal)}
                        </div>
                      </div>
                    </div>
                  )}

                  {type === "stock_replenishment" &&
                    product &&
                    item.cost_price !== undefined &&
                    item.cost_price !== product.cost_price && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Custo será atualizado: {formatCurrency(product.cost_price)} →{" "}
                        {formatCurrency(item.cost_price)}
                      </p>
                    )}
                </div>
              );
            })}

            {errors.items && (
              <p className="text-xs text-destructive">{errors.items}</p>
            )}
          </div>
        )}

        {/* Grand total */}
        {grandTotal > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-2.5 border border-border/60">
            <span className="text-[13px] font-medium text-muted-foreground">Total</span>
            <span className="text-base font-semibold tabular-nums">
              {formatCurrency(fromCents(grandTotal))}
            </span>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border/60 bg-background px-6 py-4 -mx-6 mt-6">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Registrar
        </Button>
      </div>
    </form>
  );
}
