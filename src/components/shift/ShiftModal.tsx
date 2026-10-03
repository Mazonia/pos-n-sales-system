import React, { useState } from 'react';
import { LocalShift } from '../../utils/dexieSync';
import {
  ShiftSummaryReport,
  generateXReport,
  closeShiftAndGenerateZReport,
  recordCashDrop,
  calculateDenominationTotal,
  DenominationBreakdown
} from '../../utils/shiftManager';
import { formatGhs } from '../../utils/ghanaTaxEngine';
import {
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Printer,
  X,
  CheckCircle2,
  Lock,
  Flame,
  Info,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  Banknote,
  Smartphone,
  BookOpen,
  Calendar,
  Clock,
  User,
  Hash,
  Sparkles,
  Loader2
} from 'lucide-react';
import { OfficialPrintPortal, printOfficialDocument } from '../common/OfficialPrintPortal';
import { triggerHaptic } from '../../utils/haptics';

interface ShiftModalProps {
  shift: LocalShift;
  cashierRole: string;
  isDark?: boolean;
  onClose: () => void;
  onShiftClosed: (closedReport: ShiftSummaryReport) => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  shift,
  onClose,
  onShiftClosed,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CASH_DROP' | 'X_REPORT' | 'Z_CLOSE'>('OVERVIEW');
  const [showHelpBanner, setShowHelpBanner] = useState<boolean>(true);

  // Cash Drop Form State
  const [dropType, setDropType] = useState<'PAY_IN' | 'PAY_OUT' | 'SAFE_DEPOSIT'>('PAY_OUT');
  const [dropAmount, setDropAmount] = useState<number>(50);
  const [dropReason, setDropReason] = useState<string>('Emergency fuel for generator (Dumsor outage)');
  const [isDropSuccess, setIsDropSuccess] = useState(false);

  // Dynamic configurations for Cash Movements (Pay-Out, Safe Deposit, Pay-In)
  const movementConfigs: Record<'PAY_OUT' | 'SAFE_DEPOSIT' | 'PAY_IN', {
    label: string;
    placeholder: string;
    defaultReason: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    badgeStyle: string;
    title: string;
    description: string;
    cashImpact: string;
  }> = {
    PAY_OUT: {
      label: 'Pay-Out (Store Expense)',
      placeholder: 'e.g. 50 Litres Diesel for Generator during Dumsor / Pure Water bags / Store cleaning supplies',
      defaultReason: 'Emergency fuel for generator (Dumsor outage)',
      icon: Flame,
      iconColor: 'text-[#FF4500]',
      badgeStyle: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      title: 'Dumsor Resilience & Store Operational Expenses:',
      description: 'Expenses like generator fuel during grid power outages, ice blocks for perishable chillers, and emergency bags are recorded as certified petty cash write-offs. This legitimately reduces the expected cash in your till.',
      cashImpact: `-GH₵ ${dropAmount.toFixed(2)} (Deducted from Drawer Cash)`,
    },
    SAFE_DEPOSIT: {
      label: 'Safe Deposit (Anti-Theft Skim)',
      placeholder: 'e.g. Skimmed 10x GH₵100 high-value notes to main branch vault for anti-theft security',
      defaultReason: 'Anti-theft cash skim: High-denomination notes moved to main vault',
      icon: ShieldCheck,
      iconColor: 'text-amber-400',
      badgeStyle: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      title: 'Anti-Theft Counter Safe Skim:',
      description: 'Transferring large notes (GH₵200, GH₵100) from the drawer to the drop-safe protects the cashier, limits robbery liability, and maintains safe drawer cash levels during peak trading hours.',
      cashImpact: `-GH₵ ${dropAmount.toFixed(2)} (Transferred to Main Vault)`,
    },
    PAY_IN: {
      label: 'Pay-In (Float Replenishment)',
      placeholder: 'e.g. Replenished GH₵200 small change from manager safe (GH₵5, GH₵2 notes & 1 GHS coins)',
      defaultReason: 'Small change replenishment: Fresh coins & small notes added from manager safe',
      icon: Banknote,
      iconColor: 'text-emerald-400',
      badgeStyle: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      title: 'Small Change Float Replenishment:',
      description: 'Adding fresh small coins (50 Pesewas, 1 GHS, 2 GHS) or small notes from the branch safe ensures cashiers can always provide quick, exact change to customers without delaying queues.',
      cashImpact: `+GH₵ ${dropAmount.toFixed(2)} (Added to Drawer Cash)`,
    },
  };

  const handleSelectDropType = (type: 'PAY_IN' | 'PAY_OUT' | 'SAFE_DEPOSIT') => {
    const isOldReasonDefault = !dropReason || Object.values(movementConfigs).some(c => c.defaultReason === dropReason);
    setDropType(type);
    if (isOldReasonDefault) {
      setDropReason(movementConfigs[type].defaultReason);
    }
  };

  // X-Report State
  const [xReport, setXReport] = useState<ShiftSummaryReport | null>(null);

  // Z-Report Closure State & Denominations
  const [denoms, setDenoms] = useState<DenominationBreakdown>({
    note200: 0,
    note100: 0,
    note50: 0,
    note20: 0,
    note10: 0,
    note5: 0,
    note2: 0,
    note1: 0,
    coinsPesewas: 0,
  });
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [managerPin, setManagerPin] = useState<string>('');
  const [zReportResult, setZReportResult] = useState<ShiftSummaryReport | null>(null);
  const [isClosingShift, setIsClosingShift] = useState(false);

  const countedPhysicalCash = calculateDenominationTotal(denoms);

  const handleLoadXReport = async () => {
    const report = await generateXReport(shift.id);
    setXReport(report);
  };

  const handleSaveCashDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dropAmount <= 0) return;

    await recordCashDrop(shift.id, {
      type: dropType,
      amount: dropAmount,
      reason: dropReason,
    });

    setIsDropSuccess(true);
    setTimeout(() => {
      setIsDropSuccess(false);
      setActiveTab('OVERVIEW');
    }, 1500);
  };

  const handleExecuteShiftClose = async () => {
    setIsClosingShift(true);
    try {
      const report = await closeShiftAndGenerateZReport({
        shiftId: shift.id,
        countedCashPhysical: countedPhysicalCash,
        managerPin,
        closingNotes,
      });

      triggerHaptic('success');
      setZReportResult(report);
    } catch (err: any) {
      console.error('Error closing shift:', err);
      alert(err?.message ? `Failed to lock till: ${err.message}` : 'Failed to lock till. Please check inputs and try again.');
    } finally {
      setIsClosingShift(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto no-print">
        <div className="glass-panel-dark border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <span>Till & Shift Management ({shift.shiftNumber})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Cashier: <span className="text-white font-medium">{shift.cashierName}</span> · Opened:{' '}
              {new Date(shift.openedAt).toLocaleTimeString('en-GH')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHelpBanner(!showHelpBanner)}
              className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 transition cursor-pointer"
              title="Toggle beginner explanations"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showHelpBanner ? 'Hide Guide' : 'Explain This Screen'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Friendly Beginner Guide Explainer Banner */}
        {showHelpBanner && (
          <div className="p-3.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold text-amber-300">How Till & Shift Management Works:</strong>
              <p className="text-[11px] leading-relaxed text-amber-100/90">
                A <strong>Shift</strong> is your official work session on this cash register till. The system tracks all the paper money, coins, and mobile money you collect from sales. When you finish work, you count the physical money in your drawer to make sure it matches what was sold. This protects you and the store from cash discrepancies.
              </p>
            </div>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex bg-black/40 border-b border-white/[0.08] text-xs font-semibold overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: '1. Till Overview & Balance' },
            { id: 'CASH_DROP', label: '2. Cash Movements (Pay-Out)' },
            { id: 'X_REPORT', label: '3. Mid-Day X-Report' },
            { id: 'Z_CLOSE', label: '4. Shift Close (Z-Report)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'X_REPORT') handleLoadXReport();
              }}
              className={`flex-1 py-3 px-3 border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400 bg-white/[0.02]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="p-5 space-y-4">
            {/* Explanatory Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] relative group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10.5px] font-bold text-slate-300">Starting Float</span>
                  <Banknote className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-base font-bold font-mono text-white block">{formatGhs(shift.openingFloat)}</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Small change put in the drawer in the morning to give customers change.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] relative group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10.5px] font-bold text-emerald-400">Cash Sales</span>
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-base font-bold font-mono text-emerald-400 block">{formatGhs(shift.cashSales)}</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Total physical paper notes & coins collected into your drawer from sales.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] relative group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10.5px] font-bold text-amber-400">MoMo Sales</span>
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-base font-bold font-mono text-amber-400 block">{formatGhs(shift.momoSales)}</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Paid via Mobile Money (MTN/Telecel/AT). This is in the merchant wallet, not in the till.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] relative group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10.5px] font-bold text-sky-400">Bisa Debt</span>
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <span className="text-base font-bold font-mono text-slate-300 block">{formatGhs(shift.debtSales)}</span>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Customer store credit. No money entered the till today; settled later.
                </p>
              </div>
            </div>

            {/* Expected Physical Cash Card with Formula Explanation */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-300 font-bold block flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Expected Physical Cash in Drawer Right Now:</span>
                  </span>
                  <span className="text-[10.5px] text-slate-400 block mt-0.5">
                    Formula: (Starting Float + Cash Sales − Pay-Out Expenses = What must be in drawer)
                  </span>
                </div>
                <span className="text-2xl font-black font-mono text-amber-400">
                  {formatGhs(shift.expectedCashInTill)}
                </span>
              </div>
              <div className="pt-2 border-t border-amber-500/20 text-[11px] text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  When closing your shift in Tab 4, your counted physical cash must equal this amount.
                </span>
              </div>
            </div>

            {/* Mid-Shift Movements */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Mid-Shift Cash Movements (Petty Cash & Safe Drops):</span>
                <span className="text-[10.5px] text-slate-500">Expenses or change added mid-day</span>
              </div>
              {shift.cashDrops.length === 0 ? (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-500 text-center italic">
                  No cash movements recorded yet. (To record fuel or water expenses, use Tab 2 above).
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {shift.cashDrops.map(drop => (
                    <div
                      key={drop.id}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {drop.type === 'PAY_IN' ? (
                          <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowUpCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <div>
                          <span className="font-semibold text-white">
                            {drop.type === 'PAY_IN' ? 'Pay-In (Added Float)' : drop.type === 'PAY_OUT' ? 'Pay-Out (Shop Expense)' : 'Safe Deposit (Skim)'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{drop.reason}</span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold ${drop.type === 'PAY_IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {drop.type === 'PAY_IN' ? '+' : '-'}{formatGhs(drop.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CASH DROP */}
        {activeTab === 'CASH_DROP' && (
          <form onSubmit={handleSaveCashDrop} className="p-5 space-y-4">
            {/* Educational Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <HelpCircle className="w-4 h-4" />
                <span>Why Record Cash Movements Mid-Shift?</span>
              </div>
              <p className="text-[11px] text-amber-100/90 leading-relaxed">
                If you take cash from the drawer to buy generator fuel during a Dumsor power cut or pure water for staff, recording it here tells the system where the money went so it is <strong>NOT</strong> counted as a cash shortage when you close your shift!
              </p>
            </div>

            {/* Movement Type Buttons */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold block">Select Movement Type:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectDropType('PAY_OUT')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    dropType === 'PAY_OUT' ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-xs' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <ArrowUpCircle className="w-4 h-4 text-rose-400" />
                    <span>Pay-Out (Expense)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Taking till cash to pay for Dumsor fuel, water, bags, or emergency supplies.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDropType('SAFE_DEPOSIT')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    dropType === 'SAFE_DEPOSIT' ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-xs' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Safe Deposit (Skim)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Transferring large bills (₵200/₵100) to the store safe for anti-theft security.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDropType('PAY_IN')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    dropType === 'PAY_IN' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-xs' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                    <span>Pay-In (Add Float)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Adding fresh small change from the manager when you run low on ₵5 or ₵2 notes.
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1">Amount to Move (GH₵):</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">GH₵</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={dropAmount || ''}
                  onChange={e => setDropAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl font-mono text-base font-bold text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1">Reason / Expense Memo (Required for Audit):</label>
              <input
                type="text"
                required
                value={dropReason}
                onChange={e => setDropReason(e.target.value)}
                placeholder={movementConfigs[dropType].placeholder}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-400"
              />
              <div className={`p-3 rounded-xl border ${movementConfigs[dropType].badgeStyle} text-xs space-y-1.5 mt-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    {React.createElement(movementConfigs[dropType].icon, { className: `w-4 h-4 ${movementConfigs[dropType].iconColor}` })}
                    <span>{movementConfigs[dropType].title}</span>
                  </div>
                  <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-full bg-black/40">
                    {movementConfigs[dropType].cashImpact}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {movementConfigs[dropType].description}
                </p>
              </div>
            </div>

            {isDropSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Cash movement successfully recorded! Till expected balance has been updated.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={dropAmount <= 0}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-xs transition cursor-pointer shadow-md"
            >
              Record Cash Movement & Update Till
            </button>
          </form>
        )}

        {/* TAB 3: X-REPORT */}
        {activeTab === 'X_REPORT' && (
          <div className="p-5 space-y-4">
            {/* Educational Banner */}
            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-400">
                <BookOpen className="w-4 h-4" />
                <span>What is a Mid-Day X-Report?</span>
              </div>
              <p className="text-[11px] text-sky-100/90 leading-relaxed">
                An <strong>X-Report</strong> is an official interim snapshot of your sales so far. It shows orders completed, cash vs MoMo breakdown, and expected drawer money <strong>WITHOUT</strong> locking or closing your till. You can inspect and print an X-Report at any time (e.g. at lunch break or change of shifts).
              </p>
            </div>

            {xReport ? (
              <div className="bg-white text-slate-900 rounded-2xl border border-slate-300 p-5 shadow-lg space-y-4 font-sans">
                {/* Official Corporate Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-3">
                  <div>
                    <h3 className="font-serif font-black text-sm uppercase tracking-tight text-black">
                      AKWAABA RETAIL SYSTEMS & WHOLESALE LTD.
                    </h3>
                    <p className="text-[10px] text-gray-600 font-medium">Central Retail Operations • Store Terminal #01</p>
                    <p className="text-[9px] text-gray-500 font-mono">Digital Address: GA-183-9022, Accra Central • GRA TIN: C0029482190</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-gray-50 text-black">
                      OFFICIAL VOUCHER
                    </span>
                    <div className="text-[11px] font-black text-[#008285] font-mono mt-0.5">
                      INTERIM X-REPORT
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Shift Number</div>
                    <div className="font-mono font-bold text-slate-900">{xReport.shiftNumber}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Cashier: <strong className="text-slate-900 font-serif">{xReport.cashierName}</strong></div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Audit Inspection Status</div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ACTIVE (TILL OPEN)
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">Completed Sales: <strong className="font-mono">{xReport.totalOrders}</strong></div>
                  </div>
                </div>

                {/* Accounting Channel Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Till Revenue Channel / Balance Item</th>
                        <th className="p-2.5 text-right">Amount (GHS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-slate-800">Opening Starting Float</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatGhs(xReport.openingFloat)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-emerald-800">Cash Sales Collected (In Drawer)</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">+{formatGhs(xReport.cashSales)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-amber-800">Mobile Money Sales (MTN / Telecel / AT)</td>
                        <td className="p-2.5 text-right font-bold text-amber-700">{formatGhs(xReport.momoSales)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-blue-800">Card / POS Terminal Payments</td>
                        <td className="p-2.5 text-right font-bold text-blue-700">{formatGhs(xReport.cardSales)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-purple-800">Bisa Debt Sales (Store Credit)</td>
                        <td className="p-2.5 text-right font-bold text-purple-700">{formatGhs(xReport.debtSales)}</td>
                      </tr>
                      {xReport.payInsTotal > 0 && (
                        <tr>
                          <td className="p-2.5 font-sans font-medium text-teal-800">Add: Cash Float Replenishment (Paid-In)</td>
                          <td className="p-2.5 text-right font-bold text-teal-700">+{formatGhs(xReport.payInsTotal)}</td>
                        </tr>
                      )}
                      {xReport.payOutsTotal > 0 && (
                        <tr>
                          <td className="p-2.5 font-sans font-medium text-rose-800">Less: Petty Expenses / Dumsor Fuel (Paid-Out)</td>
                          <td className="p-2.5 text-right font-bold text-rose-700">-{formatGhs(xReport.payOutsTotal)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-black font-mono">
                      <tr>
                        <td className="p-3 font-sans font-black uppercase text-xs text-black">
                          Expected Physical Cash In Drawer:
                        </td>
                        <td className="p-3 text-right font-black text-sm text-[#008285]">
                          {formatGhs(xReport.expectedCashInTill)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Audit Sign-off Preview */}
                <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-200 text-[10px] text-slate-500">
                  <div>
                    <span className="block border-b border-slate-300 w-36 mb-1"></span>
                    <span>Cashier Attendant: <strong>{xReport.cashierName}</strong></span>
                  </div>
                  <div className="text-right">
                    <span className="block border-b border-slate-300 w-36 ml-auto mb-1"></span>
                    <span>Supervisor / Store Auditor</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                Loading X-Report calculations...
              </div>
            )}

            {/* Print Official Mid-Day Document Button */}
            <button
              type="button"
              onClick={printOfficialDocument}
              className="w-full py-3 bg-[#008285] hover:bg-[#007073] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Mid-Day Audit Document</span>
            </button>
          </div>
        )}

        {/* TAB 4: Z-REPORT CLOSURE */}
        {activeTab === 'Z_CLOSE' && (
          <div className="p-5 space-y-4">
            {!zReportResult ? (
              <>
                {/* Educational Banner */}
                <div className="p-3.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <Lock className="w-4 h-4" />
                    <span>What is a Z-Report & End-of-Day Shift Close?</span>
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    A <strong>Z-Report</strong> is the permanent, official end-of-day closure of your register. Once generated, this shift is locked and cannot be reopened. You must count every cedi note and coin in your drawer. The system compares your count against the expected money to verify if there is any <strong>Shortage</strong> or <strong>Overage</strong>.
                  </p>
                </div>

                {/* Denomination Counter Guide */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Step 1: Count Currency Notes in Till</span>
                      <span className="text-[10px] text-slate-400">Enter quantity of notes you have in hand:</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      Total Counted: {formatGhs(countedPhysicalCash)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { key: 'note200', label: '₵200 note', val: 200 },
                      { key: 'note100', label: '₵100 note', val: 100 },
                      { key: 'note50', label: '₵50 note', val: 50 },
                      { key: 'note20', label: '₵20 note', val: 20 },
                      { key: 'note10', label: '₵10 note', val: 10 },
                      { key: 'note5', label: '₵5 note', val: 5 },
                      { key: 'note2', label: '₵2 note', val: 2 },
                      { key: 'note1', label: '₵1 note/coin', val: 1 },
                    ].map(d => {
                      const qty = (denoms as any)[d.key] || 0;
                      const sub = qty * d.val;
                      return (
                        <div key={d.key} className="p-2 rounded-xl bg-black/40 border border-white/10">
                          <div className="flex justify-between items-center text-[10px]">
                            <label className="text-slate-300 font-semibold">{d.label}</label>
                            {sub > 0 && <span className="font-mono text-amber-400 text-[9px] font-bold">₵{sub}</span>}
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={(denoms as any)[d.key] || ''}
                            onChange={e =>
                              setDenoms(prev => ({
                                ...prev,
                                [d.key]: parseInt(e.target.value) || 0,
                              }))
                            }
                            className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-center font-mono text-white text-xs outline-none focus:border-amber-400"
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Small Coins Pesewas Total (GH₵):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={denoms.coinsPesewas || ''}
                    onChange={e => setDenoms(prev => ({ ...prev, coinsPesewas: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white outline-none focus:border-amber-400"
                    placeholder="e.g. 5.50 for pesewas"
                  />
                </div>

                {/* Step 2: Live Comparison & Variance Indicator */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Total Counted Physical Cash:</span>
                      <span className="font-mono text-base font-bold text-white">{formatGhs(countedPhysicalCash)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10.5px]">Expected Cash in Drawer:</span>
                      <span className="font-mono text-base font-bold text-amber-400">{formatGhs(shift.expectedCashInTill)}</span>
                    </div>
                  </div>

                  {/* Variance Calculation */}
                  {(() => {
                    const variance = countedPhysicalCash - shift.expectedCashInTill;
                    const isPerfect = Math.abs(variance) < 0.05;
                    const isShortage = variance < -0.05;
                    const isOverage = variance > 0.05;

                    return (
                      <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between font-serif font-bold ${
                        isPerfect
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : isShortage
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {isPerfect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isShortage ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Info className="w-4 h-4 text-amber-400" />
                          )}
                          <span>
                            {isPerfect
                              ? 'Exact Match: Drawer is perfectly balanced!'
                              : isShortage
                              ? `Cash Shortage: Drawer is missing ${formatGhs(Math.abs(variance))}`
                              : `Cash Overage: Drawer has extra ${formatGhs(variance)}`}
                          </span>
                        </div>
                        <span className="font-mono text-xs">
                          {variance >= 0 ? `+${formatGhs(variance)}` : `-${formatGhs(Math.abs(variance))}`}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Closing Notes */}
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Shift Handover Notes / Variance Explanation (Optional):</label>
                  <input
                    type="text"
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                    placeholder="e.g. Handed over till to Ama; 50 pesewas coin roundoff difference"
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="button"
                  disabled={isClosingShift}
                  onClick={handleExecuteShiftClose}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer active:scale-98"
                >
                  {isClosingShift ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Locking Cash Drawer & Generating Z-Report...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Lock Till, Finalize Cashier Accounts & Generate Z-Report</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                {/* Celebratory & Official Lock Confirmation Banner */}
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-3.5 shadow-lg">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-black text-sm text-emerald-300">TILL SUCCESSFULLY LOCKED & AUDITED</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-400 text-slate-950 font-black">
                        LOCKED
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100/90 mt-0.5 leading-snug">
                      Shift #{shift.shiftNumber} has been officially locked and finalized. Z-Report #{zReportResult.zReportNumber} has been permanently saved to the store audit ledger.
                    </p>
                  </div>
                </div>

                {/* Official Corporate Z-Report Voucher Card */}
                <div className="bg-white text-slate-900 rounded-2xl border border-slate-300 p-5 shadow-lg space-y-3 font-sans">
                  <div className="flex justify-between items-start border-b-2 border-black pb-3">
                    <div>
                      <h4 className="font-serif font-black text-sm uppercase text-black">
                        AKWAABA RETAIL SYSTEMS LTD.
                      </h4>
                      <p className="text-[10px] text-gray-600">Accra Central Mall Store • Terminal #01 • GRA TIN: C0029482190</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-800">
                        FINAL CLOSURE
                      </span>
                      <div className="text-[11px] font-black text-rose-600 font-mono mt-0.5">
                        DAILY Z-REPORT
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block">Z-Report Voucher No:</span>
                      <strong className="text-slate-900 text-xs">{zReportResult.zReportNumber}</strong>
                      <span className="text-[10px] text-slate-500 block mt-1">Closed: {new Date(zReportResult.closedAt).toLocaleTimeString('en-GH')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block">Till Audit Status:</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        zReportResult.varianceStatus === 'BALANCED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : zReportResult.varianceStatus === 'SHORTAGE'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {zReportResult.varianceStatus}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1">Orders: {zReportResult.totalOrders}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono border-t border-b border-slate-200 py-3">
                    <div className="flex justify-between text-slate-700">
                      <span className="font-sans">Opening Starting Float:</span>
                      <span>{formatGhs(zReportResult.openingFloat)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span className="font-sans">Expected Drawer Cash:</span>
                      <span>{formatGhs(zReportResult.expectedCashInTill)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span className="font-sans">Counted Physical Cash:</span>
                      <span>{formatGhs(zReportResult.countedCashPhysical || 0)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-300">
                      <span className="font-sans">Cash Discrepancy / Variance:</span>
                      <span className={
                        zReportResult.cashVariance === 0
                          ? 'text-emerald-700'
                          : zReportResult.cashVariance! < 0
                          ? 'text-rose-700'
                          : 'text-amber-700'
                      }>
                        {zReportResult.cashVariance! >= 0 ? `+${formatGhs(zReportResult.cashVariance!)}` : `-${formatGhs(Math.abs(zReportResult.cashVariance!))}`}
                      </span>
                    </div>
                  </div>

                  {zReportResult.closingNotes && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                      <strong className="block text-[10px] uppercase text-slate-500 font-bold mb-0.5">Handover Notes:</strong>
                      <span>{zReportResult.closingNotes}</span>
                    </div>
                  )}
                </div>

                {/* Final Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={printOfficialDocument}
                    className="flex-1 py-3 bg-[#008285] hover:bg-[#007073] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-98"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Official Z-Report Voucher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onShiftClosed(zReportResult);
                      onClose();
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Handover & Open Next Shift</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>

    {/* OFFICIAL PRINTABLE MID-DAY X-REPORT (A4 / SLIP VECTOR DOCUMENT) */}
    {activeTab === 'X_REPORT' && xReport && (
      <OfficialPrintPortal active={true}>
        <div className="official-printable-doc p-8 font-sans text-black bg-white max-w-2xl mx-auto">
          {/* Corporate Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-5">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-black">
                AKWAABA RETAIL SYSTEMS LTD.
              </h1>
              <p className="text-xs text-gray-700 font-medium">Accra Central Mall Branch • Store Terminal #01</p>
              <p className="text-xs text-gray-700">Digital Address: GA-183-9022, Accra Central, Ghana</p>
              <p className="text-xs text-gray-700 font-mono font-bold">GRA TIN: C0029482190 | e-VAT POS COMPLIANT</p>
            </div>
            <div className="text-right">
              <div className="inline-block border-2 border-black px-3 py-1 bg-gray-50 text-center">
                <span className="block text-[9px] uppercase font-bold tracking-wider text-gray-600">AUDIT DOCUMENT</span>
                <span className="text-sm font-black text-black">INTERIM X-REPORT</span>
              </div>
              <p className="text-xs font-mono mt-1 text-gray-700">
                Printed: {new Date().toLocaleString('en-GH')}
              </p>
            </div>
          </div>

          {/* Shift Context Box */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 border border-gray-300 rounded mb-5 text-xs">
            <div>
              <p><strong>Shift Number:</strong> <span className="font-mono">{xReport.shiftNumber}</span></p>
              <p><strong>Cashier / Attendant:</strong> {xReport.cashierName}</p>
              <p><strong>Opened At:</strong> {new Date(shift.openedAt).toLocaleString('en-GH')}</p>
            </div>
            <div className="text-right">
              <p><strong>Audit Mode:</strong> Mid-Day Unfinalized Inspection</p>
              <p><strong>Completed Orders:</strong> <span className="font-bold font-mono">{xReport.totalOrders}</span></p>
              <p><strong>Status:</strong> Active Register</p>
            </div>
          </div>

          {/* Revenue Breakdown Table */}
          <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-5">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-[10px]">
                <th className="p-2 border border-gray-300">Revenue Channel / Till Category</th>
                <th className="p-2 border border-gray-300 text-right">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              <tr>
                <td className="p-2 font-sans font-medium">Opening Cash Float</td>
                <td className="p-2 text-right">{formatGhs(xReport.openingFloat)}</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-medium">Cash Collected at Till</td>
                <td className="p-2 text-right font-bold">{formatGhs(xReport.cashSales)}</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-medium">Mobile Money (MTN / Telecel / AT MoMo)</td>
                <td className="p-2 text-right">{formatGhs(xReport.momoSales)}</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-medium">Card / Bank POS Payments</td>
                <td className="p-2 text-right">{formatGhs(xReport.cardSales)}</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-medium">Bisa Customer Credit (Ledger Debt)</td>
                <td className="p-2 text-right">{formatGhs(xReport.debtSales)}</td>
              </tr>
              {xReport.totalPaidIn > 0 && (
                <tr>
                  <td className="p-2 font-sans font-medium text-emerald-800">Add: Additional Cash Paid-In</td>
                  <td className="p-2 text-right text-emerald-800">+{formatGhs(xReport.totalPaidIn)}</td>
                </tr>
              )}
              {xReport.totalPaidOut > 0 && (
                <tr>
                  <td className="p-2 font-sans font-medium text-rose-800">Less: Cash Drops / Expense Paid-Out</td>
                  <td className="p-2 text-right text-rose-800">-{formatGhs(xReport.totalPaidOut)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black bg-gray-50 font-bold font-mono">
                <td className="p-2 font-sans uppercase">Expected Physical Cash In Drawer</td>
                <td className="p-2 text-right text-sm font-black">{formatGhs(xReport.expectedCashInTill)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Verification Sign-offs */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-300 text-[10px] mt-8">
            <div>
              <div className="border-b border-black w-48 mb-1"></div>
              <p className="font-bold">Attendant / Cashier Signature</p>
              <p className="text-gray-500">{xReport.cashierName}</p>
            </div>
            <div className="text-right">
              <div className="border-b border-black w-48 ml-auto mb-1"></div>
              <p className="font-bold">Supervisor / Manager Signature</p>
              <p className="text-gray-500">Official Store Audit Inspection</p>
            </div>
          </div>
        </div>
      </OfficialPrintPortal>
    )}

    {/* OFFICIAL PRINTABLE END-OF-DAY Z-REPORT (A4 VECTOR AUDIT DOCUMENT) */}
    {activeTab === 'Z_CLOSE' && zReportResult && (
      <OfficialPrintPortal active={true}>
        <div className="official-printable-doc p-8 font-sans text-black bg-white max-w-2xl mx-auto">
          {/* Corporate Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-5">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-black">
                AKWAABA RETAIL SYSTEMS LTD.
              </h1>
              <p className="text-xs text-gray-700 font-medium">Accra Central Mall Branch • Store Terminal #01</p>
              <p className="text-xs text-gray-700">Digital Address: GA-183-9022, Accra Central, Ghana</p>
              <p className="text-xs text-gray-700 font-mono font-bold">GRA TIN: C0029482190 | BANK OF GHANA RECONCILED</p>
            </div>
            <div className="text-right">
              <div className="inline-block border-2 border-black px-3 py-1 bg-gray-50 text-center">
                <span className="block text-[9px] uppercase font-bold tracking-wider text-rose-700">FINAL CLOSURE</span>
                <span className="text-sm font-black text-black">DAILY Z-REPORT</span>
              </div>
              <p className="text-xs font-mono mt-1 font-bold">
                Z-No: {zReportResult.zReportNumber}
              </p>
            </div>
          </div>

          {/* Audit Metadata */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 border border-gray-300 rounded mb-5 text-xs">
            <div>
              <p><strong>Shift Number:</strong> <span className="font-mono">{zReportResult.shiftNumber}</span></p>
              <p><strong>Cashier:</strong> {zReportResult.cashierName}</p>
              <p><strong>Opened:</strong> {new Date(zReportResult.openedAt).toLocaleString('en-GH')}</p>
              <p><strong>Closed:</strong> {new Date(zReportResult.closedAt).toLocaleString('en-GH')}</p>
            </div>
            <div className="text-right">
              <p><strong>Total Gross Sales:</strong> <span className="font-bold font-mono">{formatGhs(zReportResult.totalGrossSales)}</span></p>
              <p><strong>Audit Variance Status:</strong> <span className="font-bold uppercase font-mono">{zReportResult.varianceStatus}</span></p>
              <p><strong>Total Orders Processed:</strong> <span className="font-bold font-mono">{zReportResult.totalOrders}</span></p>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <table className="w-full text-left text-xs border-collapse border border-gray-300 mb-5">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-[10px]">
                <th className="p-2 border border-gray-300">Revenue & Till Reconciliation Item</th>
                <th className="p-2 border border-gray-300 text-right">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              <tr>
                <td className="p-2 font-sans font-medium">Opening Float In Till</td>
                <td className="p-2 text-right">{formatGhs(zReportResult.openingFloat)}</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-medium">Cash Sales Received</td>
                <td className="p-2 text-right font-bold">{formatGhs(zReportResult.cashSales)}</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-medium">MoMo Received (MTN/Telecel/AT)</td>
                <td className="p-2 text-right">{formatGhs(zReportResult.momoSales)}</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-medium">Card / Bank Terminal Payments</td>
                <td className="p-2 text-right">{formatGhs(zReportResult.cardSales)}</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-medium">Bisa Customer Credit (Ledger Outstanding)</td>
                <td className="p-2 text-right">{formatGhs(zReportResult.debtSales)}</td>
              </tr>
              {zReportResult.totalPaidIn > 0 && (
                <tr>
                  <td className="p-2 font-sans font-medium text-emerald-800">Add: Additional Cash Paid-In</td>
                  <td className="p-2 text-right text-emerald-800">+{formatGhs(zReportResult.totalPaidIn)}</td>
                </tr>
              )}
              {zReportResult.totalPaidOut > 0 && (
                <tr>
                  <td className="p-2 font-sans font-medium text-rose-800">Less: Cash Drops / Emergency Expenses</td>
                  <td className="p-2 text-right text-rose-800">-{formatGhs(zReportResult.totalPaidOut)}</td>
                </tr>
              )}
              <tr className="border-t border-gray-400 bg-gray-50 font-bold">
                <td className="p-2 font-sans uppercase">Expected Cash In Till</td>
                <td className="p-2 text-right">{formatGhs(zReportResult.expectedCashInTill)}</td>
              </tr>
              <tr className="bg-gray-50 font-bold">
                <td className="p-2 font-sans uppercase">Actual Physical Cash Counted</td>
                <td className="p-2 text-right">{formatGhs(zReportResult.countedCashPhysical || 0)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className={`border-t-2 border-black font-bold font-mono text-sm ${
                (zReportResult.cashVariance || 0) < 0 ? 'text-rose-900 bg-rose-50' : 'text-emerald-900 bg-emerald-50'
              }`}>
                <td className="p-2 font-sans uppercase">
                  Cash Reconciliation Variance ({zReportResult.varianceStatus}):
                </td>
                <td className="p-2 text-right font-black">
                  {(zReportResult.cashVariance || 0) >= 0 ? '+' : ''}{formatGhs(zReportResult.cashVariance || 0)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Physical Denominations Audit Grid */}
          <div className="border border-gray-300 p-3 rounded mb-5 bg-gray-50/50">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-2">
              Physical Cash Denomination Count Audit:
            </h4>
            <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="p-1 border border-gray-200 bg-white rounded">
                <span>GH₵ 200: <strong>{denoms.note200 || 0}</strong> ({formatGhs((denoms.note200 || 0) * 200)})</span>
              </div>
              <div className="p-1 border border-gray-200 bg-white rounded">
                <span>GH₵ 100: <strong>{denoms.note100 || 0}</strong> ({formatGhs((denoms.note100 || 0) * 100)})</span>
              </div>
              <div className="p-1 border border-gray-200 bg-white rounded">
                <span>GH₵ 50: <strong>{denoms.note50 || 0}</strong> ({formatGhs((denoms.note50 || 0) * 50)})</span>
              </div>
              <div className="p-1 border border-gray-200 bg-white rounded">
                <span>GH₵ 20: <strong>{denoms.note20 || 0}</strong> ({formatGhs((denoms.note20 || 0) * 20)})</span>
              </div>
              <div className="p-1 border border-gray-200 bg-white rounded">
                <span>GH₵ 10: <strong>{denoms.note10 || 0}</strong> ({formatGhs((denoms.note10 || 0) * 10)})</span>
              </div>
              <div className="p-1 border border-gray-200 bg-white rounded">
                <span>GH₵ 5: <strong>{denoms.note5 || 0}</strong> ({formatGhs((denoms.note5 || 0) * 5)})</span>
              </div>
              <div className="p-1 border border-gray-200 bg-white rounded">
                <span>GH₵ 2 / 1: <strong>{(denoms.note2 || 0) * 2 + (denoms.note1 || 0)}</strong></span>
              </div>
              <div className="p-1 border border-gray-200 bg-white rounded">
                <span>Coins: <strong>{formatGhs(denoms.coinsPesewas || 0)}</strong></span>
              </div>
            </div>
            {zReportResult.closingNotes && (
              <p className="mt-2 text-[10px] text-gray-700 italic border-t border-gray-200 pt-1">
                Closing Notes: {zReportResult.closingNotes}
              </p>
            )}
          </div>

          {/* Official Sign-offs */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-300 text-[10px]">
            <div>
              <div className="border-b border-black w-48 mb-1"></div>
              <p className="font-bold">Cashier Final Handover Signature</p>
              <p className="text-gray-500">{zReportResult.cashierName}</p>
            </div>
            <div className="text-right">
              <div className="border-b border-black w-48 ml-auto mb-1"></div>
              <p className="font-bold">General Manager / Supervisor Sign-off</p>
              <p className="text-gray-500">Official Store Audit Verification</p>
            </div>
          </div>
        </div>
      </OfficialPrintPortal>
    )}
  </>
  );
};
