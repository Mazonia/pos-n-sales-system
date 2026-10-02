import React, { useState } from 'react';
import { LocalProduct } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import { Plus, ChevronDown, Package, Coffee, Flame, Snowflake, Sparkles, Pill, Check } from 'lucide-react';

interface ProductCardProps {
  product: LocalProduct;
  onAddToCart: (product: LocalProduct, selectedUom?: { name: string; price: number }) => void;
  isDark: boolean;
}

const getCategoryMeta = (category: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('grain') || cat.includes('provision')) {
    return {
      badgeClass: 'bg-amber-100/70 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
      iconBg: 'bg-amber-200/60 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
      Icon: Package,
    };
  }
  if (cat.includes('beverage') || cat.includes('breakfast')) {
    return {
      badgeClass: 'bg-sky-100/70 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
      iconBg: 'bg-sky-200/60 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300',
      Icon: Coffee,
    };
  }
  if (cat.includes('cooking') || cat.includes('seasoning')) {
    return {
      badgeClass: 'bg-orange-100/70 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
      iconBg: 'bg-orange-200/60 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
      Icon: Flame,
    };
  }
  if (cat.includes('dairy') || cat.includes('frozen')) {
    return {
      badgeClass: 'bg-teal-100/70 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
      iconBg: 'bg-teal-200/60 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
      Icon: Snowflake,
    };
  }
  if (cat.includes('snack') || cat.includes('confectionery')) {
    return {
      badgeClass: 'bg-purple-100/70 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
      iconBg: 'bg-purple-200/60 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
      Icon: Sparkles,
    };
  }
  if (cat.includes('pharma') || cat.includes('otc')) {
    return {
      badgeClass: 'bg-rose-100/70 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
      iconBg: 'bg-rose-200/60 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
      Icon: Pill,
    };
  }
  return {
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    iconBg: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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
      className={`neo-card group relative flex flex-col justify-between p-4 select-none text-left min-h-[175px] ${
        justAdded ? 'ring-2 ring-emerald-500 scale-[0.98]' : ''
      } ${
        isOutOfStock ? 'opacity-40 pointer-events-none grayscale' : ''
      }`}
    >
      <div>
        {/* Top Header: Category Icon + Stock Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${iconBg}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full truncate max-w-[130px] ${badgeClass}`}>
              {product.category}
            </span>
          </div>

          <div className="shrink-0">
            {isOutOfStock ? (
              <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {product.currentStock} left
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
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

        {/* Product Subtitle */}
        {product.localName && (
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {product.localName}
          </p>
        )}
      </div>

      {/* Bottom Row: Price & Tactile Add Trigger */}
      <div className="mt-3 pt-3 border-t border-slate-300/40 dark:border-slate-800 flex items-center justify-between gap-2">
        <div>
          <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 block mb-0.5">
            Price
          </span>
          <span className={`text-[17px] font-black font-mono tabular-nums leading-none tracking-tight ${
            isDark ? 'text-emerald-400' : 'text-emerald-700'
          }`}>
            {formatGhs(product.retailPrice)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {product.uomOptions && product.uomOptions.length > 0 && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowUomMenu(!showUomMenu)}
                className="neo-btn p-1.5 rounded-xl text-xs flex items-center"
                title="Select package unit"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showUomMenu && (
                <div className="neo-card absolute bottom-full right-0 mb-2 z-30 w-52 p-2 text-xs space-y-1">
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
                      className="neo-list-item-hover w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center"
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
            className="neo-btn w-9 h-9 flex items-center justify-center font-bold text-xs"
            title="Add to Ticket"
          >
            {justAdded ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
            ) : (
              <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
