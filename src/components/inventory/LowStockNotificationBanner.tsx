import React, { useState } from 'react';
import { LocalProduct, LocalPurchaseOrder, LocalPurchaseOrderItem } from '../../utils/dexieSync';
import { formatGhs, roundToPesewas } from '../../utils/ghanaTaxEngine';
import {
  AlertTriangle,
  FilePlus,
  ChevronDown,
  ChevronUp,
  X,
  Boxes,
  ArrowRight
} from 'lucide-react';

interface LowStockNotificationBannerProps {
  products: LocalProduct[];
  branchName: string;
  authorName: string;
  authorId: string;
  onGeneratePoDraft: (po: LocalPurchaseOrder) => void;
  isDark: boolean;
}

export const LowStockNotificationBanner: React.FC<LowStockNotificationBannerProps> = ({
  products,
  branchName,
  authorName,
  authorId,
  onGeneratePoDraft,
  isDark,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter items below safety threshold
  const lowStockItems = products.filter(p => {
    const threshold = p.safetyThreshold ?? p.reorderLevel;
    return p.currentStock <= threshold;
  });

  if (lowStockItems.length === 0 || isDismissed) {
    return null;
  }

  // 1-Click PO Generator
  const handleOneClickGeneratePO = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const poNumber = `PO-ACC-${dateStr}-${randCode}`;

    let totalCost = 0;
    const poItems: LocalPurchaseOrderItem[] = lowStockItems.map(p => {
      const threshold = p.safetyThreshold ?? p.reorderLevel;
      const target = p.targetStockLevel ?? (threshold * 3);
      const recommendedOrder = Math.max(1, target - p.currentStock);
      const lineCost = roundToPesewas(recommendedOrder * p.costPrice);
      totalCost += lineCost;

      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        unit: p.baseUnit,
        currentStock: p.currentStock,
        safetyThreshold: threshold,
        recommendedOrder,
        unitCost: p.costPrice,
        totalCost: lineCost,
        supplierName: p.supplierName || 'Ghana Central Wholesalers Ltd',
      };
    });

    const uniqueSuppliers = Array.from(new Set(poItems.map(i => i.supplierName))).join(', ');

    const draftPo: LocalPurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierName: uniqueSuppliers,
      branchName,
      generatedBy: authorName,
      generatedById: authorId,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      items: poItems,
      totalCost: roundToPesewas(totalCost),
      notes: 'Generated via 1-Click Safety Threshold Reorder Trigger',
    };

    onGeneratePoDraft(draftPo);
  };

  return (
    <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 select-none font-serif ${
      isDark
        ? 'bg-[#FF4500]/10 border-[#FF4500]/30 text-[#FF4500]'
        : 'bg-[#FFF5F2] border-[#FF4500]/30 text-[#C23600] shadow-sm'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Left: Fire Warning Icon & Summary */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FF4500]/20 text-[#FF4500] border border-[#FF4500]/30 flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-xs sm:text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Safety Stock Threshold Alert:
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF4500] text-white">
                {lowStockItems.length} Critical Items
              </span>
            </div>
            <p className="text-[11px] opacity-90 mt-0.5">
              Inventory fell below safety stock limits. Replenish immediately to avoid lost retail sales.
            </p>
          </div>
        </div>

        {/* Right: Action Buttons (1-Click PO Draft Trigger) */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleOneClickGeneratePO}
            className="px-3.5 py-2 bg-[#FF4500] hover:bg-[#FF5722] active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#FF4500]/20 transition cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>1-Click Draft PO</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-xl border text-xs transition cursor-pointer ${
              isDark ? 'border-[#FF4500]/30 hover:bg-[#FF4500]/20 text-white' : 'border-[#FF4500]/30 hover:bg-[#FF4500]/10 text-slate-800'
            }`}
            title="Expand low stock items"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isDark ? 'border-[#FF4500]/30 hover:bg-[#FF4500]/20 text-white' : 'border-[#FF4500]/30 hover:bg-[#FF4500]/10 text-slate-800'
            }`}
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Expanded Items Drawer */}
      {isExpanded && (
        <div className={`mt-3 pt-3 border-t border-[#FF4500]/20 space-y-2 text-xs`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {lowStockItems.map(item => {
              const threshold = item.safetyThreshold ?? item.reorderLevel;
              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
                    isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-bold block truncate font-serif">{item.name}</span>
                    <span className="text-[10px] text-[#8A99A8]">Supplier: {item.supplierName}</span>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <span className="text-[#FF4500] font-extrabold block">
                      {item.currentStock} {item.baseUnit} left
                    </span>
                    <span className="text-[10px] text-[#00CED1]">
                      Safety: {threshold}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
