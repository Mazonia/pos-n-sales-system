# 🇬🇭 Akwaaba POS & Retail OS
### *Next-Generation Offline-First Ghanaian Retail Operating System*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg)](https://vitejs.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-orange.svg)](https://web.dev/progressive-web-apps/)
[![GRA VSDC](https://img.shields.io/badge/GRA%20VSDC-Compliant-008285.svg)](#-gra-vsdc-compliance--ghana-tax-engine)
[![Dumsor Resilient](https://img.shields.io/badge/Dumsor-Resilient-FF4500.svg)](#-dumsor-power-outage-resilience--cold-store-spoilage)

---

## 🌟 Overview

**Akwaaba POS & Retail OS** is an enterprise-grade, offline-first Point of Sale and retail management operating system engineered specifically for the dynamic retail ecosystem of Ghana—from bustling open-air commerce in Makola and Adum to supermarkets, pharmacies, cold stores, and multi-branch retail chains across Accra, Kumasi, and Takoradi.

Unlike generic Western POS software, Akwaaba OS is purpose-built to solve the physical constraints of African retail: intermittent grid power (*Dumsor*), erratic cellular internet, multi-tier VAT and levy structures (GRA VSDC), high-frequency Mobile Money (MoMo) payments, bulk-to-retail fractional breakdown (e.g., deconstructing 50kg rice sacks into *olonkas*), and first-in first-out (FIFO) perishable spoilage tracking.

---

## 🚀 Key Features

### 🇬🇭 GRA VSDC Compliance & Ghana Tax Engine
- **Full Statutory Calculations**: Real-time computation of VAT Standard Rate (15%), NHIL (2.5%), GETFund (2.5%), COVID-19 Health Recovery Levy (1%), and 3% VAT Flat Rate Scheme.
- **Cryptographic Fiscal Signature**: Offline mock generation and online sync of GRA VSDC (Virtual Sales Data Controller) QR codes and fiscal audit signatures printed directly on thermal receipts.
- **Official Print Portals**: Pixel-perfect printable documents for Thermal 80mm receipts, A4 Purchase Orders, Inter-Branch Waybills, and Spoilage Certificates.

### ⚡ Dumsor Power-Outage Resilience & Cold-Store Spoilage
- **Local-First IndexedDB Engine**: Powered by Dexie.js; transactions, cash registers, cart states, and stock levels persist seamlessly even if power drops instantly.
- **Cold-Store Defrost Tracking**: Dedicated module to authorize and log spoilage resulting from generator outages and freezer failures with supervisor sign-offs.
- **Tax-Deductible Spoilage Certificates**: Export certified spoilage loss certificates recognized by Ghana Revenue Authority (GRA) for inventory write-offs.

### 📱 Unified Ghanaian Payment Architecture
- **Cash Drawer Reconciliation**: Complete float management, pay-ins, safe drops, and denomination counting (GH₵ 200, 100, 50, 20, 10, 5, 2, 1 notes and Pesewa coins).
- **Mobile Money Integration**: Native interfaces for MTN Mobile Money, Telecel Cash, and AT Money with transaction reference validation and USSD fallback prompts.
- **Bisa Debt Ledger (Store Credit)**: Comprehensive customer credit tracking with overdue aging alerts, repayment logging, and SMS notification reminders.

### 📦 FIFO Expiry Sentinel & UOM Fractional Breakdown
- **First-In First-Out (FIFO) Rotation**: Automated color-coded tracking of batches (<30 days critical, <90 days clearance, >90 days stable) with one-click -30% clearance markdown actions.
- **Unit of Measure (UOM) Breakdown Engine**: Deconstruct bulk wholesale sacks (e.g. Royal Feast 50kg Rice) into fractional loose consumer portions (*olonka*, single kg, cup) with atomic stock deduction and audit logging.
- **Multi-Branch Warehousing & Transfers**: Dispatch and verify cargo manifests between Accra Hub, Kumasi Adum, and Takoradi Harbour with official waybill manifests.

### 🔔 Safety Stock & Automated Replenishment
- **Safety Stock Sentinel**: Dynamic notifications when inventory dips below minimum safety thresholds.
- **One-Click PO Generation**: Auto-populate Purchase Orders for all deficit items and export official vouchers for suppliers.

### 🔒 Enterprise Role-Based Access Control (RBAC) & Audit Trails
- **Granular Roles**: Cashier, Supervisor, Inventory Officer, Branch Manager, General Manager, and Super Admin.
- **Immutable Audit Logging**: Every price override, stock write-off, refund, safe drop, and till closure is immutably timestamped and attributed.
- **Fast 4-Digit PIN Switching**: Swift cashier handover without full session re-authentication.

### 🎨 Fluid Ink-Spreading Theme Animation
- **Physical Ink-Spread Effect**: Circular expanding canvas clip-path animation radiating outwards from the theme toggle switch across the page corners.

### ⌨️ Cashier Shortcut Protection
- **Modifier-Protected Hotkeys**: High-speed keyboard operation (`Ctrl+K` for Product Search, `Alt+W` for Wholesale mode, `F4` for Hold/Recall, `Space` for Quick Pay) designed to prevent accidental interruption during barcode scanner input.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Core Framework** | [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| **Build Tooling** | [Vite 8](https://vitejs.dev/) with Rolldown bundling & HMR |
| **Offline Persistence** | [Dexie.js](https://dexie.org/) (IndexedDB wrapper) with background sync queue |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) with custom Ghanaian luxury retail palette |
| **PWA & Service Worker** | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + [Workbox](https://developer.chrome.com/docs/workbox/) |
| **Icons & Typography** | [Lucide React](https://lucide.dev/), serif & mono tabular numerals |
| **Printing System** | React Portals with CSS print stylesheets for 80mm POS & A4 Documents |

---

## 📁 Repository Structure

```
akwaaba-pos-&-retail-os/
├── public/                 # Static assets, PWA icons, web manifest
├── src/
│   ├── components/
│   │   ├── audit/          # System audit log & activity monitors
│   │   ├── barcode/        # Barcode printing & label studio
│   │   ├── common/         # OfficialPrintPortal & modal wrappers
│   │   ├── debt/           # Bisa Customer Credit & Debt Book
│   │   ├── inventory/      # Stock levels, FIFO, UOM breakdown, Transfers, Dumsor
│   │   ├── notifications/  # Stock safety notifications & alert banners
│   │   ├── orders/         # Completed orders, fiscal receipts & refunds
│   │   ├── pos/            # POS Terminal, Cart, Product Cards, Keypad
│   │   ├── reports/        # Executive analytics, X/Z-Reports, GRA tax reports
│   │   └── shift/          # Till management, Cash drops, Z-Report closing
│   ├── utils/
│   │   ├── dexieSync.ts    # IndexedDB schema, models & offline order engine
│   │   ├── emojiSanitizer.ts # Strict text sanitizer for thermal printers
│   │   ├── ghanaTaxEngine.ts # GRA VSDC calculation formulas & GHS formatting
│   │   ├── posAudio.ts     # Sound effects for barcode scans, cash drawer & alerts
│   │   └── themeTransition.ts # Liquid ink-spreading view transition animation
│   ├── App.tsx             # Root application shell & routing
│   ├── index.css           # Global design tokens, print CSS & view transitions
│   └── main.tsx            # Application entry point & PWA registration
├── CODE_OF_CONDUCT.md      # Contributor Covenant with Ghanaian hospitality
├── CONTRIBUTING.md         # Contribution guidelines & PR checklist
├── LICENSE                 # MIT License
├── package.json            # Scripts & project dependencies
├── SECURITY.md             # Security disclosure policy & standards
├── tsconfig.json           # Strict TypeScript configuration
└── vite.config.ts          # Vite build configuration & PWA manifest
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **Package Manager**: `npm`, `pnpm`, or `bun`

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Mazonia/pos-n-sales-system.git
cd pos-n-sales-system

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
VITE_APP_TITLE="Akwaaba POS & Retail OS"
VITE_DEFAULT_BRANCH="Accra Central Mall Store"
VITE_GRA_TIN="C0029482190"
VITE_ENABLE_VSDC_MOCK=true
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000/pos-n-sales-system/` to access the terminal.

### 5. Production Build
```bash
npm run build
npm run preview
```

---

## 🖨️ Thermal Printer & Hardware Integration

Akwaaba POS supports standard ESC/POS 80mm thermal receipt printers via browser print APIs and raw serial ports:
- **Receipt Dimensions**: Optimized for standard 80mm (576 dots) continuous thermal rolls.
- **Emoji Sanitization**: Built-in `stripEmojis` filter automatically strips unsupported Unicode symbols before outputting to legacy thermal printheads, preventing garbled output.
- **Barcode Scanners**: Operates plug-and-play with any USB or Bluetooth HID barcode scanner emitting standard Enter key termination.

---

## 🤝 Contributing

We welcome contributions from developers across Ghana and the global open-source community! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 🔒 Security

For security vulnerabilities or sensitive disclosures regarding payment processing or offline transaction integrity, please consult our [Security Policy](SECURITY.md).

---

## 📄 License

Akwaaba POS & Retail OS is released under the [MIT License](LICENSE).

Copyright © 2026 Akwaaba Retail OS Contributors.
