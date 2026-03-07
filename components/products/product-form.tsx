"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import {
  productSchema,
  type ProductFormData,
} from "@/lib/validations/product";
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <div className="space-y-1.5">
          <Label htmlFor="cost_price" className="text-[13px]">Custo (R$) *</Label>
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
          <Label htmlFor="sale_price" className="text-[13px]">Venda (R$) *</Label>
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

      <div className="flex justify-end gap-2 pt-2">
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
