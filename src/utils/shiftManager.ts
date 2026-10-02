/**
 * Akwaaba POS & Retail OS - Cashier Shift & Till Reconciliation Manager
 * 
 * Manages:
 * 1. Opening Float (starting cash in Ghanaian Cedis)
 * 2. Mid-shift Cash Drops / Skims & Pay-ins (Dumsor fuel, petty cash, safe drops)
 * 3. X-Report (Real-time mid-shift reading without closing till)
 * 4. Z-Report (End-of-shift reconciliation with physical cash audit & variance)
 */

import { LocalOrder, LocalShift, db } from './dexieSync';
import { roundToPesewas, formatGhs } from './ghanaTaxEngine';

export interface ShiftSummaryReport {
  shiftNumber: string;
  reportType: 'X_REPORT' | 'Z_REPORT';
  generatedAt: string;
  cashierName: string;
  cashierId: string;
  branchName: string;
  openedAt: string;
  closedAt?: string;
  
  // Tills & Cash Movement
  openingFloat: number;
  cashSales: number;
  momoSales: number;
  cardSales: number;
  debtSales: number;
  totalRevenue: number;
  totalOrders: number;
  
  // Mid shift drops
  payInsTotal: number;
  payOutsTotal: number;
  safeDropsTotal: number;
  netCashDrops: number;

  // Expected vs Counted
  expectedCashInTill: number;
  countedCashPhysical?: number;
  cashVariance?: number; // Counted - Expected. Positive = Overage, Negative = Shortage
  varianceStatus?: 'BALANCED' | 'OVERAGE' | 'SHORTAGE';

  // Tax Summary
  totalTaxCollected: number;
  nhilCollected: number;
  getfundCollected: number;
  covidCollected: number;
  vatCollected: number;

  // Signoff
  zReportNumber?: string;
  managerSignatureNeeded: boolean;
  managerPinUsed?: string;
  closingNotes?: string;
}

export interface DenominationBreakdown {
  note200: number; // GH₵200 note
  note100: number; // GH₵100 note
  note50: number;  // GH₵50 note
  note20: number;  // GH₵20 note
  note10: number;  // GH₵10 note
  note5: number;   // GH₵5 note
  note2: number;   // GH₵2 note
  note1: number;   // GH₵1 coin/note
  coinsPesewas: number; // Small coins (50p, 20p, 10p)
}

export function calculateDenominationTotal(d: DenominationBreakdown): number {
  const sum = 
    d.note200 * 200 +
    d.note100 * 100 +
    d.note50 * 50 +
    d.note20 * 20 +
    d.note10 * 10 +
    d.note5 * 5 +
    d.note2 * 2 +
    d.note1 * 1 +
    d.coinsPesewas;
  return roundToPesewas(sum);
}

/**
 * Open a new shift for the cashier
 */
export async function openCashierShift(params: {
  cashierId: string;
  cashierName: string;
  branchId: string;
  openingFloat: number;
}): Promise<LocalShift> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const shiftNumber = `SHF-${dateStr}-${randomSuffix}`;

  const newShift: LocalShift = {
    id: `shift-${Date.now()}`,
    shiftNumber,
    branchId: params.branchId,
    cashierId: params.cashierId,
    cashierName: params.cashierName,
    status: 'OPEN',
    openedAt: new Date().toISOString(),
    openingFloat: roundToPesewas(params.openingFloat),
    cashSales: 0,
    momoSales: 0,
    cardSales: 0,
    debtSales: 0,
    cashDropsTotal: 0,
    expectedCashInTill: roundToPesewas(params.openingFloat),
    cashDrops: [],
  };

  await db.shifts.put(newShift);
  return newShift;
}

/**
 * Add a mid-shift Cash Drop / Pay-In / Pay-Out
 */
export async function recordCashDrop(
  shiftId: string,
  drop: {
    type: 'PAY_IN' | 'PAY_OUT' | 'SAFE_DEPOSIT';
    amount: number;
    reason: string;
    managerPin?: string;
  }
): Promise<LocalShift> {
  const shift = await db.shifts.get(shiftId);
  if (!shift) throw new Error('Shift not found');

  const dropItem = {
    id: `drop-${Date.now()}`,
    type: drop.type,
    amount: roundToPesewas(drop.amount),
    reason: drop.reason,
    timestamp: new Date().toISOString(),
  };

  shift.cashDrops.push(dropItem);

  // Recalculate cash drops total and expected cash
  let netDropChange = 0;
  if (drop.type === 'PAY_IN') {
    netDropChange = drop.amount;
  } else {
    // PAY_OUT or SAFE_DEPOSIT reduces cash from drawer
    netDropChange = -drop.amount;
  }

  shift.cashDropsTotal = roundToPesewas(shift.cashDropsTotal + netDropChange);
  shift.expectedCashInTill = roundToPesewas(shift.openingFloat + shift.cashSales + shift.cashDropsTotal);

  await db.shifts.put(shift);
  return shift;
}

/**
 * Updates shift sales metrics when a sale occurs
 */
export async function updateShiftWithSale(shiftId: string, order: LocalOrder): Promise<void> {
  const shift = await db.shifts.get(shiftId);
  if (!shift || shift.status !== 'OPEN') return;

  for (const payment of order.payments) {
    if (payment.type === 'CASH') {
      shift.cashSales = roundToPesewas(shift.cashSales + payment.amount);
    } else if (payment.type.startsWith('MOMO_')) {
      shift.momoSales = roundToPesewas(shift.momoSales + payment.amount);
    } else if (payment.type === 'CARD') {
      shift.cardSales = roundToPesewas(shift.cardSales + payment.amount);
    } else if (payment.type === 'CUSTOMER_DEBT_BISA') {
      shift.debtSales = roundToPesewas(shift.debtSales + payment.amount);
    }
  }

  // Recalculate expected cash in till
  shift.expectedCashInTill = roundToPesewas(shift.openingFloat + shift.cashSales + shift.cashDropsTotal);
  await db.shifts.put(shift);
}

/**
 * Generate X-Report (Real-time mid-shift reading without closing drawer)
 */
export async function generateXReport(shiftId: string, branchName = 'Accra Central Mall Store'): Promise<ShiftSummaryReport> {
  const shift = await db.shifts.get(shiftId);
  if (!shift) throw new Error('Shift not found');

  const orders = await db.orders.where('shiftId').equals(shiftId).toArray();
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');

  // Sum tax collections
  let totalTax = 0;
  let nhil = 0;
  let getfund = 0;
  let covid = 0;
  let vat = 0;

  for (const o of completedOrders) {
    totalTax += o.totalTax;
    nhil += o.nhil;
    getfund += o.getfund;
    covid += o.covid;
    vat += o.vat;
  }

  let payIns = 0;
  let payOuts = 0;
  let safeDrops = 0;

  for (const d of shift.cashDrops) {
    if (d.type === 'PAY_IN') payIns += d.amount;
    if (d.type === 'PAY_OUT') payOuts += d.amount;
    if (d.type === 'SAFE_DEPOSIT') safeDrops += d.amount;
  }

  const expected = roundToPesewas(shift.openingFloat + shift.cashSales + (payIns - payOuts - safeDrops));

  return {
    shiftNumber: shift.shiftNumber,
    reportType: 'X_REPORT',
    generatedAt: new Date().toISOString(),
    cashierName: shift.cashierName,
    cashierId: shift.cashierId,
    branchName,
    openedAt: shift.openedAt,
    openingFloat: shift.openingFloat,
    cashSales: shift.cashSales,
    momoSales: shift.momoSales,
    cardSales: shift.cardSales,
    debtSales: shift.debtSales,
    totalRevenue: roundToPesewas(shift.cashSales + shift.momoSales + shift.cardSales + shift.debtSales),
    totalOrders: completedOrders.length,
    payInsTotal: roundToPesewas(payIns),
    payOutsTotal: roundToPesewas(payOuts),
    safeDropsTotal: roundToPesewas(safeDrops),
    netCashDrops: roundToPesewas(payIns - payOuts - safeDrops),
    expectedCashInTill: expected,
    totalTaxCollected: roundToPesewas(totalTax),
    nhilCollected: roundToPesewas(nhil),
    getfundCollected: roundToPesewas(getfund),
    covidCollected: roundToPesewas(covid),
    vatCollected: roundToPesewas(vat),
    managerSignatureNeeded: false,
  };
}

/**
 * Close Shift and Generate Z-Report (End of day / shift closure with physical count & variance)
 */
export async function closeShiftAndGenerateZReport(params: {
  shiftId: string;
  countedCashPhysical: number;
  managerPin?: string;
  closingNotes?: string;
  branchName?: string;
}): Promise<ShiftSummaryReport> {
  const shift = await db.shifts.get(params.shiftId);
  if (!shift) throw new Error('Shift not found');

  const xReport = await generateXReport(params.shiftId, params.branchName);
  const variance = roundToPesewas(params.countedCashPhysical - xReport.expectedCashInTill);

  let varianceStatus: 'BALANCED' | 'OVERAGE' | 'SHORTAGE' = 'BALANCED';
  if (variance > 0.05) varianceStatus = 'OVERAGE';
  if (variance < -0.05) varianceStatus = 'SHORTAGE';

  const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const zReportNumber = `Z-REP-${dateCode}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Update shift record in database
  shift.status = 'CLOSED';
  shift.closedAt = new Date().toISOString();
  shift.countedCashPhysical = params.countedCashPhysical;
  shift.variance = variance;
  shift.zReportNumber = zReportNumber;
  await db.shifts.put(shift);

  return {
    ...xReport,
    reportType: 'Z_REPORT',
    closedAt: shift.closedAt,
    countedCashPhysical: params.countedCashPhysical,
    cashVariance: variance,
    varianceStatus,
    managerSignatureNeeded: Math.abs(variance) > 5.0, // Variance > GH₵5 requires manager sign-off
    managerPinUsed: params.managerPin,
    closingNotes: params.closingNotes,
  };
}
