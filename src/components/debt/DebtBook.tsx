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
  SlidersHorizontal,
  ArrowUpRight,
  Clock
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
      name: 'Amber Elite',
      color: '#F59E0B',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      min: 750,
      nextTier: 'Platinum VIP',
      nextThreshold: 1500,
    };
  }
  if (points >= 250) {
    return {
      name: 'Silver Member',
      color: '#A1A1AA',
      badgeClass: 'bg-stone-500/15 text-stone-300 border-stone-500/30',
      min: 250,
      nextTier: 'Amber Elite',
      nextThreshold: 750,
    };
  }
  return {
    name: 'Bronze Club',
    color: '#D97706',
    badgeClass: 'bg-amber-700/15 text-amber-600 dark:text-amber-500 border-amber-700/30',
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      
      {/* TOP CRM SUMMARY METRICS STRIP */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
            isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700'
          }`}>
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-[#F4F6F8]' : 'text-[#0F172A]'}`}>
              CRM & Customer Loyalty Rewards
            </h2>
            <p className="text-[11px] text-[#8A99A8]">
              Automated points accrual per sale, redemption at checkout, and Bisa debt ledger
            </p>
          </div>
        </div>

        {/* 4 Stat Badges */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto text-xs font-mono">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
          }`}>
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <div>
              <span className="text-[10px] text-[#8A99A8] block font-sans">Points Circulating:</span>
              <span className="font-bold text-amber-400">{totalLoyaltyPoints.toLocaleString()} pts</span>
            </div>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
          }`}>
            <Gift className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="text-[10px] text-[#8A99A8] block font-sans">Redeemable Value:</span>
              <span className="font-bold text-emerald-400">{formatGhs(totalPointsValueGhs)}</span>
            </div>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
          }`}>
            <Crown className="w-3.5 h-3.5 text-purple-400" />
            <div>
              <span className="text-[10px] text-[#8A99A8] block font-sans">VIP Members:</span>
              <span className="font-bold text-purple-400">{vipCount}</span>
            </div>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
          }`}>
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <div>
              <span className="text-[10px] text-[#8A99A8] block font-sans">Bisa Credit Owed:</span>
              <span className="font-bold text-amber-500">{formatGhs(totalOutstandingDebt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CRM 2-COLUMN VIEWPORT */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* LEFT COLUMN: CUSTOMER ROSTER & FILTER (320-380px) */}
        <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col h-full shrink-0 ${
          mobileShowDossier ? 'hidden md:flex' : 'flex'
        } ${isDark ? 'border-[#242D37] bg-[#0E1217]' : 'border-[#E2E5E9] bg-white'}`}>
          
          {/* Header & Search */}
          <div className="p-3.5 border-b border-[#242D37]/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className={`font-bold text-xs ${isDark ? 'text-[#F4F6F8]' : 'text-[#0F172A]'}`}>
                Customer Directory ({filteredCustomers.length})
              </span>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Member</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className={`p-1 rounded-xl border flex gap-1 text-[11px] ${
              isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
            }`}>
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`flex-1 py-1 rounded-lg font-semibold transition ${
                  filterMode === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-[#8A99A8] hover:text-[#F4F6F8]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('POINTS_DESC')}
                className={`flex-1 py-1 rounded-lg font-semibold transition ${
                  filterMode === 'POINTS_DESC'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-[#8A99A8] hover:text-[#F4F6F8]'
                }`}
              >
                Points ★
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('VIP')}
                className={`flex-1 py-1 rounded-lg font-semibold transition ${
                  filterMode === 'VIP'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-[#8A99A8] hover:text-[#F4F6F8]'
                }`}
              >
                VIP Tiers
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('DEBT')}
                className={`flex-1 py-1 rounded-lg font-semibold transition ${
                  filterMode === 'DEBT'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-[#8A99A8] hover:text-[#F4F6F8]'
                }`}
              >
                With Debt
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A99A8]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search member, phone, or GPS..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none focus:border-amber-500 border transition ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-[#0F172A]'
                }`}
              />
            </div>
          </div>

          {/* Customer Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8A99A8] italic">
                No matching customer members found.
              </div>
            ) : (
              filteredCustomers.map(customer => {
                const isSelected = selectedCustomer?.id === customer.id;
                const tier = getLoyaltyTier(customer.loyaltyPoints || 0);

                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                      triggerHaptic('tap');
                      setSelectedCustomerId(customer.id);
                      setMobileShowDossier(true);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-xs'
                          : 'bg-amber-50 border-amber-400 text-slate-950 shadow-xs'
                        : isDark
                        ? 'bg-[#11151A] border-[#242D37] hover:bg-[#1A2027]'
                        : 'bg-white border-[#E2E5E9] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-1 pr-2 truncate">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {customer.fullName}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8A99A8] font-mono mt-0.5 flex items-center gap-1.5">
                        <span>{customer.phone}</span>
                        <span>·</span>
                        <span className={`px-1.5 py-0.2 rounded-full border text-[9px] font-bold ${tier.badgeClass}`}>
                          {tier.name.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-xs text-emerald-400 block">
                        {customer.loyaltyPoints || 0} pts
                      </span>
                      {customer.currentDebt > 0 ? (
                        <span className="text-[10px] font-mono font-semibold text-amber-500 block">
                          Debt: {formatGhs(customer.currentDebt)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#8A99A8] font-mono">
                          GH₵ {((customer.loyaltyPoints || 0) / 10).toFixed(2)}
                        </span>
                      )}
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
                  className="flex items-center gap-1 text-xs text-amber-500 font-bold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Customer Directory</span>
                </button>
              </div>

              {/* Customer Profile Header Card */}
              <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold text-[#8A99A8] tracking-wider">
                      {selectedCustomer.customerNumber}
                    </span>
                    {currentTier && (
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${currentTier.badgeClass}`}>
                        ★ {currentTier.name}
                      </span>
                    )}
                  </div>
                  <h2 className={`text-xl font-extrabold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedCustomer.fullName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#8A99A8]">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-amber-500" />
                      <span>{selectedCustomer.phone}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      <span>{selectedCustomer.ghanaPostGps}</span>
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBonusModal(true)}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    title="Award promotional or birthday bonus points"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Award Bonus Pts</span>
                  </button>

                  <button
                    onClick={() => setShowRepayModal(true)}
                    disabled={selectedCustomer.currentDebt <= 0}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Pay Debt</span>
                  </button>
                </div>
              </div>

              {/* Dossier Tabs: Loyalty Rewards Center vs Bisa Credit Ledger */}
              <div className={`p-1 rounded-2xl border flex gap-1 ${
                isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setActiveDossierTab('LOYALTY');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    activeDossierTab === 'LOYALTY'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : isDark
                      ? 'text-[#8A99A8] hover:text-white'
                      : 'text-[#64748B] hover:text-black'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Loyalty Points Rewards Center</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-950/20 text-[10px] font-mono">
                    {selectedCustomer.loyaltyPoints || 0} pts
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setActiveDossierTab('CREDIT_BISA');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    activeDossierTab === 'CREDIT_BISA'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : isDark
                      ? 'text-[#8A99A8] hover:text-white'
                      : 'text-[#64748B] hover:text-black'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Bisa Credit & Debt Book</span>
                  {selectedCustomer.currentDebt > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-500 text-[10px] font-mono">
                      {formatGhs(selectedCustomer.currentDebt)}
                    </span>
                  )}
                </button>
              </div>

              {/* DOSSIER TAB 1: LOYALTY REWARDS CENTER */}
              {activeDossierTab === 'LOYALTY' && (
                <div className="space-y-4">
                  {/* Loyalty Points Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
                    }`}>
                      <span className="text-xs text-[#8A99A8] block mb-1">Available Loyalty Points:</span>
                      <span className="text-2xl font-extrabold font-mono text-emerald-400">
                        {selectedCustomer.loyaltyPoints || 0} pts
                      </span>
                      <span className="text-[10px] text-[#8A99A8] block mt-1">
                        Accrues automatically at 1 pt per GH₵ 1.00
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
                    }`}>
                      <span className="text-xs text-[#8A99A8] block mb-1">Instant Checkout Value:</span>
                      <span className="text-2xl font-extrabold font-mono text-amber-400">
                        {formatGhs(roundToPesewas((selectedCustomer.loyaltyPoints || 0) / 10))}
                      </span>
                      <span className="text-[10px] text-[#8A99A8] block mt-1">
                        10 points = GH₵ 1.00 cash deduction
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
                    }`}>
                      <span className="text-xs text-[#8A99A8] block mb-1">Current Membership Tier:</span>
                      <span className="text-lg font-black block" style={{ color: currentTier?.color }}>
                        {currentTier?.name}
                      </span>
                      <span className="text-[10px] text-[#8A99A8] block mt-1">
                        {currentTier?.nextTier
                          ? `${(currentTier.nextThreshold || 0) - (selectedCustomer.loyaltyPoints || 0)} pts to ${currentTier.nextTier}`
                          : 'Highest VIP Tier Achieved!'}
                      </span>
                    </div>
                  </div>

                  {/* VIP Progress Bar */}
                  {currentTier?.nextTier && (
                    <div className={`p-4 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9]'
                    }`}>
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-[#8A99A8]">Tier Progression to {currentTier.nextTier}:</span>
                        <span className="font-mono text-amber-400 font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-purple-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#8A99A8] font-mono">
                        <span>{currentTier.name} ({currentTier.min} pts)</span>
                        <span>{currentTier.nextTier} ({currentTier.nextThreshold} pts)</span>
                      </div>
                    </div>
                  )}

                  {/* Loyalty Points Redemption & Accrual Rules Card */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-slate-50 border-[#E2E5E9]'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
                      <Sparkles className="w-4 h-4" />
                      <span>Akwaaba OS Loyalty Program Specifications:</span>
                    </div>
                    <ul className="text-xs text-[#8A99A8] space-y-1.5 list-disc list-inside">
                      <li>
                        <strong>Automatic Accrual:</strong> Customer earns <span className="text-white font-mono font-semibold">1 Loyalty Point</span> for every <span className="text-white font-mono font-semibold">GH₵ 1.00</span> spent at POS checkout.
                      </li>
                      <li>
                        <strong>Flexible Redemption:</strong> Points convert to cash at checkout at <span className="text-white font-mono font-semibold">10 Points = GH₵ 1.00</span>.
                      </li>
                      <li>
                        <strong>Split-Tender Ready:</strong> Customers can redeem points and pay any remaining balance via Cash, MTN MoMo, Telecel, Card, or Bisa Credit.
                      </li>
                    </ul>
                  </div>

                  {/* Loyalty Points Recent Activity Ledger */}
                  <div className={`p-4 rounded-3xl border space-y-3 ${
                    isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <History className="w-4 h-4 text-emerald-400" />
                        <span>Recent Points Transactions Ledger</span>
                      </div>
                      <span className="text-[10px] text-[#8A99A8] font-mono">
                        {customerOrders.length} Recent Sales
                      </span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {customerOrders.length === 0 ? (
                        <p className="text-xs text-[#8A99A8] py-4 text-center italic">
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
                                isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-[#F8F9FA] border-[#E2E5E9]'
                              }`}
                            >
                              <div>
                                <div className="font-bold flex items-center gap-2">
                                  <span className={isDark ? 'text-white' : 'text-slate-900'}>
                                    Order #{order.orderNumber}
                                  </span>
                                  <span className="text-[10px] text-[#8A99A8]">
                                    ({new Date(order.createdAt).toLocaleDateString('en-GH')})
                                  </span>
                                </div>
                                <span className="text-[11px] text-[#8A99A8]">
                                  Paid {formatGhs(order.grandTotal)} · Cashier: {order.cashierName}
                                </span>
                              </div>

                              <div className="text-right space-y-0.5">
                                {pointsEarned > 0 && (
                                  <span className="text-emerald-400 font-bold block text-xs">
                                    +{pointsEarned} pts accrued
                                  </span>
                                )}
                                {pointsRedeemed > 0 && (
                                  <span className="text-amber-400 font-bold block text-[11px]">
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

              {/* DOSSIER TAB 2: BISA STORE CREDIT & DEBT BOOK */}
              {activeDossierTab === 'CREDIT_BISA' && (
                <div className="space-y-4">
                  {/* Balances Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'}`}>
                      <span className="text-xs text-[#8A99A8] block mb-1">Current Outstanding Debt:</span>
                      <span className="text-2xl font-extrabold font-mono text-amber-500">
                        {formatGhs(selectedCustomer.currentDebt)}
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'}`}>
                      <span className="text-xs text-[#8A99A8] block mb-1">Assigned Credit Limit:</span>
                      <span className={`text-2xl font-extrabold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatGhs(selectedCustomer.creditLimit)}
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'}`}>
                      <span className="text-xs text-[#8A99A8] block mb-1">Available Credit Headroom:</span>
                      <span className="text-2xl font-extrabold font-mono text-emerald-500">
                        {formatGhs(Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentDebt))}
                      </span>
                    </div>
                  </div>

                  {/* Arkesel / Hubtel SMS Gateway Dispatcher */}
                  <div className={`p-5 rounded-3xl border space-y-3 ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-[#E2E5E9] shadow-xs'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Send className="w-4 h-4 text-emerald-500" />
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>
                          Arkesel / Hubtel Telco SMS Gateway
                        </span>
                      </div>

                      <div className={`flex gap-1 p-1 rounded-xl border text-[11px] ${
                        isDark ? 'border-[#242D37] bg-[#090B0E]' : 'border-[#E2E5E9] bg-[#F8F9FA]'
                      }`}>
                        <button
                          onClick={() => setSmsTemplate('FRIENDLY')}
                          className={`px-2.5 py-0.5 rounded-lg ${smsTemplate === 'FRIENDLY' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-[#8A99A8]'}`}
                        >
                          English (Friendly)
                        </button>
                        <button
                          onClick={() => setSmsTemplate('TWI')}
                          className={`px-2.5 py-0.5 rounded-lg ${smsTemplate === 'TWI' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-[#8A99A8]'}`}
                        >
                          Twi (Local)
                        </button>
                        <button
                          onClick={() => setSmsTemplate('URGENT')}
                          className={`px-2.5 py-0.5 rounded-lg ${smsTemplate === 'URGENT' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-[#8A99A8]'}`}
                        >
                          Past Due
                        </button>
                      </div>
                    </div>

                    {/* Message Preview */}
                    <div className={`p-3 rounded-xl border font-mono text-xs ${
                      isDark ? 'border-[#242D37] text-slate-300 bg-[#090B0E]' : 'border-[#E2E5E9] text-slate-800 bg-[#F8F9FA]'
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
                      className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{smsSending ? 'Transmitting to MTN/Telecel...' : `Dispatch Reminder to ${selectedCustomer.phone}`}</span>
                    </button>
                  </div>

                  {/* Printable IOU & Loyalty Statement */}
                  <div className="p-4 bg-white text-black font-mono rounded-2xl border border-slate-300 text-xs space-y-2 max-w-md shadow-md">
                    <div className="text-center font-bold pb-1 border-b border-gray-400">
                      <span>AKWAABA CRM OFFICIAL MEMBER STATEMENT</span>
                    </div>
                    <div className="text-[10px] space-y-0.5">
                      <div className="flex justify-between">
                        <span>Customer Member:</span>
                        <span className="font-bold">{selectedCustomer.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phone / GPS:</span>
                        <span>{selectedCustomer.phone} · {selectedCustomer.ghanaPostGps}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Membership Tier:</span>
                        <span className="font-bold">{currentTier?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Loyalty Points:</span>
                        <span className="font-bold text-emerald-800">{selectedCustomer.loyaltyPoints || 0} pts (GH₵ {((selectedCustomer.loyaltyPoints || 0) / 10).toFixed(2)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Statement Date:</span>
                        <span>{new Date().toLocaleDateString('en-GH')}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-gray-300 pt-1 text-xs">
                        <span>BISA DEBT OUTSTANDING:</span>
                        <span>{formatGhs(selectedCustomer.currentDebt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Official Statement</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-[#8A99A8] text-xs italic">
              Select a customer to view loyalty rewards and credit ledger dossier.
            </div>
          )}
        </div>

      </div>

      {/* REPAYMENT MODAL */}
      {showRepayModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4 border ${
            isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
          }`}>
            <h3 className="font-bold text-sm">Record Debt Repayment</h3>
            <p className="text-xs text-[#8A99A8]">
              Customer: <span className="font-bold text-amber-500">{selectedCustomer.fullName}</span>
            </p>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">Repayment (GH₵):</label>
              <input
                type="number"
                step="1"
                max={selectedCustomer.currentDebt}
                value={repayAmount || ''}
                onChange={e => setRepayAmount(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded-xl font-mono text-sm border outline-none ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-black'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">Payment Method:</label>
              <select
                value={repayMethod}
                onChange={e => setRepayMethod(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-black'
                }`}
              >
                <option value="CASH">Cash in Hand</option>
                <option value="MOMO_MTN">MTN Mobile Money</option>
                <option value="MOMO_TELECEL">Telecel Cash</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRepayModal(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                  isDark ? 'border-[#242D37] text-[#8A99A8]' : 'border-[#E2E5E9] text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordRepayment}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Confirm Repayment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AWARD BONUS POINTS MODAL */}
      {showBonusModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAwardBonusPoints}
            className={`w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4 border ${
              isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-sm">Award Promotional Loyalty Points</h3>
            </div>
            <p className="text-xs text-[#8A99A8]">
              Awarding bonus points to <strong className="text-white">{selectedCustomer.fullName}</strong>.
            </p>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">Points to Award / Adjust:</label>
              <input
                type="number"
                required
                value={bonusPointsInput || ''}
                onChange={e => setBonusPointsInput(parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded-xl font-mono text-sm border outline-none ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-black'
                }`}
                placeholder="e.g. 50"
              />
              <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                Cash discount value: {formatGhs(roundToPesewas((bonusPointsInput || 0) / 10))}
              </span>
            </div>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">Reason / Promotion Campaign:</label>
              <select
                value={bonusReason}
                onChange={e => setBonusReason(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-black'
                }`}
              >
                <option value="Customer Appreciation Promo">Customer Appreciation Promo</option>
                <option value="Customer Birthday Celebration">Customer Birthday Celebration</option>
                <option value="Service Recovery / Apology Credit">Service Recovery / Apology Credit</option>
                <option value="VIP Upgrade Welcome Gift">VIP Upgrade Welcome Gift</option>
                <option value="Bulk Purchase Referral Bonus">Bulk Purchase Referral Bonus</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBonusModal(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                  isDark ? 'border-[#242D37] text-[#8A99A8]' : 'border-[#E2E5E9] text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Grant Points
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD NEW MEMBER MODAL */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddCustomer}
            className={`w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-3 border ${
              isDark ? 'bg-[#11151A] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm">Register Customer & Loyalty Account</h3>
            </div>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">Full / Business Name:</label>
              <input
                type="text"
                required
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
                placeholder="e.g. Mama Akosua Provisions"
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-black'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">Mobile Phone Number:</label>
              <input
                type="text"
                required
                value={newCustPhone}
                onChange={e => setNewCustPhone(e.target.value)}
                placeholder="e.g. 0244123456"
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-black'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-[#8A99A8] block mb-1">GhanaPost GPS Digital Address:</label>
              <input
                type="text"
                value={newCustGps}
                onChange={e => setNewCustGps(e.target.value)}
                placeholder="e.g. GA-183-9022"
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                  isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-black'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[#8A99A8] block mb-1">Credit Limit (GH₵):</label>
                <input
                  type="number"
                  value={newCustCreditLimit}
                  onChange={e => setNewCustCreditLimit(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-black'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs text-[#8A99A8] block mb-1">Welcome Pts:</label>
                <input
                  type="number"
                  value={newCustStartingPoints}
                  onChange={e => setNewCustStartingPoints(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-[#E2E5E9] text-black'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                  isDark ? 'border-[#242D37] text-[#8A99A8]' : 'border-[#E2E5E9] text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
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
