import React, { useState } from 'react';
import { LocalProduct, LocalPurchaseOrder, LocalPurchaseOrderItem, db } from '../../utils/dexieSync';
import { formatGhs, roundToPesewas } from '../../utils/ghanaTaxEngine';
import {
  FileText,
  Printer,
  CheckCircle2,
  X,
  AlertTriangle,
  Building,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  Plus
} from 'lucide-react';

interface PurchaseOrderModalProps {
  lowStockProducts: LocalProduct[];
  branchName: string;
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
  isDark: boolean;
  onClose: () => void;
  onOrderSaved?: (po: LocalPurchaseOrder) => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  lowStockProducts,
  branchName,
  currentUser,
  isDark,
  onClose,
  onOrderSaved,
}) => {
  // Pre-generate unique PO number
  const [poNumber] = useState<string>(
    `PO-GH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Group or default supplier name from items
  const defaultSupplier = lowStockProducts[0]?.supplierName || 'Wilmar & Multi-Wholesalers Ghana Ltd';
  const [supplierName, setSupplierName] = useState<string>(defaultSupplier);
  const [notes, setNotes] = useState<string>(
    'Urgent replenishment draft generated via automated Safety Threshold alert. Payment terms: 14 days net.'
  );

  // Initialize draft items with suggested quantities
  const [orderItems, setOrderItems] = useState<LocalPurchaseOrderItem[]>(() => {
    return lowStockProducts.map(p => {
      const threshold = p.safetyThreshold || p.reorderLevel || 10;
      const target = p.targetStockLevel || threshold * 3;
      const recommended = Math.max(1, target - p.currentStock);
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        unit: p.baseUnit,
        currentStock: p.currentStock,
        safetyThreshold: threshold,
        recommendedOrder: recommended,
        unitCost: p.costPrice,
        totalCost: roundToPesewas(recommended * p.costPrice),
        supplierName: p.supplierName || 'Central Distributor',
      };
    });
  });

  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleQuantityChange = (productId: string, newQty: number) => {
    const qty = Math.max(1, newQty);
    setOrderItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            recommendedOrder: qty,
            totalCost: roundToPesewas(qty * item.unitCost),
          };
        }
        return item;
      })
    );
  };

  const grandTotalCost = roundToPesewas(
    orderItems.reduce((acc, curr) => acc + curr.totalCost, 0)
  );

  const handleSaveAndIssuePO = async () => {
    setIsSubmitting(true);
    const newPO: LocalPurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierName,
      branchName,
      generatedBy: `${currentUser.fullName} (${currentUser.role})`,
      generatedById: currentUser.id,
      status: 'ISSUED',
      createdAt: new Date().toISOString(),
      items: orderItems,
      totalCost: grandTotalCost,
      notes,
    };

    try {
      await db.purchaseOrders.put(newPO);
      await db.auditLogs.add({
        id: `audit-po-${Date.now()}`,
        action: 'PURCHASE_ORDER_ISSUED',
        userId: currentUser.id,
        userName: currentUser.fullName,
        details: `Issued Purchase Order ${poNumber} for ${orderItems.length} safety-threshold deficit items totaling ${formatGhs(grandTotalCost)}.`,
        timestamp: new Date().toISOString(),
      });
      setIsSaved(true);
      if (onOrderSaved) {
        onOrderSaved(newPO);
      }
    } catch (err) {
      console.error('Failed to save PO', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition ${
        isDark ? 'bg-[#11151A] border-[#242D37] text-[#F4F6F8]' : 'bg-white border-[#E2E5E9] text-[#0F172A]'
      }`}>
        
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-[#242D37] bg-[#1A2027]/50' : 'border-[#E2E5E9] bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">Purchase Order Draft</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30">
                  {poNumber}
                </span>
                {isSaved && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Issued</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8A99A8] font-mono">
                Auto-compiled from {lowStockProducts.length} items below defined Safety Threshold
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'border-[#242D37] text-slate-400 hover:text-white' : 'border-[#E2E5E9] text-slate-500 hover:text-black'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'}`}>
              <div className="text-[10px] text-[#8A99A8] uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-amber-500" />
                <span>Destination Branch</span>
              </div>
              <div className="font-bold truncate">{branchName}</div>
              <div className="text-[11px] text-[#8A99A8]">Accra Receiving Bay</div>
            </div>

            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'}`}>
              <div className="text-[10px] text-[#8A99A8] uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-500" />
                <span>Authorized Operator</span>
              </div>
              <div className="font-bold truncate">{currentUser.fullName}</div>
              <div className="text-[11px] text-emerald-500 font-mono font-medium">{currentUser.role}</div>
            </div>

            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'}`}>
              <div className="text-[10px] text-[#8A99A8] uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-500" />
                <span>Order Date & Status</span>
              </div>
              <div className="font-bold font-mono">{new Date().toLocaleDateString('en-GB')}</div>
              <div className="text-[11px] text-amber-400 font-semibold font-mono">Safety Stock Replenishment</div>
            </div>
          </div>

          {/* Supplier Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8A99A8] block">Primary Supplier / Distributor:</label>
            <input
              type="text"
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              placeholder="e.g. Wilmar Africa Ltd, Nestlé Ghana, Cocoa Processing Co."
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium outline-none border focus:border-amber-500 ${
                isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-slate-900'
              }`}
            />
          </div>

          {/* Items Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'border-[#242D37] bg-[#090B0E]' : 'border-[#E2E5E9] bg-white'
          }`}>
            <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs font-bold ${
              isDark ? 'border-[#242D37] bg-[#1A2027]' : 'border-[#E2E5E9] bg-slate-100'
            }`}>
              <span>Replenishment Line Items ({orderItems.length})</span>
              <span className="text-[11px] text-amber-500 font-mono">Safety Thresholds Highlighted</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead className={`text-[10px] uppercase font-mono border-b ${
                  isDark ? 'bg-white/[0.02] text-[#8A99A8] border-[#242D37]' : 'bg-slate-50 text-slate-500 border-[#E2E5E9]'
                }`}>
                  <tr>
                    <th className="p-3">Product Name & SKU</th>
                    <th className="p-3 text-center">Current Stock</th>
                    <th className="p-3 text-center">Safety Level</th>
                    <th className="p-3 text-center">Order Qty</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242D37]/40 font-mono">
                  {orderItems.map(item => (
                    <tr key={item.productId} className="hover:bg-amber-500/[0.03] transition">
                      <td className="p-3 font-sans">
                        <div className="font-bold">{item.productName}</div>
                        <div className="text-[10px] text-[#8A99A8] font-mono">{item.sku} • {item.unit}</div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                          {item.currentStock} {item.unit}
                        </span>
                      </td>

                      <td className="p-3 text-center text-amber-500 font-semibold">
                        {item.safetyThreshold} {item.unit}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.recommendedOrder}
                            onChange={e => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                            className={`w-16 px-2 py-1 rounded-lg text-center font-bold font-mono outline-none border focus:border-amber-500 ${
                              isDark ? 'bg-[#1A2027] border-[#242D37] text-amber-400' : 'bg-amber-50/50 border-amber-300 text-slate-900'
                            }`}
                          />
                        </div>
                      </td>

                      <td className="p-3 text-right text-[#8A99A8]">
                        {formatGhs(item.unitCost)}
                      </td>

                      <td className="p-3 text-right font-bold text-emerald-500">
                        {formatGhs(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Row */}
            <div className={`p-4 border-t flex items-center justify-between ${
              isDark ? 'border-[#242D37] bg-[#11151A]' : 'border-[#E2E5E9] bg-slate-50'
            }`}>
              <div className="text-xs text-[#8A99A8]">
                <span>Total Items: </span>
                <strong className="text-white">{orderItems.length}</strong>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8A99A8]">Total Estimated PO Value:</span>
                <span className="text-base sm:text-lg font-black font-mono tabular-nums text-emerald-500">
                  {formatGhs(grandTotalCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8A99A8] block">Supplier Delivery & PO Instructions:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none border focus:border-amber-500 resize-none ${
                isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-slate-900'
              }`}
            />
          </div>

          {/* Success Banner if Issued */}
          {isSaved && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>
                  Purchase Order <strong>{poNumber}</strong> successfully stored in local records with operator cryptographic stamp!
                </span>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Copy</span>
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isDark ? 'border-[#242D37] bg-[#1A2027]/50' : 'border-[#E2E5E9] bg-slate-50'
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                isDark ? 'border-[#242D37] text-[#8A99A8] hover:text-white' : 'border-[#E2E5E9] text-slate-600 hover:text-black'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PO Form</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                isDark ? 'border-[#242D37] text-[#8A99A8]' : 'border-[#E2E5E9] text-slate-600'
              }`}
            >
              {isSaved ? 'Done' : 'Discard Draft'}
            </button>

            {!isSaved && (
              <button
                type="button"
                onClick={handleSaveAndIssuePO}
                disabled={isSubmitting || orderItems.length === 0}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Approve & Issue PO</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
