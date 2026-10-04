import React, { useState } from 'react';
import { 
  Store, 
  Zap, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  Flame, 
  Boxes, 
  CreditCard, 
  Receipt, 
  Printer, 
  Scale, 
  Github, 
  ChevronRight, 
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  Layers,
  Database,
  Lock,
  ExternalLink,
  Plus,
  Minus,
  Trash2,
  Tag,
  AlertTriangle,
  QrCode,
  Check,
  RotateCw,
  Sliders,
  DollarSign,
  Eye,
  Maximize2,
  FileText,
  UserCheck,
  Send,
  HelpCircle,
  Truck
} from 'lucide-react';
import { formatGhs, roundToPesewas, TaxSchemeType } from '../../utils/ghanaTaxEngine';

interface ProductLandingPageProps {
  onLaunchPos: () => void;
  onOpenDownloads: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

interface DemoProduct {
  id: string;
  name: string;
  category: string;
  retailPrice: number;
  wholesalePrice: number;
  uom: string;
  stock: number;
  tag: string;
  expiryDays: number;
}

export const ProductLandingPage: React.FC<ProductLandingPageProps> = ({
  onLaunchPos,
  onOpenDownloads,
  isDark,
  onToggleTheme,
}) => {
  // Device Simulation Mode: 'DESKTOP' | 'TABLET_LANDSCAPE' | 'TABLET_PORTRAIT' | 'RECEIPT'
  const [deviceFrame, setDeviceFrame] = useState<'DESKTOP' | 'TABLET_LANDSCAPE' | 'TABLET_PORTRAIT' | 'RECEIPT'>('DESKTOP');

  // Active Module in Device Simulator: 'TILL' | 'FIFO' | 'DUMSOR' | 'UOM' | 'DEBT'
  const [activeModule, setActiveModule] = useState<'TILL' | 'FIFO' | 'DUMSOR' | 'UOM' | 'DEBT'>('TILL');

  // Interactive Live POS Simulation State
  const [orderMode, setOrderMode] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [taxScheme, setTaxScheme] = useState<TaxSchemeType>('STANDARD_VAT');
  const [discountApplied, setDiscountApplied] = useState(false);

  // Spoilage Module Interactive State
  const [outageHours, setOutageHours] = useState(6);
  const [freezerTemp, setFreezerTemp] = useState(4.2);
  const [spoilageCertified, setSpoilageCertified] = useState(false);

  // UOM Breakdown Interactive State
  const [sacksToBreak, setSacksToBreak] = useState(1);

  // MoMo Tender Modal Simulation State
  const [showMomoModal, setShowMomoModal] = useState(false);
  const [momoNetwork, setMomoNetwork] = useState<'MTN' | 'TELECEL' | 'AT'>('MTN');
  const [momoRef, setMomoRef] = useState('MM-9482-GH');
  const [momoConfirmed, setMomoConfirmed] = useState(false);

  // Photo Gallery Modal Preview
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<{
    title: string;
    caption: string;
    moduleKey: 'TILL' | 'FIFO' | 'DUMSOR' | 'UOM' | 'DEBT';
    tags: string[];
  } | null>(null);

  const [cart, setCart] = useState<{ product: DemoProduct; quantity: number }[]>([
    {
      product: {
        id: 'p1',
        name: 'Royal Feast Perfumed Rice 50kg',
        category: 'Grains & Bulk',
        retailPrice: 920.00,
        wholesalePrice: 875.00,
        uom: '50kg Sack',
        stock: 38,
        tag: 'Bulk Provision',
        expiryDays: 140,
      },
      quantity: 1,
    },
    {
      product: {
        id: 'p2',
        name: 'Frytol Pure Vegetable Oil 5L',
        category: 'Cooking Oils',
        retailPrice: 185.00,
        wholesalePrice: 172.00,
        uom: '5L Gallon',
        stock: 64,
        tag: 'Fast Mover',
        expiryDays: 85,
      },
      quantity: 2,
    },
  ]);

  // Dumsor Power Cut Simulation State
  const [dumsorActive, setDumsorActive] = useState(false);
  const [dumsorRestored, setDumsorRestored] = useState(false);

  // Sample Products for Live Interactive Click-to-Add & FIFO
  const demoProducts: DemoProduct[] = [
    {
      id: 'p1',
      name: 'Royal Feast Perfumed Rice 50kg',
      category: 'Grains & Bulk',
      retailPrice: 920.00,
      wholesalePrice: 875.00,
      uom: '50kg Sack',
      stock: 38,
      tag: 'Bulk Provision',
      expiryDays: 140,
    },
    {
      id: 'p2',
      name: 'Frytol Pure Vegetable Oil 5L',
      category: 'Cooking Oils',
      retailPrice: 185.00,
      wholesalePrice: 172.00,
      uom: '5L Gallon',
      stock: 64,
      tag: 'Fast Mover',
      expiryDays: 85,
    },
    {
      id: 'p3',
      name: 'Gino Tomato Paste 2.2kg',
      category: 'Canned Goods',
      retailPrice: 78.50,
      wholesalePrice: 72.00,
      uom: 'Tin',
      stock: 120,
      tag: 'High Velocity',
      expiryDays: 22,
    },
    {
      id: 'p4',
      name: 'Royal Feast Rice (1 Olonka)',
      category: 'Grains & Bulk',
      retailPrice: 55.00,
      wholesalePrice: 50.00,
      uom: 'Loose Olonka',
      stock: 190,
      tag: 'Deconstructed',
      expiryDays: 120,
    },
    {
      id: 'p5',
      name: 'Ideal Evaporated Milk 160g',
      category: 'Dairy & Canned',
      retailPrice: 8.50,
      wholesalePrice: 7.80,
      uom: 'Can',
      stock: 240,
      tag: 'Critical Shelf',
      expiryDays: 14,
    },
    {
      id: 'p6',
      name: 'Cowbell Instant Milk Powder 400g',
      category: 'Beverages',
      retailPrice: 24.00,
      wholesalePrice: 21.50,
      uom: 'Pouch',
      stock: 85,
      tag: 'Breakfast',
      expiryDays: 62,
    },
  ];

  // Cart Operations
  const handleAddToCart = (prod: DemoProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
  };

  const handleUpdateQty = (prodId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === prodId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: DemoProduct; quantity: number }[]
    );
  };

  // Live Financial Math Calculations
  const rawSubtotal = cart.reduce((sum, item) => {
    const basePrice = orderMode === 'WHOLESALE' ? item.product.wholesalePrice : item.product.retailPrice;
    const finalPrice = discountApplied ? basePrice * 0.70 : basePrice;
    return sum + finalPrice * item.quantity;
  }, 0);

  const subtotal = roundToPesewas(rawSubtotal);

  // GRA Compound Tax Formulas
  let nhil = 0;
  let getfund = 0;
  let covid = 0;
  let vat = 0;
  let totalTax = 0;
  let grandTotal = subtotal;

  if (taxScheme === 'STANDARD_VAT') {
    nhil = roundToPesewas(subtotal * 0.025);
    getfund = roundToPesewas(subtotal * 0.025);
    covid = roundToPesewas(subtotal * 0.010);
    const compoundVatBase = subtotal + nhil + getfund + covid;
    vat = roundToPesewas(compoundVatBase * 0.15);
    totalTax = roundToPesewas(nhil + getfund + covid + vat);
    grandTotal = roundToPesewas(subtotal + totalTax);
  } else if (taxScheme === 'FLAT_RATE_VFRS') {
    covid = roundToPesewas(subtotal * 0.010);
    vat = roundToPesewas(subtotal * 0.030);
    totalTax = roundToPesewas(covid + vat);
    grandTotal = roundToPesewas(subtotal + totalTax);
  }

  // Trigger Dumsor Simulator
  const handleSimulateDumsor = () => {
    setDumsorActive(true);
    setDumsorRestored(false);
    setTimeout(() => {
      setDumsorActive(false);
      setDumsorRestored(true);
      setTimeout(() => setDumsorRestored(false), 5000);
    }, 1800);
  };

  // Switch Simulator Module
  const handleSwitchModule = (mod: 'TILL' | 'FIFO' | 'DUMSOR' | 'UOM' | 'DEBT') => {
    setActiveModule(mod);
    if (mod === 'TILL' && deviceFrame === 'RECEIPT') {
      setDeviceFrame('DESKTOP');
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-200 ${
      isDark ? 'bg-[#121316] text-[#F4F4F6]' : 'bg-[#EBEEF2] text-[#0F172A]'
    }`}>
      
      {/* ═══ TOP NAVBAR ═══ */}
      <header className={`sticky top-0 z-50 h-16 border-b flex items-center justify-between px-4 sm:px-8 backdrop-blur-md transition-colors ${
        isDark ? 'border-[#282B34] bg-[#16181F]/90' : 'border-[#CBD5E1] bg-white/90 shadow-2xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5722] via-[#FF4500] to-[#E03E00] text-white flex items-center justify-center font-black text-sm shadow-md shadow-[#FF4500]/25">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight">AKWAABA</span>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase bg-[#FF4500]/15 text-[#FF4500] dark:text-[#FF5722] border border-[#FF4500]/25">
                RETAIL OS
              </span>
            </div>
            <span className={`text-[10px] block ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
              Engineered by <strong className="text-[#FF4500]">Mazonia</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark 
                ? 'border-[#282B34] text-[#9CA3AF] hover:text-white hover:bg-[#1A1C22]' 
                : 'border-[#CBD5E1] text-[#334155] hover:text-black hover:bg-slate-100'
            }`}
            title="Toggle Light / Dark Mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <a
            href="https://github.com/Mazonia/pos-n-sales-system/issues"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              isDark 
                ? 'border-[#282B34] text-[#9CA3AF] hover:text-white hover:bg-[#1A1C22]' 
                : 'border-[#CBD5E1] text-[#334155] hover:text-black hover:bg-slate-100'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Support</span>
          </a>

          <button
            type="button"
            onClick={onLaunchPos}
            className="px-4 py-2 rounded-xl font-bold text-xs bg-[#FF4500] hover:bg-[#E03E00] text-white flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-[#FF4500]/25 cursor-pointer"
          >
            <span>Launch POS Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative px-4 sm:px-8 pt-10 pb-8 max-w-6xl mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-5 text-xs font-semibold backdrop-blur-sm border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500] dark:text-[#FF5722]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Ghanaian Retail OS • Engineered by Mazonia</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.15]">
          Experience the POS Built for <span className="text-[#FF4500]">African Commerce</span>
        </h1>

        <p className={`mt-3.5 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
          isDark ? 'text-[#9CA3AF]' : 'text-[#475569]'
        }`}>
          Dumsor power-outage resilient, statutory GRA VSDC compliant, and optimized for high-volume cash and Mobile Money checkout. Test the software live below on any device or workstation.
        </p>

        {/* Action Buttons */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={onLaunchPos}
            className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-[#FF4500] hover:bg-[#E03E00] text-white flex items-center gap-2 transition active:scale-95 shadow-xl shadow-[#FF4500]/25 cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <span>Open Web Terminal</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <a
            href="https://github.com/Mazonia/pos-n-sales-system/releases/download/v1.0.0/Akwaaba.POS.Retail.OS.Setup.1.0.0.exe"
            className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white flex items-center gap-2 transition active:scale-95 shadow-xl shadow-cyan-600/25 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Windows .exe (Direct)</span>
          </a>

          <a
            href="https://github.com/Mazonia/pos-n-sales-system/releases/tag/v1.0.0"
            target="_blank"
            rel="noopener noreferrer"
            className={`px-5 py-3.5 rounded-2xl font-bold text-sm border flex items-center gap-2 transition active:scale-95 cursor-pointer ${
              isDark 
                ? 'border-[#282B34] bg-[#1A1C22] text-[#F4F4F6] hover:bg-[#22252E]' 
                : 'border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-slate-50 shadow-xs'
            }`}
          >
            <Layers className="w-4 h-4 text-[#FF4500]" />
            <span>All Releases &amp; APKs</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
          </a>
        </div>
      </section>

      {/* ═══ INTERACTIVE MULTI-DEVICE & MODULE SIMULATOR ═══ */}
      <section className="px-4 sm:px-8 pb-14 max-w-6xl mx-auto w-full">
        
        {/* Device Mode Switcher Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase text-[#FF4500]">Live Interactive Playground</span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Test the Software on Any Device</h2>
          </div>

          {/* Device Tabs */}
          <div className={`flex items-center p-1 rounded-2xl border ${
            isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1] shadow-2xs'
          }`}>
            {[
              { id: 'DESKTOP', label: 'PC Desktop', icon: Laptop },
              { id: 'TABLET_LANDSCAPE', label: 'iPad Landscape', icon: Tablet },
              { id: 'TABLET_PORTRAIT', label: 'Tablet Portrait', icon: Smartphone },
              { id: 'RECEIPT', label: '80mm Fiscal Slip', icon: Receipt },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = deviceFrame === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDeviceFrame(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? 'bg-[#FF4500] text-white shadow-xs'
                      : isDark
                      ? 'text-[#9CA3AF] hover:text-white'
                      : 'text-[#64748B] hover:text-black'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Module Sub-Tabs (Switch capability within the simulator) */}
        {deviceFrame !== 'RECEIPT' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 text-xs">
            <span className="text-[11px] font-bold text-[#9CA3AF] shrink-0">Simulate Module:</span>
            {[
              { id: 'TILL', label: '🛒 Till & MoMo Checkout', desc: 'Real cashier sales' },
              { id: 'FIFO', label: '⏳ FIFO Expiry Sentinel', desc: 'Shelf life & markdowns' },
              { id: 'DUMSOR', label: '⚡ Dumsor Defrost Audit', desc: 'Cold store outage certificates' },
              { id: 'UOM', label: '📦 Bulk Sack Breakdown', desc: 'Deconstruct 50kg to Olonkas' },
              { id: 'DEBT', label: '📒 Bisa Customer Credit', desc: 'Debt ledger & SMS prompts' },
            ].map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleSwitchModule(mod.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer border ${
                  activeModule === mod.id
                    ? 'bg-[#FF4500]/15 border-[#FF4500] text-[#FF4500] dark:text-[#FF5722]'
                    : isDark
                    ? 'border-[#282B34] bg-[#16181F] text-[#9CA3AF] hover:text-white'
                    : 'border-[#CBD5E1] bg-white text-[#475569] hover:text-black'
                }`}
              >
                {mod.label}
              </button>
            ))}
          </div>
        )}

        {/* ═══ SIMULATED DEVICE SHELL CONTAINER ═══ */}
        <div className={`relative mx-auto rounded-3xl border shadow-2xl transition-all duration-300 overflow-hidden ${
          deviceFrame === 'DESKTOP'
            ? 'w-full max-w-5xl'
            : deviceFrame === 'TABLET_LANDSCAPE'
            ? 'w-full max-w-4xl'
            : deviceFrame === 'TABLET_PORTRAIT'
            ? 'w-full max-w-md'
            : 'w-full max-w-sm'
        } ${isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1]'}`}>

          {/* Window / Device Frame Header */}
          <div className={`px-4 py-3 border-b flex items-center justify-between text-xs ${
            isDark ? 'border-[#282B34] bg-[#121316]' : 'border-[#CBD5E1] bg-[#EBEEF2]'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="font-mono text-[11px] font-bold truncate ml-2">
                {deviceFrame === 'DESKTOP'
                  ? 'Akwaaba POS — Desktop Workstation (Windows 11 / macOS)'
                  : deviceFrame === 'TABLET_LANDSCAPE'
                  ? 'Akwaaba POS — iPad Pro Countertop Touch Stand'
                  : deviceFrame === 'TABLET_PORTRAIT'
                  ? 'Akwaaba POS — Mobile Android Tablet / Handheld Till'
                  : 'GRA Fiscalized Thermal Receipt (80mm Continuous)'}
              </span>
            </div>

            {/* Quick Interactive Tool Controls in Window Header */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSimulateDumsor}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#FF4500]/15 text-[#FF4500] hover:bg-[#FF4500]/25 transition border border-[#FF4500]/30 cursor-pointer flex items-center gap-1"
                title="Test how transactions survive a sudden blackout"
              >
                <Zap className="w-3 h-3" />
                <span>Simulate Dumsor</span>
              </button>
            </div>
          </div>

          {/* Dumsor Blackout Simulation Overlay */}
          {dumsorActive && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-100">
              <Zap className="w-12 h-12 text-[#FF4500] animate-bounce mb-3" />
              <h3 className="text-xl font-bold text-white tracking-tight">DUMSOR OUTAGE TRIGGERED</h3>
              <p className="text-xs text-[#9CA3AF] max-w-sm mt-1">
                Grid power interrupted. Dexie.js local IndexedDB has instantly preserved cart transactions, till state, and non-repudiation audit records.
              </p>
            </div>
          )}

          {/* Dumsor Recovery Banner */}
          {dumsorRestored && (
            <div className="p-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Power Restored: Cart and till state 100% recovered with 0 pesewas lost!</span>
            </div>
          )}

          {/* ═══ 1. LIVE RECEIPT VIEW ═══ */}
          {deviceFrame === 'RECEIPT' ? (
            <div className="p-6 bg-slate-200 dark:bg-[#0B0D11] flex justify-center">
              <div className="w-full max-w-[340px] bg-white text-black p-5 shadow-2xl font-mono text-xs rounded-sm relative border-t-8 border-dashed border-slate-300">
                <div className="text-center pb-3 border-b border-dashed border-black">
                  <h3 className="font-black text-sm uppercase tracking-wider">AKWAABA SUPERMARKET</h3>
                  <p className="text-[10px] text-gray-700">Accra Central Hub Store &bull; Makola</p>
                  <p className="text-[10px] text-gray-700">TIN: C0029482190 &bull; Tel: 0244123456</p>
                  <p className="text-[9px] mt-1 font-bold">GRA VSDC FISCAL CASH RECEIPT</p>
                </div>

                <div className="py-2.5 border-b border-dashed border-black text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Receipt No:</span>
                    <strong>AKW-REC-2026-9481</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>Kofi Mensah (POS-01)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date().toLocaleDateString('en-GH')} {new Date().toLocaleTimeString('en-GH')}</span>
                  </div>
                </div>

                {/* Receipt Line Items */}
                <div className="py-3 border-b border-dashed border-black space-y-2 text-xs">
                  {cart.map((item, idx) => {
                    const price = orderMode === 'WHOLESALE' ? item.product.wholesalePrice : item.product.retailPrice;
                    const finalPrice = discountApplied ? price * 0.70 : price;
                    return (
                      <div key={idx}>
                        <div className="font-bold flex justify-between">
                          <span className="truncate pr-2">{item.product.name}</span>
                          <span>GH₵ {(finalPrice * item.quantity).toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] text-gray-600 flex justify-between">
                          <span>{item.quantity} x GH₵ {finalPrice.toFixed(2)}</span>
                          <span>{item.product.uom}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fiscal Tax Breakdown */}
                <div className="py-3 border-b border-dashed border-black space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Taxable Base:</span>
                    <span>GH₵ {subtotal.toFixed(2)}</span>
                  </div>
                  {taxScheme === 'STANDARD_VAT' ? (
                    <>
                      <div className="flex justify-between text-gray-700">
                        <span>NHIL (2.5%):</span>
                        <span>GH₵ {nhil.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>GETFund (2.5%):</span>
                        <span>GH₵ {getfund.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>COVID-19 Levy (1.0%):</span>
                        <span>GH₵ {covid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>VAT (15.0% Compound):</span>
                        <span>GH₵ {vat.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-gray-700">
                        <span>COVID-19 Levy (1.0%):</span>
                        <span>GH₵ {covid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>VFRS Flat VAT (3.0%):</span>
                        <span>GH₵ {vat.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
                    <span>GRAND TOTAL:</span>
                    <span>GH₵ {grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* GRA Fiscal QR Code & Signature */}
                <div className="pt-3 text-center space-y-2">
                  <div className="w-24 h-24 mx-auto border-2 border-black flex items-center justify-center p-1 bg-white">
                    <QrCode className="w-full h-full" />
                  </div>
                  <div className="font-mono text-[9px] text-gray-700 leading-tight">
                    GRA VSDC: VSDC-GH-2026-X94B-1120
                    <br />
                    Medaase! Thank you for your business.
                  </div>
                </div>
              </div>
            </div>
          ) : deviceFrame === 'TABLET_PORTRAIT' ? (
            /* ═══ 2. BESPOKE TABLET & MOBILE PORTRAIT TILL WORKSTATION ═══ */
            <div className="flex flex-col min-h-[580px] max-h-[700px] overflow-hidden select-none">
              
              {/* Native Mobile Status Bar & Cashier Presence */}
              <div className={`px-4 py-2.5 border-b flex items-center justify-between text-[11px] shrink-0 ${
                isDark ? 'bg-[#101216] border-[#282B34] text-gray-300' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}>
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Till #01 &bull; Makola Central</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-[#FF4500]/15 text-[#FF4500] font-bold">Kofi M.</span>
                  <span>100% Offline OK</span>
                </div>
              </div>

              {/* Mode & Tax Pill Strip for Portrait */}
              <div className={`px-3.5 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
                isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setOrderMode('RETAIL')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      orderMode === 'RETAIL'
                        ? 'bg-[#FF4500] text-white shadow-xs'
                        : isDark ? 'text-gray-400 bg-black/30' : 'text-slate-600 bg-slate-100'
                    }`}
                  >
                    Retail
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderMode('WHOLESALE')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      orderMode === 'WHOLESALE'
                        ? 'bg-[#008B8B] text-white shadow-xs'
                        : isDark ? 'text-gray-400 bg-black/30' : 'text-slate-600 bg-slate-100'
                    }`}
                  >
                    Wholesale
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setTaxScheme(taxScheme === 'STANDARD_VAT' ? 'FLAT_RATE_VFRS' : 'STANDARD_VAT')}
                  className="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 cursor-pointer"
                >
                  {taxScheme === 'STANDARD_VAT' ? 'GRA Std 21.9%' : 'GRA Flat 4.0%'}
                </button>
              </div>

              {/* Portrait Content Area depending on activeModule */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {activeModule === 'TILL' ? (
                  /* ─── PORTRAIT TILL PRODUCTS LIST ─── */
                  <div className="space-y-2.5 pb-20">
                    <div className="flex items-center justify-between text-xs font-semibold px-0.5">
                      <span className="text-gray-400">Tap Product to Add:</span>
                      <span className="text-[#FF4500] font-mono text-[11px] font-bold">
                        {cart.reduce((acc, c) => acc + c.quantity, 0)} in Cart
                      </span>
                    </div>

                    {demoProducts.map((prod) => {
                      const price = orderMode === 'WHOLESALE' ? prod.wholesalePrice : prod.retailPrice;
                      const finalPrice = discountApplied ? price * 0.70 : price;
                      const inCart = cart.find(c => c.product.id === prod.id);

                      return (
                        <div
                          key={prod.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isDark
                              ? 'bg-[#121316] border-[#282B34] hover:border-[#FF4500]/60'
                              : 'bg-white border-slate-200 hover:border-[#FF4500]/60 shadow-xs'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FF4500]/15 text-[#FF4500]">
                                {prod.tag}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">{prod.uom}</span>
                            </div>
                            <h4 className="font-bold text-sm leading-snug truncate text-slate-900 dark:text-stone-100">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono font-extrabold text-sm text-[#FF4500]">
                                {formatGhs(finalPrice)}
                              </span>
                              <span className="text-[10px] text-gray-400">Stock: {prod.stock}</span>
                            </div>
                          </div>

                          {/* Large, Easy-Touch Stepper */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {inCart ? (
                              <div className="flex items-center gap-1 p-0.5 rounded-xl border border-[#282B34] bg-black/40">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(prod.id, -1)}
                                  className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center text-xs active:scale-90 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="font-mono font-bold text-xs px-2 min-w-[20px] text-center">
                                  {inCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(prod.id, 1)}
                                  className="w-8 h-8 rounded-lg bg-[#FF4500] text-white font-bold flex items-center justify-center text-xs active:scale-90 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddToCart(prod)}
                                className="px-3.5 py-2 rounded-xl font-bold text-xs bg-[#FF4500] hover:bg-[#E03E00] text-white flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                              >
                                <span>+ Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : activeModule === 'FIFO' ? (
                  /* ─── PORTRAIT FIFO STACKED CARDS ─── */
                  <div className="space-y-3 pb-8">
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-amber-400">FIFO Shelf Rotation</div>
                          <div className="text-[10px] text-gray-400">&lt;30 days urgent clearance</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDiscountApplied(!discountApplied)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          discountApplied ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                        }`}
                      >
                        {discountApplied ? '✓ 30% Active' : 'Apply -30%'}
                      </button>
                    </div>

                    {demoProducts.map((p) => {
                      const isCritical = p.expiryDays <= 30;
                      const isWarning = p.expiryDays > 30 && p.expiryDays <= 90;
                      const currentPrice = discountApplied ? p.retailPrice * 0.70 : p.retailPrice;

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-2xl border space-y-2 ${
                            isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-white border-slate-200 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm leading-snug text-slate-900 dark:text-stone-100">
                                {p.name}
                              </h4>
                              <span className="text-[10px] text-gray-500 font-mono">LOT-{p.id.toUpperCase()}-2026</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isWarning
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {p.expiryDays} days left
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/20">
                            <div>
                              <span className="text-gray-500 line-through text-[11px] mr-2">
                                GH₵ {p.retailPrice.toFixed(2)}
                              </span>
                              <strong className="font-mono font-black text-sm text-[#FF4500]">
                                GH₵ {currentPrice.toFixed(2)}
                              </strong>
                              {discountApplied && <span className="text-[10px] text-emerald-400 ml-1">(-30%)</span>}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddToCart(p);
                                setActiveModule('TILL');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#FF4500]/15 hover:bg-[#FF4500]/25 text-[#FF4500] text-xs font-bold border border-[#FF4500]/30 cursor-pointer"
                            >
                              Push to Till
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : activeModule === 'DUMSOR' ? (
                  /* ─── PORTRAIT DUMSOR LOSS AUDIT ─── */
                  <div className="space-y-3 pb-8">
                    <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center gap-2.5">
                      <Zap className="w-5 h-5 text-rose-500 shrink-0" />
                      <div>
                        <div className="font-bold text-xs text-rose-400">Cold-Store Dumsor Defrost Logger</div>
                        <div className="text-[10px] text-gray-300">GRA Tax-Deductible Loss Audit</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span>Outage Duration:</span>
                        <span className="font-mono text-[#FF4500] text-sm">{outageHours} Hours</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="24"
                        value={outageHours}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setOutageHours(val);
                          setFreezerTemp(Number((-18 + val * 0.95).toFixed(1)));
                        }}
                        className="w-full accent-[#FF4500] cursor-pointer"
                      />

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Freezer Core Temp:</span>
                          <span className={`font-bold ${freezerTemp > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {freezerTemp > 0 ? `+${freezerTemp}°C (DEFROST RISK)` : `${freezerTemp}°C (SAFE)`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Estimated Spoilage:</span>
                          <span className="font-bold text-rose-400">GH₵ {(outageHours * 475.00).toFixed(2)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSpoilageCertified(!spoilageCertified)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          spoilageCertified
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 hover:bg-rose-500 text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{spoilageCertified ? '✓ GRA Loss Certificate Signed' : 'Sign Spoilage Loss Certificate'}</span>
                      </button>
                    </div>
                  </div>
                ) : activeModule === 'UOM' ? (
                  /* ─── PORTRAIT UOM BULK BREAKDOWN ─── */
                  <div className="space-y-3 pb-8">
                    <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/10 flex items-center gap-2.5">
                      <Boxes className="w-5 h-5 text-teal-400 shrink-0" />
                      <div>
                        <div className="font-bold text-xs text-teal-300">50kg Bulk Sack Breakdown</div>
                        <div className="text-[10px] text-gray-300">Deconstruct into 18 Olonkas</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Wholesale Sacks:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSacksToBreak(Math.max(1, sacksToBreak - 1))}
                            className="w-7 h-7 rounded-lg bg-[#282B34] text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono text-sm font-bold">{sacksToBreak} Sack</span>
                          <button
                            type="button"
                            onClick={() => setSacksToBreak(sacksToBreak + 1)}
                            className="w-7 h-7 rounded-lg bg-[#282B34] text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-xs font-mono space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex justify-between text-gray-400">
                          <span>Cost (50kg Sack):</span>
                          <span>GH₵ {(sacksToBreak * 875.00).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Loose Olonkas:</span>
                          <span>{sacksToBreak * 18} Olonkas</span>
                        </div>
                        <div className="flex justify-between text-[#FF4500] font-bold">
                          <span>Projected Retail:</span>
                          <span>GH₵ {(sacksToBreak * 18 * 55.00).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-black pt-1 border-t border-slate-800">
                          <span>Net Margin:</span>
                          <span>+GH₵ {(sacksToBreak * (18 * 55.00 - 875.00)).toFixed(2)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleAddToCart(demoProducts[3]);
                          setActiveModule('TILL');
                        }}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition cursor-pointer"
                      >
                        Commit Breakdown &amp; Push to Till
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ─── PORTRAIT BISA CUSTOMER CREDIT ─── */
                  <div className="space-y-3 pb-8">
                    <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center gap-2.5">
                      <CreditCard className="w-5 h-5 text-indigo-400 shrink-0" />
                      <div>
                        <div className="font-bold text-xs text-indigo-300">Bisa Debt Ledger</div>
                        <div className="text-[10px] text-gray-300">Customer Credit &amp; SMS Prompts</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm">Madam Akosua Serwaa</h4>
                          <span className="text-[10px] text-gray-400">Stall #14 &bull; 0244987654</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Overdue 42d
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Owed Balance:</span>
                          <strong className="text-rose-400 font-bold">GH₵ 1,450.00</strong>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Credit Limit:</span>
                          <span>GH₵ 2,000.00</span>
                        </div>
                        <div className="flex justify-between text-emerald-400">
                          <span>Last Payment:</span>
                          <span>GH₵ 300 (MoMo)</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => alert('Simulated SMS sent: "Akwaaba Supermarket: Respected Madam Akosua, please be reminded of your outstanding balance GH₵ 1,450.00. Thank you."')}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send SMS Payment Prompt</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* DOCKED STICKY BOTTOM ACTION SHEET (PORTRAIT REGISTER DOCK) */}
              <div className={`p-3 border-t shrink-0 flex items-center justify-between gap-2.5 ${
                isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-slate-200 shadow-lg'
              }`}>
                <div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {cart.reduce((acc, c) => acc + c.quantity, 0)} Items &bull; {taxScheme === 'STANDARD_VAT' ? 'Std Tax' : 'Flat Tax'}
                  </div>
                  <div className="font-mono font-black text-base text-[#FF4500]">
                    {formatGhs(grandTotal)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeviceFrame('RECEIPT')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isDark ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-300 bg-slate-100 text-slate-800'
                    }`}
                  >
                    🧾 Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMomoModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF4500] hover:bg-[#E03E00] text-white transition active:scale-95 shadow-md shadow-[#FF4500]/25 cursor-pointer"
                  >
                    💳 Pay MoMo
                  </button>
                </div>
              </div>
            </div>
          ) : activeModule === 'FIFO' ? (
            /* ═══ 2. FIFO EXPIRY SENTINEL SIMULATOR ═══ */
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <Flame className="w-6 h-6 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-sm text-amber-400">FIFO Expiry Sentinel &amp; Clearance Markdown</h3>
                    <p className="text-xs text-[#9CA3AF]">
                      Color-coded shelf audit: &lt;30 days critical (Red), &lt;90 days clearance window (Yellow).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDiscountApplied(!discountApplied)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    discountApplied
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{discountApplied ? '✓ 30% Clearance Applied' : 'Apply -30% Clearance Markdown'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className={`border-b ${isDark ? 'border-[#282B34] text-[#9CA3AF]' : 'border-slate-200 text-slate-500'}`}>
                    <tr>
                      <th className="py-2 px-3">Batch &amp; Product</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Days Left</th>
                      <th className="py-2 px-3">Original Price</th>
                      <th className="py-2 px-3">Current Offer</th>
                      <th className="py-2 px-3">Stock Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#282B34]/40 font-mono">
                    {demoProducts.map((p) => {
                      const isCritical = p.expiryDays <= 30;
                      const isWarning = p.expiryDays > 30 && p.expiryDays <= 90;
                      const currentPrice = discountApplied ? p.retailPrice * 0.70 : p.retailPrice;

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/20">
                          <td className="py-2.5 px-3">
                            <div className="font-bold font-sans text-xs">{p.name}</div>
                            <span className="text-[10px] text-gray-500">LOT-{p.id.toUpperCase()}-2026</span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-gray-400">{p.category}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCritical 
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                                : isWarning 
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {p.expiryDays} days
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 line-through">GH₵ {p.retailPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-3 font-bold text-[#FF4500]">
                            GH₵ {currentPrice.toFixed(2)}
                            {discountApplied && <span className="ml-1 text-[10px] text-emerald-400">(-30%)</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => {
                                handleAddToCart(p);
                                setActiveModule('TILL');
                              }}
                              className="px-2 py-1 rounded bg-[#FF4500]/15 hover:bg-[#FF4500]/25 text-[#FF4500] text-[10px] font-bold border border-[#FF4500]/30 cursor-pointer"
                            >
                              Push to Till
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeModule === 'DUMSOR' ? (
            /* ═══ 3. DUMSOR SPOILAGE CERTIFICATE SIMULATOR ═══ */
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10">
                <Zap className="w-6 h-6 text-rose-500" />
                <div>
                  <h3 className="font-bold text-sm text-rose-400">Cold-Store Dumsor Defrost &amp; Spoilage Loss Logger</h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Document perishable decay during power cuts. Generates official GRA tax-deductible loss write-off certificates.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-slate-50 border-[#CBD5E1]'}`}>
                  <label className="text-xs font-bold block">Power Outage Duration (Hours):</label>
                  <input
                    type="range"
                    min="1"
                    max="18"
                    value={outageHours}
                    onChange={(e) => {
                      const hrs = parseInt(e.target.value);
                      setOutageHours(hrs);
                      setFreezerTemp(Number((-18 + hrs * 3.2).toFixed(1)));
                    }}
                    className="w-full accent-[#FF4500] cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-mono">
                    <span>{outageHours} Hours Blackout</span>
                    <span className={freezerTemp > 0 ? 'text-rose-400 font-bold' : 'text-cyan-400 font-bold'}>
                      Freezer Temp: {freezerTemp}°C ({freezerTemp > 0 ? 'DEFROSTED' : 'FROZEN'})
                    </span>
                  </div>

                  <div className="pt-2 text-xs space-y-1">
                    <div className="flex justify-between text-gray-400">
                      <span>Affected Cold Store:</span>
                      <strong>Freezer Room #2 (Poultry &amp; Fish)</strong>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Estimated Spoiled Stock:</span>
                      <strong className="text-rose-400 font-mono">GH₵ {(outageHours * 420.50).toFixed(2)}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSpoilageCertified(true)}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-[#FF4500] hover:bg-[#E03E00] text-white transition cursor-pointer"
                  >
                    Generate Official GRA Spoilage Certificate
                  </button>
                </div>

                {/* Spoilage Certificate Preview */}
                <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
                  spoilageCertified ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-dashed border-gray-700 bg-black/20'
                }`}>
                  <div className="text-center pb-2 border-b border-gray-700">
                    <span className="text-[10px] text-[#00CED1] font-bold">GRA AUDIT DOCUMENT</span>
                    <h4 className="font-bold text-xs uppercase">Dumsor Loss Spoilage Certificate</h4>
                    <span className="text-[9px] text-gray-400">Ref: GRA-SPOIL-2026-0814</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div>Merchant: <strong>Akwaaba Supermarket &bull; Makola Hub</strong></div>
                    <div>Outage Window: <strong>{outageHours} hrs without grid/generator</strong></div>
                    <div>Defrost Loss: <strong className="text-rose-400">GH₵ {(outageHours * 420.50).toFixed(2)}</strong></div>
                    <div>Tax Treatment: <strong>Allowable Inventory Write-Off (Act 870)</strong></div>
                    <div>Supervisor Stamp: <strong className="text-emerald-400">KWAME MENSAH (GM PIN: ****)</strong></div>
                  </div>
                  <div className="pt-2 border-t border-gray-700 text-center">
                    <span className="text-[9px] text-gray-500 font-sans italic">
                      {spoilageCertified ? '✓ Digitally Signed & Indexed to Offline DB' : 'Click Generate to sign & lock certificate'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeModule === 'UOM' ? (
            /* ═══ 4. BULK SACK FRACTIONAL BREAKDOWN SIMULATOR ═══ */
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/10">
                <Boxes className="w-6 h-6 text-teal-400" />
                <div>
                  <h3 className="font-bold text-sm text-teal-300">Unit of Measure (UOM) Breakdown Engine</h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Deconstruct wholesale 50kg sacks into loose Olonkas and consumer kg packets with atomic stock deduction.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-slate-50 border-[#CBD5E1]'}`}>
                  <label className="text-xs font-bold block">Wholesale Sacks to Deconstruct:</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSacksToBreak(Math.max(1, sacksToBreak - 1))}
                      className="w-8 h-8 rounded-lg bg-[#282B34] text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono text-base font-bold">{sacksToBreak} Sack (50kg)</span>
                    <button
                      type="button"
                      onClick={() => setSacksToBreak(sacksToBreak + 1)}
                      className="w-8 h-8 rounded-lg bg-[#282B34] text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-xs space-y-1.5 pt-2 border-t border-slate-700/40">
                    <div className="flex justify-between text-gray-400">
                      <span>Wholesale Purchase Cost:</span>
                      <span className="font-mono">GH₵ {(sacksToBreak * 875.00).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Yield in Loose Olonkas:</span>
                      <span className="font-mono font-bold text-emerald-400">{sacksToBreak * 18} Olonkas</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Projected Retail Sales:</span>
                      <span className="font-mono font-bold text-[#FF4500]">GH₵ {(sacksToBreak * 18 * 55.00).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-slate-700/40">
                      <span>Net Breakdown Profit:</span>
                      <span className="font-mono text-emerald-400 font-black">
                        +GH₵ {(sacksToBreak * (18 * 55.00 - 875.00)).toFixed(2)} (+13.1%)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(demoProducts[3]);
                      setActiveModule('TILL');
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition cursor-pointer"
                  >
                    Commit Breakdown &amp; Add Olonkas to Till
                  </button>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-center text-xs space-y-2 ${isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-slate-50 border-[#CBD5E1]'}`}>
                  <h4 className="font-bold text-xs flex items-center gap-1.5 text-teal-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Audit Inventory Traceability</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Akwaaba POS automatically records an atomic double-entry inventory ledger:
                  </p>
                  <ul className="space-y-1 text-[11px] font-mono text-gray-300 pl-2 border-l border-teal-500/30">
                    <li>- DEDUCT: {sacksToBreak} x Royal Feast 50kg Sack</li>
                    <li>+ CREDIT: {sacksToBreak * 18} x Loose Olonkas (SKU-OLK-01)</li>
                    <li>+ CREDIT: {sacksToBreak * 2.5}kg Tail-End Loose Grains</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : activeModule === 'DEBT' ? (
            /* ═══ 5. BISA CUSTOMER CREDIT SIMULATOR ═══ */
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                <CreditCard className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm text-indigo-300">Bisa Debt &amp; Customer Credit Ledger</h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Track trusted regular customers, credit limits, 30/60/90 days aging, and automated SMS debt payment reminders.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border space-y-2.5 ${isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-slate-50 border-[#CBD5E1]'}`}>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700/40">
                    <div>
                      <h4 className="font-bold text-sm">Madam Akosua Serwaa</h4>
                      <span className="text-[10px] text-gray-400">Provision Stall #14 &bull; 0244987654</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Overdue (42 Days)
                    </span>
                  </div>

                  <div className="text-xs space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Outstanding Debt:</span>
                      <strong className="text-rose-400 font-bold">GH₵ 1,450.00</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Approved Credit Ceiling:</span>
                      <span>GH₵ 2,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Payment (Partial):</span>
                      <span className="text-emerald-400">GH₵ 300.00 (MTN MoMo)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert('Simulated SMS sent: "Akwaaba Supermarket: Respected Madam Akosua, please be reminded of your outstanding balance GH₵ 1,450.00. Thank you."')}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send SMS Payment Reminder</span>
                  </button>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-center text-xs space-y-2 ${isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-slate-50 border-[#CBD5E1]'}`}>
                  <h4 className="font-bold text-xs flex items-center gap-1.5 text-indigo-400">
                    <UserCheck className="w-4 h-4" />
                    <span>Disaster Recovery &amp; Offline Sync</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Customer credit ledgers are fully synchronized with offline Dexie.js IndexedDB storage. You can record debt repayments without cellular internet during market rush hours.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ═══ DEFAULT: LIVE INTERACTIVE TILL WORKSPACE ═══ */
            <div className="p-4 sm:p-5 space-y-4">
              
              {/* Interactive Toolbar: Mode Selector & Tax Scheme Toggle */}
              <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-[#EBEEF2]/70 border-[#CBD5E1]'
              }`}>
                {/* Retail vs Wholesale Pricing Switcher */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">Price Mode:</span>
                  <div className="flex rounded-xl p-0.5 border border-[#282B34] bg-[#1A1C22]">
                    <button
                      type="button"
                      onClick={() => setOrderMode('RETAIL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        orderMode === 'RETAIL'
                          ? 'bg-[#FF4500] text-white'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      Retail
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderMode('WHOLESALE')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        orderMode === 'WHOLESALE'
                          ? 'bg-[#008B8B] text-white'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      Wholesale Bulk
                    </button>
                  </div>
                </div>

                {/* GRA Tax Scheme Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">GRA Scheme:</span>
                  <div className="flex rounded-xl p-0.5 border border-[#282B34] bg-[#1A1C22]">
                    <button
                      type="button"
                      onClick={() => setTaxScheme('STANDARD_VAT')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        taxScheme === 'STANDARD_VAT'
                          ? 'bg-[#FF4500] text-white'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      Standard 21.90%
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxScheme('FLAT_RATE_VFRS')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        taxScheme === 'FLAT_RATE_VFRS'
                          ? 'bg-[#00CED1] text-black font-extrabold'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      Flat Rate 4.0%
                    </button>
                  </div>
                </div>
              </div>

              {/* Till Layout Grid: Products + Real-Time Cart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Product Catalog Quick-Add Grid */}
                <div className="lg:col-span-7 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#9CA3AF]">
                    <span>Touch / Click Product to Add to Cart:</span>
                    <span className="font-mono text-[11px] text-[#00CED1]">Barcode Gun Wedge Active</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {demoProducts.map((prod) => {
                      const price = orderMode === 'WHOLESALE' ? prod.wholesalePrice : prod.retailPrice;
                      const finalPrice = discountApplied ? price * 0.70 : price;

                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleAddToCart(prod)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between hover:scale-[1.02] active:scale-95 ${
                            isDark 
                              ? 'bg-[#121316] border-[#282B34] hover:border-[#FF4500]' 
                              : 'bg-white border-[#CBD5E1] hover:border-[#FF4500] shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-[#FF4500]/10 text-[#FF4500]">
                                {prod.tag}
                              </span>
                              <span className="text-[10px] text-[#9CA3AF] font-mono">{prod.uom}</span>
                            </div>
                            <h4 className="font-bold text-xs leading-snug line-clamp-2">{prod.name}</h4>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-700/20 flex items-center justify-between">
                            <span className="font-mono font-extrabold text-xs text-[#FF4500]">
                              {formatGhs(finalPrice)}
                            </span>
                            <span className="w-5 h-5 rounded-full bg-[#FF4500]/15 text-[#FF4500] flex items-center justify-center font-bold text-xs">
                              +
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Till Cart Pane */}
                <div className={`lg:col-span-5 p-4 rounded-2xl border flex flex-col justify-between ${
                  isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-[#EBEEF2]/70 border-[#CBD5E1]'
                }`}>
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#282B34] text-xs font-bold">
                      <span>Active Sale Ticket</span>
                      <span className="text-[#FF4500] font-mono">{cart.length} line items</span>
                    </div>

                    {/* Cart Items List */}
                    <div className="py-2.5 space-y-2 max-h-48 overflow-y-auto">
                      {cart.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#9CA3AF]">
                          Cart is empty. Click any product on the left to add.
                        </div>
                      ) : (
                        cart.map((item) => {
                          const price = orderMode === 'WHOLESALE' ? item.product.wholesalePrice : item.product.retailPrice;
                          const finalPrice = discountApplied ? price * 0.70 : price;
                          return (
                            <div key={item.product.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-700/20">
                              <div className="truncate pr-2 max-w-[130px]">
                                <div className="font-bold truncate">{item.product.name}</div>
                                <div className="text-[10px] text-[#9CA3AF] font-mono">
                                  {formatGhs(finalPrice)} x {item.quantity}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(item.product.id, -1)}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-[#282B34] text-white hover:bg-slate-700 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-mono font-bold w-4 text-center">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(item.product.id, 1)}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-[#282B34] text-white hover:bg-slate-700 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Cart Total & Tender Options */}
                  <div className="pt-3 border-t border-[#282B34] space-y-2">
                    <div className="text-[11px] space-y-1">
                      <div className="flex justify-between text-[#9CA3AF]">
                        <span>Subtotal:</span>
                        <span className="font-mono">{formatGhs(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[#00CED1]">
                        <span>GRA Taxes &amp; Levies:</span>
                        <span className="font-mono font-bold">{formatGhs(totalTax)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm pt-1 border-t border-[#282B34]">
                        <span>Grand Total:</span>
                        <span className="font-mono text-[#FF4500] font-black">{formatGhs(grandTotal)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDeviceFrame('RECEIPT')}
                        className="py-2.5 rounded-xl font-bold text-xs bg-[#FF4500] hover:bg-[#E03E00] text-white transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Print Receipt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMomoModal(true)}
                        className="py-2.5 rounded-xl font-bold text-xs bg-[#008B8B] hover:bg-[#007A7C] text-white transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Tender MoMo</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Simulated Mobile Money Prompt Modal */}
        {showMomoModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1]'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#FF4500]" />
                  <h3 className="font-bold text-sm">Simulate MoMo Payment</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMomoModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-gray-400">Select Network:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['MTN', 'TELECEL', 'AT'] as const).map((net) => (
                      <button
                        key={net}
                        type="button"
                        onClick={() => setMomoNetwork(net)}
                        className={`py-1.5 rounded-lg font-bold border transition cursor-pointer ${
                          momoNetwork === net
                            ? 'bg-[#FF4500] text-white border-[#FF4500]'
                            : 'bg-slate-800/40 border-slate-700 text-gray-300'
                        }`}
                      >
                        {net}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-center space-y-1">
                  <span className="text-[10px] text-gray-400">Customer USSD Prompt Amount</span>
                  <div className="text-lg font-black text-[#FF4500]">{formatGhs(grandTotal)}</div>
                  <span className="text-[9px] text-emerald-400">Merchant Terminal: 0244123456 (Akwaaba)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1 text-gray-400">Transaction Reference Code:</label>
                  <input
                    type="text"
                    value={momoRef}
                    onChange={(e) => setMomoRef(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 font-mono text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMomoConfirmed(true);
                    setTimeout(() => {
                      setMomoConfirmed(false);
                      setShowMomoModal(false);
                      setDeviceFrame('RECEIPT');
                    }, 1200);
                  }}
                  className="w-full py-2.5 rounded-xl font-bold bg-[#FF4500] hover:bg-[#E03E00] text-white transition cursor-pointer"
                >
                  {momoConfirmed ? '✓ Payment Validated & Cleared!' : 'Confirm Payment & Print Slip'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══ VISUAL FEATURE GALLERY: PICTURES OF THE PROGRAM IN ACTION ═══ */}
      <section className={`py-16 px-4 sm:px-8 border-t ${
        isDark ? 'border-[#282B34] bg-[#16181F]/40' : 'border-[#CBD5E1] bg-white'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono font-bold uppercase text-[#FF4500]">Visual Inspection</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              Pictures of the Program in Action
            </h2>
            <p className={`mt-2 text-xs sm:text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
              High-resolution snapshots and interactive views of key operational modules running on Ghanaian countertops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'High-Volume Cashier Terminal & MoMo Split Tender',
                tag: 'Checkout Till',
                moduleKey: 'TILL' as const,
                desc: 'Dual-pane touch till with barcode gun wedge, denomination quick-buttons (GH₵ 200 to 1), and instant Mobile Money USSD prompt.',
                tags: ['Makola Rush', 'Zero Delay', 'Offline Mode'],
                badgeColor: 'border-[#FF4500]/30 text-[#FF4500]',
              },
              {
                title: 'FIFO Expiry Sentinel & One-Click Markdown',
                tag: 'Inventory Sentinel',
                moduleKey: 'FIFO' as const,
                desc: 'First-In First-Out shelf life tracking. Color-coded countdown badges (<30 days urgent red) with automated -30% clearance markdowns.',
                tags: ['FIFO Safe', 'Zero Spoilage', 'Auto Discount'],
                badgeColor: 'border-amber-500/30 text-amber-400',
              },
              {
                title: 'Cold-Store Dumsor Defrost & Loss Certification',
                tag: 'Dumsor Resilience',
                moduleKey: 'DUMSOR' as const,
                desc: 'Freezer temperature rise audit during power cuts. Generates official GRA tax-deductible loss write-off certificates signed with manager PIN.',
                tags: ['Act 870 Compliant', 'Cold Store', 'Tax Deduction'],
                badgeColor: 'border-rose-500/30 text-rose-400',
              },
              {
                title: 'Bulk Sack Fractional Deconstruction (UOM Engine)',
                tag: 'UOM Breakdown',
                moduleKey: 'UOM' as const,
                desc: 'Deconstruct wholesale 50kg rice sacks into 18 olonkas and loose consumer kg packets with atomic stock deduction and profit margin tracking.',
                tags: ['18 Olonkas/Sack', 'Margin Tracker', 'Double Entry'],
                badgeColor: 'border-teal-500/30 text-teal-400',
              },
              {
                title: 'Bisa Customer Debt Ledger & Repayment Tracking',
                tag: 'Customer Credit',
                moduleKey: 'DEBT' as const,
                desc: 'Credit trust ledger with overdue aging (30/60/90 days), repayment history, and automated WhatsApp/SMS balance reminder dispatch.',
                tags: ['Bisa Ledger', 'SMS Prompt', 'Credit Ceiling'],
                badgeColor: 'border-indigo-500/30 text-indigo-400',
              },
              {
                title: 'GRA VSDC Cryptographic Receipt Fiscalization',
                tag: 'Statutory Tax',
                moduleKey: 'TILL' as const,
                desc: 'Itemized computation of Standard VAT 21.90% and Flat Rate 4.0% with cryptographic QR audit codes printed on 80mm & 58mm thermal slips.',
                tags: ['GRA VSDC', 'Thermal 80mm', 'QR Fiscal'],
                badgeColor: 'border-cyan-500/30 text-cyan-400',
              },
            ].map((pic, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all hover:border-[#FF4500]/50 hover:shadow-xl ${
                  isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-[#EBEEF2]/70 border-[#CBD5E1]'
                }`}
              >
                {/* Visual Picture Frame Mockup */}
                <div className="relative h-44 bg-gradient-to-br from-slate-900 via-[#16181F] to-slate-950 p-4 flex flex-col justify-between border-b border-[#282B34]">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border bg-black/40 ${pic.badgeColor}`}>
                      {pic.tag}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">View #{idx + 1}</span>
                  </div>

                  {/* Simulated Interface Snapshot Graphic */}
                  <div className="my-auto text-center space-y-1.5">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/30 flex items-center justify-center">
                      {idx === 0 && <Store className="w-6 h-6" />}
                      {idx === 1 && <Flame className="w-6 h-6" />}
                      {idx === 2 && <Zap className="w-6 h-6" />}
                      {idx === 3 && <Boxes className="w-6 h-6" />}
                      {idx === 4 && <CreditCard className="w-6 h-6" />}
                      {idx === 5 && <Receipt className="w-6 h-6" />}
                    </div>
                    <div className="font-bold text-xs text-white tracking-wide truncate">{pic.title}</div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pic.tags.map((t, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-gray-300 font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Picture Details & Launch in Simulator */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9CA3AF]' : 'text-[#475569]'}`}>
                    {pic.desc}
                  </p>

                  <div className="pt-2 border-t border-slate-700/20 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        handleSwitchModule(pic.moduleKey);
                        window.scrollTo({ top: 350, behavior: 'smooth' });
                      }}
                      className="text-xs font-bold text-[#FF4500] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Test Live in Simulator</span>
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PLATFORM DOWNLOADS PORTAL (DIRECT EXE, DMG, APK - ZERO 404s) ═══ */}
      <section className={`py-16 px-4 sm:px-8 border-t ${
        isDark ? 'border-[#282B34] bg-[#121316]' : 'border-[#CBD5E1] bg-[#EBEEF2]/50'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-[#FF4500]">Multi-Platform Suite</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                Install on Any Countertop or Tablet
              </h2>
              <p className={`mt-1.5 text-xs sm:text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                Direct standalone binaries for Windows, macOS, and Android. No Google Play account required.
              </p>
            </div>
            <a
              href="https://github.com/Mazonia/pos-n-sales-system/releases/tag/v1.0.0"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold border border-[#FF4500] text-[#FF4500] hover:bg-[#FF4500] hover:text-white transition cursor-pointer self-start md:self-auto flex items-center gap-1.5"
            >
              <span>View All Assets on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Windows Desktop (.exe) */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1]'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Laptop className="w-5 h-5 text-[#FF4500]" />
                  <span className="font-mono text-xs font-bold text-[#00CED1]">.exe (Installer &amp; Portable)</span>
                </div>
                <h4 className="font-bold text-sm mb-1">Windows PC Desktop</h4>
                <p className={`text-xs mb-3 ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                  Full NSIS installer and zero-install portable executable with desktop shortcuts and silent ESC/POS hardware print drivers.
                </p>
                <span className="inline-block text-[10px] font-mono text-emerald-400 font-bold mb-3">v1.0.0 Ready (111 MB)</span>
              </div>
              <div className="pt-3 border-t border-slate-700/30 flex items-center gap-2">
                <a
                  href="https://github.com/Mazonia/pos-n-sales-system/releases/download/v1.0.0/Akwaaba.POS.Retail.OS.Setup.1.0.0.exe"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FF4500] hover:bg-[#E03E00] text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Setup.exe</span>
                </a>
                <a
                  href="https://github.com/Mazonia/pos-n-sales-system/releases/download/v1.0.0/Akwaaba.POS.Retail.OS.1.0.0.exe"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#008B8B] hover:bg-[#007A7C] text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Portable</span>
                </a>
              </div>
            </div>

            {/* 2. Apple macOS (.dmg) */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1]'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Laptop className="w-5 h-5 text-purple-400" />
                  <span className="font-mono text-xs font-bold text-purple-400">.dmg (macOS)</span>
                </div>
                <h4 className="font-bold text-sm mb-1">macOS Universal</h4>
                <p className={`text-xs mb-3 ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                  Universal macOS disk image (.dmg) with native hardware acceleration for Apple Silicon (M1-M4) and Intel Macs.
                </p>
                <span className="inline-block text-[10px] font-mono text-emerald-400 font-bold mb-3">v1.0.0 Universal DMG</span>
              </div>
              <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between">
                <a
                  href="https://github.com/Mazonia/pos-n-sales-system/releases/tag/v1.0.0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .dmg</span>
                </a>
                <span className="text-[10px] text-gray-500 font-mono">macOS 12+</span>
              </div>
            </div>

            {/* 3. Apple iPad (iPadOS) */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1]'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Tablet className="w-5 h-5 text-[#00CED1]" />
                  <span className="font-mono text-xs font-bold text-[#00CED1]">iPadOS (Retina Touch)</span>
                </div>
                <h4 className="font-bold text-sm mb-1">Apple iPad &bull; iPadOS</h4>
                <p className={`text-xs mb-3 ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                  Open Safari, tap Share &rarr; "Add to Home Screen" for instant fullscreen touch till with offline WebKit storage.
                </p>
                <span className="inline-block text-[10px] font-mono text-cyan-400 font-bold mb-3">Swivel Touch Stand</span>
              </div>
              <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onLaunchPos}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span>Launch on iPad</span>
                </button>
                <span className="text-[10px] text-gray-500 font-mono">iPadOS 16+</span>
              </div>
            </div>

            {/* 4. Android Tablet APK */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1]'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Tablet className="w-5 h-5 text-[#3DDC84]" />
                  <span className="font-mono text-xs font-bold text-[#3DDC84]">.apk (Android)</span>
                </div>
                <h4 className="font-bold text-sm mb-1">Android Tablet</h4>
                <p className={`text-xs mb-3 ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                  Full-sensor auto-rotation for swivel countertop stands and handheld mobile cashier tellers.
                </p>
                <span className="inline-block text-[10px] font-mono text-emerald-400 font-bold mb-3">Capacitor 8.5 Native</span>
              </div>
              <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between">
                <a
                  href="https://github.com/Mazonia/pos-n-sales-system/releases/tag/v1.0.0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .apk</span>
                </a>
                <span className="text-[10px] text-gray-500 font-mono">Tablets 10"-12"</span>
              </div>
            </div>

            {/* 5. Web PWA Instant Access */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1]'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Store className="w-5 h-5 text-[#FF5722]" />
                  <span className="font-mono text-xs font-bold text-[#FF5722]">Instant PWA</span>
                </div>
                <h4 className="font-bold text-sm mb-1">Web Application</h4>
                <p className={`text-xs mb-3 ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                  Runs directly in your browser with service worker offline caching and zero installation required.
                </p>
                <span className="inline-block text-[10px] font-mono text-cyan-400 font-bold mb-3">Instant Launch</span>
              </div>
              <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onLaunchPos}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FF4500] hover:bg-[#E03E00] text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Launch Web POS</span>
                </button>
                <span className="text-[10px] text-gray-500 font-mono">Zero Flash</span>
              </div>
            </div>

            {/* 6. Disaster Recovery & Local Backups */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1]'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Database className="w-5 h-5 text-amber-400" />
                  <span className="font-mono text-xs font-bold text-amber-400">.json (SHA-256)</span>
                </div>
                <h4 className="font-bold text-sm mb-1">Disaster Recovery Snapshots</h4>
                <p className={`text-xs mb-3 ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                  Export full store state snapshots with tamper-evident Web Crypto SHA-256 digests. Restore on any till machine.
                </p>
                <span className="inline-block text-[10px] font-mono text-amber-400 font-bold mb-3">Encrypted Local Backup</span>
              </div>
              <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onLaunchPos}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Open Backup Center</span>
                </button>
                <span className="text-[10px] text-gray-500 font-mono">Offline Safe</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LEGAL & OPERATIONAL CUSTODY NOTICE ═══ */}
      <section className={`py-12 px-4 sm:px-8 border-t ${
        isDark ? 'border-[#282B34] bg-[#16181F]' : 'border-[#CBD5E1] bg-white'
      }`}>
        <div className="max-w-4xl mx-auto text-left">
          <div className="flex items-center gap-2.5 mb-3">
            <Scale className="w-5 h-5 text-[#FF4500]" />
            <h3 className="font-bold text-sm sm:text-base">Developer Non-Liability &amp; Merchant Sole Custody</h3>
          </div>
          <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-[#9CA3AF]' : 'text-[#475569]'}`}>
            Akwaaba POS &amp; Retail OS is software engineered on an "as-is" basis. Merchants maintain sole custody and accountability for physical cash register counts, MoMo verification on physical SIM handsets, PIN safeguarding, and GRA tax compliance. The developer is not liable for cash variances, Dumsor spoilage losses, or third-party printhead hardware failures.
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <a href="https://github.com/Mazonia/pos-n-sales-system/issues" target="_blank" rel="noopener noreferrer" className="text-[#FF4500] hover:underline flex items-center gap-1">
              <span>Submit Complaints on GitHub Issues</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className={isDark ? 'text-[#6B7280]' : 'text-[#CBD5E1]'}>•</span>
            <span className={isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}>Local-First Data Sovereignty</span>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className={`py-8 px-4 sm:px-8 border-t text-center text-xs ${
        isDark ? 'border-[#282B34] bg-[#121316] text-[#9CA3AF]' : 'border-[#CBD5E1] bg-[#EBEEF2] text-[#64748B]'
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>Akwaaba POS &amp; Retail OS &bull; Engineered by <strong>Mazonia</strong></span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onLaunchPos} className="text-[#FF4500] font-bold hover:underline cursor-pointer">
              Launch POS Terminal
            </button>
            <span>•</span>
            <a href="https://github.com/Mazonia/pos-n-sales-system/releases/tag/v1.0.0" target="_blank" rel="noopener noreferrer" className="text-[#FF4500] font-bold hover:underline cursor-pointer">
              Releases (v1.0.0)
            </a>
            <span>•</span>
            <a href="https://github.com/Mazonia/pos-n-sales-system/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
              GitHub Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
