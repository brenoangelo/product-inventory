import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["sale", "extra_cost", "stock_replenishment"], {
    message: "Tipo inválido",
  }),
  amount: z
    .number({ message: "Valor inválido" })
    .positive("Valor deve ser positivo"),
  quantity: z
    .number({ message: "Quantidade inválida" })
    .int("Quantidade deve ser inteiro")
    .min(1, "Quantidade mínima é 1")
    .optional(),
  cost_price: z
    .number({ message: "Custo inválido" })
    .min(0, "Custo deve ser positivo")
    .optional(),
  description: z.string().max(500, "Descrição muito longa").optional().or(z.literal("")),
  product_id: z.string().uuid("Produto inválido").optional().or(z.literal("")),
  date: z.string().optional(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
