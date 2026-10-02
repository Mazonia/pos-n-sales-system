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
  Receipt
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

  return (
    <div className="flex flex-col h-full select-none p-3.5 space-y-3 neo-bg">
      
      {/* Top Header Card */}
      <div className="neo-card p-3.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              Current Ticket
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Parked Carts Trigger */}
        <button
          type="button"
          onClick={onOpenParkedModal}
          className="neo-btn px-3 py-1.5 text-xs flex items-center gap-1.5"
          title="View Held Orders"
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>Held</span>
          {parkedCartCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center font-mono">
              {parkedCartCount}
            </span>
          )}
        </button>
      </div>

      {/* Customer Selector Well */}
      <div className="neo-card-inset px-3.5 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <UserCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <select
            value={selectedCustomerId}
            onChange={e => onSelectCustomerId(e.target.value)}
            className="text-xs font-bold bg-transparent focus:outline-none w-full truncate cursor-pointer py-1 text-slate-800 dark:text-slate-200"
          >
            <option value="" className="bg-[#E6EEFA] text-slate-800 dark:bg-[#0B1729] dark:text-slate-200">
              Walk-in Customer (General)
            </option>
            {customers.map(c => (
              <option key={c.id} value={c.id} className="bg-[#E6EEFA] text-slate-800 dark:bg-[#0B1729] dark:text-slate-200">
                {c.fullName} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
            Debt: {formatGhs(selectedCustomer.currentDebt)}
          </span>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 neo-card-inset">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center neo-card text-slate-400">
              <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                Ticket is empty
              </p>
              <p className="text-xs text-slate-500 max-w-[200px] mt-1 leading-relaxed">
                Click or scan any item from the catalog to add it to this sale.
              </p>
            </div>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="neo-card p-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="font-extrabold text-xs leading-snug truncate text-slate-800 dark:text-slate-100">
                    {item.name}
                  </h5>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <span>{item.unitName}</span>
                    <span>·</span>
                    <span className="font-semibold">{formatGhs(item.unitPrice)}</span>
                    {item.discountAmount > 0 && (
                      <span className="text-rose-600 font-bold">(-{formatGhs(item.discountAmount)})</span>
                    )}
                    {item.priceOverridden && (
                      <span className="text-amber-600 font-bold text-[9px] bg-amber-100 dark:bg-amber-950/40 px-1 py-0.5 rounded">
                        Override
                      </span>
                    )}
                  </div>
                </div>

                <span className="font-mono font-black text-sm tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatGhs(item.lineTotal)}
                </span>
              </div>

              {/* Quantity Stepper & Quick Tools */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-300/40 dark:border-slate-800">
                {/* Stepper with Neomorphic Inset Well & Buttons */}
                <div className="neo-card-inset flex items-center p-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="neo-btn p-1 px-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2.5 text-xs font-mono font-black tabular-nums min-w-[28px] text-center text-slate-800 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="neo-btn p-1 px-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                    title="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenPriceOverride(item)}
                    className="neo-btn p-1.5 text-slate-500 hover:text-amber-600"
                    title="Price Override"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDeleteItem(item)}
                    className="neo-btn p-1.5 text-slate-500 hover:text-rose-600"
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
        <div className="neo-card p-4 space-y-3 shrink-0">
          {/* Subtotal line */}
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>Subtotal ({totalItemCount} items):</span>
            <span className="font-mono font-extrabold tabular-nums text-slate-800 dark:text-slate-200">
              {formatGhs(grossSubtotal)}
            </span>
          </div>

          {discountTotal > 0 && (
            <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400 font-bold">
              <span>Discounts Applied:</span>
              <span className="font-mono tabular-nums">-{formatGhs(discountTotal)}</span>
            </div>
          )}

          {/* Tax Breakdown Inset Well */}
          <div className="neo-card-inset overflow-hidden">
            <button
              type="button"
              onClick={() => setTaxAccordionOpen(!taxAccordionOpen)}
              className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>GRA Statutory Taxes:</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">
                <span>{formatGhs(taxDetail.totalTax)}</span>
                {taxAccordionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {taxAccordionOpen && (
              <div className="p-2.5 pt-0 border-t border-slate-300/30 dark:border-slate-800 space-y-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">
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
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-600 dark:text-slate-300">
              Total Due:
            </span>
            <span className="text-2xl font-black font-mono tabular-nums leading-none text-emerald-600 dark:text-emerald-400">
              {formatGhs(grandTotal)}
            </span>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onHoldCart}
              className="neo-btn py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Hold (F4)</span>
            </button>

            <button
              type="button"
              onClick={onOpenDiscountModal}
              className="neo-btn py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              <span>Discount</span>
            </button>
          </div>

          {/* Neomorphic Accent Checkout Button */}
          <button
            type="button"
            onClick={onInitiateCheckout}
            className="neo-btn-accent w-full py-3.5 px-5 text-sm font-black flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              <span>CHARGE / PAY</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-extrabold tabular-nums">
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
