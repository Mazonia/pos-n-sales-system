import React, { useState, useEffect, useRef } from 'react';
import {
  LocalProduct,
  LocalCustomer,
  LocalShift,
  SystemUser,
  SYSTEM_USERS,
  getAllUsers,
  LocalPurchaseOrder,
  db,
  initializeLocalDatabase,
  syncOfflineQueueToServer
} from './utils/dexieSync';
import { TaxSchemeType } from './utils/ghanaTaxEngine';
import { openCashierShift, ShiftSummaryReport } from './utils/shiftManager';
import { PosTerminalView } from './components/pos/PosTerminalView';
import { DebtBook } from './components/debt/DebtBook';
import { ShiftModal } from './components/shift/ShiftModal';
import { InventoryManager } from './components/inventory/InventoryManager';
import { GraReports } from './components/reports/GraReports';
import { SystemDocs } from './components/docs/SystemDocs';
import { LoginPage } from './components/auth/LoginPage';
import { PurchaseOrderModal } from './components/inventory/PurchaseOrderModal';
import { StockSafetyNotification } from './components/notifications/StockSafetyNotification';
import { FinancialDashboard } from './components/dashboard/FinancialDashboard';
import { EmployeeManagementView } from './components/staff/EmployeeManagementView';
import { PwaInstallBanner, PwaInstallNavbarButton } from './components/pwa/PwaInstallBanner';
import { triggerHaptic } from './utils/haptics';
import {
  ShoppingBag,
  BookOpen,
  DollarSign,
  Boxes,
  Landmark,
  Database,
  Sun,
  Moon,
  ChevronDown,
  CheckCircle2,
  Menu,
  X,
  Bell,
  LogOut,
  ShieldCheck,
  User,
  Sparkles,
  Lock,
  ArrowRight,
  TrendingUp,
  Users,
  UserPlus,
  Store,
  Settings,
  Award,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  getTerminalBranch,
  setTerminalBranch,
  ENTERPRISE_BRANCHES,
  TerminalBranch
} from './utils/terminalConfig';

export default function App() {
  // Theme State: Crisp Light Mode by default, with dark mode toggle support
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('akwaaba_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('akwaaba_theme', isDark ? 'dark' : 'light');
    } catch {}
    if (isDark) {
      document.documentElement.classList.add('theme-dark', 'dark');
      document.documentElement.classList.remove('theme-light');
    } else {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark', 'dark');
    }
  }, [isDark]);

  // Authentication State for Non-Repudiation
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    const saved = localStorage.getItem('akwaaba_pos_session_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Start with default cashier for seamless preview, but allow instant logout/login
    return SYSTEM_USERS[0];
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<'POS' | 'BISA' | 'INVENTORY' | 'FINANCIALS' | 'STAFF' | 'GRA' | 'DOCS'>('POS');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);

  // Dynamic System Users List (Loaded from Dexie & synced)
  const [systemUsersList, setSystemUsersList] = useState<SystemUser[]>(SYSTEM_USERS);

  useEffect(() => {
    getAllUsers().then(loaded => {
      if (loaded && loaded.length > 0) {
        setSystemUsersList(loaded);
      }
    });

    const handleUsersUpdated = () => {
      getAllUsers().then(loaded => {
        if (loaded && loaded.length > 0) {
          setSystemUsersList(loaded);
        }
      });
    };

    window.addEventListener('usersUpdated', handleUsersUpdated);
    return () => {
      window.removeEventListener('usersUpdated', handleUsersUpdated);
    };
  }, []);

  // Database Data
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [activeShift, setActiveShift] = useState<LocalShift | null>(null);

  // Background Sync State (Quiet, automatic offline-first)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncToast, setSyncToast] = useState<string>('');

  // Tax Scheme (Standard VAT 21.90%, Flat Rate 4%, Exempt 0%)
  const [taxScheme, setTaxScheme] = useState<TaxSchemeType>('STANDARD_VAT');

  // Branch Info & Workstation Terminal Binding
  const [terminalBranch, setTerminalBranchState] = useState<TerminalBranch>(() => getTerminalBranch());
  const branchName = terminalBranch.name;

  useEffect(() => {
    const handleTerminalBranchChanged = (e: any) => {
      if (e.detail) {
        setTerminalBranchState(e.detail);
      }
    };
    window.addEventListener('terminalBranchChanged', handleTerminalBranchChanged);
    return () => window.removeEventListener('terminalBranchChanged', handleTerminalBranchChanged);
  }, []);

  // Modals
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [showOpenShiftPrompt, setShowOpenShiftPrompt] = useState<boolean>(false);
  const [openingFloatInput, setOpeningFloatInput] = useState<number>(200);

  // Purchase Order Draft Modal State (for Safety Threshold Replenishment)
  const [showPoModal, setShowPoModal] = useState<boolean>(false);
  const [poTargetProducts, setPoTargetProducts] = useState<LocalProduct[]>([]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize DB and Seed Data
  useEffect(() => {
    async function loadData() {
      await initializeLocalDatabase();
      await refreshAllData();

      const openShifts = await db.shifts.where('status').equals('OPEN').toArray();
      if (openShifts.length > 0) {
        setActiveShift(openShifts[0]);
      } else if (currentUser) {
        const newShift = await openCashierShift({
          cashierId: currentUser.id,
          cashierName: currentUser.fullName,
          branchId: 'branch-accra-01',
          openingFloat: 200.0,
        });
        setActiveShift(newShift);
      }
    }
    loadData();

    const handleOnline = async () => {
      setIsOnline(true);
      const res = await syncOfflineQueueToServer();
      if (res.syncedCount > 0) {
        setSyncToast(`Auto-synced ${res.syncedCount} queued tickets to cloud database`);
        setTimeout(() => setSyncToast(''), 3000);
      }
      refreshAllData();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  const refreshAllData = async () => {
    const prods = await db.products.toArray();
    const custs = await db.customers.toArray();

    setProducts(prods);
    setCustomers(custs);

    const openShifts = await db.shifts.where('status').equals('OPEN').toArray();
    if (openShifts.length > 0) {
      setActiveShift(openShifts[0]);
    }
  };

  // Compute products below their defined Safety Threshold
  const lowStockProducts = products.filter(p => {
    const threshold = p.safetyThreshold !== undefined ? p.safetyThreshold : p.reorderLevel;
    return p.currentStock <= threshold;
  });

  const handleLoginSuccess = (user: SystemUser) => {
    setCurrentUser(user);
    localStorage.setItem('akwaaba_pos_session_user', JSON.stringify(user));
    // Set appropriate landing tab according to role
    if (user.role === 'INVENTORY_OFFICER') {
      setActiveTab('INVENTORY');
    } else if (user.role === 'AUDITOR') {
      setActiveTab('GRA');
    } else {
      setActiveTab('POS');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await db.auditLogs.add({
          id: `audit-logout-${Date.now()}`,
          action: 'USER_LOGOUT_AUTHENTICATED',
          userId: currentUser.id,
          userName: `${currentUser.fullName} (${currentUser.role})`,
          details: `User explicitly terminated till session. Non-repudiation audit trail finalized.`,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Audit log logout write error', e);
      }
    }
    localStorage.removeItem('akwaaba_pos_session_user');
    setCurrentUser(null);
    setUserMenuOpen(false);
  };

  const handleOpenPoDraft = (items?: LocalProduct[]) => {
    const target = items && items.length > 0 ? items : lowStockProducts;
    setPoTargetProducts(target);
    setShowPoModal(true);
    setNotificationsOpen(false);
  };

  const handleOpenNewShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const shift = await openCashierShift({
      cashierId: currentUser.id,
      cashierName: currentUser.fullName,
      branchId: 'branch-accra-01',
      openingFloat: openingFloatInput,
    });
    setActiveShift(shift);
    setShowOpenShiftPrompt(false);
    await refreshAllData();
  };

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    triggerHaptic('tap');
    setPageTransition(true);
    setTimeout(() => {
      setActiveTab(tabId as any);
      setMobileMenuOpen(false);
      setTimeout(() => setPageTransition(false), 50);
    }, 150);
  };

  // If user is not authenticated, render the dedicated Non-Repudiation Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        branchName={branchName}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />
    );
  }

  // Navigation tabs tailored for role but intuitive for all retail staff
  const getNavTabsForRole = () => {
    const role = currentUser.role;
    switch (role) {
      case 'CASHIER':
        return [
          { id: 'POS', label: 'POS Register', icon: ShoppingBag },
          { id: 'FINANCIALS', label: 'Daily Sales', icon: TrendingUp },
          { id: 'BISA', label: 'Customer Credit', icon: BookOpen },
        ];
      case 'INVENTORY_OFFICER':
        return [
          { id: 'INVENTORY', label: 'Stock & POs', icon: Boxes, badge: lowStockProducts.length > 0 ? lowStockProducts.length : null },
          { id: 'POS', label: 'POS Register', icon: ShoppingBag },
          { id: 'FINANCIALS', label: 'Valuation', icon: TrendingUp },
        ];
      case 'AUDITOR':
        return [
          { id: 'FINANCIALS', label: 'Financials', icon: TrendingUp },
          { id: 'GRA', label: 'GRA Tax', icon: Landmark },
          { id: 'BISA', label: 'Credit Audit', icon: BookOpen },
          { id: 'DOCS', label: 'Specs & APIs', icon: Database },
        ];
      case 'BRANCH_MANAGER':
      case 'GENERAL_MANAGER':
      case 'SUPER_ADMIN':
      default:
        return [
          { id: 'POS', label: 'POS Register', icon: ShoppingBag },
          { id: 'INVENTORY', label: 'Stock & POs', icon: Boxes, badge: lowStockProducts.length > 0 ? lowStockProducts.length : null },
          { id: 'FINANCIALS', label: 'Daily Sales & Reports', icon: TrendingUp },
          { id: 'BISA', label: 'Credit Book', icon: BookOpen },
          { id: 'STAFF', label: 'Staff', icon: Users },
          { id: 'GRA', label: 'GRA Tax', icon: Landmark },
        ];
    }
  };

  const navTabs = getNavTabsForRole();

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden select-none transition-colors duration-200 ${
      isDark ? 'bg-[#0B0F17] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* ═══ CLEAN MODERN TOP NAVIGATION BAR ═══ */}
      <header className={`h-[58px] border-b flex items-center justify-between px-3 sm:px-6 shrink-0 z-40 transition-colors ${
        isDark 
          ? 'border-slate-800 bg-[#131A26]' 
          : 'border-slate-200 bg-white shadow-2xs'
      }`}>
        
        {/* Left: Mobile Toggle & Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-xl border transition active:scale-95 ${
              isDark ? 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:text-black hover:bg-slate-100'
            }`}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2.5">
            {/* Clean Logo Mark */}
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
              AK
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                <span className={isDark ? 'text-white' : 'text-slate-900'}>Akwaaba POS</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  v2.6
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <Store className="w-2.5 h-2.5 text-amber-500" />
                <span className="hidden sm:inline truncate max-w-[160px]">{branchName}</span>
                <span className="hidden sm:inline text-amber-600 dark:text-amber-400 font-bold">[{terminalBranch.code}]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Clean Navigation Pills */}
        <nav className={`hidden md:flex items-center gap-1 p-1 rounded-xl border ${
          isDark 
            ? 'bg-slate-900/80 border-slate-800' 
            : 'bg-slate-100 border-slate-200'
        }`}>
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Status Indicators & Actions */}
        <div className="flex items-center gap-2">
          
          {/* Online/Offline Status Dot */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono font-medium ${
            isOnline 
              ? isDark ? 'text-emerald-400' : 'text-emerald-600'
              : 'text-amber-500'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden lg:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Safety Stock Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={`relative p-2 rounded-xl border transition-all duration-200 active:scale-90 ${
                lowStockProducts.length > 0
                  ? isDark
                    ? 'border-amber-500/30 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15'
                    : 'border-amber-400/40 bg-amber-50 text-amber-600 hover:bg-amber-100'
                  : isDark
                  ? 'border-[rgba(48,62,80,0.5)] text-[#8B9DB5] hover:bg-[#1C2333] hover:text-white'
                  : 'border-[rgba(209,215,224,0.5)] text-[#64748B] hover:bg-[#F0F2F5] hover:text-[#0F172A]'
              }`}
              title="Stock Safety Threshold Alerts"
            >
              <Bell className="w-4 h-4" strokeWidth={1.8} />
              {lowStockProducts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-amber-500 text-[#06080C] font-mono font-bold text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse">
                  {lowStockProducts.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 animate-expand-in">
                <StockSafetyNotification
                  lowStockProducts={lowStockProducts}
                  onOpenPoDraft={handleOpenPoDraft}
                  isDark={isDark}
                  variant="dropdown"
                />
              </div>
            )}
          </div>

          {/* Active Shift Indicator */}
          {activeShift ? (
            <button
              onClick={() => setShowShiftModal(true)}
              className={`px-2.5 py-[6px] rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition-all duration-200 active:scale-95 ${
                isDark
                  ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/15'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
              title="Click to view till reconciliation and cash drops"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 status-dot-pulse"></span>
              </span>
              <span className="hidden sm:inline font-mono font-medium">Till Active</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOpenShiftPrompt(true)}
              className={`px-3 py-[6px] rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-95 ${
                isDark
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-[#06080C] shadow-[0_2px_8px_rgba(16,185,129,0.2)]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_2px_6px_rgba(5,150,105,0.15)]'
              }`}
            >
              Open Shift
            </button>
          )}

          {/* PWA Direct Install Action Button */}
          <PwaInstallNavbarButton isDark={isDark} />

          {/* Theme Switcher Toggle */}
          <button
            onClick={() => {
              triggerHaptic('tap');
              setIsDark(!isDark);
            }}
            className={`p-2 rounded-xl border transition-all duration-200 active:scale-90 cursor-pointer ${
              isDark
                ? 'border-[rgba(48,62,80,0.5)] text-amber-400 hover:bg-[#1C2333] hover:text-amber-300'
                : 'border-[rgba(209,215,224,0.5)] text-slate-500 hover:bg-[#F0F2F5] hover:text-slate-700'
            }`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4" strokeWidth={1.8} /> : <Moon className="w-4 h-4" strokeWidth={1.8} />}
          </button>

          {/* USER PROFILE & LOGOUT POPOVER */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center gap-2 pl-[5px] pr-2.5 py-[5px] rounded-xl border text-[11px] transition-all duration-200 ${
                isDark
                  ? 'border-[rgba(48,62,80,0.5)] bg-[#151B23] hover:bg-[#1C2333] text-[#F0F4F8]'
                  : 'border-[rgba(209,215,224,0.5)] bg-white hover:bg-[#F0F2F5] text-[#0F172A]'
              }`}
            >
              <div
                className="w-7 h-7 rounded-[10px] flex items-center justify-center font-bold text-[11px] text-[#06080C] font-mono shadow-sm transition-transform duration-200"
                style={{ backgroundColor: currentUser.avatarColor || '#10B981' }}
              >
                {currentUser.fullName.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="font-semibold hidden lg:inline max-w-[90px] truncate">
                {currentUser.fullName.split(' ')[0]}
              </span>
              <span className="text-[10px] text-[#8B9DB5] font-mono hidden xl:inline">
                ({currentUser.role.split('_')[0]})
              </span>
              <ChevronDown className={`w-3 h-3 text-[#8B9DB5] transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* User Details & Logout Dropdown */}
            {userMenuOpen && (
              <div className={`absolute right-0 top-full mt-2.5 w-72 rounded-[18px] p-3 z-50 text-xs border animate-expand-in ${
                isDark 
                  ? 'bg-[#0D1117] border-[rgba(48,62,80,0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]' 
                  : 'bg-white border-[rgba(209,215,224,0.5)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
              }`}>
                {/* User Identity Info */}
                <div className={`p-3 rounded-[14px] mb-2.5 ${isDark ? 'bg-[#151B23]' : 'bg-[#F6F8FA]'}`}>
                  <div className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                    <span>{currentUser.fullName}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-[11px] text-emerald-500 font-mono font-medium mt-1">
                    Role: {currentUser.role}
                  </div>
                  <div className="text-[10px] text-[#8B9DB5] font-mono mt-0.5">
                    Operator ID: {currentUser.id}
                  </div>
                </div>

                {/* Non-Repudiation Audit Seal */}
                <div className={`p-2.5 rounded-[12px] text-[10px] mb-2.5 flex items-start gap-2 ${
                  isDark ? 'bg-emerald-500/5 border border-emerald-500/15 text-[#8B9DB5]' : 'bg-emerald-50 border border-emerald-100 text-slate-600'
                }`}>
                  <Lock className="w-3.5 h-3.5 text-emerald-500 mt-[1px] shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-500 block mb-0.5">Non-Repudiation Active</span>
                    <span>All sales, voids, and cash movements signed under this session.</span>
                  </div>
                </div>

                {/* Quick Staff Management for Super Admin & General Manager */}
                {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'GENERAL_MANAGER') && (
                  <button
                    type="button"
                    onClick={() => {
                      handleTabChange('STAFF');
                      setUserMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-[12px] text-xs font-bold flex items-center justify-between mb-2.5 transition-all duration-200 border active:scale-[0.98] ${
                      isDark
                        ? 'bg-purple-500/8 border-purple-500/20 text-purple-400 hover:bg-purple-500/15'
                        : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Enroll & Manage Staff</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isDark ? 'bg-purple-500/15 text-purple-300' : 'bg-purple-100 text-purple-600'
                    }`}>Admin</span>
                  </button>
                )}

                {/* Switch User Helper */}
                <div className="space-y-1 mb-2.5">
                  <div className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 ${isDark ? 'text-[#556575]' : 'text-[#94A3B8]'}`}>
                    Switch Active Operator:
                  </div>
                  {systemUsersList.filter(u => u.id !== currentUser.id).slice(0, 5).map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        handleLoginSuccess(u);
                        setUserMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-[10px] text-xs flex items-center justify-between transition-all duration-150 ${
                        isDark ? 'hover:bg-[#1C2333] text-slate-300' : 'hover:bg-[#F0F2F5] text-slate-700'
                      }`}
                    >
                      <span className="truncate">{u.fullName}</span>
                      <span className="text-[10px] text-[#8B9DB5] font-mono">{u.role.split('_')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Explicit Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full py-2.5 px-3 rounded-[12px] font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] ${
                    isDark 
                      ? 'bg-rose-500/10 hover:bg-rose-500/18 text-rose-400 border border-rose-500/20' 
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out (End Session)</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* PWA INSTALL BANNER & OFFLINE RESILIENCE BANNER */}
      <PwaInstallBanner isDark={isDark} />

      {/* MOBILE NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className={`md:hidden p-3 border-b space-y-1 animate-slide-in-top ${
          isDark 
            ? 'bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border-[rgba(48,62,80,0.4)]' 
            : 'bg-[rgba(255,255,255,0.95)] backdrop-blur-xl border-[rgba(209,215,224,0.5)] shadow-lg'
        }`}>
          {navTabs.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`w-full py-3 px-4 rounded-[14px] text-[13px] font-semibold flex items-center justify-between transition-all duration-200 animate-fade-slide-in ${
                  isActive
                    ? isDark
                      ? 'bg-emerald-500 text-[#06080C] font-bold shadow-[0_2px_10px_rgba(16,185,129,0.2)]'
                      : 'bg-emerald-600 text-white font-bold shadow-sm'
                    : isDark
                    ? 'text-[#8B9DB5] hover:text-white hover:bg-[#1C2333]'
                    : 'text-[#64748B] hover:text-black hover:bg-[#F0F2F5]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] font-mono ${
                    isActive ? 'bg-[#06080C]/20 text-white' : 'bg-amber-500/15 text-amber-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Auto-Sync Confirmation Toast */}
      {syncToast && (
        <div className={`flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold animate-slide-in-top ${
          isDark 
            ? 'bg-emerald-500 text-[#06080C]' 
            : 'bg-emerald-600 text-white'
        }`}>
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* MAIN VIEWPORT with page transition */}
      <main className={`flex-1 flex overflow-hidden transition-all duration-200 ${
        pageTransition ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'
      }`}>
        {activeTab === 'POS' && (
          <PosTerminalView
            products={products}
            customers={customers}
            activeShiftId={activeShift?.id || 'shift-01'}
            cashierName={currentUser.fullName}
            cashierId={currentUser.id}
            cashierRole={currentUser.role}
            taxScheme={taxScheme}
            isOnline={isOnline}
            branchName={branchName}
            isDark={isDark}
            onRefreshData={refreshAllData}
          />
        )}

        {activeTab === 'BISA' && (
          <DebtBook
            customers={customers}
            onRefresh={refreshAllData}
            branchName={branchName}
            isDark={isDark}
          />
        )}

        {activeTab === 'INVENTORY' && (
          <InventoryManager
            products={products}
            onRefresh={refreshAllData}
            branchName={branchName}
            isDark={isDark}
            currentUser={{
              id: currentUser.id,
              fullName: currentUser.fullName,
              role: currentUser.role,
            }}
            onOpenPoDraft={handleOpenPoDraft}
          />
        )}

        {activeTab === 'FINANCIALS' && (
          <FinancialDashboard
            isDark={isDark}
            branchName={branchName}
          />
        )}

        {activeTab === 'STAFF' && (
          <EmployeeManagementView
            currentUser={currentUser}
            onSwitchUser={handleLoginSuccess}
            branchName={branchName}
            isDark={isDark}
          />
        )}

        {activeTab === 'GRA' && (
          <GraReports
            currentTaxScheme={taxScheme}
            onChangeTaxScheme={setTaxScheme}
            branchName={branchName}
            isDark={isDark}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'DOCS' && <SystemDocs isDark={isDark} />}
      </main>

      {/* PURCHASE ORDER DRAFT GENERATION MODAL (1-CLICK RESTOCK) */}
      {showPoModal && (
        <PurchaseOrderModal
          lowStockProducts={poTargetProducts.length > 0 ? poTargetProducts : lowStockProducts}
          branchName={branchName}
          currentUser={{
            id: currentUser.id,
            fullName: currentUser.fullName,
            role: currentUser.role,
          }}
          isDark={isDark}
          onClose={() => setShowPoModal(false)}
          onOrderSaved={() => {
            refreshAllData();
          }}
        />
      )}

      {/* SHIFT RECONCILIATION & FLOAT MODAL */}
      {showShiftModal && activeShift && (
        <ShiftModal
          shift={activeShift}
          cashierRole={currentUser.role}
          isDark={isDark}
          onClose={() => setShowShiftModal(false)}
          onShiftClosed={(report: ShiftSummaryReport) => {
            setActiveShift(null);
            setShowShiftModal(false);
            refreshAllData();
          }}
        />
      )}

      {/* PROMPT OPEN NEW SHIFT */}
      {showOpenShiftPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-slide-in">
          <form onSubmit={handleOpenNewShift} className={`w-full max-w-sm rounded-[22px] border p-6 space-y-5 animate-scale-in ${
            isDark 
              ? 'bg-[#0D1117] border-[rgba(48,62,80,0.5)] shadow-[0_16px_48px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-[rgba(209,215,224,0.5)] shadow-[0_16px_40px_rgba(0,0,0,0.1)]'
          }`}>
            <h3 className={`font-bold text-sm flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
              <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${
                isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <DollarSign className="w-4 h-4" />
              </div>
              <span>Open New Cashier Till Shift</span>
            </h3>
            <p className="text-xs text-[#8B9DB5]">
              Assigned Cashier: <span className="font-semibold text-emerald-500">{currentUser.fullName}</span>
            </p>

            <div>
              <label className="text-[11px] text-[#8B9DB5] font-medium block mb-1.5">Opening Cash Float (GH₵):</label>
              <input
                type="number"
                step="1"
                value={openingFloatInput || ''}
                onChange={e => setOpeningFloatInput(parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-2.5 rounded-[12px] font-mono tabular-nums text-sm outline-none border transition-all duration-200 focus:ring-2 focus:ring-emerald-500/30 ${
                  isDark 
                    ? 'bg-[#151B23] border-[rgba(48,62,80,0.5)] text-white focus:border-emerald-500' 
                    : 'bg-[#F6F8FA] border-[rgba(209,215,224,0.5)] text-[#0F172A] focus:border-emerald-500'
                }`}
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowOpenShiftPrompt(false)}
                className={`flex-1 py-2.5 rounded-[12px] text-xs font-semibold border transition-all duration-200 active:scale-[0.97] ${
                  isDark 
                    ? 'border-[rgba(48,62,80,0.5)] text-[#8B9DB5] hover:text-white hover:bg-[#1C2333]' 
                    : 'border-[rgba(209,215,224,0.5)] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F0F2F5]'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 font-bold rounded-[12px] text-xs transition-all duration-200 active:scale-[0.97] ${
                  isDark
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-[#06080C] shadow-[0_2px_8px_rgba(16,185,129,0.2)]'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_2px_6px_rgba(5,150,105,0.15)]'
                }`}
              >
                Start Shift
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
