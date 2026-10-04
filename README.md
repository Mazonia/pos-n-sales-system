# 🇬🇭 Akwaaba POS & Retail OS
### *Next-Generation Offline-First Ghanaian Retail Operating System*
**Engineered & Developed by Mazonia**

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg)](https://vitejs.dev)
[![Windows](https://img.shields.io/badge/Windows-.exe-0078D6.svg?logo=windows)](PLATFORMS.md#-1-windows-desktop-exe)
[![macOS](https://img.shields.io/badge/macOS-.dmg-000000.svg?logo=apple)](PLATFORMS.md#-2-macos-desktop-dmg)
[![Android](https://img.shields.io/badge/Android-Tablet%20APK-3DDC84.svg?logo=android)](PLATFORMS.md#-3-android-tablet-apk)
[![iPadOS](https://img.shields.io/badge/iPadOS-Tablet-999999.svg?logo=apple)](PLATFORMS.md#-4-apple-ipad-ipados)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-orange.svg)](https://web.dev/progressive-web-apps/)
[![GRA VSDC](https://img.shields.io/badge/GRA%20VSDC-Compliant-008285.svg)](#-gra-vsdc-compliance--ghana-tax-engine)
[![Dumsor Resilient](https://img.shields.io/badge/Dumsor-Resilient-FF4500.svg)](#-dumsor-power-outage-resilience--cold-store-spoilage)

---

## 📥 Direct Downloads (No Releases Page Visit Required)

Download official binaries directly from this README or visit the [GitHub Releases Hub](https://github.com/Mazonia/pos-n-sales-system/releases/tag/v1.0.0):

| Platform | Installer Type | Direct Download Link | Target Devices |
|---|---|---|---|
| 🪟 **Windows Desktop** | NSIS Setup (`.exe`) | [⬇️ **Download Windows Installer (111 MB)**](https://github.com/Mazonia/pos-n-sales-system/releases/download/v1.0.0/Akwaaba.POS.Retail.OS.Setup.1.0.0.exe) | Windows 10, 11 (64-bit PC Counter Tills) |
| 🪟 **Windows Desktop** | Portable (`.exe`) | [⬇️ **Download Windows Portable (111 MB)**](https://github.com/Mazonia/pos-n-sales-system/releases/download/v1.0.0/Akwaaba.POS.Retail.OS.1.0.0.exe) | Flash Drive / Zero-Install Counter Stations |
| 🍎 **macOS Desktop** | Universal (`.dmg`) | [⬇️ **View macOS Universal Release**](https://github.com/Mazonia/pos-n-sales-system/releases/tag/v1.0.0) | Apple Silicon (M1-M4) & Intel Macs |
| 🤖 **Android Tablet** | Standalone (`.apk`) | [⬇️ **Download Android APK Package**](https://github.com/Mazonia/pos-n-sales-system/releases/tag/v1.0.0) | Android Tablets 10"-12" (Swivel Countertop Stands) |
| 🌐 **Web PWA** | Instant Launch | [🚀 **Launch Web Version Immediately**](https://mazonia.github.io/pos-n-sales-system/) | Any Modern Browser (Chrome, Safari, Edge, Firefox) |

> 💡 **Tip**: Windows users can simply click **Download Windows Installer** above to get the full executable setup directly into their Downloads folder.

---

## 🌟 Overview

**Akwaaba POS & Retail OS** is an enterprise-grade, offline-first Point of Sale and retail management operating system engineered specifically for the dynamic retail ecosystem of Ghana—from bustling open-air commerce in Makola, Kejetia, and Adum to supermarkets, pharmacies, cold stores, and multi-branch retail chains across Accra, Kumasi, and Takoradi.

Unlike generic Western POS software, Akwaaba OS is purpose-built to solve the physical constraints of African retail: intermittent grid power (*Dumsor*), erratic cellular internet, multi-tier VAT and levy structures (GRA VSDC), high-frequency Mobile Money (MoMo) payments, bulk-to-retail fractional breakdown (e.g., deconstructing 50kg rice sacks into *olonkas*), and first-in first-out (FIFO) perishable spoilage tracking.

---

## 🚀 Key Capabilities & Modules

### 🇬🇭 GRA VSDC Compliance & Ghana Tax Engine
- **Full Statutory Calculations**: Real-time computation of VAT Standard Rate (15%), NHIL (2.5%), GETFund (2.5%), COVID-19 Health Recovery Levy (1%), and 3% VAT Flat Rate Scheme (VFRS).
- **Cryptographic Fiscal Signature**: Offline mock generation and online sync of GRA VSDC (Virtual Sales Data Controller) QR codes and fiscal audit signatures printed directly on thermal receipts.
- **Official Print Portals**: Pixel-perfect printable documents for Thermal 80mm receipts, 58mm compact rolls, A4 Purchase Orders, Inter-Branch Waybills, and Spoilage Certificates.

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

### 🔄 Multi-Orientation Tablet & Screen Scaling Support
- **Full Sensor Screen Rotation**: Configured for Android tablets and iPads to freely rotate between landscape, portrait, reverse-landscape, and reverse-portrait for swivel counter stands.
- **Ergonomic Tablet Navigation Bar**: Centered touch dock with quick tools drawer and haptic tactile feedback.

### 🔔 Custom Audio & Notification Engine (Zero Browser Alerts)
- **Zero Browser Native Alerts**: All native `alert()`, `confirm()`, and `prompt()` dialogs are replaced with animated custom modals and toast stacks.
- **Web Audio Synthesizer**: Pure Web Audio API tone synthesis for transaction chimes, cash drawer sounds, and warnings with zero external MP3 dependencies.
- **Granular User Preferences**: Cashiers and managers can customize audio, vibration, and channels (Sales, Inventory, Shifts, Security, Downtime).

---

## 🛠️ Installation Wizard & Legal Terms

On initial startup, Akwaaba POS runs an interactive **Onboarding Wizard**:
1. **Store Identity**: Business name, branch workstation assignment, and GRA Tax Scheme.
2. **Hardware Configuration (Optional / Skip to defaults)**: 80mm vs 58mm paper width, USB scanner gun vs camera, ESC/POS vs Bluetooth printer.
3. **Statutory Legal Agreement & Developer Liability Disclaimer**:
   - **Developer Non-Liability Disclaimer**:
     - *(a)* Physical cash shortages, staff theft, or unverified till reconciliation discrepancies;
     - *(b)* Perishable food spoilage, freezer defrosting, or inventory decay resulting from electrical power outages (Dumsor) or backup generator downtime;
     - *(c)* Third-party hardware malfunctions, ESC/POS printhead defects, thermal paper jams, or local Bluetooth drops;
     - *(d)* Erroneous price overrides, manual discount errors, or mistaken cost values entered by cashiers or branch operators;
     - *(e)* Tax penalties, surcharge assessments, or audit fines issued by the Ghana Revenue Authority (GRA) resulting from merchant tax misclassification.
   - **Merchant Sole Custody**:
     - *(a)* Physical cash counts, drawer denomination auditing, safe deposits, and bank deposits;
     - *(b)* Verifying Mobile Money (MTN, Telecel, AT) transaction IDs and balances on physical SIM handsets prior to dispensing merchandise;
     - *(c)* Confidentiality of Supervisor, Manager, and Administrator 4-digit and 6-digit PIN codes;
     - *(d)* Creating frequent database backups (.akwaaba.json snapshots) via the Disaster Recovery center;
     - *(e)* Maintaining statutory compliance with the Value Added Tax Act, 2013 (Act 870).
4. **Opening Cash Float**: Initial float entered or deferred until cashier shift opening.

---

## 💾 Enterprise Backup & Disaster Recovery

- **Rolling Local Auto-Backups**: Automatically captures encrypted state snapshots upon shift closures, safe drops, and Z-Reports.
- **Manual Full Export**: Generates `.akwaaba.json` backup archives containing products, inventory, customers, shifts, audit logs, and offline queues.
- **Tamper-Evident SHA-256 Digest**: Validates backup data integrity with Web Crypto SHA-256 prior to restoration.
- **PIN-Protected Restore**: Requires Manager or Super Admin PIN verification.

---

## 🌐 Feature Showcase Website

Akwaaba POS includes an interactive showcase web view (`ProductLandingPage`) where prospective merchants and evaluators can explore:
- Comprehensive overview of all core retail challenges solved.
- Live simulated POS terminal interface.
- Binary download links for all supported platforms.
- Accessible directly from the User Menu or at `#showcase`.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Core Framework** | [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| **Build Tooling** | [Vite 8](https://vitejs.dev/) with Rolldown bundling & HMR |
| **Offline Persistence** | [Dexie.js](https://dexie.org/) (IndexedDB wrapper) with background sync queue |
| **Styling & Design System** | Tailwind CSS v4 with custom African luxury retail palette (`#121316`, `#1A1C22`, `#282B34`, `#FF4500`, `#00CED1`, `#EBEEF2`) |
| **Desktop Runtime** | Electron 44 + electron-builder with hardened IPC |
| **Mobile Runtime** | Capacitor 8 (Android & iOS) with full-sensor orientation |
| **PWA & Service Worker** | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + [Workbox](https://developer.chrome.com/docs/workbox/) |
| **Audio Engine** | Web Audio API Synthesizer (Zero MP3 dependencies) |

---

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/Mazonia/pos-n-sales-system.git
cd pos-n-sales-system

# Install dependencies
npm install

# Run automated system audit (24 tests)
npm test

# Run development server
npm run dev

# Run production build
npm run build
```

---

## 📬 Support & Issue Complaints

Because there are currently no developer email addresses assigned for this project, all bug reports, technical inquiries, and user complaints must be filed directly through GitHub Issues:

👉 **[Submit Complaint / Issue on GitHub](https://github.com/Mazonia/pos-n-sales-system/issues)**

---

## 👨‍💻 Author & Engineering

Engineered with Ghanaian hospitality and precision by **Mazonia**.

---

## 📄 License & Legal Notice

Akwaaba POS & Retail OS is released under the [MIT License](LICENSE).

Copyright © 2026 **Mazonia**. All rights reserved.
