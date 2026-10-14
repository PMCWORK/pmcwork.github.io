import { pad, MONTHS, toISODate, dhakaNow } from './calculations';
export { toISODate, dhakaNow, pad };

export const TOP_SHOPS = ['Liton', 'RB', 'Arif', 'RV', 'SM', 'Mahabub', 'CC', 'SS', 'Masud', 'HF'];

export const SHOP_CANONICAL_MAP = {
  // Liton variations
  'liton': 'Liton',
  'liron': 'Liton',
  'linon': 'Liton',
  'lit': 'Liton',
  'liton 23.04.22': 'Liton',
  'pm to liron': 'Liton',

  // RB variations
  'rb': 'RB',

  // Arif variations
  'arif': 'Arif',
  '"arif c c camera': 'Arif',
  'arif c c camera': 'Arif',

  // RV variations
  'rv': 'RV',

  // SM variations
  'sm': 'SM',

  // Mahabub variations
  'mahabub': 'Mahabub',
  'mahbub': 'Mahabub',
  'mahabub ': 'Mahabub',
  'mhbub': 'Mahabub',

  // CC variations
  'cc': 'CC',
  'c c': 'CC',

  // SS variations
  'ss': 'SS',
  'ss t': 'SS',

  // Masud variations
  'masud': 'Masud',
  'madus': 'Masud',

  // HF variations
  'hf': 'HF',

  // Other known aliases
  'a to z': 'A to Z',
  'connect': 'Connect',
  'cnnect': 'Connect',
  'jenat': 'Jannat',
  'jennat': 'Jannat',
  'suvo': 'Suvo',
  'suvho': 'Suvo',
  '4ey': '4EY',
  '4eys': '4EY',
  'ayan food': 'Ayan Food',
  'ayan fod': 'Ayan Food',
  'zim': 'Zim',
  'monir': 'Monir',
  'rasel': 'Rasel',
  'rasel con': 'Rasel',
  'rasel vai': 'Rasel'
};

export function getCanonicalShop(shopName) {
  if (!shopName) return '';
  const clean = shopName.trim().toLowerCase();
  return SHOP_CANONICAL_MAP[clean] || shopName.trim();
}

export function getUnifiedShopList(allShops = []) {
  const list = [...TOP_SHOPS];
  if (Array.isArray(allShops)) {
    allShops.forEach(s => {
      const name = (typeof s === 'string' ? s : s?.name || '').trim();
      if (name && !list.some(x => x.toLowerCase() === name.toLowerCase())) {
        list.push(name);
      }
    });
  }
  return list;
}

export function shopMatchesFilter(recordShop, selectedFilter) {
  if (!selectedFilter) return true;
  if (!recordShop) return false;

  const recTrim = recordShop.trim();
  const selTrim = selectedFilter.trim();

  if (recTrim === selTrim) return true;
  if (recTrim.toLowerCase() === selTrim.toLowerCase()) return true;

  const canonRec = getCanonicalShop(recTrim);
  const canonSel = getCanonicalShop(selTrim);
  if (canonRec.toLowerCase() === canonSel.toLowerCase()) return true;
  if (canonRec.toLowerCase() === selTrim.toLowerCase()) return true;
  if (recTrim.toLowerCase() === canonSel.toLowerCase()) return true;

  return false;
}

export function formatDateTimeLabels(dt) {
  const dateObj = dt instanceof Date ? dt : new Date(dt);
  if (isNaN(dateObj.getTime())) return { dateLabel: '', timeLabel: '' };

  const dateLabel = `${pad(dateObj.getDate())} ${MONTHS[dateObj.getMonth()]} ${String(dateObj.getFullYear()).slice(-2)}`;
  let h = dateObj.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const timeLabel = `${h}:${pad(dateObj.getMinutes())} ${ampm}`;
  return { dateLabel, timeLabel };
}

export function parseDateLabelToISO(label) {
  if (!label) return null;
  const trimmed = label.trim();
  let m = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${year}-${pad(month)}-${pad(day)}`;
    return null;
  }
  m = trimmed.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[\s-](\d{2,4})$/);
  if (m) {
    const monIdx = MONTHS.findIndex(mo => mo.toLowerCase() === m[2].toLowerCase());
    if (monIdx === -1) return null;
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    return `${year}-${pad(monIdx + 1)}-${pad(parseInt(m[1], 10))}`;
  }
  return null;
}

export function productDateISO(p) {
  if (!p) return null;
  return p.dateISO || parseDateLabelToISO(p.dateLabel);
}

export function formatProductDateDisplay(p) {
  if (!p) return '—';
  let iso = p.dateISO;
  if (!iso && p.dateLabel) {
    iso = parseDateLabelToISO(p.dateLabel);
  }
  if (!iso && p.createdAt) {
    try {
      const d = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      if (!isNaN(d.getTime())) iso = toISODate(d);
    } catch (e) {}
  }
  if (iso) {
    const parts = iso.split('-').map(Number);
    if (parts.length >= 3) {
      const [y, m, d] = parts;
      const monStr = MONTHS[m - 1] || '';
      const yyStr = String(y).slice(-2);
      return `${pad(d)} ${monStr} ${yyStr}`;
    }
  }
  return p.dateLabel || '—';
}

export const PROD_NUM_START = 2001;

export function getNextAvailableProductNumber(allProducts = []) {
  const usedNumbers = new Set();
  allProducts.forEach(p => {
    if (p.trackNum) {
      const n = Number(p.trackNum);
      if (!isNaN(n)) usedNumbers.add(n);
    }
  });
  let candidate = PROD_NUM_START;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }
  return candidate;
}

export function localDatetimeValue(dateObj = new Date()) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
