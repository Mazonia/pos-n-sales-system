import React, { useState, useEffect, useRef } from 'react';
import {
  LocalProduct,
  LocalCartItem,
  LocalCustomer,
  LocalOrder,
  LocalOrderPayment,
  saveLocalOrder,
  SystemUser,
  db,
} from '../../utils/dexieSync';
import {
  TaxSchemeType,
  extractTaxFromInclusive,
  roundToPesewas,
  generateGraFiscalSignature,
  formatGhs
} from '../../utils/ghanaTaxEngine';
import { updateShiftWithSale } from '../../utils/shiftManager';
import { triggerHaptic } from '../../utils/haptics';
import { ProductCard } from './ProductCard';
import { CartLedger } from './CartLedger';
import { PaymentModal } from './PaymentModal';
import { ManagerPinModal } from './ManagerPinModal';
import { ThermalReceipt } from './ThermalReceipt';
import {
  Search,
  Barcode,
  ShoppingBag,
  PauseCircle,
  PlayCircle,
  Percent,
  Banknote,
  X,
  Keyboard,
  ArrowUpRight,
  Sparkles,
  Lock
} from 'lucide-react';

interface ParkedCart {
  id: string;
  name: string;
  items: LocalCartItem[];
  customerId?: string;
  heldAt: string;
}

interface PosTerminalViewProps {
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

export const PosTerminalView: React.FC<PosTerminalViewProps> = ({
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

  // Mobile cart sheet toggle
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Parked Carts
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>([]);
  const [showParkedModal, setShowParkedModal] = useState(false);

  // Checkout & Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<LocalOrder | null>(null);

  // Manager PIN Modal
  const [pinModalConfig, setPinModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onAuthorize: (pin: string, authorizedUser?: any) => void;
  } | null>(null);

  // Price Override & Discount Modals
  const [priceOverrideItem, setPriceOverrideItem] = useState<{
    itemId: string;
    currentPrice: number;
  } | null>(null);
  const [overrideInputPrice, setOverrideInputPrice] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercentInput, setDiscountPercentInput] = useState<number>(5);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesName = product.name.toLowerCase().includes(query) || (product.localName && product.localName.toLowerCase().includes(query));
    const matchesSku = product.sku.toLowerCase().includes(query);
    const matchesBarcode = product.barcode.includes(query);

    return matchesCategory && (matchesName || matchesSku || matchesBarcode);
  });

  // Global Keyboard Shortcuts (F1: Cash, F2: MoMo, F4: Hold, F9 / Cmd+K: Search, Space: Pay)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
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
    triggerHaptic('add');
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
    triggerHaptic('tap');
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

  const handleInitiatePriceOverride = () => {
    if (!priceOverrideItem) return;
    if (overrideInputPrice < 0) {
      alert('Override price cannot be negative.');
      return;
    }
    if (!overrideReason.trim()) {
      alert('Please specify a mandatory justification / reason for this price override.');
      return;
    }

    const targetItem = cart.find(i => i.id === priceOverrideItem.itemId);
    const itemName = targetItem ? targetItem.name : 'Line Item';
    const originalPrice = targetItem ? targetItem.originalPrice : priceOverrideItem.currentPrice;

    // Trigger Manager PIN Verification Modal
    setPinModalConfig({
      isOpen: true,
      title: 'Manager PIN Price Override Verification',
      description: `Authorize price override for "${itemName}" from GH₵${originalPrice.toFixed(2)} to GH₵${overrideInputPrice.toFixed(2)}. Justification: "${overrideReason.trim()}". Please enter Manager PIN.`,
      onAuthorize: async (pin: string, authorizedUser?: any) => {
        const mgrName = authorizedUser?.fullName || 'Store Manager';
        const mgrRole = authorizedUser?.role || 'BRANCH_MANAGER';
        const delta = overrideInputPrice - originalPrice;

        // Log to Dexie AuditLog for non-repudiation
        try {
          await db.auditLogs.add({
            id: `audit-override-${Date.now()}`,
            action: 'PRICE_OVERRIDE',
            userId: cashierId,
            userName: cashierName,
            details: `PRICE OVERRIDE AUTHORIZED: Line item "${itemName}" (SKU: ${targetItem?.sku || 'N/A'}) unit price modified from GH₵${originalPrice.toFixed(2)} to GH₵${overrideInputPrice.toFixed(2)} (${delta < 0 ? 'Discount' : 'Markup'}: GH₵${Math.abs(delta).toFixed(2)}). Justification: "${overrideReason.trim()}". Approved by ${mgrName} (${mgrRole}) at branch "${branchName}". Non-repudiation seal: AKW-PO-${Date.now().toString(36).toUpperCase()}`,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Failed to write audit log for price override', err);
        }

        // Apply override to cart item
        setCart(prev =>
          prev.map(item => {
            if (item.id === priceOverrideItem.itemId) {
              const newTotal = roundToPesewas(item.quantity * overrideInputPrice - item.discountAmount);
              return {
                ...item,
                unitPrice: overrideInputPrice,
                lineTotal: newTotal,
                priceOverridden: true,
                overrideReason: overrideReason.trim(),
              };
            }
            return item;
          })
        );

        triggerHaptic('success');
        setPriceOverrideItem(null);
        setOverrideReason('');
        setPinModalConfig(null);
      },
    });
  };

  const handleApplyDiscount = () => {
    const isHighDiscount = discountPercentInput > 5;
    if (isHighDiscount && cashierRole === 'CASHIER') {
      setPinModalConfig({
        isOpen: true,
        title: 'High Discount Authorization',
        description: `Discounts above 5% require Manager PIN approval (Requested: ${discountPercentInput}%).`,
        onAuthorize: () => {
          applyDiscountCalculation(discountPercentInput);
          setShowDiscountModal(false);
          setPinModalConfig(null);
        },
      });
    } else {
      applyDiscountCalculation(discountPercentInput);
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
    triggerHaptic('success');

    setCart([]);
    setSelectedCustomerId('');
    setShowPaymentModal(false);
    setMobileCartOpen(false);
    setCompletedOrder(newOrder);

    if (onRefreshData) onRefreshData();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
      
      {/* LEFT 65%: PRODUCT CATALOG & ACTIONS */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden border-r ${
        isDark ? 'border-[rgba(48,62,80,0.35)]' : 'border-[rgba(209,215,224,0.4)]'
      }`}>
        
        {/* Top Controls: Search Bar & Barcode Quick-Scanner */}
        <div className={`p-4 border-b space-y-3 shrink-0 ${
          isDark ? 'border-[rgba(48,62,80,0.3)] bg-[rgba(13,17,23,0.6)] backdrop-blur-xl' : 'border-[rgba(209,215,224,0.4)] bg-white/80 backdrop-blur-xl'
        }`}>
          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9DB5]" strokeWidth={1.8} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products by title, SKU, or scan barcode..."
                className={`w-full pl-10 pr-20 py-2.5 rounded-[12px] text-xs sm:text-sm font-medium border outline-none transition-all duration-200 focus:ring-2 ${
                  isDark
                    ? 'bg-[#0A0D12] border-[rgba(48,62,80,0.5)] text-white placeholder-[#556575] focus:border-emerald-500 focus:ring-emerald-500/20'
                    : 'bg-[#F6F8FA] border-[rgba(209,215,224,0.5)] text-[#0F172A] placeholder-[#94A3B8] focus:border-emerald-500 focus:ring-emerald-500/15'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-[2px] rounded-[6px] ${
                  isDark ? 'text-[#556575] bg-[#151B23] border border-[rgba(48,62,80,0.3)]' : 'text-[#94A3B8] bg-[#F0F2F5] border border-[rgba(209,215,224,0.4)]'
                }`}>
                  ⌘K
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-[2px] rounded-[6px] ${
                  isDark ? 'text-emerald-500 bg-emerald-500/8 border border-emerald-500/15' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'
                }`}>
                  F9
                </span>
              </div>
            </div>

            {/* Scanner Status */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-[12px] border text-xs font-medium shrink-0 ${
              isDark ? 'border-[rgba(48,62,80,0.4)] bg-[#0A0D12] text-[#8B9DB5]' : 'border-[rgba(209,215,224,0.5)] bg-white text-[#64748B] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
            }`}>
              <Barcode className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
              <span>Scanner Ready</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            {categories.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-[6px] rounded-[10px] whitespace-nowrap text-[11px] font-semibold transition-all duration-200 active:scale-[0.96] ${
                    isActive
                      ? isDark
                        ? 'bg-emerald-500 text-[#06080C] font-bold shadow-[0_1px_6px_rgba(16,185,129,0.15)]'
                        : 'bg-emerald-600 text-white font-bold shadow-[0_1px_4px_rgba(5,150,105,0.12)]'
                      : isDark
                      ? 'bg-[#151B23] text-[#8B9DB5] hover:text-[#F0F4F8] hover:bg-[#1C2333] border border-transparent hover:border-[rgba(48,62,80,0.3)]'
                      : 'bg-[#F0F2F5] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E5E9]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className={`flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start pb-24 lg:pb-16 ${isDark ? 'bg-gradient-mesh' : ''}`}>
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
              isDark={isDark}
            />
          ))}
        </div>

        {/* Keyboard Shortcut Bar */}
        <div className={`hidden sm:flex items-center justify-between px-4 py-2 border-t text-[10px] font-mono shrink-0 select-none ${
          isDark ? 'border-[rgba(48,62,80,0.3)] bg-[rgba(13,17,23,0.6)] text-[#556575]' : 'border-[rgba(209,215,224,0.4)] bg-[#F6F8FA] text-[#94A3B8]'
        }`}>
          <div className="flex items-center gap-4">
            {[
              { key: 'F1', label: 'Cash', color: 'emerald' },
              { key: 'F2', label: 'MoMo', color: 'emerald' },
              { key: 'F4', label: 'Hold', color: 'amber' },
              { key: 'Space', label: 'Pay', color: 'emerald' },
            ].map(s => (
              <span key={s.key} className="flex items-center gap-1">
                <kbd className={`px-1.5 py-[2px] rounded-[5px] font-bold text-[9px] ${
                  isDark 
                    ? `bg-[#151B23] text-${s.color === 'emerald' ? 'emerald-500' : 'amber-500'} border border-[rgba(48,62,80,0.3)]`
                    : `bg-[#F0F2F5] text-${s.color === 'emerald' ? 'emerald-600' : 'amber-600'} border border-[rgba(209,215,224,0.4)]`
                }`}>{s.key}</kbd>
                <span>{s.label}</span>
              </span>
            ))}
          </div>
          <div className="text-[10px] font-sans">
            Shift: <span className={isDark ? 'font-semibold text-emerald-500' : 'font-semibold text-emerald-600'}>{cashierName.split(' ')[0]}</span>
          </div>
        </div>

      </div>

      {/* RIGHT 35%: ACTIVE ORDER & TICKET LEDGER (Desktop View) */}
      <div className="hidden lg:flex w-[380px] xl:w-[420px] flex-col h-full shrink-0">
        <CartLedger
          cart={cart}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomerId={setSelectedCustomerId}
          onUpdateQuantity={updateQuantity}
          onRequestDeleteItem={requestDeleteItem}
          onOpenPriceOverride={item => {
            setPriceOverrideItem({ itemId: item.id, currentPrice: item.unitPrice });
            setOverrideInputPrice(item.unitPrice);
          }}
          onOpenDiscountModal={() => setShowDiscountModal(true)}
          onHoldCart={handleHoldCart}
          onOpenParkedModal={() => setShowParkedModal(true)}
          parkedCartCount={parkedCarts.length}
          onInitiateCheckout={() => setShowPaymentModal(true)}
          taxScheme={taxScheme}
          isDark={isDark}
        />
      </div>

      {/* MOBILE FLOATING TICKET SUMMARY */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 p-3">
        <div className={`p-3 rounded-[18px] border flex items-center justify-between backdrop-blur-xl ${
          isDark 
            ? 'bg-[rgba(13,17,23,0.88)] border-[rgba(48,62,80,0.4)] shadow-[0_-4px_24px_rgba(0,0,0,0.4)]' 
            : 'bg-[rgba(255,255,255,0.92)] border-[rgba(209,215,224,0.5)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]'
        }`}>
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex items-center gap-3 flex-1 text-left"
          >
            <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center font-extrabold font-mono text-sm ${
              isDark 
                ? 'bg-emerald-500 text-[#06080C] shadow-[0_2px_8px_rgba(16,185,129,0.2)]' 
                : 'bg-emerald-600 text-white shadow-[0_2px_6px_rgba(5,150,105,0.15)]'
            }`}>
              {totalItemCount}
            </div>
            <div>
              <span className={`text-xs block font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                Current Ticket
              </span>
              <span className={`text-sm font-extrabold font-mono tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {formatGhs(grandTotal)}
              </span>
            </div>
          </button>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setShowPaymentModal(true)}
            className={`px-5 py-2.5 active:scale-[0.96] disabled:opacity-40 font-black rounded-[12px] text-xs flex items-center gap-1.5 transition-all duration-200 ${
              isDark 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-[#06080C] shadow-[0_2px_8px_rgba(16,185,129,0.2)]' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_2px_6px_rgba(5,150,105,0.15)]'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Pay</span>
          </button>
        </div>
      </div>

      {/* MOBILE TICKET DRAWER MODAL */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md animate-fade-slide-in">
          <div className={`h-[88vh] w-full rounded-t-[24px] flex flex-col overflow-hidden border-t animate-slide-in-bottom ${
            isDark 
              ? 'bg-[#0A0D12] border-[rgba(48,62,80,0.4)] shadow-[0_-8px_32px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-[rgba(209,215,224,0.5)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]'
          }`}>
            <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-[rgba(48,62,80,0.3)]' : 'border-[rgba(209,215,224,0.4)]'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingBag className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
                <span>Ticket Ledger ({totalItemCount} items)</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className={`p-1.5 rounded-[8px] transition-all duration-150 ${
                  isDark ? 'text-[#8B9DB5] hover:text-white hover:bg-[#1C2333]' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F0F2F5]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartLedger
                cart={cart}
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomerId={setSelectedCustomerId}
                onUpdateQuantity={updateQuantity}
                onRequestDeleteItem={requestDeleteItem}
                onOpenPriceOverride={item => {
                  setPriceOverrideItem({ itemId: item.id, currentPrice: item.unitPrice });
                  setOverrideInputPrice(item.unitPrice);
                }}
                onOpenDiscountModal={() => setShowDiscountModal(true)}
                onHoldCart={handleHoldCart}
                onOpenParkedModal={() => setShowParkedModal(true)}
                parkedCartCount={parkedCarts.length}
                onInitiateCheckout={() => setShowPaymentModal(true)}
                taxScheme={taxScheme}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT PAYMENT MODAL */}
      {showPaymentModal && (
        <PaymentModal
          totalAmount={grandTotal}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onConfirmPayments={handleConfirmPayments}
          onClose={() => setShowPaymentModal(false)}
          isDark={isDark}
        />
      )}

      {/* THERMAL ESC/POS RECEIPT VIEWER */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 overflow-y-auto animate-fade-slide-in">
          <div className="my-auto animate-scale-in">
            <ThermalReceipt order={completedOrder} onClose={() => setCompletedOrder(null)} />
          </div>
        </div>
      )}

      {/* MANAGER PIN OVERRIDE */}
      {pinModalConfig && (
        <ManagerPinModal
          title={pinModalConfig.title}
          actionDescription={pinModalConfig.description}
          onAuthorize={pinModalConfig.onAuthorize}
          onCancel={() => setPinModalConfig(null)}
        />
      )}

      {/* PARKED / HELD CARTS MODAL */}
      {showParkedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-fade-slide-in">
          <div className={`w-full max-w-md rounded-[22px] border p-5 space-y-4 animate-scale-in ${
            isDark 
              ? 'bg-[#0D1117] border-[rgba(48,62,80,0.4)] shadow-[0_16px_48px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-[rgba(209,215,224,0.5)] shadow-[0_16px_40px_rgba(0,0,0,0.1)]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-[rgba(48,62,80,0.3)]' : 'border-[rgba(209,215,224,0.4)]'
            }`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber-500" />
                <span>Held Tickets ({parkedCarts.length})</span>
              </h3>
              <button onClick={() => setShowParkedModal(false)} className={`text-xs font-semibold px-2 py-1 rounded-[8px] transition-all duration-150 ${
                isDark ? 'text-[#8B9DB5] hover:text-white hover:bg-[#1C2333]' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F0F2F5]'
              }`}>
                Close
              </button>
            </div>

            {parkedCarts.length === 0 ? (
              <p className="text-xs text-[#8B9DB5] py-8 text-center italic">No tickets currently on hold.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {parkedCarts.map(c => (
                  <div key={c.id} className={`p-3 rounded-[14px] border flex items-center justify-between text-xs transition-all duration-200 ${
                    isDark ? 'border-[rgba(48,62,80,0.35)] bg-[#151B23]/50 hover:bg-[#1C2333]' : 'border-[rgba(209,215,224,0.4)] bg-[#F6F8FA] hover:bg-[#F0F2F5]'
                  }`}>
                    <div>
                      <div className={`font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{c.name}</div>
                      <div className="text-[10px] text-[#8B9DB5]">{c.items.length} items · Held at {c.heldAt}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => resumeCart(c)}
                      className={`px-3 py-[6px] font-bold rounded-[10px] text-xs flex items-center gap-1 transition-all duration-200 active:scale-[0.96] ${
                        isDark 
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-[#06080C] shadow-[0_1px_4px_rgba(16,185,129,0.15)]' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
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

      {/* ORDER DISCOUNT MODAL */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-fade-slide-in">
          <div className={`w-full max-w-xs rounded-[22px] border p-5 space-y-4 animate-scale-in ${
            isDark 
              ? 'bg-[#0D1117] border-[rgba(48,62,80,0.4)] shadow-[0_16px_48px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-[rgba(209,215,224,0.5)] shadow-[0_16px_40px_rgba(0,0,0,0.1)]'
          }`}>
            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>Ticket Discount (%)</h3>
            <p className="text-[11px] text-[#8B9DB5]">Cashier allowed up to 5%. Over 5% requires Manager PIN.</p>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercentInput}
                onChange={e => setDiscountPercentInput(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2.5 rounded-[12px] text-xl font-mono tabular-nums text-center outline-none border transition-all duration-200 focus:ring-2 ${
                  isDark ? 'bg-[#0A0D12] border-[rgba(48,62,80,0.5)] text-white focus:border-emerald-500 focus:ring-emerald-500/20' : 'bg-[#F6F8FA] border-[rgba(209,215,224,0.5)] text-[#0F172A] focus:border-emerald-500 focus:ring-emerald-500/15'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B9DB5] font-bold">%</span>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button type="button" onClick={() => setShowDiscountModal(false)} className={`flex-1 py-2.5 rounded-[12px] text-xs font-semibold border transition-all duration-200 active:scale-[0.97] ${isDark ? 'border-[rgba(48,62,80,0.5)] text-[#8B9DB5] hover:text-white' : 'border-[rgba(209,215,224,0.5)] text-[#64748B]'}`}>Cancel</button>
              <button type="button" onClick={handleApplyDiscount} className={`flex-1 py-2.5 font-bold rounded-[12px] text-xs transition-all duration-200 active:scale-[0.97] ${isDark ? 'bg-emerald-500 hover:bg-emerald-400 text-[#06080C]' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* PRICE OVERRIDE MODAL */}
      {priceOverrideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-lg p-4 animate-fade-slide-in">
          <div className={`w-full max-w-sm rounded-[22px] border p-5 space-y-4 animate-scale-in ${
            isDark 
              ? 'bg-[#0D1117] border-[rgba(48,62,80,0.4)] shadow-[0_16px_48px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-[rgba(209,215,224,0.5)] shadow-[0_16px_40px_rgba(0,0,0,0.1)]'
          }`}>
            <h3 className={`font-bold text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Audited Price Override</h3>
            <div className="text-xs text-[#8B9DB5]">
              Standard Unit Price: <span className={`font-mono font-bold tabular-nums ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{formatGhs(priceOverrideItem.currentPrice)}</span>
            </div>
            <div>
              <label className="text-[11px] text-[#8B9DB5] font-medium block mb-1.5">New Unit Price (GH₵):</label>
              <input
                type="number" step="0.1" value={overrideInputPrice}
                onChange={e => setOverrideInputPrice(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2.5 rounded-[12px] font-mono tabular-nums text-sm outline-none border transition-all duration-200 focus:ring-2 ${
                  isDark ? 'bg-[#0A0D12] border-[rgba(48,62,80,0.5)] text-white focus:border-emerald-500 focus:ring-emerald-500/20' : 'bg-[#F6F8FA] border-[rgba(209,215,224,0.5)] text-[#0F172A] focus:border-emerald-500'
                }`}
              />
            </div>
            <div>
              <label className="text-[11px] text-[#8B9DB5] font-medium block mb-1.5">Mandatory Override Reason:</label>
              <input
                type="text" placeholder="e.g. Approved customer agreement / Near-expiry"
                value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-[12px] text-xs outline-none border transition-all duration-200 focus:ring-2 ${
                  isDark ? 'bg-[#0A0D12] border-[rgba(48,62,80,0.5)] text-white focus:border-emerald-500 focus:ring-emerald-500/20' : 'bg-[#F6F8FA] border-[rgba(209,215,224,0.5)] text-[#0F172A] focus:border-emerald-500'
                }`}
              />
            </div>
            <div className="flex gap-2.5 pt-1">
              <button type="button" onClick={() => setPriceOverrideItem(null)} className={`flex-1 py-2.5 rounded-[12px] text-xs font-semibold border transition-all duration-200 active:scale-[0.97] ${isDark ? 'border-[rgba(48,62,80,0.5)] text-[#8B9DB5]' : 'border-[rgba(209,215,224,0.5)] text-[#64748B]'}`}>Cancel</button>
              <button type="button" onClick={() => handleInitiatePriceOverride()} className={`flex-1 py-2.5 font-bold rounded-[12px] text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] ${
                isDark ? 'bg-amber-500 hover:bg-amber-400 text-[#06080C] shadow-[0_2px_8px_rgba(245,158,11,0.2)]' : 'bg-amber-500 hover:bg-amber-400 text-white shadow-[0_2px_6px_rgba(245,158,11,0.15)]'
              }`}>
                <Lock className="w-3.5 h-3.5" />
                <span>Verify with Manager PIN</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
