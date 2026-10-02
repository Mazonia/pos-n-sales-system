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
            : 'bg-white border-[rgba(209,215,224,0.5)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
        }`}>
          <div className={`w-10 h-10 rounded-[12px] mx-auto flex items-center justify-center mb-2 ${
            isDark ? 'bg-emerald-500/8 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <Boxes className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>All Inventory Levels Safe</span>
          <p className="text-[10px] mt-1 text-[#8B9DB5]">No products currently below their safety threshold.</p>
        </div>
      );
    }
    return null;
  }

  // Dropdown layout (for clicking notification bell in navbar)
  if (variant === 'dropdown') {
    return (
      <div className={`w-80 sm:w-96 rounded-[18px] border p-4 space-y-3 z-50 text-xs animate-expand-in ${
        isDark 
          ? 'bg-[#0D1117] border-[rgba(48,62,80,0.4)] text-[#F0F4F8] shadow-[0_8px_32px_rgba(0,0,0,0.5)]' 
          : 'bg-white border-[rgba(209,215,224,0.5)] text-[#0F172A] shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
      }`}>
        <div className={`flex items-center justify-between border-b pb-2.5 ${
          isDark ? 'border-[rgba(48,62,80,0.3)]' : 'border-[rgba(209,215,224,0.4)]'
        }`}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className={`font-bold text-xs uppercase tracking-wider font-mono ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Safety Threshold Alert
            </span>
          </div>
          <span className={`px-2 py-[3px] rounded-[8px] font-mono font-bold text-[10px] ${
            isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {lowStockProducts.length} Items
          </span>
        </div>

        <p className="text-[11px] text-[#8B9DB5]">
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
                className={`p-2.5 rounded-[12px] border flex items-center justify-between gap-2 animate-fade-slide-in ${
                  isDark ? 'bg-[#151B23]/60 border-amber-500/15' : 'bg-amber-50/40 border-amber-200/60'
                }`}
              >
                <div className="truncate flex-1">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-[10px] text-[#8B9DB5] font-mono flex items-center gap-1.5 mt-0.5">
                    <span className="text-amber-500 font-bold">
                      Stock: {p.currentStock} {p.baseUnit}
                    </span>
                    <span className="opacity-40">/</span>
                    <span>Safety: {threshold}</span>
                  </div>
                </div>

                <span className={`px-1.5 py-[3px] rounded-[6px] text-[10px] font-mono font-bold shrink-0 ${
                  isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'
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
          className={`w-full py-2.5 px-3 rounded-[12px] font-bold text-xs active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 ${
            isDark 
              ? 'bg-amber-500 hover:bg-amber-400 text-[#06080C] shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'bg-amber-500 hover:bg-amber-400 text-white shadow-[0_2px_8px_rgba(245,158,11,0.15)]'
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>One-Click Generate PO Draft</span>
        </button>
      </div>
    );
  }

  // Banner layout (Prominently rendered in Dashboard / Inventory)
  return (
    <div className={`p-4 rounded-[18px] border transition-all duration-300 relative overflow-hidden ${
      isDark
        ? 'bg-gradient-to-r from-amber-500/[0.06] via-[#0D1117] to-amber-500/[0.03] border-amber-500/20 shadow-[0_2px_16px_rgba(245,158,11,0.06)]'
        : 'bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30 border-amber-200 shadow-[0_2px_8px_rgba(245,158,11,0.04)]'
    }`}>
      {/* Decorative Warm Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/8 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Indicator & Description */}
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${
            isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-100 border border-amber-200 text-amber-600'
          }`}>
            <AlertTriangle className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`font-extrabold text-sm tracking-tight flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                <span>Critical Safety Threshold Warning</span>
              </span>
              <span className={`px-2 py-[2px] rounded-[8px] text-[10px] font-mono font-bold ${
                isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {lowStockProducts.length} Product{lowStockProducts.length > 1 ? 's' : ''} Deficit
              </span>
            </div>

            <p className="text-xs text-[#8B9DB5] mt-1 max-w-xl leading-relaxed">
              Stock levels have dropped below your safety threshold floor. Rapid restocking is recommended to prevent sales stockouts.
            </p>

            {/* Quick Preview Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {lowStockProducts.slice(0, 4).map(p => {
                const threshold = p.safetyThreshold || p.reorderLevel || 10;
                return (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-[8px] text-[11px] font-mono border ${
                      isDark
                        ? 'bg-[#0A0D12]/60 border-amber-500/15 text-[#8B9DB5]'
                        : 'bg-white border-amber-200/60 text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                    }`}
                  >
                    <span className="font-sans font-semibold truncate max-w-[130px]">{p.name}</span>
                    <span className="text-amber-500 font-bold">
                      {p.currentStock}/{threshold} {p.baseUnit}
                    </span>
                  </span>
                );
              })}
              {lowStockProducts.length > 4 && (
                <span className="text-[11px] text-[#8B9DB5] self-center pl-1 font-mono">
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
            className={`w-full md:w-auto px-5 py-2.5 rounded-[12px] font-extrabold text-xs active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 ${
              isDark 
                ? 'bg-amber-500 hover:bg-amber-400 text-[#06080C] shadow-[0_2px_12px_rgba(245,158,11,0.2)]' 
                : 'bg-amber-500 hover:bg-amber-400 text-white shadow-[0_2px_8px_rgba(245,158,11,0.15)]'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>One-Click Generate PO Draft</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
