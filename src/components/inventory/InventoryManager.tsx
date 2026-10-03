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
  Barcode,
  Package
} from 'lucide-react';
import { ItemMasterEditorModal } from './ItemMasterEditorModal';
import { BarcodeLabelPrinterModal } from './BarcodeLabelPrinterModal';
import { stripEmojis } from '../../utils/emojiSanitizer';
import { OfficialPrintPortal } from '../common/OfficialPrintPortal';

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

  return (    <div className="flex-1 flex flex-col h-full overflow-hidden font-serif bg-[#EBEEF2] dark:bg-[#121316]">
      
      {/* Top Header & Sub-Navigation */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'border-[#282B34] bg-[#16181F]' : 'border-slate-300 bg-white'
      }`}>
        <div>
          <h2 className={`text-base font-bold font-serif flex items-center gap-2 ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FF4500]/15 text-[#FF4500]">
              <Boxes className="w-4.5 h-4.5" />
            </div>
            <span>Multi-Branch Inventory & Warehousing</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-stone-400 font-serif mt-0.5">
            Node: <span className="font-semibold text-[#008285] dark:text-[#00CED1]">{branchName}</span> · Network: Accra, Kumasi, Takoradi
          </p>
        </div>

        {/* Tab Controls */}
        <div className={`flex flex-wrap gap-1 p-1 rounded-2xl border text-xs font-semibold ${
          isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-slate-200/80 border-slate-300'
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
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 font-serif ${
                activeTab === tab.id
                  ? 'bg-[#FF4500] text-white font-bold shadow-[0_2px_8px_rgba(255,69,0,0.3)]'
                  : isDark
                  ? 'text-stone-400 hover:text-stone-100 hover:bg-[#1A1C22]'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums font-bold ${
                  activeTab === tab.id
                    ? 'bg-black/30 text-white'
                    : 'bg-[#FF4500]/20 text-[#FF5722] border border-[#FF4500]/30'
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
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(stripEmojis(e.target.value))}
                  placeholder="Filter stock by SKU, product, category..."
                  className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none border font-serif transition-colors ${
                    isDark 
                      ? 'bg-[#16181F] border-[#282B34] text-stone-100 placeholder:text-stone-500 focus:border-[#00CED1]' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#008285]'
                  }`}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs font-serif">
                  <span className="text-slate-600 dark:text-stone-400">
                    Total Catalog: <strong className="text-[#008285] dark:text-[#00CED1] font-mono tabular-nums font-bold">{products.length}</strong>
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-[#FF4500] font-bold flex items-center gap-1 font-serif">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Below Safety: <strong className="font-mono tabular-nums">{lowStockProducts.length}</strong></span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBarcodeTargetProduct(null);
                    setIsBarcodePrinterOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-serif flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                    isDark
                      ? 'border-[#282B34] bg-[#1A1C22] text-stone-200 hover:border-[#00CED1] hover:text-[#00CED1]'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-[#008285] hover:text-[#008285]'
                  }`}
                  title="Print scannable barcode shelf labels and price stickers"
                >
                  <Barcode className="w-3.5 h-3.5 text-[#008285] dark:text-[#00CED1]" />
                  <span>Barcode Labels</span>
                </button>

                {canEditInventory && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductToEdit(null);
                      setIsItemModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold font-serif text-xs rounded-xl flex items-center gap-1.5 shadow-[0_2px_10px_rgba(255,69,0,0.3)] active:scale-95 transition cursor-pointer"
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
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'
            }`}>
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className={`uppercase tracking-wider text-[11px] font-serif font-bold border-b ${
                  isDark ? 'bg-white/[0.02] text-stone-400 border-[#282B34]' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <tr>
                    <th className="p-3.5">SKU & Item Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Cost Price</th>
                    <th className="p-3.5 text-right">Retail Shelf</th>
                    <th className="p-3.5 text-right">Wholesale Price</th>
                    <th className="p-3.5 text-center">Safety Threshold</th>
                    <th className="p-3.5 text-center">Current Stock</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#282B34]">
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
                                ? 'bg-[#FF4500]/[0.05] border-l-4 border-l-[#FF4500] hover:bg-[#FF4500]/[0.09]'
                                : 'bg-amber-50/70 border-l-4 border-l-[#FF4500] hover:bg-amber-50'
                              : isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3.5 font-serif">
                            <div className="flex items-center gap-2.5">
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-300 dark:border-[#282B34] shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1A1C22] border border-slate-300 dark:border-[#282B34] flex items-center justify-center shrink-0 text-slate-400">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className={`font-serif font-bold block truncate max-w-xs ${
                                  isBelowSafety
                                    ? isDark ? 'text-orange-200' : 'text-orange-950 font-bold'
                                    : isDark ? 'text-stone-100' : 'text-slate-900 font-bold'
                                }`}>
                                  {prod.name}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-stone-400 font-mono">
                                  {prod.sku} · Barcode: {prod.barcode}
                                  {prod.localName && <span className="ml-1 text-[#008285] dark:text-[#00CED1] font-serif font-medium">({prod.localName})</span>}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 text-slate-600 dark:text-stone-400 font-serif">{prod.category}</td>

                          <td className="p-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-stone-400">{formatGhs(prod.costPrice)}</td>

                          <td className="p-3.5 text-right font-mono tabular-nums font-bold text-[#FF4500]">
                            {formatGhs(prod.retailPrice)}
                          </td>

                          <td className="p-3.5 text-right font-mono tabular-nums font-bold text-[#008285] dark:text-[#00CED1]">
                            {formatGhs(prod.wholesalePrice || Math.round(prod.retailPrice * 0.85 * 100) / 100)}
                          </td>

                          <td className="p-3.5 text-center font-mono tabular-nums font-bold text-slate-600 dark:text-stone-400">
                            {threshold} {prod.baseUnit}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`font-black font-mono tabular-nums text-sm ${
                              isBelowSafety ? 'text-[#FF4500]' : isDark ? 'text-stone-100' : 'text-slate-900'
                            }`}>
                              {prod.currentStock}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-stone-400 ml-1 font-serif">{prod.baseUnit}</span>
                          </td>

                          {/* Status Badge */}
                          <td className="p-3.5 text-center font-serif">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30 font-mono">
                                Stockout (0)
                              </span>
                            ) : isBelowSafety ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF4500]/15 text-[#C23600] dark:text-[#FF5722] border border-[#FF4500]/30 inline-flex items-center gap-1 shadow-2xs font-mono">
                                <AlertTriangle className="w-3 h-3 text-[#FF4500]" />
                                <span>Below Safety ({prod.currentStock}/{threshold})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 font-mono">
                                Normal Stock
                              </span>
                            )}
                          </td>

                          {/* Reorder and Edit Actions */}
                          <td className="p-3.5 text-right font-serif">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setBarcodeTargetProduct(prod);
                                  setIsBarcodePrinterOpen(true);
                                }}
                                className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition inline-flex items-center gap-1 active:scale-95 cursor-pointer ${
                                  isDark
                                    ? 'border-[#282B34] bg-[#1A1C22] text-stone-200 hover:border-[#00CED1] hover:text-[#00CED1]'
                                    : 'border-slate-300 bg-white text-slate-800 hover:border-[#008285] hover:text-[#008285] shadow-2xs'
                                }`}
                                title="Print barcode label for this product"
                              >
                                <Barcode className="w-3.5 h-3.5 text-[#008285] dark:text-[#00CED1]" />
                                <span className="hidden sm:inline">Label</span>
                              </button>

                              {canEditInventory && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProductToEdit(prod);
                                    setIsItemModalOpen(true);
                                  }}
                                  className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition inline-flex items-center gap-1 active:scale-95 cursor-pointer ${
                                    isDark
                                      ? 'border-[#282B34] bg-[#1A1C22] text-[#00CED1] hover:border-[#00CED1]'
                                      : 'border-slate-300 bg-white text-[#008285] hover:border-[#008285] hover:bg-[#00CED1]/10 shadow-2xs'
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
                                  className="px-2.5 py-1 rounded-xl bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold text-[11px] shadow-[0_2px_8px_rgba(255,69,0,0.25)] active:scale-95 transition inline-flex items-center gap-1 font-serif cursor-pointer"
                                  title="Generate Purchase Order Draft for this item"
                                >
                                  <Zap className="w-3 h-3 fill-white" />
                                  <span>Draft PO</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDraftForItems([prod])}
                                  className={`px-2 py-1 rounded-xl border text-[11px] transition inline-flex items-center gap-1 font-serif cursor-pointer ${
                                    isDark ? 'border-[#282B34] text-stone-400 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className={`font-serif font-bold text-sm ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
                  Issued Purchase Orders (Safety Stock Restock)
                </h3>
                <p className="text-xs text-slate-600 dark:text-stone-400 font-serif">
                  Track generated supplier POs, authorization records, and replenishment values.
                </p>
              </div>

              {lowStockProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenDraftForItems(lowStockProducts)}
                  className="px-4 py-2 rounded-xl bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold font-serif text-xs shadow-[0_2px_10px_rgba(255,69,0,0.3)] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Generate New PO for Deficits</span>
                </button>
              )}
            </div>

            {savedPurchaseOrders.length === 0 ? (
              <div className={`p-8 rounded-2xl border text-center ${
                isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'
              }`}>
                <FileText className="w-10 h-10 text-[#FF4500]/50 mx-auto mb-2" />
                <h4 className="font-serif font-bold text-sm mb-1 text-slate-900 dark:text-stone-100">No Purchase Orders Issued Yet</h4>
                <p className="text-xs text-slate-600 dark:text-stone-400 font-serif max-w-sm mx-auto mb-4">
                  Use the Safety Threshold alert banner to generate an automated replenishment PO draft with a single click.
                </p>
                {lowStockProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenDraftForItems(lowStockProducts)}
                    className="px-4 py-2 rounded-xl bg-[#FF4500] hover:bg-[#E03E00] text-white font-serif font-bold text-xs shadow-[0_2px_10px_rgba(255,69,0,0.3)] cursor-pointer"
                  >
                    Generate PO Draft Now ({lowStockProducts.length} items)
                  </button>
                )}
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden ${
                isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'
              }`}>
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className={`text-[11px] uppercase tracking-wider font-serif font-bold border-b ${
                    isDark ? 'bg-white/[0.02] text-stone-400 border-[#282B34]' : 'bg-slate-100 text-slate-700 border-slate-300'
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
                  <tbody className="divide-y divide-slate-200 dark:divide-[#282B34]">
                    {savedPurchaseOrders.map(po => (
                      <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition">
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-[#008285] dark:text-[#00CED1]">{po.poNumber}</div>
                          <div className="text-[10px] text-slate-500 dark:text-stone-400 font-serif">
                            {new Date(po.createdAt).toLocaleString('en-GB')}
                          </div>
                        </td>

                        <td className="p-3.5 font-serif font-semibold text-slate-900 dark:text-stone-100">
                          {po.supplierName}
                        </td>

                        <td className="p-3.5 font-serif text-slate-600 dark:text-stone-400">
                          {po.generatedBy}
                        </td>

                        <td className="p-3.5 text-center font-mono tabular-nums font-bold text-slate-800 dark:text-stone-300">
                          {po.items?.length || 0} Lines
                        </td>

                        <td className="p-3.5 text-right font-black font-mono tabular-nums text-[#008285] dark:text-emerald-400">
                          {formatGhs(po.totalCost)}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
                            {po.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-serif">
                          <button
                            type="button"
                            onClick={() => setSelectedPoForView(po)}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-serif transition cursor-pointer ${
                              isDark ? 'border-[#282B34] text-stone-300 hover:text-[#00CED1] hover:border-[#00CED1] hover:bg-[#1A1C22]' : 'border-slate-300 text-slate-700 hover:border-[#008285] hover:text-[#008285] hover:bg-slate-100'
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
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'
            }`}>
              <div>
                <h3 className={`font-serif font-bold text-sm ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
                  First-In First-Out (FIFO) & Expiry Sentinel
                </h3>
                <p className="text-xs text-slate-600 dark:text-stone-400 font-serif">
                  Real-time monitor for dairy, medicines, and packaged items.
                </p>
              </div>

              <div className="flex gap-2 text-[10px] font-mono tabular-nums">
                <span className="text-rose-600 dark:text-rose-500 font-bold">&lt; 30 Days: Critical</span>
                <span className="text-slate-400">·</span>
                <span className="text-[#FF4500] font-bold">&lt; 60 Days: Clearance</span>
                <span className="text-slate-400">·</span>
                <span className="text-[#008285] dark:text-emerald-500 font-bold">&gt; 90 Days: Stable</span>
              </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'
            }`}>
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className={`uppercase tracking-wider text-[11px] font-serif font-bold border-b ${
                  isDark ? 'bg-white/[0.02] text-stone-400 border-[#282B34]' : 'bg-slate-100 text-slate-700 border-slate-300'
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
                <tbody className="divide-y divide-slate-200 dark:divide-[#282B34]">
                  {products
                    .filter(p => p.expiryDate)
                    .map(prod => {
                      const days = getExpiryDaysRemaining(prod.expiryDate);
                      return (
                        <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition">
                          <td className="p-3.5 font-serif">
                            <span className="font-serif font-bold block text-slate-900 dark:text-stone-100">{prod.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-stone-400 font-mono">Batch: {prod.batchNumber || 'N/A'}</span>
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-stone-400 font-serif">{prod.category}</td>
                          <td className="p-3.5 text-center font-mono tabular-nums font-bold text-slate-800 dark:text-stone-300">{prod.expiryDate}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-bold ${
                              days < 30 ? 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-400' : days < 90 ? 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-[#FF4500]/20 dark:text-[#FF5722]' : 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400'
                            }`}>
                              {days} Days
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono tabular-nums font-bold text-slate-800 dark:text-stone-300">
                            {prod.currentStock} {prod.baseUnit}
                          </td>
                          <td className="p-3.5 text-center font-serif">
                            {days < 30 ? (
                              <span className="text-rose-600 dark:text-rose-500 font-bold text-xs">Immediate Mark-down 30%</span>
                            ) : days < 90 ? (
                              <span className="text-[#FF4500] font-bold text-xs">Front-Row FIFO Placement</span>
                            ) : (
                              <span className="text-[#008285] dark:text-emerald-500 text-xs font-semibold">Normal Rotation</span>
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
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'}`}>
              <h3 className={`font-serif font-bold text-sm mb-1 ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
                Bulk Packaging Breakdown Engine
              </h3>
              <p className="text-xs text-slate-600 dark:text-stone-400 font-serif mb-4">
                Deconstruct bulk sacks (e.g. 50kg rice) into fractional consumer packs (olonka, half-bag, single kg).
              </p>

              {breakdownSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-serif font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{breakdownSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-600 dark:text-stone-400 font-serif block mb-1">Select Bulk Item:</label>
                  <select
                    value={selectedProductForUom?.id || ''}
                    onChange={e => {
                      const p = products.find(x => x.id === e.target.value);
                      if (p) setSelectedProductForUom(p);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs outline-none border font-serif focus:border-[#008285] ${
                      isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-slate-50 border-slate-300 text-slate-900'
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
                  <label className="text-xs text-slate-600 dark:text-stone-400 font-serif block mb-1">Sacks / Bulk Units to Deconstruct:</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProductForUom?.currentStock || 1}
                    value={sacksToBreak}
                    onChange={e => setSacksToBreak(parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums outline-none border focus:border-[#008285] ${
                      isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleExecuteUomBreakdown}
                    className="w-full py-2 bg-[#008285] hover:bg-[#007073] dark:bg-[#00CED1] dark:hover:bg-[#00B4B7] text-white dark:text-slate-950 font-bold font-serif rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm cursor-pointer"
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className={`font-serif font-bold text-sm ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
                  Inter-Branch Stock Transfers
                </h3>
                <p className="text-xs text-slate-600 dark:text-stone-400 font-serif">Accra Hub ↔ Kumasi Adum ↔ Takoradi Harbour</p>
              </div>

              <button
                type="button"
                onClick={() => setShowTransferModal(true)}
                className="px-3.5 py-1.5 bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold font-serif rounded-xl text-xs flex items-center gap-1.5 shadow-[0_2px_10px_rgba(255,69,0,0.3)] active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Branch Dispatch</span>
              </button>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'
            }`}>
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className={`uppercase tracking-wider text-[11px] font-serif font-bold border-b ${
                  isDark ? 'bg-white/[0.02] text-stone-400 border-[#282B34]' : 'bg-slate-100 text-slate-700 border-slate-300'
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
                <tbody className="divide-y divide-slate-200 dark:divide-[#282B34]">
                  {transfers.map(tr => (
                    <tr key={tr.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition">
                      <td className="p-3.5 font-mono font-bold text-[#008285] dark:text-[#00CED1]">{tr.id}</td>
                      <td className="p-3.5 font-serif font-semibold text-slate-900 dark:text-stone-100">{tr.dest}</td>
                      <td className="p-3.5 font-serif">
                        <span className="font-serif font-semibold block text-slate-900 dark:text-stone-100">{tr.item}</span>
                        <span className="text-[10px] text-slate-500 dark:text-stone-400 font-mono tabular-nums">Qty: {tr.quantity} units</span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-stone-400 font-serif">{tr.dispatchedAt}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          tr.status === 'IN_TRANSIT' ? 'bg-[#FF4500]/20 text-[#C23600] dark:text-[#FF5722] border border-[#FF4500]/30' : 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                        }`}>
                          {tr.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-serif">
                        {tr.status === 'IN_TRANSIT' ? (
                          <button
                            type="button"
                            onClick={() => handleConfirmTransferReceived(tr.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-serif rounded-lg text-[10px] transition cursor-pointer"
                          >
                            Confirm Delivery
                          </button>
                        ) : (
                          <span className="text-[#008285] dark:text-emerald-500 text-[10px] font-bold flex items-center justify-end gap-1 font-serif">
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
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'}`}>
              <h3 className={`font-serif font-bold text-sm mb-1 ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
                Wastage, Breakage & Dumsor Spoilage Log
              </h3>
              <p className="text-xs text-slate-600 dark:text-stone-400 font-serif mb-4">
                Record defrosted cold-store items, in-transit transit damages, and broken bottles with supervisor sign-off.
              </p>

              {adjSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-serif font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{adjSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-600 dark:text-stone-400 font-serif block mb-1">Item to Write Off:</label>
                  <select
                    value={adjProduct}
                    onChange={e => setAdjProduct(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs outline-none border font-serif focus:border-[#FF4500] ${
                      isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-slate-50 border-slate-300 text-slate-900'
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
                  <label className="text-xs text-slate-600 dark:text-stone-400 font-serif block mb-1">Reason for Loss:</label>
                  <select
                    value={adjReason}
                    onChange={e => setAdjReason(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl text-xs outline-none border font-serif focus:border-[#FF4500] ${
                      isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="DUMSOR_DEFROST">Dumsor (Power Cut / Freezing Loss)</option>
                    <option value="DAMAGED_TRANSIT">In-Transit Freight Damage</option>
                    <option value="EXPIRED_BATCH">Expired Batch Date</option>
                    <option value="THEFT">Shrinkage / Till Discrepancy</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-stone-400 font-serif block mb-1">Quantity Lost:</label>
                  <input
                    type="number"
                    min="1"
                    value={adjQuantity}
                    onChange={e => setAdjQuantity(parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums outline-none border focus:border-[#FF4500] ${
                      isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleExecuteAdjustment}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold font-serif rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 no-print">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-5 space-y-4 ${
            isDark ? 'bg-[#16181F] border-[#282B34] text-stone-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-300 dark:border-[#282B34]">
              <div>
                <h3 className="font-serif font-extrabold text-base flex items-center gap-2">
                  <span>Purchase Order Voucher</span>
                  <span className="font-mono text-[#008285] dark:text-[#00CED1]">{selectedPoForView.poNumber}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-stone-400 font-serif">Supplier: {selectedPoForView.supplierName}</p>
              </div>
              <button
                onClick={() => setSelectedPoForView(null)}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-[#282B34] hover:border-[#FF4500] hover:text-[#FF4500] transition cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedPoForView.items?.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-[#282B34]/60">
                  <div>
                    <span className="font-serif font-bold text-slate-900 dark:text-stone-100">{it.productName}</span>
                    <span className="text-[10px] text-slate-500 dark:text-stone-400 block font-mono">
                      {it.sku} · Qty: {it.recommendedOrder} {it.unit}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-[#008285] dark:text-emerald-400">{formatGhs(it.totalCost)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t flex items-center justify-between border-slate-300 dark:border-[#282B34]">
              <div>
                <span className="text-xs text-slate-600 dark:text-stone-400 font-serif">Grand Total:</span>
                <div className="font-black text-lg text-[#008285] dark:text-emerald-400 font-mono tabular-nums">
                  {formatGhs(selectedPoForView.totalCost)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#008285] hover:bg-[#007073] dark:bg-[#00CED1] dark:hover:bg-[#00B4B7] text-white dark:text-slate-950 font-bold font-serif rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print">
          <div className={`w-full max-w-sm rounded-3xl border shadow-2xl p-5 space-y-3 ${
            isDark ? 'bg-[#16181F] border-[#282B34] text-stone-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <h3 className="font-serif font-bold text-sm">Create Branch Transfer</h3>

            <div>
              <label className="text-xs text-slate-600 dark:text-stone-400 font-serif block mb-1">Destination:</label>
              <select
                value={transferDest}
                onChange={e => setTransferDest(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border font-serif outline-none focus:border-[#008285] ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="Kumasi Adum Branch">Kumasi Adum Branch (Ashanti)</option>
                <option value="Takoradi Harbour Supermarket">Takoradi Harbour Supermarket (Western)</option>
                <option value="Tamale Central Store">Tamale Central Store (Northern)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-stone-400 font-serif block mb-1">Product:</label>
              <select
                value={transferProduct}
                onChange={e => setTransferProduct(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border font-serif outline-none focus:border-[#008285] ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-slate-50 border-slate-300 text-slate-900'
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
              <label className="text-xs text-slate-600 dark:text-stone-400 font-serif block mb-1">Quantity:</label>
              <input
                type="number"
                min="1"
                value={transferQty}
                onChange={e => setTransferQty(parseInt(e.target.value) || 1)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums border outline-none focus:border-[#008285] ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-stone-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className={`flex-1 py-2 rounded-xl text-xs border font-serif cursor-pointer ${
                  isDark ? 'border-[#282B34] text-stone-400 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-slate-950'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTransfer}
                className="flex-1 py-2 bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold font-serif rounded-xl text-xs shadow-[0_2px_10px_rgba(255,69,0,0.3)] transition active:scale-95 cursor-pointer"
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

      {/* OFFICIAL PRINTABLE PURCHASE ORDER DOCUMENT FROM INVENTORY MANAGER */}
      {selectedPoForView && (
        <OfficialPrintPortal active={true}>
          <div className="official-printable-doc text-black bg-white p-8 font-sans max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-black">
                  AKWAABA RETAIL SYSTEMS & WHOLESALE LTD.
                </h1>
                <p className="text-xs text-gray-700 font-medium">Headquarters & Central Logistics Distribution</p>
                <p className="text-xs text-gray-700">Digital Address: GA-183-9022, Accra Central, Ghana</p>
                <p className="text-xs text-gray-700 font-mono font-bold">GRA TIN: C0029482190 | VAT REG: YES</p>
              </div>
              <div className="text-right">
                <div className="inline-block border-2 border-black px-4 py-1.5 text-center bg-gray-50">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-gray-600">OFFICIAL VOUCHER</span>
                  <span className="text-sm font-black text-black">PURCHASE ORDER</span>
                </div>
                <div className="mt-2 text-xs font-mono">
                  <p><strong>PO Number:</strong> {selectedPoForView.poNumber}</p>
                  <p><strong>Date:</strong> {new Date(selectedPoForView.createdAt).toLocaleDateString('en-GB')}</p>
                  <p><strong>Terms:</strong> 14 Days Net</p>
                </div>
              </div>
            </div>

            {/* Supplier & Delivery */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-xs border border-gray-300 p-4 rounded bg-gray-50/50">
              <div>
                <h3 className="font-bold uppercase tracking-wider text-gray-600 text-[10px] mb-1">SUPPLIER / VENDOR:</h3>
                <p className="text-sm font-bold text-black">{selectedPoForView.supplierName}</p>
                <p className="text-gray-700">Ghana Wholesale & Commercial Division</p>
              </div>
              <div>
                <h3 className="font-bold uppercase tracking-wider text-gray-600 text-[10px] mb-1">RECEIVING BAY / LOCATION:</h3>
                <p className="text-sm font-bold text-black">{branchName}</p>
                <p className="text-gray-700">Authorized Officer: {currentUser?.fullName || 'Procurement Officer'} ({currentUser?.role || 'Staff'})</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-6">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-[11px] font-bold uppercase">
                  <th className="p-2 border border-gray-300 text-center w-10">#</th>
                  <th className="p-2 border border-gray-300">Item Description</th>
                  <th className="p-2 border border-gray-300">SKU / Code</th>
                  <th className="p-2 border border-gray-300 text-center">Unit</th>
                  <th className="p-2 border border-gray-300 text-center">Order Qty</th>
                  <th className="p-2 border border-gray-300 text-right">Unit Cost (GHS)</th>
                  <th className="p-2 border border-gray-300 text-right">Line Total (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                {selectedPoForView.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border border-gray-300 text-center">{idx + 1}</td>
                    <td className="p-2 border border-gray-300 font-sans font-semibold">{item.productName}</td>
                    <td className="p-2 border border-gray-300">{item.sku}</td>
                    <td className="p-2 border border-gray-300 text-center">{item.unit}</td>
                    <td className="p-2 border border-gray-300 text-center font-bold">{item.recommendedOrder}</td>
                    <td className="p-2 border border-gray-300 text-right">{formatGhs(item.unitCost)}</td>
                    <td className="p-2 border border-gray-300 text-right font-bold">{formatGhs(item.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-black font-bold font-mono">
                  <td colSpan={6} className="p-2.5 text-right uppercase font-sans border border-gray-300">
                    Grand Total Payable (GHS):
                  </td>
                  <td className="p-2.5 text-right font-black text-sm border border-gray-300">
                    {formatGhs(selectedPoForView.totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Notes */}
            {selectedPoForView.notes && (
              <div className="mb-6 border border-gray-200 p-3 rounded text-xs bg-gray-50">
                <p className="font-bold text-gray-800 mb-0.5">PURCHASE ORDER NOTES:</p>
                <p className="text-gray-700">{selectedPoForView.notes}</p>
              </div>
            )}

            {/* Formal Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-black text-xs">
              <div className="border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold uppercase text-[11px]">1. PREPARED BY:</p>
                <p className="mt-1 font-semibold">{currentUser?.fullName || 'Store Manager'}</p>
                <p className="text-[10px] text-gray-500 mt-4">Signature: ______________________</p>
              </div>
              <div className="border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold uppercase text-[11px]">2. APPROVED BY:</p>
                <p className="mt-1 font-semibold">General Manager / Audit</p>
                <p className="text-[10px] text-gray-500 mt-4">Signature: ______________________</p>
              </div>
              <div className="border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold uppercase text-[11px]">3. RECEIVING BAY:</p>
                <p className="mt-1 font-semibold">Goods Inward & Quality</p>
                <p className="text-[10px] text-gray-500 mt-4">Seal & Stamp: ___________________</p>
              </div>
            </div>
          </div>
        </OfficialPrintPortal>
      )}

    </div>
  );
};
