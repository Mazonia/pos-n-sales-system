# Contributing to Akwaaba POS & Retail OS 🇬🇭

First off, thank you for considering contributing to **Akwaaba POS & Retail OS**! Open-source contributions from engineers, retail managers, and merchants are what make this software robust, practical, and resilient in African commerce.

---

## 🧭 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all community members with respect, kindness, and professional dignity.

---

## 🛠️ Development Setup

### 1. Prerequisites
- **Node.js**: `v18.x` or higher (Node 20+ recommended)
- **Package Manager**: `npm` (or `bun` / `pnpm`)
- **Git**

### 2. Fork & Clone
```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/pos-n-sales-system.git
cd pos-n-sales-system

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The application runs locally at `http://localhost:3000/pos-n-sales-system/`.

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
- Rounding: Always round financial numbers to **2 decimal places** (`Math.round(val * 100) / 100`).
- Use `formatGhs(amount)` for user-facing currency display. Never hardcode currency symbols or assumptions.

### 3. Thermal Printer Compatibility
- All printable receipts and vouchers must sanitize Unicode emojis using `stripEmojis()` from `src/utils/emojiSanitizer.ts`. Legacy 80mm ESC/POS printers crash or print garbage characters when receiving 4-byte UTF-8 emojis.
- Maintain dedicated `@media print` rules in `src/index.css` and use `<OfficialPrintPortal>` for all printable documents.

### 4. Keyboard Shortcuts Safety
- Never register naked single-letter shortcuts (e.g. `w`, `h`, `s`) on window listeners without modifier keys.
- Barcode scanners emit rapid character sequences followed by an `Enter` key. Naked shortcuts will intercept barcode numbers (e.g., scanning a barcode containing the letter 'w' could inadvertently toggle wholesale mode).
- Use `Ctrl+K`, `Alt+W`, `F4`, or function keys instead.

---

## ✅ Pre-Submission Checklist

Before opening a Pull Request, verify that all local checks pass:

```bash
# 1. Typecheck the codebase
npm run lint

# 2. Build the production bundle and PWA service worker
npm run build
```

- [ ] All new components support both **Light Mode** and **Dark Mode** seamlessly.
- [ ] No regression in keyboard navigation or screen readability.
- [ ] No hardcoded personal API keys or sensitive merchant data.
- [ ] Mobile responsive layout verified (phone, tablet, desktop).

---

## 📬 Need Help?

Feel free to open an Issue on GitHub for discussions, feature requests, or architecture proposals. Medaase (thank you) for making Ghanaian retail software better!
