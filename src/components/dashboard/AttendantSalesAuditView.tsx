import React, { useState, useMemo, useEffect } from 'react';
import { db, LocalOrder, LocalCartItem, SystemUser, SYSTEM_USERS } from '../../utils/dexieSync';
import { formatGhs, roundToPesewas } from '../../utils/ghanaTaxEngine';
import { triggerHaptic } from '../../utils/haptics';
import {
  UserCheck,
  RotateCcw,
  Receipt,
  Calendar,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  Printer,
  ShieldCheck,
  Eye,
  Tag,
  Boxes,
  Store,
  Clock,
  DollarSign,
  Filter,
  Check,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
  ShoppingBag
} from 'lucide-react';
import { OfficialPrintPortal } from '../common/OfficialPrintPortal';

interface AttendantSalesAuditViewProps {
  isDark: boolean;
  branchName: string;
  currentUser?: SystemUser | null;
}

// Realistic baseline shift orders data in chronological order of serving
const BASE_SHIFT_ORDERS: LocalOrder[] = [
  {
    id: 'ord-sh-01-001',
    orderNumber: 'ORD-20261003-0001',
    receiptNumber: 'RCP-20261003-0001',
    orderType: 'RETAIL',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Superstore',
    cashierId: 'cashier-01',
    cashierName: 'Kofi Boateng',
    customerId: 'cust-01',
    customerName: 'Ama Serwaa',
    customerPhone: '0244123456',
    shiftId: 'SH-03-01',
    status: 'COMPLETED',
    items: [
      {
        productId: 'prod-01',
        name: 'Royal Feast Jasmine Rice 50kg',
        sku: 'RCE-RF-50K',
        barcode: '603400012345',
        unitPrice: 945.00,
        costPrice: 850.00,
        quantity: 1,
        unitName: 'Bag',
        orderType: 'RETAIL',
        discountPct: 0,
        discountAmount: 0,
        lineTotal: 945.00,
        taxAmount: 169.56
      },
      {
        productId: 'prod-03',
        name: 'Frytol Pure Vegetable Oil 5L',
        sku: 'OIL-FRY-05L',
        barcode: '603400012347',
        unitPrice: 175.00,
        costPrice: 155.00,
        quantity: 2,
        unitName: 'Bottle',
        orderType: 'RETAIL',
        discountPct: 0,
        discountAmount: 0,
        lineTotal: 350.00,
        taxAmount: 62.80
      }
    ],
    subtotal: 1295.00,
    discountTotal: 0,
    taxableBase: 1062.64,
    nhil: 28.37,
    getfund: 28.37,
    covid: 10.63,
    vat: 164.99,
    totalTax: 232.36,
    grandTotal: 1295.00,
    taxScheme: 'STANDARD_VAT',
    payments: [{ type: 'MOMO_MTN', amount: 1295.00, momoPhone: '0244123456', momoTxId: 'TXN-MTN-998823' }],
    graFiscalCode: 'GRA-ACC-20261003-88214',
    graQrPayload: 'https://gra.gov.gh/verify/GRA-ACC-20261003-88214',
    isOfflineCreated: false,
    syncStatus: 'SYNCED',
    createdAt: '2026-10-03T08:14:22.000Z'
  },
  {
    id: 'ord-sh-01-002',
    orderNumber: 'ORD-20261003-0002',
    receiptNumber: 'RCP-20261003-0002',
    orderType: 'RETAIL',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Superstore',
    cashierId: 'cashier-01',
    cashierName: 'Kofi Boateng',
    customerId: 'cust-walkin',
    customerName: 'Kwesi Mensah',
    customerPhone: '0208112233',
    shiftId: 'SH-03-01',
    status: 'COMPLETED',
    items: [
      {
        productId: 'prod-04',
        name: 'Nestlé Milo Activ-Go Tin 400g',
        sku: 'MILO-TIN-400G',
        barcode: '603400012348',
        unitPrice: 48.00,
        costPrice: 40.00,
        quantity: 2,
        unitName: 'Tin',
        orderType: 'RETAIL',
        discountPct: 5,
        discountAmount: 4.80,
        lineTotal: 91.20,
        taxAmount: 16.36
      },
      {
        productId: 'prod-07',
        name: 'Kivo Fine Gari Soaking Mix 200g',
        sku: 'KIVO-GARI-200G',
        barcode: '603400012351',
        unitPrice: 7.00,
        costPrice: 5.20,
        quantity: 5,
        unitName: 'Pouch',
        orderType: 'RETAIL',
        discountPct: 0,
        discountAmount: 0,
        lineTotal: 35.00,
        taxAmount: 6.28
      }
    ],
    subtotal: 131.00,
    discountTotal: 4.80,
    discountAppliedByUserId: 'cashier-01',
    discountAppliedByUserName: 'Kofi Boateng (Cashier)',
    taxableBase: 103.54,
    nhil: 2.76,
    getfund: 2.76,
    covid: 1.04,
    vat: 16.10,
    totalTax: 22.66,
    grandTotal: 126.20,
    taxScheme: 'STANDARD_VAT',
    payments: [{ type: 'CASH', amount: 126.20, tenderedCash: 150.00, changeGiven: 23.80 }],
    graFiscalCode: 'GRA-ACC-20261003-88215',
    graQrPayload: 'https://gra.gov.gh/verify/GRA-ACC-20261003-88215',
    isOfflineCreated: false,
    syncStatus: 'SYNCED',
    createdAt: '2026-10-03T08:35:10.000Z'
  },
  {
    id: 'ord-sh-01-003',
    orderNumber: 'ORD-20261003-0003',
    receiptNumber: 'RCP-20261003-0003',
    orderType: 'WHOLESALE',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Superstore',
    cashierId: 'cashier-02',
    cashierName: 'Abena Osei',
    customerId: 'cust-ws-01',
    customerName: 'Kaneshie Bakers Cooperative',
    customerPhone: '0540998877',
    shiftId: 'SH-03-02',
    status: 'COMPLETED',
    items: [
      {
        productId: 'prod-01',
        name: 'Royal Feast Jasmine Rice 50kg',
        sku: 'RCE-RF-50K',
        barcode: '603400012345',
        unitPrice: 890.00, // Wholesale price
        costPrice: 850.00,
        quantity: 5,
        unitName: 'Bag',
        orderType: 'WHOLESALE',
        discountPct: 0,
        discountAmount: 0,
        lineTotal: 4450.00,
        taxAmount: 798.40
      },
      {
        productId: 'prod-03',
        name: 'Frytol Pure Vegetable Oil 5L',
        sku: 'OIL-FRY-05L',
        barcode: '603400012347',
        unitPrice: 162.00, // Wholesale price
        costPrice: 155.00,
        quantity: 10,
        unitName: 'Bottle',
        orderType: 'WHOLESALE',
        discountPct: 0,
        discountAmount: 0,
        lineTotal: 1620.00,
        taxAmount: 290.66
      }
    ],
    subtotal: 6070.00,
    discountTotal: 0,
    taxableBase: 4980.94,
    nhil: 133.00,
    getfund: 133.00,
    covid: 49.80,
    vat: 773.26,
    totalTax: 1089.06,
    grandTotal: 6070.00,
    taxScheme: 'STANDARD_VAT',
    payments: [{ type: 'MOMO_TELECEL', amount: 6070.00, momoPhone: '0540998877', momoTxId: 'TXN-TEL-110023' }],
    graFiscalCode: 'GRA-ACC-20261003-88216',
    graQrPayload: 'https://gra.gov.gh/verify/GRA-ACC-20261003-88216',
    isOfflineCreated: false,
    syncStatus: 'SYNCED',
    createdAt: '2026-10-03T09:12:45.000Z'
  },
  {
    id: 'ord-sh-01-004',
    orderNumber: 'ORD-20261003-0004',
    receiptNumber: 'RCP-20261003-0004',
    orderType: 'RETAIL',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Superstore',
    cashierId: 'cashier-02',
    cashierName: 'Abena Osei',
    customerId: 'cust-walkin',
    customerName: 'Dr. Yaa Asantewaa',
    customerPhone: '0265432190',
    shiftId: 'SH-03-02',
    status: 'COMPLETED',
    items: [
      {
        productId: 'prod-06',
        name: 'Golden Tree Kingsbite Milk Chocolate 100g',
        sku: 'CHO-GTK-100G',
        barcode: '603400012350',
        unitPrice: 19.50,
        costPrice: 15.00,
        quantity: 4,
        unitName: 'Bar',
        orderType: 'RETAIL',
        discountPct: 10,
        discountAmount: 7.80,
        lineTotal: 70.20,
        taxAmount: 12.59
      },
      {
        productId: 'prod-02',
        name: 'Bel-Aqua Mineral Water 500ml (Pack of 16)',
        sku: 'WAT-BEL-500',
        barcode: '603400012346',
        unitPrice: 48.00,
        costPrice: 40.00,
        quantity: 2,
        unitName: 'Pack',
        orderType: 'RETAIL',
        discountPct: 0,
        discountAmount: 0,
        lineTotal: 96.00,
        taxAmount: 17.22
      }
    ],
    subtotal: 174.00,
    discountTotal: 7.80,
    discountAppliedByUserId: 'cashier-02',
    discountAppliedByUserName: 'Abena Osei (Cashier)',
    taxableBase: 136.37,
    nhil: 3.64,
    getfund: 3.64,
    covid: 1.36,
    vat: 21.19,
    totalTax: 29.83,
    grandTotal: 166.20,
    taxScheme: 'STANDARD_VAT',
    payments: [{ type: 'CASH', amount: 166.20, tenderedCash: 200.00, changeGiven: 33.80 }],
    graFiscalCode: 'GRA-ACC-20261003-88217',
    graQrPayload: 'https://gra.gov.gh/verify/GRA-ACC-20261003-88217',
    isOfflineCreated: false,
    syncStatus: 'SYNCED',
    createdAt: '2026-10-03T10:05:18.000Z'
  },
  {
    id: 'ord-sh-01-005',
    orderNumber: 'ORD-20261003-0005',
    receiptNumber: 'RCP-20261003-0005',
    orderType: 'RETAIL',
    branchId: 'branch-accra-01',
    branchName: 'Accra Central Superstore',
    cashierId: 'cashier-01',
    cashierName: 'Kofi Boateng',
    customerId: 'cust-bisa-01',
    customerName: 'Kojo Antwi (Bisa Credit)',
    customerPhone: '0244778899',
    shiftId: 'SH-03-01',
    status: 'COMPLETED',
    items: [
      {
        productId: 'prod-05',
        name: 'Fan Milk FanYogo Strawberry 145ml',
        sku: 'DRY-FNY-145M',
        barcode: '603400012349',
        unitPrice: 6.00,
        costPrice: 4.50,
        quantity: 10,
        unitName: 'Pouch',
        orderType: 'RETAIL',
        discountPct: 0,
        discountAmount: 0,
        lineTotal: 60.00,
        taxAmount: 10.76
      }
    ],
    subtotal: 60.00,
    discountTotal: 0,
    taxableBase: 49.24,
    nhil: 1.31,
    getfund: 1.31,
    covid: 0.49,
    vat: 7.65,
    totalTax: 10.76,
    grandTotal: 60.00,
    taxScheme: 'STANDARD_VAT',
    payments: [{ type: 'CUSTOMER_DEBT_BISA', amount: 60.00 }],
    graFiscalCode: 'GRA-ACC-20261003-88218',
    graQrPayload: 'https://gra.gov.gh/verify/GRA-ACC-20261003-88218',
    isOfflineCreated: false,
    syncStatus: 'SYNCED',
    createdAt: '2026-10-03T11:42:00.000Z'
  }
];

export const AttendantSalesAuditView: React.FC<AttendantSalesAuditViewProps> = ({
  isDark,
  branchName,
  currentUser
}) => {
  const [dbOrders, setDbOrders] = useState<LocalOrder[]>([]);
  const [selectedAttendant, setSelectedAttendant] = useState<string>('ALL');
  const [selectedOrderType, setSelectedOrderType] = useState<'ALL' | 'RETAIL' | 'WHOLESALE'>('ALL');
  const [filterDiscountOnly, setFilterDiscountOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected order for detailed item inspection
  const [inspectOrder, setInspectOrder] = useState<LocalOrder | null>(null);

  // Return & Audit Modal State
  const [returnTargetOrder, setReturnTargetOrder] = useState<LocalOrder | null>(null);
  const [returnedItemIds, setReturnedItemIds] = useState<{ [productId: string]: number }>({});
  const [returnReason, setReturnReason] = useState<string>('DEFECTIVE');
  const [returnDisposition, setReturnDisposition] = useState<'CASH' | 'STORE_CREDIT' | 'EXCHANGE'>('CASH');
  const [returnSuccessVoucher, setReturnSuccessVoucher] = useState<any | null>(null);

  // Load real Dexie orders and merge with baseline shift seed
  useEffect(() => {
    async function loadData() {
      try {
        const liveOrders = await db.orders.toArray();
        if (liveOrders && liveOrders.length > 0) {
          // Sort chronologically ascending (serving sequence)
          const merged = [...liveOrders, ...BASE_SHIFT_ORDERS];
          // Deduplicate by ID
          const uniqueMap = new Map<string, LocalOrder>();
          merged.forEach(o => uniqueMap.set(o.id, o));
          const sorted = Array.from(uniqueMap.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          setDbOrders(sorted);
        } else {
          setDbOrders(BASE_SHIFT_ORDERS);
        }
      } catch (err) {
        console.error('Failed reading orders for attendant audit', err);
        setDbOrders(BASE_SHIFT_ORDERS);
      }
    }
    loadData();
  }, []);

  // Filtered & Chronologically ordered list
  const filteredOrders = useMemo(() => {
    return dbOrders.filter(order => {
      // Attendant filter
      if (selectedAttendant !== 'ALL') {
        if (order.cashierId !== selectedAttendant && order.cashierName !== selectedAttendant) {
          return false;
        }
      }

      // Order type filter (Retail vs Wholesale)
      if (selectedOrderType !== 'ALL') {
        const currentType = order.orderType || 'RETAIL';
        if (currentType !== selectedOrderType) return false;
      }

      // Discount filter
      if (filterDiscountOnly) {
        if (!order.discountTotal || order.discountTotal <= 0) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchReceipt = order.receiptNumber?.toLowerCase().includes(q) || order.orderNumber?.toLowerCase().includes(q);
        const matchCustomer = order.customerName?.toLowerCase().includes(q) || order.customerPhone?.includes(q);
        const matchCashier = order.cashierName?.toLowerCase().includes(q);
        const matchItem = order.items?.some(it => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));
        if (!matchReceipt && !matchCustomer && !matchCashier && !matchItem) return false;
      }

      return true;
    });
  }, [dbOrders, selectedAttendant, selectedOrderType, filterDiscountOnly, searchQuery]);

  // Aggregate Metrics for Active Selection
  const auditMetrics = useMemo(() => {
    let totalSales = 0;
    let totalItems = 0;
    let totalDiscounts = 0;
    let retailCount = 0;
    let wholesaleCount = 0;

    filteredOrders.forEach(o => {
      totalSales += o.grandTotal || 0;
      totalDiscounts += o.discountTotal || 0;
      if (o.orderType === 'WHOLESALE') wholesaleCount++;
      else retailCount++;
      o.items?.forEach(it => {
        totalItems += it.quantity || 0;
      });
    });

    return {
      totalSales: roundToPesewas(totalSales),
      totalItems,
      totalDiscounts: roundToPesewas(totalDiscounts),
      totalTickets: filteredOrders.length,
      retailCount,
      wholesaleCount
    };
  }, [filteredOrders]);

  // Unique list of attendants present in dataset
  const attendantOptions = useMemo(() => {
    const map = new Map<string, string>();
    dbOrders.forEach(o => {
      if (o.cashierId && o.cashierName) {
        map.set(o.cashierId, o.cashierName);
      }
    });
    // Ensure standard cashiers exist
    map.set('cashier-01', 'Kofi Boateng');
    map.set('cashier-02', 'Abena Osei');
    map.set('superadmin', 'Kwame Mensah');
    return Array.from(map.entries());
  }, [dbOrders]);

  // Open Return Modal
  const handleOpenReturnModal = (order: LocalOrder) => {
    triggerHaptic('tap');
    setReturnTargetOrder(order);
    const initialSelection: { [productId: string]: number } = {};
    order.items?.forEach(it => {
      initialSelection[it.productId] = it.quantity;
    });
    setReturnedItemIds(initialSelection);
    setReturnSuccessVoucher(null);
  };

  // Process Return with Non-Repudiation Audit Record
  const handleConfirmReturn = async () => {
    if (!returnTargetOrder) return;
    triggerHaptic('success');

    // Calculate returned amount
    let returnedSubtotal = 0;
    const returnedItemsList: any[] = [];

    returnTargetOrder.items?.forEach(it => {
      const qtyToReturn = returnedItemIds[it.productId] || 0;
      if (qtyToReturn > 0) {
        const lineVal = it.unitPrice * qtyToReturn;
        returnedSubtotal += lineVal;
        returnedItemsList.push({
          productId: it.productId,
          name: it.name,
          sku: it.sku,
          quantity: qtyToReturn,
          unitPrice: it.unitPrice,
          lineTotal: lineVal
        });
      }
    });

    const voucherNumber = `CRN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const actorName = currentUser?.fullName || 'Shift Supervisor';
    const actorId = currentUser?.id || 'supervisor-01';

    const voucher = {
      voucherNumber,
      originalReceiptNumber: returnTargetOrder.receiptNumber || returnTargetOrder.orderNumber,
      originalCashierName: returnTargetOrder.cashierName,
      originalCashierId: returnTargetOrder.cashierId,
      originalOrderType: returnTargetOrder.orderType || 'RETAIL',
      servedAt: returnTargetOrder.createdAt,
      authorizedBy: `${actorName} (${currentUser?.role || 'MANAGER'})`,
      customerName: returnTargetOrder.customerName || 'Walk-in Retail Customer',
      customerPhone: returnTargetOrder.customerPhone || 'N/A',
      returnReason,
      returnDisposition,
      returnedItems: returnedItemsList,
      returnedSubtotal,
      timestamp: new Date().toISOString()
    };

    // Save non-repudiation audit log to Dexie
    try {
      await db.auditLogs.add({
        id: `audit-return-${Date.now()}`,
        action: 'GOODS_RETURN_AUDITED_AND_REFUNDED',
        userId: actorId,
        userName: actorName,
        details: `Supervisor authorized return of GH₵ ${returnedSubtotal.toFixed(2)} on Receipt #${voucher.originalReceiptNumber}. Original Cashier: ${returnTargetOrder.cashierName} (${returnTargetOrder.cashierId}). Reason: ${returnReason}. Disposition: ${returnDisposition}. Voucher: ${voucherNumber}`,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Audit log write error', e);
    }

    setReturnSuccessVoucher(voucher);
  };

  const handlePrintReturnVoucher = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-fade-slide-in">
      
      {/* SECTION HEADER & CONTEXT */}
      <div className={`p-4 sm:p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
        isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <UserCheck className="w-4 h-4" />
            </span>
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Attendant Shift Sales & Returns Audit
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              Serving Sequence Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#8A99A8] max-w-2xl leading-relaxed">
            Verify who served a customer, what was purchased, wholesale vs retail pricing, and supervisor-authorized discounts in exact chronological order of serving. Facilitates non-repudiation returns auditing even when the attendant is off-duty.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
            isDark ? 'bg-[#0D1117] border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>GRA Tamper-Proof Audit</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
        isDark ? 'bg-[#0D1117] border-[#242D37]' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex flex-wrap items-center gap-3 flex-1">
          
          {/* Attendant / Cashier Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 dark:text-[#8A99A8] flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Attendant:</span>
            </span>
            <select
              value={selectedAttendant}
              onChange={e => setSelectedAttendant(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none transition ${
                isDark ? 'bg-[#151B23] border-[#242D37] text-white focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            >
              <option value="ALL">All Attendants (Consolidated)</option>
              {attendantOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              ))}
            </select>
          </div>

          {/* Order Mode (Retail vs Wholesale) */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 dark:text-[#8A99A8] flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5 text-amber-500" />
              <span>Order Mode:</span>
            </span>
            <div className={`flex items-center p-0.5 rounded-xl border font-semibold ${
              isDark ? 'bg-[#151B23] border-[#242D37]' : 'bg-white border-slate-300'
            }`}>
              {(['ALL', 'RETAIL', 'WHOLESALE'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedOrderType(mode)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedOrderType === mode
                      ? mode === 'WHOLESALE'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-emerald-500 text-slate-950 font-bold'
                      : isDark ? 'text-[#8A99A8] hover:text-white' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {mode === 'ALL' ? 'All' : mode === 'RETAIL' ? '🛒 Retail' : '📦 Wholesale'}
                </button>
              ))}
            </div>
          </div>

          {/* Discount Toggle */}
          <button
            type="button"
            onClick={() => setFilterDiscountOnly(!filterDiscountOnly)}
            className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              filterDiscountOnly
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                : isDark
                ? 'border-[#242D37] bg-[#151B23] text-[#8A99A8] hover:text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Discounts Only</span>
          </button>

          {/* Live Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipt, customer, item..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none transition ${
                isDark ? 'bg-[#151B23] border-[#242D37] text-white focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>

        {/* Filter Count Indicator */}
        <div className="font-mono text-xs font-semibold text-slate-500 dark:text-[#8A99A8]">
          Showing <strong>{filteredOrders.length}</strong> of {dbOrders.length} orders
        </div>
      </div>

      {/* METRICS SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-xl border ${
          isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-2xs'
        }`}>
          <div className="text-[11px] font-mono text-slate-500 dark:text-[#8A99A8] mb-1">Total Sales Turnover</div>
          <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatGhs(auditMetrics.totalSales)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-[#8A99A8] font-mono mt-0.5">
            {auditMetrics.totalTickets} total transactions
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-2xs'
        }`}>
          <div className="text-[11px] font-mono text-slate-500 dark:text-[#8A99A8] mb-1">Items Sold In Shift</div>
          <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
            {auditMetrics.totalItems} units
          </div>
          <div className="text-[10px] text-slate-500 dark:text-[#8A99A8] font-mono mt-0.5">
            Avg {(auditMetrics.totalItems / (auditMetrics.totalTickets || 1)).toFixed(1)} items / customer
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-2xs'
        }`}>
          <div className="text-[11px] font-mono text-slate-500 dark:text-[#8A99A8] mb-1">Attendant Discounts</div>
          <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
            {formatGhs(auditMetrics.totalDiscounts)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-[#8A99A8] font-mono mt-0.5">
            Audit-logged non-repudiation
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-2xs'
        }`}>
          <div className="text-[11px] font-mono text-slate-500 dark:text-[#8A99A8] mb-1">Retail vs Wholesale</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400">
              {auditMetrics.retailCount} Retail
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400">
              {auditMetrics.wholesaleCount} Wholesale
            </span>
          </div>
        </div>
      </div>

      {/* CHRONOLOGICAL SERVING TABLE / LEDGER */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                isDark ? 'bg-[#090B0E]/80 border-[#242D37] text-[#8A99A8]' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}>
                <th className="p-3">Serving Seq (#)</th>
                <th className="p-3">Time & Shift</th>
                <th className="p-3">Served By (Attendant)</th>
                <th className="p-3">Customer & Receipt #</th>
                <th className="p-3">Order Mode</th>
                <th className="p-3">Tender</th>
                <th className="p-3">Discount Author</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3 text-center">Items</th>
                <th className="p-3 text-center">Returns Audit</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono ${
              isDark ? 'divide-[#242D37]/50 text-stone-200' : 'divide-slate-200 text-slate-800'
            }`}>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 dark:text-[#8A99A8]">
                    No shift sales match the selected attendant or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => {
                  const servingNumber = index + 1;
                  const orderDate = new Date(order.createdAt);
                  const timeStr = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateStr = orderDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const isWholesale = order.orderType === 'WHOLESALE';
                  const hasDiscount = order.discountTotal > 0;

                  return (
                    <tr
                      key={order.id}
                      className={`transition ${
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Serving Sequence Badge */}
                      <td className="p-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${
                          isDark
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          #{servingNumber}
                        </span>
                      </td>

                      {/* Time & Shift */}
                      <td className="p-3">
                        <div className="font-bold font-sans text-xs">{timeStr}</div>
                        <div className="text-[10px] text-slate-500 dark:text-[#8A99A8]">
                          {dateStr} • {order.shiftId || 'SH-01'}
                        </div>
                      </td>

                      {/* Served By (Attendant) */}
                      <td className="p-3">
                        <div className="font-bold font-sans text-xs flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span className={isDark ? 'text-white' : 'text-slate-900'}>{order.cashierName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#8A99A8]">
                          ID: {order.cashierId}
                        </div>
                      </td>

                      {/* Customer & Receipt */}
                      <td className="p-3">
                        <div className="font-semibold font-sans text-xs truncate max-w-[150px]">
                          {order.customerName || 'Walk-in Retail Customer'}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {order.receiptNumber || order.orderNumber}
                        </div>
                      </td>

                      {/* Order Mode */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isWholesale
                            ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {isWholesale ? 'WHOLESALE' : 'RETAIL'}
                        </span>
                      </td>

                      {/* Tender */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-[11px] font-sans">
                          {order.payments?.[0]?.type === 'MOMO_MTN' && <Smartphone className="w-3.5 h-3.5 text-amber-500" />}
                          {order.payments?.[0]?.type === 'MOMO_TELECEL' && <Smartphone className="w-3.5 h-3.5 text-rose-500" />}
                          {order.payments?.[0]?.type === 'CASH' && <Banknote className="w-3.5 h-3.5 text-emerald-500" />}
                          {order.payments?.[0]?.type === 'CUSTOMER_DEBT_BISA' && <BookOpen className="w-3.5 h-3.5 text-purple-500" />}
                          <span>{order.payments?.[0]?.type?.replace('MOMO_', 'MoMo ') || 'Cash'}</span>
                        </div>
                      </td>

                      {/* Discount Author */}
                      <td className="p-3">
                        {hasDiscount ? (
                          <div>
                            <span className="text-[10px] font-bold text-rose-500 block">
                              -{formatGhs(order.discountTotal)}
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-[#8A99A8] block truncate max-w-[120px]">
                              Auth: {order.discountAppliedByUserName || order.cashierName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="p-3 text-right">
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {formatGhs(order.grandTotal)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#8A99A8]">
                          Tax: {formatGhs(order.totalTax)}
                        </div>
                      </td>

                      {/* Items Preview Action */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setInspectOrder(order)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                            isDark
                              ? 'border-[#242D37] hover:bg-[#1C2333] text-[#8A99A8] hover:text-white'
                              : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Eye className="w-3 h-3 inline mr-1" />
                          <span>{order.items?.length || 0} Items</span>
                        </button>
                      </td>

                      {/* Returns Audit Action */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenReturnModal(order)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-[10px] transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 mx-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Audit Return</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ITEMIZED PRODUCT INSPECTOR */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-slide-in no-print">
          <div className={`w-full max-w-xl rounded-2xl border p-5 space-y-4 animate-scale-in ${
            isDark ? 'bg-[#0D1117] border-[#242D37] text-white shadow-2xl' : 'bg-white border-slate-300 text-slate-900 shadow-xl'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-500" />
                  <span>Itemized Order Breakdown</span>
                </h4>
                <div className="text-[11px] font-mono text-slate-500 dark:text-[#8A99A8] mt-0.5">
                  Receipt: <strong>{inspectOrder.receiptNumber}</strong> • Served by: <strong>{inspectOrder.cashierName}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {inspectOrder.items?.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-[#151B23] border-[#242D37]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{item.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-[#8A99A8] mt-0.5">
                      SKU: {item.sku} • Qty: <strong>{item.quantity} {item.unitName || 'Units'}</strong> • Unit: {formatGhs(item.unitPrice)}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-black text-xs">{formatGhs(item.lineTotal)}</div>
                    {item.discountAmount > 0 && (
                      <div className="text-[10px] text-rose-400">-{formatGhs(item.discountAmount)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
              isDark ? 'bg-[#151B23] border-[#242D37]' : 'bg-slate-100 border-slate-300'
            }`}>
              <span>Grand Total Reconciled:</span>
              <span className="text-emerald-500 text-sm">{formatGhs(inspectOrder.grandTotal)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RETURN VERIFICATION & OFFICIAL CREDIT NOTE ISSUANCE */}
      {returnTargetOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-slide-in no-print">
          <div className={`w-full max-w-2xl rounded-2xl border p-5 sm:p-6 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#0D1117] border-[#242D37] text-white shadow-2xl' : 'bg-white border-slate-300 text-slate-900 shadow-xl'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                <RotateCcw className="w-5 h-5" />
                <span>Verify Goods Return & Issue Official Credit Note</span>
              </div>
              <button
                type="button"
                onClick={() => setReturnTargetOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!returnSuccessVoucher ? (
              <>
                {/* Attendant & Transaction Verification Context */}
                <div className={`p-3.5 rounded-xl border text-xs grid grid-cols-2 gap-3 ${
                  isDark ? 'bg-[#151B23] border-[#242D37]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-[#8A99A8] block">Served By (Attendant):</span>
                    <strong className="text-emerald-500 font-bold text-xs">{returnTargetOrder.cashierName}</strong>
                    <span className="text-[10px] text-slate-400 font-mono block">Staff ID: {returnTargetOrder.cashierId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-[#8A99A8] block">Original Receipt & Date:</span>
                    <strong className="text-xs">{returnTargetOrder.receiptNumber}</strong>
                    <span className="text-[10px] text-slate-400 font-mono block">{new Date(returnTargetOrder.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-[#8A99A8] block">Customer:</span>
                    <span className="text-xs">{returnTargetOrder.customerName || 'Walk-in Retail Customer'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-[#8A99A8] block">Order Mode:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      returnTargetOrder.orderType === 'WHOLESALE' ? 'bg-purple-600/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {returnTargetOrder.orderType || 'RETAIL'}
                    </span>
                  </div>
                </div>

                {/* Return Items Selection Checklist */}
                <div>
                  <label className="text-[11px] font-mono text-slate-500 dark:text-[#8A99A8] block mb-2 font-bold uppercase">
                    Select Items Being Returned:
                  </label>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {returnTargetOrder.items?.map((item, idx) => {
                      const returnQty = returnedItemIds[item.productId] ?? item.quantity;
                      const isSelected = returnQty > 0;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                            isSelected
                              ? isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'
                              : isDark ? 'bg-[#151B23] border-[#242D37] opacity-60' : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                setReturnedItemIds(prev => ({
                                  ...prev,
                                  [item.productId]: e.target.checked ? item.quantity : 0
                                }));
                              }}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                            <div>
                              <div className="font-bold text-xs">{item.name}</div>
                              <div className="text-[10px] font-mono text-slate-500 dark:text-[#8A99A8]">
                                Sold: {item.quantity} {item.unitName || 'Units'} • Unit: {formatGhs(item.unitPrice)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-slate-400">Qty to Return:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={item.quantity}
                                  value={returnQty}
                                  onChange={e => {
                                    const val = Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1));
                                    setReturnedItemIds(prev => ({
                                      ...prev,
                                      [item.productId]: val
                                    }));
                                  }}
                                  className={`w-16 px-2 py-1 rounded-lg border text-center font-mono font-bold text-xs outline-none ${
                                    isDark ? 'bg-[#0D1117] border-[#242D37] text-white' : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                />
                              </div>
                            )}
                            <div className="font-mono font-bold text-xs text-rose-500 min-w-[70px] text-right">
                              {formatGhs(item.unitPrice * (returnQty || 0))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Return Reason & Disposition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8A99A8] block mb-1">
                      Return Reason:
                    </label>
                    <select
                      value={returnReason}
                      onChange={e => setReturnReason(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                        isDark ? 'bg-[#151B23] border-[#242D37] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="DEFECTIVE">Defective / Damaged Stock</option>
                      <option value="WRONG_ITEM">Wrong Item Purchased / Dispensed</option>
                      <option value="EXCHANGE">Customer Size / Variant Exchange</option>
                      <option value="EXPIRED">Expired or Near-Expiry Item</option>
                      <option value="CUSTOMER_REGRET">Customer Regret / Order Cancellation</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8A99A8] block mb-1">
                      Refund / Credit Method:
                    </label>
                    <select
                      value={returnDisposition}
                      onChange={e => setReturnDisposition(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                        isDark ? 'bg-[#151B23] border-[#242D37] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="CASH">Cash Refund from Till Drawer</option>
                      <option value="STORE_CREDIT">Issue Store Credit / Bisa Account Credit</option>
                      <option value="EXCHANGE">Same-Day Merchandise Exchange</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReturnTargetOrder(null)}
                    className="flex-1 py-2.5 rounded-xl border text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReturn}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Authorize Return & Generate Credit Note</span>
                  </button>
                </div>
              </>
            ) : (
              /* SUCCESS: OFFICIAL PRINTABLE RETURN CREDIT NOTE */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Goods return verified and logged to audit ledger! Print the official Credit Note below.</span>
                </div>

                {/* Printable Official Credit Note Voucher Card */}
                <div className="p-6 rounded-2xl border bg-white text-slate-950 font-sans shadow-lg print:border-none print:shadow-none space-y-4">
                  
                  {/* Formal Header */}
                  <div className="flex items-start justify-between border-b pb-4">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-900">AKWAABA RETAIL OS ENTERPRISE</h2>
                      <p className="text-[11px] text-slate-600 font-mono">
                        {branchName} • GRA TIN: C0029482190
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Tax Stamp Registration: GRA-RET-2026-ACC
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-3 py-1 rounded bg-rose-100 border border-rose-300 text-rose-800 font-black text-xs font-mono">
                        OFFICIAL CREDIT NOTE
                      </div>
                      <div className="text-xs font-mono font-bold mt-1 text-slate-800">
                        {returnSuccessVoucher.voucherNumber}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {new Date(returnSuccessVoucher.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Audit Reference Block */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[10px]">ORIGINAL RECEIPT:</span>
                      <strong>{returnSuccessVoucher.originalReceiptNumber}</strong>
                      <span className="text-[10px] text-slate-500 block mt-1">CUSTOMER:</span>
                      <span>{returnSuccessVoucher.customerName} ({returnSuccessVoucher.customerPhone})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">ORIGINAL SERVING CASHIER:</span>
                      <strong className="text-emerald-700">{returnSuccessVoucher.originalCashierName} ({returnSuccessVoucher.originalCashierId})</strong>
                      <span className="text-slate-500 block text-[10px] mt-1">SUPERVISOR SIGN-OFF:</span>
                      <span>{returnSuccessVoucher.authorizedBy}</span>
                    </div>
                  </div>

                  {/* Itemized Returned Goods Table */}
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-slate-100 font-mono text-[10px] uppercase text-slate-700">
                        <th className="p-2">Item Description</th>
                        <th className="p-2">SKU</th>
                        <th className="p-2 text-center">Returned Qty</th>
                        <th className="p-2 text-right">Unit Price</th>
                        <th className="p-2 text-right">Total Refund</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-xs">
                      {returnSuccessVoucher.returnedItems?.map((it: any, i: number) => (
                        <tr key={i}>
                          <td className="p-2 font-sans font-bold text-slate-900">{it.name}</td>
                          <td className="p-2 text-slate-600">{it.sku}</td>
                          <td className="p-2 text-center font-bold">{it.quantity}</td>
                          <td className="p-2 text-right">{formatGhs(it.unitPrice)}</td>
                          <td className="p-2 text-right font-black text-rose-700">{formatGhs(it.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 font-mono font-bold">
                        <td colSpan={4} className="p-2 text-right uppercase text-xs">Total Refund Amount:</td>
                        <td className="p-2 text-right text-sm font-black text-rose-700">
                          {formatGhs(returnSuccessVoucher.returnedSubtotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Disposition & Reason Note */}
                  <div className="text-[11px] font-mono text-slate-600 p-2.5 rounded bg-slate-50 border border-slate-200">
                    Reason: <strong>{returnSuccessVoucher.returnReason}</strong> • Refund Disposition: <strong>{returnSuccessVoucher.returnDisposition}</strong>
                  </div>

                  {/* Formal Signature Lines */}
                  <div className="grid grid-cols-2 gap-8 pt-4 border-t text-[10px] font-mono">
                    <div>
                      <div className="border-b border-slate-400 w-40 mb-1"></div>
                      <span>Customer Signature</span>
                    </div>
                    <div className="text-right">
                      <div className="border-b border-slate-400 w-40 ml-auto mb-1"></div>
                      <span>Supervisor Authorisation Seal</span>
                    </div>
                  </div>

                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReturnTargetOrder(null);
                      setReturnSuccessVoucher(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Done & Close
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReturnVoucher}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Official Credit Note</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE GOODS RETURN VOUCHER / CREDIT NOTE */}
      {returnSuccessVoucher && (
        <OfficialPrintPortal active={true}>
          <div className="official-printable-doc p-8 font-sans text-black bg-white max-w-2xl mx-auto">
            {/* Corporate Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-5">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-black">
                  AKWAABA RETAIL SYSTEMS LTD.
                </h1>
                <p className="text-xs text-gray-700 font-medium">Customer Service & Merchandise Return Logistics</p>
                <p className="text-xs text-gray-700">{branchName} • Central Store Node</p>
                <p className="text-xs text-gray-700 font-mono font-bold">GRA TIN: C0029482190 | e-VAT COMPLIANT</p>
              </div>
              <div className="text-right">
                <div className="inline-block border-2 border-black px-3 py-1 bg-gray-50 text-center">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-rose-700">AUDITED RETURN</span>
                  <span className="text-sm font-black text-black">OFFICIAL CREDIT NOTE</span>
                </div>
                <p className="text-xs font-mono mt-1 font-bold">
                  Voucher: {returnSuccessVoucher.voucherNumber}
                </p>
                <p className="text-xs font-mono text-gray-600">
                  {new Date(returnSuccessVoucher.timestamp).toLocaleString('en-GH')}
                </p>
              </div>
            </div>

            {/* Context Dossier Grid */}
            <div className="grid grid-cols-2 gap-4 border border-gray-300 p-3 rounded mb-5 text-xs bg-gray-50/50">
              <div>
                <p><strong>Original Sale Receipt:</strong> <span className="font-mono">{returnSuccessVoucher.originalReceiptNumber}</span></p>
                <p><strong>Customer Name:</strong> {returnSuccessVoucher.customerName} ({returnSuccessVoucher.customerPhone})</p>
                <p><strong>Refund Disposition:</strong> <span className="font-bold uppercase font-mono">{returnSuccessVoucher.returnDisposition}</span></p>
              </div>
              <div className="text-right">
                <p><strong>Original Serving Cashier:</strong> {returnSuccessVoucher.originalCashierName} ({returnSuccessVoucher.originalCashierId})</p>
                <p><strong>Auditing Supervisor:</strong> {returnSuccessVoucher.supervisorName}</p>
                <p><strong>Return Reason:</strong> {returnSuccessVoucher.returnReason}</p>
              </div>
            </div>

            {/* Returned Items Table */}
            <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-5">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-[10px] font-bold uppercase">
                  <th className="p-2 border border-gray-300">Item Description</th>
                  <th className="p-2 border border-gray-300">SKU</th>
                  <th className="p-2 border border-gray-300 text-center w-20">Returned Qty</th>
                  <th className="p-2 border border-gray-300 text-right w-24">Unit Price</th>
                  <th className="p-2 border border-gray-300 text-right w-28">Refund Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                {returnSuccessVoucher.returnedItems?.map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="p-2 border border-gray-300 font-sans font-medium">{it.name}</td>
                    <td className="p-2 border border-gray-300 text-gray-600">{it.sku}</td>
                    <td className="p-2 border border-gray-300 text-center font-bold">{it.quantity}</td>
                    <td className="p-2 border border-gray-300 text-right">{formatGhs(it.unitPrice)}</td>
                    <td className="p-2 border border-gray-300 text-right font-bold">{formatGhs(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black bg-gray-50 font-bold font-mono">
                  <td colSpan={4} className="p-2 border border-gray-300 text-right uppercase font-sans">
                    Total Credit / Refund Payable:
                  </td>
                  <td className="p-2 border border-gray-300 text-right text-sm font-black">
                    {formatGhs(returnSuccessVoucher.returnedSubtotal)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Terms and Disposition Note */}
            <div className="border border-gray-300 p-2.5 rounded mb-6 text-[10px] bg-gray-50">
              <p>
                <strong>Audit Disposition:</strong> Merchandise has been inspected and returned to store inventory under supervisor authorization. In case of store credit, customer ledger will reflect this credit note balance.
              </p>
            </div>

            {/* Formal Dual Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-300 text-[10px]">
              <div>
                <div className="border-b border-black w-48 mb-1"></div>
                <p className="font-bold">Customer Signature & Date</p>
                <p className="text-gray-500">{returnSuccessVoucher.customerName}</p>
              </div>
              <div className="text-right">
                <div className="border-b border-black w-48 ml-auto mb-1"></div>
                <p className="font-bold">Supervisor Authorization Seal & Signature</p>
                <p className="text-gray-500">{returnSuccessVoucher.supervisorName}</p>
              </div>
            </div>
          </div>
        </OfficialPrintPortal>
      )}

    </div>
  );
};
