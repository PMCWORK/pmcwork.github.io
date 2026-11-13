/**
 * Nightly full Firestore backup (run by .github/workflows/daily_report.yml).
 *
 * 1. Dumps EVERY top-level collection into one snapshot (a full copy, not incremental):
 *    - `data`: same format as the dashboard's JSON backup, so Settings > Database &
 *      Backups > Restore can restore it.
 *    - `extra_collections`: everything else (settings, audit_log, system_meta, ...).
 * 2. Encrypts it with the public "lock" key stored in Firestore
 *    settings/backup_encryption (created by the owner in the dashboard Settings).
 *    Only the dashboard (logged in) or the owner's offline key file can decrypt it.
 *    Format must stay compatible with src/utils/backupCrypto.js.
 *
 * Never print document data: GitHub Actions logs are public on this repo.
 *
 * Usage: FIREBASE_SERVICE_ACCOUNT='<json>' node scripts/backup_firestore.js <out.enc.json>
 */
const fs = require('fs');
const crypto = require('crypto');

const ENCRYPTED_FORMAT = 'pmc-encrypted-backup';

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

// Hybrid encryption: random AES-256-GCM key, wrapped with RSA-OAEP(SHA-256).
// Ciphertext = AES-GCM output with the 16-byte auth tag appended (WebCrypto layout).
function encryptPayload(payloadObj, publicKeyPem, keyId) {
  const plain = Buffer.from(JSON.stringify(payloadObj), 'utf8');
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  const encryptedKey = crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey
  );
  return {
    format: ENCRYPTED_FORMAT,
    v: 1,
    alg: 'RSA-OAEP-256+A256GCM',
    keyId,
    createdAt: new Date().toISOString(),
    encryptedKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function dhakaDateISO() {
  return new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
}

async function main() {
  const admin = require('firebase-admin');

  // Match how the browser app serialises values (Timestamps as {seconds, nanoseconds}).
  const toPlain = (value) => {
    if (value === null || value === undefined) return value;
    if (value instanceof admin.firestore.Timestamp) return { seconds: value.seconds, nanoseconds: value.nanoseconds };
    if (value instanceof admin.firestore.GeoPoint) return { latitude: value.latitude, longitude: value.longitude };
    if (value instanceof admin.firestore.DocumentReference) return value.path;
    if (Array.isArray(value)) return value.map(toPlain);
    if (typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
      return out;
    }
    return value;
  };

  const outPath = process.argv[2];
  if (!outPath) throw new Error('Usage: node scripts/backup_firestore.js <out.enc.json>');
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');

  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = admin.firestore();

  const keySnap = await db.collection('settings').doc('backup_encryption').get();
  const keyDoc = keySnap.exists ? keySnap.data() : null;
  if (!keyDoc || !keyDoc.publicKeyPem || !keyDoc.keyId) {
    throw new Error('Backup encryption is not set up. Log in to the dashboard > Settings > Database & Backups > "Set up encrypted backups". Refusing to save an unencrypted backup.');
  }

  const data = {};
  const extra = {};
  const counts = {};

  const collections = await db.listCollections();
  for (const col of collections) {
    const snap = await col.get();
    let docs = snap.docs.map(d => ({ id: d.id, ...toPlain(d.data()) }));
    if (col.id === 'settings') {
      // Never copy unlock keys into the backup itself.
      docs = docs.map(d => (d.id === 'backup_encryption'
        ? { id: d.id, keyId: d.keyId, publicKeyPem: d.publicKeyPem, note: 'private keys omitted from backups' }
        : d));
    }
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
      exportedDateDisplay: dhakaDateISO(),
      schemaVersion: 2,
      collectionCounts: counts
    },
    data,
    extra_collections: extra
  };

  fs.writeFileSync(outPath, JSON.stringify(encryptPayload(payload, keyDoc.publicKeyPem, keyDoc.keyId)));

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  // Counts only (no data) are safe to log.
  console.log(`Encrypted backup with key ${keyDoc.keyId}: ${total} documents from ${collections.length} collections`);
  for (const [name, n] of Object.entries(counts)) console.log(`  ${name}: ${n}`);
}

module.exports = { encryptPayload };

if (require.main === module) {
  main().catch(err => {
    console.error('Backup failed:', err.message);
    process.exit(1);
  });
}
