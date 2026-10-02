import React, { useState, useEffect } from 'react';
import { LocalProduct, LocalPurchaseOrder, db } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import { StockSafetyNotification } from '../notifications/StockSafetyNotification';
import {
  Boxes,
  Truck,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  CheckCircle2,
  Plus,
  RefreshCw,
  Flame,
  ArrowRight,
  ShieldCheck,
  FileText,
  Printer,
  Zap,
  TrendingDown,
  Pencil,
  PackagePlus,
  Edit,
  Barcode
} from 'lucide-react';
import { ItemMasterEditorModal } from './ItemMasterEditorModal';
import { BarcodeLabelPrinterModal } from './BarcodeLabelPrinterModal';

interface InventoryManagerProps {
  products: LocalProduct[];
  onRefresh: () => void;
  branchName: string;
  isDark: boolean;
  currentUser?: {
    id: string;
    fullName: string;
    role: string;
  };
  onOpenPoDraft?: (items?: LocalProduct[]) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  onRefresh,
  branchName,
  isDark,
  currentUser = { id: 'usr-001', fullName: 'Yaw Frimpong', role: 'INVENTORY_OFFICER' },
  onOpenPoDraft,
}) => {
  const [activeTab, setActiveTab] = useState<'STOCK_LEVELS' | 'PURCHASE_ORDERS' | 'EXPIRY_AUDIT' | 'UOM_BREAKDOWN' | 'BRANCH_TRANSFERS' | 'ADJUSTMENTS'>('STOCK_LEVELS');
  const [search, setSearch] = useState('');
  const [savedPurchaseOrders, setSavedPurchaseOrders] = useState<LocalPurchaseOrder[]>([]);
  const [selectedPoForView, setSelectedPoForView] = useState<LocalPurchaseOrder | null>(null);

  // Item Master Edit / Create Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState<LocalProduct | null>(null);

  // Barcode Label Printer Modal State
  const [isBarcodePrinterOpen, setIsBarcodePrinterOpen] = useState(false);
  const [barcodeTargetProduct, setBarcodeTargetProduct] = useState<LocalProduct | null>(null);

  const canEditInventory =
    currentUser.role === 'INVENTORY_OFFICER' ||
    currentUser.role === 'BRANCH_MANAGER' ||
    currentUser.role === 'GENERAL_MANAGER' ||
    currentUser.role === 'SUPER_ADMIN';

  // UOM Breakdown Tool State
  const [selectedProductForUom, setSelectedProductForUom] = useState<LocalProduct>(products[0] || null);
  const [sacksToBreak, setSacksToBreak] = useState<number>(1);
  const [breakdownSuccessMsg, setBreakdownSuccessMsg] = useState('');

  // Branch Transfer Simulation State
  const [transfers, setTransfers] = useState([
    {
      id: 'TR-ACC-KMS-001',
      source: 'Accra Central Mall Store',
      dest: 'Kumasi Adum Branch',
      item: 'Royal Feast Jasmine Perfume Rice (50kg)',
      quantity: 15,
      status: 'IN_TRANSIT',
      dispatchedAt: 'Today, 08:30 AM',
    },
    {
      id: 'TR-ACC-TKD-002',
      source: 'Accra Central Mall Store',
      dest: 'Takoradi Harbour Supermarket',
      item: 'Nestlé Milo Activ-Go Tin 400g',
      quantity: 48,
      status: 'RECEIVED',
      dispatchedAt: 'Yesterday, 02:15 PM',
    },
  ]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferDest, setTransferDest] = useState('Kumasi Adum Branch');
  const [transferProduct, setTransferProduct] = useState(products[0]?.id || '');
  const [transferQty, setTransferQty] = useState(5);

  // Stock Adjustment State (Dumsor spoilage, damage, etc.)
  const [adjProduct, setAdjProduct] = useState(products[0]?.id || '');
  const [adjReason, setAdjReason] = useState<'DUMSOR_DEFROST' | 'DAMAGED_TRANSIT' | 'EXPIRED_BATCH' | 'THEFT'>('DUMSOR_DEFROST');
  const [adjQuantity, setAdjQuantity] = useState(2);
  const [adjSuccessMsg, setAdjSuccessMsg] = useState('');

  // Low stock products below safety threshold
  const lowStockProducts = products.filter(p => {
    const threshold = p.safetyThreshold !== undefined ? p.safetyThreshold : p.reorderLevel;
    return p.currentStock <= threshold;
  });

  // Load purchase orders
  useEffect(() => {
    async function loadPOs() {
      try {
        const pos = await db.purchaseOrders.reverse().toArray();
        setSavedPurchaseOrders(pos);
      } catch (e) {
        console.error('Error loading POs', e);
      }
    }
    loadPOs();
  }, [products]);

  const getExpiryDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return 999;
    const expiry = new Date(expiryDateStr).getTime();
    const today = new Date().getTime();
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const handleExecuteUomBreakdown = async () => {
    if (!selectedProductForUom) return;
    if (selectedProductForUom.currentStock < sacksToBreak) {
      alert(`Insufficient stock. Available: ${selectedProductForUom.currentStock}`);
      return;
    }

    const newStock = selectedProductForUom.currentStock - sacksToBreak;
    await db.products.update(selectedProductForUom.id, { currentStock: newStock });

    setBreakdownSuccessMsg(
      `Fractional breakdown completed: ${sacksToBreak} ${selectedProductForUom.baseUnit} deconstructed into retail units.`
    );
    setTimeout(() => setBreakdownSuccessMsg(''), 4000);
    onRefresh();
  };

  const handleExecuteAdjustment = async () => {
    const prod = products.find(p => p.id === adjProduct);
    if (!prod) return;

    const newStock = Math.max(0, prod.currentStock - adjQuantity);
    await db.products.update(prod.id, { currentStock: newStock });

    await db.auditLogs.add({
      id: `audit-${Date.now()}`,
      action: 'STOCK_ADJUSTMENT_WRITE_OFF',
      userId: currentUser.id,
      userName: currentUser.fullName,
      details: `Stock write-off of ${adjQuantity} ${prod.baseUnit} for ${prod.name}. Reason: ${adjReason}`,
      timestamp: new Date().toISOString(),
    });

    setAdjSuccessMsg(`Successfully written off ${adjQuantity} ${prod.baseUnit} from inventory.`);
    setTimeout(() => setAdjSuccessMsg(''), 3000);
    onRefresh();
  };

  const handleCreateTransfer = () => {
    const prod = products.find(p => p.id === transferProduct);
    if (!prod) return;

    const newTr = {
      id: `TR-ACC-${Math.floor(100 + Math.random() * 900)}`,
      source: branchName,
      dest: transferDest,
      item: prod.name,
      quantity: transferQty,
      status: 'IN_TRANSIT',
      dispatchedAt: 'Just now',
    };

    setTransfers(prev => [newTr, ...prev]);
    setShowTransferModal(false);
  };

  const handleConfirmTransferReceived = (transferId: string) => {
    setTransfers(prev =>
      prev.map(t => (t.id === transferId ? { ...t, status: 'RECEIVED' } : t))
    );
  };

  const handleOpenDraftForItems = (items?: LocalProduct[]) => {
    if (onOpenPoDraft) {
      onOpenPoDraft(items || lowStockProducts);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      
      {/* Top Header & Sub-Navigation */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'border-[#242D37] bg-[#11151A]' : 'border-[#E2E5E9] bg-white'
      }`}>
        <div>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Boxes className="w-5 h-5 text-amber-500" />
            <span>Multi-Branch Inventory & Warehousing</span>
          </h2>
          <p className="text-xs text-[#8A99A8]">
            Node: <span className="font-semibold text-amber-500">{branchName}</span> · Network: Accra, Kumasi, Takoradi
          </p>
        </div>

        {/* Tab Controls */}
        <div className={`flex flex-wrap gap-1 p-1 rounded-2xl border text-xs font-semibold ${
          isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F1F3F5] border-[#E2E5E9]'
        }`}>
          {[
            { id: 'STOCK_LEVELS', label: 'Stock Levels', badge: lowStockProducts.length > 0 ? lowStockProducts.length : null },
            { id: 'PURCHASE_ORDERS', label: 'Purchase Orders', badge: savedPurchaseOrders.length > 0 ? savedPurchaseOrders.length : null },
            { id: 'EXPIRY_AUDIT', label: 'FIFO Expiry' },
            { id: 'UOM_BREAKDOWN', label: 'UOM Breakdown' },
            { id: 'BRANCH_TRANSFERS', label: 'Transfers' },
            { id: 'ADJUSTMENTS', label: 'Dumsor Spoilage' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : isDark
                  ? 'text-[#8A99A8] hover:text-white'
                  : 'text-[#64748B] hover:text-black'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === tab.id
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        
        {/* TAB 1: STOCK LEVELS */}
        {activeTab === 'STOCK_LEVELS' && (
          <div className="space-y-4">
            
            {/* SAFETY THRESHOLD NOTIFICATION SYSTEM BANNER */}
            <StockSafetyNotification
              lowStockProducts={lowStockProducts}
              onOpenPoDraft={handleOpenDraftForItems}
              isDark={isDark}
              variant="banner"
            />

            {/* Filter and Stats Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="relative max-w-sm flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A99A8]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter stock by SKU, product, category..."
                  className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none focus:border-amber-500 border ${
                    isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-[#0F172A]'
                  }`}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-[#8A99A8]">
                    Total Catalog: <strong className="text-emerald-400">{products.length}</strong>
                  </span>
                  <span className="text-[#8A99A8]">·</span>
                  <span className="text-amber-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Below Safety: {lowStockProducts.length}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBarcodeTargetProduct(null);
                    setIsBarcodePrinterOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                    isDark
                      ? 'border-[#242D37] bg-[#1A2027] text-[#F4F6F8] hover:border-amber-500 hover:text-amber-400'
                      : 'border-[#E2E5E9] bg-white text-[#0F172A] hover:border-amber-500 hover:text-amber-700'
                  }`}
                  title="Print scannable barcode shelf labels and price stickers"
                >
                  <Barcode className="w-3.5 h-3.5 text-amber-500" />
                  <span>Barcode Labels</span>
                </button>

                {canEditInventory && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductToEdit(null);
                      setIsItemModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition"
                    title="Add and configure a brand new product in catalog"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <span>+ New Product</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inventory Table */}
            <div className={`rounded-2xl border overflow-x-auto ${
              isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
            }`}>
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className={`uppercase tracking-wider text-[10px] font-mono border-b ${
                  isDark ? 'bg-white/[0.02] text-[#8A99A8] border-[#242D37]' : 'bg-slate-50 text-[#64748B] border-[#E2E5E9]'
                }`}>
                  <tr>
                    <th className="p-3.5">SKU & Item Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Cost Price</th>
                    <th className="p-3.5 text-right">Retail Shelf</th>
                    <th className="p-3.5 text-center">Safety Threshold</th>
                    <th className="p-3.5 text-center">Current Stock</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242D37]/40 font-mono">
                  {products
                    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
                    .map(prod => {
                      const threshold = prod.safetyThreshold !== undefined ? prod.safetyThreshold : prod.reorderLevel;
                      const isBelowSafety = prod.currentStock <= threshold;
                      const isOut = prod.currentStock === 0;

                      return (
                        <tr
                          key={prod.id}
                          className={`transition ${
                            isBelowSafety
                              ? isDark
                                ? 'bg-amber-500/[0.05] border-l-4 border-l-amber-500 hover:bg-amber-500/[0.08]'
                                : 'bg-amber-50/60 border-l-4 border-l-amber-500 hover:bg-amber-50'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="p-3.5 font-sans">
                            <span className={`font-bold block ${
                              isBelowSafety
                                ? isDark ? 'text-amber-200' : 'text-amber-950'
                                : isDark ? 'text-white' : 'text-slate-900'
                            }`}>
                              {prod.name}
                            </span>
                            <span className="text-[10px] text-[#8A99A8] font-mono">
                              {prod.sku} · Barcode: {prod.barcode}
                              {prod.localName && <span className="ml-1 text-amber-400">({prod.localName})</span>}
                            </span>
                          </td>

                          <td className="p-3.5 text-[#8A99A8] font-sans">{prod.category}</td>

                          <td className="p-3.5 text-right text-[#8A99A8]">{formatGhs(prod.costPrice)}</td>

                          <td className="p-3.5 text-right font-bold text-emerald-500">
                            {formatGhs(prod.retailPrice)}
                          </td>

                          <td className="p-3.5 text-center font-bold text-slate-400">
                            {threshold} {prod.baseUnit}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`font-black text-sm ${
                              isBelowSafety ? 'text-amber-500' : isDark ? 'text-white' : 'text-slate-900'
                            }`}>
                              {prod.currentStock}
                            </span>
                            <span className="text-[10px] text-[#8A99A8] ml-1">{prod.baseUnit}</span>
                          </td>

                          {/* Status Badge */}
                          <td className="p-3.5 text-center">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                Stockout (0)
                              </span>
                            ) : isBelowSafety ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-flex items-center gap-1 shadow-2xs">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                <span>Below Safety ({prod.currentStock}/{threshold})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Normal Stock
                              </span>
                            )}
                          </td>

                          {/* Reorder and Edit Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setBarcodeTargetProduct(prod);
                                  setIsBarcodePrinterOpen(true);
                                }}
                                className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition inline-flex items-center gap-1 active:scale-95 ${
                                  isDark
                                    ? 'border-[#242D37] bg-[#1A2027] text-white hover:border-amber-500 hover:text-amber-400'
                                    : 'border-[#E2E5E9] bg-white text-slate-800 hover:border-amber-500 hover:text-amber-700 shadow-2xs'
                                }`}
                                title="Print barcode label for this product"
                              >
                                <Barcode className="w-3.5 h-3.5 text-amber-500" />
                                <span className="hidden sm:inline">Label</span>
                              </button>

                              {canEditInventory && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProductToEdit(prod);
                                    setIsItemModalOpen(true);
                                  }}
                                  className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition inline-flex items-center gap-1 active:scale-95 ${
                                    isDark
                                      ? 'border-[#242D37] bg-[#1A2027] text-amber-400 hover:border-amber-500'
                                      : 'border-[#E2E5E9] bg-white text-amber-700 hover:border-amber-400 shadow-2xs'
                                  }`}
                                  title="Edit full item master (Name, category, cost, retail, stock, units, expiry, tax)"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {isBelowSafety ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDraftForItems([prod])}
                                  className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-sm active:scale-95 transition inline-flex items-center gap-1 font-sans"
                                  title="Generate Purchase Order Draft for this item"
                                >
                                  <Zap className="w-3 h-3 fill-slate-950" />
                                  <span>Draft PO</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDraftForItems([prod])}
                                  className={`px-2 py-1 rounded-xl border text-[11px] transition inline-flex items-center gap-1 font-sans ${
                                    isDark ? 'border-[#242D37] text-[#8A99A8] hover:text-white' : 'border-[#E2E5E9] text-slate-600 hover:text-black'
                                  }`}
                                >
                                  <span>Reorder</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: PURCHASE ORDERS ARCHIVE */}
        {activeTab === 'PURCHASE_ORDERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Issued Purchase Orders (Safety Stock Restock)
                </h3>
                <p className="text-xs text-[#8A99A8]">
                  Track generated supplier POs, authorization records, and replenishment values.
                </p>
              </div>

              {lowStockProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenDraftForItems(lowStockProducts)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Generate New PO for Deficits</span>
                </button>
              )}
            </div>

            {savedPurchaseOrders.length === 0 ? (
              <div className={`p-8 rounded-2xl border text-center ${
                isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
              }`}>
                <FileText className="w-10 h-10 text-amber-500/50 mx-auto mb-2" />
                <h4 className="font-bold text-sm mb-1">No Purchase Orders Issued Yet</h4>
                <p className="text-xs text-[#8A99A8] max-w-sm mx-auto mb-4">
                  Use the Safety Threshold alert banner to generate an automated replenishment PO draft with a single click.
                </p>
                {lowStockProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenDraftForItems(lowStockProducts)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    Generate PO Draft Now ({lowStockProducts.length} items)
                  </button>
                )}
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden ${
                isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
              }`}>
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className={`text-[10px] uppercase font-mono border-b ${
                    isDark ? 'bg-white/[0.02] text-[#8A99A8] border-[#242D37]' : 'bg-slate-50 text-[#64748B] border-[#E2E5E9]'
                  }`}>
                    <tr>
                      <th className="p-3.5">PO Number & Date</th>
                      <th className="p-3.5">Supplier / Distributor</th>
                      <th className="p-3.5">Authorized By</th>
                      <th className="p-3.5 text-center">Items Count</th>
                      <th className="p-3.5 text-right">Total Value</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242D37]/40 font-mono">
                    {savedPurchaseOrders.map(po => (
                      <tr key={po.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-3.5">
                          <div className="font-bold text-amber-400">{po.poNumber}</div>
                          <div className="text-[10px] text-[#8A99A8] font-sans">
                            {new Date(po.createdAt).toLocaleString('en-GB')}
                          </div>
                        </td>

                        <td className="p-3.5 font-sans font-semibold">
                          {po.supplierName}
                        </td>

                        <td className="p-3.5 font-sans text-[#8A99A8]">
                          {po.generatedBy}
                        </td>

                        <td className="p-3.5 text-center font-bold">
                          {po.items?.length || 0} Lines
                        </td>

                        <td className="p-3.5 text-right font-black text-emerald-500">
                          {formatGhs(po.totalCost)}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {po.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedPoForView(po)}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-sans transition ${
                              isDark ? 'border-[#242D37] text-slate-300 hover:text-white hover:bg-[#1A2027]' : 'border-[#E2E5E9] text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            View Voucher
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FIFO EXPIRY */}
        {activeTab === 'EXPIRY_AUDIT' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
            }`}>
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  First-In First-Out (FIFO) & Expiry Sentinel
                </h3>
                <p className="text-xs text-[#8A99A8]">
                  Real-time monitor for dairy, medicines, and packaged items.
                </p>
              </div>

              <div className="flex gap-2 text-[10px] font-mono">
                <span className="text-rose-500 font-bold">&lt; 30 Days: Critical</span>
                <span className="text-[#8A99A8]">·</span>
                <span className="text-amber-500 font-bold">&lt; 60 Days: Clearance</span>
                <span className="text-[#8A99A8]">·</span>
                <span className="text-emerald-500 font-bold">&gt; 90 Days: Stable</span>
              </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
            }`}>
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className={`uppercase text-[10px] font-mono border-b ${
                  isDark ? 'bg-white/[0.02] text-[#8A99A8] border-[#242D37]' : 'bg-slate-50 text-[#64748B] border-[#E2E5E9]'
                }`}>
                  <tr>
                    <th className="p-3.5">Product & Batch</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-center">Batch Expiry</th>
                    <th className="p-3.5 text-center">Days Remaining</th>
                    <th className="p-3.5 text-center">Shelf Stock</th>
                    <th className="p-3.5 text-center">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242D37]/40 font-mono">
                  {products
                    .filter(p => p.expiryDate)
                    .map(prod => {
                      const days = getExpiryDaysRemaining(prod.expiryDate);
                      return (
                        <tr key={prod.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3.5 font-sans">
                            <span className="font-bold block">{prod.name}</span>
                            <span className="text-[10px] text-[#8A99A8] font-mono">Batch: {prod.batchNumber || 'N/A'}</span>
                          </td>
                          <td className="p-3.5 text-[#8A99A8] font-sans">{prod.category}</td>
                          <td className="p-3.5 text-center font-bold">{prod.expiryDate}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              days < 30 ? 'bg-rose-500/20 text-rose-400' : days < 90 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {days} Days
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-bold">
                            {prod.currentStock} {prod.baseUnit}
                          </td>
                          <td className="p-3.5 text-center font-sans">
                            {days < 30 ? (
                              <span className="text-rose-500 font-bold text-xs">Immediate Mark-down 30%</span>
                            ) : days < 90 ? (
                              <span className="text-amber-500 font-bold text-xs">Front-Row FIFO Placement</span>
                            ) : (
                              <span className="text-emerald-500 text-xs">Normal Rotation</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: UOM BREAKDOWN */}
        {activeTab === 'UOM_BREAKDOWN' && (
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'}`}>
              <h3 className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Bulk Packaging Breakdown Engine
              </h3>
              <p className="text-xs text-[#8A99A8] mb-4">
                Deconstruct bulk sacks (e.g. 50kg rice) into fractional consumer packs (olonka, half-bag, single kg).
              </p>

              {breakdownSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{breakdownSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[#8A99A8] block mb-1">Select Bulk Bulk Item:</label>
                  <select
                    value={selectedProductForUom?.id || ''}
                    onChange={e => {
                      const p = products.find(x => x.id === e.target.value);
                      if (p) setSelectedProductForUom(p);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs outline-none border focus:border-amber-500 ${
                      isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-[#0F172A]'
                    }`}
                  >
                    {products
                      .filter(p => p.uomOptions && p.uomOptions.length > 1)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.currentStock} {p.baseUnit})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#8A99A8] block mb-1">Sacks / Bulk Units to Deconstruct:</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProductForUom?.currentStock || 1}
                    value={sacksToBreak}
                    onChange={e => setSacksToBreak(parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono outline-none border focus:border-amber-500 ${
                      isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-[#0F172A]'
                    }`}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleExecuteUomBreakdown}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Confirm Breakdown & Update Tills</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BRANCH TRANSFERS */}
        {activeTab === 'BRANCH_TRANSFERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Inter-Branch Stock Transfers
                </h3>
                <p className="text-xs text-[#8A99A8]">Accra Hub $\leftrightarrow$ Kumasi Adum $\leftrightarrow$ Takoradi Harbour</p>
              </div>

              <button
                type="button"
                onClick={() => setShowTransferModal(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Branch Dispatch</span>
              </button>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
            }`}>
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className={`uppercase text-[10px] font-mono border-b ${
                  isDark ? 'bg-white/[0.02] text-[#8A99A8] border-[#242D37]' : 'bg-slate-50 text-[#64748B] border-[#E2E5E9]'
                }`}>
                  <tr>
                    <th className="p-3.5">Manifest ID</th>
                    <th className="p-3.5">Destination</th>
                    <th className="p-3.5">Item & Qty</th>
                    <th className="p-3.5">Dispatch Time</th>
                    <th className="p-3.5 text-center">Transfer Status</th>
                    <th className="p-3.5 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242D37]/40 font-mono">
                  {transfers.map(tr => (
                    <tr key={tr.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5 font-bold text-amber-500">{tr.id}</td>
                      <td className="p-3.5 font-sans font-semibold">{tr.dest}</td>
                      <td className="p-3.5 font-sans">
                        <span className="font-semibold block">{tr.item}</span>
                        <span className="text-[10px] text-[#8A99A8] font-mono">Qty: {tr.quantity} units</span>
                      </td>
                      <td className="p-3.5 text-[#8A99A8]">{tr.dispatchedAt}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tr.status === 'IN_TRANSIT' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {tr.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {tr.status === 'IN_TRANSIT' ? (
                          <button
                            type="button"
                            onClick={() => handleConfirmTransferReceived(tr.id)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px]"
                          >
                            Confirm Delivery
                          </button>
                        ) : (
                          <span className="text-emerald-500 text-[10px] font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: DUMSOR SPOILAGE & WRITE-OFF */}
        {activeTab === 'ADJUSTMENTS' && (
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'}`}>
              <h3 className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Wastage, Breakage & Dumsor Spoilage Log
              </h3>
              <p className="text-xs text-[#8A99A8] mb-4">
                Record defrosted cold-store items, in-transit transit damages, and broken bottles with supervisor sign-off.
              </p>

              {adjSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{adjSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-[#8A99A8] block mb-1">Item to Write Off:</label>
                  <select
                    value={adjProduct}
                    onChange={e => setAdjProduct(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs outline-none border ${
                      isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-[#0F172A]'
                    }`}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.currentStock} {p.baseUnit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#8A99A8] block mb-1">Reason for Loss:</label>
                  <select
                    value={adjReason}
                    onChange={e => setAdjReason(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl text-xs outline-none border ${
                      isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-[#0F172A]'
                    }`}
                  >
                    <option value="DUMSOR_DEFROST">Dumsor (Power Cut / Freezing Loss)</option>
                    <option value="DAMAGED_TRANSIT">In-Transit Freight Damage</option>
                    <option value="EXPIRED_BATCH">Expired Batch Date</option>
                    <option value="THEFT">Shrinkage / Till Discrepancy</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#8A99A8] block mb-1">Quantity Lost:</label>
                  <input
                    type="number"
                    min="1"
                    value={adjQuantity}
                    onChange={e => setAdjQuantity(parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono outline-none border ${
                      isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-[#0F172A]'
                    }`}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleExecuteAdjustment}
                    className="w-full py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Authorize Loss Entry</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* VIEW PO MODAL */}
      {selectedPoForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-5 space-y-4 ${
            isDark ? 'bg-[#11151A] border-[#242D37] text-[#F4F6F8]' : 'bg-white border-[#E2E5E9] text-[#0F172A]'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <span>Purchase Order Voucher</span>
                  <span className="font-mono text-amber-500">{selectedPoForView.poNumber}</span>
                </h3>
                <p className="text-xs text-[#8A99A8]">Supplier: {selectedPoForView.supplierName}</p>
              </div>
              <button
                onClick={() => setSelectedPoForView(null)}
                className="p-1.5 rounded-lg border border-[#242D37]"
              >
                Close
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedPoForView.items?.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/[0.02]">
                  <div>
                    <span className="font-bold">{it.productName}</span>
                    <span className="text-[10px] text-[#8A99A8] block">{it.sku} · Qty: {it.recommendedOrder} {it.unit}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-500">{formatGhs(it.totalCost)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8A99A8]">Grand Total:</span>
                <div className="font-black text-lg text-emerald-500 font-mono">
                  {formatGhs(selectedPoForView.totalCost)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-3xl border shadow-2xl p-5 space-y-3 ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
          }`}>
            <h3 className="font-bold text-sm">Create Branch Transfer</h3>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">Destination:</label>
              <select
                value={transferDest}
                onChange={e => setTransferDest(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-[#0F172A]'
                }`}
              >
                <option value="Kumasi Adum Branch">Kumasi Adum Branch (Ashanti)</option>
                <option value="Takoradi Harbour Supermarket">Takoradi Harbour Supermarket (Western)</option>
                <option value="Tamale Central Store">Tamale Central Store (Northern)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">Product:</label>
              <select
                value={transferProduct}
                onChange={e => setTransferProduct(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-[#0F172A]'
                }`}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">Quantity:</label>
              <input
                type="number"
                min="1"
                value={transferQty}
                onChange={e => setTransferQty(parseInt(e.target.value) || 1)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono border ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-[#F8F9FA] border-[#E2E5E9] text-[#0F172A]'
                }`}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className={`flex-1 py-2 rounded-xl text-xs border ${
                  isDark ? 'border-[#242D37] text-[#8A99A8]' : 'border-[#E2E5E9] text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTransfer}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM MASTER EDITOR / CREATOR MODAL */}
      <ItemMasterEditorModal
        isOpen={isItemModalOpen}
        product={selectedProductToEdit}
        onClose={() => {
          setIsItemModalOpen(false);
          setSelectedProductToEdit(null);
        }}
        onRefresh={onRefresh}
        isDark={isDark}
        currentUser={currentUser}
        categories={Array.from(new Set(products.map(p => p.category)))}
      />

      {/* BARCODE LABEL PRINTER MODAL */}
      <BarcodeLabelPrinterModal
        isOpen={isBarcodePrinterOpen}
        onClose={() => {
          setIsBarcodePrinterOpen(false);
          setBarcodeTargetProduct(null);
        }}
        products={products}
        initialProduct={barcodeTargetProduct}
        branchName={branchName}
        isDark={isDark}
      />

    </div>
  );
};
