import React, { useState, useEffect } from 'react';
import { LocalProduct, db } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import { triggerHaptic } from '../../utils/haptics';
import {
  Package,
  X,
  Barcode,
  Tag,
  DollarSign,
  Layers,
  AlertTriangle,
  Calendar,
  Truck,
  Hash,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';

interface ItemMasterEditorModalProps {
  isOpen: boolean;
  product: LocalProduct | null; // null means create new
  onClose: () => void;
  onRefresh: () => void;
  isDark: boolean;
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
  categories: string[];
}

export const ItemMasterEditorModal: React.FC<ItemMasterEditorModalProps> = ({
  isOpen,
  product,
  onClose,
  onRefresh,
  isDark,
  currentUser,
  categories,
}) => {
  const isNew = !product;

  const [formData, setFormData] = useState({
    name: '',
    localName: '',
    category: 'Provisions & Groceries',
    sku: '',
    barcode: '',
    costPrice: 0,
    retailPrice: 0,
    baseUnit: 'PCS',
    currentStock: 0,
    safetyThreshold: 10,
    reorderLevel: 15,
    supplierName: '',
    batchNumber: '',
    expiryDate: '',
    isTaxExempt: false,
  });

  const [customCategory, setCustomCategory] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        localName: product.localName || '',
        category: product.category || 'Provisions & Groceries',
        sku: product.sku || '',
        barcode: product.barcode || '',
        costPrice: product.costPrice || 0,
        retailPrice: product.retailPrice || 0,
        baseUnit: product.baseUnit || 'PCS',
        currentStock: product.currentStock || 0,
        safetyThreshold: product.safetyThreshold !== undefined ? product.safetyThreshold : 10,
        reorderLevel: product.reorderLevel !== undefined ? product.reorderLevel : 15,
        supplierName: product.supplierName || '',
        batchNumber: product.batchNumber || '',
        expiryDate: product.expiryDate || '',
        isTaxExempt: product.isTaxExempt || false,
      });
      setCustomCategory('');
    } else {
      // New Item template
      const randCode = Math.floor(1000 + Math.random() * 9000);
      setFormData({
        name: '',
        localName: '',
        category: categories[0] || 'Provisions & Groceries',
        sku: `SKU-${randCode}`,
        barcode: `603${Math.floor(100000000 + Math.random() * 900000000)}`,
        costPrice: 10,
        retailPrice: 15,
        baseUnit: 'PCS',
        currentStock: 25,
        safetyThreshold: 8,
        reorderLevel: 12,
        supplierName: 'Accra Wholesale Distributors',
        batchNumber: `BAT-${new Date().getFullYear()}-${randCode}`,
        expiryDate: '',
        isTaxExempt: false,
      });
    }
    setErrorMsg('');
  }, [product, isOpen]);

  if (!isOpen) return null;

  // Margin & Markup calculation
  const cost = Math.max(0, formData.costPrice);
  const retail = Math.max(0, formData.retailPrice);
  const profitMarginPesewas = retail - cost;
  const marginPct = retail > 0 ? ((profitMarginPesewas / retail) * 100).toFixed(1) : '0.0';
  const markupPct = cost > 0 ? ((profitMarginPesewas / cost) * 100).toFixed(1) : '0.0';

  const handleGenerateBarcode = () => {
    triggerHaptic('keypad');
    const ghanaPrefix = '603'; // Ghana EAN-13 common retailer prefix
    const randPart = Math.floor(100000000 + Math.random() * 900000000).toString();
    setFormData(prev => ({
      ...prev,
      barcode: `${ghanaPrefix}${randPart}`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('Item name is required.');
      return;
    }

    if (!formData.sku.trim()) {
      setErrorMsg('Item SKU is required.');
      return;
    }

    if (!formData.barcode.trim()) {
      setErrorMsg('Barcode is required.');
      return;
    }

    if (formData.retailPrice < 0 || formData.costPrice < 0) {
      setErrorMsg('Prices cannot be negative.');
      return;
    }

    const finalCategory = customCategory.trim() || formData.category;

    setIsSubmitting(true);
    try {
      const productId = product?.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      const targetProduct: LocalProduct = {
        id: productId,
        name: formData.name.trim(),
        localName: formData.localName.trim() || undefined,
        category: finalCategory,
        categoryId: `cat-${finalCategory.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        sku: formData.sku.trim().toUpperCase(),
        barcode: formData.barcode.trim(),
        costPrice: Number(formData.costPrice),
        retailPrice: Number(formData.retailPrice),
        baseUnit: formData.baseUnit.trim().toUpperCase(),
        currentStock: Number(formData.currentStock),
        safetyThreshold: Number(formData.safetyThreshold),
        reorderLevel: Number(formData.reorderLevel),
        supplierName: formData.supplierName.trim() || undefined,
        batchNumber: formData.batchNumber.trim() || undefined,
        expiryDate: formData.expiryDate.trim() || undefined,
        isTaxExempt: Boolean(formData.isTaxExempt),
      };

      // Save to Dexie products table
      await db.products.put(targetProduct);

      // Audit log for non-repudiation
      await db.auditLogs.add({
        id: `audit-prod-${Date.now()}`,
        action: isNew ? 'PRODUCT_CATALOG_CREATE' : 'PRODUCT_MASTER_EDIT',
        userId: currentUser.id,
        userName: currentUser.fullName,
        details: `${isNew ? 'New item added to catalog' : 'Item updated'}: "${targetProduct.name}" (SKU: ${targetProduct.sku}, Category: ${targetProduct.category}, Retail: GH₵${targetProduct.retailPrice.toFixed(2)}, Cost: GH₵${targetProduct.costPrice.toFixed(2)}, Stock: ${targetProduct.currentStock} ${targetProduct.baseUnit}, Safety Threshold: ${targetProduct.safetyThreshold}) by ${currentUser.fullName} (${currentUser.role}).`,
        timestamp: new Date().toISOString(),
      });

      triggerHaptic('success');
      onRefresh();
      onClose();
    } catch (err: any) {
      console.error('Error saving product', err);
      setErrorMsg(err.message || 'Failed to save product changes to local database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const COMMON_UNITS = ['PCS', '50KG SACK', '25KG SACK', 'TIN', 'BOTTLE', 'BOX', 'PACK', 'KG', 'LITRE', 'CRATE'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
        isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-[#242D37] bg-[#090B0E]/60' : 'border-[#E2E5E9] bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isNew ? 'Create New Inventory Item' : `Edit Item: ${product?.name}`}
              </h3>
              <p className="text-[11px] text-[#8A99A8] font-mono">
                Full item master modification authorized for {currentUser.fullName} ({currentUser.role})
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('tap');
              onClose();
            }}
            className="p-1.5 rounded-xl text-[#8A99A8] hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Item Identification */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#090B0E]/50 border-[#242D37]' : 'bg-slate-50 border-[#E2E5E9]'
          }`}>
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#8A99A8] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>Item Identification & Taxonomy</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Official Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Royal Feast Jasmine Perfume Rice (50kg)"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Local / Akan Designation (Optional)
                </label>
                <input
                  type="text"
                  value={formData.localName}
                  onChange={e => setFormData(prev => ({ ...prev, localName: e.target.value }))}
                  placeholder="e.g. Emo, Nsuo, Banku flour"
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="CUSTOM">+ Add Custom Category</option>
                </select>
                {formData.category === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Enter custom category name"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className={`mt-2 w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-amber-500 ${
                      isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                    }`}
                  />
                )}
              </div>

              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  SKU / Stock Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="e.g. RCE-JAS-50KG"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold uppercase outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-[#8A99A8] font-semibold">
                    Barcode / EAN-13 *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-[10px] text-amber-500 hover:text-amber-400 font-mono font-bold flex items-center gap-1 active:scale-95"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <Barcode className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A99A8]" />
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    placeholder="e.g. 603001889012"
                    className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:border-amber-500 ${
                      isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing, Cost & Profit Margins */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#090B0E]/50 border-[#242D37]' : 'bg-slate-50 border-[#E2E5E9]'
          }`}>
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#8A99A8] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cost, Retail Shelf Price & Profit Metrics</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Cost Price (GH₵) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-[#8A99A8]">GH₵</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.costPrice}
                    onChange={e => setFormData(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                    className={`w-full pl-12 pr-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Retail Shelf Price (GH₵) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-emerald-500">GH₵</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.retailPrice}
                    onChange={e => setFormData(prev => ({ ...prev, retailPrice: parseFloat(e.target.value) || 0 }))}
                    className={`w-full pl-12 pr-3 py-2 rounded-xl border text-xs font-mono font-extrabold text-emerald-500 outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Real-time Profit Margin Indicator */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
              isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-[#8A99A8]">Unit Margin:</span>
                <strong className={profitMarginPesewas >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {formatGhs(profitMarginPesewas)}
                </strong>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Gross Margin: <strong className="text-emerald-400">{marginPct}%</strong>
                </span>
                <span>•</span>
                <span>
                  Markup: <strong className="text-amber-400">{markupPct}%</strong>
                </span>
              </div>
            </div>

            {/* Tax Scheme Exemption Toggle */}
            <div className="pt-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="taxExemptToggle"
                  checked={formData.isTaxExempt}
                  onChange={e => setFormData(prev => ({ ...prev, isTaxExempt: e.target.checked }))}
                  className="rounded w-4 h-4 accent-amber-500 cursor-pointer"
                />
                <label htmlFor="taxExemptToggle" className="text-xs cursor-pointer select-none">
                  GRA Tax-Exempt Status (e.g. Unprocessed agricultural produce, educational items)
                </label>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                formData.isTaxExempt
                  ? 'bg-amber-500/20 text-amber-400 font-bold'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                {formData.isTaxExempt ? 'EXEMPT (0% VAT)' : 'GRA TAXABLE'}
              </span>
            </div>
          </div>

          {/* Section 3: Stock Levels & Units */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#090B0E]/50 border-[#242D37]' : 'bg-slate-50 border-[#E2E5E9]'
          }`}>
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#8A99A8] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Stock Quantities, Safety Thresholds & Unit of Measure</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Base Unit
                </label>
                <select
                  value={formData.baseUnit}
                  onChange={e => setFormData(prev => ({ ...prev, baseUnit: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                >
                  {COMMON_UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Physical Stock
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.currentStock}
                  onChange={e => setFormData(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold text-amber-500">
                  Safety Threshold *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.safetyThreshold}
                  onChange={e => setFormData(prev => ({ ...prev, safetyThreshold: parseInt(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-amber-400' : 'bg-white border-[#E2E5E9] text-amber-700'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Reorder Level
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.reorderLevel}
                  onChange={e => setFormData(prev => ({ ...prev, reorderLevel: parseInt(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Supplier, Batch & Expiry Date */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#090B0E]/50 border-[#242D37]' : 'bg-slate-50 border-[#E2E5E9]'
          }`}>
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#8A99A8] flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>Supplier, Lot & Expiry Batch Data</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Supplier / Vendor Name
                </label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={e => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                  placeholder="e.g. Finatrade Ghana Ltd"
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Batch / Lot Code
                </label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={e => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                  placeholder="e.g. BAT-2026-891"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8A99A8] block mb-1 font-semibold">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={e => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'border-[#242D37] bg-[#090B0E]/60' : 'border-[#E2E5E9] bg-slate-50'
        }`}>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8A99A8]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Audit log automatically recorded for non-repudiation</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                onClose();
              }}
              className="px-4 py-2 rounded-xl border border-[#242D37] text-[#8A99A8] hover:text-white font-semibold transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 text-slate-950 font-bold rounded-xl transition flex items-center gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isNew ? 'Create & Save Item' : 'Save Item Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
