import React, { useState, useEffect } from 'react';
import { LocalCustomer, LocalOrderPayment } from '../../utils/dexieSync';
import { formatGhs, roundToPesewas } from '../../utils/ghanaTaxEngine';
import {
  Banknote,
  Smartphone,
  CreditCard,
  BookOpen,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Send,
  Loader2,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface SplitPaymentModalProps {
  totalAmount: number;
  customers: LocalCustomer[];
  selectedCustomerId?: string;
  onConfirmPayments: (payments: LocalOrderPayment[], selectedCustomer?: LocalCustomer) => void;
  onClose: () => void;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  totalAmount,
  customers,
  selectedCustomerId,
  onConfirmPayments,
  onClose,
}) => {
  const [payments, setPayments] = useState<LocalOrderPayment[]>([]);
  const [activeTab, setActiveTab] = useState<'CASH' | 'MOMO' | 'CARD' | 'BISA'>('CASH');

  // Customer Selection for Bisa
  const [currentCustomer, setCurrentCustomer] = useState<LocalCustomer | undefined>(
    customers.find(c => c.id === selectedCustomerId) || customers[0]
  );

  // Cash Tab State
  const [cashTendered, setCashTendered] = useState<number>(0);

  // MoMo Tab State
  const [momoNetwork, setMomoNetwork] = useState<'MTN' | 'TELECEL' | 'AT'>('MTN');
  const [momoPhone, setMomoPhone] = useState<string>(currentCustomer?.phone || '0244123456');
  const [momoMode, setMomoMode] = useState<'USSD_PUSH' | 'MANUAL_REF'>('USSD_PUSH');
  const [momoManualRef, setMomoManualRef] = useState<string>('');
  const [momoPushStatus, setMomoPushStatus] = useState<'IDLE' | 'PUSHING' | 'WAITING_APPROVAL' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [momoPushCountdown, setMomoPushCountdown] = useState<number>(15);

  // Card Tab State
  const [cardLastFour, setCardLastFour] = useState<string>('4242');

  const totalAllocated = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingDue = roundToPesewas(Math.max(0, totalAmount - totalAllocated));

  // Cash automatic change vs amount left to pay calculations
  const cashDiff = roundToPesewas(cashTendered - remainingDue);
  const isOverpaid = cashTendered > 0 && cashDiff > 0;
  const isUnderpaid = cashTendered > 0 && cashDiff < 0;
  const isExact = cashTendered > 0 && cashDiff === 0;
  const changeToGive = isOverpaid ? cashDiff : 0;
  const remainingToPay = isUnderpaid ? Math.abs(cashDiff) : 0;

  useEffect(() => {
    if (cashTendered === 0 && remainingDue > 0) {
      setCashTendered(remainingDue);
    }
  }, [remainingDue]);

  useEffect(() => {
    let timer: any;
    if (momoPushStatus === 'WAITING_APPROVAL') {
      if (momoPushCountdown > 0) {
        timer = setTimeout(() => setMomoPushCountdown(prev => prev - 1), 1000);
      } else {
        setMomoPushStatus('SUCCESS');
      }
    }
    return () => clearTimeout(timer);
  }, [momoPushStatus, momoPushCountdown]);

  const addCashPreset = (denom: number) => {
    setCashTendered(prev => roundToPesewas(prev + denom));
  };

  const handleAddCashPayment = () => {
    if (remainingDue <= 0) return;
    const amountToApply = Math.min(cashTendered, remainingDue);
    const change = Math.max(0, roundToPesewas(cashTendered - amountToApply));

    const newPayment: LocalOrderPayment = {
      type: 'CASH',
      amount: amountToApply,
      tenderedCash: cashTendered,
      changeGiven: change,
    };

    setPayments(prev => [...prev, newPayment]);
  };

  const handleStartMoMoPush = () => {
    if (remainingDue <= 0 || !momoPhone) return;
    setMomoPushStatus('PUSHING');
    setMomoPushCountdown(4);

    setTimeout(() => {
      setMomoPushStatus('WAITING_APPROVAL');
    }, 1200);
  };

  const handleConfirmMoMoSuccess = () => {
    const amountToApply = remainingDue;
    const txId = `MOMO-${momoNetwork}-${Date.now().toString().slice(-6)}`;
    const typeKey = momoNetwork === 'MTN' ? 'MOMO_MTN' : momoNetwork === 'TELECEL' ? 'MOMO_TELECEL' : 'MOMO_AT';

    const newPayment: LocalOrderPayment = {
      type: typeKey as any,
      amount: amountToApply,
      momoNetwork,
      momoPhone,
      momoTxId: momoMode === 'MANUAL_REF' ? momoManualRef || txId : txId,
    };

    setPayments(prev => [...prev, newPayment]);
    setMomoPushStatus('IDLE');
  };

  const handleAddCardPayment = () => {
    if (remainingDue <= 0) return;
    const newPayment: LocalOrderPayment = {
      type: 'CARD',
      amount: remainingDue,
      cardLastFour,
    };
    setPayments(prev => [...prev, newPayment]);
  };

  const handleAddBisaPayment = () => {
    if (!currentCustomer) return;
    if (remainingDue <= 0) return;

    const availableCredit = currentCustomer.creditLimit - currentCustomer.currentDebt;
    if (availableCredit <= 0) {
      alert(`Customer ${currentCustomer.fullName} has reached credit limit of ${formatGhs(currentCustomer.creditLimit)}.`);
      return;
    }

    const amountToApply = Math.min(remainingDue, availableCredit);
    const newPayment: LocalOrderPayment = {
      type: 'CUSTOMER_DEBT_BISA',
      amount: amountToApply,
    };

    setPayments(prev => [...prev, newPayment]);
  };

  const handleRemovePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompleteSale = () => {
    if (remainingDue > 0.05) {
      alert(`Remaining balance: ${formatGhs(remainingDue)}. Please tender the full amount.`);
      return;
    }
    onConfirmPayments(payments, currentCustomer);
  };

  const availableCredit = currentCustomer ? currentCustomer.creditLimit - currentCustomer.currentDebt : 0;
  const isCreditExceeded = availableCredit < remainingDue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="glass-panel-dark border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">₵</span>
              Ghanaian Payment & Tender Portal
            </h2>
            <p className="text-xs text-slate-400">
              Cash (Cedis & Pesewas), Mobile Money USSD Push, Cards & Bisa Credit
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          
          {/* Left Column: Method Tendering (7 cols) */}
          <div className="md:col-span-7 p-4 sm:p-5 space-y-4 border-b md:border-b-0 md:border-r border-white/[0.08]">
            
            {/* Method Tabs */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('CASH')}
                className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  activeTab === 'CASH'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MOMO')}
                className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  activeTab === 'MOMO'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>MoMo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CARD')}
                className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  activeTab === 'CARD'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('BISA')}
                className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  activeTab === 'BISA'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Bisa Debt</span>
              </button>
            </div>

            {/* TAB 1: CASH */}
            {activeTab === 'CASH' && (
              <div className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">Physical Cash Handed:</label>
                  <span className="text-amber-400 font-mono font-bold">Due: {formatGhs(remainingDue)}</span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-amber-500 text-lg">GH₵</span>
                  <input
                    type="number"
                    step="0.1"
                    value={cashTendered || ''}
                    onChange={e => setCashTendered(parseFloat(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xl font-mono text-white focus:outline-none focus:border-amber-400"
                    placeholder="0.00"
                  />
                </div>

                {/* Quick Note Buttons */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Quick Note Tenders:</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[200, 100, 50, 20, 10].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => addCashPreset(d)}
                        className="py-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-amber-500/20 hover:border-amber-500 text-xs font-mono font-bold text-slate-200 transition"
                      >
                        +₵{d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smart Change vs Remaining Balance Display */}
                {isOverpaid && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider">Change to Give Customer:</span>
                      <span className="font-mono font-black text-lg text-emerald-300 tabular-nums">
                        {formatGhs(changeToGive)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-400/90 leading-tight">
                      Customer tendered <strong className="font-mono text-white">{formatGhs(cashTendered)}</strong> for <strong className="font-mono text-white">{formatGhs(remainingDue)}</strong> due. Return <strong className="font-mono underline text-white">{formatGhs(changeToGive)}</strong> in change.
                    </p>
                  </div>
                )}

                {isUnderpaid && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider">Customer Left to Pay:</span>
                      <span className="font-mono font-black text-lg text-amber-300 tabular-nums">
                        {formatGhs(remainingToPay)}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-400/90 leading-tight">
                      Customer tendered <strong className="font-mono text-white">{formatGhs(cashTendered)}</strong>. Outstanding balance remaining to collect: <strong className="font-mono underline text-white">{formatGhs(remainingToPay)}</strong>.
                    </p>
                  </div>
                )}

                {isExact && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between text-xs">
                    <span className="font-bold">Exact Cash Tender Received:</span>
                    <span className="font-mono font-bold text-sm text-emerald-300">GH₵ 0.00 Change Due</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddCashPayment}
                  disabled={remainingDue <= 0 || cashTendered <= 0}
                  className={`w-full py-3.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition ${
                    isOverpaid ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black' : isUnderpaid ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isOverpaid
                      ? `Accept ${formatGhs(cashTendered)} · Return ${formatGhs(changeToGive)} Change`
                      : isUnderpaid
                      ? `Apply Partial Cash (${formatGhs(cashTendered)}) · Customer Left with ${formatGhs(remainingToPay)}`
                      : `Apply Exact Cash (${formatGhs(cashTendered)})`}
                  </span>
                </button>
              </div>
            )}

            {/* TAB 2: MOMO */}
            {activeTab === 'MOMO' && (
              <div className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06]">
                {/* Network Selection */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMomoNetwork('MTN')}
                    className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      momoNetwork === 'MTN'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                        : 'bg-white/[0.04] text-slate-300 border-white/10'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    <span>MTN MoMo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMomoNetwork('TELECEL')}
                    className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      momoNetwork === 'TELECEL'
                        ? 'bg-red-600 text-white border-red-500 shadow'
                        : 'bg-white/[0.04] text-slate-300 border-white/10'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span>Telecel Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMomoNetwork('AT')}
                    className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      momoNetwork === 'AT'
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'bg-white/[0.04] text-slate-300 border-white/10'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>AT Money</span>
                  </button>
                </div>

                {/* Direct USSD Push vs Manual Ref */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setMomoMode('USSD_PUSH')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      momoMode === 'USSD_PUSH' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Direct USSD Push
                  </button>
                  <button
                    type="button"
                    onClick={() => setMomoMode('MANUAL_REF')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      momoMode === 'MANUAL_REF' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Manual Till Ref
                  </button>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Customer Mobile Number:</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">+233</span>
                    <input
                      type="text"
                      value={momoPhone}
                      onChange={e => setMomoPhone(e.target.value)}
                      placeholder="024 412 3456"
                      className="w-full pl-14 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm font-mono text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {momoMode === 'MANUAL_REF' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">SMS / Network Tx Ref ID:</label>
                      <input
                        type="text"
                        value={momoManualRef}
                        onChange={e => setMomoManualRef(e.target.value)}
                        placeholder="e.g. 26091823901"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm font-mono text-white uppercase outline-none focus:border-amber-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmMoMoSuccess}
                      disabled={remainingDue <= 0 || !momoManualRef}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Record MoMo Payment ({formatGhs(remainingDue)})</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    {momoPushStatus === 'IDLE' && (
                      <button
                        type="button"
                        onClick={handleStartMoMoPush}
                        disabled={remainingDue <= 0 || !momoPhone}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                        <span>Push USSD Prompt ({formatGhs(remainingDue)}) to Handset</span>
                      </button>
                    )}

                    {momoPushStatus === 'PUSHING' && (
                      <div className="p-3 bg-black/40 border border-amber-500/40 rounded-xl text-center flex flex-col items-center justify-center space-y-1">
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                        <span className="text-xs text-amber-300 font-semibold">Initiating Telco USSD Push...</span>
                      </div>
                    )}

                    {momoPushStatus === 'WAITING_APPROVAL' && (
                      <div className="p-3.5 bg-black/40 border border-yellow-500/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs text-yellow-300 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                            Awaiting Customer PIN on Handset...
                          </span>
                          <span className="font-mono bg-yellow-950/80 text-yellow-400 px-2 py-0.5 rounded">
                            {momoPushCountdown}s
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Prompt sent to <span className="text-white font-mono">{momoPhone}</span> for{' '}
                          <span className="text-amber-400 font-bold">{formatGhs(remainingDue)}</span>.
                        </div>
                        <button
                          type="button"
                          onClick={() => setMomoPushStatus('SUCCESS')}
                          className="w-full text-[10px] text-slate-400 hover:text-white underline text-right"
                        >
                          (Simulate instant user PIN confirmation)
                        </button>
                      </div>
                    )}

                    {momoPushStatus === 'SUCCESS' && (
                      <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl space-y-2 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>USSD Payment Authorized!</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmMoMoSuccess}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
                        >
                          Add MoMo Tender ({formatGhs(remainingDue)})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CARD */}
            {activeTab === 'CARD' && (
              <div className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06]">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Card Last 4 Digits:</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLastFour}
                    onChange={e => setCardLastFour(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm font-mono text-center text-white outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCardPayment}
                  disabled={remainingDue <= 0}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Apply Card Payment ({formatGhs(remainingDue)})</span>
                </button>
              </div>
            )}

            {/* TAB 4: BISA STORE CREDIT */}
            {activeTab === 'BISA' && (
              <div className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06]">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Customer Credit Profile:</label>
                  <select
                    value={currentCustomer?.id || ''}
                    onChange={e => setCurrentCustomer(customers.find(c => c.id === e.target.value))}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900">
                        {c.fullName} ({c.phone}) - Debt: {formatGhs(c.currentDebt)}
                      </option>
                    ))}
                  </select>
                </div>

                {currentCustomer && (
                  <div className="p-3 bg-black/30 rounded-xl border border-white/[0.06] space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Credit Limit:</span>
                      <span className="text-white font-bold">{formatGhs(currentCustomer.creditLimit)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Current Debt:</span>
                      <span className="text-amber-400 font-bold">{formatGhs(currentCustomer.currentDebt)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/[0.06] pt-1">
                      <span>Available Credit:</span>
                      <span className={`font-bold ${availableCredit > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {formatGhs(availableCredit)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddBisaPayment}
                  disabled={remainingDue <= 0 || availableCredit <= 0}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Charge to Bisa Debt ({formatGhs(Math.min(remainingDue, Math.max(0, availableCredit)))})</span>
                </button>
              </div>
            )}

          </div>

          {/* Right Column: Allocation Breakdown (5 cols) */}
          <div className="md:col-span-5 p-4 sm:p-5 bg-black/40 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Payment Allocation
              </span>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Grand Total:</span>
                  <span className="font-mono text-white font-bold">{formatGhs(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tendered:</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatGhs(totalAllocated)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-white/[0.08] pt-1.5">
                  <span className={remainingDue > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {remainingDue > 0 ? 'Remaining Due:' : 'Fully Settled'}
                  </span>
                  <span className={`font-mono ${remainingDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatGhs(remainingDue)}
                  </span>
                </div>
              </div>

              {/* Tenders List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {payments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 italic">No tenders added yet.</p>
                ) : (
                  payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                      <div>
                        <span className="font-semibold text-white">
                          {p.type === 'CASH' && 'Cash'}
                          {p.type === 'MOMO_MTN' && 'MTN MoMo'}
                          {p.type === 'MOMO_TELECEL' && 'Telecel Cash'}
                          {p.type === 'MOMO_AT' && 'AT Money'}
                          {p.type === 'CARD' && 'Bank Card'}
                          {p.type === 'CUSTOMER_DEBT_BISA' && 'Bisa Credit'}
                        </span>
                        {p.momoTxId && <span className="text-[10px] text-slate-400 block font-mono">{p.momoTxId}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{formatGhs(p.amount)}</span>
                        <button onClick={() => handleRemovePayment(i)} className="text-slate-500 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={remainingDue > 0.05}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Sale & Issue Receipt</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Back to Cart
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
