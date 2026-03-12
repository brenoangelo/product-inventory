"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Calculator } from "lucide-react";

import {
  productSchema,
  type ProductFormData,
} from "@/lib/validations/product";
import { toCents, fromCents, formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@/types/database";

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
}

export function ProductForm({
  product,
  onSubmit,
  isLoading,
  onCancel,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description ?? "",
          brand: product.brand ?? "",
          stock_quantity: product.stock_quantity,
          cost_price: product.cost_price,
          sale_price: product.sale_price,
          expiry_date: product.expiry_date ?? "",
        }
      : {
          name: "",
          description: "",
          brand: "",
          stock_quantity: 0,
          cost_price: 0,
          sale_price: 0,
          expiry_date: "",
        },
  });

  // Helper fields (not saved to DB)
  const [totalCost, setTotalCost] = useState("");
  const [freight, setFreight] = useState("");
  const [margin, setMargin] = useState("");

  const costPrice = useWatch({ control, name: "cost_price" });
  const salePrice = useWatch({ control, name: "sale_price" });
  const stockQty = useWatch({ control, name: "stock_quantity" });

  // Compute sale_price from margin when margin changes
  useEffect(() => {
    const m = parseFloat(margin);
    if (!isNaN(m) && m >= 0 && m < 100 && costPrice > 0) {
      // sale = cost / (1 - margin/100), rounded to cents
      const costCents = toCents(costPrice);
      const factor = 1 - m / 100;
      const saleCents = Math.round(costCents / factor);
      setValue("sale_price", fromCents(saleCents));
    }
  }, [margin, costPrice, setValue]);

  // Update cost_price from (total cost + freight) / quantity
  function recalcCost() {
    const tcCents = toCents(parseFloat(totalCost) || 0);
    const frCents = toCents(parseFloat(freight) || 0);
    const sumCents = tcCents + frCents;
    const qty = stockQty > 0 ? stockQty : 1;
    if (sumCents > 0) {
      // Integer division in cents, then round to 2 decimals
      const unitCents = Math.round(sumCents / qty);
      setValue("cost_price", fromCents(unitCents));
    }
  }

  // Compute displayed margin from current cost/sale (in cents for precision)
  const displayMargin = (() => {
    const saleCents = toCents(salePrice);
    const costCents = toCents(costPrice);
    if (saleCents <= 0) return "0.0";
    const marginPct = ((saleCents - costCents) / saleCents) * 100;
    return marginPct.toFixed(1);
  })();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <div className="flex-1 space-y-5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name" className="text-[13px]">Nome *</Label>
            <Input id="name" placeholder="Nome do produto" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description" className="text-[13px]">Descrição</Label>
            <Input
              id="description"
              placeholder="Descrição opcional"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand" className="text-[13px]">Marca</Label>
            <Input id="brand" placeholder="Marca" {...register("brand")} />
            {errors.brand && (
              <p className="text-xs text-destructive">{errors.brand.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stock_quantity" className="text-[13px]">Estoque *</Label>
            <Input
              id="stock_quantity"
              type="number"
              min="0"
              {...register("stock_quantity", { valueAsNumber: true })}
            />
            {errors.stock_quantity && (
              <p className="text-xs text-destructive">
                {errors.stock_quantity.message}
              </p>
            )}
          </div>
        </div>

        {/* Helper section for cost calculation */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
            <Calculator className="h-3.5 w-3.5" />
            Calculadora de preços
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="total_cost" className="text-[11px] text-muted-foreground">
                Custo do produto (R$)
              </Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={totalCost}
                onChange={(e) => {
                  setTotalCost(e.target.value);
                }}
                onBlur={recalcCost}
                className="h-8 text-[13px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="freight" className="text-[11px] text-muted-foreground">
                Frete (R$)
              </Label>
              <Input
                id="freight"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={freight}
                onChange={(e) => {
                  setFreight(e.target.value);
                }}
                onBlur={recalcCost}
                className="h-8 text-[13px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="margin_input" className="text-[11px] text-muted-foreground">
                Margem desejada (%)
              </Label>
              <Input
                id="margin_input"
                type="number"
                step="0.1"
                min="0"
                max="99.9"
                placeholder="Ex: 30"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                className="h-8 text-[13px]"
              />
            </div>
          </div>

          {costPrice > 0 && (
            <div className="flex items-center gap-4 text-[12px] text-muted-foreground pt-1 border-t border-border/40">
              <span>
                Custo final: <strong className="text-foreground">{formatCurrency(costPrice)}</strong>
              </span>
              <span>
                Venda: <strong className="text-foreground">{formatCurrency(salePrice)}</strong>
              </span>
              <span>
                Margem: <strong className={Number(displayMargin) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>{displayMargin}%</strong>
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cost_price" className="text-[13px]">Custo unitário (R$) *</Label>
            <Input
              id="cost_price"
              type="number"
              step="0.01"
              min="0"
              {...register("cost_price", { valueAsNumber: true })}
            />
            {errors.cost_price && (
              <p className="text-xs text-destructive">
                {errors.cost_price.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale_price" className="text-[13px]">Preço de venda (R$) *</Label>
            <Input
              id="sale_price"
              type="number"
              step="0.01"
              min="0"
              {...register("sale_price", { valueAsNumber: true })}
            />
            {errors.sale_price && (
              <p className="text-xs text-destructive">
                {errors.sale_price.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expiry_date" className="text-[13px]">Validade</Label>
            <Input
              id="expiry_date"
              type="date"
              {...register("expiry_date")}
            />
            {errors.expiry_date && (
              <p className="text-xs text-destructive">
                {errors.expiry_date.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border/60 bg-background px-6 py-4 -mx-6 mt-6">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {product ? "Salvar" : "Criar Produto"}
        </Button>
      </div>
    </form>
  );
}
