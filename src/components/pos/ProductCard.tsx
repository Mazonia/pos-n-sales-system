import React, { useState } from 'react';
import { LocalProduct } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import { Plus, ChevronDown, Package, Coffee, Flame, Snowflake, Sparkles, Pill, Check, ImageIcon } from 'lucide-react';

interface ProductCardProps {
  product: LocalProduct;
  onAddToCart: (product: LocalProduct, selectedUom?: { name: string; price: number }) => void;
  isDark: boolean;
  showImage?: boolean;
  suggestedMatchBadge?: string;
}

const getCategoryMeta = (category: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('grain') || cat.includes('provision')) {
    return {
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
      iconBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
      Icon: Package,
    };
  }
  if (cat.includes('beverage') || cat.includes('breakfast')) {
    return {
      badgeClass: 'bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-900/60 dark:text-stone-300 dark:border-stone-800',
      iconBg: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/25',
      Icon: Coffee,
    };
  }
  if (cat.includes('cooking') || cat.includes('seasoning')) {
    return {
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
      iconBg: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25',
      Icon: Flame,
    };
  }
  if (cat.includes('dairy') || cat.includes('frozen')) {
    return {
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
      iconBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
      Icon: Snowflake,
    };
  }
  if (cat.includes('snack') || cat.includes('confectionery')) {
    return {
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
      iconBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25',
      Icon: Sparkles,
    };
  }
  if (cat.includes('pharma') || cat.includes('otc')) {
    return {
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
      iconBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
      Icon: Pill,
    };
  }
  return {
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
    iconBg: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/25',
    Icon: Package,
  };
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isDark,
  showImage = true,
  suggestedMatchBadge,
}) => {
  const [showUomMenu, setShowUomMenu] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isOutOfStock = product.currentStock <= 0;
  const isLowStock = product.currentStock > 0 && product.currentStock <= 5;

  const { badgeClass, iconBg, Icon } = getCategoryMeta(product.category);

  const handleCardClick = () => {
    if (isOutOfStock) return;
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 200);
    onAddToCart(product);
  };

  const hasValidImage = Boolean(showImage && product.imageUrl && !imageError);

  return (
    <div
      onClick={handleCardClick}
      className={`pos-card group relative flex flex-col justify-between p-3 sm:p-3.5 select-none text-left cursor-pointer transition-all duration-200 ${
        hasValidImage ? 'min-h-[250px]' : 'min-h-[160px]'
      } ${
        justAdded ? 'ring-2 ring-amber-500 ring-offset-2 scale-[0.985]' : ''
      } ${
        isOutOfStock ? 'opacity-40 pointer-events-none grayscale' : ''
      }`}
    >
      <div>
        {/* Typo / Mistake Suggestion Banner (if rendered as fuzzy match) */}
        {suggestedMatchBadge && (
          <div className="mb-2 px-2 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{suggestedMatchBadge}</span>
          </div>
        )}

        {/* Product Image (when enabled by teller) */}
        {showImage && (
          <div className="w-full h-32 sm:h-36 mb-2.5 rounded-xl overflow-hidden bg-stone-100 dark:bg-[#15171D] border border-stone-200/80 dark:border-[#282B34] flex items-center justify-center relative group-hover:border-amber-500/50 transition-colors">
            {hasValidImage ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                loading="lazy"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 text-stone-400 dark:text-stone-600">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> No Photo
                </span>
              </div>
            )}

            {/* In-image stock badge */}
            <div className="absolute top-2 right-2">
              {isOutOfStock ? (
                <span className="text-[9.5px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50/95 dark:bg-rose-950/90 backdrop-blur-xs border border-rose-300/80 dark:border-rose-800/80 px-2 py-0.5 rounded-full shadow-xs">
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="text-[9.5px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50/95 dark:bg-amber-950/90 backdrop-blur-xs border border-amber-300/80 dark:border-amber-800/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {product.currentStock} left
                </span>
              ) : (
                <span className="text-[10px] font-medium text-stone-700 dark:text-stone-300 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs border border-stone-200/80 dark:border-[#282B34] px-2 py-0.5 rounded-full tabular-nums shadow-xs">
                  {product.currentStock} in stock
                </span>
              )}
            </div>
          </div>
        )}

        {/* Header without image: Category Badge + Stock Pill */}
        {!showImage && (
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
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {product.currentStock} left
                </span>
              ) : (
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 tabular-nums">
                  {product.currentStock} in stock
                </span>
              )}
            </div>
          </div>
        )}

        {/* Category Pill (when image is shown) */}
        {showImage && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border truncate ${badgeClass}`}>
              {product.category}
            </span>
            <span className="text-[10.5px] font-mono text-stone-400 dark:text-stone-500">
              {product.sku}
            </span>
          </div>
        )}

        {/* Product Title */}
        <h4 className="font-semibold text-[13px] sm:text-[14px] leading-snug line-clamp-2 text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
          {product.name}
        </h4>

        {/* Localized / Variant Subtitle */}
        {product.localName && (
          <p className="text-[11.5px] text-stone-500 dark:text-stone-400 mt-0.5 truncate font-normal">
            {product.localName}
          </p>
        )}
      </div>

      {/* Bottom Row: Price & Modern Add Trigger */}
      <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-[#282B34] flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-stone-400 dark:text-stone-500 block">
            Price
          </span>
          <span className="text-[16px] sm:text-[17px] font-bold tracking-tight text-stone-900 dark:text-amber-400 tabular-nums">
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
                  <div className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
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
                      <span className="font-bold text-amber-600 dark:text-amber-400 ml-2 tabular-nums">
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
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all bg-stone-100 hover:bg-amber-600 hover:text-white text-stone-700 dark:bg-[#20232B] dark:text-amber-300 dark:hover:bg-amber-500 dark:hover:text-stone-950 active:scale-90"
            title="Add to Ticket"
          >
            {justAdded ? (
              <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={3} />
            ) : (
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
