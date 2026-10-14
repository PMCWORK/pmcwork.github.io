import { logAudit } from './auth';

export const EMAILJS_CONFIG = {
  serviceId: 'service_xd4867q',
  templateId: 'template_660ftyo',
  publicKey: 'RQ_lhlIyaHqMXR2Rt'
};

const DEFAULT_RECIPIENTS = [
  {
    id: 'default_admin',
    name: 'Admin',
    email: 'ezmehedi@gmail.com',
    alertDaily: true,
    dailyIncSales: true,
    dailyIncInvoices: true,
    dailyIncProducts: true,
    dailyIncBrings: true,
    dailyTiming: '23:00',
    alertMonthly: true,
    alertYearly: true,
    updatedAt: Date.now()
  }
];

export async function loadNotificationSettings(db) {
  let recipients = null;

  try {
    const cached = localStorage.getItem('pmc_notification_recipients');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length) recipients = parsed;
    }
  } catch (e) {
    console.warn('Failed to parse cached recipients:', e);
  }

  if (db) {
    try {
      const snap = await db.collection('settings').doc('notifications').get();
      if (snap.exists) {
        const data = snap.data();
        if (Array.isArray(data.recipients) && data.recipients.length) {
          recipients = data.recipients;
          try {
            localStorage.setItem('pmc_notification_recipients', JSON.stringify(recipients));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Error fetching notification recipients from Firestore:', e);
    }
  }

  return recipients || DEFAULT_RECIPIENTS;
}

export async function saveNotificationRecipients(recipients, db, user) {
  try {
    localStorage.setItem('pmc_notification_recipients', JSON.stringify(recipients));
  } catch (e) {}

  if (db) {
    try {
      await db.collection('settings').doc('notifications').set({
        recipients,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.displayName || user?.email || 'Admin'
      }, { merge: true });

      await logAudit('settings', 'notifications', 'update', null, { count: recipients.length }, user);
    } catch (e) {
      console.error('Error saving notification recipients to Firestore:', e);
    }
  }
}

export function buildEmailWrapper(title, dateBadge, contentHtml) {
  return `
    <div style="background-color:#f4f5f8; padding:24px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#191c22; line-height:1.5;">
      <div style="max-width:580px; margin:0 auto; background:#ffffff; border-radius:14px; border:1px solid #e4e7ee; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #0e8c81 0%, #185a95 100%); padding:20px 24px; color:#ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <div style="font-size:18px; font-weight:800; letter-spacing:0.5px; font-family:'Space Grotesk', sans-serif;">PMC WORK</div>
                <div style="font-size:11px; opacity:0.85; text-transform:uppercase; letter-spacing:0.8px; margin-top:2px;">Data Management System</div>
              </td>
              <td style="text-align:right; vertical-align:middle;">
                <div style="font-size:13.5px; font-weight:700; color:#ffffff; letter-spacing:0.2px;">${title}</div>
                ${dateBadge ? `<div style="font-size:11px; opacity:0.85; margin-top:3px;">${dateBadge}</div>` : ''}
              </td>
            </tr>
          </table>
        </div>

        <!-- Body Content -->
        <div style="padding:22px 24px;">
          ${contentHtml}
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc; padding:14px 24px; border-top:1px solid #e2e8f0; text-align:center; font-size:11px; color:#9aa1af;">
          Automated Report · PMC Data Management System · Mirpur, Dhaka
        </div>
      </div>
    </div>
  `;
}

export async function sendViaEmailJS(toEmail, toName, subject, htmlContent) {
  const templateParams = {
    to_email: toEmail,
    to_name: toName || 'PMC Admin',
    name: 'PMC DMS',
    subject,
    message: htmlContent,
    html_content: htmlContent,
    email: toEmail
  };

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_CONFIG.serviceId,
      template_id: EMAILJS_CONFIG.templateId,
      user_id: EMAILJS_CONFIG.publicKey,
      template_params: templateParams
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`EmailJS send failed: ${res.status} ${errorText}`);
  }

  return true;
}

export async function sendRealTestEmail(toEmail, toName) {
  const now = new Date();
  const dateBadge = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  const subject = `[PMC] Live Test Email Alert · ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const contentHtml = `
    <div style="font-size:14px; color:#191c22; margin-bottom:18px;">
      Hello <b>${toName || 'Admin'}</b>,
    </div>
    <div style="font-size:13px; color:#4b5563; margin-bottom:20px; line-height:1.6;">
      This is a live test notification confirming that your <b>EmailJS Integration</b> for <b>PM Computers Dashboard</b> is active, verified, and delivering successfully.
    </div>

    <div style="background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:10px; padding:14px 18px; margin-bottom:20px;">
      <div style="font-size:13px; font-weight:700; color:#166534; margin-bottom:4px;">✓ System Status: All Systems Operational</div>
      <div style="font-size:12px; color:#15803d;">You will automatically receive daily closing summaries and performance reports directly to this inbox.</div>
    </div>
  `;

  const wrapped = buildEmailWrapper('Integration Verification', dateBadge, contentHtml);
  return await sendViaEmailJS(toEmail, toName, subject, wrapped);
}

export async function sendDailySummaryEmail(recipient, data = {}) {
  const { sales = [], invoices = [], products = [], pmBrings = [], expenses = [] } = data;
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const todayEntry = sales.find(s => s.date === todayISO) || { sale: 0, profit: 0, cost: 0, profitPct: 0 };
  const todayInvoices = invoices.filter(i => i.date === todayISO);
  const todayProducts = products.filter(p => p.dateISO === todayISO || (p.createdAt && String(p.createdAt).startsWith(todayISO)));
  const todayBrings = pmBrings.filter(b => b.dateISO === todayISO || (b.createdAt && String(b.createdAt).startsWith(todayISO)));
  const todayExpenses = expenses.filter(e => e.date === todayISO);
  const totalExpenses = todayExpenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const netProfit = (Number(todayEntry.profit) || 0) - totalExpenses;

  const fmtMoney = (n) => '৳ ' + Math.round(Number(n) || 0).toLocaleString('en-US');
  const dateBadge = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Daily Closing`;
  const subject = `[PMC] Daily Summary · ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (Sale: ${fmtMoney(todayEntry.sale)})`;

  const contentHtml = `
    <!-- Top 2 KPI Cards -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="48%" style="background:#f6f7fa; border:1px solid #ebedf2; border-radius:10px; padding:14px 16px; vertical-align:top;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#6b7280; letter-spacing:0.5px;">Today's Revenue</div>
          <div style="font-size:22px; font-weight:800; color:#185a95; margin-top:3px;">${fmtMoney(todayEntry.sale)}</div>
          <div style="font-size:11px; color:#9aa1af; margin-top:2px;">Cost: ${fmtMoney(todayEntry.cost)}</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:14px 16px; vertical-align:top;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#166534; letter-spacing:0.5px;">Gross Profit</div>
          <div style="font-size:22px; font-weight:800; color:#0e8c81; margin-top:3px;">${fmtMoney(todayEntry.profit)}</div>
          <div style="font-size:11px; color:#15803d; margin-top:2px; font-weight:600;">${((todayEntry.profitPct || 0) * 100).toFixed(1)}% Margin</div>
        </td>
      </tr>
    </table>

    <!-- Net Profit & Expenses Bar -->
    <div style="background:#eef7ff; border:1.5px solid #bfe0f7; border-radius:10px; padding:13px 16px; margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#185a95;">Net Profit (After Operating Costs)</div>
            <div style="font-size:20px; font-weight:800; color:#191c22; margin-top:2px;">${fmtMoney(netProfit)}</div>
          </td>
          <td style="text-align:right;">
            <div style="font-size:11px; color:#6b7280;">Today's Expenses: <b>${fmtMoney(totalExpenses)}</b></div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Activity Breakdown Table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-size:12px; margin-top:10px;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 0; color:#6b7280;">Customer Invoices Generated:</td>
        <td style="padding:8px 0; text-align:right; font-weight:700;">${todayInvoices.length} bills</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 0; color:#6b7280;">Inventory / Warranty Items Tracked:</td>
        <td style="padding:8px 0; text-align:right; font-weight:700;">${todayProducts.length} items</td>
      </tr>
      <tr>
        <td style="padding:8px 0; color:#6b7280;">PM Brings Sourcing Items:</td>
        <td style="padding:8px 0; text-align:right; font-weight:700;">${todayBrings.length} items</td>
      </tr>
    </table>
  `;

  const wrapped = buildEmailWrapper('Daily Closing Summary', dateBadge, contentHtml);
  return await sendViaEmailJS(recipient.email, recipient.name, subject, wrapped);
}
