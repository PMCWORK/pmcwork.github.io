const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");

admin.initializeApp();
const db = admin.firestore();

// -------------------------------------------------------------
// SENDER CREDENTIALS CONFIGURATION
// -------------------------------------------------------------
// 1. Gmail SMTP Credentials
const GMAIL_CONFIG = {
  user: process.env.GMAIL_USER || "pmcomputers.bd@gmail.com",
  pass: process.env.GMAIL_PASS || ""
};

// 2. Resend API Key fallback
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Setup Nodemailer transporter with verified Gmail credentials
const gmailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_CONFIG.user,
    pass: GMAIL_CONFIG.pass
  }
});

/**
 * Universal Email Sender Helper
 * Uses Gmail SMTP directly (sends to any recipient email without domain lock)
 */
async function dispatchEmail({ to, subject, html }) {
  if (gmailTransporter && GMAIL_CONFIG.pass) {
    return await gmailTransporter.sendMail({
      from: `"PM Computers" <${GMAIL_CONFIG.user}>`,
      to,
      subject,
      html
    });
  } else {
    return await resend.emails.send({
      from: "PM Computers <onboarding@resend.dev>",
      to,
      subject,
      html
    });
  }
}

const formatMoney = (n) => "৳ " + Number(n || 0).toLocaleString("en-US");

/**
 * 1. HTTP Endpoint: Send Test Email
 * Triggered from the Dashboard 'Send Test Alert' button
 */
exports.sendTestEmail = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { email, name } = req.body || {};
    if (!email) return res.status(400).json({ error: "Recipient email is required" });
    const rName = name || "Shop Admin";

    const result = await dispatchEmail({
      to: email,
      subject: `🔔 PM Computers Test Alert for ${rName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
          <div style="border-bottom: 2px solid #2f8fe0; padding-bottom: 12px; margin-bottom: 18px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 20px;">PM COMPUTERS</h2>
            <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Automated Notification System</p>
          </div>
          <p style="font-size: 15px; margin-top: 0;">Hello <b>${rName}</b>,</p>
          <p style="font-size: 14px; line-height: 1.5; color: #475569;">
            This is a test notification confirming that your email alert rules are active and connected to the PM Computers Dashboard server via Gmail SMTP.
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 14px 16px; border-radius: 8px; margin: 20px 0;">
            <div style="color: #166534; font-weight: 700; font-size: 13px; margin-bottom: 4px;">✓ System Connected & Active</div>
            <div style="color: #15803d; font-size: 13px;">Your configured daily summaries, activity digests, and performance reports will be delivered to this inbox.</div>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 24px; font-size: 11px; color: #94a3b8;">
            Shop 19, Level 4, Capital Tower, Mirpur-1, Dhaka-1216
          </div>
        </div>
      `
    });

    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("sendTestEmail Error:", err);
    return res.status(500).json({ error: err.message || "Send failed" });
  }
});

/**
 * 2. Scheduled Nightly Summary (Runs at 11:00 PM Dhaka Time every night)
 */
exports.scheduledDailySummary = functions.pubsub
  .schedule("0 23 * * *")
  .timeZone("Asia/Dhaka")
  .onRun(async (context) => {
    try {
      const settingsSnap = await db.doc("settings/notifications").get();
      if (!settingsSnap.exists) return null;

      const recipients = settingsSnap.data().recipients || [];
      const active = recipients.filter((r) => r.alertDaily && (r.dailyTiming === "23:00" || !r.dailyTiming));
      if (!active.length) return null;

      const dhakaDate = new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
      const salesSnap = await db.collection("sales").where("date", "==", dhakaDate).get();
      let totalSale = 0, totalProfit = 0, totalCost = 0;
      salesSnap.forEach((doc) => {
        const s = doc.data();
        totalSale += Number(s.sale || 0);
        totalProfit += Number(s.profit || 0);
        totalCost += Number(s.cost || 0);
      });
      const marginPct = totalSale > 0 ? Math.round((totalProfit / totalSale) * 100) : 0;

      const invSnap = await db.collection("invoices").where("date", "==", dhakaDate).get();
      const trkSnap = await db.collection("product_tracker").where("dateLabel", "==", dhakaDate).get();
      const pmbSnap = await db.collection("pm_brings").where("dateISO", "==", dhakaDate).get();

      for (const r of active) {
        if (!r.email) continue;
        let items = [];
        if (r.dailyIncSales !== false) items.push(`<div style="background:#f8fafc; border-left:4px solid #2f8fe0; padding:12px; border-radius:6px; margin-bottom:8px;"><b>Sales:</b> ${formatMoney(totalSale)} &nbsp;|&nbsp; <b>Profit:</b> ${formatMoney(totalProfit)} (${marginPct}%)</div>`);
        if (r.dailyIncInvoices !== false) items.push(`<div style="background:#f8fafc; padding:10px 12px; border-radius:6px; margin-bottom:8px;"><b>Invoices Created:</b> ${invSnap.size} bills</div>`);
        if (r.dailyIncProducts !== false) items.push(`<div style="background:#f8fafc; padding:10px 12px; border-radius:6px; margin-bottom:8px;"><b>Product Tracker:</b> ${trkSnap.size} items</div>`);
        if (r.dailyIncBrings !== false) items.push(`<div style="background:#f8fafc; padding:10px 12px; border-radius:6px; margin-bottom:8px;"><b>PM Brings:</b> ${pmbSnap.size} items</div>`);

        await dispatchEmail({
          to: r.email,
          subject: `Daily Summary (${dhakaDate}): ${formatMoney(totalSale)} Sales | ${formatMoney(totalProfit)} Profit`,
          html: `
            <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 22px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
              <div style="border-bottom: 2px solid #0e8c81; padding-bottom: 10px; margin-bottom: 16px;">
                <h3 style="margin: 0; color: #0f172a;">PM Computers — Daily Business Summary</h3>
                <div style="color: #64748b; font-size: 12px; margin-bottom: 16px;">Date: ${dhakaDate} &bull; Prepared for ${r.name || "Admin"}</div>
              </div>
              ${items.join("")}
              <div style="margin-top: 20px; font-size: 11px; color: #94a3b8;">PM Computers Dashboard Automated Service</div>
            </div>
          `
        });
      }
    } catch (err) {
      console.error("scheduledDailySummary Error:", err);
    }
  });

/**
 * 3. Real-Time Trigger: Instant Sale Entry Alert
 */
exports.onSaleCreatedInstantAlert = functions.firestore
  .document("sales/{saleId}")
  .onCreate(async (snap, context) => {
    try {
      const sale = snap.data();
      const settingsSnap = await db.doc("settings/notifications").get();
      if (!settingsSnap.exists) return null;

      const recipients = settingsSnap.data().recipients || [];
      const instantRecipients = recipients.filter((r) => r.alertDaily && r.dailyTiming === "instant");
      if (!instantRecipients.length) return null;

      for (const r of instantRecipients) {
        if (!r.email) continue;
        await dispatchEmail({
          to: r.email,
          subject: `⚡ New Sale Logged: ${formatMoney(sale.sale)} (Profit: ${formatMoney(sale.profit)})`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
              <h3 style="color: #0e8c81; margin: 0 0 10px;">⚡ Instant Sale Alert</h3>
              <div style="background: #f8fafc; padding: 14px; border-radius: 8px; font-size: 14px; border: 1px solid #e2e8f0;">
                <p style="margin: 4px 0;"><b>Date:</b> ${sale.date}</p>
                <p style="margin: 4px 0;"><b>Sale:</b> ${formatMoney(sale.sale)}</p>
                <p style="margin: 4px 0;"><b>Profit:</b> ${formatMoney(sale.profit)} (${Math.round((sale.profitPct || 0) * 100)}%)</p>
                <p style="margin: 4px 0;"><b>Cost:</b> ${formatMoney(sale.cost)}</p>
                <p style="margin: 4px 0;"><b>Logged By:</b> ${sale.enteredBy || "Staff"}</p>
              </div>
            </div>
          `
        });
      }
    } catch (err) {
      console.error("onSaleCreatedInstantAlert Error:", err);
    }
  });
