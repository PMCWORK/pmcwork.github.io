# PM Computers (PMC) Management System — Comprehensive System Handover & Technical Specification

> **Official System Handover Document**  
> **Target Audience:** Incoming Lead Developers, Full-Stack Engineers, DevOps Engineers, and System Administrators  
> **Client / Organization:** PM Computers (PMC) · Mirpur, Dhaka, Bangladesh  
> **Platform Version:** 2.0.0 (Modern HeroUI + React Architecture)  
> **Repository:** `https://github.com/PMCWORK/pmcwork.github.io.git`  
> **Production URL:** `https://pmcwork.github.io/`  
> **Last Updated / System State:** November 2026 (see AGENTS.md change log for later changes)

---

## Table of Contents

1. [Executive Overview & Business Context](#1-executive-overview--business-context)
2. [Technology Stack & Architecture](#2-technology-stack--architecture)
3. [Complete Codebase File Directory](#3-complete-codebase-file-directory)
4. [Security, Authentication & Role-Based Access](#4-security-authentication--role-based-access)
   - [Google OAuth & Client-Side SHA-256 Whitelist](#google-oauth--client-side-sha-256-whitelist)
   - [Quick PIN Fallback & Brute-Force Defense](#quick-pin-fallback--brute-force-defense)
   - [Firebase Project Configuration](#firebase-project-configuration)
5. [Database Architecture & Firestore Schemas](#5-database-architecture--firestore-schemas)
   - [Collection Dictionary & Field Types](#collection-dictionary--field-types)
   - [Metadata & Settings Documents](#metadata--settings-documents)
6. [Business Logic, Financial Engines & Partner Settlements](#6-business-logic-financial-engines--partner-settlements)
   - [Store Operating Days & Off-Day Rules](#store-operating-days--off-day-rules)
   - [Operating Expense Model & Fixed Overheads](#operating-expense-model--fixed-overheads)
   - [Partner Profit-Sharing Mathematical Model (Pias & Mehedi)](#partner-profit-sharing-mathematical-model-pias--mehedi)
   - [Audit Validation Rules for Month-End Finalization](#audit-validation-rules-for-month-end-finalization)
7. [Module-by-Module Deep Dive](#7-module-by-module-deep-dive)
   - [1. Dashboard & KPI Analytics](#1-dashboard--kpi-analytics)
   - [2. Add Sale (Daily Ledger)](#2-add-sale-daily-ledger)
   - [3. Sales History & Audited Modification](#3-sales-history--audited-modification)
   - [4. Product Tracker & Warranty Registry](#4-product-tracker--warranty-registry)
   - [5. PM Brings (Inter-Shop Sourcing)](#5-pm-brings-inter-shop-sourcing)
   - [6. Purchases & Supplier Ledgers](#6-purchases--supplier-ledgers)
   - [7. Operating Expenses & Month-End Settlement](#7-operating-expenses--month-end-settlement)
   - [8. Invoice Management & POS Generation](#8-invoice-management--pos-generation)
   - [9. Export & Business Intelligence](#9-export--business-intelligence)
   - [10. Audit Log & Security Trail](#10-audit-log--security-trail)
   - [11. Shop Settings Hub & System Preferences](#11-shop-settings-hub--system-preferences)
8. [Automated Cloud Pipelines & Cron Architecture](#8-automated-cloud-pipelines--cron-architecture)
   - [Cloudflare Edge Precision Cron Trigger](#cloudflare-edge-precision-cron-trigger)
   - [GitHub Actions Daily Dispatch Workflow](#github-actions-daily-dispatch-workflow)
   - [Node.js Summary Dispatcher Script & Smart Closing Detection](#nodejs-summary-dispatcher-script--smart-closing-detection)
   - [EmailJS Transactional Delivery Engine](#emailjs-transactional-delivery-engine)
9. [Build, Deployment & GitHub Pages Root Routing](#9-build-deployment--github-pages-root-routing)
   - [Custom Vite `root-deploy-handler` Plugin](#custom-vite-root-deploy-handler-plugin)
   - [Hosting Layout (`dist/`, Root `index.html`, and `v2/`)](#hosting-layout-dist-root-indexhtml-and-v2)
10. [Design System, Theming & UI Utilities](#10-design-system-theming--ui-utilities)
    - [PMC Brand Kit v1.0 & Design Tokens](#pmc-brand-kit-v10--design-tokens)
    - [Adaptive Dynamic Favicon Engine](#adaptive-dynamic-favicon-engine)
    - [Global Dropdown Keyboard Typeahead Navigation](#global-dropdown-keyboard-typeahead-navigation)
11. [Developer Runbook & Local Setup](#11-developer-runbook--local-setup)
    - [Installation & Development Server](#installation--development-server)
    - [Production Build & Verification](#production-build--verification)
    - [CRITICAL: Non-Interactive Git Push Rules on this Machine](#critical-non-interactive-git-push-rules-on-this-machine)
    - [Disaster Recovery & Full System Restore](#disaster-recovery--full-system-restore)
12. [Gotchas, Quirks & Hidden Intricacies (Nooks & Crannies)](#12-gotchas-quirks--hidden-intricacies-nooks--crannies)

---

## 1. Executive Overview & Business Context

**PM Computers** is an established computer hardware, peripherals, and IT solutions retailer and wholesaler located in Mirpur, Dhaka, Bangladesh. The business operates in a fast-paced multi-shop electronics hub, interacting with dozens of local trade suppliers, retail customers, corporate clients, and inter-shop inventory arrangements.

The **PMC Management System** is a mission-critical web application that orchestrates every operational aspect of the enterprise:
- **POS & Daily Sales Ledger:** Captures daily gross sales, cost of goods sold (COGS), gross profit, and calculates real-time profit margins.
- **Warranty & Inventory Tracking:** Registers serialized items, supplier provenance, status (`sold`, `returned`, `unmarked`), and customer warranty terms.
- **Inter-Shop "PM Brings" Sourcing:** Tracks inventory sourced on credit from neighboring shops to fulfill walk-in orders when internal stock is exhausted.
- **Supplier Credit/Debit Accounting:** Full double-entry-style running ledgers for wholesale component distributors (bills, voucher payments, and outstanding balances).
- **Store Expenses & Overhead:** Tracks daily running costs, monthly utility bills (electricity), commercial shop rent, partner house rent allowances, and daily operational stipends.
- **Partner Profit Settlement Engine:** An automated financial reconciliation engine calculating net profit distributions between the two primary partners (**Pias** and **Mehedi**) according to verified contractual split ratios.
- **Professional POS Billing:** Generates standardized A4 and thermal invoices with barcode identifiers, salesperson attribution, custom warranty terms, and sequential serial control.
- **Automated Closing Reports:** Dispatches nightly performance digests (revenue, profit, bills issued, items tracked, expenses incurred) at 11:00 PM Dhaka Time to stakeholders via transactional email.

---

## 2. Technology Stack & Architecture

```mermaid
flowchart TD
    subgraph Client [Client-Side Browser Layer]
        UI[HeroUI 2.8 + Tailwind CSS 3]
        ReactApp[React 18 Single-Page Application]
        AuthCtx[AuthContext / Google OAuth / SHA-256 PIN]
        DataCtx[DataContext / Offline Firestore Persistence]
        DialogCtx[DialogContext / Promise Modals]
    end

    subgraph Firebase [Google Cloud Firestore Backend]
        FS[(Firestore Cloud DB: pmc-tracker-d8b38)]
        FAuth[Firebase Authentication]
    end

    subgraph Automation [Automated Reporting Cloud Engine]
        CF[Cloudflare Edge Worker - 17:00 UTC Precision Cron]
        GHA[GitHub Actions Runner - daily_report.yml]
        NodeRunner[send_daily_summary.js - Firebase Admin SDK]
        EmailJS[EmailJS REST API Dispatcher]
    end

    UI --> ReactApp
    ReactApp --> AuthCtx
    ReactApp --> DataCtx
    ReactApp --> DialogCtx
    AuthCtx <--> FAuth
    DataCtx <--> FS

    CF -- "POST /dispatches" --> GHA
    GHA --> NodeRunner
    NodeRunner --> FS
    NodeRunner --> EmailJS
    EmailJS --> Inboxes[Admin / Partner Email Inboxes]
```

### Core Technologies

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime & Framework** | React | `^18.3.1` | Declarative component hierarchy and reactive state management |
| **Bundler & Tooling** | Vite | `^6.1.0` | Ultra-fast HMR and custom deployment rollup bundling |
| **Component System** | HeroUI (NextUI) | `^2.8.10` | Enterprise UI components, accessible dialogs, tables, and popovers |
| **Animation Engine** | Framer Motion | `^11.11.17` | Layout transitions, toast animations, and modal reveals |
| **Styling** | Tailwind CSS | `^3.4.17` | Utility-first responsive design, custom dark/light tokens |
| **Icons** | Lucide React | `^0.475.0` | Comprehensive semantic SVG iconography |
| **Data Visualization** | Chart.js | `^4.5.1` | Multi-year trajectories, 6-month comparisons, and donut composition charts |
| **Database** | Google Cloud Firestore | `^13.0.0` (Compat) | Multi-tab synchronized NoSQL database with offline persistence |
| **Authentication** | Firebase Auth | `^13.0.0` (Compat) | Google Single Sign-On (SSO) + secure Quick PIN gateway |
| **Email API** | EmailJS REST API | Browser SDK / REST | Client & serverless transactional closing reports |
| **Cron Scheduling** | Cloudflare Workers | Edge Cron | Zero-queue on-time 11:00 PM BST trigger |
| **Serverless Runner** | GitHub Actions | Ubuntu / Node 22 | Headless daily closing summarizer |

---

## 3. Complete Codebase File Directory

```
Y:\stuff\PMC DASHBOARD
├── AGENTS.md                            # Agent/developer quick rules + running change log (read first)
├── CLAUDE.md                            # Imports AGENTS.md for Claude Code
├── .firebaserc                          # Firebase project linkage ('pmc-tracker-d8b38')
├── .gitignore                           # Git ignore rules
├── .github/
│   └── workflows/
│       └── daily_report.yml             # GitHub Actions workflow for 11:00 PM closing email
├── assets/                              # Compiled production assets mirrored for root GitHub Pages
├── branding/                            # PMC Brand Kit v1.0 source assets
│   ├── README.txt                       # Branding typography and usage rules
│   ├── app-icons/                       # Favicons, apple-touch, and maskable icons
│   ├── icons/                           # 21 UI icons and SVG sprite
│   ├── logo/                            # Horizontal, stacked, mark & wordmark SVGs/PNGs
│   └── tokens/
│       ├── colors.json                  # Brand token specifications
│       └── pmc-tokens.css               # CSS variable definitions
├── dist/                                # Vite production build output directory (gitignored)
├── entry-designs.html                   # Historic design prototype laboratory (local only, gitignored)
├── firebase.json                        # Firebase hosting config (unused; production is GitHub Pages)
├── icons/                               # Favicons served in production — manual copy of public/icons/
├── index.html                           # GENERATED root entry HTML (written by `npm run build`; don't edit)
├── index.legacy.html                    # Archived legacy v1.0 monolithic app (local only, gitignored)
├── index.template.html                  # Vite source HTML template with font loaders & theme bootstrap
├── junk/                                # Historical raw spreadsheet exports (local only, gitignored)
├── package.json                         # Node dependencies and project scripts
├── package-lock.json                    # Deterministic dependency lockfile
├── postcss.config.js                    # PostCSS Tailwind and Autoprefixer integration
├── public/                              # Vite static dir (icons/, branding/, logo/) → copied into dist/ only
├── README.md                            # STALE, local only (gitignored); describes the legacy app
├── HANDOVER.md                          # This document
├── scripts/                             # Automation and cron scripts
│   ├── cloudflare_cron_trigger.js       # Cloudflare Worker code for precision GitHub Action dispatch
│   ├── package.json                     # Node dependencies for serverless scripts (firebase-admin)
│   └── send_daily_summary.js            # Node CLI closing email generator & dispatcher
├── src/                                 # React Application Source
│   ├── App.jsx                          # Main shell, routing, theme controller & view switcher
│   ├── main.jsx                         # Application entry mount point (HeroUIProvider, DialogProvider)
│   ├── index.css                        # Global CSS, scrollbars, print styles & Tailwind directives
│   ├── assets/themes/                   # Theme preview imagery
│   ├── branding/
│   │   └── pmc-tokens.css               # Embedded design tokens
│   ├── components/
│   │   ├── addsale/                     # Add Sale view & sub-components
│   │   │   ├── AddSaleStats.jsx         # Month-to-date KPI tiles with sparklines
│   │   │   ├── AddSaleView.jsx          # Add Sale layout container & missing sale alert
│   │   │   ├── MonthlyTrendChart.jsx    # Cumulative monthly revenue trend chart
│   │   │   └── SaleForm.jsx             # Sale entry form with live margin & cost/profit bar
│   │   ├── audit/
│   │   │   └── AuditLogView.jsx         # Audit log explorer, change diffing & actor tracking
│   │   ├── auth/
│   │   │   └── AuthGate.jsx             # Authentication modal overlay (Google OAuth + PIN pad)
│   │   ├── common/                      # Reusable atom components
│   │   │   ├── AppDialog.jsx            # Promise-based confirmation/prompt modal dialog
│   │   │   ├── MetricCard.jsx           # Standard KPI card with comparison delta chip
│   │   │   ├── PinInput.jsx             # 4-digit auto-advancing PIN input box
│   │   │   ├── PmcBrandLogo.jsx         # Vector brand logo component (icon, mark, horizontal, stacked)
│   │   │   └── StatusChip.jsx           # Normalized badge chip component
│   │   ├── dashboard/                   # Dashboard view & charts
│   │   │   ├── DashboardCharts.jsx      # 9 interactive Chart.js analytics canvases
│   │   │   ├── DashboardView.jsx        # Executive dashboard KPI overview
│   │   │   ├── MissingSalesBanner.jsx   # Top alert banner for unrecorded store days
│   │   │   └── MissingSalesModal.jsx    # Missing date reconciler (record entry or mark off-day)
│   │   ├── expenses/                    # Operating Expenses & Partner Settlement
│   │   │   ├── ExpenseModal.jsx         # Add/Edit expense entry dialog
│   │   │   ├── ExpensesView.jsx         # Expenses explorer, monthly accordion & metrics
│   │   │   ├── MonthEndModal.jsx        # Complete month-end settlement audit & profit calculator
│   │   │   └── SettlementHistoryModal.jsx # Historic month-end settlement ledger & print slip
│   │   ├── export/
│   │   │   └── ExportView.jsx           # CSV dataset exporter & backup preview
│   │   ├── history/                     # Sales History & Edits
│   │   │   ├── HistoryView.jsx          # Tabular sales records with pagination & filters
│   │   │   └── SaleEditModal.jsx        # Audited sale modifier modal
│   │   ├── invoices/                    # POS Invoicing & A4 Receipts
│   │   │   ├── InvoiceFormCard.jsx      # Full-featured invoice generator & itemizer
│   │   │   ├── InvoicePreviewModal.jsx  # Printable A4 bill preview with date/time override
│   │   │   └── InvoicesView.jsx         # Invoice list, search, cloning & reprint table
│   │   ├── layout/                      # Structural Layout Components
│   │   │   ├── ConfigBanner.jsx         # Top sync/status warning banner
│   │   │   ├── Sidebar.jsx              # Responsive navigation rail with profile & theme toggle
│   │   │   └── Topbar.jsx               # Top bar with Dhaka date chip & notification trigger
│   │   ├── pmbrings/                    # PM Brings (Inter-shop sourcing)
│   │   │   ├── PmBringsModal.jsx        # Sourcing item entry & status editor
│   │   │   └── PmBringsView.jsx         # Inter-shop item tracker with shop filters
│   │   ├── pricelist/                   # Product Catalog & Price List
│   │   │   ├── ManageBrandsModal.jsx    # Custom brand & category manager
│   │   │   ├── PriceListEntryModal.jsx  # Catalog item creator/editor
│   │   │   ├── PriceListView.jsx        # Searchable price catalog table
│   │   │   └── QuickPriceModal.jsx      # Quick in-line price adjuster
│   │   ├── purchases/                   # Purchases & Supplier Ledgers
│   │   │   ├── PurchaseInvoiceViewModal.jsx # Supplier bill preview
│   │   │   ├── PurchaseModal.jsx        # Record incoming supplier purchase bill
│   │   │   ├── PurchasePaymentModal.jsx # Record due payment voucher to supplier
│   │   │   ├── PurchasesView.jsx        # Dual-tab view: Purchase bills & Supplier balances
│   │   │   ├── ShopLedgerModal.jsx      # Full chronological supplier running debit/credit ledger
│   │   │   └── SupplierShopModal.jsx    # Create/edit supplier profile & contact info
│   │   ├── settings/                    # Settings Hub
│   │   │   └── ShopSettingsModal.jsx    # Multi-tab modal: Notifications, Backups & Fixed Rates
│   │   └── tracker/                     # Product Tracker & Serialized Inventory
│   │       ├── ProductModal.jsx         # Add/Edit tracked serialized item
│   │       └── TrackerView.jsx          # Serialized inventory registry with search & filters
│   ├── constants/
│   │   └── navigation.js                # Top-level workspace navigation definitions
│   ├── context/
│   │   ├── AuthContext.jsx              # Global authentication state, Google OAuth & PIN handler
│   │   ├── DataContext.jsx              # Real-time Firestore synchronization & global store
│   │   └── DialogContext.jsx            # Promise-based modal confirmations (`appConfirm`, `appPrompt`)
│   ├── services/
│   │   ├── auth.js                      # SHA-256 hash checking, audit logging & auth methods
│   │   ├── emailNotifications.js        # EmailJS client SDK integration & template builders
│   │   └── firebase.js                  # Firebase app initialization & Firestore persistence setup
│   └── utils/
│       ├── auditHelpers.js              # Audit trail formatting, entity mapping & diff parser
│       ├── backupHelpers.js             # JSON backup generator & chunked batch restore engine
│       ├── calculations.js              # Mathematical utilities, Dhaka time math & formatting
│       ├── dropdownTypeahead.js         # Custom keyboard typeahead cycling for HeroUI select/dropdowns
│       ├── expenseHelpers.js            # Monthly expense grouping, audit logic & profit formulas
│       ├── exportHelpers.js             # RFC-4180 CSV generation with UTF-8 BOM encoding
│       ├── invoiceHelpers.js            # Invoice sequence numbering (`PMCINV-YY###`) & counter burning
│       ├── priceListHelpers.js          # Catalog defaults & CSV export formatters
│       ├── productHelpers.js            # Serial number generator & shop name canonicalization map
│       └── purchaseHelpers.js           # Supplier running debit/credit calculation engine
├── tailwind.config.js                   # Tailwind theme colors, fonts & HeroUI plugin config
├── v2/
│   └── index.html                       # Immediate redirect script pointing to root `/`
└── vite.config.js                       # Vite configuration & automatic root deployment handler
```

---

## 4. Security, Authentication & Role-Based Access

The PMC Management System employs a dual-tier authentication architecture designed for rapid shop-floor terminal access while strictly safeguarding financial ledgers from unauthorized access.

### Google OAuth & Client-Side SHA-256 Whitelist

When a user signs in via Google OAuth (`loginWithGoogle()`), Firebase Auth generates a standard user token. Before granting access to the system state, `src/services/auth.js` computes a cryptographic SHA-256 hash of the normalized email address using the browser's native `window.crypto.subtle.digest` API:

```javascript
// src/services/auth.js
export const AUTHORIZED_EMAIL_HASHES = [
  'eca75e4e1389363b55d45cc87f735f3679c37629d3dd037a26b2933e750e76ac', // Admin
  '8b50a2e0e9c3dceadb257982fca99342e5bac8cf2eca829c2281d9b925ffdccd', // Store
  'aed3fc6d92114d03707bb48705bbc74100e61b8f48b4f14587a353bfc9355c35', // Partner
  '32f43503ae26b765ea9797acda2d66dfe252ca4331b4b9f94ec246345502b123'  // On-the-go PIN Account
];
```

If an unauthorized Google user attempts to authenticate:
1. The email is masked (e.g., `m***i@gmail.com`).
2. An `auth/denied` record is written to the Firestore `audit_log`.
3. The session is immediately rejected and the UI displays an **Access Denied** alert banner.

### Quick PIN Fallback & Brute-Force Defense

For store terminals where typing a full Google password or maintaining a logged-in Google profile is impractical, staff can authenticate using a 4-digit numeric PIN:
- **Accepted PINs:** `1234` or `6666` (or any string whose SHA-256 matches `DEFAULT_GUEST_PIN_HASH`).
- **Underlying Mechanism:** Upon entering a valid PIN, `loginWithPin()` calls `firebase.auth().signInWithEmailAndPassword(<shared PIN account>, <password>)` behind the scenes (credentials are in `src/services/auth.js`), creating a valid authenticated Firebase session tagged with `isGuest: true`. Known weakness: those credentials ship in the public JS bundle and the PIN check is client-side only.
- **Firestore security rules** are not stored in this repo; they are managed in the Firebase console. A new authorized login needs both a hash in `AUTHORIZED_EMAIL_HASHES` and an entry in the console rules.
- **Brute-Force Rate Limiting:** `src/components/auth/AuthGate.jsx` monitors consecutive failed PIN attempts. If an incorrect PIN is entered 5 times in succession, the input pad is locked for **5 minutes (300 seconds)** with an active countdown timer.

### Firebase Project Configuration

The application connects to Google Cloud Firebase under project ID `pmc-tracker-d8b38`:

```javascript
// src/services/firebase.js
export const firebaseConfig = {
  apiKey: "AIzaSyA7QjWQ9frjqnistyoj_sSMNvxZJzgCFbc",
  authDomain: "pmc-tracker-d8b38.firebaseapp.com",
  projectId: "pmc-tracker-d8b38",
  storageBucket: "pmc-tracker-d8b38.firebasestorage.app",
  messagingSenderId: "53401702829",
  appId: "1:53401702829:web:176dcd22e97df9454ed124"
};
```

> [!IMPORTANT]
> Offline persistence is initialized with `db.enablePersistence({ synchronizeTabs: true })`. This allows the application to function seamlessly during internet dropouts in Mirpur and ensures state is synchronized in real time across multiple browser tabs.

---

## 5. Database Architecture & Firestore Schemas

All store data resides in Google Cloud Firestore NoSQL collections. Below is the comprehensive schema dictionary for every document and collection in the database.

### Collection Dictionary & Field Types

#### 1. `sales` (Daily Sales Ledger)
| Field | Type | Description |
| :--- | :--- | :--- |
| `date` | `string` | ISO Date (`YYYY-MM-DD`) |
| `sale` | `number` | Total daily gross revenue (৳) |
| `cost` | `number` | Total daily cost / operating expenses (৳) |
| `profit` | `number` | Total daily gross profit (৳) |
| `profitPct` | `number` | Profit margin ratio (e.g. `0.071` for 7.1%) |
| `enteredBy` | `string` | Display name or email of actor |
| `createdAt` | `timestamp` | Firestore server timestamp |

#### 2. `product_tracker` (Serialized Inventory & Warranty Items)
| Field | Type | Description |
| :--- | :--- | :--- |
| `trackNum` | `number` | Sequential tracking ID (starts at `2001`) |
| `desc` | `string` | Product name / model description |
| `shop` | `string` | Sourced shop name (e.g. `Liton`, `RB`, `Arif`) |
| `sn` | `string` | Manufacturer serial number |
| `status` | `string` | Item status: `'unmarked'` \| `'sold'` \| `'returned'` |
| `dateISO` | `string` | Date item was recorded (`YYYY-MM-DD`) |
| `dateLabel` | `string` | Human formatted date label (e.g. `24 Oct 26`) |
| `note` | `string` | Additional tracking notes or warranty caveats |
| `createdAt` | `timestamp` | Record creation timestamp |

#### 3. `invoices` (Customer POS Sales Invoices)
| Field | Type | Description |
| :--- | :--- | :--- |
| `number` | `string` | Sequential invoice number (`PMCINV-YY###`, e.g. `PMCINV-26042`) |
| `date` | `string` | Billing date (`YYYY-MM-DD`) |
| `soldBy` | `string` | Authorized salesperson (`'FOYEZ'` \| `'MEHEDI'`) |
| `buyerName` | `string` | Customer / Company name |
| `buyerPhone` | `string` | Customer phone number |
| `buyerAddress` | `string` | Delivery address or location |
| `items` | `array<object>` | List of purchased items (see sub-schema below) |
| `totalAmount` | `number` | Subtotal before discount |
| `discount` | `number` | Deducted discount amount (৳) |
| `grandTotal` | `number` | Final payable bill amount (`totalAmount - discount`) |
| `createdAt` | `timestamp` | Document creation timestamp |

*Invoice Item Sub-Schema:*
```typescript
{
  desc: string;               // Product item description
  qty: number;                // Quantity purchased
  price: number;              // Unit price (৳)
  hasWarranty: boolean;       // Whether warranty applies
  warrantyDays: string;       // "365 days", "730 days", "1095 days", "1825 days", or custom
  warrantyNote: string;       // e.g. "Physical damage voids warranty"
}
```

#### 4. `system_meta/invoice_counters` (Invoice Sequential Generator)
| Field | Type | Description |
| :--- | :--- | :--- |
| `[YY]` | `number` | Max sequence burned for 2-digit year (e.g. `"26": 42`) |
| `updatedAt` | `timestamp` | Timestamp of counter advancement |

#### 5. `purchases` (Supplier Purchase Invoices)
| Field | Type | Description |
| :--- | :--- | :--- |
| `date` | `string` | Purchase date (`YYYY-MM-DD`) |
| `shop` | `string` | Supplier shop name |
| `invoiceNum` | `string` | Supplier memo / bill reference number |
| `totalAmount` | `number` | Total invoice bill amount (৳) |
| `paidAmount` | `number` | Initial amount paid at time of purchase (৳) |
| `dueAmount` | `number` | Remaining balance (`totalAmount - paidAmount`) |
| `status` | `string` | `'paid'` \| `'partial'` \| `'due'` |
| `notes` | `string` | Item summary or purchase details |
| `items` | `array<object>` | Optional itemized product details |

#### 6. `supplier_shops` (Supplier Directory)
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Registered supplier shop name |
| `phone` | `string` | Supplier contact phone |
| `address` | `string` | Market stall / shop location |
| `notes` | `string` | Credit terms, distributor status |

#### 7. `purchase_payments` (Supplier Due Payment Vouchers)
| Field | Type | Description |
| :--- | :--- | :--- |
| `date` | `string` | Payment date (`YYYY-MM-DD`) |
| `shop` | `string` | Recipient supplier shop name |
| `amount` | `number` | Amount paid towards due (৳) |
| `note` | `string` | Payment memo / voucher reference |
| `createdAt` | `timestamp` | Timestamp of payment recording |

#### 8. `expenses` (Store Operating Expenses)
| Field | Type | Description |
| :--- | :--- | :--- |
| `date` | `string` | Actual cash disbursement date (`YYYY-MM-DD`) |
| `billingMonth` | `string` | Associated accounting month (`YYYY-MM`) |
| `category` | `string` | System category (e.g. `'Shop Rent'`, `'Electricity Bill'`, `'Pias House Rent'`) |
| `amount` | `number` | Expenditure amount (৳) |
| `paymentMethod`| `string` | `'Cash'` \| `'bKash'` \| `'Bank'` |
| `desc` | `string` | Detailed description / meter reading memo |
| `enteredBy` | `string` | Staff member who logged the expense |

#### 9. `monthly_settlements` (Finalized Month-End Reconciliations)
| Field | Type | Description |
| :--- | :--- | :--- |
| `month` | `string` | Target settlement month (`YYYY-MM`, e.g. `2026-09`) |
| `totalRevenue` | `number` | Cumulative monthly sales revenue (৳) |
| `totalGrossProfit`| `number` | Cumulative monthly sales gross profit (৳) |
| `totalDailyCost` | `number` | Cumulative monthly daily sales costs (৳) |
| `shopRent` | `number` | Commercial shop rent charged (৳) |
| `houseRent` | `number` | Pias residential rent allowance charged (৳) |
| `electricity` | `number` | Electricity bill deducted for the month (৳) |
| `piasDailyTotal` | `number` | Pias daily allowance (`operatingDays * piasDailyRate`) |
| `otherExpenses` | `number` | Miscellaneous operating expenses |
| `roundingDeduction`| `number` | Discretionary deduction for cash rounding |
| `distributableProfit`| `number`| Final net distributable profit pool |
| `piasRatio` | `number` | Pias profit ratio percentage (default `55`) |
| `piasBaseShare` | `number` | Pias base profit share (`distributableProfit * 0.55`) |
| `piasTotalTakeHome`| `number`| Final Pias cash payout (`piasBaseShare + piasDailyTotal`) |
| `mehediRatio` | `number` | Mehedi profit ratio percentage (default `45`) |
| `mehediBaseShare` | `number` | Final Mehedi cash payout (`distributableProfit * 0.45`) |
| `settledAt` | `string` | ISO timestamp of finalization |
| `settledBy` | `string` | Actor who finalized the settlement |

#### 10. `pm_brings` (Inter-Shop Sourced Walk-In Stock)
| Field | Type | Description |
| :--- | :--- | :--- |
| `dateISO` | `string` | Date item was brought (`YYYY-MM-DD`) |
| `shop` | `string` | Sourced shop name |
| `desc` | `string` | Component description |
| `cost` | `number` | Cost from source shop (৳) |
| `sale` | `number` | Selling price to customer (৳) |
| `status` | `string` | Sourcing settlement status: `'unmarked'` \| `'paid'` |
| `note` | `string` | Memo / customer bill link |

#### 11. `price_list` (Master Product Pricing Catalog)
| Field | Type | Description |
| :--- | :--- | :--- |
| `brand` | `string` | Manufacturer brand name (e.g. `'Gigabyte'`, `'Logitech'`) |
| `type` | `string` | Component category (e.g. `'Keyboard'`, `'SSD'`, `'Monitor'`) |
| `model` | `string` | Exact model name / specification |
| `price` | `number` | Current retail price in BDT (৳) |
| `notes` | `string` | Warranty or vendor notes |
| `updatedAt` | `string` | Last modified ISO date |

#### 12. `audit_log` (Tamper-Evident Security Log)
| Field | Type | Description |
| :--- | :--- | :--- |
| `entityType` | `string` | `'sale'` \| `'invoice'` \| `'product'` \| `'pm_brings'` \| `'purchase'` \| `'expense'` \| `'settlement'` \| `'settings'` |
| `entityId` | `string` | Target document ID or reference number |
| `action` | `string` | `'create'` \| `'update'` \| `'delete'` \| `'login'` \| `'denied'` |
| `before` | `object` | Snapshot of document prior to change (diffing) |
| `after` | `object` | Snapshot of document post change |
| `author` | `string` | Display name or email of user |
| `timestampMillis`| `number` | Epoch millisecond timestamp for fast sorting |
| `timestamp` | `timestamp` | Firestore server timestamp |

### Metadata & Settings Documents

- **`settings/fixed_rates`:** Stores contractual default overheads:
  `{ shopRent: 5000, houseRent: 7000, piasDailyRate: 100, piasRatio: 55, mehediRatio: 45 }`
- **`settings/store_off_days`:** Array of marked non-operational dates:
  `{ offDays: [ { date: "2026-08-15", reason: "National Holiday" } ] }`
- **`settings/notifications`:** Array of recipient preference objects for 11:00 PM email summaries:
  `{ recipients: [ { id: "recip_1", name: "Mehedi", email: "<recipient email>", alertDaily: true, dailyTiming: "23:00", ... } ] }`
- **`settings/price_list_brands` & `settings/price_list_types`:** Arrays of custom catalog brands and hardware categories.

---

## 6. Business Logic, Financial Engines & Partner Settlements

### Store Operating Days & Off-Day Rules

A retail store in Dhaka does not operate 365 days a year:
1. **Thursday Store Off-Day Rule:** PM Computers is closed on Thursdays. In all calculations, Thursdays with no recorded sales are treated as standard weekly off-days rather than missing entries.
2. **Marked Off-Days:** Holidays, market strikes, or emergency closures can be flagged in the system via the Missing Sales dialog or Settings hub. Once marked, they are excluded from missing-entry warnings.
3. **Operating Day Count:** Any calendar day containing a recorded `sales` entry is counted as an **Operating Day**.

### Operating Expense Model & Fixed Overheads

Monthly expenses fall into three distinct operational buckets:
1. **Fixed Shop Rent:** Commercial premises lease (baseline default: ৳5,000/month).
2. **Pias Residential Rent Allowance:** Contractual residential rent subsidy for partner Pias (baseline default: ৳7,000/month).
3. **Electricity & Utility Bills:** Monthly utility bill paid for the premises. The system intelligently detects which billing month an electricity payment covers.
4. **Pias Daily Operating Allowance:** An attendance-based daily stipend awarded to partner Pias for managing day-to-day on-site store operations:
   $$\text{Pias Daily Total} = \text{Operating Days} \times \text{Pias Daily Rate (৳100)}$$
5. **Daily Running Costs:** Sum of incidental shop costs logged inside the daily sales entries (`sale.cost`).

### Partner Profit-Sharing Mathematical Model (Pias & Mehedi)

The month-end settlement calculation implemented in `src/utils/expenseHelpers.js` executes the following mathematical sequence:

```
+ Total Gross Profit (Sum of all sale.profit for the month)
- Rounding Deduction (Optional manual cash leveling)
--------------------------------------------------------------
= Adjusted Gross Profit

- Total Deductions:
    + Shop Rent (actual paid or ৳5,000 baseline)
    + Pias House Rent (actual paid or ৳7,000 baseline)
    + Electricity Bill (for the target billing cycle)
    + Pias Daily Total (Operating Days × ৳100)
    + Daily Operating Costs (Sum of all sale.cost)
    + Other Incidental Expenses
--------------------------------------------------------------
= Distributable Net Profit Pool
```

#### Final Partner Payout Distribution:
- **Pias Share Ratio:** 55%
- **Mehedi Share Ratio:** 45%

$$\text{Pias Base Share} = \text{round}(\text{Distributable Profit} \times 0.55)$$
$$\mathbf{Pias\ Total\ Take\text{-}Home} = \text{Pias Base Share} + \text{Pias Daily Total}$$

$$\mathbf{Mehedi\ Total\ Take\text{-}Home} = \text{round}(\text{Distributable Profit} \times 0.45)$$

> [!NOTE]
> Pias receives his 55% base profit share **plus** the accumulated daily operational stipend (`Pias Daily Total`). Mehedi receives his 45% equity share.

### Audit Validation Rules for Month-End Finalization

In `src/components/expenses/MonthEndModal.jsx`, the system enforces strict pre-conditions before allowing a month-end settlement to be locked:
- **Missing Items Check:** The modal audits the month's ledger. If **Shop Rent**, **Electricity Bill**, **Pias Daily**, or **Daily Costs** have zero recorded entries, it flags them in an amber warning box.
- **Missing Sales Days Check:** If there are weekdays (non-Thursdays) with missing sales entries that have not been explicitly marked as store off-days, the modal generates a list of missing dates with direct action buttons to either record the missing sale or mark the day as an off-day.
- **Settlement Freezing:** Once finalized, the settlement is stored in `monthly_settlements` and displayed in `SettlementHistoryModal.jsx` where it can be inspected, printed, or audited.

---

## 7. Module-by-Module Deep Dive

### 1. Dashboard & KPI Analytics (`src/components/dashboard/`)
- **Top Metric Cards:**
  - *Yesterday's Performance:* Gross revenue, gross profit, and margin percentage.
  - *This Month to Date:* Current month cumulative sales compared directly against the identical calendar day of the previous month (`lastMonthTD`), showing percentage growth delta and full-month linear projection.
  - *This Year to Date:* Cumulative yearly sales compared against the same day of the prior year, with leap-year-aware linear projection.
- **Interactive Visualizations (`DashboardCharts.jsx`):**
  1. *6-Month Profit Trajectory:* Bar chart of monthly profits over the trailing half-year.
  2. *Multi-Year Sales Trajectory:* Year-over-year revenue line comparisons.
  3. *Multi-Year Profit Trajectory:* Year-over-year gross profit curves.
  4. *Selected Year Monthly Breakdown:* Grouped bar chart comparing revenue vs profit across all 12 months.
  5. *Cost vs Profit Donut:* Doughnut chart representing COGS vs Net Margin.
  6. *Yearly Aggregate Comparison:* Historical annual totals.
  7. *Day-of-Week Revenue Distribution:* Analyzes best performing store days (Sunday through Saturday).
  8. *Cumulative Monthly Pace:* Daily run-rate trajectory.
  9. *Profit Margin % Trend:* Tracks margin health fluctuations over time.

### 2. Add Sale (Daily Ledger) (`src/components/addsale/`)
- **Live Margin Preview:** Automatically calculates profit margin as the operator types revenue and profit figures.
- **Cost vs Profit Visual Bar:** Renders a dual-tone distribution bar showing the exact percentage ratio of cost versus profit relative to total sales.
- **Missing Sales Alerts:** Integrates `MissingSalesBanner` at the top of the form, warning operators if previous business days were left unrecorded.
- **Audit Integration:** Recording a sale creates an entry in `sales` and immediately appends an audit event to `audit_log`.

### 3. Sales History & Audited Modification (`src/components/history/`)
- **Dynamic Period Filtering:** Filter by Month, Year, Custom Date Range, or All-Time.
- **Search & Pagination:** Full text search across actor names and dates with client-side 25-rows-per-page pagination.
- **Audited Editing (`SaleEditModal.jsx`):** Modifying a historical sale requires confirming via `AppDialog`. The modal captures the exact pre-edit (`before`) and post-edit (`after`) values and writes a diff to `audit_log`.
- **Audited Deletion:** Deleting a sale prompts for confirmation and preserves the deleted record in the audit trail.

### 4. Product Tracker & Warranty Registry (`src/components/tracker/`)
- **Auto-Incrementing Tracking Numbers:** New products automatically receive the next unused serial starting from `2001`.
- **Status Management:** Items can be dynamically toggled between `unmarked`, `sold`, and `returned` without opening the full edit modal.
- **Dirty Shop Name Aliasing Map (`src/utils/productHelpers.js`):** In the physical Dhaka markets, staff frequently enter informal shop abbreviations. The system includes an intelligent canonicalization dictionary:
  - `"lit"`, `"liron"`, `"linon"`, `"liton 23.04.22"` $\to$ **Liton**
  - `"arif c c camera"`, `"\"arif c c camera"` $\to$ **Arif**
  - `"mahbub"`, `"mhbub"` $\to$ **Mahabub**
  - `"madus"` $\to$ **Masud**
  - `"c c"`, `"cc"` $\to$ **CC**
  - `"ss t"` $\to$ **SS**
  - `"jenat"`, `"jennat"` $\to$ **Jannat**
  - `"suvho"` $\to$ **Suvo**
  - `"4eys"` $\to$ **4EY**
  - `"rasel vai"`, `"rasel con"` $\to$ **Rasel**
- Filter dropdowns automatically match canonical equivalents so searching for `"Liton"` surfaces items logged under any of its dirty typographical variants.

### 5. PM Brings (Inter-Shop Sourcing) (`src/components/pmbrings/`)
- Tracks goods sourced on credit from other shops to fulfill instant customer requests.
- Tracks `cost` (what PMC owes the source shop), `sale` (what PMC charged the customer), and computes instant profit.
- Quick settlement toggle: allows operators to flag an item as `paid` or `unmarked` when credit is cleared with the sourcing shop.

### 6. Purchases & Supplier Ledgers (`src/components/purchases/`)
- **Dual Sub-Tabs:**
  - *Purchases Tab:* Lists all supplier bills, paid amounts, remaining dues, and status (`paid`, `partial`, `due`).
  - *Supplier Shops Tab:* Displays high-level cards for every distributor, sorted by outstanding due balance (`shopSortOrder: 'due-high'`).
- **Running Ledger Reconstruction (`ShopLedgerModal.jsx`):**
  Uses `buildShopLedgerTransactions()` to combine all purchase bills and payment vouchers for a specific supplier, sorts them chronologically, and computes a mathematical running due balance:
  $$\text{Running Due}_{t} = \text{Running Due}_{t-1} + (\text{Bill Amount}_t - \text{Paid Amount}_t)$$

### 7. Operating Expenses & Month-End Settlement (`src/components/expenses/`)
- **Accordion Month Grouping:** Automatically groups expenses by calendar month, with individual totals for each category.
- **Category Badge Coding:** Visual color-coding (Shop Rent: `success`, Electricity: `warning`, House Rent: `secondary`, Daily Operating: `primary`).
- **Settlement Hub:** Provides one-click access to `MonthEndModal` for finalizing partner distributions and `SettlementHistoryModal` for historical reviews.

### 8. Invoice Management & POS Generation (`src/components/invoices/`)
- **Sequential Year-Prefixed Invoice Numbers:** Generates identifiers formatted as `PMCINV-YY###` (e.g. `PMCINV-26001`, `PMCINV-26002`).
- **Burned Counter Synchronization:** `burnInvoiceNumber()` ensures that if an invoice number is issued, the counter is committed to `system_meta/invoice_counters` and cached in `localStorage` under `pmc_inv_burned_YY`, preventing duplicate invoice numbers across terminals.
- **Salesperson Attribution:** Tracks which partner/staff executed the transaction (`FOYEZ` or `MEHEDI`).
- **A4 Printable Preview (`InvoicePreviewModal.jsx`):** High-resolution clean billing template featuring PM Computers branding, customer details, warranty terms table, signature blocks, and date/time print overrides.

### 9. Export & Business Intelligence (`src/components/export/`)
- One-click CSV exports for:
  - `sales` (Date-range filtered with column totals).
  - `products` (Full serialized registry with tracking numbers).
  - `invoices` (Comprehensive bill list with buyer contacts).
  - `expenses` (Expense records categorized by billing cycle).
- All CSVs are encoded using RFC-4180 standards with UTF-8 BOM headers to ensure Bengali and English text opens cleanly in Microsoft Excel.

### 10. Audit Log & Security Trail (`src/components/audit/`)
- Real-time immutable activity log monitoring 13 distinct system entities.
- Deep object diffing: identifies exactly which fields changed during an update (e.g., `sale: 45000 -> 52000`).
- Relative timestamp indicators (`Just now`, `5m ago`, `2d ago`).

### 11. Shop Settings Hub & System Preferences (`src/components/settings/`)
- **Notification Recipients:** Add, edit, remove, and configure individual alert preferences (sales, invoices, products, PM brings, schedule timing).
- **Test Email Verification:** Dispatches live test emails to verify EmailJS connectivity.
- **Fixed Rates Editor:** Update contractual shop rent, house rent, Pias daily rate, and partner equity percentages.
- **Full Database JSON Backup & Restore (`src/utils/backupHelpers.js`):**
  - Generates a complete JSON snapshot containing all 11 collections and document metadata.
  - Restores datasets in batches of **400 documents** (adhering strictly to Firestore's 500-write batch limit) with an automatic pre-restore emergency local backup.

---

## 8. Automated Cloud Pipelines & Cron Architecture

To guarantee that management receives closing reports every night without relying on an open browser tab, the system utilizes a three-tier serverless pipeline:

```mermaid
sequenceDiagram
    autonumber
    participant CF as Cloudflare Worker (Edge)
    participant GHA as GitHub Actions Runner
    participant Node as scripts/send_daily_summary.js
    participant FS as Google Cloud Firestore
    participant EJS as EmailJS REST API
    participant Mail as Partner Inboxes

    Note over CF: 17:00 UTC (11:00 PM Dhaka)
    CF->>GHA: POST /actions/workflows/daily_report.yml/dispatches
    activate GHA
    GHA->>Node: node scripts/send_daily_summary.js
    activate Node
    Node->>FS: Fetch settings/notifications
    Node->>FS: Fetch sales, expenses, invoices, products, pm_brings for target date
    Node-->>Node: Compute revenue, gross profit, margin %, and net profit
    Node-->>Node: Check Thursday off-day rule
    loop For each configured recipient
        Node->>EJS: POST https://api.emailjs.com/api/v1.0/email/send
        EJS-->>Mail: Deliver formatted HTML closing report
    end
    deactivate Node
    deactivate GHA
```

### Cloudflare Edge Precision Cron Trigger (`scripts/cloudflare_cron_trigger.js`)
- Standard GitHub Actions scheduled crons can suffer from queue delays ranging from 15 to 45 minutes during peak hours.
- A Cloudflare Worker is deployed on the Cloudflare Edge network scheduled at `17:00 UTC` (exactly **11:00:00 PM Dhaka Time**).
- It calls the GitHub REST API (`POST /repos/PMCWORK/pmcwork.github.io/actions/workflows/daily_report.yml/dispatches`) using a Fine-Grained GitHub Personal Access Token stored in the worker's environment variables (`GITHUB_TOKEN`).
- GitHub Actions starts within 3–5 seconds with zero queue delay.

### GitHub Actions Daily Dispatch Workflow (`.github/workflows/daily_report.yml`)
- Triggered via `workflow_dispatch`.
- Spins up an `ubuntu-latest` container with Node.js 22.
- Injects four repository secrets:
  - `FIREBASE_SERVICE_ACCOUNT`: Service account JSON credential for Firebase Admin SDK.
  - `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` (the script falls back to the same IDs hard-coded in `src/services/emailNotifications.js`)
- Executes `node scripts/send_daily_summary.js`.

### Node.js Summary Dispatcher Script & Smart Closing Detection (`scripts/send_daily_summary.js`)
- **Smart Closing Date Calculation:**
  If the runner executes between `00:00` (midnight) and `05:00 AM` Dhaka Time (e.g. if manually triggered late or delayed), the script automatically attributes the closing summary to the **previous business day**.
- **Thursday Store Off-Day Logic:**
  PM Computers is closed on Thursdays. If the target closing date is a Thursday and gross revenue is `0`, the script skips email dispatch and exits cleanly. If sales *were* recorded on a Thursday, it proceeds normally.
- **Dynamic Recipient Filtering:**
  Reads recipient configurations directly from Firestore (`settings/notifications`). Only sends to recipients who have `alertDaily !== false`.
- **Tailored Digest Blocks:**
  Respects individual checkboxes (`dailyIncSales`, `dailyIncInvoices`, `dailyIncProducts`, `dailyIncBrings`).

### EmailJS Transactional Delivery Engine
Emails are delivered via EmailJS REST API (`https://api.emailjs.com/api/v1.0/email/send`). The payload utilizes a custom responsive HTML email wrapper with high-contrast typography, top KPI metrics cards, and activity summary tables.

---

## 9. Build, Deployment & GitHub Pages Root Routing

### Custom Vite `root-deploy-handler` Plugin

The website is hosted on **GitHub Pages** from the root of the repository (`pmcwork.github.io`). Because GitHub Pages serves static files from the repository root rather than a `/dist` subfolder, `vite.config.js` includes a custom Rollup build plugin:

```javascript
// vite.config.js (Snippet)
plugins: [
  react(),
  {
    name: 'root-deploy-handler',
    configureServer(server) {
      // Rewrites root and /v2 URLs in local dev to serve the single-page React app
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/' || url === '/index.html' || url === '/v2' || url === '/v2/') {
          req.url = '/index.template.html';
        }
        next();
      });
    },
    closeBundle() {
      // 1. Copies dist/index.template.html to root index.html
      const compiledHtml = resolve(distDir, 'index.template.html');
      const rootIndex = resolve(__dirname, 'index.html');
      if (fs.existsSync(compiledHtml)) {
        fs.copyFileSync(compiledHtml, rootIndex);
      }

      // 2. Cleans and mirrors dist/assets/ into root assets/
      // Ensures GitHub Pages loads JS/CSS bundles directly from the repo root
    }
  }
]
```

### Hosting Layout
- **Root `index.html`:** The production HTML entry file compiled from `index.template.html`.
- **Root `assets/`:** Contains the compiled and hashed JavaScript (`app-*.js`) and CSS (`app-*.css`) bundles.
- **`v2/index.html`:** A lightweight redirect file ensuring that any legacy bookmarks or users navigating to `https://pmcwork.github.io/v2` are immediately redirected to root `/`.
- **Root `icons/`:** Favicons referenced by `index.html` (`/icons/...`). The build does **not** copy `public/` to the root, so whenever `public/icons/` changes, copy the same files into root `icons/` by hand.

### Deploy checklist
1. `npm run build` (regenerates root `index.html` + `assets/`).
2. If `public/icons/` changed, sync it to root `icons/`.
3. Commit source changes **and** the regenerated `index.html` + `assets/` together; push `main` (see §11 push rules). GitHub Pages redeploys automatically.

---

## 10. Design System, Theming & UI Utilities

### PMC Brand Kit v1.0 & Design Tokens
The design language is specified in `branding/tokens/colors.json` and `src/branding/pmc-tokens.css`:
- **Typography:**
  - *Display / Headers:* `Chakra Petch`, sans-serif
  - *UI / Body:* `IBM Plex Sans`, `Inter`, sans-serif
  - *Numerics / Monospace:* `Plus Jakarta Sans`, `JetBrains Mono`
- **Core Color Palette:**
  - Carbon: `#0B1117` (Dark Background)
  - Graphite: `#101820` (Dark Surface)
  - Signal Green: `#3DDC84` (Dark Primary Accent)
  - Circuit Green: `#0FA958` (Light Primary Accent)
  - Mist: `#E6EDF3` (Dark Foreground Text)
  - Paper: `#F6F8FA` (Light Background)

### Adaptive Dynamic Favicon Engine
When the user toggles between Dark Mode and Light Mode, the application dynamically updates the `<link rel="icon">` in the document head:
- Dark theme: `/icons/favicon-dark.svg`
- Light theme: `/icons/favicon-light.svg`
- Fallbacks: `/icons/favicon-32.png`, `/icons/apple-touch-icon-180.png`

### Global Dropdown Keyboard Typeahead Navigation (`src/utils/dropdownTypeahead.js`)
A custom sitewide accessibility utility built specifically for HeroUI selects and popovers:
1. **Zero-Pollution Check:** Only activates when a HeroUI popover or select dropdown is actively opened on screen.Keystrokes never interfere with sidebar navigation or form inputs.
2. **Repeating Char Cycling:** Pressing a letter key (e.g. `'l'`) highlights the first matching option. Pressing `'l'` repeatedly cycles through all items beginning with `'L'` in sequence without getting stuck.
3. **Commit & Dismiss:** Pressing `Enter` or `Space` commits the highlighted choice and closes the popover.

---

## 11. Developer Runbook & Local Setup

### Installation & Development Server

```bash
# 1. Clone repository
git clone https://github.com/PMCWORK/pmcwork.github.io.git
cd pmcwork.github.io

# 2. Install dependencies
npm install

# 3. Start local development server (binds to http://localhost:5173/)
npm run dev
```

### Production Build & Verification

```bash
# Compile production bundle and update root index.html + assets/
npm run build

# Preview production build locally
npm run preview
```

### CRITICAL: Non-Interactive Git Push Rules on this Machine

> [!CAUTION]
> **NEVER execute a bare `git push` on this machine.**  
> Standard `git push` invokes the Windows `git-credential-manager` GUI dialog, which hangs silently and freezes automated shells and CI agents.
>
> You **MUST** read the OAuth token from the Windows Credential Vault via PowerShell and pass it via an HTTP Basic Authorization header:

```powershell
# 1. Extract GitHub credentials from Windows Credential Manager
Add-Type -MemberDefinition '[DllImport("advapi32.dll", CharSet=CharSet.Unicode)] public static extern bool CredRead(string t, int tp, int f, out IntPtr c); [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr b);' -Namespace WinCred -Name Api
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct CREDENTIAL { public int Flags; public int Type; public string TargetName; public string Comment; public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist; public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName; }'
$ptr = [IntPtr]::Zero
[WinCred.Api]::CredRead("git:https://github.com", 1, 0, [ref]$ptr) | Out-Null
$cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [Type][CREDENTIAL])
$bytes = New-Object byte[] $cred.CredentialBlobSize
[System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
$token = [System.Text.Encoding]::Unicode.GetString($bytes)
$user = $cred.UserName
[WinCred.Api]::CredFree($ptr)

# 2. Push non-interactively using HTTP Basic Auth header
git -c credential.helper="" -c "http.extraHeader=Authorization: Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($user + ':' + $token)))" push origin main
```

### Disaster Recovery & Full System Restore

1. **Creating a Manual Backup:** Open the application, click **Shop Settings & Preferences** in the sidebar footer, select the **Database & Backups** tab, and click **Download Complete JSON Snapshot**.
2. **Restoring from Backup:** In the same tab, upload the JSON file, select either **Merge (Recommended)** or **Overwrite**, and click **Execute System Restore**.
3. **Emergency Pre-Restore Dump:** Before applying any batch writes, `src/utils/backupHelpers.js` saves the existing state to `localStorage` under `pmc_emergency_pre_restore_backup`.

---

## 12. Gotchas, Quirks & Hidden Intricacies (Nooks & Crannies)

Here are the subtle, hard-earned edge cases and nuances embedded throughout the codebase:

1. **Timezone Offset Handling (Asia/Dhaka · UTC+6):**
   Dhaka does not observe Daylight Saving Time. `dhakaNow()` in `src/utils/calculations.js` executes a robust fallback: it first attempts `Intl.DateTimeFormat` with `timeZone: 'Asia/Dhaka'`. If running in an environment without full ICU data, it manually applies a `+6 * 3600000` millisecond offset against UTC.
2. **Invoice Number Burning vs. Rolling Back:**
   When an invoice form is initialized, `getNextInvoiceNumber()` queries `system_meta/invoice_counters` and computes the next sequential number. When the invoice is saved, `burnInvoiceNumber()` permanently advances the counter. If an invoice draft is cancelled before saving, the number is **not** burned, preventing gaps in sequential tax billing.
3. **Dirty Shop Name Matching:**
   Never perform raw equality checks like `product.shop === filterShop`. Always use `shopMatchesFilter(product.shop, filterShop)` from `src/utils/productHelpers.js`. This guarantees that `"Liton"`, `"lit"`, `"liron"`, and other bazaar misspellings match accurately.
4. **Offline Persistence & Tab Syncing:**
   Firestore persistence is enabled with `synchronizeTabs: true`. If multiple tabs are open on the same store computer, any update made in Tab A will immediately trigger reactive updates in Tab B via Firestore's internal indexedDB multi-tab broadcast channel.
5. **Print Styles for Thermal vs. A4 Invoices:**
   In `src/index.css` and `src/components/invoices/InvoicePreviewModal.jsx`, print styles use `@media print` with explicit `!important` overrides (`print:!bg-white print:!m-0 print:!p-0 print:!w-full`). When printing an invoice, the modal dynamically sets `document.title = invoice.number` so that the default saved PDF filename matches the invoice number perfectly.
6. **HeroUI Dialog Parity (`window.appConfirm` & `window.appPrompt`):**
   To maintain backward compatibility with legacy code while utilizing modern HeroUI modals, `DialogContext` binds `window.appConfirm` and `window.appPrompt` directly to the browser window. They return native JavaScript Promises that resolve when the user clicks Confirm or Cancel.
7. **EmailJS Free-Tier Quota Awareness:**
   EmailJS has a monthly delivery allowance. Daily summaries are only sent to active subscribers (`alertDaily: true`). If a recipient disables daily alerts in the Settings hub, the serverless cron script skips them, conserving monthly email quotas.
8. **Thursday Store Off-Day Logic in Cron:**
   If you test the GitHub Actions cron manually on a Thursday, do not be alarmed if no email arrives! If Thursday sales are zero, the runner intentionally skips dispatch because the shop was closed. To test on a Thursday, temporarily log a test sale of ৳100.

---

9. **Cloudflare Worker is publicly triggerable:**
   `scripts/cloudflare_cron_trigger.js` dispatches the email workflow on any HTTP request to `/` or `/trigger`, not only on the cron schedule. Its token lookup also falls back to `Object.values(env)[0]`. Left as-is for now.
10. **Repo and site are public:**
   GitHub Pages serves the whole repo root, so any committed file (including this one) is readable at `https://pmcwork.github.io/<file>`. Never commit passwords, tokens or personal email addresses.

---

*This document serves as the permanent, single source of truth for the PM Computers Management System. All future architecture enhancements and schema modifications must be updated here.*
