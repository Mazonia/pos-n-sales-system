import React, { useState, useEffect } from 'react';
import { LocalProduct, LocalPurchaseOrder, db } from '../../utils/dexieSync';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import { notify } from '../../utils/notificationSystem';
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
      sku: 'SKU-RICE-50KG',
      quantity: 15,
      costValue: 6750,
      status: 'IN_TRANSIT',
      dispatchedAt: 'Today, 08:30 AM',
    },
    {
      id: 'TR-ACC-TKD-002',
      source: 'Accra Central Mall Store',
      dest: 'Takoradi Harbour Supermarket',
      item: 'Nestlé Milo Activ-Go Tin 400g',
      sku: 'SKU-MILO-400G',
      quantity: 48,
      costValue: 1200,
      status: 'RECEIVED',
      dispatchedAt: 'Yesterday, 02:15 PM',
    },
  ]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferForPrint, setSelectedTransferForPrint] = useState<any | null>(null);
  const [transferDest, setTransferDest] = useState('Kumasi Adum Branch');
  const [transferProduct, setTransferProduct] = useState(products[0]?.id || '');
  const [transferQty, setTransferQty] = useState(5);

  // Stock Adjustment & Dumsor Spoilage Log State
  const [adjProduct, setAdjProduct] = useState(products[0]?.id || '');
  const [adjReason, setAdjReason] = useState<'DUMSOR_DEFROST' | 'DAMAGED_TRANSIT' | 'EXPIRED_BATCH' | 'THEFT'>('DUMSOR_DEFROST');
  const [adjQuantity, setAdjQuantity] = useState(2);
  const [adjSuccessMsg, setAdjSuccessMsg] = useState('');
  const [showSpoilageCertificatePrint, setShowSpoilageCertificatePrint] = useState(false);
  const [selectedSpoilageForPrint, setSelectedSpoilageForPrint] = useState<any | null>(null);

  const [spoilageLogs, setSpoilageLogs] = useState<Array<{
    id: string;
    date: string;
    productName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalLoss: number;
    reason: string;
    authorizedBy: string;
  }>>([
    {
      id: 'SPOIL-ACC-001',
      date: 'Today, 06:45 AM',
      productName: 'Fresh Farm Whole Milk (1L)',
      quantity: 8,
      unit: 'BOTTLE',
      unitCost: 14.50,
      totalLoss: 116.00,
      reason: 'Dumsor (Cold-room power cut 14 hrs)',
      authorizedBy: 'Yaw Frimpong',
    },
    {
      id: 'SPOIL-ACC-002',
      date: 'Yesterday, 04:30 PM',
      productName: 'Ideal Evaporated Milk Tin 160g',
      quantity: 4,
      unit: 'TIN',
      unitCost: 8.50,
      totalLoss: 34.00,
      reason: 'In-Transit Freight Dent/Leakage',
      authorizedBy: 'Yaw Frimpong',
    }
  ]);

  const [inventoryToast, setInventoryToast] = useState<string | null>(null);
  const triggerInventoryToast = (msg: string) => {
    setInventoryToast(msg);
    setTimeout(() => setInventoryToast(null), 3500);
  };

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

  // FIFO Expiry Actions
  const handleApplyFifoMarkdown = async (product: LocalProduct) => {
    const discountedPrice = Math.round(product.retailPrice * 0.70 * 100) / 100;
    await db.products.update(product.id, { retailPrice: discountedPrice });

    await db.auditLogs.add({
      id: `audit-fifo-${Date.now()}`,
      action: 'FIFO_CLEARANCE_DISCOUNT',
      userId: currentUser.id,
      userName: currentUser.fullName,
      details: `Applied 30% FIFO clearance mark-down to near-expiry item: "${product.name}" (SKU: ${product.sku}). Price reduced from GH₵${product.retailPrice.toFixed(2)} to GH₵${discountedPrice.toFixed(2)}. Batch: ${product.batchNumber || 'N/A'}, Expiry: ${product.expiryDate || 'N/A'}.`,
      timestamp: new Date().toISOString(),
    });

    window.dispatchEvent(new CustomEvent('productsUpdated'));
    triggerInventoryToast(`Applied 30% FIFO clearance price (GH₵ ${discountedPrice.toFixed(2)}) to ${product.name}!`);
    onRefresh();
  };

  const handleRouteToSpoilage = (product: LocalProduct) => {
    setAdjProduct(product.id);
    setAdjReason('EXPIRED_BATCH');
    setAdjQuantity(Math.min(product.currentStock, 5) || 1);
    setActiveTab('ADJUSTMENTS');
  };

  const handleExecuteUomBreakdown = async () => {
    if (!selectedProductForUom) return;
    if (selectedProductForUom.currentStock < sacksToBreak) {
      notify.error('Insufficient Stock', `Available: ${selectedProductForUom.currentStock} ${selectedProductForUom.baseUnit}. Cannot break down ${sacksToBreak} units.`);
      return;
    }

    const newStock = selectedProductForUom.currentStock - sacksToBreak;
    await db.products.update(selectedProductForUom.id, { currentStock: newStock });

    await db.auditLogs.add({
      id: `audit-uom-${Date.now()}`,
      action: 'UOM_FRACTIONAL_BREAKDOWN',
      userId: currentUser.id,
      userName: currentUser.fullName,
      details: `Deconstructed ${sacksToBreak} bulk ${selectedProductForUom.baseUnit} of "${selectedProductForUom.name}" into loose shelf units. Previous stock: ${selectedProductForUom.currentStock}, Remaining bulk stock: ${newStock}. Performed by ${currentUser.fullName} (${currentUser.role}).`,
      timestamp: new Date().toISOString(),
    });

    window.dispatchEvent(new CustomEvent('productsUpdated'));
    notify.success('UOM Breakdown Completed', `Deconstructed ${sacksToBreak} ${selectedProductForUom.baseUnit} of ${selectedProductForUom.name} into loose shelf inventory.`);
    onRefresh();
  };

  const handleExecuteAdjustment = async () => {
    const prod = products.find(p => p.id === adjProduct);
    if (!prod) return;

    if (prod.currentStock < adjQuantity) {
      notify.error('Adjustment Exceeds Stock', `Cannot write off ${adjQuantity} ${prod.baseUnit}. Current inventory is only ${prod.currentStock} ${prod.baseUnit}.`);
      return;
    }

    const lossValue = Math.round(adjQuantity * prod.costPrice * 100) / 100;
    const newStock = Math.max(0, prod.currentStock - adjQuantity);
    await db.products.update(prod.id, { currentStock: newStock });

    const reasonLabelMap: Record<string, string> = {
      DUMSOR_DEFROST: 'Dumsor (Cold-Store Power Outage / Defrost Spoilage)',
      DAMAGED_TRANSIT: 'In-Transit Freight Damage / Broken Packaging',
      EXPIRED_BATCH: 'Expired Batch Date (FIFO Sentinel)',
      THEFT: 'Inventory Discrepancy / Unaccounted Shrinkage',
    };

    const reasonLabel = reasonLabelMap[adjReason] || adjReason;

    const newLog = {
      id: `SPOIL-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' }),
      productName: prod.name,
      quantity: adjQuantity,
      unit: prod.baseUnit,
      unitCost: prod.costPrice,
      totalLoss: lossValue,
      reason: reasonLabel,
      authorizedBy: currentUser.fullName,
    };

    setSpoilageLogs(prev => [newLog, ...prev]);

    await db.auditLogs.add({
      id: `audit-${Date.now()}`,
      action: 'STOCK_ADJUSTMENT_WRITE_OFF',
      userId: currentUser.id,
      userName: currentUser.fullName,
      details: `STOCK LOSS WRITE-OFF: ${adjQuantity} ${prod.baseUnit} of "${prod.name}" (SKU: ${prod.sku}). Reason: "${reasonLabel}". Total Financial Loss: GH₵ ${lossValue.toFixed(2)}. Authorized by ${currentUser.fullName} (${currentUser.role}).`,
      timestamp: new Date().toISOString(),
    });

    window.dispatchEvent(new CustomEvent('productsUpdated'));
    notify.warning('Spoilage Loss Recorded', `Written off ${adjQuantity} ${prod.baseUnit} of ${prod.name} (Loss: ${formatGhs(lossValue)}). Logged to GRA audit registry.`);
    onRefresh();
  };

  const handleCreateTransfer = async () => {
    const prod = products.find(p => p.id === transferProduct);
    if (!prod) return;

    if (prod.currentStock < transferQty) {
      notify.error('Insufficient Stock for Transfer', `Cannot transfer ${transferQty} units. Only ${prod.currentStock} ${prod.baseUnit} available in origin warehouse.`);
      return;
    }

    // Deduct stock from origin branch
    const updatedStock = prod.currentStock - transferQty;
    await db.products.update(prod.id, { currentStock: updatedStock });

    const newTr = {
      id: `TR-${branchName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      source: branchName,
      dest: transferDest,
      item: prod.name,
      sku: prod.sku,
      unit: prod.baseUnit,
      quantity: transferQty,
      costValue: Math.round(transferQty * prod.costPrice * 100) / 100,
      status: 'IN_TRANSIT',
      dispatchedAt: 'Just now',
    };

    setTransfers(prev => [newTr, ...prev]);

    await db.auditLogs.add({
      id: `audit-tr-${Date.now()}`,
      action: 'BRANCH_STOCK_DISPATCH',
      userId: currentUser.id,
      userName: currentUser.fullName,
      details: `Dispatched ${transferQty} ${prod.baseUnit} of "${prod.name}" from ${branchName} to ${transferDest}. Manifest: ${newTr.id}. Stock adjusted from ${prod.currentStock} to ${updatedStock}.`,
      timestamp: new Date().toISOString(),
    });

    window.dispatchEvent(new CustomEvent('productsUpdated'));
    triggerInventoryToast(`Transfer ${newTr.id} dispatched! Stock updated: ${updatedStock} ${prod.baseUnit} remaining.`);
    setShowTransferModal(false);
    onRefresh();
  };

  const handleConfirmTransferReceived = async (transferId: string) => {
    const target = transfers.find(t => t.id === transferId);
    setTransfers(prev =>
      prev.map(t => (t.id === transferId ? { ...t, status: 'RECEIVED' } : t))
    );

    if (target) {
      await db.auditLogs.add({
        id: `audit-tr-rec-${Date.now()}`,
        action: 'BRANCH_TRANSFER_RECEIVED',
        userId: currentUser.id,
        userName: currentUser.fullName,
        details: `Confirmed delivery of Transfer Manifest ${transferId} (${target.quantity} ${target.item}) at destination ${target.dest}. Verified by ${currentUser.fullName}.`,
        timestamp: new Date().toISOString(),
      });
      triggerInventoryToast(`Transfer ${transferId} verified as received at ${target.dest}!`);
    }
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
                                <span className="text-[10px] text-slate-500 dark:text-stone-400 font-mono block">
                                  {prod.sku} · Barcode: {prod.barcode}
                                  {prod.localName && <span className="ml-1 text-[#008285] dark:text-[#00CED1] font-serif font-medium">({prod.localName})</span>}
                                </span>
                                {prod.uomOptions && prod.uomOptions.length > 1 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-[#008285]/10 text-[#008285] dark:text-[#00CED1] border border-[#008285]/20 max-w-xs truncate" title={prod.uomOptions.map(u => `${u.name} (GH₵${u.price.toFixed(2)})`).join(', ')}>
                                      <Boxes className="w-2.5 h-2.5 shrink-0" />
                                      <span>{prod.uomOptions.length} Packaging Types ({prod.uomOptions.map(u => u.name).join(', ')})</span>
                                    </span>
                                  </div>
                                )}
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
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApplyFifoMarkdown(prod)}
                                  className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] transition active:scale-95 cursor-pointer shadow-xs"
                                  title={`Apply 30% FIFO clearance markdown from GH₵ ${prod.retailPrice.toFixed(2)} to GH₵ ${(prod.retailPrice * 0.7).toFixed(2)}`}
                                >
                                  -30% Clearance
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRouteToSpoilage(prod)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition active:scale-95 cursor-pointer shadow-xs"
                                  title="Route to Dumsor & Spoilage loss write-off"
                                >
                                  Write-Off
                                </button>
                              </div>
                            ) : days < 90 ? (
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApplyFifoMarkdown(prod)}
                                  className="px-2 py-1 rounded-lg border border-amber-400 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-[10px] transition cursor-pointer"
                                  title="Apply 30% markdown to accelerate sales before critical expiry"
                                >
                                  Clearance -30%
                                </button>
                                <span className="text-[10px] text-amber-600 dark:text-[#FF5722] font-semibold font-mono">Front-Row</span>
                              </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTransferForPrint(tr)}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-bold font-serif transition flex items-center gap-1 cursor-pointer ${
                              isDark ? 'border-[#282B34] text-stone-300 hover:text-[#00CED1] hover:border-[#00CED1]' : 'border-slate-300 text-slate-700 hover:border-[#008285] hover:text-[#008285]'
                            }`}
                            title="Print official dispatch waybill voucher"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Waybill</span>
                          </button>
                          {tr.status === 'IN_TRANSIT' ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmTransferReceived(tr.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-serif rounded-lg text-[10px] transition cursor-pointer active:scale-95"
                            >
                              Confirm Delivery
                            </button>
                          ) : (
                            <span className="text-[#008285] dark:text-emerald-500 text-[10px] font-bold flex items-center gap-1 font-serif">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
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

            {/* SPOILAGE & DUMSOR LOSS ANALYTICS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'}`}>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-stone-400 font-serif block mb-1">
                  Cumulative Financial Loss
                </span>
                <div className="text-xl font-black font-mono tabular-nums text-rose-600 dark:text-rose-400">
                  {formatGhs(spoilageLogs.reduce((acc, log) => acc + log.totalLoss, 0))}
                </div>
                <span className="text-[10px] text-slate-500 font-serif">Logged loss value at cost price</span>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'}`}>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-stone-400 font-serif block mb-1">
                  Dumsor & Power Cut Losses
                </span>
                <div className="text-xl font-black font-mono tabular-nums text-[#FF4500]">
                  {spoilageLogs.filter(l => l.reason.toLowerCase().includes('dumsor')).length} Incidents
                </div>
                <span className="text-[10px] text-slate-500 font-serif">Cold-room defrost & freezer failure</span>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'}`}>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-stone-400 font-serif block mb-1">
                  Total Write-Off Records
                </span>
                <div className="text-xl font-black font-mono tabular-nums text-[#008285] dark:text-[#00CED1]">
                  {spoilageLogs.length} Certified
                </div>
                <span className="text-[10px] text-slate-500 font-serif">GRA-audit compliant write-offs</span>
              </div>
            </div>

            {/* SPOILAGE WRITE-OFF AUDIT TABLE */}
            <div className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-300 shadow-xs'
            }`}>
              <div className={`p-3.5 border-b flex items-center justify-between ${
                isDark ? 'border-[#282B34] bg-white/[0.02]' : 'border-slate-300 bg-slate-50'
              }`}>
                <h4 className={`font-serif font-bold text-xs ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
                  Official Spoilage & Damaged Goods Register
                </h4>
                <span className="text-[10px] text-slate-500 font-serif">Official audit documentation for insurance & GRA tax deductions</span>
              </div>

              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className={`uppercase tracking-wider text-[11px] font-serif font-bold border-b ${
                  isDark ? 'bg-white/[0.02] text-stone-400 border-[#282B34]' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <tr>
                    <th className="p-3.5">Voucher ID & Date</th>
                    <th className="p-3.5">Product & Quantity</th>
                    <th className="p-3.5 text-right">Unit Cost</th>
                    <th className="p-3.5 text-right">Loss Amount (GHS)</th>
                    <th className="p-3.5">Incident Cause</th>
                    <th className="p-3.5">Authorized By</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#282B34]">
                  {spoilageLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400 block">{log.id}</span>
                        <span className="text-[10px] text-slate-500 font-serif">{log.date}</span>
                      </td>
                      <td className="p-3.5 font-serif">
                        <span className="font-semibold text-slate-900 dark:text-stone-100 block">{log.productName}</span>
                        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                          Written off: {log.quantity} {log.unit}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-stone-300">
                        {formatGhs(log.unitCost)}
                      </td>
                      <td className="p-3.5 text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                        {formatGhs(log.totalLoss)}
                      </td>
                      <td className="p-3.5 font-serif">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${
                          log.reason.toLowerCase().includes('dumsor')
                            ? 'bg-[#FF4500]/15 text-[#FF5722] border border-[#FF4500]/30 font-bold'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-stone-300'
                        }`}>
                          {log.reason}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs font-serif text-slate-600 dark:text-stone-400">
                        {log.authorizedBy}
                      </td>
                      <td className="p-3.5 text-right font-serif">
                        <button
                          type="button"
                          onClick={() => setSelectedSpoilageForPrint(log)}
                          className={`px-2.5 py-1 rounded-xl border text-[11px] font-serif transition inline-flex items-center gap-1 cursor-pointer ${
                            isDark
                              ? 'border-[#282B34] text-stone-300 hover:text-[#00CED1] hover:border-[#00CED1]'
                              : 'border-slate-300 text-slate-700 hover:border-[#008285] hover:text-[#008285]'
                          }`}
                          title="Print official GRA write-off certificate"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Certificate</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* VIEW & PRINT WAYBILL MODAL */}
      {selectedTransferForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 no-print">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-5 space-y-4 ${
            isDark ? 'bg-[#16181F] border-[#282B34] text-stone-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-300 dark:border-[#282B34]">
              <div>
                <h3 className="font-serif font-extrabold text-base flex items-center gap-2">
                  <span>Inter-Branch Dispatch Waybill</span>
                  <span className="font-mono text-[#008285] dark:text-[#00CED1]">{selectedTransferForPrint.id}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-stone-400 font-serif">
                  Origin: {selectedTransferForPrint.source} ➔ Destination: {selectedTransferForPrint.dest}
                </p>
              </div>
              <button
                onClick={() => setSelectedTransferForPrint(null)}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-[#282B34] hover:border-[#FF4500] hover:text-[#FF4500] transition cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-[#282B34] space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 dark:text-stone-400 block font-serif">Dispatched Item:</span>
                  <strong className="font-serif text-slate-900 dark:text-stone-100">{selectedTransferForPrint.item}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-stone-400 block font-serif">SKU Code:</span>
                  <code className="font-mono">{selectedTransferForPrint.sku}</code>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-stone-400 block font-serif">Quantity Dispatched:</span>
                  <strong className="font-mono text-sm">{selectedTransferForPrint.quantity} units</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-stone-400 block font-serif">Transfer Cost Valuation:</span>
                  <strong className="font-mono text-sm text-[#008285] dark:text-[#00CED1]">{formatGhs(selectedTransferForPrint.costValue)}</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t flex items-center justify-between border-slate-300 dark:border-[#282B34]">
              <span className="text-xs text-slate-500 font-serif">Status: {selectedTransferForPrint.status}</span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#008285] hover:bg-[#007073] dark:bg-[#00CED1] dark:hover:bg-[#00B4B7] text-white dark:text-slate-950 font-bold font-serif rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Waybill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE DISPATCH WAYBILL SHEET */}
      {selectedTransferForPrint && (
        <OfficialPrintPortal active={true}>
          <div className="official-printable-doc text-black bg-white p-8 font-sans max-w-4xl mx-auto">
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-black">
                  AKWAABA RETAIL SYSTEMS & LOGISTICS
                </h1>
                <p className="text-xs text-gray-700 font-medium">Inter-Branch Cargo & Warehouse Distribution</p>
                <p className="text-xs text-gray-700 font-mono font-bold">GRA TIN: C0029482190 | WAYBILL CLEARANCE</p>
              </div>
              <div className="text-right">
                <div className="inline-block border-2 border-black px-4 py-1.5 text-center bg-gray-50">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-gray-600">OFFICIAL WAYBILL</span>
                  <span className="text-sm font-black text-black">DISPATCH MANIFEST</span>
                </div>
                <div className="mt-2 text-xs font-mono">
                  <p><strong>Manifest No:</strong> {selectedTransferForPrint.id}</p>
                  <p><strong>Dispatch Time:</strong> {selectedTransferForPrint.dispatchedAt}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6 text-xs border border-gray-300 p-4 rounded bg-gray-50/50">
              <div>
                <h3 className="font-bold uppercase tracking-wider text-gray-600 text-[10px] mb-1">ORIGIN WAREHOUSE / DEPOT:</h3>
                <p className="text-sm font-bold text-black">{selectedTransferForPrint.source}</p>
                <p className="text-gray-700">Dispatch Officer: {currentUser?.fullName} ({currentUser?.role})</p>
              </div>
              <div>
                <h3 className="font-bold uppercase tracking-wider text-gray-600 text-[10px] mb-1">DESTINATION BRANCH:</h3>
                <p className="text-sm font-bold text-black">{selectedTransferForPrint.dest}</p>
                <p className="text-gray-700">Receiving Bay: Inward Goods Inspection Bay</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-6">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-[11px] font-bold uppercase">
                  <th className="p-2 border border-gray-300 text-center w-10">#</th>
                  <th className="p-2 border border-gray-300">Item Description</th>
                  <th className="p-2 border border-gray-300">SKU / Code</th>
                  <th className="p-2 border border-gray-300 text-center">Dispatched Qty</th>
                  <th className="p-2 border border-gray-300 text-right">Valuation (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                <tr>
                  <td className="p-2 border border-gray-300 text-center">1</td>
                  <td className="p-2 border border-gray-300 font-sans font-semibold">{selectedTransferForPrint.item}</td>
                  <td className="p-2 border border-gray-300">{selectedTransferForPrint.sku}</td>
                  <td className="p-2 border border-gray-300 text-center font-bold text-sm">{selectedTransferForPrint.quantity}</td>
                  <td className="p-2 border border-gray-300 text-right font-bold">{formatGhs(selectedTransferForPrint.costValue)}</td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-black text-xs">
              <div className="border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold uppercase text-[11px]">1. DISPATCHED BY:</p>
                <p className="mt-1 font-semibold">{currentUser?.fullName || 'Storekeeper'}</p>
                <p className="text-[10px] text-gray-500 mt-4">Signature: ______________________</p>
              </div>
              <div className="border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold uppercase text-[11px]">2. TRANSPORTER / DRIVER:</p>
                <p className="mt-1 font-semibold">Logistics Courier Hauler</p>
                <p className="text-[10px] text-gray-500 mt-4">Driver Sig & Reg: _______________</p>
              </div>
              <div className="border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold uppercase text-[11px]">3. RECEIVED AT DESTINATION:</p>
                <p className="mt-1 font-semibold">{selectedTransferForPrint.dest}</p>
                <p className="text-[10px] text-gray-500 mt-4">Received Stamp: _________________</p>
              </div>
            </div>
          </div>
        </OfficialPrintPortal>
      )}

      {/* VIEW & PRINT SPOILAGE CERTIFICATE MODAL */}
      {selectedSpoilageForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 no-print">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-5 space-y-4 ${
            isDark ? 'bg-[#16181F] border-[#282B34] text-stone-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-300 dark:border-[#282B34]">
              <div>
                <h3 className="font-serif font-extrabold text-base flex items-center gap-2">
                  <span>Stock Loss & Spoilage Certificate</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">{selectedSpoilageForPrint.id}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-stone-400 font-serif">
                  Cause: {selectedSpoilageForPrint.reason}
                </p>
              </div>
              <button
                onClick={() => setSelectedSpoilageForPrint(null)}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-[#282B34] hover:border-[#FF4500] hover:text-[#FF4500] transition cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-[#282B34] space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 dark:text-stone-400 block font-serif">Damaged / Spoiled Item:</span>
                  <strong className="font-serif text-slate-900 dark:text-stone-100">{selectedSpoilageForPrint.productName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-stone-400 block font-serif">Authorized Officer:</span>
                  <strong className="font-serif">{selectedSpoilageForPrint.authorizedBy}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-stone-400 block font-serif">Written-Off Quantity:</span>
                  <strong className="font-mono text-sm">{selectedSpoilageForPrint.quantity} {selectedSpoilageForPrint.unit}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-stone-400 block font-serif">Financial Cost Loss:</span>
                  <strong className="font-mono text-sm text-rose-600 dark:text-rose-400">{formatGhs(selectedSpoilageForPrint.totalLoss)}</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t flex items-center justify-between border-slate-300 dark:border-[#282B34]">
              <span className="text-xs text-slate-500 font-serif">Date: {selectedSpoilageForPrint.date}</span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold font-serif rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Spoilage Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE OFFICIAL SPOILAGE CERTIFICATE */}
      {selectedSpoilageForPrint && (
        <OfficialPrintPortal active={true}>
          <div className="official-printable-doc text-black bg-white p-8 font-sans max-w-4xl mx-auto">
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-black">
                  AKWAABA RETAIL SYSTEMS & WHOLESALE LTD.
                </h1>
                <p className="text-xs text-gray-700 font-medium">Quality Assurance, Defrost & Loss Prevention Division</p>
                <p className="text-xs text-gray-700 font-mono font-bold">GRA AUDIT COMPLIANCE: PERISHABLE WRITE-OFF</p>
              </div>
              <div className="text-right">
                <div className="inline-block border-2 border-black px-4 py-1.5 text-center bg-gray-50">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-gray-600">GRA TAX AUDIT PROOF</span>
                  <span className="text-sm font-black text-rose-600">SPOILAGE CERTIFICATE</span>
                </div>
                <div className="mt-2 text-xs font-mono">
                  <p><strong>Voucher No:</strong> {selectedSpoilageForPrint.id}</p>
                  <p><strong>Incident Date:</strong> {selectedSpoilageForPrint.date}</p>
                  <p><strong>Branch Node:</strong> {branchName}</p>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 border border-rose-300 bg-rose-50/40 rounded text-xs">
              <h3 className="font-bold uppercase tracking-wider text-rose-800 text-[10px] mb-1">INCIDENT CLASSIFICATION & ROOT CAUSE:</h3>
              <p className="text-sm font-bold text-black">{selectedSpoilageForPrint.reason}</p>
              <p className="text-gray-700 mt-1">
                Notice: This stock has been certified as commercially unviable and destroyed/disposed in accordance with public health and Ghana Food & Drugs Authority (FDA) regulations.
              </p>
            </div>

            <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-6">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-[11px] font-bold uppercase">
                  <th className="p-2 border border-gray-300 text-center w-10">#</th>
                  <th className="p-2 border border-gray-300">Spoiled / Damaged Product</th>
                  <th className="p-2 border border-gray-300 text-center">Unit</th>
                  <th className="p-2 border border-gray-300 text-center">Loss Qty</th>
                  <th className="p-2 border border-gray-300 text-right">Cost Price (GHS)</th>
                  <th className="p-2 border border-gray-300 text-right">Total Financial Loss (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                <tr>
                  <td className="p-2 border border-gray-300 text-center">1</td>
                  <td className="p-2 border border-gray-300 font-sans font-semibold">{selectedSpoilageForPrint.productName}</td>
                  <td className="p-2 border border-gray-300 text-center">{selectedSpoilageForPrint.unit}</td>
                  <td className="p-2 border border-gray-300 text-center font-bold">{selectedSpoilageForPrint.quantity}</td>
                  <td className="p-2 border border-gray-300 text-right">{formatGhs(selectedSpoilageForPrint.unitCost)}</td>
                  <td className="p-2 border border-gray-300 text-right font-black text-rose-600">{formatGhs(selectedSpoilageForPrint.totalLoss)}</td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-black text-xs">
              <div className="border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold uppercase text-[11px]">1. INSPECTED BY:</p>
                <p className="mt-1 font-semibold">{selectedSpoilageForPrint.authorizedBy}</p>
                <p className="text-[10px] text-gray-500 mt-4">Signature: ______________________</p>
              </div>
              <div className="border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold uppercase text-[11px]">2. STORE MANAGER:</p>
                <p className="mt-1 font-semibold">Store Manager / Keyholder</p>
                <p className="text-[10px] text-gray-500 mt-4">Signature: ______________________</p>
              </div>
              <div className="border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold uppercase text-[11px]">3. AUDIT & GRA COMPLIANCE:</p>
                <p className="mt-1 font-semibold">Internal Audit Department</p>
                <p className="text-[10px] text-gray-500 mt-4">Official Stamp: _________________</p>
              </div>
            </div>
          </div>
        </OfficialPrintPortal>
      )}

      {/* FLOATING INVENTORY TOAST */}
      {inventoryToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#008285] text-white font-serif font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{inventoryToast}</span>
        </div>
      )}

    </div>
  );
};
