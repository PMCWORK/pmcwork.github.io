# PMC Data Management System
### Enterprise Inventory, Point-of-Sale (POS), Supplier Ledger & Financial Management System
**PM Computers · Mirpur, Dhaka**

---

## ?? Table of Contents
1. [Executive Overview](#-executive-overview)
2. [Technology Stack & Architecture](#-technology-stack--architecture)
3. [Security & Access Control Architecture](#-security--access-control-architecture)
4. [Comprehensive Module & Tab Breakdown](#-comprehensive-module--tab-breakdown)
   - [1. Dashboard (#dashboard)](#1-dashboard-dashboard)
   - [2. Add Sale (#add-sale)](#2-add-sale-add-sale)
   - [3. Sales History (#history)](#3-sales-history-history)
   - [4. Product Tracker (#tracker)](#4-product-tracker-tracker)
   - [5. PM Brings (#pm-brings)](#5-pm-brings-pm-brings)
   - [6. Purchases & Supplier Ledgers (#purchases)](#6-purchases--supplier-ledgers-purchases)
   - [7. Operating Expenses (#expenses)](#7-operating-expenses-expenses)
   - [8. Invoice Management & POS Printing (#invoices)](#8-invoice-management--pos-printing-invoices)
   - [9. Export & Business Intelligence (#export)](#9-export--business-intelligence-export)
   - [10. Audit Logging & Security Trail (#audit-log)](#10-audit-logging--security-trail-audit-log)
5. [Database Architecture & Data Schemas](#-database-architecture--data-schemas)
6. [Automated Email Notification Engine (EmailJS)](#-automated-email-notification-engine-emailjs)
7. [Database & Auto-Backup Engine](#-database--auto-backup-engine)
8. [Permanent Development & Hash Routing Rules](#-permanent-development--hash-routing-rules)
9. [Deployment & Local Setup](#-deployment--local-setup)

---

## ?? Executive Overview
The **PMC Data Management System** is a unified single-page enterprise web application engineered specifically for **PM Computers**. It replaces fragmented spreadsheets with an integrated, real-time cloud management platform that handles day-to-day retail sales, warranty tracking, supplier debit/credit ledgers, operating expenses, customer invoicing, multi-recipient closing emails, and automated database backups.

---

## ??? Technology Stack & Architecture

| Layer | Technology | Role & Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5 / Modern CSS3 | Ultra-fast single-page interface with responsive layout, custom CSS variables, and full Dark/Light theme switching. |
| **Core Logic** | Vanilla JavaScript (ES6+) | 100% dependency-free core logic delivering instant calculations, filtering, and DOM updates without heavyweight framework overhead. |
| **Database** | Google Cloud Firestore | Real-time NoSQL cloud database providing synchronized data stores, offline persistence, and multi-tab tab synchronization. |
| **Authentication** | Firebase Auth (Google OAuth) | Secure Google Single Sign-On (SSO) with cryptographic client-side hashing and server-side cloud security rules. |
| **Email Delivery** | EmailJS Browser SDK | Client-side automated transactional email delivery engine (zero credit card, zero cloud function cost). |
| **Data Visualization** | Chart.js 4.4 | Interactive responsive revenue trajectories and monthly profit margin charts. |
| **Data Interchange** | JSON & RFC-4180 CSV | Structured database snapshots and Excel-compatible CSV exports with UTF-8 BOM encoding for Bengali/English text. |

---

## ?? Security & Access Control Architecture

### 1. Dual-Layer Authorization Gate
Access to the dashboard and underlying database is restricted exclusively to authorized PM Computers management and staff:
- **meeeheeediii@gmail.com** (Shop Administrator / Management)
- **pmcomputers.bd@gmail.com** (Official Store Account)
- **pfoyez2015@gmail.com** (Sales Executive)

### 2. Client-Side Cryptographic Hashing (Zero Plaintext Emails)
- To prevent exposing personal email addresses in source code or public repositories, JavaScript utilizes **one-way SHA-256 cryptographic hashes** (AUTHORIZED_EMAIL_HASHES).
- When a user logs in with Google, the browser computes crypto.subtle.digest('SHA-256', user.email) in memory to verify access.
- It is mathematically impossible to reverse-engineer real email addresses from the repository files.

### 3. Server-Side Firestore Cloud Security Rules
Even if client code is manipulated, Google Cloud Firestore independently rejects unauthorized read/write requests on Google's private servers:
`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthorized() {
      return request.auth != null && 
             request.auth.token.email in [
               'meeeheeediii@gmail.com',
               'pmcomputers.bd@gmail.com',
               'pfoyez2015@gmail.com'
             ];
    }
    match /{document=**} {
      allow read, write: if isAuthorized();
    }
  }
}
`

---

## ?? Comprehensive Module & Tab Breakdown

### 1. Dashboard (#dashboard)
* **KPI Metric Cards**: Displays real-time calculations for Total Sales, Gross Profit, Total Expenses, and Net Profit (with dynamic margin percentages).
* **Interactive Financial Trend Chart**: Chart.js visualization plotting monthly sales performance vs. previous periods.
* **Live Activity Stream**: Shows the most recent transactions, warranty alerts, and quick actions.

### 2. Add Sale (#add-sale)
* **Smart Inventory Auto-Suggest**: Automatically searches available stock from the Product Tracker and populates cost/selling prices.
* **Itemized Multi-Row Cart**: Add multiple hardware items, accessories, or services to a single sale.
* **Flexible Payment Methods**: Supports Cash, Card, and Mobile Financial Services (bKash, Nagad, Rocket) with split-payment logging.
* **Instant Invoicing**: One-click checkbox to automatically generate an A4 printable POS invoice upon saving.

### 3. Sales History (#history)
* **Multi-Criteria Search & Filtering**: Filter transactions by date range, specific year, customer name, phone number, or invoice ID.
* **Record Management**: View complete itemized breakdowns, edit past transactions, or delete entries with mandatory confirmation and audit tracking.

### 4. Product Tracker (#tracker)
* **Granular Serial & IMEI Ledger**: Tracks individual hardware units by Serial Number / IMEI with brand, model, and category.
* **Warranty Intelligence**: Automatically calculates warranty expiration dates from purchase dates and tags items as Active or Expired.
* **Stock & Return Lifecycle**: Workflow to mark items as In Stock, Sold, Returned, or Replaced with supplier RMA tracking.

### 5. PM Brings (#pm-brings)
* **Consignment & Sourcing Tracker**: Dedicated ledger for imported goods, custom orders, and pre-booked consignments.
* **Landed Cost Calculator**: Calculates product cost, shipping/duty overhead, target selling price, and projected profit margin.
* **Status Progression**: Tracks items from Ordered ? In Transit ? Received in Store ? Sold.

### 6. Purchases & Supplier Ledgers (#purchases)
* **Purchases Sub-Tab**:
  - Itemized purchase bills with supplier selection, invoice numbers, and bill amounts.
  - Granular warranty tracking per line item (e.g. 1 Year, 2 Years, Lifetime, or No Warranty).
  - Tracks Paid Amount, Due Balance, and Payment Status (Paid, Partial, Due).
* **Supplier Shops Sub-Tab**:
  - Supplier directory with contact details, shop address, total billed, total paid, and net due balance.
  - 1-Click **Quick Payment Modal** to record cash/bank settlements directly against a supplier's account.
* **Purchase Invoice Viewer**:
  - Modal displaying full bill details, itemized warranty durations, payment status badges, and edit actions.

### 7. Operating Expenses (#expenses)
* **Categorized Expenditure Tracking**: Log store overhead across Rent, Utilities, Salaries, Courier/Shipping, Maintenance, Meals, and Miscellaneous.
* **Payment Mode Allocation**: Records payment channel (Cash, Bank, MFS) for accurate cash drawer balancing.
* **Profit Integration**: Operating expenses are deducted automatically from gross profit in the Executive Dashboard to compute true Net Profit.

### 8. Invoice Management & POS Printing (#invoices)
* **Invoice Archive**: Central searchable repository of all customer invoices.
* **Print-Ready A4 Engine**: Clean layout featuring official PM Computers branding, Mirpur Dhaka address, customer billing details, itemized warranty periods, and store terms & conditions.

### 9. Export & Business Intelligence (#export)
* **Custom Range CSV Exporter**: Export filtered transaction sets for custom accounting periods.
* **Yearly Summaries**: High-level annual revenue, expense, and profit summaries for tax and financial reviews.

### 10. Audit Logging & Security Trail (#audit-log)
* **Tamper-Evident History**: Captures every Create, Update, Delete, Backup, and Auth action across all 10 modules.
* **Field Diffs**: Displays exact side-by-side comparisons of changed values with user email, timestamp, and entity ID.

---

## ??? Database Architecture & Data Schemas

The system organizes store operations across 10 Firestore collections:

`	ext
Firestore Root
+-- sales/                     # Retail sales transactions & customer records
+-- products/                  # Inventory items, serial numbers & warranties
+-- pm_brings/                 # Consignments, imports & pre-orders
+-- purchases/                 # Supplier purchase bills & line-item warranties
+-- purchase_payments/         # Supplier settlement transaction records
+-- supplier_shops/            # Supplier directory & balance ledgers
+-- expenses/                  # Store operating expenses & utility logs
+-- invoices/                  # Point-of-sale customer invoices
+-- audit_logs/                # Security change trail & diff logs
+-- notification_settings/     # Automated email recipient configurations
`

---

## ?? Automated Email Notification Engine (EmailJS)

* **Zero-Cost Browser Delivery**: Emails are generated and dispatched directly from the client browser using EmailJS SDK.
* **Automated 11:00 PM Closing Summary**: A background ticker verifies every 30 seconds and automatically sends a daily financial report at 23:00 local time.
* **Duplicate Prevention**: Tracks dispatch stamps in localStorage (pmc_last_daily_email_<email>) to prevent duplicate dispatches on tab reloads.
* **Designed HTML Templates**: Gradient header cards, KPI stat boxes, net profit banners, and itemized activity breakdowns.
* **Manual Trigger**: 1-Click **"Summary"** button in Settings Hub for on-demand reports.

---

## ?? Database & Auto-Backup Engine

Accessible via **Settings Hub** (#settingsBackupView):
1. **Full JSON Database Snapshot**: Exports all 9 collections into a single structured JSON backup file.
2. **Spreadsheet CSV Archive**: Generates complete CSV exports of all operational tables.
3. **Safe Merge Restore Engine**:
   - Parses and validates uploaded backup files against strict schema rules.
   - Renders an interactive preview showing added vs. updated records.
   - Safely reconciles Firestore collections without duplicate key collisions.
4. **Daily Local Snapshots**: Automatically stores local database snapshots in localStorage every 24 hours.

---

## ?? Permanent Development & Hash Routing Rules

> [!IMPORTANT]
> Whenever creating, modifying, or renaming tabs, sub-views, or entries in the future, always:
> 1. Register the canonical hash and any aliases in VIEW_HASH_MAP and VIEW_CANONICAL_HASH.
> 2. Add the corresponding href="#..." and data-view="..." to the sidebar navigation.
> 3. Ensure switchView, handleHashChange, and init() boot synchronization are updated.

### Active Tab Hash Identifiers

| Tab Name | Canonical Hash | Supported Aliases |
| :--- | :--- | :--- |
| **Dashboard** | #dashboard | #dashboard |
| **Add Sale** | #add-sale | #addsale |
| **Sales History** | #history | #sales-history |
| **Product Tracker** | #tracker | #product-tracker |
| **PM Brings** | #pm-brings | #pmbrings |
| **Purchases & Suppliers** | #purchases | #purchase |
| **Expenses** | #expenses | #expense |
| **Invoices** | #invoices | #invoice |
| **Export** | #export | #export |
| **Audit Log** | #audit-log | #audit |

---

## ?? Deployment & Local Setup

### Running Locally:
1. Clone or download this repository.
2. Double-click index.html to open in any web browser, or serve via local server:
   `ash
   npx serve .
   `
3. Sign in with an authorized Google account.

### Live Production Deployment:
* Hosted directly on **GitHub Pages**: [https://pmcwork.github.io/](https://pmcwork.github.io/)
* Firebase Authorized Domains: pmcwork.github.io, localhost

---

### ?? Proprietary License
Private & Proprietary © PM Computers. All rights reserved.
