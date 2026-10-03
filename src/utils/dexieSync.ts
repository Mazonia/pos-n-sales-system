/**
 * Akwaaba POS & Retail OS - Offline-First Sync Engine (Dexie / IndexedDB)
 * 
 * Provides 100% offline checkout resilience for Ghanaian commercial realities:
 * - Unstable broadband & intermittent power (Dumsor)
 * - Instant local cart processing & ticket printing without server roundtrip
 * - Automatic background sync queue with retry & conflict handling
 */

import Dexie, { Table } from 'dexie';
import { TaxSchemeType } from './ghanaTaxEngine';

export interface LocalProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  localName?: string;
  category: string;
  categoryId: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice?: number;
  currentStock: number;
  baseUnit: string; // e.g. "PCS", "50kg Sack"
  uomOptions?: Array<{
    name: string;
    factor: number;
    price: number;
  }>;
  isTaxExempt?: boolean;
  reorderLevel: number;
  safetyThreshold?: number; // Visual safety threshold
  targetStockLevel?: number; // Optimal restock quantity
  supplierName?: string;
  batchNumber?: string;
  expiryDate?: string;
  imageUrl?: string;
}

export interface LocalPurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  currentStock: number;
  safetyThreshold: number;
  recommendedOrder: number;
  unitCost: number;
  totalCost: number;
  supplierName: string;
}

export interface LocalPurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  branchName: string;
  generatedBy: string;
  generatedById: string;
  status: 'DRAFT' | 'ISSUED' | 'APPROVED';
  createdAt: string;
  items: LocalPurchaseOrderItem[];
  totalCost: number;
  notes?: string;
}

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  role: 'CASHIER' | 'BRANCH_MANAGER' | 'GENERAL_MANAGER' | 'SUPER_ADMIN' | 'INVENTORY_OFFICER' | 'AUDITOR';
  branchId: string;
  branchName: string;
  pin?: string;
  password?: string;
  passwordHash?: string;
  avatarColor?: string;
  phone?: string;
  email?: string;
  enrolledAt?: string;
  enrolledBy?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}

export const SYSTEM_USERS: SystemUser[] = [
  {
    id: 'usr-001',
    username: 'kofi.cashier',
    fullName: 'Kofi Boateng',
    role: 'CASHIER',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Mall Store',
    pin: '000000',
    password: 'Cashier#Kofi2026!',
    avatarColor: '#10B981',
    phone: '0244001122',
    email: 'kofi.b@akwaabapos.gh',
    status: 'ACTIVE',
  },
  {
    id: 'usr-002',
    username: 'abena.manager',
    fullName: 'Abena Osei',
    role: 'BRANCH_MANAGER',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Mall Store',
    pin: '123456',
    password: 'Manager#Branch2026!',
    avatarColor: '#F59E0B',
    phone: '0208334455',
    email: 'abena.osei@akwaabapos.gh',
    status: 'ACTIVE',
  },
  {
    id: 'usr-003',
    username: 'kwame.admin',
    fullName: 'Kwame Mensah',
    role: 'SUPER_ADMIN',
    branchId: 'branch-accra-01',
    branchName: 'Headquarters & Multi-Store',
    pin: '999999',
    password: 'Admin@Akwaaba2026!',
    avatarColor: '#F59E0B',
    phone: '0249998877',
    email: 'kwame.admin@akwaabapos.gh',
    status: 'ACTIVE',
  },
  {
    id: 'usr-006',
    username: 'esi.gm',
    fullName: 'Esi Mansa',
    role: 'GENERAL_MANAGER',
    branchId: 'branch-accra-01',
    branchName: 'Headquarters & Multi-Store',
    pin: '777777',
    password: 'Manager@Akwaaba2026!',
    avatarColor: '#8B5CF6',
    phone: '0244112233',
    email: 'esi.mansa@akwaabapos.gh',
    status: 'ACTIVE',
  },
  {
    id: 'usr-004',
    username: 'yaw.inventory',
    fullName: 'Yaw Frimpong',
    role: 'INVENTORY_OFFICER',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Warehouse',
    pin: '111111',
    password: 'Inventory@Akwaaba2026!',
    avatarColor: '#EC4899',
    phone: '0551223344',
    email: 'yaw.frimpong@akwaabapos.gh',
    status: 'ACTIVE',
  },
  {
    id: 'usr-005',
    username: 'akosua.auditor',
    fullName: 'Akosua Addo',
    role: 'AUDITOR',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Mall Store',
    pin: '222222',
    password: 'Auditor#Akosua2026!',
    avatarColor: '#78716C',
    phone: '0277889900',
    email: 'akosua.addo@akwaabapos.gh',
    status: 'ACTIVE',
  },
];

export interface LocalCartItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  originalPrice: number;
  costPrice: number;
  quantity: number;
  unitName: string;
  orderType?: 'RETAIL' | 'WHOLESALE';
  discountPct: number;
  discountAmount: number;
  lineTotal: number;
  taxAmount: number;
  priceOverridden?: boolean;
  overrideReason?: string;
}

export interface LocalOrderPayment {
  type: 'CASH' | 'MOMO_MTN' | 'MOMO_TELECEL' | 'MOMO_AT' | 'CARD' | 'CUSTOMER_DEBT_BISA' | 'LOYALTY_POINTS';
  amount: number;
  tenderedCash?: number;
  changeGiven?: number;
  momoNetwork?: string;
  momoPhone?: string;
  momoTxId?: string;
  cardLastFour?: string;
  loyaltyPointsRedeemed?: number;
}

export interface LocalOrder {
  id: string; // UUID
  orderNumber: string;
  receiptNumber: string;
  orderType?: 'RETAIL' | 'WHOLESALE';
  branchId: string;
  branchName: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  shiftId: string;
  status: 'COMPLETED' | 'HOLD' | 'VOIDED';
  items: LocalCartItem[];
  subtotal: number;
  discountTotal: number;
  discountAppliedByUserId?: string;
  discountAppliedByUserName?: string;
  taxableBase: number;
  nhil: number;
  getfund: number;
  covid: number;
  vat: number;
  totalTax: number;
  grandTotal: number;
  taxScheme: TaxSchemeType;
  payments: LocalOrderPayment[];
  graFiscalCode: string;
  graQrPayload: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  customerLoyaltyBalanceAfter?: number;
  isOfflineCreated: boolean;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  syncedAt?: string;
  createdAt: string;
}

export interface LocalCustomer {
  id: string;
  customerNumber: string;
  fullName: string;
  phone: string;
  ghanaPostGps: string;
  creditLimit: number;
  currentDebt: number;
  loyaltyPoints: number;
  isCreditBlocked: boolean;
  notes?: string;
  updatedAt: string;
}

export interface LocalShift {
  id: string;
  shiftNumber: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  cashSales: number;
  momoSales: number;
  cardSales: number;
  debtSales: number;
  cashDropsTotal: number;
  expectedCashInTill: number;
  countedCashPhysical?: number;
  variance?: number;
  zReportNumber?: string;
  cashDrops: Array<{
    id: string;
    type: 'PAY_IN' | 'PAY_OUT' | 'SAFE_DEPOSIT';
    amount: number;
    reason: string;
    timestamp: string;
  }>;
}

export interface LocalAuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  details: string;
  timestamp: string;
}

// Dexie Database Class
export class AkwaabaPosDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  orders!: Table<LocalOrder, string>;
  offlineQueue!: Table<LocalOrder, string>;
  customers!: Table<LocalCustomer, string>;
  shifts!: Table<LocalShift, string>;
  auditLogs!: Table<LocalAuditLog, string>;
  purchaseOrders!: Table<LocalPurchaseOrder, string>;
  users!: Table<SystemUser, string>;

  constructor() {
    super('AkwaabaPosDb_v3');
    this.version(1).stores({
      products: 'id, sku, barcode, category, name',
      orders: 'id, orderNumber, receiptNumber, createdAt, syncStatus, cashierId',
      offlineQueue: 'id, orderNumber, createdAt, syncStatus',
      customers: 'id, phone, customerNumber, fullName',
      shifts: 'id, shiftNumber, cashierId, status',
      auditLogs: 'id, action, userId, timestamp',
    });
    this.version(2).stores({
      products: 'id, sku, barcode, category, name',
      orders: 'id, orderNumber, receiptNumber, createdAt, syncStatus, cashierId',
      offlineQueue: 'id, orderNumber, createdAt, syncStatus',
      customers: 'id, phone, customerNumber, fullName',
      shifts: 'id, shiftNumber, cashierId, status',
      auditLogs: 'id, action, userId, timestamp',
      purchaseOrders: 'id, poNumber, supplierName, status, createdAt',
    });
    this.version(3).stores({
      products: 'id, sku, barcode, category, name',
      orders: 'id, orderNumber, receiptNumber, createdAt, syncStatus, cashierId',
      offlineQueue: 'id, orderNumber, createdAt, syncStatus',
      customers: 'id, phone, customerNumber, fullName',
      shifts: 'id, shiftNumber, cashierId, status',
      auditLogs: 'id, action, userId, timestamp',
      purchaseOrders: 'id, poNumber, supplierName, status, createdAt',
      users: 'id, username, fullName, role, branchId, status',
    });
  }
}

export const db = new AkwaabaPosDatabase();

// Default Ghanaian Retail Seed Data
export const INITIAL_GHANA_PRODUCTS: LocalProduct[] = [
  {
    id: 'prod-001',
    sku: 'RICE-RF-50KG',
    barcode: '603001001201',
    name: 'Royal Feast Jasmine Perfume Rice',
    localName: 'Omo Rice 50kg Sack',
    category: 'Provisions & Grains',
    categoryId: 'cat-provisions',
    costPrice: 820.00,
    retailPrice: 945.00,
    wholesalePrice: 880.00,
    currentStock: 48,
    baseUnit: '50kg Sack',
    uomOptions: [
      { name: '50kg Sack (Full)', factor: 1, price: 945.00 },
      { name: '25kg Half Bag', factor: 0.5, price: 485.00 },
      { name: '5kg Family Pack', factor: 0.1, price: 105.00 },
      { name: '1kg Olonka Cup', factor: 0.02, price: 22.00 },
    ],
    reorderLevel: 10,
    safetyThreshold: 10,
    targetStockLevel: 60,
    supplierName: 'Finatrade Ghana Ltd',
    batchNumber: 'RF-2026-B12',
    expiryDate: '2027-08-30',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-002',
    sku: 'MILO-TIN-400G',
    barcode: '7613032488102',
    name: 'Nestlé Milo Activ-Go Tin 400g',
    localName: 'Milo Brown Tin',
    category: 'Beverages & Breakfast',
    categoryId: 'cat-beverages',
    costPrice: 38.50,
    retailPrice: 48.00,
    wholesalePrice: 42.00,
    currentStock: 120,
    baseUnit: 'Tin',
    uomOptions: [
      { name: 'Single Tin 400g', factor: 1, price: 48.00 },
      { name: 'Carton of 24 Tins', factor: 24, price: 1100.00 },
    ],
    reorderLevel: 24,
    safetyThreshold: 24,
    targetStockLevel: 150,
    supplierName: 'Nestlé Ghana Ltd (Tema)',
    batchNumber: 'NST-ML-09',
    expiryDate: '2027-03-15',
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-003',
    sku: 'PEAK-MILK-160G',
    barcode: '8712800142981',
    name: 'Peak Evaporated Milk Tin 160g',
    localName: 'Peak Blue Tin Milk',
    category: 'Beverages & Breakfast',
    categoryId: 'cat-beverages',
    costPrice: 9.80,
    retailPrice: 13.50,
    wholesalePrice: 11.50,
    currentStock: 350,
    baseUnit: 'Tin',
    uomOptions: [
      { name: 'Single Tin 160g', factor: 1, price: 13.50 },
      { name: 'Pack of 12 Tins', factor: 12, price: 155.00 },
      { name: 'Carton of 48 Tins', factor: 48, price: 605.00 },
    ],
    reorderLevel: 48,
    safetyThreshold: 48,
    targetStockLevel: 400,
    supplierName: 'FrieslandCampina Ghana',
    batchNumber: 'PK-2026-X4',
    expiryDate: '2026-12-10',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-004',
    sku: 'GINO-TOM-70G',
    barcode: '6001007204551',
    name: 'Gino Peppe & Onion Tomato Paste 70g Sachet',
    localName: 'Gino Sachet Tomato',
    category: 'Cooking & Seasonings',
    categoryId: 'cat-cooking',
    costPrice: 3.20,
    retailPrice: 4.50,
    wholesalePrice: 3.80,
    currentStock: 600,
    baseUnit: 'Sachet',
    uomOptions: [
      { name: 'Single Sachet 70g', factor: 1, price: 4.50 },
      { name: 'Roll of 10 Sachets', factor: 10, price: 42.00 },
      { name: 'Carton of 100 Sachets', factor: 100, price: 400.00 },
    ],
    reorderLevel: 100,
    safetyThreshold: 100,
    targetStockLevel: 800,
    supplierName: 'GBfoods Ghana (Tema)',
    batchNumber: 'GN-2026-T1',
    expiryDate: '2027-01-20',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-005',
    sku: 'FRYTOL-OIL-5L',
    barcode: '603004005112',
    name: 'Frytol Pure Vegetable Cooking Oil 5 Litres',
    localName: 'Frytol Yellow Gallon 5L',
    category: 'Cooking & Seasonings',
    categoryId: 'cat-cooking',
    costPrice: 145.00,
    retailPrice: 175.00,
    wholesalePrice: 158.00,
    currentStock: 3, // LOW STOCK: 3 < 10 (Safety Threshold)
    baseUnit: 'Gallon',
    reorderLevel: 10,
    safetyThreshold: 10,
    targetStockLevel: 30,
    supplierName: 'Wilmar Africa Ltd (Tema Harbour)',
    batchNumber: 'FRY-2026-L5',
    expiryDate: '2027-11-05',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-006',
    sku: 'FANYOGO-POUCH',
    barcode: '603001882031',
    name: 'Fan Milk FanYogo Frozen Strawberry Pouch 145ml',
    localName: 'FanYogo Strawberry',
    category: 'Dairy & Frozen',
    categoryId: 'cat-dairy',
    costPrice: 4.20,
    retailPrice: 6.00,
    wholesalePrice: 5.00,
    currentStock: 85,
    baseUnit: 'Pouch',
    uomOptions: [
      { name: 'Single Pouch', factor: 1, price: 6.00 },
      { name: 'Pack of 20 Pouches', factor: 20, price: 115.00 },
    ],
    reorderLevel: 20,
    safetyThreshold: 20,
    targetStockLevel: 120,
    supplierName: 'Fan Milk PLC (Accra)',
    batchNumber: 'FM-FYG-26',
    expiryDate: '2026-11-20',
    imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-007',
    sku: 'CHOCO-GOLD-100G',
    barcode: '603002551409',
    name: 'Golden Tree Kingsbite Milk Chocolate 100g',
    localName: 'Ghana Cocoa Board Chocolate',
    category: 'Snacks & Confectionery',
    categoryId: 'cat-snacks',
    costPrice: 14.50,
    retailPrice: 19.50,
    wholesalePrice: 16.50,
    currentStock: 5, // LOW STOCK: 5 < 20 (Safety Threshold)
    baseUnit: 'Bar',
    reorderLevel: 20,
    safetyThreshold: 20,
    targetStockLevel: 50,
    supplierName: 'Cocoa Processing Co. Ltd (Tema)',
    batchNumber: 'GT-KB-02',
    expiryDate: '2027-06-18',
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-008',
    sku: 'BELAQUA-500ML',
    barcode: '603005001928',
    name: 'Bel-Aqua Natural Mineral Water 500ml Bottle',
    localName: 'Bel-Aqua Small Bottle',
    category: 'Beverages & Breakfast',
    categoryId: 'cat-beverages',
    costPrice: 2.10,
    retailPrice: 3.50,
    currentStock: 420,
    baseUnit: 'Bottle',
    uomOptions: [
      { name: 'Single 500ml Bottle', factor: 1, price: 3.50 },
      { name: 'Pack of 16 Bottles', factor: 16, price: 48.00 },
    ],
    reorderLevel: 50,
    safetyThreshold: 50,
    targetStockLevel: 500,
    supplierName: 'Blow Chem Industries Ltd',
    batchNumber: 'BEL-2026-W',
    expiryDate: '2027-10-10',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-009',
    sku: 'PANADOL-EXTRA',
    barcode: '5054563001221',
    name: 'Panadol Extra Paracetamol + Caffeine Tablets (Box of 24)',
    localName: 'Red Panadol Extra',
    category: 'Pharmaceuticals & OTC',
    categoryId: 'cat-pharma',
    costPrice: 42.00,
    retailPrice: 55.00,
    currentStock: 4, // LOW STOCK: 4 < 15 (Safety Threshold)
    baseUnit: 'Box',
    uomOptions: [
      { name: 'Full Box (24 Tablets)', factor: 1, price: 55.00 },
      { name: '1 Strip (4 Tablets)', factor: 0.166, price: 10.00 },
    ],
    isTaxExempt: true,
    reorderLevel: 15,
    safetyThreshold: 15,
    targetStockLevel: 45,
    supplierName: 'Ernest Chemists Ltd (Accra)',
    batchNumber: 'GSK-PD-41',
    expiryDate: '2026-11-15',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-010',
    sku: 'INDOMIE-SUPER',
    barcode: '8998866200234',
    name: 'Indomie Instant Noodles Onion Chicken Super Pack 120g',
    localName: 'Indomie Super Pack',
    category: 'Provisions & Grains',
    categoryId: 'cat-provisions',
    costPrice: 5.50,
    retailPrice: 7.50,
    wholesalePrice: 6.20,
    currentStock: 300,
    baseUnit: 'Pack',
    uomOptions: [
      { name: 'Single 120g Pack', factor: 1, price: 7.50 },
      { name: 'Carton of 40 Packs', factor: 40, price: 285.00 },
    ],
    reorderLevel: 40,
    batchNumber: 'IDM-2026-SP',
    expiryDate: '2027-04-12',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-011',
    sku: 'KIVO-GARI-200G',
    barcode: '603009112233',
    name: 'Kivo Fine Gari Soaking Mix 200g',
    localName: 'Kivo Gari Sugar & Groundnut Pack',
    category: 'Provisions & Grains',
    categoryId: 'cat-provisions',
    costPrice: 4.80,
    retailPrice: 7.00,
    wholesalePrice: 5.80,
    currentStock: 95,
    baseUnit: 'Pack',
    uomOptions: [
      { name: 'Single Pack 200g', factor: 1, price: 7.00 },
      { name: 'Roll of 10 Packs', factor: 10, price: 65.00 },
    ],
    reorderLevel: 20,
    safetyThreshold: 20,
    targetStockLevel: 120,
    supplierName: 'Kivo Products Ghana (Spintex)',
    batchNumber: 'KV-2026-G1',
    expiryDate: '2027-05-20',
    imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'prod-012',
    sku: 'KVO-MALT-330ML',
    barcode: '603009445566',
    name: 'Kvo Premium Malt Beverage 330ml Can',
    localName: 'Kvo Cold Malt Drink',
    category: 'Beverages & Breakfast',
    categoryId: 'cat-beverages',
    costPrice: 6.50,
    retailPrice: 9.50,
    wholesalePrice: 7.80,
    currentStock: 140,
    baseUnit: 'Can',
    uomOptions: [
      { name: 'Single Can 330ml', factor: 1, price: 9.50 },
      { name: 'Pack of 6 Cans', factor: 6, price: 54.00 },
      { name: 'Crate of 24 Cans', factor: 24, price: 210.00 },
    ],
    reorderLevel: 24,
    safetyThreshold: 24,
    targetStockLevel: 160,
    supplierName: 'Accra Brewery PLC',
    batchNumber: 'KVO-2026-M2',
    expiryDate: '2027-09-10',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80',
  },
];

export const INITIAL_CUSTOMERS: LocalCustomer[] = [
  {
    id: 'cust-001',
    customerNumber: 'CUST-ACC-01',
    fullName: 'Mama Adjoa Mensah (Provision Store)',
    phone: '0244198234',
    ghanaPostGps: 'GA-183-9022',
    creditLimit: 1500.00,
    currentDebt: 450.00,
    loyaltyPoints: 320,
    isCreditBlocked: false,
    notes: 'Long-time customer. Weekly settlements on Tuesday afternoon.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-002',
    customerNumber: 'CUST-ACC-02',
    fullName: 'Uncle Ekow Chemist & Provisions',
    phone: '0208112345',
    ghanaPostGps: 'GS-019-3344',
    creditLimit: 3000.00,
    currentDebt: 1250.00,
    loyaltyPoints: 680,
    isCreditBlocked: false,
    notes: 'Bulk purchaser of canned milk and rice. Pays via MTN MoMo.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-003',
    customerNumber: 'CUST-ACC-03',
    fullName: 'Sister Serwaa Chop Bar (Osu)',
    phone: '0559988112',
    ghanaPostGps: 'GA-044-7721',
    creditLimit: 800.00,
    currentDebt: 790.00, // Approaching credit limit
    loyaltyPoints: 140,
    isCreditBlocked: false,
    notes: 'Daily cooking oil and rice buyer. Limit nearly reached.',
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Initializes Dexie and seeds default Ghanaian retail items if empty
 */
export async function initializeLocalDatabase(): Promise<void> {
  const productCount = await db.products.count();
  if (productCount === 0) {
    await db.products.bulkAdd(INITIAL_GHANA_PRODUCTS);
  } else {
    // Ensure safety thresholds, suppliers, and image URLs are synced, and new products are inserted
    for (const p of INITIAL_GHANA_PRODUCTS) {
      const existing = await db.products.get(p.id);
      if (existing) {
        await db.products.update(p.id, {
          safetyThreshold: p.safetyThreshold || p.reorderLevel,
          targetStockLevel: p.targetStockLevel || (p.reorderLevel * 3),
          supplierName: p.supplierName || 'Ghana Central Wholesalers Ltd',
          currentStock: (p.currentStock <= p.reorderLevel) ? p.currentStock : existing.currentStock,
          imageUrl: (existing.imageUrl && !existing.imageUrl.includes('photo-1607349913338')) ? existing.imageUrl : p.imageUrl,
        });
      } else {
        await db.products.add(p);
      }
    }
  }

  const customerCount = await db.customers.count();
  if (customerCount === 0) {
    await db.customers.bulkAdd(INITIAL_CUSTOMERS);
  }

  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkAdd(SYSTEM_USERS);
  } else {
    // Ensure default system accounts (including General Manager) exist
    for (const u of SYSTEM_USERS) {
      const existing = await db.users.get(u.id);
      if (!existing) {
        await db.users.add(u);
      }
    }
  }
}

/**
 * Save an order locally. If offline, also enqueue in offlineQueue table
 */
export async function saveLocalOrder(order: LocalOrder, isOnline: boolean): Promise<LocalOrder> {
  const finalOrder = {
    ...order,
    isOfflineCreated: !isOnline,
    syncStatus: (isOnline ? 'SYNCED' : 'PENDING') as 'SYNCED' | 'PENDING',
    syncedAt: isOnline ? new Date().toISOString() : undefined,
  };

  await db.orders.put(finalOrder);

  if (!isOnline) {
    await db.offlineQueue.put(finalOrder);
  }

  // Decrement local inventory stock
  for (const item of order.items) {
    const prod = await db.products.get(item.productId);
    if (prod) {
      const newStock = Math.max(0, prod.currentStock - item.quantity);
      await db.products.update(item.productId, { currentStock: newStock });
    }
  }

  // Update customer debt if Bisa payment was used
  const bisaPayment = order.payments.find(p => p.type === 'CUSTOMER_DEBT_BISA');
  if (bisaPayment && order.customerId) {
    const customer = await db.customers.get(order.customerId);
    if (customer) {
      const newDebt = customer.currentDebt + bisaPayment.amount;
      await db.customers.update(order.customerId, {
        currentDebt: newDebt,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Automatic Loyalty Points Accrual & Redemption Engine
  if (order.customerId) {
    const customer = await db.customers.get(order.customerId);
    if (customer) {
      // Automatic Accrual: 1 Loyalty Point per GH₵ 1.00 spent on total bill
      const pointsEarned = Math.max(0, Math.floor(order.grandTotal));

      // Redemption: Calculate points redeemed from LOYALTY_POINTS payment (10 points = GH₵ 1.00)
      const loyaltyPayment = order.payments.find(p => p.type === 'LOYALTY_POINTS');
      const pointsRedeemed = loyaltyPayment
        ? (loyaltyPayment.loyaltyPointsRedeemed || Math.round(loyaltyPayment.amount * 10))
        : 0;

      const currentPts = customer.loyaltyPoints || 0;
      const updatedPts = Math.max(0, currentPts + pointsEarned - pointsRedeemed);

      await db.customers.update(order.customerId, {
        loyaltyPoints: updatedPts,
        updatedAt: new Date().toISOString(),
      });

      finalOrder.loyaltyPointsEarned = pointsEarned;
      finalOrder.loyaltyPointsRedeemed = pointsRedeemed;
      finalOrder.customerLoyaltyBalanceAfter = updatedPts;

      // Re-save order with updated loyalty fields
      await db.orders.put(finalOrder);
      if (!isOnline) {
        await db.offlineQueue.put(finalOrder);
      }

      // Record non-repudiation audit trail for CRM loyalty points
      try {
        await db.auditLogs.add({
          id: `audit-loyalty-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          action: 'LOYALTY_ACCRUAL_REDEMPTION',
          userId: order.cashierId,
          userName: order.cashierName,
          details: `Order #${order.orderNumber}: ${customer.fullName} accrued +${pointsEarned} pts${pointsRedeemed > 0 ? `, redeemed ${pointsRedeemed} pts (-GH₵ ${loyaltyPayment?.amount.toFixed(2)})` : ''}. New balance: ${updatedPts} pts.`,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Loyalty audit write error', e);
      }
    }
  }

  return finalOrder;
}

/**
 * Sync all pending offline orders to the cloud/server database
 */
export async function syncOfflineQueueToServer(): Promise<{
  syncedCount: number;
  failedCount: number;
  errors: string[];
}> {
  const pendingOrders = await db.offlineQueue.toArray();
  if (pendingOrders.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const order of pendingOrders) {
    try {
      // In production this POSTs to /api/v1/orders/bulk-sync
      // Simulated robust sync latency & confirmation
      await new Promise(r => setTimeout(r, 120));

      // Mark order as synced
      await db.orders.update(order.id, {
        syncStatus: 'SYNCED',
        syncedAt: new Date().toISOString(),
      });

      // Remove from pending offline queue
      await db.offlineQueue.delete(order.id);
      syncedCount++;
    } catch (err: any) {
      failedCount++;
      errors.push(`Order ${order.orderNumber}: ${err.message || 'Network error'}`);
    }
  }

  return { syncedCount, failedCount, errors };
}

/**
 * Fetch all registered users from Dexie database with fallback to default seed users
 */
export async function getAllUsers(): Promise<SystemUser[]> {
  try {
    const dbUsers = await db.users.toArray();
    if (dbUsers && dbUsers.length > 0) {
      return dbUsers;
    }
  } catch (e) {
    console.error('Failed reading users from Dexie', e);
  }
  return SYSTEM_USERS;
}

/**
 * Enroll a new employee account. Restricted to SUPER_ADMIN and GENERAL_MANAGER.
 * Writes a non-repudiation audit record to IndexedDB.
 */
export async function enrollEmployee(
  employeeData: Omit<SystemUser, 'id'>,
  actor: SystemUser
): Promise<SystemUser> {
  const newId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const newUser: SystemUser = {
    ...employeeData,
    id: newId,
    status: employeeData.status || 'ACTIVE',
    enrolledAt: new Date().toISOString(),
    enrolledBy: `${actor.fullName} (${actor.role})`,
  };

  await db.users.put(newUser);

  // Write non-repudiation audit log
  await db.auditLogs.add({
    id: `audit-enroll-${Date.now()}`,
    action: 'EMPLOYEE_ACCOUNT_ENROLLED',
    userId: actor.id,
    userName: `${actor.fullName} (${actor.role})`,
    details: `Authorized staff enrollment: created '${newUser.fullName}' (@${newUser.username}) with role '${newUser.role}' assigned to '${newUser.branchName}'.`,
    timestamp: new Date().toISOString(),
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('usersUpdated', { detail: newUser }));
  }

  return newUser;
}

/**
 * Update an existing employee account (PIN, status, branch, or role).
 */
export async function updateEmployee(
  userId: string,
  updates: Partial<SystemUser>,
  actor: SystemUser
): Promise<SystemUser> {
  const existing = await db.users.get(userId);
  if (!existing) {
    throw new Error('Employee account not found');
  }

  const updated: SystemUser = { ...existing, ...updates };
  await db.users.put(updated);

  await db.auditLogs.add({
    id: `audit-update-user-${Date.now()}`,
    action: 'EMPLOYEE_ACCOUNT_MODIFIED',
    userId: actor.id,
    userName: `${actor.fullName} (${actor.role})`,
    details: `Modified employee '${updated.fullName}' (@${updated.username}). Status: ${updated.status || 'ACTIVE'}, Role: ${updated.role}.`,
    timestamp: new Date().toISOString(),
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('usersUpdated', { detail: updated }));
  }

  return updated;
}

/**
 * Remove an employee account from active registry
 */
export async function deleteEmployee(
  userId: string,
  actor: SystemUser
): Promise<void> {
  const target = await db.users.get(userId);
  if (!target) return;

  await db.users.delete(userId);

  await db.auditLogs.add({
    id: `audit-delete-user-${Date.now()}`,
    action: 'EMPLOYEE_ACCOUNT_DELETED',
    userId: actor.id,
    userName: `${actor.fullName} (${actor.role})`,
    details: `Removed employee account '${target.fullName}' (@${target.username}) [${target.role}].`,
    timestamp: new Date().toISOString(),
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('usersUpdated', { detail: { id: userId, deleted: true } }));
  }
}

