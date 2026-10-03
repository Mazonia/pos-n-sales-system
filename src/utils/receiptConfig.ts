/**
 * Akwaaba POS & Retail OS - Receipt & Cashier Discount Control Configuration
 *
 * Allows Super Admin & General Manager to:
 * 1. Customize what displays on receipts given to customers (logo, cashier name, customer info, GRA QR code, tax breakdown, return policy).
 * 2. Toggle global cashier discount privileges on/off.
 */

export interface ReceiptConfig {
  storeName: string;
  tagline: string;
  digitalAddress: string;
  phone: string;
  tinNumber: string;
  showLogo: boolean;
  showCashierName: boolean;
  showCustomerInfo: boolean;
  showItemizedTaxes: boolean; // Show NHIL, GETFund, COVID, VAT separately or just total tax
  showGraQrCode: boolean;
  showLoyaltyPoints: boolean;
  showOrderTypeBadge: boolean; // Wholesale vs Retail
  footerMessage: string;
  returnPolicyNotice: string;
  allowCashierDiscounts: boolean; // Master toggle to enable/disable discount button for attendants
}

const STORAGE_KEY = 'akwaaba_receipt_and_discount_config_v1';

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  storeName: 'AKWAABA RETAIL OS & WHOLESALE',
  tagline: 'Ghana Fast-Moving Retail & Provisions',
  digitalAddress: 'GA-183-9022, Accra Central',
  phone: '+233 (0) 30 223 9081 / 024 400 1122',
  tinNumber: 'C001889201X',
  showLogo: true,
  showCashierName: true,
  showCustomerInfo: true,
  showItemizedTaxes: true,
  showGraQrCode: true,
  showLoyaltyPoints: true,
  showOrderTypeBadge: true,
  footerMessage: 'Thank you for shopping with us! Akwaaba!',
  returnPolicyNotice: 'Goods sold in good condition are returnable within 48 hours with official receipt. Perishable items and Dumsor-impacted dairy are non-refundable.',
  allowCashierDiscounts: true,
};

export function getReceiptConfig(): ReceiptConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_RECEIPT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load receipt config', e);
  }
  return DEFAULT_RECEIPT_CONFIG;
}

export function saveReceiptConfig(config: ReceiptConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('receiptConfigUpdated', { detail: config }));
  } catch (e) {
    console.error('Failed to save receipt config', e);
  }
}

export function setCashierDiscountsAllowed(allowed: boolean): void {
  const current = getReceiptConfig();
  current.allowCashierDiscounts = allowed;
  saveReceiptConfig(current);
}
