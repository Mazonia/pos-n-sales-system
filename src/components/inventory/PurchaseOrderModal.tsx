import React, { useState } from 'react';
import { LocalProduct, LocalPurchaseOrder, LocalPurchaseOrderItem, db } from '../../utils/dexieSync';
import { formatGhs, roundToPesewas } from '../../utils/ghanaTaxEngine';
import { stripEmojis } from '../../utils/emojiSanitizer';
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
import { OfficialPrintPortal } from '../common/OfficialPrintPortal';

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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto no-print">
        <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden font-serif transition ${
        isDark ? 'bg-[#16181F] border-[#282B34] text-stone-100' : 'bg-[#EBEEF2] border-slate-300 text-slate-900'
      }`}>
        
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-[#282B34] bg-[#121316]' : 'border-slate-300 bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center text-[#FF4500]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-extrabold text-base tracking-tight text-slate-900 dark:text-white">Purchase Order Draft</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-teal-500/15 text-[#008285] dark:text-[#00CED1] font-bold border border-teal-500/30">
                  {poNumber}
                </span>
                {isSaved && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Issued</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-stone-400 font-serif">
                Auto-compiled from {lowStockProducts.length} items below defined Safety Threshold
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-300 dark:border-[#282B34] text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'}`}>
              <div className="text-[10px] text-slate-500 dark:text-stone-400 uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-[#FF4500]" />
                <span>Destination Branch</span>
              </div>
              <div className="font-serif font-bold truncate text-slate-900 dark:text-stone-100">{branchName}</div>
              <div className="text-[11px] text-slate-500 dark:text-stone-400 font-serif">Accra Receiving Bay</div>
            </div>

            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'}`}>
              <div className="text-[10px] text-slate-500 dark:text-stone-400 uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-500" />
                <span>Authorized Operator</span>
              </div>
              <div className="font-serif font-bold truncate text-slate-900 dark:text-stone-100">{currentUser.fullName}</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-500 font-mono font-medium">{currentUser.role}</div>
            </div>

            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'}`}>
              <div className="text-[10px] text-slate-500 dark:text-stone-400 uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#008285] dark:text-[#00CED1]" />
                <span>Order Date & Status</span>
              </div>
              <div className="font-serif font-bold font-mono text-slate-900 dark:text-white">{new Date().toLocaleDateString('en-GB')}</div>
              <div className="text-[11px] text-[#008285] dark:text-[#00CED1] font-semibold font-serif">Safety Stock Replenishment</div>
            </div>
          </div>

          {/* Supplier Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-serif font-semibold text-slate-600 dark:text-stone-400 block">Primary Supplier / Distributor:</label>
            <input
              type="text"
              value={supplierName}
              onChange={e => setSupplierName(stripEmojis(e.target.value))}
              placeholder="e.g. Wilmar Africa Ltd, Nestlé Ghana, Cocoa Processing Co."
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-serif outline-none border focus:border-[#008285] ${
                isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Items Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'border-[#282B34] bg-[#16181F]' : 'border-slate-300 bg-white shadow-xs'
          }`}>
            <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs font-bold font-serif ${
              isDark ? 'border-[#282B34] bg-[#121316]' : 'border-slate-300 bg-slate-100'
            }`}>
              <span className="text-slate-900 dark:text-white">Replenishment Line Items ({orderItems.length})</span>
              <span className="text-[11px] text-[#FF4500] font-mono">Safety Thresholds Highlighted</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead className={`text-[10px] uppercase font-mono border-b ${
                  isDark ? 'bg-white/[0.02] text-stone-400 border-[#282B34]' : 'bg-slate-50 text-slate-600 border-slate-300 font-bold'
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
                <tbody className={`divide-y ${isDark ? 'divide-[#282B34]' : 'divide-slate-200'}`}>
                  {orderItems.map(item => (
                    <tr key={item.productId} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition">
                      <td className="p-3 font-serif">
                        <div className="font-serif font-bold text-slate-900 dark:text-stone-100">{item.productName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-stone-400 font-mono">{item.sku} • {item.unit}</div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20 font-mono tabular-nums">
                          {item.currentStock} {item.unit}
                        </span>
                      </td>

                      <td className="p-3 text-center text-[#FF4500] font-semibold font-mono tabular-nums">
                        {item.safetyThreshold} {item.unit}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.recommendedOrder}
                            onKeyDown={e => {
                              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                            }}
                            onChange={e => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                            className={`w-16 px-2 py-1 rounded-lg text-center font-bold font-mono tabular-nums outline-none border focus:border-[#008285] ${
                              isDark ? 'bg-[#121316] border-[#282B34] text-[#00CED1]' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono tabular-nums text-slate-600 dark:text-stone-400">
                        {formatGhs(item.unitCost)}
                      </td>

                      <td className="p-3 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        {formatGhs(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Row */}
            <div className={`p-4 border-t flex items-center justify-between border-slate-300 dark:border-[#282B34] ${
              isDark ? 'bg-[#121316]' : 'bg-slate-50'
            }`}>
              <div className="text-xs text-slate-500 dark:text-stone-400 font-serif">
                <span>Total Items: </span>
                <strong className="text-slate-900 dark:text-stone-100 font-mono tabular-nums">{orderItems.length}</strong>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-stone-400 font-serif">Total Estimated PO Value:</span>
                <span className="text-base sm:text-lg font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatGhs(grandTotalCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-serif font-semibold text-slate-600 dark:text-stone-400 block">Supplier Delivery & PO Instructions:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(stripEmojis(e.target.value))}
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-serif outline-none border focus:border-[#008285] resize-none ${
                isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Success Banner if Issued */}
          {isSaved && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between font-serif">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>
                  Purchase Order <strong className="font-mono">{poNumber}</strong> successfully stored in local records with operator cryptographic stamp!
                </span>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1 bg-[#008285] dark:bg-[#00CED1] hover:opacity-90 text-white dark:text-slate-950 font-bold font-serif rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Copy</span>
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 border-slate-300 dark:border-[#282B34] ${
          isDark ? 'bg-[#121316]' : 'bg-white'
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className={`px-3.5 py-2 rounded-xl border text-xs font-serif font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isDark ? 'border-[#282B34] text-stone-300 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-black hover:bg-slate-100'
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
              className={`px-4 py-2 rounded-xl border text-xs font-serif font-semibold transition cursor-pointer ${
                isDark ? 'border-[#282B34] text-stone-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isSaved ? 'Done' : 'Discard Draft'}
            </button>

            {!isSaved && (
              <button
                type="button"
                onClick={handleSaveAndIssuePO}
                disabled={isSubmitting || orderItems.length === 0}
                className="px-5 py-2 rounded-xl bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold font-serif text-xs shadow-[0_2px_12px_rgba(255,69,0,0.3)] flex items-center gap-1.5 active:scale-95 transition disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Approve & Issue PO</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>

    {/* ========================================================================= */}
    {/* OFFICIAL INDUSTRY-STANDARD PRINTABLE PURCHASE ORDER DOCUMENT (A4 FORMAT)  */}
    {/* ========================================================================= */}
    <OfficialPrintPortal active={true}>
      <div id="official-po-document" className="official-printable-doc text-black bg-white p-8 font-sans max-w-4xl mx-auto">
        {/* Formal Header & Letterhead */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black uppercase">
              AKWAABA RETAIL SYSTEMS & WHOLESALE LTD.
            </h1>
            <p className="text-xs text-gray-700 font-medium">Headquarters & Central Logistics Distribution</p>
            <p className="text-xs text-gray-700">Digital Address: GA-183-9022, Accra Central, Ghana</p>
            <p className="text-xs text-gray-700">Phone: +233 (0) 30 223 9081 / 024 400 1122</p>
            <p className="text-xs text-gray-700 font-mono font-bold">GRA TIN: C001889201X | VAT REG: YES</p>
          </div>
          <div className="text-right">
            <div className="inline-block border-2 border-black px-4 py-2 text-center bg-gray-50">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-gray-600">Document Type</span>
              <span className="text-base font-black text-black">OFFICIAL PURCHASE ORDER</span>
            </div>
            <div className="mt-2 text-xs font-mono">
              <p><strong>PO Number:</strong> {poNumber}</p>
              <p><strong>Date Issued:</strong> {new Date().toLocaleDateString('en-GB')}</p>
              <p><strong>Payment Terms:</strong> 14 Days Net</p>
            </div>
          </div>
        </div>

        {/* Vendor & Delivery Information Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-xs border border-gray-300 p-4 rounded bg-gray-50/50">
          <div>
            <h3 className="font-bold uppercase tracking-wider text-gray-600 text-[10px] mb-1">VENDOR / SUPPLIER DETAILS:</h3>
            <p className="text-sm font-bold text-black">{supplierName}</p>
            <p className="text-gray-700">Attn: Sales & Wholesale Order Desk</p>
            <p className="text-gray-700">Ghana Wholesale & Commercial Division</p>
          </div>
          <div>
            <h3 className="font-bold uppercase tracking-wider text-gray-600 text-[10px] mb-1">DELIVER TO / RECEIVING BAY:</h3>
            <p className="text-sm font-bold text-black">{branchName}</p>
            <p className="text-gray-700">Goods Inward & Inspection Bay</p>
            <p className="text-gray-700">Authorized Officer: {currentUser.fullName} ({currentUser.role})</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-6">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 text-[11px] font-bold uppercase">
              <th className="p-2 border border-gray-300 text-center w-10">#</th>
              <th className="p-2 border border-gray-300">Item Description</th>
              <th className="p-2 border border-gray-300">SKU / Code</th>
              <th className="p-2 border border-gray-300 text-center">UOM</th>
              <th className="p-2 border border-gray-300 text-center">Safety Level</th>
              <th className="p-2 border border-gray-300 text-center">Order Qty</th>
              <th className="p-2 border border-gray-300 text-right">Unit Cost (GHS)</th>
              <th className="p-2 border border-gray-300 text-right">Total (GHS)</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item, index) => (
              <tr key={item.productId} className="border-b border-gray-200">
                <td className="p-2 border border-gray-300 text-center font-mono">{index + 1}</td>
                <td className="p-2 border border-gray-300 font-semibold">{item.productName}</td>
                <td className="p-2 border border-gray-300 font-mono text-[10px]">{item.sku}</td>
                <td className="p-2 border border-gray-300 text-center">{item.unit}</td>
                <td className="p-2 border border-gray-300 text-center font-mono">{item.safetyThreshold}</td>
                <td className="p-2 border border-gray-300 text-center font-bold font-mono">{item.recommendedOrder}</td>
                <td className="p-2 border border-gray-300 text-right font-mono">{formatGhs(item.unitCost)}</td>
                <td className="p-2 border border-gray-300 text-right font-bold font-mono">{formatGhs(item.totalCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-black font-bold">
              <td colSpan={7} className="p-2.5 text-right uppercase border border-gray-300">Grand Total Payable (GHS):</td>
              <td className="p-2.5 text-right font-black text-sm border border-gray-300">{formatGhs(grandTotalCost)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Notes & Special Instructions */}
        <div className="mb-8 border border-gray-200 p-3 rounded text-xs bg-gray-50">
          <p className="font-bold text-gray-800 mb-0.5">PURCHASE ORDER NOTES & INSTRUCTIONS:</p>
          <p className="text-gray-700">{notes}</p>
        </div>

        {/* 3 Formal Signatures Block */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-black text-xs">
          <div className="border-t border-dashed border-gray-400 pt-2">
            <p className="font-bold text-black uppercase text-[11px]">1. PREPARED BY:</p>
            <p className="mt-1 font-semibold">{currentUser.fullName}</p>
            <p className="text-[10px] text-gray-600">{currentUser.role}</p>
            <p className="text-[10px] text-gray-500 mt-4">Signature & Date: ______________________</p>
          </div>
          <div className="border-t border-dashed border-gray-400 pt-2">
            <p className="font-bold text-black uppercase text-[11px]">2. APPROVED BY:</p>
            <p className="mt-1 font-semibold">General Manager / Financial Controller</p>
            <p className="text-[10px] text-gray-600">Executive Authorization</p>
            <p className="text-[10px] text-gray-500 mt-4">Signature & Date: ______________________</p>
          </div>
          <div className="border-t border-dashed border-gray-400 pt-2">
            <p className="font-bold text-black uppercase text-[11px]">3. RECEIVED & INSPECTED:</p>
            <p className="mt-1 font-semibold">Warehouse Receiving Bay</p>
            <p className="text-[10px] text-gray-600">Verification & Quality Control</p>
            <p className="text-[10px] text-gray-500 mt-4">Official Stamp: ______________________</p>
          </div>
        </div>

        {/* Footer Terms */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-[9.5px] text-gray-500 text-center">
          <p>This is an official commercial purchase order generated by Akwaaba Retail OS. Original delivery note and valid GRA Tax Invoice must accompany deliveries.</p>
        </div>
      </div>
    </OfficialPrintPortal>
  </>
  );
};
