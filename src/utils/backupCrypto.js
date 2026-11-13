// Encrypted nightly backups (see AGENTS.md "Nightly backups & restore").
//
// Hybrid encryption: each backup is encrypted with a random AES-256-GCM key, and that
// key is encrypted with an RSA-OAEP-3072 (SHA-256) "lock" (public) key.
//  - Public key  -> Firestore settings/backup_encryption.publicKeyPem (the nightly
//                   GitHub job reads it to encrypt; it cannot decrypt).
//  - Private key -> same doc, .privateKeyPem (only logged-in users can read it, per
//                   Firestore rules) + an offline "key file" the owner keeps safe.
// Must stay byte-compatible with encryptPayload() in scripts/backup_firestore.js.
// No imports on purpose: Node 22 can load this file for testing.

export const ENCRYPTED_FORMAT = 'pmc-encrypted-backup';
export const KEYFILE_FORMAT = 'pmc-backup-key';
const KEY_DOC = ['settings', 'backup_encryption'];
const RSA_PARAMS = { name: 'RSA-OAEP', hash: 'SHA-256' };

function bytesToB64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function derToPem(der, label) {
  const lines = bytesToB64(der).match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

function pemToDer(pem) {
  return b64ToBytes(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
}

async function keyIdFromSpki(spkiDer) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', spkiDer));
  return Array.from(hash.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateBackupKeyPair() {
  const kp = await crypto.subtle.generateKey(
    { ...RSA_PARAMS, modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['encrypt', 'decrypt']
  );
  const spki = await crypto.subtle.exportKey('spki', kp.publicKey);
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
  return {
    keyId: await keyIdFromSpki(spki),
    publicKeyPem: derToPem(spki, 'PUBLIC KEY'),
    privateKeyPem: derToPem(pkcs8, 'PRIVATE KEY'),
    createdAt: new Date().toISOString()
  };
}

export async function loadBackupKeyDoc(db) {
  if (!db) return null;
  const snap = await db.collection(KEY_DOC[0]).doc(KEY_DOC[1]).get();
  return snap.exists ? snap.data() : null;
}

// Saves a new key as current; any previous key is kept in previousKeys so older
// backups can still be decrypted from the site.
export async function saveBackupKey(db, key, user) {
  const existing = await loadBackupKeyDoc(db);
  const previousKeys = existing?.privateKeyPem
    ? [
        ...(existing.previousKeys || []),
        {
          keyId: existing.keyId,
          publicKeyPem: existing.publicKeyPem,
          privateKeyPem: existing.privateKeyPem,
          createdAt: existing.createdAt || null
        }
      ]
    : existing?.previousKeys || [];
  await db.collection(KEY_DOC[0]).doc(KEY_DOC[1]).set({
    keyId: key.keyId,
    publicKeyPem: key.publicKeyPem,
    privateKeyPem: key.privateKeyPem,
    createdAt: key.createdAt,
    createdBy: (user && (user.displayName || user.email)) || 'Admin',
    previousKeys
  });
}

export function downloadKeyFile(key) {
  const payload = {
    format: KEYFILE_FORMAT,
    note: 'PM Computers backup unlock key. Keep this file safe and private. It is needed to open nightly backups if the database itself is ever lost.',
    keyId: key.keyId,
    createdAt: key.createdAt,
    publicKeyPem: key.publicKeyPem,
    privateKeyPem: key.privateKeyPem
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `pmc-backup-key-${key.keyId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  return link.download;
}

export const isEncryptedBackup = (obj) => obj?.format === ENCRYPTED_FORMAT;
export const isKeyFile = (obj) => obj?.format === KEYFILE_FORMAT && !!obj.privateKeyPem;

// candidateKeys: any objects with { keyId, privateKeyPem } (Firestore doc, its
// previousKeys, an uploaded key file). Throws err.code = 'key-not-found' if none match.
export async function decryptBackup(envelope, candidateKeys = []) {
  const key = candidateKeys.find(k => k && k.privateKeyPem && k.keyId === envelope.keyId);
  if (!key) {
    const err = new Error(`This backup was locked with key ${envelope.keyId}, which isn't available. Upload the matching key file (pmc-backup-key-${envelope.keyId}.json).`);
    err.code = 'key-not-found';
    throw err;
  }
  const priv = await crypto.subtle.importKey('pkcs8', pemToDer(key.privateKeyPem), RSA_PARAMS, false, ['decrypt']);
  const aesRaw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, priv, b64ToBytes(envelope.encryptedKey));
  const aes = await crypto.subtle.importKey('raw', aesRaw, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(envelope.iv) }, aes, b64ToBytes(envelope.ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}

export function collectCandidateKeys(keyDoc, keyFile) {
  return [keyDoc, ...((keyDoc && keyDoc.previousKeys) || []), keyFile].filter(Boolean);
}
