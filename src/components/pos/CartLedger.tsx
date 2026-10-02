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
  ShieldCheck,
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
    <div className={`flex flex-col h-full select-none ${
      isDark ? 'bg-[#0A0D12]' : 'bg-[#FAFBFC]'
    }`}>
      
      {/* Top Header: Active Ticket & Customer Context */}
      <div className={`p-4 border-b shrink-0 flex items-center justify-between gap-3 ${
        isDark 
          ? 'border-[rgba(48,62,80,0.35)] bg-[rgba(13,17,23,0.6)]' 
          : 'border-[rgba(209,215,224,0.5)] bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center transition-all duration-200 ${
            isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
            <Receipt className="w-4 h-4" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className={`text-[13px] font-bold tracking-tight ${isDark ? 'text-[#F0F4F8]' : 'text-[#0F172A]'}`}>
              Current Ticket
            </h3>
            <span className="text-[10px] text-[#8B9DB5] font-mono tabular-nums">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in queue
            </span>
          </div>
        </div>

        {/* Parked Carts Trigger */}
        <button
          type="button"
          onClick={onOpenParkedModal}
          className={`relative px-2.5 py-[7px] rounded-[12px] border text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-[0.96] ${
            isDark
              ? 'border-[rgba(48,62,80,0.5)] bg-[#151B23] hover:bg-[#1C2333] text-[#F0F4F8]'
              : 'border-[rgba(209,215,224,0.5)] bg-white hover:bg-[#F0F2F5] text-[#0F172A] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
          }`}
          title="View Held Carts"
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>Held</span>
          {parkedCartCount > 0 && (
            <span className="w-[18px] h-[18px] rounded-full bg-amber-500 text-[#06080C] text-[10px] font-bold flex items-center justify-center font-mono shadow-[0_0_6px_rgba(245,158,11,0.25)]">
              {parkedCartCount}
            </span>
          )}
        </button>
      </div>

      {/* Customer Selection */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
        isDark ? 'border-[rgba(48,62,80,0.25)] bg-[rgba(13,17,23,0.35)]' : 'border-[rgba(209,215,224,0.4)] bg-[#F6F8FA]'
      }`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <UserCheck className="w-3.5 h-3.5 text-[#8B9DB5] shrink-0" strokeWidth={1.8} />
          <select
            value={selectedCustomerId}
            onChange={e => onSelectCustomerId(e.target.value)}
            className={`text-xs font-medium bg-transparent focus:outline-none w-full truncate cursor-pointer ${
              isDark ? 'text-[#F0F4F8]' : 'text-[#0F172A]'
            }`}
          >
            <option value="" className={isDark ? 'bg-[#0D1117] text-[#8B9DB5]' : 'bg-white text-[#64748B]'}>
              Walk-in Customer (General)
            </option>
            {customers.map(c => (
              <option key={c.id} value={c.id} className={isDark ? 'bg-[#0D1117] text-white' : 'bg-white text-black'}>
                {c.fullName} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <span className={`text-[10px] font-mono font-semibold px-2 py-[3px] rounded-[8px] whitespace-nowrap tabular-nums ${
            isDark 
              ? 'bg-amber-500/8 text-amber-400 border border-amber-500/15' 
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            Debt: {formatGhs(selectedCustomer.currentDebt)}
          </span>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center animate-float-soft ${
              isDark ? 'bg-[#151B23] text-[#556575] border border-[rgba(48,62,80,0.3)]' : 'bg-[#F0F2F5] text-[#94A3B8] border border-[rgba(209,215,224,0.3)]'
            }`}>
              <ShoppingBag className="w-6 h-6 stroke-[1.4]" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-[#F0F4F8]' : 'text-[#0F172A]'}`}>
                Ticket is empty
              </p>
              <p className="text-[11px] text-[#8B9DB5] max-w-[220px] mt-1.5 leading-relaxed">
                Scan barcode or click items in the catalog to add. Press <kbd className={`px-1.5 py-[2px] rounded-[6px] font-mono text-[10px] font-medium ${
                  isDark ? 'bg-[#1C2333] text-[#8B9DB5] border border-[rgba(48,62,80,0.3)]' : 'bg-[#E2E5E9] text-[#64748B]'
                }`}>F9</kbd> to search.
              </p>
            </div>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div
              key={item.id}
              style={{ animationDelay: `${idx * 30}ms` }}
              className={`p-3.5 rounded-[14px] border transition-all duration-200 animate-fade-slide-in ${
                isDark
                  ? 'bg-[#0D1117] border-[rgba(48,62,80,0.35)] hover:border-[rgba(48,62,80,0.6)]'
                  : 'bg-white border-[rgba(209,215,224,0.4)] hover:border-[rgba(175,184,196,0.5)] shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className={`font-semibold text-[12px] leading-snug truncate ${isDark ? 'text-[#F0F4F8]' : 'text-[#0F172A]'}`}>
                    {item.name}
                  </h5>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#8B9DB5] font-mono tabular-nums">
                    <span>{item.unitName}</span>
                    <span className="opacity-40">·</span>
                    <span>{formatGhs(item.unitPrice)}</span>
                    {item.discountAmount > 0 && (
                      <span className="text-[#EF4444] font-medium">(-{formatGhs(item.discountAmount)})</span>
                    )}
                    {item.priceOverridden && (
                      <span className={`text-amber-500 font-medium px-1 py-[1px] rounded text-[9px] ${
                        isDark ? 'bg-amber-500/8' : 'bg-amber-50'
                      }`}>Override</span>
                    )}
                  </div>
                </div>

                <span className={`font-mono font-extrabold text-[12px] tabular-nums ${
                  isDark ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  {formatGhs(item.lineTotal)}
                </span>
              </div>

              {/* Quantity Controls & Tools */}
              <div className={`flex items-center justify-between pt-2.5 mt-2.5 border-t ${
                isDark ? 'border-[rgba(48,62,80,0.2)]' : 'border-[rgba(209,215,224,0.3)]'
              }`}>
                {/* Stepper with tactile feel */}
                <div className={`flex items-center rounded-[10px] border ${
                  isDark ? 'border-[rgba(48,62,80,0.4)] bg-[#0A0D12]' : 'border-[rgba(209,215,224,0.5)] bg-[#F6F8FA]'
                }`}>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className={`p-1.5 transition-all duration-150 active:scale-90 rounded-l-[9px] ${
                      isDark ? 'text-[#8B9DB5] hover:text-emerald-400 hover:bg-[#151B23]' : 'text-[#64748B] hover:text-emerald-600 hover:bg-[#F0F2F5]'
                    }`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className={`px-3 text-[12px] font-mono font-bold tabular-nums ${isDark ? 'text-[#F0F4F8]' : 'text-[#0F172A]'}`}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className={`p-1.5 transition-all duration-150 active:scale-90 rounded-r-[9px] ${
                      isDark ? 'text-[#8B9DB5] hover:text-emerald-400 hover:bg-[#151B23]' : 'text-[#64748B] hover:text-emerald-600 hover:bg-[#F0F2F5]'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onOpenPriceOverride(item)}
                    className={`p-1.5 rounded-[8px] transition-all duration-150 active:scale-90 ${
                      isDark ? 'text-[#556575] hover:text-amber-400 hover:bg-amber-500/8' : 'text-[#94A3B8] hover:text-amber-600 hover:bg-amber-50'
                    }`}
                    title="Price Override"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDeleteItem(item)}
                    className={`p-1.5 rounded-[8px] transition-all duration-150 active:scale-90 ${
                      isDark ? 'text-[#556575] hover:text-rose-400 hover:bg-rose-500/8' : 'text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title="Void Line Item"
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
        <div className={`p-4 border-t space-y-3 shrink-0 ${
          isDark 
            ? 'border-[rgba(48,62,80,0.35)] bg-[rgba(13,17,23,0.6)]' 
            : 'border-[rgba(209,215,224,0.5)] bg-white'
        }`}>
          
          {/* Subtotal line */}
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8B9DB5]">Gross Subtotal:</span>
            <span className={`font-mono tabular-nums font-semibold ${isDark ? 'text-[#F0F4F8]' : 'text-[#0F172A]'}`}>
              {formatGhs(grossSubtotal)}
            </span>
          </div>

          {discountTotal > 0 && (
            <div className="flex justify-between text-[11px] text-[#EF4444] font-medium">
              <span>Discounts Applied:</span>
              <span className="font-mono tabular-nums">-{formatGhs(discountTotal)}</span>
            </div>
          )}

          {/* Tax Accordion */}
          <div className={`rounded-[12px] border transition-all duration-250 overflow-hidden ${
            isDark ? 'bg-[#0A0D12] border-[rgba(48,62,80,0.3)]' : 'bg-[#F6F8FA] border-[rgba(209,215,224,0.4)]'
          }`}>
            <button
              type="button"
              onClick={() => setTaxAccordionOpen(!taxAccordionOpen)}
              className={`w-full p-2.5 flex items-center justify-between text-[11px] transition-colors duration-150 ${
                isDark ? 'text-[#8B9DB5] hover:text-[#F0F4F8]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.8} />
                <span>GRA Statutory Taxes & Levies:</span>
                <span className="font-mono font-bold text-emerald-500 tabular-nums">
                  {formatGhs(taxDetail.totalTax)}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${taxAccordionOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`grid transition-all duration-300 ${taxAccordionOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <div className={`px-3 pb-2.5 pt-1 border-t text-[10px] font-mono tabular-nums space-y-1 ${
                  isDark ? 'border-[rgba(48,62,80,0.2)] text-[#8B9DB5]' : 'border-[rgba(209,215,224,0.3)] text-[#64748B]'
                }`}>
                  <div className="flex justify-between">
                    <span>Taxable Base (P):</span>
                    <span>{formatGhs(taxDetail.taxableBase)}</span>
                  </div>
                  {taxScheme === 'STANDARD_VAT' && (
                    <>
                      <div className="flex justify-between">
                        <span>NHIL (2.5%):</span>
                        <span>{formatGhs(taxDetail.nhil)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GETFund (2.5%):</span>
                        <span>{formatGhs(taxDetail.getfund)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COVID-19 (1.0%):</span>
                        <span>{formatGhs(taxDetail.covid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT (15% on Base+Levies):</span>
                        <span>{formatGhs(taxDetail.vat)}</span>
                      </div>
                    </>
                  )}
                  <div className={`flex justify-between font-bold text-emerald-500 border-t border-dashed pt-1.5 mt-1 ${
                    isDark ? 'border-[rgba(48,62,80,0.3)]' : 'border-[rgba(209,215,224,0.4)]'
                  }`}>
                    <span>Effective Tax Included:</span>
                    <span>{taxDetail.effectiveRatePct.toFixed(2)}% ({formatGhs(taxDetail.totalTax)})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grand Total Row */}
          <div className={`flex justify-between items-baseline pt-1 pb-1`}>
            <span className="text-[11px] uppercase font-extrabold tracking-widest text-[#8B9DB5]">Total Due:</span>
            <span className={`text-[28px] font-extrabold font-mono tabular-nums tracking-tight leading-none animate-count-up ${
              isDark ? 'text-[#F0F4F8] text-glow-emerald' : 'text-[#0F172A]'
            }`}>
              {formatGhs(grandTotal)}
            </span>
          </div>

          {/* Secondary Action Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onHoldCart}
              className={`py-2.5 px-3 rounded-[12px] border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.96] ${
                isDark
                  ? 'border-[rgba(48,62,80,0.5)] bg-[#151B23] hover:bg-[#1C2333] text-[#F0F4F8]'
                  : 'border-[rgba(209,215,224,0.5)] bg-white hover:bg-[#F0F2F5] text-[#0F172A] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Hold (F4)</span>
            </button>

            <button
              type="button"
              onClick={onOpenDiscountModal}
              className={`py-2.5 px-3 rounded-[12px] border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.96] ${
                isDark
                  ? 'border-[rgba(48,62,80,0.5)] bg-[#151B23] hover:bg-[#1C2333] text-[#F0F4F8]'
                  : 'border-[rgba(209,215,224,0.5)] bg-white hover:bg-[#F0F2F5] text-[#0F172A] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-emerald-500" />
              <span>Discount</span>
            </button>
          </div>

          {/* Big Checkout Button */}
          <button
            type="button"
            onClick={onInitiateCheckout}
            className={`w-full py-4 px-4 rounded-[14px] text-[13px] flex items-center justify-between cursor-pointer font-black btn-checkout-gradient text-[#06080C] shadow-[0_4px_16px_rgba(16,185,129,0.2),0_0_0_1px_rgba(16,185,129,0.3)]`}
          >
            <div className="flex items-center gap-2.5">
              <Banknote className="w-[18px] h-[18px]" strokeWidth={2} />
              <span>PROCESS PAYMENT</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold tabular-nums tracking-tight">
                {formatGhs(grandTotal)}
              </span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </button>

        </div>
      )}

    </div>
  );
};
