import { pad, formatMoney, toISODate, dhakaNow } from './calculations';

export function downloadBlob(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toDDMMYY(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
}

export function exportSalesToCsv(allSales = [], from, to) {
  const rows = allSales
    .filter(s => s.date >= from && s.date <= to)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  if (!rows.length) return false;

  const totalSale = rows.reduce((a, s) => a + (Number(s.sale) || 0), 0);
  const totalProfit = rows.reduce((a, s) => a + (Number(s.profit) || 0), 0);
  const totalCost = rows.reduce((a, s) => a + (Number(s.cost) || 0), 0);
  const totalPct = totalSale > 0 ? Math.round((totalProfit / totalSale) * 100) : 0;

  const header = 'Date,Sale,Profit,Cost,Profit %,Entered By\n';
  const body = rows.map(s => [
    toDDMMYY(s.date),
    Math.round(Number(s.sale) || 0),
    Math.round(Number(s.profit) || 0),
    Math.round(Number(s.cost) || 0),
    Math.round((Number(s.profitPct) || 0) * 100),
    `"${(s.enteredBy || '').replace(/"/g, '""')}"`
  ].join(',')).join('\n');

  const totalRow = `\nTOTAL,${Math.round(totalSale)},${Math.round(totalProfit)},${Math.round(totalCost)},${totalPct},`;

  downloadBlob(header + body + totalRow, `pmc-sales-${from}_to_${to}.csv`);
  return true;
}

export function exportProductsToCsv(products = []) {
  if (!products.length) return false;
  const header = 'Tracking #,Product Description,Shop Name,Serial Number,Status,Date Logged,Notes\n';
  const body = products.map(p => [
    `"#${p.trackNum || ''}"`,
    `"${(p.desc || '').replace(/"/g, '""')}"`,
    `"${(p.shop || '').replace(/"/g, '""')}"`,
    `"${(p.sn || '').replace(/"/g, '""')}"`,
    `"${(p.status || 'unmarked').toUpperCase()}"`,
    `"${p.dateLabel || p.date || ''}"`,
    `"${(p.note || '').replace(/"/g, '""')}"`
  ].join(',')).join('\n');

  downloadBlob(header + body, `pmc-product-tracker-${toISODate(dhakaNow())}.csv`);
  return true;
}

export function exportInvoicesToCsv(invoices = []) {
  if (!invoices.length) return false;
  const header = 'Invoice #,Date,Buyer Name,Phone,Address,Sold By,Items Count,Total Amount,Discount,Grand Total\n';
  const body = invoices.map(inv => [
    `"${inv.number || ''}"`,
    `"${inv.date || ''}"`,
    `"${(inv.buyerName || '').replace(/"/g, '""')}"`,
    `"${(inv.buyerPhone || '').replace(/"/g, '""')}"`,
    `"${(inv.buyerAddress || '').replace(/"/g, '""')}"`,
    `"${inv.soldBy || 'FOYEZ'}"`,
    (inv.items || []).length,
    Math.round(Number(inv.totalAmount) || 0),
    Math.round(Number(inv.discount) || 0),
    Math.round(Number(inv.grandTotal) || 0)
  ].join(',')).join('\n');

  downloadBlob(header + body, `pmc-invoices-${toISODate(dhakaNow())}.csv`);
  return true;
}

export function exportExpensesToCsv(expenses = []) {
  if (!expenses.length) return false;
  const header = 'Date,Billing Month,Category,Amount,Payment Method,Details,Entered By\n';
  const body = expenses.map(e => [
    `"${e.date || ''}"`,
    `"${e.billingMonth || ''}"`,
    `"${(e.category || '').replace(/"/g, '""')}"`,
    Math.round(Number(e.amount) || 0),
    `"${e.paymentMethod || 'Cash'}"`,
    `"${(e.desc || '').replace(/"/g, '""')}"`,
    `"${e.enteredBy || ''}"`
  ].join(',')).join('\n');

  downloadBlob(header + body, `pmc-expenses-${toISODate(dhakaNow())}.csv`);
  return true;
}
