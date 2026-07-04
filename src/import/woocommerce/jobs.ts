import {
  createImportJob,
  updateImportJobProgress,
  appendImportJobError,
  finishImportJob,
} from '../../db/queries/import';
import { parseWxr } from './wxr';
import { WooRestClient, type WooRestConfig } from './rest-client';
import { upsertProduct, upsertOrder } from './mapper';

export function startWxrImportJob(xml: string): string {
  const jobId = createImportJob('wxr');
  runWxrImport(jobId, xml).catch((err) => {
    finishImportJob(jobId, 'failed', err instanceof Error ? err.message : 'Import failed');
  });
  return jobId;
}

async function runWxrImport(jobId: string, xml: string): Promise<void> {
  updateImportJobProgress(jobId, 'Reading export file...', 0, 0);
  const { products, warnings } = parseWxr(xml);
  for (const w of warnings) appendImportJobError(jobId, 'file', w);

  const total = products.length;
  let processed = 0;
  updateImportJobProgress(jobId, `Importing ${total} products...`, total, processed);

  for (const product of products) {
    try {
      await upsertProduct(product);
    } catch (err) {
      appendImportJobError(jobId, product.title || `product #${product.wcId}`, err instanceof Error ? err.message : String(err));
    }
    processed++;
    updateImportJobProgress(jobId, `Importing products... (${processed}/${total})`, total, processed);
  }

  finishImportJob(jobId, 'completed', `Imported ${processed} product${processed === 1 ? '' : 's'}.`);
}

export interface ApiImportOptions {
  importProducts: boolean;
  importOrders: boolean;
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

  let productTotal = 0;
  let orderTotal = 0;
  if (options.importProducts) productTotal = await client.count('/products');
  if (options.importOrders) orderTotal = await client.count('/orders');

  const total = productTotal + orderTotal;
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

  finishImportJob(jobId, 'completed', `Imported ${processed} item${processed === 1 ? '' : 's'}.`);
}
