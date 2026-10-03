# Security Policy

## Supported Versions

We actively maintain and provide security patches for the following versions of **Akwaaba POS & Retail OS**:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

The Akwaaba POS & Retail OS team takes software security and merchant trust seriously. If you discover a security vulnerability—especially concerning financial calculations, cryptographic GRA signatures, customer data, or offline IndexedDB manipulation—please report it responsibly through private channels.

### How to Report:
1. **Do NOT open a public GitHub issue** describing the security vulnerability.
2. Email the maintainers directly at:
   📧 **security@akwaaba-os.org**
3. Include the following details in your report:
   - A clear description of the vulnerability.
   - Exact steps or script to reproduce the issue.
   - Potential impact on merchant operations, till balances, or consumer privacy.
   - Any suggested remediations or mitigations.

### Response Timeline:
- **Initial Response**: Within 48 hours of receipt.
- **Triage & Assessment**: Within 5 business days.
- **Remediation & Patch**: A fix will be developed, tested against offline IndexedDB edge cases, and deployed via a coordinated security advisory.

---

## Security Principles & Merchant Protection

When deploying Akwaaba POS in physical storefronts, merchants and administrators must adhere to the following baseline security practices:

### 1. Terminal Locking & PIN Confidentiality
- Every cashier is assigned a distinct 4-digit numeric PIN.
- Never share manager or supervisor PINs with frontline cashiers.
- Configure terminal inactivity timeouts to prevent unauthorized walk-up transactions when a till is left unattended.

### 2. Physical & Local Storage Safety
- IndexedDB stores local transaction queues, customer contact numbers, and offline sales ledgers.
- Terminals must be deployed on password-protected operating system accounts.
- In shared cybercafé or multi-user environments, always clear browser application cache when retiring hardware.

### 3. Payment Card & Mobile Money Data Hygiene
- **Never store or print raw customer payment card CVV or full PANs** on thermal receipts. Receipts must only reflect the last 4 digits of card numbers and mobile network transaction references.
- Mobile Money transaction references received via SMS should always be verified against the merchant till drawer balance or operator USSD notification before goods release.

### 4. Fiscal Audit Trail Protection
- All stock adjustments, spoilage write-offs, discount overrides, and till reconciliations are permanently committed to the immutable local audit log (`db.auditLogs`).
- Tampering with local IndexedDB records is detectable during cloud synchronization and end-of-day Z-Report reconciliation.

---

## Attribution & Bounty

We deeply appreciate security researchers and ethical hackers who help safeguard Ghanaian retail merchants. Valid vulnerability reporters will be credited in our release security advisories.
