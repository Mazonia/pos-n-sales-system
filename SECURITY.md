# Security Policy

## Supported Versions

We actively maintain and provide security patches for the following versions of **Akwaaba POS & Retail OS**:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Security Vulnerability or Bug

The developer (**Mazonia**) takes software security, financial arithmetic accuracy, and merchant data protection seriously.

> [!IMPORTANT]
> **No Developer Emails Currently Assigned**: Because there are no developer emails assigned for this project, all vulnerability disclosures, technical complaints, and bug reports must be submitted through our official GitHub repository issue tracker:
> 
> 👉 **[Submit Report on GitHub Issues](https://github.com/Mazonia/pos-n-sales-system/issues)**

When filing a security or audit inquiry:
1. Provide a detailed summary of the vulnerability.
2. Outline exact reproduction steps or proof-of-concept scripts.
3. State the operational impact (e.g. cart manipulation, till discrepancy, or session exposure).
4. Do NOT disclose active merchant database credentials or production customer personal information.

---

## Security Architecture & Merchant Protection

Akwaaba POS implements enterprise-grade cybersecurity controls across all operating systems:

### 1. Zero Plaintext Credentials in Storage
- In accordance with enterprise standards, user PINs, passwords, and password hashes are automatically stripped before user sessions are committed to browser `localStorage` or session cache (`sanitizeUserForStorage`).
- Passwords enforce strict enterprise complexity: minimum 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one special symbol.

### 2. Electron Desktop IPC Hardening
- Windows and macOS desktop packages run with `nodeIntegration: false` and `contextIsolation: true`.
- Native window handlers enforce strict protocol validation (`http:` and `https:` only) to prevent malicious protocol execution or command injection.

### 3. Anti-Tampering & Disaster Recovery Hashing
- Enterprise database exports (`.akwaaba.json`) compute an authenticating SHA-256 integrity digest via the Web Crypto API.
- Restorations compare file contents against the recorded digest to reject corrupted or modified files.
- Restorations require Manager or Super Admin PIN authorization.

### 4. Non-Repudiation Audit Trails
- Price overrides, stock spoilage write-offs, safe drops, and till closures generate immutable audit records in IndexedDB with operator timestamps and workstation IDs.

---

## Developer Non-Liability & Merchant Responsibility

Merchants acknowledge that software is engineered on an "as-is" basis. Business owners maintain sole custody for:
- Physical cash register counts, cash security, and bank deposits.
- Verifying Mobile Money (MTN, Telecel, AT) transaction IDs on official SIM handsets prior to goods handover.
- Keeping 4-digit and 6-digit Supervisor, Manager, and Admin PINs confidential.
- Statutory compliance with the Value Added Tax Act, 2013 (Act 870) and Ghana Revenue Authority (GRA) regulations.

The developer is not liable for cash shortages, freezer defrost losses resulting from Dumsor (power cuts), or third-party printer hardware failures.

---

## Author & Engineering

Engineered and maintained by **Mazonia**.
