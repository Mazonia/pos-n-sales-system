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
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      Icon: Package,
    };
  }
  if (cat.includes('beverage') || cat.includes('breakfast')) {
    return {
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      Icon: Coffee,
    };
  }
  if (cat.includes('cooking') || cat.includes('seasoning')) {
    return {
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
      iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      Icon: Flame,
    };
  }
  if (cat.includes('dairy') || cat.includes('frozen')) {
    return {
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
      iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      Icon: Snowflake,
    };
  }
  if (cat.includes('snack') || cat.includes('confectionery')) {
    return {
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      Icon: Sparkles,
    };
  }
  if (cat.includes('pharma') || cat.includes('otc')) {
    return {
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      Icon: Pill,
    };
  }
  return {
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    iconBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
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
    setTimeout(() => setJustAdded(false), 200);
    onAddToCart(product);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`pos-card group relative flex flex-col justify-between p-3.5 sm:p-4 select-none text-left min-h-[160px] cursor-pointer ${
        justAdded ? 'ring-2 ring-emerald-500 ring-offset-2 scale-[0.985]' : ''
      } ${
        isOutOfStock ? 'opacity-40 pointer-events-none grayscale' : ''
      }`}
    >
      <div>
        {/* Top Header: Category Badge + Stock Pill */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${iconBg}`}>
              <Icon className="w-3 h-3" />
            </div>
            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border truncate max-w-[125px] ${badgeClass}`}>
              {product.category}
            </span>
          </div>

          <div className="shrink-0">
            {isOutOfStock ? (
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 rounded-full">
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {product.currentStock} left
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {product.currentStock} in stock
              </span>
            )}
          </div>
        </div>

        {/* Product Title */}
        <h4 className="font-semibold text-[13.5px] sm:text-[14px] leading-snug line-clamp-2 text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {product.name}
        </h4>

        {/* Localized / Variant Subtitle */}
        {product.localName && (
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-normal">
            {product.localName}
          </p>
        )}
      </div>

      {/* Bottom Row: Price & Modern Add Trigger */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
            Price
          </span>
          <span className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatGhs(product.retailPrice)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {product.uomOptions && product.uomOptions.length > 0 && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowUomMenu(!showUomMenu)}
                className="pos-btn p-1.5 rounded-lg text-xs flex items-center"
                title="Select package unit"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showUomMenu && (
                <div className="pos-card absolute bottom-full right-0 mb-2 z-30 w-52 p-1.5 text-xs space-y-1 shadow-lg">
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
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-2 tabular-nums">
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
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-emerald-500 dark:hover:text-slate-950 active:scale-90"
            title="Add to Ticket"
          >
            {justAdded ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
            ) : (
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
