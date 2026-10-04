# Akwaaba POS & Retail OS — Multi-Platform Architecture & Distribution Guide

> **Single Codebase. Five Target Platforms.**  
> Akwaaba POS & Retail OS is built as a **unified multi-platform system**. You do not need separate repositories or fragmented folders for Windows, Mac, Android, iPad, and Web. Every feature, tax calculation, offline cache, and inventory update is written once and deploys everywhere.

---

## 🚀 Platform Matrix Overview

| Platform | Target Device | Packaging / Binary | Native Hardware Capabilities | Build Command |
| :--- | :--- | :--- | :--- | :--- |
| **Windows Desktop** | Workstation Tills & Laptops | `.exe` (NSIS Installer & Portable) | Raw ESC/POS thermal receipt printing, cash drawer kick, F11 kiosk till lock, barcode scanner feed | `npm run build:win` |
| **macOS Desktop** | Macs & Mac Mini POS | `.dmg` & `.zip` (Universal M-Series & Intel) | Retina display, silent CUPS receipt printing, keyboard checkout accelerators | `npm run build:mac` |
| **Android Tablet** | 10"–12" Android Tablets | `.apk` (Direct Sideload & Play Store) | Tablet camera barcode scanner, portable Bluetooth thermal printers, offline auto-sync | `npm run cap:sync`<br>`npm run cap:android` |
| **Apple iPad** | iPad, iPad Air, iPad Pro | iPadOS App / `.ipa` (Xcode Workspace) | Retina touch POS, iPad Split View multitasking, AirPrint thermal printing | `npm run cap:sync`<br>`npm run cap:ios` |
| **Web & PWA** | Any Browser / ChromeOS | Progressive Web App (PWA) | Zero-install instant access, Service Worker caching, offline IndexedDB | `npm run build` |

---

## 🛠️ Local Building Instructions

### 1. Windows Desktop (`.exe`)
The Windows application is powered by **Electron** and packaged via **electron-builder**.
- **Development**:
  ```bash
  npm run electron:dev
  ```
  Launches the Vite dev server and opens the native Windows Electron window with hot-reloading and DevTools.
- **Production Build**:
  ```bash
  npm run build:win
  ```
  Generates two Windows executables in the `release/` directory:
  1. `AkwaabaPOS-Setup-1.0.0.exe` — Standard installer with desktop shortcut and start menu integration.
  2. `AkwaabaPOS-1.0.0.exe` — Standalone portable `.exe` that runs directly from a USB stick without installation (ideal for offline Ghanaian retail shops).

### 2. macOS Desktop (`.dmg`)
- **Production Build** (Run on macOS or via GitHub Actions):
  ```bash
  npm run build:mac
  ```
  Outputs `AkwaabaPOS-1.0.0.dmg` and `AkwaabaPOS-1.0.0-mac.zip` ready for Apple Silicon and Intel machines.

### 3. Android Tablet (`.apk`)
The Android tablet edition is powered by **Capacitor** with the native project located in `/android`.
- **Sync Web Assets**:
  ```bash
  npm run build
  npm run cap:sync
  ```
- **Open in Android Studio**:
  ```bash
  npm run cap:android
  ```
- **Command Line APK Build** (requires Android SDK):
  ```bash
  cd android
  ./gradlew assembleDebug
  ```
  The generated `.apk` will be at `android/app/build/outputs/apk/debug/app-debug.apk`. You can directly copy this APK to any Android tablet via USB or WhatsApp and install it.

### 4. Apple iPad (`iPadOS`)
The iPad edition is located in `/ios` and configured for iPadOS multitasking and high-resolution Retina display.
- **Sync Web Assets**:
  ```bash
  npm run build
  npm run cap:sync
  ```
- **Open in Xcode**:
  ```bash
  npm run cap:ios
  ```
- Select an iPad simulator or your connected physical iPad in Xcode and press **Run (Cmd+R)**.

### 5. Web App & PWA
- **Development Server**:
  ```bash
  npm run dev
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
  Outputs the optimized static bundle in `dist/`. Can be hosted on GitHub Pages, Cloudflare Pages, Netlify, or any static web host.

---

## 📦 Automated GitHub Releases (Cloud CI/CD)

The repository includes a GitHub Actions workflow: `.github/workflows/release.yml`.

### How It Works:
Whenever you publish a release or push a version tag (e.g. `v1.0.0`) to GitHub:
1. GitHub runners in the cloud automatically compile:
   - `AkwaabaPOS-Setup-1.0.0.exe` (Windows Installer)
   - `AkwaabaPOS-1.0.0.exe` (Windows Portable)
   - `AkwaabaPOS-1.0.0.dmg` (macOS)
   - `AkwaabaPOS-Tablet-Debug.apk` (Android Tablet)
   - `AkwaabaPOS-Web-Build.zip` (Web distribution)
2. All compiled files are automatically attached to the **GitHub Releases** page of your repository (`https://github.com/Mazonia/pos-n-sales-system/releases`).
3. Anyone can click and download their platform of choice with zero setup required!

---

## 🔌 Hardware Interoperability & POS Features

### Thermal Receipt Printing
- **Desktop (Windows/Mac)**: Uses Electron's native print API to send silent print jobs formatted for 80mm and 58mm thermal rolls.
- **Mobile/Tablet**: Uses Bluetooth SPP thermal printers and AirPrint.
- **Web**: Uses browser print dialog with CSS `@media print` rules specifically configured for receipt printers.

### Till Kiosk Mode
- Press **F11** in the Windows/Mac app to toggle POS Kiosk Mode. This locks the till into full-screen and prevents cashiers from switching to unauthorized applications during shifts.

### Offline Dumsor Resilience
All five platforms store products, customers, and pending sales receipts locally in **IndexedDB (via Dexie.js)**. Transactions are cryptographically hashed with SHA-256 and automatically sync to the central server as soon as internet connectivity returns.
