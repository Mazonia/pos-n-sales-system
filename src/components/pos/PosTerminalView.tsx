import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { performSmartSearch, SmartSearchResult } from '../../utils/smartSearch';
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
  Lock,
  Eye,
  EyeOff,
  CornerDownLeft,
  ImageIcon,
  Check,
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

  // Product packaging images visibility toggle (persisted in localStorage)
  const [showProductImages, setShowProductImages] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pos_show_product_images') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleShowImages = () => {
    setShowProductImages(prev => {
      const next = !prev;
      try {
        localStorage.setItem('pos_show_product_images', String(next));
      } catch {}
      return next;
    });
  };

  // Smart Search Suggestion Dropdown state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close suggestions popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute smart search with exact matches on top and typo/fuzzy matches below
  const smartSearchResult: SmartSearchResult = useMemo(() => {
    return performSmartSearch(products, searchQuery, selectedCategory);
  }, [products, searchQuery, selectedCategory]);

  const allSuggestions = useMemo(() => {
    return [
      ...smartSearchResult.directMatches.map(m => ({ product: m.product, isTypo: false, label: m.matchedField, typoReason: '' })),
      ...smartSearchResult.typoMatches.map(m => ({ product: m.product, isTypo: true, label: m.suggestedWord, typoReason: m.matchReason })),
    ];
  }, [smartSearchResult]);

  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [searchQuery]);

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

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  // Global Keyboard Shortcuts (F1: Cash, F2: MoMo, F4: Hold, F9 / Cmd+K: Search, Space: Pay)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
      if (e.key === 'F9') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
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
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => Math.min(prev + 1, allSuggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < allSuggestions.length) {
        addToCart(allSuggestions[selectedSuggestionIndex].product);
        setSearchQuery('');
        setIsSearchFocused(false);
        return;
      }

      // Check exact barcode or SKU first
      const exactMatch = products.find(
        p => p.barcode === searchQuery.trim() || p.sku.toLowerCase() === searchQuery.toLowerCase().trim()
      );
      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery('');
        setIsSearchFocused(false);
        return;
      }

      // Add top available suggestion if present
      if (allSuggestions.length > 0) {
        addToCart(allSuggestions[0].product);
        setSearchQuery('');
        setIsSearchFocused(false);
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
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
      
      {/* LEFT 65%: PRODUCT CATALOG & ACTIONS */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden border-r ${
        isDark ? 'border-[#282B34]' : 'border-stone-200'
      }`}>
        
        {/* Top Controls: Search Bar & Barcode Quick-Scanner */}
        <div className={`p-4 border-b space-y-3 shrink-0 ${
          isDark ? 'border-[#282B34] bg-[#16181F]' : 'border-stone-200 bg-white'
        }`}>
          <div className="flex items-center gap-2.5">
            {/* Search Input Container with Smart Suggestions Popover */}
            <div ref={searchContainerRef} className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={2} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products by title, SKU, typo pattern, or barcode..."
                className={`w-full pl-10 pr-24 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border outline-none transition-all ${
                  isDark
                    ? 'bg-[#1A1C22] border-[#282B34] text-white placeholder-stone-500 focus:border-[#FF4500] focus:ring-2 focus:ring-[#FF4500]/20'
                    : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-[#FF4500] focus:ring-2 focus:ring-[#FF4500]/20'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchFocused(false);
                    }}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isDark ? 'text-stone-400 bg-[#252833]' : 'text-stone-500 bg-stone-200'
                }`}>
                  F9
                </span>
              </div>

              {/* Floating Smart Suggestions Popover */}
              {isSearchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md max-h-[460px] flex flex-col bg-white/95 dark:bg-[#16181F]/95 border-stone-200 dark:border-[#282B34] animate-in fade-in duration-100">
                  <div className="p-3 border-b flex items-center justify-between bg-stone-50/80 dark:bg-[#1A1C22]/80 border-stone-200 dark:border-[#282B34] shrink-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#FF4500]" />
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        Smart Suggestions for "{searchQuery}"
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px]">
                      <span className="font-semibold text-stone-500 dark:text-stone-400">
                        {smartSearchResult.directMatches.length} Direct
                      </span>
                      {smartSearchResult.typoMatches.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FF4500]/15 text-[#FF4500] dark:text-[#FF5722] font-bold border border-[#FF4500]/30">
                          {smartSearchResult.typoMatches.length} Similar / Typo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-stone-100 dark:divide-[#282B34]/60">
                    {/* 1. Direct / Exact Matches */}
                    {smartSearchResult.directMatches.length > 0 && (
                      <div>
                        <div className="px-3.5 py-1.5 bg-stone-100/70 dark:bg-[#1A1C22]/70 text-[10px] uppercase font-bold tracking-wider text-stone-500 dark:text-stone-400 flex items-center justify-between">
                          <span>Direct Matches ({smartSearchResult.directMatches.length})</span>
                          <span className="text-[9.5px] opacity-75">Exact title, prefix, barcode or SKU</span>
                        </div>

                        {smartSearchResult.directMatches.map((dm, idx) => {
                          const isSelected = selectedSuggestionIndex === idx;
                          return (
                            <div
                              key={dm.product.id}
                              onClick={() => {
                                addToCart(dm.product);
                                setSearchQuery('');
                                setIsSearchFocused(false);
                              }}
                              className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                                isSelected
                                  ? 'bg-[#FF4500]/10 dark:bg-[#FF4500]/20'
                                  : 'hover:bg-stone-50 dark:hover:bg-[#1A1C22]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {showProductImages && (
                                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-stone-100 dark:bg-[#11151A] border border-stone-200 dark:border-[#282B34] shrink-0 flex items-center justify-center">
                                    {dm.product.imageUrl ? (
                                      <img src={dm.product.imageUrl} alt={dm.product.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="w-4 h-4 text-stone-400" />
                                    )}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                                      {dm.product.name}
                                    </span>
                                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono font-medium">
                                      {dm.product.sku}
                                    </span>
                                  </div>
                                  {dm.product.localName && (
                                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                                      {dm.product.localName}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="text-xs sm:text-sm font-black text-[#FF4500] dark:text-[#FF5722] font-mono block">
                                    {formatGhs(dm.product.retailPrice)}
                                  </span>
                                  <span className="text-[10px] text-stone-400">
                                    {dm.product.currentStock} in stock
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(dm.product);
                                    setSearchQuery('');
                                    setIsSearchFocused(false);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold text-xs shadow-xs active:scale-95 transition cursor-pointer"
                                >
                                  + Add
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Suggested & Typo Matches */}
                    {smartSearchResult.typoMatches.length > 0 && (
                      <div>
                        <div className="px-3.5 py-1.5 bg-[#FF4500]/10 dark:bg-[#FF4500]/15 text-[10px] uppercase font-bold tracking-wider text-[#FF4500] dark:text-[#FF5722] flex items-center justify-between border-t border-[#FF4500]/20">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#FF4500]" />
                            Suggested / Similar Matches ({smartSearchResult.typoMatches.length})
                          </span>
                          <span className="text-[9.5px] opacity-80">Typo & mistake tolerant</span>
                        </div>

                        {smartSearchResult.typoMatches.map((tm, idx) => {
                          const overallIdx = smartSearchResult.directMatches.length + idx;
                          const isSelected = selectedSuggestionIndex === overallIdx;
                          return (
                            <div
                              key={tm.product.id}
                              onClick={() => {
                                addToCart(tm.product);
                                setSearchQuery('');
                                setIsSearchFocused(false);
                              }}
                              className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                                isSelected
                                  ? 'bg-[#FF4500]/10 dark:bg-[#FF4500]/20'
                                  : 'hover:bg-[#FF4500]/5 dark:hover:bg-[#1A1C22]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {showProductImages && (
                                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-stone-100 dark:bg-[#11151A] border border-[#FF4500]/30 shrink-0 flex items-center justify-center">
                                    {tm.product.imageUrl ? (
                                      <img src={tm.product.imageUrl} alt={tm.product.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="w-4 h-4 text-stone-400" />
                                    )}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                                      {tm.product.name}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF4500]/15 text-[#FF4500] dark:text-[#FF5722] font-bold border border-[#FF4500]/30">
                                      Did you mean: {tm.suggestedWord}?
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] text-stone-500 dark:text-stone-400">
                                    {tm.matchReason} · <span className="font-mono">{tm.product.sku}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="text-xs sm:text-sm font-black text-[#FF4500] dark:text-[#FF5722] font-mono block">
                                    {formatGhs(tm.product.retailPrice)}
                                  </span>
                                  <span className="text-[10px] text-stone-400">
                                    {tm.product.currentStock} in stock
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(tm.product);
                                    setSearchQuery('');
                                    setIsSearchFocused(false);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold text-xs shadow-xs active:scale-95 transition cursor-pointer"
                                >
                                  + Add
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Empty State */}
                    {!smartSearchResult.hasMatches && (
                      <div className="py-8 text-center text-stone-400 text-xs space-y-1">
                        <p className="font-bold text-stone-600 dark:text-stone-300">No products matching "{searchQuery}"</p>
                        <p className="text-[11px]">Check spelling or browse by category above.</p>
                      </div>
                    )}
                  </div>

                  {/* Popover Footer */}
                  <div className="px-3 py-1.5 bg-stone-100/90 dark:bg-[#13151A] border-t border-stone-200 dark:border-[#282B34] flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 shrink-0">
                    <div className="flex items-center gap-3">
                      <span><kbd className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono">↑↓</kbd> Navigate</span>
                      <span><kbd className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono">Enter</kbd> Add item</span>
                      <span><kbd className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono">Esc</kbd> Close</span>
                    </div>
                    <span>Smart Typo Tolerance Active</span>
                  </div>
                </div>
              )}
            </div>

            {/* Photo Visibility Toggle (Teller Option) */}
            <button
              type="button"
              onClick={toggleShowImages}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold shrink-0 transition active:scale-95 cursor-pointer ${
                showProductImages
                  ? 'border-[#FF4500]/50 bg-[#FF4500]/10 text-[#FF4500] dark:text-[#FF5722] font-bold'
                  : isDark
                  ? 'border-[#282B34] bg-[#1A1C22] text-stone-400 hover:text-stone-200'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:text-stone-900'
              }`}
              title="Toggle display of product packaging photos on cards & suggestions"
            >
              {showProductImages ? (
                <Eye className="w-3.5 h-3.5 text-[#FF4500] dark:text-[#FF5722]" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              <span>Photos: {showProductImages ? 'ON' : 'OFF'}</span>
            </button>

            {/* Scanner Status */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shrink-0 ${
              isDark ? 'border-[#282B34] bg-[#1A1C22] text-stone-300' : 'border-stone-200 bg-stone-50 text-stone-700'
            }`}>
              <Barcode className="w-4 h-4 text-[#FF4500] dark:text-[#FF5722]" />
              <span>Scanner Ready</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            {categories.map(cat => {
              const isActive = selectedCategory === cat;
              const count = cat === 'ALL'
                ? products.length
                : products.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-[#FF4500] text-white shadow-xs font-bold'
                      : isDark
                      ? 'bg-[#1A1C22] text-stone-300 hover:text-white hover:bg-[#252833] border border-[#282B34]'
                      : 'bg-white text-stone-600 hover:text-stone-950 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full tabular-nums font-medium ${
                    isActive
                      ? 'bg-black/20 text-white font-bold'
                      : isDark
                      ? 'bg-[#121316] text-stone-400'
                      : 'bg-stone-100 text-stone-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid: Auto-fills cleanly with minmax(210px, 1fr) and auto-rows-max so prices are never cut off */}
        <div className="flex-1 p-3.5 sm:p-4 md:p-5 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] auto-rows-max gap-3 sm:gap-3.5 content-start pb-24 md:pb-6 bg-[#F5F5F7] dark:bg-[#121316]">
          {smartSearchResult.allRanked.length === 0 ? (
            <div className="col-span-full py-16 text-center text-stone-400 space-y-2">
              <p className="text-sm font-bold">No products found</p>
              <p className="text-xs">Try searching for a different keyword or SKU.</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
                className="text-xs text-[#FF4500] dark:text-[#FF5722] font-bold hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            smartSearchResult.allRanked.map(product => {
              const typoMatch = smartSearchResult.typoMatches.find(m => m.product.id === product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                  isDark={isDark}
                  showImage={showProductImages}
                  suggestedMatchBadge={typoMatch ? `Suggested for "${searchQuery}" (Matches: ${typoMatch.suggestedWord})` : undefined}
                />
              );
            })
          )}
        </div>

        {/* Keyboard Shortcut Bar */}
        <div className={`hidden sm:flex items-center justify-between px-4 py-2 border-t text-[11.5px] tabular-nums shrink-0 select-none ${
          isDark ? 'border-[#282B34] bg-[#16181F] text-stone-400' : 'border-stone-200 bg-stone-50 text-stone-500'
        }`}>
          <div className="flex items-center gap-4">
            {[
              { key: 'F1', label: 'Cash' },
              { key: 'F2', label: 'MoMo' },
              { key: 'F4', label: 'Hold' },
              { key: 'Space', label: 'Pay' },
            ].map(s => (
              <span key={s.key} className="flex items-center gap-1.5">
                <kbd className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                  isDark ? 'bg-[#1F222B] text-[#FF5722] border border-[#2D313C]' : 'bg-white text-[#FF4500] border border-stone-300 shadow-2xs'
                }`}>{s.key}</kbd>
                <span>{s.label}</span>
              </span>
            ))}
          </div>
          <div className="text-xs font-sans">
            Cashier: <strong className="text-[#FF4500] dark:text-[#FF5722] font-bold">{cashierName.split(' ')[0]}</strong>
          </div>
        </div>

      </div>

      {/* RIGHT 35%: ACTIVE ORDER & TICKET LEDGER (Desktop View: visible on md and up) */}
      <div className="hidden md:flex w-[350px] lg:w-[380px] xl:w-[420px] flex-col h-full shrink-0">
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

      {/* MOBILE FLOATING TICKET SUMMARY (for screens < 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 p-3">
        <div className={`p-3 rounded-2xl border flex items-center justify-between shadow-xl ${
          isDark ? 'bg-[#1A1C22] border-[#282B34]' : 'bg-white border-stone-200'
        }`}>
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex items-center gap-3 flex-1 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FF4500] text-white font-black font-mono text-sm flex items-center justify-center">
              {totalItemCount}
            </div>
            <div>
              <span className={`text-xs block font-bold ${isDark ? 'text-stone-200' : 'text-stone-900'}`}>
                Current Ticket
              </span>
              <span className="text-sm font-black font-mono tabular-nums text-[#FF4500] dark:text-[#FF5722]">
                {formatGhs(grandTotal)}
              </span>
            </div>
          </button>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setShowPaymentModal(true)}
            className="px-5 py-2.5 font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 bg-[#FF4500] hover:bg-[#E03E00] text-white shadow-md disabled:opacity-40 cursor-pointer"
          >
            <Banknote className="w-4 h-4" />
            <span>Pay</span>
          </button>
        </div>
      </div>

      {/* MOBILE TICKET DRAWER MODAL */}
      {mobileCartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md animate-fade-slide-in">
          <div className={`h-[88vh] w-full rounded-t-[24px] flex flex-col overflow-hidden border-t animate-slide-in-bottom ${
            isDark 
              ? 'bg-[#121316] border-[#282B34] shadow-[0_-8px_32px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-stone-200 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]'
          }`}>
            <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-[#282B34]' : 'border-stone-200'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingBag className="w-4 h-4 text-[#FF4500]" strokeWidth={1.8} />
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
                <PauseCircle className="w-4 h-4 text-[#FF4500]" />
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
                isDark ? 'bg-[#FF4500] hover:bg-[#E03E00] text-white shadow-[0_2px_8px_rgba(255,69,0,0.3)]' : 'bg-[#FF4500] hover:bg-[#E03E00] text-white shadow-[0_2px_6px_rgba(255,69,0,0.2)]'
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
