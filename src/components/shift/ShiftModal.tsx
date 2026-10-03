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
  Flame
} from 'lucide-react';
import { OfficialPrintPortal } from '../common/OfficialPrintPortal';

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

  // Cash Drop Form State
  const [dropType, setDropType] = useState<'PAY_IN' | 'PAY_OUT' | 'SAFE_DEPOSIT'>('PAY_OUT');
  const [dropAmount, setDropAmount] = useState<number>(50);
  const [dropReason, setDropReason] = useState<string>('Emergency fuel for generator (Dumsor outage)');
  const [isDropSuccess, setIsDropSuccess] = useState(false);

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
    const report = await closeShiftAndGenerateZReport({
      shiftId: shift.id,
      countedCashPhysical: countedPhysicalCash,
      managerPin,
      closingNotes,
    });

    setZReportResult(report);
    onShiftClosed(report);
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
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-black/40 border-b border-white/[0.08] text-xs font-semibold overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: 'Till Overview' },
            { id: 'CASH_DROP', label: 'Cash Drop / Pay-Out' },
            { id: 'X_REPORT', label: 'Mid-Day X-Report' },
            { id: 'Z_CLOSE', label: 'Close Shift (Z-Report)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'X_REPORT') handleLoadXReport();
              }}
              className={`flex-1 py-3 px-3 border-b-2 whitespace-nowrap transition ${
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">Opening Float</span>
                <span className="text-base font-bold font-mono text-white">{formatGhs(shift.openingFloat)}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">Cash Sales</span>
                <span className="text-base font-bold font-mono text-emerald-400">{formatGhs(shift.cashSales)}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">MoMo Sales</span>
                <span className="text-base font-bold font-mono text-amber-400">{formatGhs(shift.momoSales)}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[10px] text-slate-400 block">Bisa Debt</span>
                <span className="text-base font-bold font-mono text-slate-300">{formatGhs(shift.debtSales)}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-300 font-semibold block">Expected Physical Cash in Till:</span>
                <span className="text-[11px] text-slate-400">(Opening Float + Cash Sales - PayOuts)</span>
              </div>
              <span className="text-2xl font-extrabold font-mono text-amber-400">
                {formatGhs(shift.expectedCashInTill)}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">Mid-Shift Movements:</span>
              {shift.cashDrops.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No cash drops recorded during this shift.</p>
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
                            {drop.type === 'PAY_IN' ? 'Pay-In' : drop.type === 'PAY_OUT' ? 'Pay-Out (Expense)' : 'Safe Deposit'}
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
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDropType('PAY_OUT')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                  dropType === 'PAY_OUT' ? 'bg-rose-500/20 text-rose-300 border-rose-500' : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                Pay-Out (Expense)
              </button>
              <button
                type="button"
                onClick={() => setDropType('SAFE_DEPOSIT')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                  dropType === 'SAFE_DEPOSIT' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                Safe Skim
              </button>
              <button
                type="button"
                onClick={() => setDropType('PAY_IN')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                  dropType === 'PAY_IN' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                Pay-In (Float)
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Amount (GH₵):</label>
              <input
                type="number"
                step="0.1"
                value={dropAmount || ''}
                onChange={e => setDropAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl font-mono text-sm text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Reason / Expense Memo:</label>
              <input
                type="text"
                value={dropReason}
                onChange={e => setDropReason(e.target.value)}
                placeholder="e.g. Generator fuel during Dumsor, water delivery"
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-400"
              />
              <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Dumsor resilience: Generator fuel logged in audited petty cash.</span>
              </div>
            </div>

            {isDropSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Cash movement recorded and till reconciled!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={dropAmount <= 0}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-xs transition"
            >
              Record Cash Movement
            </button>
          </form>
        )}

        {/* TAB 3: X-REPORT */}
        {activeTab === 'X_REPORT' && xReport && (
          <div className="p-5 space-y-4">
            <div className="p-4 bg-white text-black font-mono rounded-2xl border border-slate-300 text-xs space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-gray-400">
                <div className="font-bold text-sm">AKWAABA RETAIL OS</div>
                <div className="text-[10px] text-gray-700">*** X-REPORT (MID-DAY READING) ***</div>
              </div>

              <div className="text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Shift #:</span>
                  <span className="font-bold">{xReport.shiftNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{xReport.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Orders Completed:</span>
                  <span className="font-bold">{xReport.totalOrders}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 pt-1 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Opening Float:</span>
                  <span>{xReport.openingFloat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span>{xReport.cashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>MoMo Sales:</span>
                  <span>{xReport.momoSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card Sales:</span>
                  <span>{xReport.cardSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bisa Debt Sales:</span>
                  <span>{xReport.debtSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-400">
                  <span>EXPECTED IN TILL:</span>
                  <span>GH₵ {xReport.expectedCashInTill.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print X-Report (ESC/POS)</span>
            </button>
          </div>
        )}

        {/* TAB 4: Z-REPORT CLOSURE */}
        {activeTab === 'Z_CLOSE' && (
          <div className="p-5 space-y-4">
            {!zReportResult ? (
              <>
                <div className="p-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-200">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <Lock className="w-4 h-4" />
                    <span>Daily Shift Closure & Z-Report</span>
                  </div>
                  <p className="text-[11px] text-rose-300/80 mt-1">
                    Count all physical currency in till. Shortages or overages will be audited and flagged.
                  </p>
                </div>

                {/* Denomination Counter */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">Denomination Count:</span>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[
                      { key: 'note200', label: '₵200 note' },
                      { key: 'note100', label: '₵100 note' },
                      { key: 'note50', label: '₵50 note' },
                      { key: 'note20', label: '₵20 note' },
                      { key: 'note10', label: '₵10 note' },
                      { key: 'note5', label: '₵5 note' },
                      { key: 'note2', label: '₵2 note' },
                      { key: 'note1', label: '₵1 note/coin' },
                    ].map(d => (
                      <div key={d.key} className="p-2 rounded-xl bg-black/30 border border-white/10">
                        <label className="text-[10px] text-slate-400 block">{d.label}</label>
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
                          className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-center font-mono text-white text-xs outline-none"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Small Coins Pesewas (GH₵):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={denoms.coinsPesewas || ''}
                    onChange={e => setDenoms(prev => ({ ...prev, coinsPesewas: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-1.5 bg-black/30 border border-white/10 rounded-xl text-xs font-mono text-white outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block">Counted:</span>
                    <span className="font-mono text-sm font-bold text-white">{formatGhs(countedPhysicalCash)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Expected:</span>
                    <span className="font-mono text-sm font-bold text-amber-400">{formatGhs(shift.expectedCashInTill)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteShiftClose}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Till & Generate Final Z-Report</span>
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white text-black font-mono rounded-2xl border border-slate-300 text-xs space-y-2">
                  <div className="text-center pb-2 border-b border-dashed border-gray-400">
                    <div className="font-bold text-sm">AKWAABA RETAIL OS</div>
                    <div className="text-[10px] font-bold text-rose-600">*** FINAL Z-REPORT ***</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Z-Report #:</span>
                      <span className="font-bold">{zReportResult.zReportNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected:</span>
                      <span>{zReportResult.expectedCashInTill.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Counted:</span>
                      <span>{zReportResult.countedCashPhysical?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-400 pt-1">
                      <span>VARIANCE:</span>
                      <span>GH₵ {zReportResult.cashVariance?.toFixed(2)} ({zReportResult.varianceStatus})</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Z-Report</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Close
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
