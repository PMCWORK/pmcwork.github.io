import { formatDateLabel, formatMoney, formatPct, toISODate, pad } from './calculations';

export const AUDIT_ENTITIES = [
  { value: 'all', label: 'All categories' },
  { value: 'sale', label: 'Sales entries' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'product', label: 'Product tracker' },
  { value: 'pm_brings', label: 'PM Brings' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'supplier_shop', label: 'Supplier shops' },
  { value: 'purchase_payment', label: 'Supplier Payments' },
  { value: 'expense', label: 'Expenses' },
  { value: 'settlement', label: 'Month-End Settlements' },
  { value: 'price_list', label: 'Price List' },
  { value: 'fixed_rates', label: 'Fixed Rates & Ratios' },
  { value: 'settings', label: 'Notification & Settings' }
];

export const AUDIT_ACTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'create', label: 'Created / Generated' },
  { value: 'update', label: 'Updated / Edited' },
  { value: 'delete', label: 'Deleted' },
  { value: 'status_change', label: 'Status Changes' }
];

export function formatAuditTimestamp(entry) {
  let dt = null;
  if (entry.timestampMillis) dt = new Date(entry.timestampMillis);
  else if (entry.timestamp && entry.timestamp.toDate) dt = entry.timestamp.toDate();
  else if (entry.createdAt && entry.createdAt.toDate) dt = entry.createdAt.toDate();
  if (!dt || isNaN(dt.getTime())) return { fullText: '—', relText: '' };

  const dateStr = formatDateLabel(toISODate(dt));
  let h = dt.getHours();
  const m = pad(dt.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const timeStr = `${h}:${m} ${ampm}`;

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - dt.getTime()) / 1000));
  let relText = '';
  if (diffSec < 60) relText = 'Just now';
  else if (diffSec < 3600) relText = `${Math.floor(diffSec / 60)}m ago`;
  else if (diffSec < 86400) relText = `${Math.floor(diffSec / 3600)}h ago`;
  else relText = `${Math.floor(diffSec / 86400)}d ago`;

  return {
    dateStr,
    timeStr,
    relText,
    fullText: `${dateStr} · ${timeStr}`
  };
}

export function parseAuditItem(entry) {
  const type = entry.entityType || 'general';
  let action = 'update';
  let b = entry.before && typeof entry.before === 'object' ? entry.before : {};
  let a = entry.after && typeof entry.after === 'object' ? entry.after : {};

  if (typeof entry.action === 'string') {
    action = entry.action;
  } else if (entry.action && typeof entry.action === 'object') {
    a = { ...entry.action, ...a };
    if (entry.action.action && typeof entry.action.action === 'string') {
      action = entry.action.action;
    } else if (typeof entry.entityId === 'string' && entry.entityId) {
      action = entry.entityId;
    }
  }

  const time = formatAuditTimestamp(entry);

  let titleText = '';
  let badgeColor = 'default'; // 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  let badgeText = typeof action === 'string' ? action.toUpperCase() : 'ACTIVITY';
  let details = [];
  let diffs = [];

  switch (type) {
    case 'auth':
      titleText = 'Staff Login · Google Authentication';
      badgeColor = 'success';
      badgeText = 'Logged In';
      details.push(`Authorized user ${a.user || a.name || entry.author || 'Staff'} signed in.`);
      break;

    case 'invoice':
      if (action === 'create') {
        titleText = `Generated Invoice #${a.number || '—'}`;
        badgeColor = 'success';
        badgeText = 'Invoice Created';
        details.push(`Grand total: ${formatMoney(a.grandTotal || a.totalAmount || 0)}`);
        details.push(`${(a.items || []).length} items`);
        if (a.buyerName) details.push(`Buyer: ${a.buyerName}`);
        if (a.soldBy) details.push(`Sold by: ${a.soldBy}`);
      } else if (action === 'update') {
        titleText = `Updated Invoice #${a.number || b.number || '—'}`;
        badgeColor = 'primary';
        badgeText = 'Invoice Updated';
        if (b.grandTotal !== a.grandTotal) diffs.push(`Amount: ${formatMoney(b.grandTotal || 0)} → ${formatMoney(a.grandTotal || 0)}`);
        if (b.discount !== a.discount) diffs.push(`Discount: ${formatMoney(b.discount || 0)} → ${formatMoney(a.discount || 0)}`);
        if (b.buyerName !== a.buyerName) diffs.push(`Buyer: ${b.buyerName || '—'} → ${a.buyerName || '—'}`);
        if (b.soldBy !== a.soldBy) diffs.push(`Sold by: ${b.soldBy || '—'} → ${a.soldBy || '—'}`);
      } else if (action === 'delete') {
        titleText = `Deleted Invoice #${b.number || '—'}`;
        badgeColor = 'danger';
        badgeText = 'Invoice Deleted';
        details.push(`Invoice #${b.number || '—'} for ${formatMoney(b.grandTotal || 0)} was permanently removed.`);
      }
      break;

    case 'sale':
      if (action === 'create') {
        titleText = `Added Sale Entry (${formatDateLabel(a.date)})`;
        badgeColor = 'success';
        badgeText = 'Sale Added';
        details.push(`Sale: ${formatMoney(a.sale || 0)}`);
        details.push(`Profit: ${formatMoney(a.profit || 0)} (${formatPct(a.profitPct || 0)})`);
        details.push(`Cost: ${formatMoney(a.cost || 0)}`);
      } else if (action === 'update') {
        titleText = `Edited Sale Entry (${formatDateLabel(a.date || b.date)})`;
        badgeColor = 'primary';
        badgeText = 'Sale Updated';
        if (b.sale !== a.sale) diffs.push(`Sale: ${formatMoney(b.sale || 0)} → ${formatMoney(a.sale || 0)}`);
        if (b.profit !== a.profit) diffs.push(`Profit: ${formatMoney(b.profit || 0)} → ${formatMoney(a.profit || 0)}`);
        if (b.cost !== a.cost) diffs.push(`Cost: ${formatMoney(b.cost || 0)} → ${formatMoney(a.cost || 0)}`);
      } else if (action === 'delete') {
        titleText = `Deleted Sale Entry (${formatDateLabel(b.date)})`;
        badgeColor = 'danger';
        badgeText = 'Sale Deleted';
        details.push(`Sale entry for ${formatDateLabel(b.date)} (${formatMoney(b.sale || 0)}) was removed.`);
      }
      break;

    case 'product':
      const trackLabel = a.trackNum || b.trackNum ? `#${a.trackNum || b.trackNum} ` : '';
      if (action === 'status_change') {
        const st = a.status || 'unmarked';
        titleText = `Marked ${trackLabel}'${a.desc || b.desc || 'Item'}' as ${st.toUpperCase()}`;
        badgeColor = st === 'sold' ? 'success' : st === 'returned' ? 'danger' : 'default';
        badgeText = `Marked ${st.toUpperCase()}`;
        if (a.shop) details.push(`Shop: ${a.shop}`);
        if (a.sn) details.push(`SN: ${a.sn}`);
        diffs.push(`Status: ${b.status || 'unmarked'} → ${st}`);
      } else if (action === 'create') {
        titleText = `Added Product ${trackLabel}'${a.desc || 'Item'}'`;
        badgeColor = 'success';
        badgeText = 'Product Added';
        if (a.shop) details.push(`Shop: ${a.shop}`);
        if (a.sn) details.push(`SN: ${a.sn}`);
        if (a.note) details.push(`Note: ${a.note}`);
      } else if (action === 'update') {
        titleText = `Edited Product ${trackLabel}'${a.desc || b.desc || 'Item'}'`;
        badgeColor = 'primary';
        badgeText = 'Product Updated';
        if (b.desc !== a.desc) diffs.push(`Name: ${b.desc || ''} → ${a.desc || ''}`);
        if (b.shop !== a.shop) diffs.push(`Shop: ${b.shop || ''} → ${a.shop || ''}`);
        if (b.sn !== a.sn) diffs.push(`SN: ${b.sn || ''} → ${a.sn || ''}`);
      } else if (action === 'delete') {
        titleText = `Deleted Product ${trackLabel}'${b.desc || 'Item'}'`;
        badgeColor = 'danger';
        badgeText = 'Product Deleted';
        details.push(`Product '${b.desc || ''}' from shop ${b.shop || ''} was removed.`);
      }
      break;

    case 'expense':
      const cat = a.category || b.category || 'Miscellaneous';
      if (action === 'create') {
        titleText = `Recorded Expense: ${cat} (${formatMoney(a.amount || 0)})`;
        badgeColor = 'warning';
        badgeText = 'Expense Added';
        details.push(`Category: ${cat}`);
        details.push(`Amount: ${formatMoney(a.amount || 0)}`);
        details.push(`Date: ${formatDateLabel(a.date)}`);
      } else if (action === 'update') {
        titleText = `Updated Expense: ${cat}`;
        badgeColor = 'primary';
        badgeText = 'Expense Updated';
        if (b.amount !== a.amount) diffs.push(`Amount: ${formatMoney(b.amount || 0)} → ${formatMoney(a.amount || 0)}`);
        if (b.category !== a.category) diffs.push(`Category: ${b.category || ''} → ${a.category || ''}`);
      } else if (action === 'delete') {
        titleText = `Deleted Expense: ${cat} (${formatMoney(b.amount || 0)})`;
        badgeColor = 'danger';
        badgeText = 'Expense Deleted';
        details.push(`Expense of ${formatMoney(b.amount || 0)} for ${cat} was removed.`);
      }
      break;

    case 'settlement':
      const monthStr = a.month || b.month || 'Settlement';
      if (action === 'create') {
        titleText = `Finalized Month-End Settlement for ${monthStr}`;
        badgeColor = 'success';
        badgeText = 'Settled';
        details.push(`Distributable: ${formatMoney(a.distributableProfit || 0)}`);
        details.push(`Pias (55%+Daily): ${formatMoney(a.piasTotalTakeHome || 0)}`);
        details.push(`Mehedi (45%): ${formatMoney(a.mehediTotalTakeHome || 0)}`);
      } else if (action === 'update') {
        titleText = `Updated Settlement Statement for ${monthStr}`;
        badgeColor = 'primary';
        badgeText = 'Settlement Modified';
        if (b.distributableProfit !== a.distributableProfit) {
          diffs.push(`Distributable: ${formatMoney(b.distributableProfit || 0)} → ${formatMoney(a.distributableProfit || 0)}`);
        }
      } else if (action === 'delete') {
        titleText = `Deleted Settlement for ${monthStr}`;
        badgeColor = 'danger';
        badgeText = 'Settlement Removed';
      }
      break;

    case 'purchase':
      const sShop = a.shopName || b.shopName || 'Supplier';
      if (action === 'create') {
        titleText = `Recorded Purchase from ${sShop}`;
        badgeColor = 'success';
        badgeText = 'Purchase Added';
        details.push(`Bill: ${formatMoney(a.totalAmount || 0)}`);
        details.push(`Paid: ${formatMoney(a.paidAmount || 0)}`);
        details.push(`Due: ${formatMoney(a.dueAmount || 0)}`);
      } else if (action === 'update') {
        titleText = `Updated Purchase from ${sShop}`;
        badgeColor = 'primary';
        badgeText = 'Purchase Updated';
        if (b.totalAmount !== a.totalAmount) diffs.push(`Bill: ${formatMoney(b.totalAmount || 0)} → ${formatMoney(a.totalAmount || 0)}`);
        if (b.paidAmount !== a.paidAmount) diffs.push(`Paid: ${formatMoney(b.paidAmount || 0)} → ${formatMoney(a.paidAmount || 0)}`);
      } else if (action === 'delete') {
        titleText = `Deleted Purchase from ${sShop}`;
        badgeColor = 'danger';
        badgeText = 'Purchase Deleted';
        details.push(`Purchase bill from ${sShop} was permanently removed.`);
      }
      break;

    default:
      titleText = `System Activity · ${type}`;
      badgeColor = 'default';
      badgeText = typeof action === 'string' ? action.toUpperCase() : 'LOGGED';
      details.push(`Activity recorded in ${type} by ${entry.author || 'Admin'}.`);
      break;
  }

  return {
    id: entry.id,
    type,
    action,
    titleText,
    badgeColor,
    badgeText,
    time,
    details,
    diffs,
    author: entry.author || 'Authorized User'
  };
}

export function filterAndSortAuditLog(auditList = [], {
  entityFilter = 'all',
  actionFilter = 'all',
  search = '',
  sortOrder = 'newest'
} = {}) {
  const query = (search || '').toLowerCase().trim();

  const filtered = auditList.filter((entry) => {
    if (entityFilter !== 'all' && entry.entityType !== entityFilter) return false;
    if (actionFilter !== 'all' && entry.action !== actionFilter) return false;

    if (query) {
      const hay = (
        (entry.entityType || '') + ' ' +
        (entry.action || '') + ' ' +
        (entry.author || '') + ' ' +
        JSON.stringify(entry.before || {}) + ' ' +
        JSON.stringify(entry.after || {})
      ).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const aTime = a.timestampMillis || 0;
    const bTime = b.timestampMillis || 0;

    if (sortOrder === 'oldest') {
      return aTime - bTime;
    } else if (sortOrder === 'entity') {
      const aEnt = (a.entityType || '').toLowerCase();
      const bEnt = (b.entityType || '').toLowerCase();
      if (aEnt !== bEnt) return aEnt.localeCompare(bEnt);
      return bTime - aTime;
    } else if (sortOrder === 'action') {
      const aAct = (a.action || '').toLowerCase();
      const bAct = (b.action || '').toLowerCase();
      if (aAct !== bAct) return aAct.localeCompare(bAct);
      return bTime - aTime;
    } else {
      // newest first
      return bTime - aTime;
    }
  });

  return filtered;
}
