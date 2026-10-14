import { db, firebaseReady, firebase } from '../services/firebase';
import { logAudit } from '../services/auth';
import { dhakaNow, toISODate, pad } from './calculations';

export const SALESPERSONS = ['FOYEZ', 'MEHEDI'];

export const WARRANTY_PRESET_OPTIONS = [
  { value: '365 days', label: '1 Year (365 days)' },
  { value: '730 days', label: '2 Years (730 days)' },
  { value: '1095 days', label: '3 Years (1095 days)' },
  { value: '1825 days', label: '5 Years (1825 days)' },
  { value: 'custom', label: 'Custom' }
];

export function getLocalBurnedSeq(yy) {
  try {
    const val = parseInt(localStorage.getItem('pmc_inv_burned_' + yy), 10);
    return isNaN(val) ? 0 : val;
  } catch (e) {
    return 0;
  }
}

export function setLocalBurnedSeq(yy, seq) {
  try {
    const current = getLocalBurnedSeq(yy);
    if (seq > current) {
      localStorage.setItem('pmc_inv_burned_' + yy, String(seq));
    }
  } catch (e) {}
}

export async function fetchRemoteBurnedCounters() {
  if (!firebaseReady || !db) return {};
  try {
    const doc = await db.collection('system_meta').doc('invoice_counters').get();
    if (doc.exists) {
      return doc.data() || {};
    }
  } catch (e) {
    console.warn('fetchRemoteBurnedCounters notice:', e);
  }
  return {};
}

export function getNextInvoiceNumber(dateISO, allInvoices = [], remoteCounters = {}) {
  let yr = new Date().getFullYear();
  if (dateISO) {
    const parts = dateISO.split('-');
    if (parts.length >= 1 && parts[0]) {
      const parsedYr = parseInt(parts[0], 10);
      if (!isNaN(parsedYr)) yr = parsedYr;
    }
  }
  const yy = String(yr).slice(-2);
  const prefix = `PMCINV-${yy}`;

  const remoteSeq = parseInt(remoteCounters[yy], 10) || 0;
  let maxSeq = Math.max(remoteSeq, getLocalBurnedSeq(yy));

  allInvoices.forEach((inv) => {
    const numStr = String(inv.number || '').trim().toUpperCase();
    if (numStr.startsWith(prefix)) {
      const rest = numStr.slice(prefix.length);
      const seq = parseInt(rest, 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  const nextSeq = maxSeq + 1;
  const seqPadded = String(nextSeq).padStart(3, '0');
  return `${prefix}${seqPadded}`;
}

export async function burnInvoiceNumber(numStr, user = null) {
  if (!numStr) return;
  const match = String(numStr).trim().toUpperCase().match(/^PMCINV-(\d{2})(\d+)$/);
  if (match) {
    const yy = match[1];
    const seq = parseInt(match[2], 10);
    if (!isNaN(seq)) {
      const current = Math.max(getLocalBurnedSeq(yy), seq);
      setLocalBurnedSeq(yy, current);

      if (firebaseReady && db) {
        try {
          await db.collection('system_meta').doc('invoice_counters').set({
            [yy]: current,
            updatedAt: (firebase.firestore?.FieldValue) ? firebase.firestore.FieldValue.serverTimestamp() : null
          }, { merge: true });
        } catch (err) {
          console.warn('Counter sync notice:', err);
        }
      }
    }
  }
}

export function formatInvDateSlash(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatDhakaPrintTime() {
  const now = dhakaNow();
  let h = now.getHours();
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? pad(h) : '12';
  return `${h}:${m}:${s}${ampm}`;
}

export function formatCustomPrintTime(timeStr) {
  if (!timeStr) return formatDhakaPrintTime();
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) return formatDhakaPrintTime();
  const m = pad(parseInt(parts[1] || '0', 10));
  const s = pad(parseInt(parts[2] || '0', 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? pad(h) : '12';
  return `${h}:${m}:${s}${ampm}`;
}

export function filterAndSortInvoices(allInvoices = [], {
  range = null,
  soldBy = '',
  search = '',
  sortOrder = 'newest'
} = {}) {
  let list = allInvoices.filter((inv) => {
    if (range && (inv.date < range.from || inv.date > range.to)) return false;
    if (soldBy && inv.soldBy !== soldBy) return false;
    if (search) {
      const query = search.toLowerCase().trim();
      const qNum = String(inv.number || '').toLowerCase();
      const qBuyer = String(inv.buyerName || '').toLowerCase();
      const qPhone = String(inv.buyerPhone || '').toLowerCase();
      const qAddr = String(inv.buyerAddress || '').toLowerCase();
      const qItems = (inv.items || []).map(i => i.desc || '').join(' ').toLowerCase();
      if (!qNum.includes(query) && !qBuyer.includes(query) && !qPhone.includes(query) && !qAddr.includes(query) && !qItems.includes(query)) {
        return false;
      }
    }
    return true;
  });

  list.sort((a, b) => {
    if (sortOrder === 'oldest') {
      return (a.date || '').localeCompare(b.date || '') || String(a.number || '').localeCompare(String(b.number || ''));
    } else if (sortOrder === 'num-high') {
      return String(b.number || '').localeCompare(String(a.number || ''), undefined, { numeric: true });
    } else if (sortOrder === 'num-low') {
      return String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true });
    } else if (sortOrder === 'total-high') {
      const aTot = Number(a.grandTotal || a.totalAmount || 0);
      const bTot = Number(b.grandTotal || b.totalAmount || 0);
      if (bTot !== aTot) return bTot - aTot;
      return (b.date || '').localeCompare(a.date || '');
    } else if (sortOrder === 'total-low') {
      const aTot = Number(a.grandTotal || a.totalAmount || 0);
      const bTot = Number(b.grandTotal || b.totalAmount || 0);
      if (aTot !== bTot) return aTot - bTot;
      return (b.date || '').localeCompare(a.date || '');
    } else if (sortOrder === 'buyer') {
      const aBuyer = (a.buyerName || '').toLowerCase();
      const bBuyer = (b.buyerName || '').toLowerCase();
      if (aBuyer !== bBuyer) return aBuyer.localeCompare(bBuyer);
      return (b.date || '').localeCompare(a.date || '');
    } else {
      // Default: newest first
      return (b.date || '').localeCompare(a.date || '') || String(b.number || '').localeCompare(String(a.number || ''));
    }
  });

  return list;
}
