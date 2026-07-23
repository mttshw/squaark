import {
  createImportJob,
  updateImportJobProgress,
  appendImportJobError,
  finishImportJob,
} from '../../db/queries/import';
import { parseWxr, type SiteInfo } from './wxr';
import { WooRestClient, type WooRestConfig } from './rest-client';
import { upsertProduct, upsertOrder, upsertPage } from './mapper';
import { setSetting } from '../../db/queries/admin';

export function startWxrImportJob(xml: string): string {
  const jobId = createImportJob('wxr');
  runWxrImport(jobId, xml).catch((err) => {
    finishImportJob(jobId, 'failed', err instanceof Error ? err.message : 'Import failed');
  });
  return jobId;
}

function applySiteInfo(info: SiteInfo): void {
  if (info.name) setSetting('store_name', info.name);
  if (info.url) setSetting('store_url', info.url);
}

async function runWxrImport(jobId: string, xml: string): Promise<void> {
  updateImportJobProgress(jobId, 'Reading export file...', 0, 0);
  const { products, pages, orders, warnings, siteInfo } = parseWxr(xml);
  for (const w of warnings) appendImportJobError(jobId, 'file', w);

  applySiteInfo(siteInfo);

  const total = products.length + pages.length + orders.length;
  let processed = 0;
  updateImportJobProgress(
    jobId,
    `Importing ${products.length} products, ${orders.length} orders, ${pages.length} pages...`,
    total,
    processed,
  );

  for (const product of products) {
    try {
      await upsertProduct(product);
    } catch (err) {
      appendImportJobError(jobId, product.title || `product #${product.wcId}`, err instanceof Error ? err.message : String(err));
    }
    processed++;
    updateImportJobProgress(jobId, `Importing products... (${processed}/${total})`, total, processed);
  }

  for (const order of orders) {
    try {
      upsertOrder(order);
    } catch (err) {
      appendImportJobError(jobId, `order #${order.orderNumber}`, err instanceof Error ? err.message : String(err));
    }
    processed++;
    updateImportJobProgress(jobId, `Importing orders... (${processed}/${total})`, total, processed);
  }

  for (const page of pages) {
    try {
      upsertPage(page);
    } catch (err) {
      appendImportJobError(jobId, page.title || `page #${page.wcId}`, err instanceof Error ? err.message : String(err));
    }
    processed++;
    updateImportJobProgress(jobId, `Importing pages... (${processed}/${total})`, total, processed);
  }

  finishImportJob(
    jobId,
    'completed',
    `Imported ${products.length} product${products.length === 1 ? '' : 's'}, ${orders.length} order${orders.length === 1 ? '' : 's'} and ${pages.length} page${pages.length === 1 ? '' : 's'}.`,
  );
}

export interface ApiImportOptions {
  importProducts: boolean;
  importOrders: boolean;
  importPages: boolean;
}

export function startApiImportJob(config: WooRestConfig, options: ApiImportOptions): string {
  const jobId = createImportJob('woocommerce_api');
  runApiImport(jobId, config, options).catch((err) => {
    finishImportJob(jobId, 'failed', err instanceof Error ? err.message : 'Import failed');
  });
  return jobId;
}

async function runApiImport(jobId: string, config: WooRestConfig, options: ApiImportOptions): Promise<void> {
  const client = new WooRestClient(config);

  updateImportJobProgress(jobId, 'Connecting to store...', 0, 0);
  await client.testConnection();

  const siteInfo = await client.fetchSiteInfo();
  applySiteInfo(siteInfo);

  let productTotal = 0;
  let orderTotal = 0;
  let pageTotal = 0;
  if (options.importProducts) productTotal = await client.count('/products');
  if (options.importOrders) orderTotal = await client.count('/orders');
  if (options.importPages) pageTotal = await client.countPages();

  const total = productTotal + orderTotal + pageTotal;
  let processed = 0;
  updateImportJobProgress(jobId, 'Starting import...', total, processed);

  if (options.importProducts) {
    for await (const product of client.fetchProducts()) {
      try {
        await upsertProduct(product);
      } catch (err) {
        appendImportJobError(jobId, product.title || `product #${product.wcId}`, err instanceof Error ? err.message : String(err));
      }
      processed++;
      updateImportJobProgress(jobId, `Importing products... (${processed}/${total})`, total, processed);
    }
  }

  if (options.importOrders) {
    for await (const order of client.fetchOrders()) {
      try {
        upsertOrder(order);
      } catch (err) {
        appendImportJobError(jobId, `order #${order.orderNumber}`, err instanceof Error ? err.message : String(err));
      }
      processed++;
      updateImportJobProgress(jobId, `Importing orders... (${processed}/${total})`, total, processed);
    }
  }

  if (options.importPages) {
    for await (const page of client.fetchPages()) {
      try {
        upsertPage(page);
      } catch (err) {
        appendImportJobError(jobId, page.title || `page #${page.wcId}`, err instanceof Error ? err.message : String(err));
      }
      processed++;
      updateImportJobProgress(jobId, `Importing pages... (${processed}/${total})`, total, processed);
    }
  }

  finishImportJob(jobId, 'completed', `Imported ${processed} item${processed === 1 ? '' : 's'}.`);
}
