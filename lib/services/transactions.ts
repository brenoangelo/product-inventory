import { createClient } from "@/lib/supabase/client";
import type {
  Transaction,
  TransactionInsert,
  TransactionWithProduct,
  TransactionType,
} from "@/types/database";

export interface TransactionListParams {
  page?: number;
  pageSize?: number;
  type?: TransactionType | "";
  search?: string;
  createdBy?: string;
  sortBy?: "amount" | "quantity" | "date";
  sortDir?: "asc" | "desc";
}

export interface TransactionListResult {
  data: TransactionWithProduct[];
  count: number;
}

const PAGE_SIZE = 20;

export const TransactionsService = {
  async list(params: TransactionListParams = {}): Promise<TransactionListResult> {
    const client = createClient();
    const {
      page = 1,
      pageSize = PAGE_SIZE,
      type,
      search,
      createdBy,
      sortBy = "date",
      sortDir = "desc",
    } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from("transactions")
      .select("*, products(name)", { count: "exact" });

    if (type) {
      query = query.eq("type", type);
    }

    if (search) {
      query = query.ilike("description", `%${search}%`);
    }

    if (createdBy) {
      query = query.ilike("created_by", `%${createdBy}%`);
    }

    query = query
      .order(sortBy, { ascending: sortDir === "asc" })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);
    return { data: data ?? [], count: count ?? 0 };
  },

  async create(transaction: TransactionInsert): Promise<Transaction> {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const qty = transaction.quantity ?? 1;

    const payload: Record<string, unknown> = {
      type: transaction.type,
      amount: transaction.amount,
      quantity: qty,
      description: transaction.description || null,
      product_id: transaction.product_id || null,
      date: transaction.date || new Date().toISOString(),
      user_id: user.id,
      created_by: user.email || null,
    };

    // If it's a sale with an associated product, validate and decrement stock
    if (transaction.type === "sale" && transaction.product_id) {
      const { data: product } = await client
        .from("products")
        .select("stock_quantity")
        .eq("id", transaction.product_id)
        .single();

      if (!product) throw new Error("Produto não encontrado");
      if (product.stock_quantity < qty) {
        throw new Error(
          `Estoque insuficiente. Disponível: ${product.stock_quantity}, Solicitado: ${qty}`
        );
      }

      const { data, error } = await client
        .from("transactions")
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await client
        .from("products")
        .update({ stock_quantity: product.stock_quantity - qty })
        .eq("id", transaction.product_id);

      return data;
    }

    // If it's a stock replenishment, increment stock and update cost_price
    if (transaction.type === "stock_replenishment" && transaction.product_id) {
      const { data: product } = await client
        .from("products")
        .select("stock_quantity, cost_price")
        .eq("id", transaction.product_id)
        .single();

      if (!product) throw new Error("Produto não encontrado");

      const { data, error } = await client
        .from("transactions")
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const updatePayload: Record<string, unknown> = {
        stock_quantity: product.stock_quantity + qty,
      };

      // Update cost_price on the product if a new cost was provided
      if (
        transaction.cost_price !== undefined &&
        transaction.cost_price !== product.cost_price
      ) {
        updatePayload.cost_price = transaction.cost_price;
      }

      await client
        .from("products")
        .update(updatePayload)
        .eq("id", transaction.product_id);

      return data;
    }

    const { data, error } = await client
      .from("transactions")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async remove(id: string): Promise<void> {
    const client = createClient();
    const { error } = await client.from("transactions").delete().eq("id", id);

    if (error) throw new Error(error.message);
  },
};
