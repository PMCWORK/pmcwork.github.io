import { toISODate, dhakaNow, pad } from './calculations';
import { exportSalesToCsv } from './exportHelpers';

export function generateCompleteSystemBackupPayload(contextData) {
  const {
    sales = [],
    products = [],
    priceList = [],
    priceBrands = [],
    priceTypes = [],
    pmBrings = [],
    invoices = [],
    purchases = [],
    supplierShops = [],
    purchasePayments = [],
    expenses = [],
    auditLog = [],
    settlements = []
  } = contextData || {};

  const now = dhakaNow();
  const todayISO = toISODate(now);

  return {
    meta: {
      appName: 'PM Computers Dashboard',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      exportedDateDisplay: todayISO,
      schemaVersion: 2,
      recordCounts: {
        sales: sales.length,
        products: products.length,
        price_list: priceList.length,
        price_list_brands: priceBrands.length,
        price_list_types: priceTypes.length,
        pm_brings: pmBrings.length,
        invoices: invoices.length,
        purchases: purchases.length,
        supplier_shops: supplierShops.length,
        purchase_payments: purchasePayments.length,
        expenses: expenses.length,
        audit_log: auditLog.length,
        settlements: settlements.length
      }
    },
    data: {
      sales,
      products,
      price_list: priceList,
      price_list_brands: priceBrands,
      price_list_types: priceTypes,
      pm_brings: pmBrings,
      invoices,
      purchases,
      supplier_shops: supplierShops,
      purchase_payments: purchasePayments,
      expenses,
      audit_log: auditLog,
      settlements
    }
  };
}

export function downloadJsonBackup(contextData) {
  const payload = generateCompleteSystemBackupPayload(contextData);
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const now = new Date();
  const todayISO = toISODate(dhakaNow());
  const filename = `pmc_database_backup_${todayISO}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  return filename;
}

export function downloadAllCsvBackup(sales = []) {
  return exportSalesToCsv(sales);
}

export async function executeDatabaseRestore({
  payload,
  mode = 'merge',
  db,
  user,
  syncAllData,
  logAudit
}) {
  if (!db) throw new Error('Firestore database is not connected.');
  if (!payload || !payload.data) throw new Error('Invalid backup file structure.');

  const { data, meta } = payload;

  // Emergency safety backup before restore
  try {
    localStorage.setItem('pmc_emergency_pre_restore_backup', JSON.stringify({
      restoredAt: new Date().toISOString(),
      backupMeta: meta
    }));
  } catch (e) {
    console.warn('Could not store emergency local backup:', e);
  }

  // Restore helper for collection arrays
  async function restoreCollection(collectionName, items) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    
    // Batch writes in chunks of 400 (Firestore limit is 500)
    const chunkSize = 400;
    let count = 0;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = db.batch();

      chunk.forEach((item) => {
        if (!item) return;
        const docId = item.id || ('imported_' + count + '_' + Date.now());
        const docData = { ...item };
        delete docData.id;
        const ref = db.collection(collectionName).doc(docId);
        batch.set(ref, docData, { merge: mode === 'merge' });
        count++;
      });

      await batch.commit();
    }

    return count;
  }

  const restoredCounts = {};

  if (Array.isArray(data.sales)) restoredCounts.sales = await restoreCollection('sales', data.sales);
  if (Array.isArray(data.products)) restoredCounts.products = await restoreCollection('product_tracker', data.products);
  if (Array.isArray(data.price_list)) restoredCounts.price_list = await restoreCollection('price_list', data.price_list);
  if (Array.isArray(data.pm_brings)) restoredCounts.pm_brings = await restoreCollection('pm_brings', data.pm_brings);
  if (Array.isArray(data.invoices)) restoredCounts.invoices = await restoreCollection('invoices', data.invoices);
  if (Array.isArray(data.purchases)) restoredCounts.purchases = await restoreCollection('purchases', data.purchases);
  if (Array.isArray(data.supplier_shops)) restoredCounts.supplier_shops = await restoreCollection('supplier_shops', data.supplier_shops);
  if (Array.isArray(data.purchase_payments)) restoredCounts.purchase_payments = await restoreCollection('purchase_payments', data.purchase_payments);
  if (Array.isArray(data.expenses)) restoredCounts.expenses = await restoreCollection('expenses', data.expenses);
  if (Array.isArray(data.settlements)) restoredCounts.settlements = await restoreCollection('monthly_settlements', data.settlements);

  if (logAudit) {
    await logAudit('settings', 'database', 'restore', null, {
      mode,
      restoredCounts,
      sourceFilename: meta?.exportedDateDisplay || 'uploaded_json'
    }, user);
  }

  if (syncAllData) {
    await syncAllData();
  }

  return restoredCounts;
}
