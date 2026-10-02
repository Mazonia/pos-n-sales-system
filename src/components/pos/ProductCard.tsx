import React, { useState } from 'react';
import { LocalProduct } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import { Plus, ChevronDown, Package, Coffee, Flame, Snowflake, Sparkles, Pill, Check } from 'lucide-react';

interface ProductCardProps {
  product: LocalProduct;
  onAddToCart: (product: LocalProduct, selectedUom?: { name: string; price: number }) => void;
  isDark: boolean;
}

// Category styling helpers for immediate visual recognition
const getCategoryMeta = (category: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('grain') || cat.includes('provision')) {
    return {
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
      iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      Icon: Package,
    };
  }
  if (cat.includes('beverage') || cat.includes('breakfast')) {
    return {
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
      iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
      Icon: Coffee,
    };
  }
  if (cat.includes('cooking') || cat.includes('seasoning')) {
    return {
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
      iconBg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      Icon: Flame,
    };
  }
  if (cat.includes('dairy') || cat.includes('frozen')) {
    return {
      badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
      iconBg: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
      Icon: Snowflake,
    };
  }
  if (cat.includes('snack') || cat.includes('confectionery')) {
    return {
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
      iconBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      Icon: Sparkles,
    };
  }
  if (cat.includes('pharma') || cat.includes('otc')) {
    return {
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
      iconBg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      Icon: Pill,
    };
  }
  return {
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    Icon: Package,
  };
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isDark,
}) => {
  const [showUomMenu, setShowUomMenu] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isOutOfStock = product.currentStock <= 0;
  const isLowStock = product.currentStock > 0 && product.currentStock <= 5;

  const { badgeClass, iconBg, Icon } = getCategoryMeta(product.category);

  const handleCardClick = () => {
    if (isOutOfStock) return;
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 250);
    onAddToCart(product);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-150 select-none text-left min-h-[170px] ${
        justAdded ? 'scale-[0.98] ring-2 ring-emerald-500 ring-offset-1' : ''
      } ${
        isOutOfStock
          ? 'opacity-40 pointer-events-none grayscale bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
          : isDark
          ? 'bg-[#131A26] border-[#1E293B] hover:border-emerald-500/60 hover:bg-[#192333] shadow-sm hover:shadow-lg'
          : 'bg-white border-slate-200 hover:border-emerald-500/70 hover:bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)]'
      }`}
    >
      <div>
        {/* Top Header: Visual Category Icon + Name & Stock Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border truncate max-w-[130px] ${badgeClass}`}>
              {product.category}
            </span>
          </div>

          {/* Stock Availability Pill */}
          <div className="shrink-0">
            {isOutOfStock ? (
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {product.currentStock} left
              </span>
            ) : (
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono">
                {product.currentStock} {product.baseUnit}
              </span>
            )}
          </div>
        </div>

        {/* Product Title */}
        <h4 className={`font-bold text-[14px] leading-snug line-clamp-2 transition-colors ${
          isDark ? 'text-slate-100 group-hover:text-emerald-400' : 'text-slate-900 group-hover:text-emerald-700'
        }`}>
          {product.name}
        </h4>

        {/* Product Subtitle / Local Name */}
        {product.localName && (
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {product.localName}
          </p>
        )}
      </div>

      {/* Bottom Row: Clear Price & Add Button */}
      <div className={`mt-3 pt-3 border-t flex items-center justify-between gap-2 ${
        isDark ? 'border-slate-800' : 'border-slate-100'
      }`}>
        <div>
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
            Price
          </span>
          <span className={`text-[17px] font-black font-mono tabular-nums leading-none tracking-tight ${
            isDark ? 'text-emerald-400' : 'text-emerald-700'
          }`}>
            {formatGhs(product.retailPrice)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* UOM Selector if available */}
          {product.uomOptions && product.uomOptions.length > 0 && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowUomMenu(!showUomMenu)}
                className={`p-1.5 rounded-lg border text-xs flex items-center transition ${
                  isDark
                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
                title="Select package unit"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showUomMenu && (
                <div className={`absolute bottom-full right-0 mb-2 z-30 w-52 rounded-xl p-1.5 border shadow-xl text-xs space-y-1 ${
                  isDark ? 'bg-[#192333] border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Package Sizes:
                  </div>
                  {product.uomOptions.map(uom => (
                    <button
                      key={uom.name}
                      type="button"
                      onClick={() => {
                        onAddToCart(product, uom);
                        setShowUomMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition ${
                        isDark ? 'hover:bg-slate-800 text-slate-100' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <span className="truncate">{uom.name}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 ml-2">
                        {formatGhs(uom.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Add Button */}
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={e => {
              e.stopPropagation();
              handleCardClick();
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all active:scale-90 ${
              isDark
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
            }`}
            title="Add to Ticket"
          >
            {justAdded ? (
              <Check className="w-4 h-4 text-emerald-600 animate-scale-up" strokeWidth={3} />
            ) : (
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
