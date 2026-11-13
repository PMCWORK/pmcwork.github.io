import { firebase, auth, db, firebaseReady } from './firebase';

export const AUTHORIZED_EMAIL_HASHES = [
  'eca75e4e1389363b55d45cc87f735f3679c37629d3dd037a26b2933e750e76ac', // Admin
  '8b50a2e0e9c3dceadb257982fca99342e5bac8cf2eca829c2281d9b925ffdccd', // Store
  'aed3fc6d92114d03707bb48705bbc74100e61b8f48b4f14587a353bfc9355c35', // Partner
  '32f43503ae26b765ea9797acda2d66dfe252ca4331b4b9f94ec246345502b123'  // On-the-go PIN Account (ezmehedi)
];


export async function hashEmail(str) {
  if (!str) return '';
  const clean = str.toLowerCase().trim();
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(clean);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return clean;
}

export async function isAuthorizedEmail(email) {
  if (!email) return false;
  const h = await hashEmail(email);
  return AUTHORIZED_EMAIL_HASHES.includes(h);
}

export function maskEmail(email) {
  if (!email) return '-';
  const parts = email.split('@');
  if (parts.length < 2) return '******';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? name[0] + '***' + name.slice(-1) : '***';
  return `${maskedName}@${domain}`;
}

export async function logAudit(entityType, entityIdOrAction, actionOrData, before, after, user) {
  if (!firebaseReady || !db) return;
  try {
    let finalEntityType = entityType || 'general';
    let finalEntityId = '';
    let finalAction = 'update';
    let finalBefore = null;
    let finalAfter = null;

    if (typeof actionOrData === 'object' && before === undefined && after === undefined) {
      finalEntityId = 'sys';
      finalAction = typeof entityIdOrAction === 'string' ? entityIdOrAction : 'update';
      finalAfter = actionOrData;
    } else {
      finalEntityId = entityIdOrAction || '';
      finalAction = typeof actionOrData === 'string' ? actionOrData : 'update';
      finalBefore = before || null;
      finalAfter = after || null;
    }

    const serverTs = firebase.firestore?.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : null;
    const authorName = (user && (user.displayName || user.email)) || 'Admin';

    await db.collection('audit_log').add({
      entityType: finalEntityType,
      entityId: finalEntityId,
      action: finalAction,
      before: finalBefore,
      after: finalAfter,
      author: authorName,
      timestamp: serverTs,
      timestampMillis: Date.now()
    });
  } catch (err) {
    console.warn('logAudit notice:', err);
  }
}

export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase Auth is not ready');
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await auth.signInWithPopup(provider);
  return result.user;
}

// Shared Firebase email/password account used by the staff PIN pad.
// The 6-digit PIN IS this account's Firebase password: Firebase checks it server-side,
// so no PIN or password is stored in this (public) code. To change the PIN, reset this
// account's password in Firebase Console > Authentication > Users.
const PIN_ACCOUNT_EMAIL = 'ezmehedi@gmail.com';

export async function loginWithPin(enteredPin) {
  if (!auth) throw new Error('Firebase Auth is not ready');
  if (!/^\d{6}$/.test(enteredPin || '')) {
    throw new Error('Incorrect PIN');
  }
  try {
    const result = await auth.signInWithEmailAndPassword(PIN_ACCOUNT_EMAIL, enteredPin);
    return { ...result.user, isGuest: true };
  } catch (err) {
    const wrongPinCodes = ['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/user-not-found'];
    const e = new Error(wrongPinCodes.includes(err?.code) ? 'Incorrect PIN' : (err?.message || 'PIN login failed'));
    e.code = err?.code;
    throw e;
  }
}

export async function logoutUser() {
  if (auth) {
    await auth.signOut();
  }
}
