import { formatMoney, toISODate, dhakaNow } from './calculations';

export function computeShopBalances(purchases = [], payments = [], shopName = '') {
  const normShop = (shopName || '').trim().toLowerCase();

  const shopPurchases = purchases.filter(p => (p.shop || '').trim().toLowerCase() === normShop);
  const shopPayments = payments.filter(p => (p.shop || '').trim().toLowerCase() === normShop);

  const totalBought = shopPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const totalPaidDirect = shopPurchases.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const totalPaidVouchers = shopPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPaid = totalPaidDirect + totalPaidVouchers;
  const due = Math.max(0, totalBought - totalPaid);

  return {
    totalBought,
    totalPaid,
    due,
    purchasesCount: shopPurchases.length,
    paymentsCount: shopPayments.length
  };
}

export function buildShopLedgerTransactions(purchases = [], payments = [], shopName = '') {
  const normShop = (shopName || '').trim().toLowerCase();

  const transactions = [];

  purchases
    .filter(p => (p.shop || '').trim().toLowerCase() === normShop)
    .forEach(p => {
      transactions.push({
        id: p.id,
        date: p.date || toISODate(dhakaNow()),
        type: 'purchase',
        typeLabel: 'Purchase',
        ref: p.invoiceNum || p.number || '—',
        desc: p.notes || (p.items && p.items.length ? `${p.items.length} items` : 'Purchase invoice'),
        bill: Number(p.totalAmount) || 0,
        paid: Number(p.paidAmount) || 0,
        raw: p
      });
    });

  payments
    .filter(p => (p.shop || '').trim().toLowerCase() === normShop)
    .forEach(p => {
      transactions.push({
        id: p.id,
        date: p.date || toISODate(dhakaNow()),
        type: 'payment',
        typeLabel: 'Payment',
        ref: p.note || 'Payment Voucher',
        desc: p.note || 'Due payment voucher',
        bill: 0,
        paid: Number(p.amount) || 0,
        raw: p
      });
    });

  // Sort chronological (oldest to newest) to calculate running due
  transactions.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  let runningDue = 0;
  return transactions.map(t => {
    runningDue += (t.bill - t.paid);
    return {
      ...t,
      runningDue: Math.max(0, runningDue)
    };
  });
}
