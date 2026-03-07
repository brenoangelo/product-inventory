import { createClient } from "@/lib/supabase/client";
import type { Product, ProductInsert, ProductUpdate } from "@/types/database";

export const ProductsService = {
  async list(): Promise<Product[]> {
    const client = createClient();
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getById(id: string): Promise<Product> {
    const client = createClient();
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async create(product: ProductInsert): Promise<Product> {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data, error } = await client
      .from("products")
      .insert({ ...product, user_id: user.id })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Auto-create stock_replenishment transaction for initial stock
    if (data.stock_quantity > 0) {
      await client.from("transactions").insert({
        type: "stock_replenishment",
        amount: data.cost_price * data.stock_quantity,
        quantity: data.stock_quantity,
        description: `Estoque inicial — ${data.name}`,
        product_id: data.id,
        user_id: user.id,
        created_by: user.email || null,
        date: new Date().toISOString(),
      });
    }

    return data;
  },

  async update(id: string, product: ProductUpdate): Promise<Product> {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Fetch current product to detect stock change
    const { data: current } = await client
      .from("products")
      .select("stock_quantity, cost_price, sale_price, name")
      .eq("id", id)
      .single();

    const { data, error } = await client
      .from("products")
      .update(product)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Auto-create transaction if stock_quantity changed
    if (
      current &&
      product.stock_quantity !== undefined &&
      product.stock_quantity !== current.stock_quantity
    ) {
      const diff = product.stock_quantity - current.stock_quantity;

      if (diff < 0) {
        // Stock decreased → sale transaction
        const qty = Math.abs(diff);
        await client.from("transactions").insert({
          type: "sale",
          amount: current.sale_price * qty,
          quantity: qty,
          description: `Ajuste de estoque — ${current.name}`,
          product_id: id,
          user_id: user.id,
          created_by: user.email || null,
          date: new Date().toISOString(),
        });
      } else {
        // Stock increased → stock_replenishment transaction
        await client.from("transactions").insert({
          type: "stock_replenishment",
          amount: current.cost_price * diff,
          quantity: diff,
          description: `Ajuste de estoque — ${current.name}`,
          product_id: id,
          user_id: user.id,
          created_by: user.email || null,
          date: new Date().toISOString(),
        });
      }
    }

    return data;
  },

  async remove(id: string): Promise<void> {
    const client = createClient();
    const { error } = await client.from("products").delete().eq("id", id);

    if (error) throw new Error(error.message);
  },
};
