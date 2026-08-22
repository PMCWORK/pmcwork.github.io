const https = require('https');
const admin = require('firebase-admin');

// Configuration
const EMAILJS_CONFIG = {
  serviceId: process.env.EMAILJS_SERVICE_ID || 'service_xd4867q',
  templateId: process.env.EMAILJS_TEMPLATE_ID || 'template_660ftyo',
  publicKey: process.env.EMAILJS_PUBLIC_KEY || 'RQ_lhlIyaHqMXR2Rt'
};

const DEFAULT_RECIPIENTS = [
  { name: 'Mehedi (Management)', email: 'meeeheeediii@gmail.com' },
  { name: 'PM Computers (Store)', email: 'pmcomputers.bd@gmail.com' },
  { name: 'Foyez (Sales)', email: 'pfoyez2015@gmail.com' }
];

// Helper: Calculate Dhaka Time (UTC+6)
function getDhakaNow() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 6));
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateEmail(d) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMoney(n) {
  return '৳ ' + Math.round(Number(n || 0)).toLocaleString('en-US');
}

// Initialize Firebase Admin
function initFirebase() {
  if (admin.apps.length) return admin.firestore();
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✓ Firebase Admin initialized with Service Account.');
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT secret:', e.message);
      admin.initializeApp({ projectId: 'pmc-tracker-d8b38' });
    }
  } else {
    admin.initializeApp({ projectId: 'pmc-tracker-d8b38' });
    console.log('✓ Firebase Admin initialized with Project ID.');
  }
  return admin.firestore();
}

// EmailJS Dispatcher
function sendEmailViaEmailJS(toEmail, toName, subject, htmlContent) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      service_id: EMAILJS_CONFIG.serviceId,
      template_id: EMAILJS_CONFIG.templateId,
      user_id: EMAILJS_CONFIG.publicKey,
      template_params: {
        to_name: toName || 'Store Admin',
        to_email: toEmail,
        subject: subject,
        message_html: htmlContent
      }
    });

    const req = https.request({
      hostname: 'api.emailjs.com',
      path: '/api/v1.0/email/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Origin': 'https://pmcwork.github.io'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✓ Email delivered to ${toEmail} (Status: ${res.statusCode})`);
          resolve({ status: res.statusCode, data });
        } else {
          console.error(`✗ Email delivery to ${toEmail} failed:`, res.statusCode, data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', err => {
      console.error(`✗ Request error for ${toEmail}:`, err.message);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

function buildEmailWrapper(title, dateBadge, contentHtml) {
  return `
    <div style="background-color:#f4f5f8; padding:24px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#191c22; line-height:1.5;">
      <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; border:1px solid #e4e7ee; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #185a95 0%, #2f8fe0 100%); padding:22px 26px; color:#ffffff;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; opacity:0.85; margin-bottom:4px;">PM Computers · Data Management System</div>
          <div style="font-size:20px; font-weight:800; margin:0; letter-spacing:-0.3px;">${title}</div>
          <div style="margin-top:8px; display:inline-block; background:rgba(255,255,255,0.2); padding:3px 10px; border-radius:6px; font-size:11.5px; font-weight:600;">${dateBadge}</div>
        </div>

        <!-- Body Content -->
        <div style="padding:24px 26px;">
          ${contentHtml}
        </div>

        <!-- Footer -->
        <div style="background:#f6f7fa; padding:14px 26px; border-top:1px solid #ebedf2; text-align:center; font-size:11px; color:#9aa1af;">
          Automated Report · PMC Data Management System · Mirpur, Dhaka
        </div>
      </div>
    </div>
  `;
}

async function main() {
  console.log('==================================================');
  console.log('🚀 PMC DAILY CLOSING EMAIL DISPATCHER (CLOUD CRON)');
  console.log('==================================================');

  const dhakaNow = getDhakaNow();
  const todayISO = toISODate(dhakaNow);
  console.log(`Dhaka Time: ${dhakaNow.toISOString()} (${todayISO})`);

  const db = initFirebase();

  // 1. Fetch Sales
  let todaySale = { sale: 0, profit: 0, cost: 0, profitPct: 0 };
  try {
    const salesSnap = await db.collection('sales').where('date', '==', todayISO).get();
    if (!salesSnap.empty) {
      todaySale = salesSnap.docs[0].data();
    }
  } catch (e) {
    console.warn('Notice fetching sales:', e.message);
  }

  // 2. Fetch Expenses
  let todayExpenses = [];
  let totalExpenses = 0;
  try {
    const expSnap = await db.collection('expenses').where('date', '==', todayISO).get();
    expSnap.forEach(d => {
      const exp = d.data();
      todayExpenses.push(exp);
      totalExpenses += Number(exp.amount || 0);
    });
  } catch (e) {
    console.warn('Notice fetching expenses:', e.message);
  }

  // 3. Fetch Invoices
  let todayInvoices = [];
  try {
    const invSnap = await db.collection('invoices').get();
    invSnap.forEach(d => {
      const inv = d.data();
      if (inv.date === todayISO || (inv.createdAt && inv.createdAt.startsWith(todayISO))) {
        todayInvoices.push(inv);
      }
    });
  } catch (e) {
    console.warn('Notice fetching invoices:', e.message);
  }

  // 4. Fetch Products Tracker Added
  let todayProducts = [];
  try {
    const prodSnap = await db.collection('products').get();
    prodSnap.forEach(d => {
      const p = d.data();
      if (p.date === todayISO || (p.createdAt && p.createdAt.startsWith(todayISO))) {
        todayProducts.push(p);
      }
    });
  } catch (e) {
    console.warn('Notice fetching products:', e.message);
  }

  // 5. Fetch PM Brings Added
  let todayBrings = [];
  try {
    const pmbSnap = await db.collection('pm_brings').get();
    pmbSnap.forEach(d => {
      const b = d.data();
      if (b.date === todayISO || (b.createdAt && b.createdAt.startsWith(todayISO))) {
        todayBrings.push(b);
      }
    });
  } catch (e) {
    console.warn('Notice fetching PM Brings:', e.message);
  }

  // 6. Fetch Purchases Added
  let todayPurchases = [];
  let todayPurchasesTotal = 0;
  try {
    const purSnap = await db.collection('purchases').where('date', '==', todayISO).get();
    purSnap.forEach(d => {
      const p = d.data();
      todayPurchases.push(p);
      todayPurchasesTotal += Number(p.totalAmount || 0);
    });
  } catch (e) {
    console.warn('Notice fetching purchases:', e.message);
  }

  // 7. Calculate Net Profit
  const netProfit = (Number(todaySale.profit || 0)) - totalExpenses;
  const marginPct = todaySale.sale > 0 ? ((todaySale.profit / todaySale.sale) * 100).toFixed(1) : '0.0';

  console.log(`📊 Numbers for ${todayISO}:`);
  console.log(`   - Total Revenue: ${formatMoney(todaySale.sale)}`);
  console.log(`   - Gross Profit:  ${formatMoney(todaySale.profit)} (${marginPct}%)`);
  console.log(`   - Expenses:      ${formatMoney(totalExpenses)}`);
  console.log(`   - Net Profit:    ${formatMoney(netProfit)}`);
  console.log(`   - Invoices:      ${todayInvoices.length} bill(s)`);
  console.log(`   - Products:      ${todayProducts.length} added`);
  console.log(`   - Purchases:     ${todayPurchases.length} bill(s) (${formatMoney(todayPurchasesTotal)})`);

  // 8. Build Rich HTML Content
  const subject = `[PMC] Daily Closing Summary · ${formatDateEmail(dhakaNow)} (Sale: ${formatMoney(todaySale.sale)})`;
  const dateBadge = `${formatDateEmail(dhakaNow)} · 11:00 PM Closing`;

  const contentHtml = `
    <!-- Top 2 KPI Cards -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="48%" style="background:#f6f7fa; border:1px solid #ebedf2; border-radius:10px; padding:14px 16px; vertical-align:top;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#6b7280; letter-spacing:0.5px;">Today's Revenue</div>
          <div style="font-size:22px; font-weight:800; color:#185a95; margin-top:3px;">${formatMoney(todaySale.sale)}</div>
          <div style="font-size:11px; color:#9aa1af; margin-top:2px;">Cost: ${formatMoney(todaySale.cost)}</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:14px 16px; vertical-align:top;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#166534; letter-spacing:0.5px;">Gross Profit</div>
          <div style="font-size:22px; font-weight:800; color:#0e8c81; margin-top:3px;">${formatMoney(todaySale.profit)}</div>
          <div style="font-size:11px; color:#15803d; margin-top:2px; font-weight:600;">${marginPct}% Margin</div>
        </td>
      </tr>
    </table>

    <!-- Net Profit & Expenses Bar -->
    <div style="background:#eef7ff; border:1.5px solid #bfe0f7; border-radius:10px; padding:13px 16px; margin-bottom:22px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#185a95;">Net Profit (After Expenses)</div>
            <div style="font-size:20px; font-weight:800; color:#191c22; margin-top:2px;">${formatMoney(netProfit)}</div>
          </td>
          <td style="text-align:right;">
            <div style="font-size:11px; color:#6b7280;">Operating Expenses</div>
            <div style="font-size:14px; font-weight:700; color:#d5573f; margin-top:2px;">- ${formatMoney(totalExpenses)}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Activity Log List -->
    <div style="font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#9aa1af; margin-bottom:8px;">Day's Activity Logs</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-size:13px;">
      <tr style="border-bottom:1px solid #ebedf2;">
        <td style="padding:8px 0; color:#6b7280;">Customer Invoices Issued</td>
        <td style="padding:8px 0; text-align:right; font-weight:700; color:#191c22;">${todayInvoices.length} bill(s)</td>
      </tr>
      <tr style="border-bottom:1px solid #ebedf2;">
        <td style="padding:8px 0; color:#6b7280;">Inventory Items Added</td>
        <td style="padding:8px 0; text-align:right; font-weight:700; color:#191c22;">${todayProducts.length} item(s)</td>
      </tr>
      <tr style="border-bottom:1px solid #ebedf2;">
        <td style="padding:8px 0; color:#6b7280;">PM Brings Sourced</td>
        <td style="padding:8px 0; text-align:right; font-weight:700; color:#191c22;">${todayBrings.length} item(s)</td>
      </tr>
      <tr>
        <td style="padding:8px 0; color:#6b7280;">Supplier Purchases</td>
        <td style="padding:8px 0; text-align:right; font-weight:700; color:#191c22;">${todayPurchases.length} bill(s) (${formatMoney(todayPurchasesTotal)})</td>
      </tr>
    </table>
  `;

  const fullHtmlMessage = buildEmailWrapper('Daily Store Summary', dateBadge, contentHtml);

  // 9. Load Recipients from Firestore or use Defaults
  let recipientsToSend = [...DEFAULT_RECIPIENTS];
  try {
    const notifSnap = await db.collection('settings').doc('notifications').get();
    if (notifSnap.exists) {
      const data = notifSnap.data();
      if (Array.isArray(data.recipients) && data.recipients.length) {
        const valid = data.recipients.filter(r => r.email && r.alertDaily !== false);
        if (valid.length) recipientsToSend = valid;
      }
    }
  } catch (e) {
    console.warn('Notice reading custom recipients, using defaults:', e.message);
  }

  // 10. Dispatch to all recipients
  console.log(`📬 Dispatching to ${recipientsToSend.length} recipient(s)...`);
  for (const r of recipientsToSend) {
    try {
      await sendEmailViaEmailJS(r.email, r.name || 'Store Admin', subject, fullHtmlMessage);
    } catch (err) {
      console.error(`✗ Error delivering to ${r.email}:`, err.message);
    }
  }

  console.log('🎉 Daily Summary Dispatch Complete!');
}

main().catch(err => {
  console.error('CRITICAL ERROR in Daily Summary Runner:', err);
  process.exit(1);
});
