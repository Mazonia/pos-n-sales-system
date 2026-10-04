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
  ExternalLink
} from 'lucide-react';
import { formatGhs } from '../../utils/ghanaTaxEngine';

interface ProductLandingPageProps {
  onLaunchPos: () => void;
  onOpenDownloads: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const ProductLandingPage: React.FC<ProductLandingPageProps> = ({
  onLaunchPos,
  onOpenDownloads,
  isDark,
  onToggleTheme,
}) => {
  const [activeFeatureTab, setActiveFeatureTab] = useState<'POS' | 'INVENTORY' | 'BISA' | 'SHIFTS'>('POS');

  const capabilities = [
    {
      icon: Zap,
      title: 'Dumsor Resilience & Local Persistence',
      description: 'Zero data loss when grid power drops unexpectedly. Transactions, cart sessions, and till reconciliations persist locally via IndexedDB with automatic background cloud sync when connectivity returns.',
      badge: 'Offline-First',
    },
    {
      icon: Receipt,
      title: 'GRA VSDC Statutory Fiscalization',
      description: 'Built-in Ghana Revenue Authority tax engine supporting Standard VAT (21.90% compounded), Retail Flat Rate (4.0%), and SME exemptions. Prints cryptographic QR verification codes on 80mm and 58mm thermal receipts.',
      badge: 'Tax Compliant',
    },
    {
      icon: Smartphone,
      title: 'Unified Mobile Money Architecture',
      description: 'Integrated transaction workflows for MTN Mobile Money, Telecel Cash, and AT Money with transaction reference validation, payment split capabilities, and USSD cash-out fallbacks.',
      badge: 'MoMo Native',
    },
    {
      icon: Boxes,
      title: 'Bulk Fractional Breakdown (UOM)',
      description: 'Deconstruct wholesale 50kg sacks of rice, sugar, or grain into retail olonkas, cups, and fractional kg consumer portions with atomic inventory decrementing and margin protection.',
      badge: 'Ghana Retail',
    },
    {
      icon: Flame,
      title: 'Cold-Store Spoilage & FIFO Sentinel',
      description: 'Automated color-coded shelf-life tracking for perishable goods. Generates supervisor-signed spoilage loss certificates recognized by GRA for corporate inventory write-offs.',
      badge: 'FIFO Audit',
    },
    {
      icon: ShieldCheck,
      title: 'Zero Native Browser Dialogs',
      description: 'Completely custom notification engine with pleasant Web Audio synthesizer chimes, mobile haptic vibrations, and granular channel preference controls across all operating systems.',
      badge: 'Zero Alerts',
    },
  ];

  const platforms = [
    { name: 'Windows Desktop', ext: '.exe', desc: 'Standalone NSIS installer for PC counters & workstations', icon: Laptop, status: 'Production Ready' },
    { name: 'Apple macOS', ext: '.dmg', desc: 'Optimized binary for Apple Silicon (M1-M4) & Intel Macs', icon: Laptop, status: 'Universal Binary' },
    { name: 'Android Tablet', ext: '.apk', desc: 'Full sensor screen rotation for cashier stands & mobile tellers', icon: Tablet, status: 'Rotatable Touch' },
    { name: 'Apple iPad', ext: 'iPadOS', desc: 'Optimized touch gestures, drawer navigation & portrait/landscape', icon: Tablet, status: 'Retina Ready' },
  ];

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-200 ${
      isDark ? 'bg-[#121316] text-[#F4F4F6]' : 'bg-[#EBEEF2] text-[#0F172A]'
    }`}>
      
      {/* ═══ SHOWCASE HEADER ═══ */}
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
                OS
              </span>
            </div>
            <span className={`text-[10px] block ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
              Engineered by <strong className="text-[#FF4500]">Mazonia</strong>
            </span>
          </div>
        </div>

        {/* Navigation & Actions */}
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
      <section className="relative px-4 sm:px-8 pt-12 pb-16 max-w-6xl mx-auto w-full text-center">
        
        {/* Developer Attribution & Ghanaian Retail Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-6 text-xs font-semibold backdrop-blur-sm border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500] dark:text-[#FF5722]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Ghanaian Retail OS • Built by Mazonia</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.15]">
          The Operating System Built for the Physical Realities of <span className="text-[#FF4500]">African Commerce</span>
        </h1>

        <p className={`mt-5 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
          isDark ? 'text-[#9CA3AF]' : 'text-[#475569]'
        }`}>
          Offline-first, Dumsor-resilient, and statutory GRA VSDC compliant. Runs flawlessly on Windows desktop PCs, MacBooks, Android tablets, iPads, and modern web browsers.
        </p>

        {/* Dual Primary Call to Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={onLaunchPos}
            className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-[#FF4500] hover:bg-[#E03E00] text-white flex items-center gap-2 transition active:scale-95 shadow-xl shadow-[#FF4500]/25 cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <span>Open Cashier Terminal</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            type="button"
            onClick={onOpenDownloads}
            className={`px-6 py-3.5 rounded-2xl font-bold text-sm border flex items-center gap-2 transition active:scale-95 cursor-pointer ${
              isDark 
                ? 'border-[#282B34] bg-[#1A1C22] text-[#F4F4F6] hover:bg-[#22252E]' 
                : 'border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-slate-50 shadow-xs'
            }`}
          >
            <Download className="w-4 h-4 text-[#FF4500]" />
            <span>Get Desktop &amp; Tablet Apps</span>
          </button>
        </div>

        {/* ═══ INTERACTIVE TERMINAL PREVIEW ═══ */}
        <div className="mt-12 rounded-3xl border overflow-hidden shadow-2xl transition-all border-[#282B34] bg-[#16181F] text-left">
          {/* Mock Window Top Bar */}
          <div className="px-4 py-3 border-b border-[#282B34] bg-[#121316] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-[11px] text-[#9CA3AF]">
                Akwaaba POS Terminal — Accra Central Hub Store [Online / Dexie Offline Ready]
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#00CED1] font-mono font-bold">
              <span>● GRA VSDC ACTIVE</span>
            </div>
          </div>

          {/* Terminal Screen Simulation */}
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left 2 Cols: Product Catalog & Fast Grid */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#282B34]">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Fast Item Lookup</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#FF4500]/20 text-[#FF5722] border border-[#FF4500]/30 font-mono">
                    Ctrl + K
                  </span>
                </div>
                <span className="text-[11px] text-[#9CA3AF]">Retail &amp; Wholesale Mode Ready</span>
              </div>

              {/* Sample Product Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { name: 'Royal Feast Perfumed Rice 50kg', uom: 'Whole Sack', price: 920.00, tag: 'Bulk Stock' },
                  { name: 'Royal Feast Rice (1 Olonka)', uom: 'Fractional UOM', price: 55.00, tag: 'Deconstructed' },
                  { name: 'Gino Tomato Paste 2.2kg', uom: 'Tin', price: 78.50, tag: 'Fast Mover' },
                  { name: 'Frytol Vegetable Cooking Oil 5L', uom: 'Gallon', price: 185.00, tag: 'FIFO Safe' },
                  { name: 'Ideal Evaporated Milk 160g', uom: 'Can', price: 8.50, tag: 'Provisions' },
                  { name: 'Cowbell Instant Milk Powder 400g', uom: 'Pouch', price: 24.00, tag: 'Breakfast' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-[#282B34] bg-[#121316] hover:border-[#FF4500]/50 transition text-left">
                    <span className="text-[9.5px] font-mono font-bold uppercase text-[#FF4500] block">{item.tag}</span>
                    <div className="font-bold text-xs text-white truncate mt-1">{item.name}</div>
                    <div className="text-[10px] text-[#9CA3AF] mt-0.5">{item.uom}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-white">{formatGhs(item.price)}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-[#FF4500]/15 text-[#FF4500] font-bold">+ Cart</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Fiscal Receipt Ledger */}
            <div className="rounded-2xl border border-[#282B34] bg-[#121316] p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#282B34] text-xs">
                  <span className="font-bold text-white">Cart Ledger #ORD-2026</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Tax: STANDARD 21.9%</span>
                </div>
                <div className="space-y-2 py-3 text-xs border-b border-[#282B34]">
                  <div className="flex justify-between">
                    <span>1x Royal Feast 50kg Rice</span>
                    <span className="font-mono font-bold">GH₵ 920.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2x Frytol Oil 5L</span>
                    <span className="font-mono font-bold">GH₵ 370.00</span>
                  </div>
                  <div className="flex justify-between text-[#9CA3AF] text-[11px]">
                    <span>Subtotal</span>
                    <span className="font-mono">GH₵ 1,290.00</span>
                  </div>
                  <div className="flex justify-between text-[#00CED1] text-[11px]">
                    <span>GRA VAT (15%) + NHIL + GETFund + COVID</span>
                    <span className="font-mono">GH₵ 282.51</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-xs uppercase text-[#9CA3AF] font-bold">Payable Total</span>
                  <span className="text-xl font-bold font-mono text-[#FF4500]">GH₵ 1,572.51</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={onLaunchPos}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#FF4500] text-white hover:bg-[#E03E00] transition cursor-pointer"
                  >
                    Cash Tendered
                  </button>
                  <button 
                    type="button"
                    onClick={onLaunchPos}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#008B8B]/20 border border-[#00CED1]/40 text-[#00CED1] hover:bg-[#008B8B]/30 transition cursor-pointer"
                  >
                    MoMo (MTN/Tel)
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══ CAPABILITIES GRID ═══ */}
      <section className={`py-16 px-4 sm:px-8 border-t ${
        isDark ? 'border-[#282B34] bg-[#16181F]/50' : 'border-[#CBD5E1] bg-white'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono font-bold uppercase text-[#FF4500]">Built For High Performance</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1.5">
              Engineered to Overcome Real African Retail Bottlenecks
            </h2>
            <p className={`mt-2 text-xs sm:text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
              From rolling blackouts and erratic cellular coverage to statutory tax audits and bulk fractional sacks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <div 
                  key={i}
                  className={`p-6 rounded-2xl border transition-all hover:border-[#FF4500]/50 ${
                    isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-[#EBEEF2]/60 border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/20 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#FF4500]/10 text-[#FF4500] dark:text-[#FF5722] border border-[#FF4500]/20">
                      {cap.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm mb-2">{cap.title}</h3>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9CA3AF]' : 'text-[#475569]'}`}>
                    {cap.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ MULTI-PLATFORM DOWNLOAD MATRIX ═══ */}
      <section className={`py-16 px-4 sm:px-8 border-t ${
        isDark ? 'border-[#282B34] bg-[#121316]' : 'border-[#CBD5E1] bg-[#EBEEF2]/50'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-[#FF4500]">Multi-Platform Suite</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                One Clean Codebase, Native on Every Device
              </h2>
              <p className={`mt-1.5 text-xs sm:text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                Download desktop installers or deploy to tablets in retail counters.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenDownloads}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-[#FF4500] text-[#FF4500] hover:bg-[#FF4500] hover:text-white transition cursor-pointer self-start md:self-auto"
            >
              View All Platform Binaries
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platforms.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div 
                  key={idx}
                  className={`p-5 rounded-2xl border flex flex-col justify-between ${
                    isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-[#CBD5E1]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="w-5 h-5 text-[#FF4500]" />
                      <span className="font-mono text-xs font-bold text-[#00CED1]">{p.ext}</span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{p.name}</h4>
                    <p className={`text-xs mb-4 ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                      {p.desc}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{p.status}</span>
                    <button
                      type="button"
                      onClick={onOpenDownloads}
                      className="text-xs font-bold text-[#FF4500] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Install</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ LEGAL TRANSPARENCY & COMPLIANCE ═══ */}
      <section className={`py-12 px-4 sm:px-8 border-t ${
        isDark ? 'border-[#282B34] bg-[#16181F]' : 'border-[#CBD5E1] bg-white'
      }`}>
        <div className="max-w-4xl mx-auto text-left">
          <div className="flex items-center gap-2.5 mb-3">
            <Scale className="w-5 h-5 text-[#FF4500]" />
            <h3 className="font-bold text-sm sm:text-base">Merchant Custody &amp; Developer Liability Notice</h3>
          </div>
          <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-[#9CA3AF]' : 'text-[#475569]'}`}>
            Akwaaba POS &amp; Retail OS is software provided by developer <strong>Mazonia</strong> on an "as-is" basis. Merchants maintain sole custody and accountability for cash drawer balances, MoMo verification on physical SIM handsets, PIN safeguarding, and GRA tax compliance. Developer Mazonia is not liable for cash discrepancies, Dumsor spoilage losses, or third-party hardware printhead failures.
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <a href="https://github.com/Mazonia/pos-n-sales-system/issues" target="_blank" rel="noopener noreferrer" className="text-[#FF4500] hover:underline flex items-center gap-1">
              <span>File Bug Reports on GitHub Issues</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className={isDark ? 'text-[#6B7280]' : 'text-[#CBD5E1]'}>•</span>
            <span className={isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}>Local-First Data Sovereignty (IndexedDB Encrypted)</span>
          </div>
        </div>
      </section>

      {/* ═══ SHOWCASE FOOTER ═══ */}
      <footer className={`py-8 px-4 sm:px-8 border-t text-center text-xs ${
        isDark ? 'border-[#282B34] bg-[#121316] text-[#9CA3AF]' : 'border-[#CBD5E1] bg-[#EBEEF2] text-[#64748B]'
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>Akwaaba POS &amp; Retail OS • Engineered by <strong>Mazonia</strong></span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onLaunchPos} className="text-[#FF4500] font-bold hover:underline cursor-pointer">
              Launch POS
            </button>
            <span>•</span>
            <button type="button" onClick={onOpenDownloads} className="text-[#FF4500] font-bold hover:underline cursor-pointer">
              Downloads
            </button>
            <span>•</span>
            <a href="https://github.com/Mazonia/pos-n-sales-system" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
