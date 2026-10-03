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
      badgeClass: 'bg-orange-50/80 text-[#C43400] border-orange-200/80 dark:bg-orange-950/40 dark:text-[#FF6E40] dark:border-orange-800/40',
      iconBg: 'bg-[#FF4500]/10 text-[#FF4500] dark:text-[#FF5722] border-[#FF4500]/25',
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
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
      iconBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
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
      badgeClass: 'bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40',
      iconBg: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25',
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
      className={`pos-card group relative flex flex-col justify-between p-3 select-none text-left cursor-pointer transition-all duration-200 h-full overflow-hidden ${
        justAdded ? 'ring-2 ring-[#FF4500] ring-offset-2 scale-[0.985]' : ''
      } ${
        isOutOfStock ? 'opacity-40 pointer-events-none grayscale' : ''
      }`}
    >
      {/* Top Body Container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Typo / Mistake Suggestion Banner (if rendered as fuzzy match) */}
        {suggestedMatchBadge && (
          <div className="mb-2 px-2 py-0.5 rounded-lg bg-[#FF4500]/10 dark:bg-[#FF4500]/15 border border-[#FF4500]/30 text-[#C43400] dark:text-[#FF6E40] text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs shrink-0">
            <Sparkles className="w-3 h-3 text-[#FF4500] shrink-0" />
            <span className="truncate">{suggestedMatchBadge}</span>
          </div>
        )}

        {/* Product Image (when enabled by teller) */}
        {showImage && (
          <div className="w-full aspect-[16/10] max-h-28 sm:max-h-32 mb-2 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#15171D] border border-slate-300 dark:border-[#282B34] flex items-center justify-center relative group-hover:border-[#FF4500]/60 transition-colors shrink-0">
            {hasValidImage ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                loading="lazy"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-stone-600">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${iconBg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9.5px] font-semibold flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> No Photo
                </span>
              </div>
            )}

            {/* In-image stock badge */}
            <div className="absolute top-1.5 right-1.5">
              {isOutOfStock ? (
                <span className="text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50/95 dark:bg-rose-950/90 backdrop-blur-xs border border-rose-300/80 dark:border-rose-800/80 px-1.5 py-0.5 rounded-md shadow-xs">
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="text-[9px] font-bold text-[#C43400] dark:text-[#FF6E40] bg-orange-50/95 dark:bg-orange-950/90 backdrop-blur-xs border border-orange-300 dark:border-orange-800/80 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500] animate-pulse" />
                  {product.currentStock} left
                </span>
              ) : (
                <span className="text-[9.5px] font-semibold text-slate-800 dark:text-stone-300 bg-white/95 dark:bg-stone-900/90 backdrop-blur-xs border border-slate-300 dark:border-[#282B34] px-1.5 py-0.5 rounded-md tabular-nums shadow-xs">
                  {product.currentStock} in stock
                </span>
              )}
            </div>
          </div>
        )}

        {/* Header without image: Category Badge + Stock Pill */}
        {!showImage && (
          <div className="flex items-center justify-between gap-1.5 mb-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${iconBg}`}>
                <Icon className="w-3 h-3" />
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border truncate ${badgeClass}`}>
                {product.category}
              </span>
            </div>

            <div className="shrink-0">
              {isOutOfStock ? (
                <span className="text-[9.5px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 px-1.5 py-0.5 rounded-md">
                  Out
                </span>
              ) : isLowStock ? (
                <span className="text-[9.5px] font-bold text-[#C43400] dark:text-[#FF6E40] bg-orange-50 dark:bg-orange-950/60 border border-orange-200/80 dark:border-orange-800/50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500] animate-pulse" />
                  {product.currentStock} left
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-600 dark:text-stone-400 tabular-nums">
                  {product.currentStock} left
                </span>
              )}
            </div>
          </div>
        )}

        {/* Category Pill (when image is shown) */}
        {showImage && (
          <div className="flex items-center gap-1.5 mb-1 shrink-0">
            <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md border truncate ${badgeClass}`}>
              {product.category}
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-stone-500 font-semibold truncate">
              {product.sku}
            </span>
          </div>
        )}

        {/* Product Title */}
        <h4 className="font-bold text-[13px] sm:text-[13.5px] leading-snug line-clamp-2 min-w-0 text-slate-900 dark:text-stone-100 group-hover:text-[#FF4500] dark:group-hover:text-[#FF5722] transition-colors">
          {product.name}
        </h4>

        {/* Localized / Variant Subtitle */}
        {product.localName && (
          <p className="text-[11px] text-slate-600 dark:text-stone-400 mt-0.5 truncate font-medium min-w-0">
            {product.localName}
          </p>
        )}
      </div>

      {/* Bottom Row: Fixed Pinned Price & Add Action (Always visible & inside the card) */}
      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-[#282B34] flex items-center justify-between gap-1.5 shrink-0">
        <div className="min-w-0 flex-1 overflow-hidden">
          <span className="text-[9.5px] uppercase font-bold tracking-wider text-slate-500 dark:text-stone-500 block leading-none mb-0.5">
            Price
          </span>
          <span className="text-[15px] sm:text-[16px] font-black tracking-tight text-[#FF4500] dark:text-[#FF5722] tabular-nums truncate block">
            {formatGhs(product.retailPrice)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {product.uomOptions && product.uomOptions.length > 0 && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowUomMenu(!showUomMenu)}
                className="pos-btn p-1.5 rounded-lg text-xs flex items-center cursor-pointer border border-slate-300 dark:border-[#282B34]"
                title="Select package unit"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showUomMenu && (
                <div className="pos-card absolute bottom-full right-0 mb-2 z-30 w-52 p-1.5 text-xs space-y-1 shadow-lg border border-slate-300 dark:border-[#282B34]">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-stone-400 uppercase tracking-wider">
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
                      className="neo-list-item-hover w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate">{uom.name}</span>
                      <span className="font-bold text-[#FF4500] dark:text-[#FF5722] ml-2 tabular-nums">
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
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all bg-slate-100 hover:bg-[#FF4500] hover:text-white text-slate-900 border border-slate-300 dark:border-transparent dark:bg-[#20232B] dark:text-stone-200 dark:hover:bg-[#FF4500] dark:hover:text-white active:scale-90 cursor-pointer shadow-2xs"
            title="Add to Ticket"
          >
            {justAdded ? (
              <Check className="w-4 h-4 text-[#FF4500] dark:text-[#FF5722]" strokeWidth={3} />
            ) : (
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
