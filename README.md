# PMC Data Management System

A fast, responsive, and robust enterprise inventory, point-of-sale (POS), supplier ledger, and financial management application built for **PM Computers**.

---

## ?? Key Modules & Capabilities

- **?? Executive Dashboard**: Real-time sales, gross profit margins, operating expenses, and monthly trajectory charts.
- **?? Point of Sale & Invoicing**: Instant A4 print-ready customer invoices, automatic subtotaling, custom terms, and sales tracking.
- **?? Product Tracker & IMEI / Serial Ledger**: Granular item tracking for serial numbers, warranty durations, return statuses, and stock aging.
- **?? Purchases & Supplier Accounts**: Comprehensive supplier purchase records, item warranty logs, and running credit/debit ledger statements.
- **?? Expense Management**: Categorized operating expenditure tracking with payment method splits (Cash, Card, MFS).
- **??? Audit Logging Engine**: Tamper-evident, structured change logs across all 10 system entities with side-by-side field diffs.
- **?? Database & Auto-Backups**: 1-click JSON full database snapshots, spreadsheet CSV archive exports, safe merge restore engine, and automated browser snapshots.
- **?? Automated EmailJS Reports**: Beautifully formatted HTML summaries for daily closing, monthly reviews, and test alerts delivered directly to email inboxes.
- **?? Enterprise Access Control**: Google Authentication with cryptographic SHA-256 email whitelisting and Firestore cloud security rules.

---

## ??? Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Modern CSS3 with CSS Variables and Dark Mode support.
- **Database & Auth**: Google Cloud Firestore, Firebase Authentication.
- **Email Delivery**: EmailJS SDK (client-side zero-card email delivery).
- **Visualization**: Chart.js for financial trend charts.
- **Icons**: Custom SVG & high-res vector graphics.

---

## ?? Local Setup & Development

1. Clone or download the repository:
   `ash
   git clone https://github.com/<your-username>/pmc-dashboard.git
   `
2. Open index.html directly in any modern web browser, or serve via a local HTTP server:
   `ash
   npx serve .
   `
3. Sign in with an authorized Google account to access your store's live cloud data.

---

## ?? License
Private & Proprietary © PM Computers. All rights reserved.
