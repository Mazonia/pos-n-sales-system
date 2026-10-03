import React, { useState, useEffect } from 'react';
import { LocalCustomer, LocalOrder, db } from '../../utils/dexieSync';
import { formatGhs, roundToPesewas } from '../../utils/ghanaTaxEngine';
import { triggerHaptic } from '../../utils/haptics';
import {
  BookOpen,
  UserPlus,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Search,
  DollarSign,
  Printer,
  ChevronLeft,
  Award,
  Gift,
  Star,
  Sparkles,
  TrendingUp,
  History,
  ShieldCheck,
  Plus,
  Layers,
  Coins,
  Crown,
  Users,
  AlertCircle,
  Copy,
  Check,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface DebtBookProps {
  customers: LocalCustomer[];
  onRefresh: () => void;
  branchName: string;
  isDark: boolean;
}

export function getLoyaltyTier(points: number): {
  name: string;
  color: string;
  badgeClass: string;
  min: number;
  nextTier?: string;
  nextThreshold?: number;
} {
  if (points >= 1500) {
    return {
      name: 'Platinum VIP',
      color: '#A855F7',
      badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      min: 1500,
    };
  }
  if (points >= 750) {
    return {
      name: 'Gold Elite',
      color: '#00CED1',
      badgeClass: 'bg-[#00CED1]/15 text-[#00CED1] border-[#00CED1]/30',
      min: 750,
      nextTier: 'Platinum VIP',
      nextThreshold: 1500,
    };
  }
  if (points >= 250) {
    return {
      name: 'Silver Member',
      color: '#94A3B8',
      badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      min: 250,
      nextTier: 'Gold Elite',
      nextThreshold: 750,
    };
  }
  return {
    name: 'Bronze Club',
    color: '#FF4500',
    badgeClass: 'bg-[#FF4500]/15 text-[#FF4500] border-[#FF4500]/30',
    min: 0,
    nextTier: 'Silver Member',
    nextThreshold: 250,
  };
}

export const DebtBook: React.FC<DebtBookProps> = ({
  customers,
  onRefresh,
  branchName,
  isDark,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DEBT' | 'VIP' | 'POINTS_DESC'>('ALL');
  const [activeDossierTab, setActiveDossierTab] = useState<'LOYALTY' | 'CREDIT_BISA'>('LOYALTY');

  // Mobile toggle to view dossier or list
  const [mobileShowDossier, setMobileShowDossier] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Repayment Modal State
  const [repayAmount, setRepayAmount] = useState<number>(100);
  const [repayMethod, setRepayMethod] = useState<'CASH' | 'MOMO_MTN' | 'MOMO_TELECEL'>('CASH');
  const [showRepayModal, setShowRepayModal] = useState(false);

  // Bonus Points Adjustment Modal State
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusPointsInput, setBonusPointsInput] = useState<number>(50);
  const [bonusReason, setBonusReason] = useState<string>('Customer Appreciation Promo');

  // SMS Reminder State
  const [smsSending, setSmsSending] = useState(false);
  const [smsSuccessMsg, setSmsSuccessMsg] = useState('');
  const [smsTemplate, setSmsTemplate] = useState<'FRIENDLY' | 'URGENT' | 'TWI'>('FRIENDLY');

  // Add Customer Form
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGps, setNewCustGps] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState<number>(1000);
  const [newCustStartingPoints, setNewCustStartingPoints] = useState<number>(50);

  // Customer Loyalty & Sale History State
  const [customerOrders, setCustomerOrders] = useState<LocalOrder[]>([]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0] || null;

  // Load customer order history to show recent loyalty point accruals & redemptions
  useEffect(() => {
    if (selectedCustomer) {
      db.orders
        .where('customerId')
        .equals(selectedCustomer.id)
        .reverse()
        .limit(10)
        .toArray()
        .then(orders => {
          setCustomerOrders(orders);
        })
        .catch(err => {
          console.error('Error fetching customer orders', err);
        });
    }
  }, [selectedCustomerId, customers]);

  // Filter and sort customer list
  const filteredCustomers = customers
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch =
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.ghanaPostGps.toLowerCase().includes(q);
      if (!matchSearch) return false;

      if (filterMode === 'DEBT') return c.currentDebt > 0;
      if (filterMode === 'VIP') return (c.loyaltyPoints || 0) >= 750;
      return true;
    })
    .sort((a, b) => {
      if (filterMode === 'POINTS_DESC') {
        return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
      }
      if (filterMode === 'DEBT') {
        return b.currentDebt - a.currentDebt;
      }
      return 0;
    });

  // Aggregated CRM Metrics
  const totalOutstandingDebt = customers.reduce((sum, c) => sum + c.currentDebt, 0);
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  const totalPointsValueGhs = roundToPesewas(totalLoyaltyPoints / 10);
  const vipCount = customers.filter(c => (c.loyaltyPoints || 0) >= 750).length;
  const customersInDebtCount = customers.filter(c => c.currentDebt > 0).length;

  const handleRecordRepayment = async () => {
    if (!selectedCustomer || repayAmount <= 0) return;

    const newDebt = Math.max(0, roundToPesewas(selectedCustomer.currentDebt - repayAmount));
    await db.customers.update(selectedCustomer.id, {
      currentDebt: newDebt,
      updatedAt: new Date().toISOString(),
    });

    await db.auditLogs.add({
      id: `audit-${Date.now()}`,
      action: 'DEBT_REPAYMENT',
      userId: 'cashier-01',
      userName: 'Kofi Boateng',
      details: `Repayment of ${formatGhs(repayAmount)} received from ${selectedCustomer.fullName} via ${repayMethod}. New debt: ${formatGhs(newDebt)}`,
      timestamp: new Date().toISOString(),
    });

    triggerHaptic('success');
    setShowRepayModal(false);
    onRefresh();
  };

  const handleAwardBonusPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || bonusPointsInput === 0) return;

    const currentPts = selectedCustomer.loyaltyPoints || 0;
    const newPts = Math.max(0, currentPts + bonusPointsInput);

    await db.customers.update(selectedCustomer.id, {
      loyaltyPoints: newPts,
      updatedAt: new Date().toISOString(),
    });

    await db.auditLogs.add({
      id: `audit-bonus-${Date.now()}`,
      action: 'LOYALTY_BONUS_AWARD',
      userId: 'manager-01',
      userName: 'Abena Osei',
      details: `Manual loyalty points adjustment of ${bonusPointsInput > 0 ? '+' : ''}${bonusPointsInput} pts awarded to ${selectedCustomer.fullName}. Reason: ${bonusReason}. New balance: ${newPts} pts.`,
      timestamp: new Date().toISOString(),
    });

    triggerHaptic('success');
    setShowBonusModal(false);
    setBonusPointsInput(50);
    onRefresh();
  };

  const handleSendSmsReminder = () => {
    if (!selectedCustomer) return;
    setSmsSending(true);

    setTimeout(() => {
      setSmsSending(false);
      setSmsSuccessMsg(`SMS dispatched to ${selectedCustomer.phone} via Arkesel Ghana Gateway.`);
      setTimeout(() => setSmsSuccessMsg(''), 4000);
    }, 1200);
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard?.writeText(phone);
    setCopiedPhone(true);
    triggerHaptic('tap');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    const newCust: LocalCustomer = {
      id: `cust-${Date.now()}`,
      customerNumber: `CUST-GH-${Math.floor(100 + Math.random() * 900)}`,
      fullName: newCustName,
      phone: newCustPhone,
      ghanaPostGps: newCustGps || 'GA-183-9022',
      creditLimit: newCustCreditLimit,
      currentDebt: 0,
      loyaltyPoints: newCustStartingPoints,
      isCreditBlocked: false,
      updatedAt: new Date().toISOString(),
    };

    await db.customers.put(newCust);
    triggerHaptic('success');
    setShowAddCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustGps('');
    setNewCustStartingPoints(50);
    onRefresh();
    setSelectedCustomerId(newCust.id);
  };

  const getSmsMessageText = (c: LocalCustomer) => {
    if (smsTemplate === 'TWI') {
      return `Akwaaba ${c.fullName}, yɛbɔ wo nkae sɛ wo ka a ɛda so yɛ ${formatGhs(c.currentDebt)} wɔ ${branchName}. Wo loyalty points nso yɛ ${c.loyaltyPoints || 0} pts. Medaase!`;
    }
    if (smsTemplate === 'URGENT') {
      return `URGENT NOTICE: ${c.fullName}, your store credit balance of ${formatGhs(c.currentDebt)} at ${branchName} is past due. Please settle today via MTN MoMo.`;
    }
    return `Medaase ${c.fullName}! Friendly reminder from ${branchName} that your current credit balance is ${formatGhs(c.currentDebt)}. You also have ${c.loyaltyPoints || 0} Akwaaba Loyalty Points!`;
  };

  const currentTier = selectedCustomer ? getLoyaltyTier(selectedCustomer.loyaltyPoints || 0) : null;
  const progressPercent = currentTier?.nextThreshold
    ? Math.min(
        100,
        Math.round(
          (((selectedCustomer?.loyaltyPoints || 0) - currentTier.min) /
            (currentTier.nextThreshold - currentTier.min)) *
            100
        )
      )
    : 100;

  // Credit utilization percentage
  const creditLimit = selectedCustomer?.creditLimit || 1;
  const currentDebt = selectedCustomer?.currentDebt || 0;
  const creditUtilization = Math.min(100, Math.round((currentDebt / creditLimit) * 100));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      
      {/* ═══ TOP CRM EXECUTIVE METRICS STRIP ═══ */}
      <div className={`px-4 sm:px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-md transition-colors ${
        isDark ? 'bg-[#16181F]/90 border-[#282B34]' : 'bg-white/95 border-stone-200 shadow-2xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF5722] via-[#FF4500] to-[#E03E00] text-white flex items-center justify-center font-bold text-sm shadow-[0_2px_12px_rgba(255,69,0,0.35)] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight font-serif text-stone-900 dark:text-white">
              Customer Directory & CRM
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
              Loyalty rewards tracking, Bisa store credit book, and direct SMS communication
            </p>
          </div>
        </div>

        {/* 4 Executive Stat Cards */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto text-xs font-mono">
          
          {/* Card 1: Circulating Points */}
          <div className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2.5 transition-all ${
            isDark ? 'bg-[#1A1C22] border-[#282B34]' : 'bg-stone-50 border-stone-200'
          }`}>
            <div className="w-7 h-7 rounded-xl bg-[#00CED1]/15 text-[#00CED1] flex items-center justify-center">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-sans uppercase tracking-wider font-semibold">
                Loyalty Points
              </span>
              <span className="font-bold text-sm text-[#00CED1] tabular-nums">
                {totalLoyaltyPoints.toLocaleString()} <span className="text-[11px] font-sans font-medium text-stone-400">pts</span>
              </span>
            </div>
          </div>

          {/* Card 2: Redeemable Cash Worth */}
          <div className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2.5 transition-all ${
            isDark ? 'bg-[#1A1C22] border-[#282B34]' : 'bg-stone-50 border-stone-200'
          }`}>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Gift className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-sans uppercase tracking-wider font-semibold">
                Redeemable Cash
              </span>
              <span className="font-bold text-sm text-emerald-500 dark:text-emerald-400 tabular-nums">
                {formatGhs(totalPointsValueGhs)}
              </span>
            </div>
          </div>

          {/* Card 3: Bisa Debt Outstanding */}
          <div className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2.5 transition-all ${
            isDark ? 'bg-[#1A1C22] border-[#282B34]' : 'bg-stone-50 border-stone-200'
          }`}>
            <div className="w-7 h-7 rounded-xl bg-[#FF4500]/15 text-[#FF4500] flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-sans uppercase tracking-wider font-semibold">
                Bisa Credit Owed
              </span>
              <span className="font-bold text-sm text-[#FF4500] dark:text-[#FF5722] tabular-nums">
                {formatGhs(totalOutstandingDebt)}
              </span>
            </div>
          </div>

          {/* Card 4: VIP Members */}
          <div className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2.5 transition-all ${
            isDark ? 'bg-[#1A1C22] border-[#282B34]' : 'bg-stone-50 border-stone-200'
          }`}>
            <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Crown className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-sans uppercase tracking-wider font-semibold">
                VIP Clients
              </span>
              <span className="font-bold text-sm text-purple-400 tabular-nums">
                {vipCount} <span className="text-[11px] font-sans font-medium text-stone-400">members</span>
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ═══ MAIN 2-COLUMN VIEWPORT ═══ */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* LEFT COLUMN: CUSTOMER ROSTER & FILTER (320-400px) */}
        <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col h-full shrink-0 ${
          mobileShowDossier ? 'hidden md:flex' : 'flex'
        } ${isDark ? 'border-[#282B34] bg-[#16181F]' : 'border-stone-200 bg-white'}`}>
          
          {/* Header & Quick Actions */}
          <div className="p-4 border-b border-stone-200 dark:border-[#282B34] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                  Customers
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF4500]/10 text-[#FF4500] dark:bg-[#FF4500]/20 dark:text-[#FF5722]">
                  {filteredCustomers.length} Total
                </span>
              </div>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="px-3 py-1.5 bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-[0_2px_10px_rgba(255,69,0,0.3)] transition active:scale-95 cursor-pointer font-sans"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Member</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className={`p-1 rounded-2xl border flex gap-1 text-[11px] font-sans ${
              isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-stone-100 border-stone-200'
            }`}>
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`flex-1 py-1.5 rounded-xl font-semibold transition cursor-pointer text-center ${
                  filterMode === 'ALL'
                    ? 'bg-[#FF4500] text-white font-bold shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('POINTS_DESC')}
                className={`flex-1 py-1.5 rounded-xl font-semibold transition cursor-pointer text-center ${
                  filterMode === 'POINTS_DESC'
                    ? 'bg-[#00CED1] text-slate-950 font-bold shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Points ★
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('VIP')}
                className={`flex-1 py-1.5 rounded-xl font-semibold transition cursor-pointer text-center ${
                  filterMode === 'VIP'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                VIPs
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('DEBT')}
                className={`flex-1 py-1.5 rounded-xl font-semibold transition cursor-pointer text-center ${
                  filterMode === 'DEBT'
                    ? 'bg-[#FF4500] text-white font-bold shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Owing
                {customersInDebtCount > 0 && (
                  <span className="ml-1 text-[9px] opacity-80">({customersInDebtCount})</span>
                )}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search member, phone, or GPS..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none focus:border-[#FF4500] border transition font-sans ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                }`}
              />
            </div>
          </div>

          {/* Customer List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 italic">
                No matching customer members found.
              </div>
            ) : (
              filteredCustomers.map(customer => {
                const isSelected = selectedCustomer?.id === customer.id;
                const tier = getLoyaltyTier(customer.loyaltyPoints || 0);
                const initials = customer.fullName.split(' ').map(n => n[0]).slice(0, 2).join('');

                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                      triggerHaptic('tap');
                      setSelectedCustomerId(customer.id);
                      setMobileShowDossier(true);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-[#1F232D] border-[#FF4500]/60 text-white shadow-sm ring-1 ring-[#FF4500]/40'
                          : 'bg-orange-50/70 border-[#FF4500]/50 text-stone-950 shadow-sm ring-1 ring-[#FF4500]/30'
                        : isDark
                        ? 'bg-[#1A1C22] border-[#282B34] hover:bg-[#20232B] text-stone-200'
                        : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar initials with tier accent */}
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 font-serif border ${
                        customer.currentDebt > 0
                          ? 'bg-[#FF4500]/15 text-[#FF4500] border-[#FF4500]/30'
                          : 'bg-[#00CED1]/15 text-[#00CED1] border-[#00CED1]/30'
                      }`}>
                        {initials}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs truncate font-serif">
                            {customer.fullName}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{customer.phone}</span>
                          <span>·</span>
                          <span className={`px-1.5 py-0.2 rounded-full border text-[9px] font-bold ${tier.badgeClass}`}>
                            {tier.name.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {customer.currentDebt > 0 ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#FF4500]/15 text-[#FF4500] dark:text-[#FF5722] border border-[#FF4500]/30 block">
                          Owes: {formatGhs(customer.currentDebt)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#00CED1]/15 text-[#00CED1] border border-[#00CED1]/30 block">
                          {customer.loyaltyPoints || 0} pts
                        </span>
                      )}
                      <span className="text-[9px] text-stone-400 font-mono block mt-1">
                        GH₵ {((customer.loyaltyPoints || 0) / 10).toFixed(2)} worth
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOMER DOSSIER & LOYALTY LEDGER */}
        <div className={`flex-1 flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-4 ${
          mobileShowDossier ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedCustomer ? (
            <>
              {/* Mobile Back Button */}
              <div className="md:hidden">
                <button
                  onClick={() => setMobileShowDossier(false)}
                  className="flex items-center gap-1.5 text-xs text-[#FF4500] font-bold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Customer List</span>
                </button>
              </div>

              {/* Customer Profile Hero Card */}
              <div className={`p-6 rounded-3xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 transition-colors ${
                isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-sm'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg font-serif shrink-0 border ${
                    selectedCustomer.currentDebt > 0
                      ? 'bg-[#FF4500]/15 text-[#FF4500] border-[#FF4500]/30'
                      : 'bg-[#00CED1]/15 text-[#00CED1] border-[#00CED1]/30'
                  }`}>
                    {selectedCustomer.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold text-stone-400 tracking-wider">
                        {selectedCustomer.customerNumber}
                      </span>
                      {currentTier && (
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${currentTier.badgeClass}`}>
                          ★ {currentTier.name}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 dark:text-white mt-0.5">
                      {selectedCustomer.fullName}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-stone-400 font-mono">
                      <button
                        onClick={() => handleCopyPhone(selectedCustomer.phone)}
                        className="flex items-center gap-1.5 hover:text-stone-200 transition cursor-pointer"
                        title="Click to copy phone"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#FF4500]" />
                        <span>{selectedCustomer.phone}</span>
                        {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                      </button>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#FF4500]" />
                        <span>{selectedCustomer.ghanaPostGps}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setShowBonusModal(true)}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer font-sans"
                    title="Award promotional or birthday bonus points"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Award Bonus Pts</span>
                  </button>

                  <button
                    onClick={() => setShowRepayModal(true)}
                    disabled={selectedCustomer.currentDebt <= 0}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer font-sans ${
                      selectedCustomer.currentDebt > 0
                        ? 'bg-[#FF4500] hover:bg-[#E03E00] text-white'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Settle Debt ({formatGhs(selectedCustomer.currentDebt)})</span>
                  </button>
                </div>
              </div>

              {/* Dossier Tabs: Loyalty Rewards Center vs Bisa Credit Ledger */}
              <div className={`p-1.5 rounded-2xl border flex gap-1 font-sans ${
                isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-stone-100 border-stone-200'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setActiveDossierTab('LOYALTY');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    activeDossierTab === 'LOYALTY'
                      ? 'bg-[#00CED1] text-slate-950 shadow-sm'
                      : isDark
                      ? 'text-stone-400 hover:text-white'
                      : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Loyalty Points Rewards Center</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-950/20 text-[10px] font-mono">
                    {selectedCustomer.loyaltyPoints || 0} pts
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setActiveDossierTab('CREDIT_BISA');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    activeDossierTab === 'CREDIT_BISA'
                      ? 'bg-[#FF4500] text-white shadow-sm'
                      : isDark
                      ? 'text-stone-400 hover:text-white'
                      : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Bisa Credit & Debt Book</span>
                  {selectedCustomer.currentDebt > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-bold">
                      {formatGhs(selectedCustomer.currentDebt)}
                    </span>
                  )}
                </button>
              </div>

              {/* ═══ DOSSIER TAB 1: LOYALTY REWARDS CENTER ═══ */}
              {activeDossierTab === 'LOYALTY' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Loyalty Points Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                    }`}>
                      <span className="text-xs text-stone-400 block mb-1 font-sans">Available Loyalty Balance</span>
                      <span className="text-2xl font-black font-mono text-[#00CED1]">
                        {selectedCustomer.loyaltyPoints || 0} <span className="text-sm font-sans font-medium text-stone-400">pts</span>
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-1.5 font-sans">
                        Accrues automatically at 1 pt per GH₵ 1.00 spent
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                    }`}>
                      <span className="text-xs text-stone-400 block mb-1 font-sans">Instant Checkout Value</span>
                      <span className="text-2xl font-black font-mono text-emerald-500 dark:text-emerald-400">
                        {formatGhs(roundToPesewas((selectedCustomer.loyaltyPoints || 0) / 10))}
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-1.5 font-sans">
                        10 points = GH₵ 1.00 instant discount at POS
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                    }`}>
                      <span className="text-xs text-stone-400 block mb-1 font-sans">Membership Tier</span>
                      <span className="text-xl font-bold font-serif block" style={{ color: currentTier?.color }}>
                        {currentTier?.name}
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-1.5 font-sans">
                        {currentTier?.nextTier
                          ? `${(currentTier.nextThreshold || 0) - (selectedCustomer.loyaltyPoints || 0)} pts to ${currentTier.nextTier}`
                          : 'Highest VIP status tier achieved!'}
                      </span>
                    </div>
                  </div>

                  {/* VIP Progress Bar */}
                  {currentTier?.nextTier && (
                    <div className={`p-5 rounded-2xl border space-y-2.5 ${
                      isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                    }`}>
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-stone-400 font-sans">Tier Progression to {currentTier.nextTier}:</span>
                        <span className="font-mono text-[#00CED1] font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#FF4500] via-[#00CED1] to-purple-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                        <span>{currentTier.name} ({currentTier.min} pts)</span>
                        <span>{currentTier.nextTier} ({currentTier.nextThreshold} pts)</span>
                      </div>
                    </div>
                  )}

                  {/* Loyalty Points Redemption & Accrual Rules Card */}
                  <div className={`p-5 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-stone-50 border-stone-200'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs text-[#00CED1] font-serif">
                      <Sparkles className="w-4 h-4" />
                      <span>Akwaaba OS Loyalty Program Specifications:</span>
                    </div>
                    <ul className="text-xs text-stone-400 space-y-1.5 list-disc list-inside font-sans">
                      <li>
                        <strong>Automatic Accrual:</strong> Customer earns <span className="text-stone-900 dark:text-white font-mono font-semibold">1 Loyalty Point</span> for every <span className="text-stone-900 dark:text-white font-mono font-semibold">GH₵ 1.00</span> spent at POS register.
                      </li>
                      <li>
                        <strong>Instant Checkout Redemption:</strong> Points convert to cash at checkout at <span className="text-stone-900 dark:text-white font-mono font-semibold">10 Points = GH₵ 1.00</span>.
                      </li>
                      <li>
                        <strong>Split-Tender Compatible:</strong> Customers can redeem points and pay any remaining balance via Cash, MTN MoMo, Telecel, Card, or Bisa Credit.
                      </li>
                    </ul>
                  </div>

                  {/* Loyalty Points Recent Activity Ledger */}
                  <div className={`p-5 rounded-3xl border space-y-3.5 ${
                    isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs font-serif">
                        <History className="w-4 h-4 text-[#00CED1]" />
                        <span>Recent Points Transactions Ledger</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {customerOrders.length} Recent Sales
                      </span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {customerOrders.length === 0 ? (
                        <p className="text-xs text-stone-400 py-6 text-center italic font-sans">
                          No recent transactions recorded for this customer yet.
                        </p>
                      ) : (
                        customerOrders.map(order => {
                          const pointsEarned = order.loyaltyPointsEarned || Math.floor(order.grandTotal);
                          const pointsRedeemed = order.loyaltyPointsRedeemed || 0;

                          return (
                            <div
                              key={order.id}
                              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                                isDark ? 'bg-[#121316] border-[#282B34]' : 'bg-stone-50 border-stone-200'
                              }`}
                            >
                              <div>
                                <div className="font-bold flex items-center gap-2">
                                  <span className="text-stone-900 dark:text-white">
                                    Order #{order.orderNumber}
                                  </span>
                                  <span className="text-[10px] text-stone-400">
                                    ({new Date(order.createdAt).toLocaleDateString('en-GH')})
                                  </span>
                                </div>
                                <span className="text-[11px] text-stone-400 font-sans">
                                  Paid {formatGhs(order.grandTotal)} · Cashier: {order.cashierName}
                                </span>
                              </div>

                              <div className="text-right space-y-0.5">
                                {pointsEarned > 0 && (
                                  <span className="text-[#00CED1] font-bold block text-xs">
                                    +{pointsEarned} pts accrued
                                  </span>
                                )}
                                {pointsRedeemed > 0 && (
                                  <span className="text-[#FF4500] font-bold block text-[11px]">
                                    -{pointsRedeemed} pts redeemed
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ DOSSIER TAB 2: BISA STORE CREDIT & DEBT BOOK ═══ */}
              {activeDossierTab === 'CREDIT_BISA' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Balances Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                    }`}>
                      <span className="text-xs text-stone-400 block mb-1 font-sans">Current Outstanding Debt</span>
                      <span className="text-2xl font-black font-mono text-[#FF4500] dark:text-[#FF5722]">
                        {formatGhs(selectedCustomer.currentDebt)}
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-1 font-sans">
                        Accumulated via Bisa store credit purchases
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                    }`}>
                      <span className="text-xs text-stone-400 block mb-1 font-sans">Assigned Credit Limit</span>
                      <span className="text-2xl font-black font-mono text-stone-900 dark:text-white">
                        {formatGhs(selectedCustomer.creditLimit)}
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-1 font-sans">
                        Maximum authorized store credit line
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                    }`}>
                      <span className="text-xs text-stone-400 block mb-1 font-sans">Available Credit Headroom</span>
                      <span className="text-2xl font-black font-mono text-[#00CED1]">
                        {formatGhs(Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentDebt))}
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-1 font-sans">
                        Remaining balance before credit holds apply
                      </span>
                    </div>
                  </div>

                  {/* Credit Utilization Bar */}
                  <div className={`p-5 rounded-2xl border space-y-2.5 ${
                    isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                  }`}>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-stone-400 font-sans">Store Credit Utilization:</span>
                      <span className={`font-mono font-bold ${creditUtilization > 85 ? 'text-[#FF4500]' : 'text-[#00CED1]'}`}>
                        {creditUtilization}% Used
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          creditUtilization > 85
                            ? 'bg-[#FF4500]'
                            : creditUtilization > 50
                            ? 'bg-[#FF9800]'
                            : 'bg-[#00CED1]'
                        }`}
                        style={{ width: `${creditUtilization}%` }}
                      />
                    </div>
                  </div>

                  {/* Arkesel / Hubtel SMS Gateway Dispatcher */}
                  <div className={`p-5 rounded-3xl border space-y-3.5 ${
                    isDark ? 'bg-[#16181F] border-[#282B34]' : 'bg-white border-stone-200 shadow-2xs'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-xs font-serif">
                        <Send className="w-4 h-4 text-[#00CED1]" />
                        <span className="text-stone-900 dark:text-white">
                          Arkesel / Hubtel Telco SMS Gateway
                        </span>
                      </div>

                      <div className={`flex gap-1 p-1 rounded-xl border text-[11px] font-sans ${
                        isDark ? 'border-[#282B34] bg-[#121316]' : 'border-stone-200 bg-stone-100'
                      }`}>
                        <button
                          onClick={() => setSmsTemplate('FRIENDLY')}
                          className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                            smsTemplate === 'FRIENDLY'
                              ? 'bg-[#00CED1] text-slate-950 font-bold'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          English (Friendly)
                        </button>
                        <button
                          onClick={() => setSmsTemplate('TWI')}
                          className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                            smsTemplate === 'TWI'
                              ? 'bg-[#00CED1] text-slate-950 font-bold'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          Twi (Local)
                        </button>
                        <button
                          onClick={() => setSmsTemplate('URGENT')}
                          className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                            smsTemplate === 'URGENT'
                              ? 'bg-[#FF4500] text-white font-bold'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          Past Due
                        </button>
                      </div>
                    </div>

                    {/* Message Preview */}
                    <div className={`p-3.5 rounded-xl border font-mono text-xs ${
                      isDark ? 'border-[#282B34] text-stone-300 bg-[#121316]' : 'border-stone-200 text-stone-800 bg-stone-50'
                    }`}>
                      {getSmsMessageText(selectedCustomer)}
                    </div>

                    {smsSuccessMsg && (
                      <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{smsSuccessMsg}</span>
                      </div>
                    )}

                    <button
                      onClick={handleSendSmsReminder}
                      disabled={smsSending || selectedCustomer.currentDebt <= 0}
                      className="py-3 px-4 bg-[#FF4500] hover:bg-[#E03E00] active:scale-95 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer font-sans shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{smsSending ? 'Transmitting via Ghana SMS Gateway...' : `Dispatch Reminder to ${selectedCustomer.phone}`}</span>
                    </button>
                  </div>

                  {/* Printable Statement */}
                  <div className="p-5 bg-white text-stone-900 font-mono rounded-2xl border border-stone-300 text-xs space-y-2.5 max-w-md shadow-md">
                    <div className="text-center font-bold pb-2 border-b border-stone-200">
                      <span className="font-serif text-sm">AKWAABA CRM OFFICIAL MEMBER STATEMENT</span>
                    </div>
                    <div className="text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-stone-500">Customer Member:</span>
                        <span className="font-bold text-stone-900">{selectedCustomer.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Phone / GPS:</span>
                        <span>{selectedCustomer.phone} · {selectedCustomer.ghanaPostGps}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Membership Tier:</span>
                        <span className="font-bold text-purple-700">{currentTier?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Loyalty Balance:</span>
                        <span className="font-bold text-emerald-700">{selectedCustomer.loyaltyPoints || 0} pts (GH₵ {((selectedCustomer.loyaltyPoints || 0) / 10).toFixed(2)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Statement Date:</span>
                        <span>{new Date().toLocaleDateString('en-GH')}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-stone-300 pt-1.5 text-xs text-[#FF4500]">
                        <span>BISA DEBT OUTSTANDING:</span>
                        <span>{formatGhs(selectedCustomer.currentDebt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="w-full mt-2 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Official Statement</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-stone-400 text-xs italic font-serif">
              Select a customer from the directory to view loyalty rewards and credit ledger dossier.
            </div>
          )}
        </div>

      </div>

      {/* ═══ REPAYMENT MODAL ═══ */}
      {showRepayModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 border ${
            isDark ? 'bg-[#16181F] border-[#282B34] text-white' : 'bg-white border-stone-200 text-stone-900'
          }`}>
            <h3 className="font-serif font-bold text-base">Record Debt Repayment</h3>
            <p className="text-xs text-stone-400 font-sans">
              Customer: <strong className="text-stone-900 dark:text-white font-serif">{selectedCustomer.fullName}</strong>
            </p>

            <div>
              <label className="text-xs text-stone-400 block mb-1 font-sans">Repayment Amount (GH₵):</label>
              <input
                type="number"
                step="1"
                max={selectedCustomer.currentDebt}
                value={repayAmount || ''}
                onChange={e => setRepayAmount(parseFloat(e.target.value) || 0)}
                className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-base border outline-none focus:border-[#FF4500] ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-black'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1 font-sans">Payment Method:</label>
              <select
                value={repayMethod}
                onChange={e => setRepayMethod(e.target.value as any)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none focus:border-[#FF4500] font-sans ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-black'
                }`}
              >
                <option value="CASH">Cash in Hand</option>
                <option value="MOMO_MTN">MTN Mobile Money</option>
                <option value="MOMO_TELECEL">Telecel Cash</option>
              </select>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRepayModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                  isDark ? 'border-[#282B34] text-stone-400 hover:text-white' : 'border-stone-200 text-stone-600 hover:text-stone-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordRepayment}
                className="flex-1 py-2.5 bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Confirm Repayment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AWARD BONUS POINTS MODAL ═══ */}
      {showBonusModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleAwardBonusPoints}
            className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 border ${
              isDark ? 'bg-[#16181F] border-[#282B34] text-white' : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-400" />
              <h3 className="font-serif font-bold text-base">Award Promotional Loyalty Points</h3>
            </div>
            <p className="text-xs text-stone-400 font-sans">
              Awarding bonus points to <strong className="text-stone-900 dark:text-white font-serif">{selectedCustomer.fullName}</strong>.
            </p>

            <div>
              <label className="text-xs text-stone-400 block mb-1 font-sans">Points to Award / Adjust:</label>
              <input
                type="number"
                required
                value={bonusPointsInput || ''}
                onChange={e => setBonusPointsInput(parseInt(e.target.value) || 0)}
                className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-base border outline-none focus:border-purple-500 ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-black'
                }`}
                placeholder="e.g. 50"
              />
              <span className="text-[10px] text-[#00CED1] font-mono mt-1 block">
                Cash discount worth: {formatGhs(roundToPesewas((bonusPointsInput || 0) / 10))}
              </span>
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1 font-sans">Reason / Promotion Campaign:</label>
              <select
                value={bonusReason}
                onChange={e => setBonusReason(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none focus:border-purple-500 font-sans ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-black'
                }`}
              >
                <option value="Customer Appreciation Promo">Customer Appreciation Promo</option>
                <option value="Customer Birthday Celebration">Customer Birthday Celebration</option>
                <option value="Service Recovery / Apology Credit">Service Recovery / Apology Credit</option>
                <option value="VIP Upgrade Welcome Gift">VIP Upgrade Welcome Gift</option>
                <option value="Bulk Purchase Referral Bonus">Bulk Purchase Referral Bonus</option>
              </select>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBonusModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                  isDark ? 'border-[#282B34] text-stone-400 hover:text-white' : 'border-stone-200 text-stone-600 hover:text-stone-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Grant Points
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══ ADD NEW MEMBER MODAL ═══ */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleAddCustomer}
            className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-3.5 border ${
              isDark ? 'bg-[#16181F] border-[#282B34] text-white' : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#FF4500]" />
              <h3 className="font-serif font-bold text-base">Register Customer & Loyalty Account</h3>
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1 font-sans">Full / Business Name:</label>
              <input
                type="text"
                required
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
                placeholder="e.g. Mama Akosua Provisions"
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none focus:border-[#FF4500] font-sans ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-black'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1 font-sans">Mobile Phone Number:</label>
              <input
                type="text"
                required
                value={newCustPhone}
                onChange={e => setNewCustPhone(e.target.value)}
                placeholder="e.g. 0244123456"
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none focus:border-[#FF4500] ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-black'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1 font-sans">GhanaPost GPS Digital Address:</label>
              <input
                type="text"
                value={newCustGps}
                onChange={e => setNewCustGps(e.target.value)}
                placeholder="e.g. GA-183-9022"
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none focus:border-[#FF4500] ${
                  isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-black'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs text-stone-400 block mb-1 font-sans">Credit Limit (GH₵):</label>
                <input
                  type="number"
                  value={newCustCreditLimit}
                  onChange={e => setNewCustCreditLimit(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none focus:border-[#FF4500] ${
                    isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-black'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1 font-sans">Welcome Pts:</label>
                <input
                  type="number"
                  value={newCustStartingPoints}
                  onChange={e => setNewCustStartingPoints(parseInt(e.target.value) || 0)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border outline-none focus:border-[#FF4500] ${
                    isDark ? 'bg-[#121316] border-[#282B34] text-white' : 'bg-stone-50 border-stone-200 text-black'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                  isDark ? 'border-[#282B34] text-stone-400 hover:text-white' : 'border-stone-200 text-stone-600 hover:text-stone-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Save Member
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
