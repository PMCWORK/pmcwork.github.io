import { db, firebaseReady, firebase } from '../services/firebase';
import { logAudit } from '../services/auth';
import { MONTHS, BN_DAYS, pad, formatMoney } from './calculations';

export const DEFAULT_FIXED_RATES = {
  shopRent: 5000,
  houseRent: 7000,
  piasDailyRate: 100,
  piasRatio: 55,
  mehediRatio: 45
};

export const PRESET_EXPENSE_CATEGORIES = [
  'Shop Rent',
  'Pias House Rent',
  'Electricity Bill',
  'Miscellaneous'
];

export const ALL_SYSTEM_CATEGORIES = [
  'Shop Rent',
  'Pias House Rent',
  'Electricity Bill',
  'Pias Daily',
  'Daily Operating Costs',
  'Miscellaneous'
];

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatShortMonthYear(ymStr) {
  if (!ymStr || ymStr.length < 7) return ymStr || '';
  const [y, m] = ymStr.split('-').map(Number);
  const shortName = MONTHS[m - 1] ? MONTHS[m - 1].slice(0, 3) : ymStr;
  const shortYear = String(y).slice(-2);
  return `${shortName} ${shortYear}`;
}

export function formatLongMonthYear(ymStr) {
  if (!ymStr || ymStr.length < 7) return ymStr || '';
  const [y, m] = ymStr.split('-').map(Number);
  const name = MONTH_NAMES_FULL[m - 1] || MONTHS[m - 1] || ymStr;
  return `${name} ${y}`;
}

export function getCategoryBadgeColor(category) {
  switch (category) {
    case 'Shop Rent':
      return 'success';
    case 'Pias House Rent':
      return 'secondary';
    case 'Electricity Bill':
      return 'warning';
    case 'Pias Daily':
      return 'secondary';
    case 'Daily Operating Costs':
      return 'primary';
    default:
      return 'default';
  }
}

// ================= FIXED RATES =================
export async function loadFixedRates() {
  let config = { ...DEFAULT_FIXED_RATES };
  try {
    const raw = localStorage.getItem('pmc_fixed_rates');
    if (raw) {
      config = { ...config, ...JSON.parse(raw) };
    }
  } catch (e) {}

  if (firebaseReady && db) {
    try {
      const doc = await db.collection('settings').doc('fixed_rates').get();
      if (doc.exists) {
        config = { ...config, ...doc.data() };
        try {
          localStorage.setItem('pmc_fixed_rates', JSON.stringify(config));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Error fetching fixed_rates:', e);
    }
  }
  return config;
}

export async function saveFixedRates(configObj, user = null) {
  try {
    const current = await loadFixedRates();
    const updated = { ...current, ...configObj };
    try {
      localStorage.setItem('pmc_fixed_rates', JSON.stringify(updated));
    } catch (e) {}

    if (firebaseReady && db) {
      await db.collection('settings').doc('fixed_rates').set(updated, { merge: true });
      await logAudit('fixed_rates', 'rates', 'update', current, updated, user);
    }
    return updated;
  } catch (err) {
    console.error('Error saving fixed_rates:', err);
    throw err;
  }
}

// ================= STORE OFF-DAYS =================
export async function loadOffDays() {
  let offDays = [];
  try {
    const cached = localStorage.getItem('pmc_off_days');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) offDays = parsed;
    }
  } catch (e) {}

  if (firebaseReady && db) {
    try {
      const doc = await db.collection('settings').doc('store_off_days').get();
      if (doc.exists) {
        const data = doc.data();
        if (data && Array.isArray(data.offDays)) {
          offDays = data.offDays;
          try {
            localStorage.setItem('pmc_off_days', JSON.stringify(offDays));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Error fetching store_off_days:', e);
    }
  }
  return offDays;
}

export function isDateOffDay(isoDate, offDays = []) {
  if (!isoDate || !offDays || !offDays.length) return false;
  return offDays.some(o => (typeof o === 'string' ? o : o.date) === isoDate);
}

export async function markDateAsOffDay(isoDate, currentOffDays = [], user = null) {
  if (!isoDate) return currentOffDays;
  const existing = currentOffDays.find(o => (typeof o === 'string' ? o : o.date) === isoDate);
  let updated = [...currentOffDays];
  if (!existing) {
    updated.push({
      date: isoDate,
      reason: 'Store Off-Day',
      markedAt: new Date().toISOString()
    });
  }
  try {
    localStorage.setItem('pmc_off_days', JSON.stringify(updated));
  } catch (e) {}

  if (firebaseReady && db) {
    await db.collection('settings').doc('store_off_days').set({
      offDays: updated,
      updatedAt: (firebase.firestore?.FieldValue) ? firebase.firestore.FieldValue.serverTimestamp() : null
    }, { merge: true });
    await logAudit('settings', 'store_off_days', 'mark_off_day', null, { date: isoDate }, user);
  }
  return updated;
}

export async function unmarkDateAsOffDay(isoDate, currentOffDays = [], user = null) {
  if (!isoDate) return currentOffDays;
  const updated = currentOffDays.filter(o => (typeof o === 'string' ? o : o.date) !== isoDate);
  try {
    localStorage.setItem('pmc_off_days', JSON.stringify(updated));
  } catch (e) {}

  if (firebaseReady && db) {
    await db.collection('settings').doc('store_off_days').set({
      offDays: updated,
      updatedAt: (firebase.firestore?.FieldValue) ? firebase.firestore.FieldValue.serverTimestamp() : null
    }, { merge: true });
    await logAudit('settings', 'store_off_days', 'unmark_off_day', { date: isoDate }, null, user);
  }
  return updated;
}

// ================= EXPENSES SUMMARY COMPUTATION =================
export function computeExpenseSummary(expenses = [], range, categoryFilter = 'all', searchQuery = '') {
  const from = range?.from || '2000-01-01';
  const to = range?.to || '2099-12-31';
  const query = (searchQuery || '').trim().toLowerCase();

  // 1. Filter by payment date range, category, and search text
  const filtered = expenses.filter(e => {
    const d = e.date || '';
    if (d < from || d > to) return false;

    if (categoryFilter && categoryFilter !== 'all') {
      if (categoryFilter === 'custom') {
        if (ALL_SYSTEM_CATEGORIES.includes(e.category)) return false;
      } else if (e.category !== categoryFilter) {
        return false;
      }
    }

    if (query) {
      const matchDesc = (e.desc || '').toLowerCase().includes(query);
      const matchCat = (e.category || '').toLowerCase().includes(query);
      const matchTitle = (e.title || '').toLowerCase().includes(query);
      const matchMethod = (e.paymentMethod || '').toLowerCase().includes(query);
      const matchBillMonth = (e.billingMonth || '').toLowerCase().includes(query);
      if (!matchDesc && !matchCat && !matchTitle && !matchMethod && !matchBillMonth) return false;
    }
    return true;
  });

  // Sort newest first
  filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAtMillis || 0) - (a.createdAtMillis || 0));

  // 2. Aggregate figures
  const totalExpenses = filtered.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const fixedOverhead = filtered
    .filter(e => ['Shop Rent', 'Pias House Rent', 'Electricity Bill'].includes(e.category))
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const dailyOperatingTotal = filtered
    .filter(e => e.category === 'Daily Operating Costs')
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // 3. Category Breakdown for pills
  const rangeExpenses = expenses.filter(e => {
    const d = e.date || '';
    return d >= from && d <= to;
  });
  const categoryMap = {};
  rangeExpenses.forEach(e => {
    const c = e.category || 'Miscellaneous';
    categoryMap[c] = (categoryMap[c] || 0) + (Number(e.amount) || 0);
  });

  // 4. Group by Month (e.date YYYY-MM)
  const monthlyGroups = {};
  filtered.forEach(e => {
    const mKey = (e.date && e.date.length >= 7) ? e.date.slice(0, 7) : (e.billingMonth || to.slice(0, 7));
    if (!monthlyGroups[mKey]) monthlyGroups[mKey] = [];
    monthlyGroups[mKey].push(e);
  });

  const sortedMonthKeys = Object.keys(monthlyGroups).sort().reverse();

  return {
    filteredExpenses: filtered,
    totalExpenses,
    fixedOverhead,
    dailyOperatingTotal,
    categoryBreakdown: categoryMap,
    monthlyGroups,
    sortedMonthKeys
  };
}

// ================= MONTH-END SETTLEMENT AUDIT & CALCULATOR =================
export function computeMonthEndAuditAndCalc({
  targetMonth,
  sales = [],
  expenses = [],
  fixedRates = DEFAULT_FIXED_RATES,
  offDays = [],
  roundingDeduction = 0
}) {
  if (!targetMonth || targetMonth.length < 7) {
    const now = new Date();
    targetMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  }

  const [yStr, mStr] = targetMonth.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const totalDays = new Date(y, m, 0).getDate();
  const mName = MONTHS[m - 1] || targetMonth;

  const mSales = sales.filter(s => s.date && s.date.startsWith(targetMonth));
  const salesMap = {};
  mSales.forEach(s => { salesMap[s.date] = s; });

  let operatingDaysCount = 0;
  let totalRevenue = 0;
  let totalGrossProfit = 0;
  let totalDailyCost = 0;
  let missingDaysCount = 0;
  const nonOperatingRows = [];

  for (let d = 1; d <= totalDays; d++) {
    const dateISO = `${targetMonth}-${pad(d)}`;
    const dObj = new Date(dateISO + 'T00:00:00');
    const dayOfWeek = dObj.getDay();
    const bnDayName = BN_DAYS[dayOfWeek] || '';
    const isThursday = (dayOfWeek === 4);
    const sale = salesMap[dateISO];

    if (sale) {
      operatingDaysCount++;
      totalRevenue += (Number(sale.sale) || 0);
      totalGrossProfit += (Number(sale.profit) || 0);
      totalDailyCost += (Number(sale.cost) || 0);
    } else {
      const isMarked = isDateOffDay(dateISO, offDays);
      if (isThursday) {
        nonOperatingRows.push({
          dateISO,
          day: pad(d),
          bnDayName,
          type: 'thursday',
          label: 'Weekly Off-Day'
        });
      } else if (isMarked) {
        nonOperatingRows.push({
          dateISO,
          day: pad(d),
          bnDayName,
          type: 'marked_offday',
          label: 'Marked Off-Day'
        });
      } else {
        missingDaysCount++;
        nonOperatingRows.push({
          dateISO,
          day: pad(d),
          bnDayName,
          type: 'missing',
          label: 'Missing Entry'
        });
      }
    }
  }

  const nonOperatingCount = totalDays - operatingDaysCount;

  // Expenses in targetMonth strictly by payment date
  const mExpenses = expenses.filter(e => e.date && e.date.startsWith(targetMonth));
  let shopRent = 0;
  let houseRent = Number(fixedRates?.houseRent) || DEFAULT_FIXED_RATES.houseRent;
  let electricity = 0;
  let otherExpenses = 0;

  const elecPaidThisMonth = mExpenses.filter(e => e.category === 'Electricity Bill');
  electricity = elecPaidThisMonth.reduce((a, e) => a + (Number(e.amount) || 0), 0);

  let elecMonthName = '';
  if (elecPaidThisMonth.length > 0 && elecPaidThisMonth[0].billingMonth) {
    const [, bm] = elecPaidThisMonth[0].billingMonth.split('-').map(Number);
    elecMonthName = MONTHS[bm - 1] || '';
  } else {
    const prevM = m === 1 ? 12 : m - 1;
    elecMonthName = MONTHS[prevM - 1] || '';
  }

  mExpenses.forEach(e => {
    const amt = Number(e.amount) || 0;
    if (e.category === 'Shop Rent') shopRent += amt;
    else if (e.category === 'Pias House Rent') {
      if (amt > 0) houseRent = amt;
    } else if (e.category === 'Electricity Bill') {
      // counted above
    } else if (e.category === 'Pias Daily' || e.category === 'Daily Operating Costs') {
      // auto-managed settlement entries
    } else {
      otherExpenses += amt;
    }
  });

  const piasDailyRate = Number(fixedRates?.piasDailyRate) || DEFAULT_FIXED_RATES.piasDailyRate;
  const piasDailyTotal = operatingDaysCount * piasDailyRate;

  // Validation checks
  const hasShopRent = (shopRent > 0);
  const hasHouseRent = (houseRent > 0);
  const hasElectricity = (electricity > 0);
  const hasPiasDaily = (operatingDaysCount > 0);
  const hasDailyCost = (operatingDaysCount > 0);

  const missingItems = [];
  if (!hasShopRent) missingItems.push('Shop Rent');
  if (!hasElectricity) missingItems.push('Electricity Bill');
  if (!hasPiasDaily) missingItems.push('Pias Daily');
  if (!hasDailyCost) missingItems.push('Daily Operating Costs');

  const roundDed = Number(roundingDeduction) || 0;
  const adjustedGrossProfit = Math.max(0, totalGrossProfit - roundDed);
  const totalDeductions = shopRent + houseRent + electricity + piasDailyTotal + totalDailyCost + otherExpenses;
  const distributableProfit = adjustedGrossProfit - totalDeductions;

  const piasRatio = (Number(fixedRates?.piasRatio) || DEFAULT_FIXED_RATES.piasRatio) / 100;
  const mehediRatio = (Number(fixedRates?.mehediRatio) || DEFAULT_FIXED_RATES.mehediRatio) / 100;

  const piasBaseShare = Math.round(distributableProfit * piasRatio);
  const piasTotalTakeHome = piasBaseShare + piasDailyTotal;
  const mehediBaseShare = Math.round(distributableProfit * mehediRatio);
  const mehediTotalTakeHome = mehediBaseShare;

  return {
    targetMonth,
    monthName: mName,
    year: y,
    totalDays,
    operatingDaysCount,
    nonOperatingCount,
    missingDaysCount,
    nonOperatingRows,
    totalRevenue,
    totalGrossProfit,
    totalDailyCost,
    shopRent,
    hasShopRent,
    houseRent,
    hasHouseRent,
    electricity,
    hasElectricity,
    elecMonthName,
    piasDailyRate,
    piasDailyTotal,
    hasPiasDaily,
    hasDailyCost,
    otherExpenses,
    roundingDeduction: roundDed,
    adjustedGrossProfit,
    totalDeductions,
    distributableProfit,
    piasRatio: Math.round(piasRatio * 100),
    piasBaseShare,
    piasTotalTakeHome,
    mehediRatio: Math.round(mehediRatio * 100),
    mehediBaseShare,
    mehediTotalTakeHome,
    missingItems,
    isReadyToFinalize: missingItems.length === 0
  };
}
