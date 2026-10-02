import React, { useState } from 'react';
import { LocalProduct } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import { Plus, ChevronDown, Package } from 'lucide-react';

interface ProductCardProps {
  product: LocalProduct;
  onAddToCart: (product: LocalProduct, selectedUom?: { name: string; price: number }) => void;
  isDark: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isDark,
}) => {
  const [showUomMenu, setShowUomMenu] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isOutOfStock = product.currentStock <= 0;
  const isLowStock = product.currentStock > 0 && product.currentStock <= 5;

  const handleCardClick = () => {
    if (isOutOfStock) return;
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onAddToCart(product);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between p-4 rounded-[16px] border cursor-pointer select-none text-left transition-all duration-250 ${
        isPressed ? 'scale-[0.96] opacity-80' : ''
      } ${
        isOutOfStock
          ? 'opacity-30 pointer-events-none grayscale'
          : isDark
          ? 'bg-[#0D1117] border-[rgba(48,62,80,0.4)] hover:border-emerald-500/30 hover:bg-[#151B23] hover:shadow-[0_4px_20px_rgba(16,185,129,0.06)]'
          : 'bg-white border-[rgba(209,215,224,0.5)] hover:border-emerald-400/40 hover:bg-[#FAFBFC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
      }`}
      style={{ transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div>
        {/* Top Meta: Category & Inventory Health */}
        <div className="flex items-center justify-between text-[11px] mb-2.5">
          <span className={`truncate max-w-[60%] font-medium px-2 py-[2px] rounded-md ${
            isDark ? 'text-[#8B9DB5] bg-[#151B23]' : 'text-[#64748B] bg-[#F0F2F5]'
          }`}>
            {product.category}
          </span>

          {/* Micro Inventory Health Indicator */}
          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
            {isOutOfStock ? (
              <span className="text-[#EF4444] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="text-[#F59E0B] font-medium flex items-center gap-1 bg-[#F59E0B]/8 px-1.5 py-[2px] rounded-md border border-[#F59E0B]/15">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
                {product.currentStock} left
              </span>
            ) : (
              <span className="text-emerald-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {product.currentStock} {product.baseUnit}
              </span>
            )}
          </div>
        </div>

        {/* Product Title */}
        <h4 className={`font-semibold text-[13px] leading-snug line-clamp-2 transition-colors duration-200 ${
          isDark ? 'text-[#F0F4F8] group-hover:text-emerald-400' : 'text-[#0F172A] group-hover:text-emerald-700'
        }`}>
          {product.name}
        </h4>

        {product.localName && (
          <span className="text-[11px] text-[#8B9DB5] font-normal block truncate mt-1">
            {product.localName}
          </span>
        )}
      </div>

      {/* Bottom Row: Price & Tactile Add Trigger */}
      <div className={`mt-4 pt-3 border-t flex items-center justify-between ${
        isDark ? 'border-[rgba(48,62,80,0.3)]' : 'border-[rgba(209,215,224,0.4)]'
      }`}>
        <div>
          <span className="text-[9px] text-[#8B9DB5] uppercase tracking-widest block font-semibold mb-[2px]">Price</span>
          <span className={`text-[15px] font-extrabold font-mono tabular-nums tracking-tight ${
            isDark ? 'text-emerald-400' : 'text-emerald-700'
          }`}>
            {formatGhs(product.retailPrice)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* UOM Selector Pill if available */}
          {product.uomOptions && product.uomOptions.length > 0 && (
            <div
              className="relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowUomMenu(!showUomMenu)}
                className={`p-1.5 rounded-[10px] border text-xs flex items-center transition-all duration-200 active:scale-90 ${
                  isDark
                    ? 'border-[rgba(48,62,80,0.5)] hover:bg-[#1C2333] text-[#8B9DB5]'
                    : 'border-[rgba(209,215,224,0.5)] hover:bg-[#F0F2F5] text-[#64748B]'
                }`}
                title="Select unit of measurement"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showUomMenu && (
                <div
                  className={`absolute bottom-full right-0 mb-2 z-30 w-48 rounded-[14px] p-1.5 border text-xs space-y-0.5 animate-expand-in ${
                    isDark 
                      ? 'bg-[#0D1117] border-[rgba(48,62,80,0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]' 
                      : 'bg-white border-[rgba(209,215,224,0.5)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
                  }`}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold text-[#8B9DB5] uppercase tracking-wider">
                    Available Units:
                  </div>
                  {product.uomOptions.map(uom => (
                    <button
                      key={uom.name}
                      type="button"
                      onClick={() => {
                        onAddToCart(product, uom);
                        setShowUomMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-[10px] text-[11px] flex justify-between items-center transition-all duration-150 ${
                        isDark ? 'hover:bg-[#1C2333] text-[#F0F4F8]' : 'hover:bg-[#F0F2F5] text-[#0F172A]'
                      }`}
                    >
                      <span className="truncate">{uom.name}</span>
                      <span className="font-mono font-bold tabular-nums text-emerald-500">
                        {formatGhs(uom.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Add Button with Glow Effect */}
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={e => {
              e.stopPropagation();
              handleCardClick();
            }}
            className={`w-8 h-8 rounded-[10px] flex items-center justify-center font-bold text-xs transition-all duration-200 active:scale-90 ${
              isDark
                ? 'bg-[#151B23] hover:bg-emerald-500 hover:text-[#06080C] text-[#F0F4F8] border border-[rgba(48,62,80,0.5)] hover:border-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-[#F0F2F5] hover:bg-emerald-600 hover:text-white text-[#0F172A] border border-[rgba(209,215,224,0.5)] hover:border-emerald-600 hover:shadow-[0_0_10px_rgba(5,150,105,0.15)]'
            }`}
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
};
