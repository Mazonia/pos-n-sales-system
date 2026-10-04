/**
 * Akwaaba POS & Retail OS - Automated Whitebox Security, Tax & Integrity Test Suite
 * Author: Mazonia
 */

import { calculateTaxExclusive, extractTaxFromInclusive, roundToPesewas } from '../src/utils/ghanaTaxEngine';
import { validatePasswordStrength, sanitizeUserForStorage, hashCredential } from '../src/utils/security';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('AKWAABA POS & RETAIL OS - AUTOMATED SYSTEM AUDIT');
  console.log('Engineered & Maintained by Mazonia');
  console.log('======================================================\n');

  // --- 1. GHANA TAX ENGINE AUDIT ---
  console.log('--- 1. Ghana Tax Engine Validation (GRA VSDC Compliance) ---');
  {
    // Test Standard Scheme (21.9% combined)
    const stdTax = calculateTaxExclusive(100, 'STANDARD_VAT');
    assert(stdTax.taxableBase === 100, 'Standard Scheme Taxable Base calculation');
    assert(stdTax.nhil === 2.5, 'NHIL levy @ 2.5%');
    assert(stdTax.getfund === 2.5, 'GETFund levy @ 2.5%');
    assert(stdTax.covid === 1.0, 'COVID-19 Health Recovery levy @ 1.0%');
    // VAT is 15% on (100 + 2.5 + 2.5 + 1.0) = 15% of 106 = 15.90
    assert(stdTax.vat === 15.9, 'Standard VAT @ 15% on compounded base');
    assert(stdTax.totalTax === 21.9, 'Total compound tax equals 21.90 GHS');
    assert(stdTax.grossTotal === 121.9, 'Gross total equals 121.90 GHS');

    // Test Flat Rate Scheme (4.0% combined)
    const flatTax = calculateTaxExclusive(100, 'FLAT_RATE_VFRS');
    assert(flatTax.taxableBase === 100, 'Flat Scheme Taxable Base calculation');
    assert(flatTax.covid === 1.0, 'Flat COVID levy @ 1.0%');
    assert(flatTax.vat === 3.0, 'Flat VAT @ 3.0%');
    assert(flatTax.totalTax === 4.0, 'Flat Total Tax equals 4.00 GHS');
    assert(flatTax.grossTotal === 104.0, 'Flat Grand Total equals 104.00 GHS');

    // Test Tax Extraction from Gross Price
    const extracted = extractTaxFromInclusive(121.9, 'STANDARD_VAT');
    assert(Math.abs(extracted.taxableBase - 100) < 0.05, 'Accurate reverse extraction of net base from gross');
  }

  // --- 2. CYBERSECURITY & ACCESS CONTROL AUDIT ---
  console.log('\n--- 2. Cybersecurity & Access Control Audit (Whitebox) ---');
  {
    // Test Password Strength Validation
    const weakPass = validatePasswordStrength('admin');
    assert(!weakPass.isValid, 'Reject trivial/short password');

    const noSpecial = validatePasswordStrength('Password1234');
    assert(!noSpecial.isValid, 'Reject password without special characters');

    const strongPass = validatePasswordStrength('Akwaaba@2026!');
    assert(strongPass.isValid && strongPass.score === 4, 'Accept compliant enterprise password (min 8 chars, Aa1@)');

    // Test User Credential Sanitization
    const sensitiveUser = {
      id: 'usr-001',
      fullName: 'Kofi Mensah',
      role: 'CASHIER',
      pin: '123456',
      password: 'PlainSecretPassword!',
      passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };
    const sanitized = sanitizeUserForStorage(sensitiveUser);
    assert(sanitized.pin === undefined, 'PIN stripped from storage object');
    assert(sanitized.password === undefined, 'Password stripped from storage object');
    assert(sanitized.passwordHash === undefined, 'Password hash stripped from storage object');
    assert(sanitized.fullName === 'Kofi Mensah', 'Non-sensitive user fields preserved');

    // Test Credential Hashing
    const hash1 = await hashCredential('123456');
    const hash2 = await hashCredential('123456');
    const hashOther = await hashCredential('654321');
    assert(hash1.length > 0 && hash1 === hash2, 'Hash is deterministic for identical input and enterprise salt');
    assert(hash1 !== hashOther, 'Hash differentiates distinct inputs');
  }

  // --- 3. PLATFORM & ENTERPRISE ATTRIBUTION AUDIT ---
  console.log('\n--- 3. Platform Configuration & Attribution Audit ---');
  {
    const pkg = await import('../package.json', { with: { type: 'json' } });
    assert(pkg.default.author === 'Mazonia', 'Author in package.json is attributed to "Mazonia"');
    assert(pkg.default.main === 'electron/main.cjs', 'Main entry point points to hardened Electron process');
  }

  console.log('\n======================================================');
  console.log(`AUDIT RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
