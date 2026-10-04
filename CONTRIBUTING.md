# Contributing to Akwaaba POS & Retail OS 🇬🇭

First off, thank you for considering contributing to **Akwaaba POS & Retail OS**! Open-source contributions from engineers, retail managers, and merchants make this software robust, practical, and resilient across Ghana and the broader African retail ecosystem.

This project is created and maintained by **Mazonia**.

---

## 🧭 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all community members with respect, kindness, and professional dignity.

---

## 🛠️ Development Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm`
- **Git**

### 2. Clone & Install
```bash
git clone https://github.com/Mazonia/pos-n-sales-system.git
cd pos-n-sales-system
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000/pos-n-sales-system/`.

---

## 🌿 Branching Strategy & Workflow

1. Always branch off `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. Meaningful commit messages:
   - `feat(inventory): add batch FIFO expiry markdown button`
   - `fix(theme): smooth ink-spreading view transition radius`
   - `docs(readme): add GRA VSDC compliance overview`

3. Keep Pull Requests focused on a single topic. Avoid bundling unrelated refactors with bug fixes.

---

## 📐 Engineering Guidelines

### 1. Offline-First Database Integrity
- Akwaaba POS is strictly offline-first. All transaction and inventory states must write to **IndexedDB via Dexie** (`src/utils/dexieSync.ts`).
- Any state-altering action (order creation, price markdown, stock write-off, transfer dispatch, cash drop) **must log an entry to `db.auditLogs`**.
- Wrap multi-table operations in `db.transaction('rw', ...)` to prevent partial commits during sudden power cuts (*Dumsor*).

### 2. Ghanaian Tax & Fiscal Calculations
- All monetary math must route through `src/utils/ghanaTaxEngine.ts`.
- Rounding: Always round financial numbers to **2 decimal places (Pesewas)** (`roundToPesewas(amount)`).
- Use `formatGhs(amount)` for user-facing currency display. Never hardcode currency symbols or assumptions.

### 3. Thermal Printer Compatibility
- All printable receipts and vouchers must sanitize Unicode emojis using `stripEmojis()` from `src/utils/emojiSanitizer.ts`. Legacy 80mm ESC/POS printers crash or print garbage characters when receiving 4-byte UTF-8 emojis.
- Maintain dedicated `@media print` rules in `src/index.css` and use `<OfficialPrintPortal>` for all printable documents.

### 4. Zero Browser Native Alerts
- Never invoke browser `alert()`, `confirm()`, or `prompt()`.
- Use the custom notification engine: `notify.success()`, `notify.error()`, `notify.warning()`, or the custom confirmation modal in `UniversalToastContainer`.

### 5. Keyboard Shortcuts Safety
- Never register naked single-letter shortcuts (e.g. `w`, `h`, `s`) on window listeners without modifier keys.
- Barcode scanners emit rapid character sequences followed by an `Enter` key. Naked shortcuts will intercept barcode numbers. Use `Ctrl+K`, `Alt+W`, `F4`, or function keys instead.

---

## ✅ Pre-Submission Verification

Before submitting a Pull Request, verify that all local audits pass:

```bash
# 1. Typecheck the codebase (0 errors required)
npm run lint

# 2. Run the automated system audit & tax test suite (24 tests)
npm test

# 3. Build the production bundle and PWA service worker
npm run build
```

- [ ] All new components support both **Light Mode** and **Dark Mode** seamlessly using project color tokens (`#121316`, `#1A1C22`, `#282B34`, `#FF4500`, `#00CED1`, `#F4F4F6`, `#EBEEF2`).
- [ ] No regression in keyboard navigation or screen readability.
- [ ] No hardcoded personal API keys or sensitive merchant data.
- [ ] Mobile/tablet responsive layout verified in both portrait and landscape orientations.

---

## 📬 Questions & Complaints

Because there are currently no developer email addresses assigned for this project, all discussions, technical questions, and bug reports must be submitted through our GitHub Issues page:

👉 **[Submit Issue on GitHub](https://github.com/Mazonia/pos-n-sales-system/issues)**

Medaase (thank you) for making Ghanaian retail software better!
