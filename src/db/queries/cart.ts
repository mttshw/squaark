import { randomUUID } from 'crypto';
import { query, queryOne, execute, executeReturning } from '../connection';

export interface CartRow {
  id: string;
  discount_code: string | null;
  discount_amount: number;
}

export interface CartItemRow {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
  variant_title: string;
  price: number;
  product_id: string;
  product_title: string;
  product_slug: string;
  img_thumbnail: string | null;
  img_medium: string | null;
  img_large: string | null;
  img_original: string | null;
  img_alt: string | null;
}

export function createCart(): string {
  const id = randomUUID();
  execute('INSERT INTO carts (id) VALUES (?)', [id]);
  return id;
}

export function findCart(cartId: string): CartRow | null {
  return queryOne<CartRow>(
    'SELECT id, discount_code, discount_amount FROM carts WHERE id = ?',
    [cartId],
  );
}

export function findCartItems(cartId: string): CartItemRow[] {
  return query<CartItemRow>(`
    SELECT
      ci.id, ci.cart_id, ci.variant_id, ci.quantity,
      pv.title     AS variant_title,
      pv.price,
      p.id         AS product_id,
      p.title      AS product_title,
      p.slug       AS product_slug,
      pi.thumbnail AS img_thumbnail,
      pi.medium    AS img_medium,
      pi.large     AS img_large,
      pi.original  AS img_original,
      pi.alt       AS img_alt
    FROM cart_items ci
    JOIN product_variants pv ON pv.id  = ci.variant_id
    JOIN products p           ON p.id  = pv.product_id
    LEFT JOIN product_images pi ON pi.id = pv.image_id
    WHERE ci.cart_id = ?
    ORDER BY ci.created_at
  `, [cartId]);
}

export function upsertCartItem(cartId: string, variantId: string, quantity: number): void {
  const id = randomUUID();
  execute(`
    INSERT INTO cart_items (id, cart_id, variant_id, quantity)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (cart_id, variant_id)
    DO UPDATE SET quantity   = cart_items.quantity + excluded.quantity,
                  updated_at = datetime('now')
  `, [id, cartId, variantId, quantity]);
}

export function updateCartItemQuantity(cartId: string, itemId: string, quantity: number): void {
  execute(
    `UPDATE cart_items SET quantity = ?, updated_at = datetime('now') WHERE id = ? AND cart_id = ?`,
    [quantity, itemId, cartId],
  );
}

export function removeCartItem(cartId: string, itemId: string): void {
  execute('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [itemId, cartId]);
}
