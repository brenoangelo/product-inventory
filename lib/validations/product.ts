import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional().or(z.literal("")),
  brand: z.string().max(100, "Marca muito longa").optional().or(z.literal("")),
  stock_quantity: z
    .number({ message: "Quantidade inválida" })
    .int("Quantidade deve ser inteiro")
    .min(0, "Quantidade não pode ser negativa"),
  cost_price: z
    .number({ message: "Valor inválido" })
    .min(0, "Valor não pode ser negativo"),
  sale_price: z
    .number({ message: "Valor inválido" })
    .min(0, "Valor não pode ser negativo"),
  expiry_date: z.string().optional().or(z.literal("")),
});

export type ProductFormData = z.infer<typeof productSchema>;
