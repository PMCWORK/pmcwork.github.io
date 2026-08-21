const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "pmcomputers.bd@gmail.com",
    pass: process.env.GMAIL_PASS || ""
  }
});

async function run() {
  try {
    const info = await transporter.sendMail({
      from: '"PM Computers" <pmcomputers.bd@gmail.com>',
      to: "pmcomputers.bd@gmail.com",
      subject: "🔔 PM Computers Email System Online",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0e8c81; margin: 0 0 10px;">PM COMPUTERS</h2>
          <p style="font-size: 15px; color: #334155;">Hello Admin,</p>
          <p style="color: #475569; line-height: 1.5;">Your Gmail SMTP connection is active! You can now send automated daily summaries and instant sale alerts to any email address without needing a domain.</p>
          <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 4px solid #16a34a; font-size: 13px; color: #166534; font-weight: 600;">
            ✓ System Ready & Authenticated
          </div>
        </div>
      `
    });
    console.log("SUCCESS: Email sent! Message ID:", info.messageId);
  } catch (err) {
    console.error("SEND ERROR:", err.message);
  }
}

run();
