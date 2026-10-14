export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const BN_DAYS = ['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];

export function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

export function dhakaNow() {
  try {
    const utc = new Date(Date.now());
    const dhakaStr = utc.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
    const d = new Date(dhakaStr);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {}
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcMs + (6 * 3600000));
}

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatMoney(n) {
  return '৳ ' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

export function formatMoneyShort(n) {
  n = Number(n) || 0;
  if (Math.abs(n) >= 100000) {
    const lakh = Math.round((n / 100000) * 10) / 10;
    return '৳ ' + (lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)) + 'L';
  }
  return '৳ ' + Math.round(n).toLocaleString('en-US');
}

export function formatPct(ratio) {
  return Math.round((Number(ratio) || 0) * 100) + '%';
}

export function formatDateLabel(iso) {
  if (!iso) return '-';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = MONTHS[monthIdx] || parts[1];
  return `${parseInt(parts[2], 10)} ${monthName} ${parts[0]}`;
}

export function formatDateEmail(dt) {
  if (!dt) return '';
  const d = dt instanceof Date ? dt : new Date(dt);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function getDateChipData(targetDate) {
  let dObj;
  if (!targetDate) {
    dObj = dhakaNow();
  } else if (targetDate instanceof Date) {
    dObj = targetDate;
  } else if (typeof targetDate === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      dObj = new Date(targetDate + 'T12:00:00');
    } else {
      dObj = new Date(targetDate);
    }
  } else {
    dObj = dhakaNow();
  }
  if (isNaN(dObj.getTime())) dObj = dhakaNow();

  const dayOfWeek = dObj.getDay();
  const bnDayName = BN_DAYS[dayOfWeek] || '';
  const enDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
  const dateFormatted = `${pad(dObj.getDate())} ${MONTHS[dObj.getMonth()]} ${dObj.getFullYear()}`;
  const iso = toISODate(dObj);

  return {
    bnDayName,
    enDayName,
    dateFormatted,
    iso,
    dObj
  };
}

export function monthToDateRange(monthOffset = 0) {
  const today = dhakaNow();
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const daysInBase = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const day = Math.min(today.getDate(), daysInBase);
  return {
    from: toISODate(base),
    to: toISODate(new Date(base.getFullYear(), base.getMonth(), day))
  };
}

export function yearToDateRange(yearOffset = 0) {
  const today = dhakaNow();
  const y = today.getFullYear() + yearOffset;
  const from = `${y}-01-01`;
  const to = toISODate(new Date(y, today.getMonth(), today.getDate()));
  return { from, to };
}

export function sumInRange(sales, from, to) {
  if (!Array.isArray(sales)) return { sale: 0, profit: 0 };
  return sales
    .filter(s => s.date && s.date >= from && s.date <= to)
    .reduce((acc, s) => {
      acc.sale += Number(s.sale) || 0;
      acc.profit += Number(s.profit) || 0;
      return acc;
    }, { sale: 0, profit: 0 });
}

export function getMissingSalesDays(allSales = [], allOffDays = [], lookbackDays = 30) {
  if (!Array.isArray(allSales)) return [];
  const now = dhakaNow();
  const missing = [];
  const salesDatesSet = new Set(allSales.map(s => s.date).filter(Boolean));
  const offDaysSet = new Set(allOffDays.map(o => (typeof o === 'string' ? o : o.date)).filter(Boolean));

  for (let i = 1; i <= lookbackDays; i++) {
    const dObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0);
    const dayOfWeek = dObj.getDay(); // 0: Sun ... 4: Thu (weekly off-day)

    if (dayOfWeek === 4) continue; // Skip Thursday

    const iso = toISODate(dObj);
    if (offDaysSet.has(iso)) continue;

    if (!salesDatesSet.has(iso)) {
      const dayNameEn = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayOfWeek];
      const dayNameBn = BN_DAYS[dayOfWeek] || '';
      missing.push({
        iso,
        dateObj: dObj,
        dayOfWeek,
        dayNameEn,
        dayNameBn,
        formattedLabel: formatDateLabel(iso),
        daysAgo: i
      });
    }
  }

  return missing;
}

export function cumulativeMonthSeries(allSales, year, month0, upToDay) {
  if (!Array.isArray(allSales) || isNaN(year) || isNaN(month0)) return [];
  const dim = new Date(year, month0 + 1, 0).getDate();
  if (isNaN(dim) || dim <= 0) return [];

  const arr = [];
  let running = 0;
  for (let day = 1; day <= dim; day++) {
    if (upToDay && day > upToDay) {
      arr.push(null);
      continue;
    }
    const iso = `${year}-${pad(month0 + 1)}-${pad(day)}`;
    const dayTotal = allSales
      .filter(x => x.date === iso)
      .reduce((sum, s) => sum + (Number(s.sale) || 0), 0);
    running += dayTotal;
    arr.push(running);
  }
  return arr;
}

export function sparklinePoints(values, w = 64, h = 26) {
  if (!values || !values.length) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = (max - min) || 1;
  return values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function bnDay(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return BN_DAYS[d.getDay()] || '';
}

export function trimNum(n) {
  n = Number(n) || 0;
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

export function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildSalesCSV(rows) {
  const sorted = [...rows].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const totalSale = sorted.reduce((a, s) => a + (Number(s.sale) || 0), 0);
  const totalProfit = sorted.reduce((a, s) => a + (Number(s.profit) || 0), 0);
  const totalCost = sorted.reduce((a, s) => a + (Number(s.cost) || 0), 0);
  const totalPct = totalSale > 0 ? Math.round((totalProfit / totalSale) * 100) : 0;
  const header = 'Date,Day,Sale,Profit,Cost,Profit %\n';
  const body = sorted.map(s => [
    formatDateLabel(s.date),
    bnDay(s.date),
    trimNum(s.sale),
    trimNum(s.profit),
    trimNum(s.cost),
    Math.round((Number(s.profitPct) || 0) * 100)
  ].join(',')).join('\n');
  const totalRow = `\nTOTAL,,${trimNum(totalSale)},${trimNum(totalProfit)},${trimNum(totalCost)},${totalPct}`;
  return header + body + totalRow;
}

