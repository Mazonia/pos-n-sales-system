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
          { id: 'POS', label: 'Register', icon: ShoppingBag },
          { id: 'FINANCIALS', label: 'Sales', icon: TrendingUp },
          { id: 'BISA', label: 'Customers', icon: BookOpen },
        ];
      case 'INVENTORY_OFFICER':
        return [
          { id: 'INVENTORY', label: 'Inventory', icon: Boxes, badge: lowStockProducts.length > 0 ? lowStockProducts.length : null },
          { id: 'POS', label: 'Register', icon: ShoppingBag },
          { id: 'FINANCIALS', label: 'Valuation', icon: TrendingUp },
        ];
      case 'AUDITOR':
        return [
          { id: 'FINANCIALS', label: 'Sales', icon: TrendingUp },
          { id: 'GRA', label: 'Taxes', icon: Landmark },
          { id: 'BISA', label: 'Customers', icon: BookOpen },
          { id: 'DOCS', label: 'Docs', icon: Database },
        ];
      case 'BRANCH_MANAGER':
      case 'GENERAL_MANAGER':
      case 'SUPER_ADMIN':
      default:
        return [
          { id: 'POS', label: 'Register', icon: ShoppingBag },
          { id: 'INVENTORY', label: 'Inventory', icon: Boxes, badge: lowStockProducts.length > 0 ? lowStockProducts.length : null },
          { id: 'FINANCIALS', label: 'Sales', icon: TrendingUp },
          { id: 'BISA', label: 'Customers', icon: BookOpen },
          { id: 'STAFF', label: 'Staff', icon: Users },
          { id: 'GRA', label: 'Taxes', icon: Landmark },
        ];
    }
  };

  const navTabs = getNavTabsForRole();

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden select-none transition-colors duration-200 ${
      isDark ? 'bg-[#0A0F1D] text-slate-100' : 'bg-[#F4F6F8] text-slate-900'
    }`}>
      
      {/* ═══ CLEAN UNCLUTTERED TOP NAVIGATION BAR ═══ */}
      <header className={`h-14 border-b flex items-center justify-between px-3 sm:px-6 shrink-0 z-40 transition-colors ${
        isDark 
          ? 'border-slate-800 bg-[#131A2A]' 
          : 'border-slate-200/90 bg-white shadow-2xs'
      }`}>
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-xl border transition active:scale-95 ${
              isDark ? 'border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:text-black hover:bg-slate-100'
            }`}
            title="Open Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs tracking-tight">
              AK
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                Akwaaba POS
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate max-w-[140px] sm:max-w-[200px]">
                {branchName}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Clean Segmented Navigation (Desktop >= 1024px) */}
        <nav className={`hidden lg:flex items-center gap-1 p-1 rounded-xl border ${
          isDark 
            ? 'bg-slate-900/80 border-slate-800' 
            : 'bg-slate-100 border-slate-200/80'
        }`}>
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs font-bold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Streamlined & Clutter-Free */}
        <div className="flex items-center gap-2">
          
          {/* Active Shift Indicator */}
          {activeShift ? (
            <button
              onClick={() => setShowShiftModal(true)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
              title="Till status and cash drops"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline font-semibold">Till Active</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOpenShiftPrompt(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95 shadow-xs"
            >
              Open Shift
            </button>
          )}

          {/* Theme Switcher Toggle */}
          <button
            onClick={() => {
              triggerHaptic('tap');
              setIsDark(!isDark);
            }}
            className={`p-2 rounded-xl border transition-all duration-200 active:scale-90 cursor-pointer ${
              isDark
                ? 'border-slate-800 text-amber-400 hover:bg-slate-800'
                : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4" strokeWidth={1.8} /> : <Moon className="w-4 h-4" strokeWidth={1.8} />}
          </button>

          {/* User Profile Avatar & Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center gap-2 p-1 sm:pr-2.5 sm:pl-1 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-[#162034] text-slate-200 hover:bg-[#1E2B45]'
                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-slate-950 font-mono shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor || '#10B981' }}
              >
                {currentUser.fullName.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="font-semibold text-xs hidden sm:inline max-w-[85px] truncate">
                {currentUser.fullName.split(' ')[0]}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* User Details & Logout Dropdown */}
            {userMenuOpen && (
              <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl p-3 z-50 text-xs border shadow-xl animate-expand-in ${
                isDark 
                  ? 'bg-[#131A2A] border-slate-800 text-slate-200' 
                  : 'bg-white border-slate-200 text-slate-800'
              }`}>
                {/* User Identity Info */}
                <div className={`p-3 rounded-xl mb-2.5 ${isDark ? 'bg-[#0E1422]' : 'bg-slate-50'}`}>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>{currentUser.fullName}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    {currentUser.role}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{isOnline ? 'Connected (Cloud Synced)' : 'Offline (Local Dexie Mode)'}</span>
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
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between mb-2 transition-all border active:scale-[0.98] ${
                      isDark
                        ? 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:bg-purple-900/40'
                        : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Manage Employees</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300">
                      Admin
                    </span>
                  </button>
                )}

                {/* Switch User Helper */}
                <div className="space-y-1 mb-2.5">
                  <div className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 text-slate-400">
                    Switch Active Cashier:
                  </div>
                  {systemUsersList.filter(u => u.id !== currentUser.id).slice(0, 5).map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        handleLoginSuccess(u);
                        setUserMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-all ${
                        isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{u.fullName}</span>
                      <span className="text-[10px] text-slate-400">{u.role.split('_')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Explicit Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    isDark 
                      ? 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-800/40' 
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

      {/* MOBILE & TABLET NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className={`lg:hidden p-3 border-b space-y-1 animate-slide-in-top z-40 ${
          isDark 
            ? 'bg-[#131A2A]/95 backdrop-blur-md border-slate-800' 
            : 'bg-white/95 backdrop-blur-md border-slate-200 shadow-md'
        }`}>
          {navTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-500 text-slate-950'
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
