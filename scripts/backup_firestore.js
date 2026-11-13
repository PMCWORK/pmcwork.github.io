/**
 * Nightly full Firestore backup (run by .github/workflows/daily_report.yml).
 *
 * Writes ONE complete snapshot of the whole database to a JSON file:
 *  - `data`: the same format as the dashboard's "Download Complete JSON Snapshot",
 *    so it can be restored with Settings > Database & Backups > Restore.
 *  - `extra_collections`: every other top-level collection (settings, audit_log,
 *    system_meta, ...) so nothing is lost. These are restored manually if needed.
 *
 * The workflow encrypts this file before uploading it. Never print document data
 * to the console: GitHub Actions logs are public on this repo.
 *
 * Usage: FIREBASE_SERVICE_ACCOUNT='<json>' node scripts/backup_firestore.js <out.json>
 */
const fs = require('fs');
const admin = require('firebase-admin');

// Firestore collection name -> key used by the dashboard's backup/restore format.
const APP_FORMAT_KEYS = {
  sales: 'sales',
  product_tracker: 'products',
  price_list: 'price_list',
  pm_brings: 'pm_brings',
  invoices: 'invoices',
  purchases: 'purchases',
  supplier_shops: 'supplier_shops',
  purchase_payments: 'purchase_payments',
  expenses: 'expenses',
  monthly_settlements: 'settlements'
};

// Match how the browser app serialises values (Timestamps as {seconds, nanoseconds}).
function toPlain(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof admin.firestore.Timestamp) {
    return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value instanceof admin.firestore.GeoPoint) {
    return { latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return value.path;
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

async function main() {
  const outPath = process.argv[2];
  if (!outPath) throw new Error('Usage: node scripts/backup_firestore.js <out.json>');
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');

  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = admin.firestore();

  const data = {};
  const extra = {};
  const counts = {};

  const collections = await db.listCollections();
  for (const col of collections) {
    const snap = await col.get();
    const docs = snap.docs.map(d => ({ id: d.id, ...toPlain(d.data()) }));
    counts[col.id] = docs.length;
    if (APP_FORMAT_KEYS[col.id]) data[APP_FORMAT_KEYS[col.id]] = docs;
    else extra[col.id] = docs;
  }

  const payload = {
    meta: {
      appName: 'PM Computers Dashboard',
      version: '2.0',
      source: 'nightly-github-action',
      exportedAt: new Date().toISOString(),
      schemaVersion: 2,
      collectionCounts: counts
    },
    data,
    extra_collections: extra
  };

  fs.writeFileSync(outPath, JSON.stringify(payload));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  // Counts only (no data) are safe to log.
  console.log(`Backed up ${total} documents from ${collections.length} collections:`);
  for (const [name, n] of Object.entries(counts)) console.log(`  ${name}: ${n}`);
}

main().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
