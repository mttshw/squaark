import { randomUUID } from 'crypto';
import { db } from './connection';

function img(seed: string) {
  const base = `https://picsum.photos/seed/${seed}`;
  return { original: `${base}/1200/1500`, thumbnail: `${base}/200/250`, medium: `${base}/600/750`, large: `${base}/1200/1500` };
}

const PRODUCTS = [
  { title: 'Minimal Watch',     slug: 'minimal-watch',     vendor: 'Horology Co.',  price: 19999, compare_at_price: 24999, qty: 8,   seed: 'watch1'   },
  { title: 'Canvas Tote',       slug: 'canvas-tote',       vendor: null,            price: 4500,  compare_at_price: null,  qty: 25,  seed: 'bag2'     },
  { title: 'Ceramic Mug',       slug: 'ceramic-mug',       vendor: 'Studio Clay',   price: 2800,  compare_at_price: null,  qty: 50,  seed: 'mug3'     },
  { title: 'Leather Wallet',    slug: 'leather-wallet',    vendor: 'Crafted Goods', price: 8900,  compare_at_price: 11000, qty: 15,  seed: 'wallet4'  },
  { title: 'Bamboo Sunglasses', slug: 'bamboo-sunglasses', vendor: null,            price: 6500,  compare_at_price: null,  qty: 0,   seed: 'glasses5' },
  { title: 'Linen Notebook',    slug: 'linen-notebook',    vendor: 'Paper & Pen',   price: 2400,  compare_at_price: null,  qty: 100, seed: 'notebook6'},
];

const run = db.transaction(() => {
  db.exec(`
    DELETE FROM collection_products;
    DELETE FROM collections;
    DELETE FROM cart_items;
    DELETE FROM product_variants;
    DELETE FROM product_images;
    DELETE FROM products;
  `);

  const productIds: string[] = [];

  for (const p of PRODUCTS) {
    const productId = randomUUID();
    const imageId   = randomUUID();
    const variantId = randomUUID();
    const images    = img(p.seed);

    db.prepare(`
      INSERT INTO products (id, title, slug, description, description_plain, vendor, tags_text)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId, p.title, p.slug,
      '<p>A beautifully crafted piece made with care and attention to detail. Built to last and designed to inspire.</p>',
      'A beautifully crafted piece made with care and attention to detail.',
      p.vendor, 'featured new',
    );

    db.prepare(`
      INSERT INTO product_images (id, product_id, original, thumbnail, medium, large, alt, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(imageId, productId, images.original, images.thumbnail, images.medium, images.large, p.title);

    db.prepare(`
      INSERT INTO product_variants (id, product_id, title, price, compare_at_price, sku, inventory_quantity, image_id, position)
      VALUES (?, ?, 'Default', ?, ?, ?, ?, ?, 0)
    `).run(variantId, productId, p.price, p.compare_at_price, `SKU-${p.slug.toUpperCase()}`, p.qty, imageId);

    productIds.push(productId);
    console.log(`  ✓ ${p.title}`);
  }

  const allId  = randomUUID();
  const featId = randomUUID();

  db.prepare(`INSERT INTO collections (id, title, slug, description) VALUES (?, 'All Products', 'all', 'Our full range of handpicked products.')`).run(allId);
  db.prepare(`INSERT INTO collections (id, title, slug, description) VALUES (?, 'Featured', 'featured', 'Hand-picked favourites.')`).run(featId);

  for (let i = 0; i < productIds.length; i++) {
    db.prepare(`INSERT INTO collection_products (collection_id, product_id, position) VALUES (?, ?, ?)`).run(allId, productIds[i], i);
    if (i < 4) db.prepare(`INSERT INTO collection_products (collection_id, product_id, position) VALUES (?, ?, ?)`).run(featId, productIds[i], i);
  }
  console.log('  ✓ Collections: all, featured');
});

run();
console.log('\nSeed complete.');
