export interface Product {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  expiry_date: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProductInsert {
  name: string;
  description?: string | null;
  brand?: string | null;
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  expiry_date?: string | null;
}

export interface ProductUpdate extends Partial<ProductInsert> {}

export type TransactionType = "sale" | "extra_cost" | "stock_replenishment";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  quantity: number;
  description: string | null;
  product_id: string | null;
  user_id: string;
  created_by: string | null;
  date: string;
  created_at: string;
}

export interface TransactionInsert {
  type: TransactionType;
  amount: number;
  quantity?: number;
  cost_price?: number;
  description?: string | null;
  product_id?: string | null;
  date?: string;
}

export interface TransactionUpdate extends Partial<TransactionInsert> {}

export interface TransactionWithProduct extends Transaction {
  products: Pick<Product, "name"> | null;
}

export interface FinancialSummary {
  totalSales: number;
  totalCosts: number;
  totalExtraCosts: number;
  netProfit: number;
  totalProducts: number;
  lowStockProducts: number;
}

export interface ChartDataPoint {
  date: string;
  sales: number;
  costs: number;
  extraCosts: number;
  netProfit: number;
}
