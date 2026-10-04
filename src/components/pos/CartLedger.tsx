import React, { useState } from 'react';
import { LocalCartItem, LocalCustomer } from '../../utils/dexieSync';
import { TaxSchemeType, formatGhs, roundToPesewas, extractTaxFromInclusive } from '../../utils/ghanaTaxEngine';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Tag,
  ChevronDown,
  ChevronUp,
  Percent,
  PauseCircle,
  Banknote,
  UserCheck,
  ArrowRight,
  Receipt,
  Lock,
  Package
} from 'lucide-react';

interface CartLedgerProps {
  cart: LocalCartItem[];
  customers: LocalCustomer[];
  selectedCustomerId: string;
  onSelectCustomerId: (id: string) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRequestDeleteItem: (item: LocalCartItem) => void;
  onOpenPriceOverride: (item: LocalCartItem) => void;
  onOpenDiscountModal: () => void;
  onHoldCart: () => void;
  onOpenParkedModal: () => void;
  parkedCartCount: number;
  onInitiateCheckout: () => void;
  taxScheme: TaxSchemeType;
  isDark: boolean;
  orderMode?: 'RETAIL' | 'WHOLESALE';
  canApplyDiscount?: boolean;
}

export const CartLedger: React.FC<CartLedgerProps> = ({
  cart,
  customers,
  selectedCustomerId,
  onSelectCustomerId,
  onUpdateQuantity,
  onRequestDeleteItem,
  onOpenPriceOverride,
  onOpenDiscountModal,
  onHoldCart,
  onOpenParkedModal,
  parkedCartCount,
  onInitiateCheckout,
  taxScheme,
  isDark,
  orderMode = 'RETAIL',
  canApplyDiscount = true,
}) => {
  const [taxAccordionOpen, setTaxAccordionOpen] = useState(false);

  // Financial calculations
  const totalItemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const grossSubtotal = roundToPesewas(cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const discountTotal = roundToPesewas(cart.reduce((sum, item) => sum + item.discountAmount, 0));
  const netOrderAmount = roundToPesewas(grossSubtotal - discountTotal);
  const taxDetail = extractTaxFromInclusive(netOrderAmount, taxScheme);
  const grandTotal = netOrderAmount;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const isWholesale = orderMode === 'WHOLESALE';

  return (
    <div className="flex flex-col h-full select-none p-3.5 space-y-3 bg-[#EBEEF2] dark:bg-[#121316]">
      
      {/* Top Header Card */}
      <div className="pos-card p-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FF4500]/10 text-[#FF4500] dark:text-[#FF5722] border border-[#FF4500]/20 flex items-center justify-center font-bold">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[13.5px] font-bold text-slate-900 dark:text-stone-100">
                Current Ticket
              </h3>
              <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider ${
                isWholesale
                  ? 'bg-teal-500/15 text-[#008285] dark:text-[#00CED1] border border-teal-500/30'
                  : 'bg-orange-500/15 text-[#C43400] dark:text-[#FF5722] border border-orange-500/30'
              }`}>
                {isWholesale ? 'Wholesale' : 'Retail'}
              </span>
            </div>
            <span className="text-[11.5px] text-slate-600 dark:text-stone-400 font-medium">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Parked Carts Trigger */}
        <button
          type="button"
          onClick={onOpenParkedModal}
          className="pos-btn px-2.5 py-1.5 text-xs flex items-center gap-1.5"
          title="View Held Orders"
        >
          <PauseCircle className="w-3.5 h-3.5 text-[#FF4500] dark:text-[#FF5722]" />
          <span className="font-semibold text-slate-700 dark:text-stone-300">Held</span>
          {parkedCartCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#FF4500] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
              {parkedCartCount}
            </span>
          )}
        </button>
      </div>

      {/* Customer Selector Well */}
      <div className="pos-card px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <UserCheck className="w-4 h-4 text-slate-500 dark:text-stone-400 shrink-0" />
          <select
            value={selectedCustomerId}
            onChange={e => onSelectCustomerId(e.target.value)}
            className="text-xs font-semibold bg-transparent focus:outline-none w-full truncate cursor-pointer text-slate-800 dark:text-stone-200"
          >
            <option value="" className="bg-white text-slate-800 dark:bg-[#1A1C22] dark:text-stone-200">
              Walk-in Customer (General)
            </option>
            {customers.map(c => (
              <option key={c.id} value={c.id} className="bg-white text-slate-800 dark:bg-[#1A1C22] dark:text-stone-200">
                {c.fullName} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 shrink-0 tabular-nums">
            Debt: {formatGhs(selectedCustomer.currentDebt)}
          </span>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 pos-card border-dashed">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-200/80 dark:bg-[#20232B] text-slate-500 dark:text-stone-400">
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-stone-200">
                Ticket is empty
              </p>
              <p className="text-xs text-slate-500 dark:text-stone-400 max-w-[190px] mt-1 leading-relaxed">
                Click or scan any product from the catalog to add it to this sale.
              </p>
            </div>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="pos-card p-3 space-y-2"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-[13px] leading-snug truncate text-slate-900 dark:text-stone-100">
                    {item.name}
                  </h5>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-600 dark:text-stone-400 tabular-nums">
                    <span>{item.unitName}</span>
                    <span>·</span>
                    <span className="font-medium">{formatGhs(item.unitPrice)}</span>
                    {item.discountAmount > 0 && (
                      <span className="text-rose-600 font-semibold">(-{formatGhs(item.discountAmount)})</span>
                    )}
                    {item.priceOverridden && (
                      <span className="text-amber-600 font-bold text-[9px] bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded border border-amber-200">
                        Override
                      </span>
                    )}
                  </div>
                </div>

                <span className="font-bold text-[14px] tabular-nums text-slate-900 dark:text-amber-400">
                  {formatGhs(item.lineTotal)}
                </span>
              </div>

              {/* Quantity Stepper & Quick Tools */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#282B34]">
                {/* Stepper with clean pill controls */}
                <div className="flex items-center rounded-lg border border-slate-300 dark:border-[#282B34] bg-slate-100 dark:bg-[#14161A] p-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id || item.productId, -1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-white dark:hover:bg-[#252833] transition active:scale-90"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 text-xs font-bold tabular-nums min-w-[24px] text-center text-slate-900 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id || item.productId, 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-white dark:hover:bg-[#252833] transition active:scale-90"
                    title="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenPriceOverride(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#FF4500] hover:bg-[#FF4500]/10 dark:hover:bg-[#FF4500]/20 transition"
                    title="Price Override"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDeleteItem(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Sticky Panel: Order Summary & Checkout */}
      {cart.length > 0 && (
        <div className="pos-card p-4 space-y-3 shrink-0 shadow-sm">
          {/* Subtotal line */}
          <div className="flex justify-between text-xs text-slate-600 dark:text-stone-400 font-medium">
            <span>Subtotal ({totalItemCount} items):</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-stone-200">
              {formatGhs(grossSubtotal)}
            </span>
          </div>

          {discountTotal > 0 && (
            <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
              <span>Discounts Applied:</span>
              <span className="tabular-nums">-{formatGhs(discountTotal)}</span>
            </div>
          )}

          {/* Tax Breakdown Inset Well */}
          <div className="pos-inset overflow-hidden rounded-xl">
            <button
              type="button"
              onClick={() => setTaxAccordionOpen(!taxAccordionOpen)}
              className="w-full p-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-stone-300"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF4500]" />
                <span>GRA Statutory Taxes:</span>
              </div>
              <div className="flex items-center gap-1 text-[#FF4500] dark:text-[#FF5722] font-bold tabular-nums">
                <span>{formatGhs(taxDetail.totalTax)}</span>
                {taxAccordionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {taxAccordionOpen && (
              <div className="p-2.5 pt-0 border-t border-slate-200 dark:border-[#282B34] space-y-1 text-[11px] text-slate-600 dark:text-stone-400 tabular-nums">
                <div className="flex justify-between">
                  <span>NHIL (2.5%):</span>
                  <span>{formatGhs(taxDetail.nhil)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GETFund (2.5%):</span>
                  <span>{formatGhs(taxDetail.getfund)}</span>
                </div>
                <div className="flex justify-between">
                  <span>COVID-19 Levy (1.0%):</span>
                  <span>{formatGhs(taxDetail.covid)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard VAT (15.0%):</span>
                  <span>{formatGhs(taxDetail.vat)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Grand Total Row */}
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-stone-400">
              Total Due:
            </span>
            <span className="text-2xl font-bold tracking-tight text-[#FF4500] dark:text-[#FF5722] tabular-nums">
              {formatGhs(grandTotal)}
            </span>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onHoldCart}
              className="pos-btn py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <PauseCircle className="w-3.5 h-3.5 text-[#FF4500] dark:text-[#FF5722]" />
              <span>Hold (F4)</span>
            </button>

            <button
              type="button"
              onClick={canApplyDiscount ? onOpenDiscountModal : undefined}
              disabled={!canApplyDiscount}
              className={`pos-btn py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 ${
                !canApplyDiscount ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-[#1A1C22]' : ''
              }`}
              title={canApplyDiscount ? 'Apply Order Discount' : 'Discounts locked by Store Management'}
            >
              {canApplyDiscount ? (
                <Percent className="w-3.5 h-3.5 text-[#FF4500] dark:text-[#FF5722]" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{canApplyDiscount ? 'Discount' : 'Discount Locked'}</span>
            </button>
          </div>

          {/* Ashy Charcoal & Amber Primary Checkout Action */}
          <button
            type="button"
            onClick={onInitiateCheckout}
            className="pos-btn-primary w-full py-3.5 px-4 text-sm font-bold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              <span>Charge / Pay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tabular-nums">
                {formatGhs(grandTotal)}
              </span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </button>
        </div>
      )}

    </div>
  );
};
