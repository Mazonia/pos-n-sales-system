import React from 'react';
import { LocalProduct } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import {
  AlertTriangle,
  FileText,
  Boxes,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Zap
} from 'lucide-react';

interface StockSafetyNotificationProps {
  lowStockProducts: LocalProduct[];
  onOpenPoDraft: (selectedProds?: LocalProduct[]) => void;
  isDark: boolean;
  variant?: 'banner' | 'dropdown' | 'card';
}

export const StockSafetyNotification: React.FC<StockSafetyNotificationProps> = ({
  lowStockProducts,
  onOpenPoDraft,
  isDark,
  variant = 'banner',
}) => {
  if (lowStockProducts.length === 0) {
    if (variant === 'dropdown') {
      return (
        <div className={`w-80 sm:w-96 rounded-[18px] border p-5 text-center text-xs animate-expand-in ${
          isDark 
            ? 'bg-[#0D1117] border-[rgba(48,62,80,0.4)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]' 
            : 'bg-white border-slate-300 shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
        }`}>
          <div className={`w-10 h-10 rounded-[12px] mx-auto flex items-center justify-center mb-2 ${
            isDark ? 'bg-emerald-500/8 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <Boxes className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>All Inventory Levels Safe</span>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-[#8B9DB5]' : 'text-slate-500'}`}>No products currently below their safety threshold.</p>
        </div>
      );
    }
    return null;
  }

  // Dropdown layout (for clicking notification bell in navbar)
  if (variant === 'dropdown') {
    return (
      <div className={`w-80 sm:w-96 rounded-2xl border p-4 space-y-3 z-50 text-xs animate-expand-in font-serif ${
        isDark 
          ? 'bg-[#16181F] border-[#282B34] text-stone-100 shadow-[0_8px_32px_rgba(0,0,0,0.6)]' 
          : 'bg-white border-slate-300 text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
      }`}>
        <div className={`flex items-center justify-between border-b pb-2.5 ${
          isDark ? 'border-[#282B34]' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4500] opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF4500]"></span>
            </span>
            <span className={`font-bold text-xs uppercase tracking-wider font-mono ${isDark ? 'text-[#FF5722]' : 'text-[#FF4500]'}`}>
              Safety Threshold Alert
            </span>
          </div>
          <span className={`px-2 py-[3px] rounded-[8px] font-mono tabular-nums font-bold text-[10px] ${
            isDark ? 'bg-[#FF4500]/15 text-[#FF5722] border border-[#FF4500]/30' : 'bg-orange-50 text-[#C43400] border border-orange-200'
          }`}>
            {lowStockProducts.length} Items
          </span>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-stone-400 font-serif">
          The following products have dropped below their mandated safety stock floor:
        </p>

        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {lowStockProducts.map((p, idx) => {
            const threshold = p.safetyThreshold || p.reorderLevel || 10;
            const deficit = Math.max(1, threshold - p.currentStock);
            return (
              <div
                key={p.id}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 animate-fade-slide-in ${
                  isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <div className="truncate flex-1">
                  <div className="font-serif font-semibold truncate text-slate-900 dark:text-stone-100">{p.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-stone-400 font-mono tabular-nums flex items-center gap-1.5 mt-0.5">
                    <span className="text-[#FF4500] font-bold">
                      Stock: {p.currentStock} {p.baseUnit}
                    </span>
                    <span className="opacity-40">/</span>
                    <span>Safety: {threshold}</span>
                  </div>
                </div>

                <span className={`px-1.5 py-[3px] rounded-lg text-[10px] font-mono tabular-nums font-bold shrink-0 ${
                  isDark ? 'bg-[#FF4500]/15 text-[#FF5722]' : 'bg-orange-100 text-[#C43400]'
                }`}>
                  -{deficit} {p.baseUnit}
                </span>
              </div>
            );
          })}
        </div>

        {/* ONE-CLICK ACTION TO GENERATE PO DRAFT */}
        <button
          type="button"
          onClick={() => onOpenPoDraft(lowStockProducts)}
          className="w-full py-2.5 px-3 rounded-xl font-bold font-serif text-xs active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#E03E00] text-white shadow-[0_2px_10px_rgba(255,69,0,0.3)]"
        >
          <Zap className="w-3.5 h-3.5 fill-white" />
          <span>One-Click Generate PO Draft</span>
        </button>
      </div>
    );
  }

  // Banner layout (Prominently rendered in Dashboard / Inventory)
  return (
    <div className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden font-serif ${
      isDark
        ? 'bg-gradient-to-r from-[#FF4500]/[0.08] via-[#16181F] to-[#FF4500]/[0.03] border-[#FF4500]/25 shadow-[0_2px_16px_rgba(255,69,0,0.08)]'
        : 'bg-gradient-to-r from-orange-50/80 via-white to-orange-50/30 border-orange-300 shadow-[0_2px_8px_rgba(255,69,0,0.06)]'
    }`}>
      {/* Decorative Warm Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FF4500]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Indicator & Description */}
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isDark ? 'bg-[#FF4500]/15 border border-[#FF4500]/30 text-[#FF4500]' : 'bg-orange-100 border border-orange-200 text-[#FF4500]'
          }`}>
            <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`font-serif font-extrabold text-sm tracking-tight flex items-center gap-1.5 ${isDark ? 'text-[#FF5722]' : 'text-[#C43400]'}`}>
                <span>Critical Safety Threshold Warning</span>
              </span>
              <span className={`px-2 py-[2px] rounded-lg text-[10px] font-mono tabular-nums font-bold ${
                isDark ? 'bg-[#FF4500]/15 text-[#FF5722] border border-[#FF4500]/30' : 'bg-orange-100 text-[#C43400] border border-orange-200'
              }`}>
                {lowStockProducts.length} Product{lowStockProducts.length > 1 ? 's' : ''} Deficit
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-stone-400 font-serif mt-1 max-w-xl leading-relaxed">
              Stock levels have dropped below your safety threshold floor. Rapid restocking is recommended to prevent sales stockouts.
            </p>

            {/* Quick Preview Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {lowStockProducts.slice(0, 4).map(p => {
                const threshold = p.safetyThreshold || p.reorderLevel || 10;
                return (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-lg text-[11px] font-serif border ${
                      isDark
                        ? 'bg-[#121316] border-[#282B34] text-stone-300'
                        : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                    }`}
                  >
                    <span className="font-serif font-semibold truncate max-w-[130px]">{p.name}</span>
                    <span className="text-[#FF4500] font-bold font-mono tabular-nums">
                      {p.currentStock}/{threshold} {p.baseUnit}
                    </span>
                  </span>
                );
              })}
              {lowStockProducts.length > 4 && (
                <span className="text-[11px] text-slate-500 dark:text-stone-400 self-center pl-1 font-mono tabular-nums">
                  +{lowStockProducts.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: PO Generator Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenPoDraft(lowStockProducts)}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl font-extrabold font-serif text-xs active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#E03E00] text-white shadow-[0_2px_12px_rgba(255,69,0,0.3)]"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>One-Click Generate PO Draft</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
