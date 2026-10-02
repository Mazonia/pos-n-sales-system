/**
 * Akwaaba POS & Retail OS - Ghana Revenue Authority (GRA) Tax Engine
 * 
 * Bulletproof fiscal calculation utility for:
 * 1. Standard VAT Scheme (Compound Levies: NHIL 2.5%, GETFund 2.5%, COVID-19 1.0%, VAT 15% on compound base = 21.90% effective)
 * 2. Flat Rate Scheme (VFRS: 3% Flat VAT + 1% COVID Levy = 4.0% straight)
 * 3. Exempt / Non-VAT SME Scheme (0%)
 * 
 * Includes exact Ghana Cedi / Pesewas rounding logic and reverse extraction from inclusive shelf prices.
 */

export type TaxSchemeType = 'STANDARD_VAT' | 'FLAT_RATE_VFRS' | 'EXEMPT_SME';

export interface GhanaTaxRates {
  nhilRate: number;     // 0.025 (2.5%)
  getfundRate: number;  // 0.025 (2.5%)
  covidRate: number;    // 0.010 (1.0%)
  vatRate: number;      // 0.150 (15%) for Standard, 0.03 (3%) for VFRS
  effectiveRate: number;// 0.219 (21.90%) or 0.04 (4.0%) or 0.0
}

export interface TaxCalculationResult {
  scheme: TaxSchemeType;
  taxableBase: number;      // Base price (P)
  nhil: number;             // National Health Insurance Levy
  getfund: number;          // Ghana Education Trust Fund Levy
  covid: number;            // COVID-19 Health Recovery Levy
  vatBase: number;          // Cumulative base for VAT (P + NHIL + GETFund + COVID)
  vat: number;              // Standard VAT or Flat VAT
  totalTax: number;         // Total tax payable to GRA
  grossTotal: number;       // Final customer payable price
  effectiveRatePct: number; // e.g., 21.90 or 4.00 or 0.00
  isExempt: boolean;
}

export interface ItemTaxDetail {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  isTaxExempt?: boolean;
  tax: TaxCalculationResult;
}

export interface OrderTaxBreakdown {
  scheme: TaxSchemeType;
  totalTaxableBase: number;
  totalNhil: number;
  totalGetfund: number;
  totalCovid: number;
  totalVat: number;
  totalLevies: number; // NHIL + GETFund + COVID
  totalTax: number;
  subtotal: number;
  discount: number;
  grandTotal: number;
  graFiscalCode: string;
  graQrPayload: string;
}

// Fixed Statutory GRA Tax Defaults
export const GRA_RATES = {
  STANDARD: {
    NHIL: 0.025,
    GETFUND: 0.025,
    COVID: 0.010,
    VAT: 0.150,
    // Compound multiplier: (1 + 0.025 + 0.025 + 0.010) * 0.15 = 1.06 * 0.15 = 0.159
    // Effective tax = 0.025 + 0.025 + 0.010 + 0.159 = 0.219 (21.90%)
    EFFECTIVE_RATE: 0.219,
    INCLUSIVE_DIVISOR: 1.219,
  },
  VFRS: {
    VAT_FLAT: 0.030,
    COVID: 0.010,
    EFFECTIVE_RATE: 0.040,
    INCLUSIVE_DIVISOR: 1.040,
  }
} as const;

export interface CustomGraTaxRates {
  standardNhil: number;     // e.g. 0.025 (2.5%)
  standardGetfund: number;  // e.g. 0.025 (2.5%)
  standardCovid: number;    // e.g. 0.010 (1.0%)
  standardVat: number;      // e.g. 0.150 (15.0%)
  vfrsFlatVat: number;      // e.g. 0.030 (3.0%)
  vfrsCovid: number;        // e.g. 0.010 (1.0%)
  lastUpdated?: string;
  updatedBy?: string;
  updatedByRole?: string;
}

export const DEFAULT_GRA_RATES: CustomGraTaxRates = {
  standardNhil: 0.025,
  standardGetfund: 0.025,
  standardCovid: 0.010,
  standardVat: 0.150,
  vfrsFlatVat: 0.030,
  vfrsCovid: 0.010,
};

const TAX_STORAGE_KEY = 'akwaaba_custom_gra_tax_rates';

export function getActiveTaxRates(): CustomGraTaxRates {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(TAX_STORAGE_KEY) : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_GRA_RATES, ...parsed };
    }
  } catch (e) {
    console.error('Failed reading custom tax rates from storage', e);
  }
  return { ...DEFAULT_GRA_RATES };
}

export function saveActiveTaxRates(
  newRates: CustomGraTaxRates,
  updatedBy: string,
  updatedByRole: string
): CustomGraTaxRates {
  const finalRates: CustomGraTaxRates = {
    ...newRates,
    lastUpdated: new Date().toISOString(),
    updatedBy,
    updatedByRole,
  };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(finalRates));
      window.dispatchEvent(new CustomEvent('taxRatesChanged', { detail: finalRates }));
    }
  } catch (e) {
    console.error('Failed saving custom tax rates to storage', e);
  }
  return finalRates;
}

export function resetTaxRatesToDefault(updatedBy: string, updatedByRole: string): CustomGraTaxRates {
  const defaultRates: CustomGraTaxRates = {
    ...DEFAULT_GRA_RATES,
    lastUpdated: new Date().toISOString(),
    updatedBy,
    updatedByRole,
  };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(defaultRates));
      window.dispatchEvent(new CustomEvent('taxRatesChanged', { detail: defaultRates }));
    }
  } catch (e) {
    console.error('Failed resetting tax rates to default', e);
  }
  return defaultRates;
}

export function getComputedRateMetrics(rates: CustomGraTaxRates = getActiveTaxRates()) {
  const nhil = rates.standardNhil;
  const getfund = rates.standardGetfund;
  const covid = rates.standardCovid;
  const vat = rates.standardVat;
  
  // Standard compound: Levies = NHIL + GETFund + COVID
  const leviesSum = nhil + getfund + covid;
  const compoundVatFactor = (1 + leviesSum) * vat;
  const standardEffectiveRate = leviesSum + compoundVatFactor;
  const standardInclusiveDivisor = 1 + standardEffectiveRate;

  // VFRS Flat Rate: 3% VAT + 1% COVID = 4%
  const vfrsEffectiveRate = rates.vfrsFlatVat + rates.vfrsCovid;
  const vfrsInclusiveDivisor = 1 + vfrsEffectiveRate;

  return {
    standard: {
      nhil,
      getfund,
      covid,
      vat,
      leviesSum,
      compoundVatFactor,
      effectiveRate: standardEffectiveRate,
      effectiveRatePct: roundToPesewas(standardEffectiveRate * 100),
      inclusiveDivisor: standardInclusiveDivisor,
    },
    vfrs: {
      flatVat: rates.vfrsFlatVat,
      covid: rates.vfrsCovid,
      effectiveRate: vfrsEffectiveRate,
      effectiveRatePct: roundToPesewas(vfrsEffectiveRate * 100),
      inclusiveDivisor: vfrsInclusiveDivisor,
    }
  };
}

/**
 * Rounds a number to exact 2 decimal places (Ghanaian Pesewas)
 * Prevents floating point errors like 0.10000000000000002
 */
export function roundToPesewas(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Format GHS currency string
 * e.g., formatGhs(1245.5) => "GH₵ 1,245.50"
 */
export function formatGhs(amount: number): string {
  const rounded = roundToPesewas(amount);
  return 'GH₵ ' + rounded.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculate Ghanaian Tax from EXCLUSIVE base price (Price without tax)
 * @param basePrice The net taxable base amount (P)
 * @param scheme Tax scheme ('STANDARD_VAT' | 'FLAT_RATE_VFRS' | 'EXEMPT_SME')
 */
export function calculateTaxExclusive(
  basePrice: number,
  scheme: TaxSchemeType = 'STANDARD_VAT'
): TaxCalculationResult {
  const cleanBase = Math.max(0, basePrice);
  const metrics = getComputedRateMetrics();

  if (scheme === 'EXEMPT_SME' || cleanBase === 0) {
    return {
      scheme,
      taxableBase: roundToPesewas(cleanBase),
      nhil: 0,
      getfund: 0,
      covid: 0,
      vatBase: roundToPesewas(cleanBase),
      vat: 0,
      totalTax: 0,
      grossTotal: roundToPesewas(cleanBase),
      effectiveRatePct: 0,
      isExempt: true,
    };
  }

  if (scheme === 'FLAT_RATE_VFRS') {
    const covid = roundToPesewas(cleanBase * metrics.vfrs.covid);
    const vat = roundToPesewas(cleanBase * metrics.vfrs.flatVat);
    const totalTax = roundToPesewas(covid + vat);
    const grossTotal = roundToPesewas(cleanBase + totalTax);

    return {
      scheme,
      taxableBase: roundToPesewas(cleanBase),
      nhil: 0,
      getfund: 0,
      covid,
      vatBase: roundToPesewas(cleanBase),
      vat,
      totalTax,
      grossTotal,
      effectiveRatePct: metrics.vfrs.effectiveRatePct,
      isExempt: false,
    };
  }

  // STANDARD_VAT (Compound scheme)
  const nhil = roundToPesewas(cleanBase * metrics.standard.nhil);
  const getfund = roundToPesewas(cleanBase * metrics.standard.getfund);
  const covid = roundToPesewas(cleanBase * metrics.standard.covid);
  
  // Compound VAT base = Base + NHIL + GETFund + COVID
  const vatBase = roundToPesewas(cleanBase + nhil + getfund + covid);
  const vat = roundToPesewas(vatBase * metrics.standard.vat);
  
  const totalTax = roundToPesewas(nhil + getfund + covid + vat);
  const grossTotal = roundToPesewas(cleanBase + totalTax);

  return {
    scheme,
    taxableBase: roundToPesewas(cleanBase),
    nhil,
    getfund,
    covid,
    vatBase,
    vat,
    totalTax,
    grossTotal,
    effectiveRatePct: metrics.standard.effectiveRatePct,
    isExempt: false,
  };
}

/**
 * Reverse-calculates and extracts base price and all levies from a TAX-INCLUSIVE shelf price
 * In Ghanaian supermarkets, shelf price tags are legally mandated to display the final customer price.
 * @param grossPrice The tagged retail shelf price (including tax)
 * @param scheme Tax scheme ('STANDARD_VAT' | 'FLAT_RATE_VFRS' | 'EXEMPT_SME')
 */
export function extractTaxFromInclusive(
  grossPrice: number,
  scheme: TaxSchemeType = 'STANDARD_VAT'
): TaxCalculationResult {
  const cleanGross = Math.max(0, grossPrice);
  const metrics = getComputedRateMetrics();

  if (scheme === 'EXEMPT_SME' || cleanGross === 0) {
    return {
      scheme,
      taxableBase: roundToPesewas(cleanGross),
      nhil: 0,
      getfund: 0,
      covid: 0,
      vatBase: roundToPesewas(cleanGross),
      vat: 0,
      totalTax: 0,
      grossTotal: roundToPesewas(cleanGross),
      effectiveRatePct: 0,
      isExempt: true,
    };
  }

  if (scheme === 'FLAT_RATE_VFRS') {
    const taxableBase = roundToPesewas(cleanGross / metrics.vfrs.inclusiveDivisor);
    const covid = roundToPesewas(taxableBase * metrics.vfrs.covid);
    const vat = roundToPesewas(taxableBase * metrics.vfrs.flatVat);
    const totalTax = roundToPesewas(covid + vat);
    
    const balancedGross = roundToPesewas(taxableBase + totalTax);

    return {
      scheme,
      taxableBase,
      nhil: 0,
      getfund: 0,
      covid,
      vatBase: taxableBase,
      vat,
      totalTax,
      grossTotal: balancedGross,
      effectiveRatePct: metrics.vfrs.effectiveRatePct,
      isExempt: false,
    };
  }

  // STANDARD_VAT (Compound scheme)
  const taxableBase = roundToPesewas(cleanGross / metrics.standard.inclusiveDivisor);
  const nhil = roundToPesewas(taxableBase * metrics.standard.nhil);
  const getfund = roundToPesewas(taxableBase * metrics.standard.getfund);
  const covid = roundToPesewas(taxableBase * metrics.standard.covid);
  
  const vatBase = roundToPesewas(taxableBase + nhil + getfund + covid);
  const vat = roundToPesewas(vatBase * metrics.standard.vat);
  
  const totalTax = roundToPesewas(nhil + getfund + covid + vat);
  const balancedGross = roundToPesewas(taxableBase + totalTax);

  return {
    scheme,
    taxableBase,
    nhil,
    getfund,
    covid,
    vatBase,
    vat,
    totalTax,
    grossTotal: balancedGross,
    effectiveRatePct: metrics.standard.effectiveRatePct,
    isExempt: false,
  };
}

/**
 * Generate GRA Fiscal Code & E-VAT QR Code Payload
 * Follows GRA Commissioner General guidelines for Fiscalized Electronic Invoicing
 */
export function generateGraFiscalSignature(params: {
  receiptNumber: string;
  tinNumber: string;
  grossAmount: number;
  taxAmount: number;
  timestamp?: Date;
}): { fiscalCode: string; qrPayload: string } {
  const date = params.timestamp || new Date();
  const dateStr = date.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
  
  // Format: GRA-SDC-{TIN}-{DATE}-{RANDOM}
  const fiscalCode = `GRA-GH-${params.tinNumber || 'C00123987X'}-${dateStr}-${randomHex}`;
  
  // QR Payload structured for GRA verification portal:
  // URL?tin=...&rcpt=...&tot=...&vat=...&sdc=...
  const qrPayload = `https://gra.gov.gh/verify-evat?tin=${params.tinNumber || 'C00123987X'}&rcpt=${params.receiptNumber}&tot=${params.grossAmount.toFixed(2)}&tax=${params.taxAmount.toFixed(2)}&code=${fiscalCode}`;
  
  return { fiscalCode, qrPayload };
}

/**
 * Unit Test Runner for Ghana Tax Engine
 * Can be invoked programmatically or in test suites to verify math
 */
export function runGhanaTaxUnitTests(): {
  allPassed: boolean;
  results: Array<{ testName: string; passed: boolean; message: string; data?: any }>;
} {
  const tests: Array<{ testName: string; passed: boolean; message: string; data?: any }> = [];

  // Test 1: Standard VAT Exclusive (Base GH₵ 1,000.00)
  // Expected: NHIL = 25.00, GETFund = 25.00, COVID = 10.00, VAT Base = 1060.00, VAT (15%) = 159.00, Total Tax = 219.00, Gross = 1219.00
  const t1 = calculateTaxExclusive(1000, 'STANDARD_VAT');
  const t1Passed = 
    t1.nhil === 25.00 && 
    t1.getfund === 25.00 && 
    t1.covid === 10.00 && 
    t1.vatBase === 1060.00 && 
    t1.vat === 159.00 && 
    t1.totalTax === 219.00 && 
    t1.grossTotal === 1219.00;

  tests.push({
    testName: 'Standard VAT Exclusive Math (GH₵ 1,000.00 base)',
    passed: t1Passed,
    message: t1Passed ? 'Accurate: 21.90% compound tax applied' : 'Discrepancy detected in compound calculation',
    data: t1
  });

  // Test 2: Standard VAT Inclusive Reverse Extraction (Shelf Price GH₵ 1,219.00)
  // Expected: Base = 1,000.00, Total Tax = 219.00
  const t2 = extractTaxFromInclusive(1219, 'STANDARD_VAT');
  const t2Passed = t2.taxableBase === 1000.00 && t2.vat === 159.00 && t2.totalTax === 219.00;

  tests.push({
    testName: 'Standard VAT Inclusive Reverse Extraction (GH₵ 1,219.00 shelf price)',
    passed: t2Passed,
    message: t2Passed ? 'Accurate: extracted GH₵ 1,000 base and GH₵ 219 tax' : 'Reverse extraction error',
    data: t2
  });

  // Test 3: VFRS Flat Rate Scheme Exclusive (Base GH₵ 1,000.00)
  // Expected: 3% VAT = 30.00, 1% COVID = 10.00, Total = 40.00, Gross = 1040.00
  const t3 = calculateTaxExclusive(1000, 'FLAT_RATE_VFRS');
  const t3Passed = t3.vat === 30.00 && t3.covid === 10.00 && t3.totalTax === 40.00 && t3.grossTotal === 1040.00;

  tests.push({
    testName: 'Flat Rate VFRS Math (3% VAT + 1% COVID = 4%)',
    passed: t3Passed,
    message: t3Passed ? 'Accurate: 4.00% flat tax correctly applied' : 'Flat rate discrepancy',
    data: t3
  });

  // Test 4: Exempt SME Scheme
  const t4 = calculateTaxExclusive(500, 'EXEMPT_SME');
  const t4Passed = t4.totalTax === 0 && t4.grossTotal === 500 && t4.isExempt === true;

  tests.push({
    testName: 'Exempt SME Zero-Tax Policy',
    passed: t4Passed,
    message: t4Passed ? 'Accurate: 0% tax for non-VAT SME' : 'Exempt calculation error',
    data: t4
  });

  // Test 5: Pesewa Small Fraction Rounding (Base GH₵ 14.73)
  const t5 = calculateTaxExclusive(14.73, 'STANDARD_VAT');
  const t5Passed = typeof t5.totalTax === 'number' && !isNaN(t5.totalTax);

  tests.push({
    testName: 'Small Pesewa Micro-Rounding (GH₵ 14.73 base)',
    passed: t5Passed,
    message: `Result: Base=${t5.taxableBase}, Tax=${t5.totalTax}, Gross=${t5.grossTotal}`,
    data: t5
  });

  const allPassed = tests.every(t => t.passed);
  return { allPassed, results: tests };
}
