import React, { useState, useEffect } from 'react';
import { LocalCustomer, LocalOrderPayment } from '../../utils/dexieSync';
import { formatGhs, roundToPesewas } from '../../utils/ghanaTaxEngine';
import { triggerHaptic } from '../../utils/haptics';
import { stripEmojis } from '../../utils/emojiSanitizer';
import { notify } from '../../utils/notificationSystem';
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
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Award,
  Gift,
  Coins
} from 'lucide-react';

interface PaymentModalProps {
  totalAmount: number;
  customers: LocalCustomer[];
  selectedCustomerId?: string;
  onConfirmPayments: (payments: LocalOrderPayment[], selectedCustomer?: LocalCustomer) => void;
  onClose: () => void;
  isDark: boolean;
  initialPaymentMethod?: 'CASH' | 'MOMO' | 'CARD' | 'BISA' | 'LOYALTY';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  totalAmount,
  customers,
  selectedCustomerId,
  onConfirmPayments,
  onClose,
  isDark,
  initialPaymentMethod,
}) => {
  const [payments, setPayments] = useState<LocalOrderPayment[]>([]);
  const [activeTab, setActiveTab] = useState<'CASH' | 'MOMO' | 'CARD' | 'BISA' | 'LOYALTY'>(initialPaymentMethod || 'CASH');

  // Customer Selection for Bisa or General
  const [currentCustomer, setCurrentCustomer] = useState<LocalCustomer | undefined>(
    customers.find(c => c.id === selectedCustomerId) || customers[0]
  );

  // Cash Tab State
  const [cashTendered, setCashTendered] = useState<number>(0);

  // Loyalty Tab State
  const customerLoyaltyPoints = currentCustomer?.loyaltyPoints || 0;
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState<number>(0);

  // MoMo Tab State
  const [momoNetwork, setMomoNetwork] = useState<'MTN' | 'TELECEL' | 'AT'>('MTN');
  const [momoPhone, setMomoPhone] = useState<string>(currentCustomer?.phone || '0244123456');
  const [momoMode, setMomoMode] = useState<'USSD_PUSH' | 'MANUAL_REF'>('USSD_PUSH');
  const [momoManualRef, setMomoManualRef] = useState<string>('');
  const [momoPushStatus, setMomoPushStatus] = useState<'IDLE' | 'PUSHING' | 'WAITING_APPROVAL' | 'SUCCESS'>('IDLE');
  const [momoPushCountdown, setMomoPushCountdown] = useState<number>(15);

  // Card Tab State
  const [cardLastFour, setCardLastFour] = useState<string>('4242');

  // Financial calculations with tabular-nums
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

  // Synchronize maximum redeemable loyalty points for remaining due balance
  const maxRedeemablePointsForBill = Math.min(
    customerLoyaltyPoints,
    Math.ceil(remainingDue * 10)
  );
  const maxRedeemableGhsValue = roundToPesewas(maxRedeemablePointsForBill / 10);

  useEffect(() => {
    if (activeTab === 'LOYALTY' && remainingDue > 0) {
      setLoyaltyPointsToRedeem(maxRedeemablePointsForBill);
    }
  }, [activeTab, remainingDue, customerLoyaltyPoints]);

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

  const setExactCash = () => {
    setCashTendered(remainingDue);
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
      notify.warning('Credit Limit Exhausted', `Customer ${currentCustomer.fullName} has exhausted their credit limit of ${formatGhs(currentCustomer.creditLimit)}.`);
      return;
    }

    const amountToApply = Math.min(remainingDue, availableCredit);
    const newPayment: LocalOrderPayment = {
      type: 'CUSTOMER_DEBT_BISA',
      amount: amountToApply,
    };

    setPayments(prev => [...prev, newPayment]);
  };

  const handleAddLoyaltyPayment = () => {
    if (!currentCustomer) return;
    if (remainingDue <= 0 || loyaltyPointsToRedeem <= 0) return;

    const actualPoints = Math.min(
      loyaltyPointsToRedeem,
      customerLoyaltyPoints,
      Math.ceil(remainingDue * 10)
    );
    const amountToApply = roundToPesewas(actualPoints / 10);

    const newPayment: LocalOrderPayment = {
      type: 'LOYALTY_POINTS',
      amount: amountToApply,
      loyaltyPointsRedeemed: actualPoints,
    };

    triggerHaptic('success');
    setPayments(prev => [...prev, newPayment]);
  };

  const handleRemovePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompleteSale = () => {
    if (remainingDue > 0.05) {
      notify.warning('Payment Incomplete', `Balance remaining: ${formatGhs(remainingDue)}. Please tender the full amount.`);
      return;
    }
    onConfirmPayments(payments, currentCustomer);
  };

  const availableCredit = currentCustomer ? currentCustomer.creditLimit - currentCustomer.currentDebt : 0;
  const isCreditExceeded = availableCredit < remainingDue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 ${
        isDark ? 'bg-[#1A1C22] border-[#282B34]' : 'bg-[#EBEEF2] border-slate-300'
      }`}>
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'border-[#282B34] bg-[#141519]' : 'border-slate-300 bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              isDark ? 'bg-[#FF4500]/15 text-[#FF5722] border border-[#FF4500]/30' : 'bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/20'
            }`}>
              ₵
            </div>
            <div>
              <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
                Tender & Split-Payment Terminal
              </h2>
              <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-slate-500'}`}>
                Select payment methods and verify exact pesewas allocation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl border transition ${
              isDark ? 'border-[#282B34] text-stone-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Split Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          
          {/* Left Column: Tendering Forms (7 cols) */}
          <div className={`md:col-span-7 p-4 sm:p-6 space-y-4 border-b md:border-b-0 md:border-r ${
            isDark ? 'border-[#282B34]' : 'border-slate-300'
          }`}>
            
            {/* Payment Method Selector Tabs */}
            <div className={`p-1 rounded-2xl border flex gap-1 ${
              isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-slate-200/80 border-slate-300'
            }`}>
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'MOMO', label: 'Mobile Money', icon: Smartphone },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'BISA', label: 'Bisa Credit', icon: BookOpen },
                { id: 'LOYALTY', label: 'Points', icon: Award },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-[#FF4500] text-white font-bold shadow-sm'
                        : isDark
                        ? 'text-stone-400 hover:text-stone-200'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: CASH TENDER */}
            {activeTab === 'CASH' && (
              <div className={`p-4 rounded-2xl border space-y-4 ${
                isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-600 dark:text-stone-400">Physical Cash Received:</label>
                  <span className="font-mono font-bold tabular-nums text-[#FF4500] dark:text-[#FF5722]">
                    Due: {formatGhs(remainingDue)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-[#FF4500] font-mono text-lg">
                    GH₵
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={cashTendered || ''}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setCashTendered(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className={`w-full pl-16 pr-20 py-3 rounded-xl text-xl font-mono tabular-nums font-bold border outline-none transition focus:ring-2 focus:ring-[#00CED1]/30 ${
                      isDark
                        ? 'bg-[#1A1C22] border-[#282B34] text-white focus:border-[#00CED1]'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF4500]'
                    }`}
                    placeholder="0.00"
                  />
                  {/* Custom Modern Stepper Controls (Replaces default browser spinbutton) */}
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCashTendered(prev => Math.max(0, roundToPesewas(prev - 1)))}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border transition active:scale-95 cursor-pointer ${
                        isDark
                          ? 'bg-[#141519] border-[#282B34] text-stone-300 hover:text-[#00CED1] hover:border-[#00CED1]/50'
                          : 'bg-white border-slate-300 text-slate-800 hover:text-[#008285] hover:border-[#008285]'
                      }`}
                      title="Decrease amount (-1)"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashTendered(prev => roundToPesewas(prev + 1))}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border transition active:scale-95 cursor-pointer ${
                        isDark
                          ? 'bg-[#141519] border-[#282B34] text-stone-300 hover:text-[#00CED1] hover:border-[#00CED1]/50'
                          : 'bg-white border-slate-300 text-slate-800 hover:text-[#008285] hover:border-[#008285]'
                      }`}
                      title="Increase amount (+1)"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Tactile Cash Shortcut Chips */}
                <div>
                  <span className="text-[11px] text-slate-600 dark:text-stone-400 block mb-2 font-medium">Quick Note Tenders:</span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[200, 100, 50, 20, 10].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => addCashPreset(d)}
                        className={`py-2 rounded-xl border text-xs font-mono font-bold tabular-nums transition active:scale-95 cursor-pointer ${
                          isDark
                            ? 'bg-[#20232B] border-[#282B34] hover:border-[#00CED1] hover:text-[#00CED1] text-stone-100'
                            : 'bg-slate-100 border-slate-300 hover:border-[#008285] hover:text-[#008285] text-slate-900'
                        }`}
                      >
                        +₵{d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={setExactCash}
                      className={`py-2 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                        isDark
                          ? 'bg-[#20232B] border-[#282B34] text-[#00CED1] hover:border-[#00CED1] hover:bg-[#00CED1]/10'
                          : 'bg-slate-100 border-slate-300 text-[#008285] hover:border-[#008285] hover:bg-[#00CED1]/10 font-bold'
                      }`}
                    >
                      Exact
                    </button>
                  </div>
                </div>

                {/* Smart Direct Cash Calculation: Change Due (#00CED1 / #008285) vs Left to Pay (#FF4500) */}
                {isOverpaid && (
                  <div className="p-3.5 rounded-2xl bg-[#00CED1]/10 border-2 border-[#008285]/40 dark:border-[#00CED1]/40 text-[#008285] dark:text-[#00CED1] space-y-1.5 animate-in fade-in duration-150 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                        <Coins className="w-4 h-4 text-[#008285] dark:text-[#00CED1]" />
                        <span>Change Due</span>
                      </div>
                      <span className="font-mono font-black text-2xl tabular-nums">
                        {formatGhs(changeToGive)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-stone-300 font-medium pt-1 border-t border-[#00CED1]/20">
                      <span>Tendered: <strong className="font-mono text-slate-950 dark:text-white">{formatGhs(cashTendered)}</strong></span>
                      <span className="font-bold">Return to customer</span>
                    </div>
                  </div>
                )}

                {isUnderpaid && (
                  <div className="p-3.5 rounded-2xl bg-[#FF4500]/10 border-2 border-[#FF4500]/40 text-[#C23600] dark:text-[#FF5722] space-y-1.5 animate-in fade-in duration-150 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 text-[#FF4500]" />
                        <span>Left to Pay</span>
                      </div>
                      <span className="font-mono font-black text-2xl tabular-nums">
                        {formatGhs(remainingToPay)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-stone-300 font-medium pt-1 border-t border-[#FF4500]/20">
                      <span>Tendered: <strong className="font-mono text-slate-950 dark:text-white">{formatGhs(cashTendered)}</strong></span>
                      <span className="font-bold">Remaining balance</span>
                    </div>
                  </div>
                )}

                {isExact && (
                  <div className="p-3 rounded-2xl bg-[#00CED1]/10 border border-[#008285]/30 dark:border-[#00CED1]/30 text-[#008285] dark:text-[#00CED1] flex items-center justify-between text-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-[#008285] dark:text-[#00CED1]" />
                      <span>Exact Cash Received</span>
                    </div>
                    <span className="font-mono font-bold text-sm">
                      No Change Due
                    </span>
                  </div>
                )}

                {cashTendered === 0 && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-[#1A1C22] border-[#282B34]' : 'bg-slate-50 border-slate-300'
                  }`}>
                    <span className="text-slate-600 dark:text-stone-400">Enter tendered cash to calculate:</span>
                    <span className="font-mono font-bold text-[#FF4500] dark:text-[#FF5722] tabular-nums">
                      Due: {formatGhs(remainingDue)}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddCashPayment}
                  disabled={remainingDue <= 0 || cashTendered <= 0}
                  className="w-full py-3.5 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md cursor-pointer bg-[#FF4500] hover:bg-[#E03E00] text-white font-black disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isOverpaid
                      ? `Accept ${formatGhs(cashTendered)} · Give ${formatGhs(changeToGive)} Change`
                      : isUnderpaid
                      ? `Accept ${formatGhs(cashTendered)} · Left to Pay: ${formatGhs(remainingToPay)}`
                      : `Apply Exact Cash (${formatGhs(cashTendered)})`}
                  </span>
                </button>
              </div>
            )}

            {/* TAB 2: MOBILE MONEY (MOMO) */}
            {activeTab === 'MOMO' && (
              <div className={`p-4 rounded-2xl border space-y-4 ${
                isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'
              }`}>
                {/* Telco Selector Pills */}
                <div>
                  <label className="text-xs text-slate-600 dark:text-stone-400 block mb-1.5 font-medium">Select Telco Network:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* MTN */}
                    <button
                      type="button"
                      onClick={() => setMomoNetwork('MTN')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                        momoNetwork === 'MTN'
                          ? 'border-amber-400 bg-amber-400/15 text-amber-500 dark:text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold'
                          : isDark
                          ? 'border-[#282B34] text-stone-400 hover:text-white'
                          : 'border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span>MTN MoMo</span>
                    </button>

                    {/* Telecel */}
                    <button
                      type="button"
                      onClick={() => setMomoNetwork('TELECEL')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                        momoNetwork === 'TELECEL'
                          ? 'border-red-500 bg-red-500/15 text-rose-500 dark:text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.2)] font-bold'
                          : isDark
                          ? 'border-[#282B34] text-stone-400 hover:text-white'
                          : 'border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      <span>Telecel Cash</span>
                    </button>

                    {/* AT Money */}
                    <button
                      type="button"
                      onClick={() => setMomoNetwork('AT')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                        momoNetwork === 'AT'
                          ? 'border-slate-400 bg-slate-200 dark:border-stone-500 dark:bg-stone-600/20 text-slate-900 dark:text-stone-200 font-bold'
                          : isDark
                          ? 'border-[#282B34] text-stone-400 hover:text-white'
                          : 'border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span>AT Money</span>
                    </button>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className={`p-1 rounded-xl border flex gap-1 text-xs ${
                  isDark ? 'bg-[#1A1C22] border-[#282B34]' : 'bg-slate-100 border-slate-300'
                }`}>
                  <button
                    type="button"
                    onClick={() => setMomoMode('USSD_PUSH')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      momoMode === 'USSD_PUSH'
                        ? 'bg-[#FF4500] text-white font-bold'
                        : isDark
                        ? 'text-stone-400 hover:text-stone-200'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Direct USSD Push
                  </button>
                  <button
                    type="button"
                    onClick={() => setMomoMode('MANUAL_REF')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      momoMode === 'MANUAL_REF'
                        ? 'bg-[#FF4500] text-white font-bold'
                        : isDark
                        ? 'text-stone-400 hover:text-stone-200'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Manual Merchant Till Ref
                  </button>
                </div>

                {/* Phone Input */}
                <div>
                  <label className="text-xs text-slate-600 dark:text-stone-400 block mb-1">Customer Mobile Number:</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">+233</span>
                    <input
                      type="text"
                      value={momoPhone}
                      onChange={e => setMomoPhone(e.target.value)}
                      placeholder="024 412 3456"
                      className={`w-full pl-14 pr-3 py-2 rounded-xl text-sm font-mono border outline-none focus:border-[#FF4500] ${
                        isDark ? 'bg-[#1A1C22] border-[#282B34] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {momoMode === 'MANUAL_REF' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-600 dark:text-stone-400 block mb-1">SMS / Network Tx Ref ID:</label>
                      <input
                        type="text"
                        value={momoManualRef}
                        onChange={e => setMomoManualRef(e.target.value)}
                        placeholder="e.g. 26091823901"
                        className={`w-full px-3 py-2 rounded-xl text-sm font-mono uppercase border outline-none focus:border-[#FF4500] ${
                          isDark ? 'bg-[#1A1C22] border-[#282B34] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmMoMoSuccess}
                      disabled={remainingDue <= 0 || !momoManualRef}
                      className="w-full py-2.5 bg-[#FF4500] hover:bg-[#E03E00] disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
                        className="w-full py-3 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Push USSD Prompt ({formatGhs(remainingDue)}) to Handset</span>
                      </button>
                    )}

                    {momoPushStatus === 'PUSHING' && (
                      <div className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 ${
                        isDark ? 'bg-[#1A1C22] border-[#FF4500]/40' : 'bg-slate-50 border-[#FF4500]/40'
                      }`}>
                        <Loader2 className="w-5 h-5 text-[#FF4500] animate-spin" />
                        <span className="text-xs text-[#FF4500] font-semibold">Initiating Telco USSD Push...</span>
                      </div>
                    )}

                    {momoPushStatus === 'WAITING_APPROVAL' && (
                      <div className="p-3.5 rounded-2xl border border-[#FF4500]/40 bg-[#FF4500]/10 space-y-2">
                        <div className="flex items-center justify-between text-xs text-[#FF4500] dark:text-[#FF5722] font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-[#FF4500] animate-pulse" />
                            Awaiting Customer PIN on Handset...
                          </span>
                          <span className="font-mono bg-black/40 text-[#FF4500] dark:text-[#FF5722] px-2 py-0.5 rounded tabular-nums font-bold">
                            {momoPushCountdown}s
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 dark:text-stone-400">
                          Prompt sent to <span className="font-mono font-bold text-slate-900 dark:text-white">{momoPhone}</span> to authorize{' '}
                          <span className="text-[#FF4500] dark:text-[#FF5722] font-bold tabular-nums">{formatGhs(remainingDue)}</span>.
                        </div>
                        <button
                          type="button"
                          onClick={() => setMomoPushStatus('SUCCESS')}
                          className="w-full text-[10px] text-slate-500 hover:text-slate-900 dark:text-stone-400 dark:hover:text-white underline text-right cursor-pointer"
                        >
                          (Simulate instant user PIN confirmation)
                        </button>
                      </div>
                    )}

                    {momoPushStatus === 'SUCCESS' && (
                      <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-2 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>USSD Payment Authorized!</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmMoMoSuccess}
                          className="w-full py-2 bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold rounded-xl text-xs cursor-pointer"
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
              <div className={`p-4 rounded-2xl border space-y-4 ${
                isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'
              }`}>
                <div>
                  <label className="text-xs text-slate-600 dark:text-stone-400 block mb-1">Card Last 4 Digits:</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLastFour}
                    onChange={e => setCardLastFour(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-mono text-center border outline-none focus:border-[#FF4500] ${
                      isDark ? 'bg-[#1A1C22] border-[#282B34] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCardPayment}
                  disabled={remainingDue <= 0}
                  className="w-full py-2.5 bg-[#FF4500] hover:bg-[#E03E00] disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Apply Card Payment ({formatGhs(remainingDue)})</span>
                </button>
              </div>
            )}

            {/* TAB 4: BISA STORE CREDIT */}
            {activeTab === 'BISA' && (
              <div className={`p-4 rounded-2xl border space-y-4 ${
                isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'
              }`}>
                <div>
                  <label className="text-xs text-slate-600 dark:text-stone-400 block mb-1">Customer Credit Profile:</label>
                  <select
                    value={currentCustomer?.id || ''}
                    onChange={e => setCurrentCustomer(customers.find(c => c.id === e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none ${
                      isDark ? 'bg-[#1A1C22] border-[#282B34] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phone}) - Debt: {formatGhs(c.currentDebt)}
                      </option>
                    ))}
                  </select>
                </div>

                {currentCustomer && (
                  <div className={`p-3 rounded-xl border space-y-1.5 text-xs font-mono tabular-nums ${
                    isDark ? 'bg-[#1A1C22] border-[#282B34]' : 'bg-slate-50 border-slate-300'
                  }`}>
                    <div className="flex justify-between text-slate-600 dark:text-stone-400">
                      <span>Credit Limit:</span>
                      <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>
                        {formatGhs(currentCustomer.creditLimit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-stone-400">
                      <span>Current Debt:</span>
                      <span className="text-[#FF4500] dark:text-[#FF5722] font-bold">{formatGhs(currentCustomer.currentDebt)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-stone-700/50 pt-1">
                      <span className="text-slate-600 dark:text-stone-400">Available Credit:</span>
                      <span className={`font-bold ${availableCredit > 0 ? 'text-[#008285] dark:text-[#00CED1]' : 'text-rose-600'}`}>
                        {formatGhs(availableCredit)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddBisaPayment}
                  disabled={remainingDue <= 0 || availableCredit <= 0}
                  className="w-full py-2.5 bg-[#FF4500] hover:bg-[#E03E00] disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Charge to Bisa Debt ({formatGhs(Math.min(remainingDue, Math.max(0, availableCredit)))})</span>
                </button>
              </div>
            )}

            {/* TAB 5: LOYALTY POINTS REDEMPTION */}
            {activeTab === 'LOYALTY' && (
              <div className={`p-4 rounded-2xl border space-y-4 ${
                isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'
              }`}>
                <div>
                  <label className="text-xs text-slate-600 dark:text-stone-400 block mb-1">Customer Loyalty Account:</label>
                  <select
                    value={currentCustomer?.id || ''}
                    onChange={e => setCurrentCustomer(customers.find(c => c.id === e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none ${
                      isDark ? 'bg-[#1A1C22] border-[#282B34] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phone}) - {c.loyaltyPoints || 0} Points (GH₵ {((c.loyaltyPoints || 0) / 10).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {currentCustomer ? (
                  <div className="space-y-3">
                    {/* Points Dossier Card */}
                    <div className={`p-3.5 rounded-2xl border space-y-2 text-xs font-mono ${
                      isDark ? 'bg-[#1A1C22] border-[#FF4500]/30' : 'bg-slate-50 border-slate-300 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-stone-400 flex items-center gap-1.5 font-sans font-medium">
                          <Award className="w-4 h-4 text-[#FF4500] dark:text-[#FF5722]" />
                          <span>Loyalty Points Balance:</span>
                        </span>
                        <span className="font-bold text-base text-[#FF4500] dark:text-[#FF5722] font-mono">
                          {customerLoyaltyPoints} pts
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-600 dark:text-stone-400">
                        <span>Cash Value (10 pts = GH₵ 1.00):</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {formatGhs(roundToPesewas(customerLoyaltyPoints / 10))}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-600 dark:text-stone-400 border-t border-slate-200 dark:border-[#282B34] pt-1">
                        <span>Max Redeemable for this Bill:</span>
                        <span className="font-bold text-[#FF4500] dark:text-[#FF5722]">
                          {maxRedeemablePointsForBill} pts ({formatGhs(maxRedeemableGhsValue)})
                        </span>
                      </div>
                    </div>

                    {customerLoyaltyPoints <= 0 ? (
                      <div className="p-3 rounded-xl bg-[#FF4500]/10 border border-[#FF4500]/30 text-[#C23600] dark:text-[#FF5722] text-xs text-center">
                        This customer currently has 0 loyalty points. Points accrue automatically on every sale (1 pt per GH₵ 1.00 spent).
                      </div>
                    ) : (
                      <>
                        {/* Preset Chips */}
                        <div>
                          <span className="text-[11px] text-slate-600 dark:text-stone-400 block mb-1.5 font-medium">Quick Points Redemptions:</span>
                          <div className="grid grid-cols-4 gap-1.5 text-xs font-mono font-bold">
                            <button
                              type="button"
                              onClick={() => setLoyaltyPointsToRedeem(Math.min(50, maxRedeemablePointsForBill))}
                              disabled={customerLoyaltyPoints < 50}
                              className={`py-2 px-1 rounded-xl border text-center transition disabled:opacity-30 cursor-pointer ${
                                isDark ? 'bg-[#20232B] border-[#282B34] text-white hover:border-[#FF4500]' : 'bg-white border-slate-300 text-slate-900 hover:border-[#FF4500]'
                              }`}
                            >
                              50 pts (₵5)
                            </button>
                            <button
                              type="button"
                              onClick={() => setLoyaltyPointsToRedeem(Math.min(100, maxRedeemablePointsForBill))}
                              disabled={customerLoyaltyPoints < 100}
                              className={`py-2 px-1 rounded-xl border text-center transition disabled:opacity-30 cursor-pointer ${
                                isDark ? 'bg-[#20232B] border-[#282B34] text-white hover:border-[#FF4500]' : 'bg-white border-slate-300 text-slate-900 hover:border-[#FF4500]'
                              }`}
                            >
                              100 pts (₵10)
                            </button>
                            <button
                              type="button"
                              onClick={() => setLoyaltyPointsToRedeem(Math.min(200, maxRedeemablePointsForBill))}
                              disabled={customerLoyaltyPoints < 200}
                              className={`py-2 px-1 rounded-xl border text-center transition disabled:opacity-30 cursor-pointer ${
                                isDark ? 'bg-[#20232B] border-[#282B34] text-white hover:border-[#FF4500]' : 'bg-white border-slate-300 text-slate-900 hover:border-[#FF4500]'
                              }`}
                            >
                              200 pts (₵20)
                            </button>
                            <button
                              type="button"
                              onClick={() => setLoyaltyPointsToRedeem(maxRedeemablePointsForBill)}
                              className="py-2 px-1 rounded-xl border border-[#FF4500]/50 bg-[#FF4500]/10 text-[#FF4500] dark:text-[#FF5722] font-bold text-center transition hover:bg-[#FF4500]/20 cursor-pointer"
                            >
                              Max Due
                            </button>
                          </div>
                        </div>

                        {/* Custom Points Input */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <label className="text-slate-600 dark:text-stone-400 font-medium">Points to Redeem:</label>
                            <span className="font-mono font-bold text-[#FF4500] dark:text-[#FF5722]">
                              Discount Value: {formatGhs(roundToPesewas((loyaltyPointsToRedeem || 0) / 10))}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min={1}
                              max={maxRedeemablePointsForBill}
                              value={loyaltyPointsToRedeem || ''}
                              onKeyDown={(e) => {
                                if (['e', 'E', '+', '-'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setLoyaltyPointsToRedeem(Math.min(val, maxRedeemablePointsForBill));
                              }}
                              className={`w-full px-3 py-2 rounded-xl text-base font-mono font-bold border outline-none focus:border-[#00CED1] focus:ring-2 focus:ring-[#00CED1]/30 ${
                                isDark ? 'bg-[#1A1C22] border-[#282B34] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                              placeholder="Enter points..."
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                              pts
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddLoyaltyPayment}
                          disabled={remainingDue <= 0 || loyaltyPointsToRedeem <= 0}
                          className="w-full py-3 bg-[#FF4500] hover:bg-[#E03E00] disabled:opacity-40 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98] cursor-pointer"
                        >
                          <Gift className="w-4 h-4" />
                          <span>
                            Apply {loyaltyPointsToRedeem} Points ({formatGhs(roundToPesewas((loyaltyPointsToRedeem || 0) / 10))} Credit)
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-500 dark:text-stone-400 text-center italic">
                    Select a customer profile to redeem loyalty points.
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Column: Allocation & Summary (5 cols) */}
          <div className={`md:col-span-5 p-4 sm:p-6 flex flex-col justify-between space-y-4 ${
            isDark ? 'bg-[#141519]/70' : 'bg-white border-l border-slate-300'
          }`}>
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-stone-400">
                Payment Allocation
              </span>

              {/* Total Card */}
              <div className={`p-4 rounded-2xl border space-y-2 text-xs font-mono tabular-nums ${
                isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-slate-50 border-slate-300 shadow-xs'
              }`}>
                <div className="flex justify-between text-slate-600 dark:text-stone-400">
                  <span>Total Due:</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-950 font-black'}`}>{formatGhs(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-stone-400">
                  <span>Total Tendered:</span>
                  <span className="text-[#FF4500] dark:text-[#FF5722] font-bold">{formatGhs(totalAllocated)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-slate-200 dark:border-[#282B34] pt-2">
                  <span className={remainingDue > 0 ? 'text-[#FF4500] dark:text-[#FF5722]' : isDark ? 'text-stone-300' : 'text-slate-800'}>
                    {remainingDue > 0 ? 'Remaining Balance:' : 'Settled in Full'}
                  </span>
                  <span className={remainingDue > 0 ? 'text-[#FF4500] dark:text-[#FF5722]' : isDark ? 'text-stone-300' : 'text-slate-800 font-black'}>
                    {formatGhs(remainingDue)}
                  </span>
                </div>
              </div>

              {/* Tenders Breakdown */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {payments.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-stone-400 text-center py-4 italic">No tenders applied yet.</p>
                ) : (
                  payments.map((p, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono tabular-nums ${
                        isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <div>
                        <span className={`font-semibold font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {p.type === 'CASH' && 'Cash'}
                          {p.type === 'MOMO_MTN' && 'MTN MoMo'}
                          {p.type === 'MOMO_TELECEL' && 'Telecel Cash'}
                          {p.type === 'MOMO_AT' && 'AT Money'}
                          {p.type === 'CARD' && 'Bank Card'}
                          {p.type === 'CUSTOMER_DEBT_BISA' && 'Bisa Debt'}
                          {p.type === 'LOYALTY_POINTS' && 'Akwaaba Points'}
                        </span>
                        {p.momoTxId && <span className="text-[10px] text-slate-500 dark:text-stone-400 block">{p.momoTxId}</span>}
                        {p.type === 'LOYALTY_POINTS' && (
                          <span className="text-[10px] text-[#FF4500] dark:text-[#FF5722] block font-mono">
                            Redeemed {p.loyaltyPointsRedeemed || Math.round(p.amount * 10)} pts
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {formatGhs(p.amount)}
                        </span>
                        <button onClick={() => handleRemovePayment(i)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Complete Sale Action */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={remainingDue > 0.05}
                className="w-full py-3.5 bg-[#FF4500] hover:bg-[#E03E00] disabled:opacity-40 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF4500]/25 cursor-pointer transition active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>COMPLETE SALE & PRINT RECEIPT</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`w-full py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  isDark ? 'text-stone-400 hover:text-white' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
                }`}
              >
                Cancel / Return to Cart
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
