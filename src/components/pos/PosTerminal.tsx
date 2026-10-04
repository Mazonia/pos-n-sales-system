import React, { useState, useEffect, useRef } from 'react';
import {
  LocalProduct,
  LocalCartItem,
  LocalCustomer,
  LocalOrder,
  LocalOrderPayment,
  saveLocalOrder,
} from '../../utils/dexieSync';
import {
  TaxSchemeType,
  extractTaxFromInclusive,
  formatGhs,
  roundToPesewas,
  generateGraFiscalSignature
} from '../../utils/ghanaTaxEngine';
import { updateShiftWithSale } from '../../utils/shiftManager';
import { SplitPaymentModal } from './SplitPaymentModal';
import { ManagerPinModal } from './ManagerPinModal';
import { ThermalReceipt } from './ThermalReceipt';
import {
  Search,
  Barcode,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  PlayCircle,
  Tag,
  Percent,
  Banknote,
  ChevronDown,
  UserCheck,
  ChevronUp,
  X,
  CreditCard
} from 'lucide-react';

interface ParkedCart {
  id: string;
  name: string;
  items: LocalCartItem[];
  customerId?: string;
  heldAt: string;
}

interface PosTerminalProps {
  products: LocalProduct[];
  customers: LocalCustomer[];
  activeShiftId: string;
  cashierName: string;
  cashierId: string;
  cashierRole: string;
  taxScheme: TaxSchemeType;
  isOnline: boolean;
  branchName: string;
  isDark: boolean;
  onRefreshData?: () => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  products,
  customers,
  activeShiftId,
  cashierName,
  cashierId,
  cashierRole,
  taxScheme,
  isOnline,
  branchName,
  isDark,
  onRefreshData,
}) => {
  // Cart state
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Mobile cart drawer expansion toggle
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Parked Carts ("Hold Orders")
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>([]);
  const [showParkedModal, setShowParkedModal] = useState(false);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<LocalOrder | null>(null);

  // Manager PIN Authorizations
  const [pinModalConfig, setPinModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onAuthorize: (pin: string) => void;
  } | null>(null);

  // Price Override Dialog
  const [priceOverrideItem, setPriceOverrideItem] = useState<{
    itemId: string;
    currentPrice: number;
  } | null>(null);
  const [overrideInputPrice, setOverrideInputPrice] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Discount Dialog
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercentInput, setDiscountPercentInput] = useState<number>(5);

  // Barcode / Search Input Ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract Categories
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtered Products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesName = product.name.toLowerCase().includes(query) || (product.localName && product.localName.toLowerCase().includes(query));
    const matchesSku = product.sku.toLowerCase().includes(query);
    const matchesBarcode = product.barcode.includes(query);

    return matchesCategory && (matchesName || matchesSku || matchesBarcode);
  });

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) handleHoldCart();
      }
      if (e.key === 'F1' || e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentModal(true);
      }
      if (e.code === 'Space' && document.activeElement !== searchInputRef.current && cart.length > 0 && !showPaymentModal) {
        e.preventDefault();
        setShowPaymentModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const match = products.find(
        p => p.barcode === searchQuery.trim() || p.sku.toLowerCase() === searchQuery.toLowerCase().trim()
      );
      if (match) {
        addToCart(match);
        setSearchQuery('');
      }
    }
  };

  const addToCart = (product: LocalProduct, selectedUom?: { name: string; price: number }) => {
    const unitPrice = selectedUom ? selectedUom.price : product.retailPrice;
    const unitName = selectedUom ? selectedUom.name : product.baseUnit;

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.unitName === unitName);
      if (existing) {
        return prev.map(item => {
          if (item === existing) {
            const newQty = item.quantity + 1;
            const newSubtotal = roundToPesewas(newQty * item.unitPrice - item.discountAmount);
            return {
              ...item,
              quantity: newQty,
              lineTotal: newSubtotal,
            };
          }
          return item;
        });
      }

      const newItem: LocalCartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice,
        originalPrice: unitPrice,
        costPrice: product.costPrice,
        quantity: 1,
        unitName,
        discountPct: 0,
        discountAmount: 0,
        lineTotal: unitPrice,
        taxAmount: 0,
      };

      return [...prev, newItem];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const lineSubtotal = roundToPesewas(newQty * item.unitPrice - item.discountAmount);
            return {
              ...item,
              quantity: newQty,
              lineTotal: lineSubtotal,
            };
          }
          return item;
        })
        .filter(Boolean) as LocalCartItem[];
    });
  };

  const requestDeleteItem = (item: LocalCartItem) => {
    if (cashierRole === 'CASHIER') {
      setPinModalConfig({
        isOpen: true,
        title: 'Manager Authorization Required',
        description: `Cashier ${cashierName} requested to void "${item.name}". Please enter Manager PIN.`,
        onAuthorize: () => {
          setCart(prev => prev.filter(i => i.id !== item.id));
          setPinModalConfig(null);
        },
      });
    } else {
      setCart(prev => prev.filter(i => i.id !== item.id));
    }
  };

  const handleExecutePriceOverride = () => {
    if (!priceOverrideItem) return;

    setCart(prev =>
      prev.map(item => {
        if (item.id === priceOverrideItem.itemId) {
          const newTotal = roundToPesewas(item.quantity * overrideInputPrice - item.discountAmount);
          return {
            ...item,
            unitPrice: overrideInputPrice,
            lineTotal: newTotal,
            priceOverridden: true,
            overrideReason: overrideReason || 'Approved customer agreement',
          };
        }
        return item;
      })
    );

    setPriceOverrideItem(null);
    setOverrideReason('');
  };

  const handleApplyDiscount = () => {
    const clampedPct = Math.min(100, Math.max(0, discountPercentInput || 0));
    const isHighDiscount = clampedPct > 5;
    if (isHighDiscount && cashierRole === 'CASHIER') {
      setPinModalConfig({
        isOpen: true,
        title: 'High Discount Authorization',
        description: `Discounts above 5% require Manager PIN approval (Requested: ${clampedPct}%).`,
        onAuthorize: () => {
          applyDiscountCalculation(clampedPct);
          setShowDiscountModal(false);
          setPinModalConfig(null);
        },
      });
    } else {
      applyDiscountCalculation(clampedPct);
      setShowDiscountModal(false);
    }
  };

  const applyDiscountCalculation = (pct: number) => {
    setCart(prev =>
      prev.map(item => {
        const itemGross = item.quantity * item.unitPrice;
        const discountAmt = roundToPesewas((itemGross * pct) / 100);
        return {
          ...item,
          discountPct: pct,
          discountAmount: discountAmt,
          lineTotal: roundToPesewas(itemGross - discountAmt),
        };
      })
    );
  };

  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    const cartName = customer ? customer.fullName : `Held Cart #${parkedCarts.length + 1} (${cart.length} items)`;

    const newParked: ParkedCart = {
      id: `hold-${Date.now()}`,
      name: cartName,
      items: cart,
      customerId: selectedCustomerId,
      heldAt: new Date().toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' }),
    };

    setParkedCarts(prev => [newParked, ...prev]);
    setCart([]);
    setSelectedCustomerId('');
  };

  const resumeCart = (parked: ParkedCart) => {
    setCart(parked.items);
    if (parked.customerId) setSelectedCustomerId(parked.customerId);
    setParkedCarts(prev => prev.filter(c => c.id !== parked.id));
    setShowParkedModal(false);
  };

  // Calculations
  const totalItemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const grossSubtotal = roundToPesewas(cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const discountTotal = roundToPesewas(cart.reduce((sum, item) => sum + item.discountAmount, 0));
  const netOrderAmount = roundToPesewas(grossSubtotal - discountTotal);
  const taxDetail = extractTaxFromInclusive(netOrderAmount, taxScheme);
  const grandTotal = netOrderAmount;

  const handleConfirmPayments = async (payments: LocalOrderPayment[], selectedCustomer?: LocalCustomer) => {
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `RCP-ACC-${dateCode}-${randSuffix}`;
    const orderNumber = `AKW-${dateCode}-${randSuffix}`;

    const { fiscalCode, qrPayload } = generateGraFiscalSignature({
      receiptNumber,
      tinNumber: 'C001889201X',
      grossAmount: grandTotal,
      taxAmount: taxDetail.totalTax,
    });

    const newOrder: LocalOrder = {
      id: `ord-${Date.now()}-${randSuffix}`,
      orderNumber,
      receiptNumber,
      branchId: 'branch-accra-01',
      branchName,
      cashierId,
      cashierName,
      customerId: selectedCustomer?.id || selectedCustomerId,
      customerName: selectedCustomer?.fullName,
      customerPhone: selectedCustomer?.phone,
      shiftId: activeShiftId,
      status: 'COMPLETED',
      items: cart,
      subtotal: grossSubtotal,
      discountTotal,
      taxableBase: taxDetail.taxableBase,
      nhil: taxDetail.nhil,
      getfund: taxDetail.getfund,
      covid: taxDetail.covid,
      vat: taxDetail.vat,
      totalTax: taxDetail.totalTax,
      grandTotal,
      taxScheme,
      payments,
      graFiscalCode: fiscalCode,
      graQrPayload: qrPayload,
      isOfflineCreated: !isOnline,
      syncStatus: isOnline ? 'SYNCED' : 'PENDING',
      createdAt: new Date().toISOString(),
    };

    await saveLocalOrder(newOrder, isOnline);
    await updateShiftWithSale(activeShiftId, newOrder);

    setCart([]);
    setSelectedCustomerId('');
    setShowPaymentModal(false);
    setMobileCartOpen(false);
    setCompletedOrder(newOrder);

    if (onRefreshData) onRefreshData();
  };

  const selectedCustObj = customers.find(c => c.id === selectedCustomerId);

  // Cart Component (shared between desktop sidebar and mobile slide-up sheet)
  const renderCartContent = () => (
    <div className="flex flex-col h-full">
      {/* Cart Customer Link & Held count */}
      <div className={`p-3 border-b flex items-center justify-between gap-2 ${isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-black/[0.06] bg-black/[0.01]'}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <UserCheck className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className={`text-xs font-semibold bg-transparent focus:outline-none w-full truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
          >
            <option value="" className={isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-600'}>
              Walk-in Customer (General)
            </option>
            {customers.map(c => (
              <option key={c.id} value={c.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                {c.fullName} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        {selectedCustObj && (
          <span className="text-[10px] font-mono font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">
            Debt: {formatGhs(selectedCustObj.currentDebt)}
          </span>
        )}

        <button
          type="button"
          onClick={() => setShowParkedModal(true)}
          className={`relative p-1.5 rounded-lg border text-xs transition ${
            isDark
              ? 'border-white/10 hover:bg-white/5 text-slate-300'
              : 'border-black/10 hover:bg-black/5 text-slate-700'
          }`}
          title="View Held Carts"
        >
          <PauseCircle className="w-4 h-4 text-amber-500" />
          {parkedCarts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">
              {parkedCarts.length}
            </span>
          )}
        </button>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-60">
            <ShoppingBag className="w-10 h-10 stroke-[1.2] text-amber-500" />
            <p className="text-xs font-semibold">Active Cart Empty</p>
            <p className="text-[11px] max-w-xs text-slate-400">
              Tap items from the catalogue or use shortcut <kbd className="font-mono text-amber-400 font-bold">F9</kbd> to search products.
            </p>
          </div>
        ) : (
          cart.map(item => (
            <div
              key={item.id}
              className={`p-2.5 rounded-xl border transition ${
                isDark
                  ? 'bg-white/[0.03] border-white/[0.06] hover:border-amber-500/40'
                  : 'bg-white border-black/[0.06] hover:border-amber-500/40 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className={`font-bold text-xs leading-snug truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {item.name}
                  </h5>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                    <span>{item.unitName}</span>
                    <span>·</span>
                    <span>{formatGhs(item.unitPrice)}</span>
                    {item.discountAmount > 0 && (
                      <span className="text-rose-500 font-semibold">(-{formatGhs(item.discountAmount)})</span>
                    )}
                  </div>
                </div>

                <span className={`font-mono font-bold text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {formatGhs(item.lineTotal)}
                </span>
              </div>

              {/* Quantity Controls & Tools */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/[0.05]">
                <div className={`flex items-center rounded-lg border ${isDark ? 'border-white/10 bg-black/20' : 'border-black/10 bg-slate-50'}`}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id || item.productId, -1)}
                    className="p-1 hover:text-amber-500 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className={`px-2 text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id || item.productId, 1)}
                    className="p-1 hover:text-amber-500 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPriceOverrideItem({ itemId: item.id || item.productId, currentPrice: item.unitPrice });
                      setOverrideInputPrice(item.unitPrice);
                    }}
                    className={`p-1 rounded text-slate-400 hover:text-amber-500 transition`}
                    title="Price Override"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteItem(item)}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                    title={cashierRole === 'CASHIER' ? 'Requires Manager PIN to void' : 'Void item'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bill Totals & Checkout Panel */}
      {cart.length > 0 && (
        <div className={`p-3.5 border-t space-y-2 text-xs ${isDark ? 'border-white/[0.08] bg-black/30' : 'border-black/[0.06] bg-slate-50'}`}>
          
          {/* Subtotal & Discounts */}
          <div className="flex justify-between text-slate-400">
            <span>Gross Subtotal:</span>
            <span className={`font-mono font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {formatGhs(grossSubtotal)}
            </span>
          </div>

          {discountTotal > 0 && (
            <div className="flex justify-between text-rose-500 font-medium">
              <span>Discounts Applied:</span>
              <span className="font-mono">-{formatGhs(discountTotal)}</span>
            </div>
          )}

          {/* Statutory GRA Tax Capsule */}
          <div className={`p-2.5 rounded-xl border text-[10px] space-y-0.5 ${
            isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-black/[0.06] shadow-sm'
          }`}>
            <div className="flex justify-between font-semibold">
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>GRA Statutory Scheme:</span>
              <span className="text-amber-500 font-mono">
                {taxScheme === 'STANDARD_VAT' ? 'Standard VAT 21.9%' : taxScheme === 'FLAT_RATE_VFRS' ? 'VFRS Flat 4.0%' : 'Exempt SME'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Taxable Base (P):</span>
              <span className="font-mono">{formatGhs(taxDetail.taxableBase)}</span>
            </div>
            <div className="flex justify-between text-emerald-500 font-semibold border-t border-white/[0.06] pt-0.5">
              <span>Included Levies + VAT:</span>
              <span className="font-mono">{formatGhs(taxDetail.totalTax)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Payable:</span>
            <span className={`text-2xl font-bold font-mono tracking-tight ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              {formatGhs(grandTotal)}
            </span>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleHoldCart}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                isDark
                  ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200'
                  : 'border-black/10 bg-white hover:bg-slate-100 text-slate-800'
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Hold (F4)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDiscountModal(true)}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                isDark
                  ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200'
                  : 'border-black/10 bg-white hover:bg-slate-100 text-slate-800'
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-amber-500" />
              <span>Discount</span>
            </button>
          </div>

          {/* Big Checkout Trigger Button */}
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 active:scale-[0.99] text-slate-950 font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Banknote className="w-5 h-5 text-slate-950" />
            <span>CHECKOUT & RECEIPT</span>
            <span className="font-mono text-base ml-1">({formatGhs(grandTotal)})</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
      
      {/* LEFT COLUMN: PRODUCT SEARCH & GRID (Flexible across screens) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Search Bar & Instant Barcode Input */}
        <div className={`p-3.5 border-b backdrop-blur-md space-y-2.5 ${isDark ? 'border-white/[0.08] bg-black/20' : 'border-black/[0.06] bg-white/70'}`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan barcode or search product / SKU (Press F9)..."
                className={`w-full pl-10 pr-12 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500/40 border ${
                  isDark
                    ? 'bg-slate-950/80 border-white/10 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded">
                F9
              </span>
            </div>

            <div className={`hidden sm:flex items-center px-3 rounded-xl border text-xs font-semibold gap-1.5 ${
              isDark ? 'border-white/10 text-slate-300 bg-white/[0.03]' : 'border-black/10 text-slate-700 bg-white shadow-sm'
            }`}>
              <Barcode className="w-4 h-4 text-amber-500" />
              <span>Laser Scanner Active</span>
            </div>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : isDark
                    ? 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-xs'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 p-3.5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start pb-24 lg:pb-3.5">
          {filteredProducts.map(product => {
            const isOutOfStock = product.currentStock <= 0;
            const isLowStock = product.currentStock > 0 && product.currentStock <= product.reorderLevel;

            return (
              <div
                key={product.id}
                className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 select-none ${
                  isOutOfStock
                    ? 'opacity-50 border-transparent bg-slate-800/20'
                    : isDark
                    ? 'glass-card-dark hover:border-amber-500/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5'
                    : 'glass-card-light hover:border-amber-500/60 hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Category & Stock Status */}
                  <div className="flex items-center justify-between gap-1 mb-1.5 text-[10px] text-slate-400">
                    <span className="truncate font-medium">{product.category}</span>
                    <span
                      className={`font-mono font-bold ${
                        isOutOfStock
                          ? 'text-rose-500'
                          : isLowStock
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                      }`}
                    >
                      {product.currentStock} {product.baseUnit}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className={`font-bold text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-amber-500 transition ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {product.name}
                  </h4>

                  {product.localName && (
                    <span className="text-[10px] text-amber-500 font-medium block truncate mt-0.5">
                      {product.localName}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-500">
                      {formatGhs(product.retailPrice)}
                    </span>
                    <span className="text-[10px] text-slate-400">/{product.baseUnit}</span>
                  </div>

                  {/* Add Button & UOM selector */}
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(product)}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>

                    {product.uomOptions && product.uomOptions.length > 0 && (
                      <div className="relative group/uom">
                        <button
                          type="button"
                          className={`px-2.5 py-2 rounded-xl text-xs border transition ${
                            isDark ? 'border-white/10 hover:bg-white/10 text-white' : 'border-black/10 hover:bg-slate-100 text-slate-800'
                          }`}
                          title="Fractional units"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <div className={`hidden group-hover/uom:block absolute bottom-full right-0 mb-1 z-30 w-48 p-1.5 rounded-2xl shadow-2xl text-xs space-y-1 ${
                          isDark ? 'glass-panel-dark' : 'glass-panel-light'
                        }`}>
                          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Units of Measure:
                          </div>
                          {product.uomOptions.map(uom => (
                            <button
                              key={uom.name}
                              type="button"
                              onClick={() => addToCart(product, uom)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex justify-between items-center transition ${
                                isDark ? 'hover:bg-amber-500 hover:text-slate-950' : 'hover:bg-amber-500 hover:text-slate-950 text-slate-800'
                              }`}
                            >
                              <span className="truncate">{uom.name}</span>
                              <span className="font-mono font-bold">{formatGhs(uom.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: DESKTOP CART (Visible on lg+ screens) */}
      <div className={`hidden lg:flex w-[400px] xl:w-[440px] flex-col h-full border-l transition ${
        isDark ? 'border-white/[0.08] bg-black/40' : 'border-black/[0.06] bg-white/70'
      }`}>
        {renderCartContent()}
      </div>

      {/* MOBILE FLOATING BOTTOM BAR & SLIDE-UP CART SHEET */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 p-3">
        <div className={`p-2.5 rounded-2xl border flex items-center justify-between shadow-2xl backdrop-blur-xl ${
          isDark ? 'glass-panel-dark' : 'glass-panel-light'
        }`}>
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex items-center gap-2.5 flex-1"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold font-mono">
              {totalItemCount}
            </div>
            <div className="text-left">
              <span className={`text-xs block font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Active Order
              </span>
              <span className="text-sm font-extrabold font-mono text-amber-500">
                {formatGhs(grandTotal)}
              </span>
            </div>
          </button>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setShowPaymentModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 active:scale-95 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
          >
            <Banknote className="w-4 h-4" />
            <span>Pay</span>
          </button>
        </div>
      </div>

      {/* MOBILE CART MODAL SHEET */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className={`h-[85vh] w-full rounded-t-3xl flex flex-col overflow-hidden border-t shadow-2xl animate-in slide-in-from-bottom duration-200 ${
            isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-black/10'
          }`}>
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>Active Order ({totalItemCount} items)</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {renderCartContent()}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showPaymentModal && (
        <SplitPaymentModal
          totalAmount={grandTotal}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onConfirmPayments={handleConfirmPayments}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="my-auto">
            <ThermalReceipt order={completedOrder} onClose={() => setCompletedOrder(null)} />
          </div>
        </div>
      )}

      {pinModalConfig && (
        <ManagerPinModal
          title={pinModalConfig.title}
          actionDescription={pinModalConfig.description}
          onAuthorize={pinModalConfig.onAuthorize}
          onCancel={() => setPinModalConfig(null)}
        />
      )}

      {showParkedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-4 space-y-3 ${isDark ? 'glass-panel-dark' : 'glass-panel-light'}`}>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber-500" />
                <span>Parked Held Orders ({parkedCarts.length})</span>
              </h3>
              <button onClick={() => setShowParkedModal(false)} className="text-slate-400 hover:text-white text-xs">
                Close
              </button>
            </div>

            {parkedCarts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No parked orders in hold queue.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {parkedCarts.map(c => (
                  <div key={c.id} className="p-3 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.items.length} items • Held at {c.heldAt}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => resumeCart(c)}
                      className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-xs rounded-2xl shadow-2xl p-4 space-y-3 ${isDark ? 'glass-panel-dark' : 'glass-panel-light'}`}>
            <h3 className="font-bold text-sm">Order Discount (%)</h3>
            <p className="text-[11px] text-slate-400">Cashier allowed up to 5%. Over 5% requires Manager PIN.</p>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercentInput}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setDiscountPercentInput(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                }}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-lg font-mono text-center outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 py-2 bg-white/5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="flex-1 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {priceOverrideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-4 space-y-3 ${isDark ? 'glass-panel-dark' : 'glass-panel-light'}`}>
            <h3 className="font-bold text-sm text-amber-500">Audited Price Override</h3>
            <div className="text-xs text-slate-300">
              Current: <span className="font-mono font-bold">{formatGhs(priceOverrideItem.currentPrice)}</span>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">New Unit Price (GH₵):</label>
              <input
                type="number"
                step="0.1"
                value={overrideInputPrice}
                onChange={e => setOverrideInputPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl font-mono text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Mandatory Override Reason:</label>
              <input
                type="text"
                placeholder="e.g. Near-expiry promo / bulk deal"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPriceOverrideItem(null)}
                className="flex-1 py-2 bg-white/5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecutePriceOverride()}
                className="flex-1 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
