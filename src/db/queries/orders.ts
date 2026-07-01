import { query, queryOne } from '../connection';

export interface OrderRow {
  id: string;
  order_number: number;
  email: string;
  status: string;
  fulfillment: string;
  subtotal: number;
  discount_amount: number;
  shipping: number;
  total: number;
  currency: string;
  discount_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_title: string;
  variant_title: string;
  sku: string | null;
  price: number;
  quantity: number;
  line_total: number;
}

export function findOrders(limit = 50, offset = 0): OrderRow[] {
  return query<OrderRow>(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
}

export function countOrders(): number {
  return queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM orders')?.n ?? 0;
}

export function findOrderById(id: string): OrderRow | null {
  return queryOne<OrderRow>('SELECT * FROM orders WHERE id = ?', [id]);
}

export function findOrderItems(orderId: string): OrderItemRow[] {
  return query<OrderItemRow>('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
}
