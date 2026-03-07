"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import {
  transactionSchema,
  type TransactionFormData,
} from "@/lib/validations/transaction";
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
import type { Product } from "@/types/database";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface TransactionFormProps {
  products: Product[];
  onSubmit: (data: TransactionFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
}

export function TransactionForm({
  products,
  onSubmit,
  isLoading,
  onCancel,
}: TransactionFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "sale",
      amount: 0,
      quantity: 1,
      description: "",
      product_id: "",
      date: new Date().toISOString().slice(0, 16),
    },
  });

  const type = watch("type");
  const productId = watch("product_id");
  const quantity = watch("quantity") ?? 1;
  const amount = watch("amount");
  const costPrice = watch("cost_price");

  const selectedProduct = products.find((p) => p.id === productId);

  const showProductSelect = type === "sale" || type === "stock_replenishment";
  const showQuantity = showProductSelect && productId && selectedProduct;

  // Suggested amount for sale = sale_price * qty, for replenishment = cost_price * qty
  const suggestedAmount =
    selectedProduct && quantity
      ? type === "sale"
        ? selectedProduct.sale_price * quantity
        : type === "stock_replenishment"
          ? selectedProduct.cost_price * quantity
          : null
      : null;

  // Auto-fill amount when product or quantity changes (sale uses sale_price, replenishment uses cost_price)
  useEffect(() => {
    if (selectedProduct && quantity) {
      if (type === "sale") {
        setValue("amount", Number((selectedProduct.sale_price * quantity).toFixed(2)));
      } else if (type === "stock_replenishment") {
        const cost = costPrice ?? selectedProduct.cost_price;
        setValue("amount", Number((cost * quantity).toFixed(2)));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, selectedProduct?.id, quantity, setValue]);

  // Auto-fill cost_price from selected product
  useEffect(() => {
    if (type === "stock_replenishment" && selectedProduct) {
      setValue("cost_price", selectedProduct.cost_price);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, selectedProduct?.id, setValue]);

  // Recalculate amount when cost_price changes for replenishment
  useEffect(() => {
    if (type === "stock_replenishment" && costPrice !== undefined && quantity) {
      setValue("amount", Number((costPrice * quantity).toFixed(2)));
    }
  }, [type, costPrice, quantity, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="space-y-1.5">
        <Label className="text-[13px]">Tipo *</Label>
        <Select
          value={type}
          onValueChange={(value) => {
            setValue("type", value as "sale" | "extra_cost" | "stock_replenishment");
            setValue("product_id", "");
            setValue("quantity", 1);
            setValue("amount", 0);
            setValue("cost_price", undefined);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sale">Venda</SelectItem>
            <SelectItem value="extra_cost">Custo Extra</SelectItem>
            <SelectItem value="stock_replenishment">Reposição de Estoque</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-xs text-destructive">{errors.type.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-[13px]">Descrição</Label>
        <Input
          id="description"
          placeholder="Descrição opcional"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {showProductSelect && products.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[13px]">
            {type === "sale" ? "Produto Associado" : "Produto *"}
          </Label>
          <Select
            value={productId || ""}
            onValueChange={(value) => {
              setValue("product_id", value);
              setValue("quantity", 1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um produto" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {type === "sale"
                    ? ` — ${formatCurrency(p.sale_price)} (Estoque: ${p.stock_quantity})`
                    : ` — Custo: ${formatCurrency(p.cost_price)} (Estoque: ${p.stock_quantity})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.product_id && (
            <p className="text-xs text-destructive">
              {errors.product_id.message}
            </p>
          )}
        </div>
      )}

      {showQuantity && (
        <div className="space-y-1.5">
          <Label htmlFor="quantity" className="text-[13px]">
            Quantidade *{" "}
            {type === "sale" && (
              <span className="text-muted-foreground font-normal">
                (disponível: {selectedProduct.stock_quantity})
              </span>
            )}
          </Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            max={type === "sale" ? selectedProduct.stock_quantity : undefined}
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-xs text-destructive">{errors.quantity.message}</p>
          )}
        </div>
      )}

      {type === "stock_replenishment" && selectedProduct && (
        <div className="space-y-1.5">
          <Label htmlFor="cost_price" className="text-[13px]">
            Custo Unitário (R$) *{" "}
            <span className="text-muted-foreground font-normal">
              (atual: {formatCurrency(selectedProduct.cost_price)})
            </span>
          </Label>
          <Input
            id="cost_price"
            type="number"
            step="0.01"
            min="0"
            {...register("cost_price", { valueAsNumber: true })}
          />
          {costPrice !== undefined &&
            costPrice !== selectedProduct.cost_price && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                O custo do produto será atualizado de{" "}
                {formatCurrency(selectedProduct.cost_price)} para{" "}
                {formatCurrency(costPrice)}
              </p>
            )}
          {errors.cost_price && (
            <p className="text-xs text-destructive">{errors.cost_price.message}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="amount" className="text-[13px]">
          {type === "stock_replenishment" ? "Valor Total (R$) *" : "Valor (R$) *"}
        </Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          {...register("amount", { valueAsNumber: true })}
        />
        {suggestedAmount !== null && (
          <p className="text-xs text-muted-foreground">
            Valor sugerido:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(suggestedAmount)}
            </span>
            {" "}
            ({formatCurrency(
              type === "sale"
                ? selectedProduct!.sale_price
                : costPrice ?? selectedProduct!.cost_price
            )} × {quantity})
            {amount !== suggestedAmount && (
              <span className="ml-1 text-amber-600 dark:text-amber-400">
                — diferença: {formatCurrency(amount - suggestedAmount)}
              </span>
            )}
          </p>
        )}
        {errors.amount && (
          <p className="text-xs text-destructive">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date" className="text-[13px]">Data</Label>
        <Input id="date" type="datetime-local" {...register("date")} />
        {errors.date && (
          <p className="text-xs text-destructive">{errors.date.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
