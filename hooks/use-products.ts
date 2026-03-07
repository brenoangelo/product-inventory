"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductsService } from "@/lib/services/products";
import type { ProductInsert, ProductUpdate } from "@/types/database";

const PRODUCTS_KEY = ["products"];

export function useProducts() {
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: ProductsService.list,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => ProductsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (product: ProductInsert) => ProductsService.create(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdate }) =>
      ProductsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ProductsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
