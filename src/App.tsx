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
import { PlatformDownloadModal } from './components/pos/PlatformDownloadModal';
import { UniversalToastContainer } from './components/notifications/UniversalToastContainer';
import { NotificationPreferencesModal } from './components/notifications/NotificationPreferencesModal';
import { InstallationWizardModal } from './components/onboarding/InstallationWizardModal';
import { BackupManagerModal } from './components/backup/BackupManagerModal';
import { TabletTouchNavigation } from './components/navigation/TabletTouchNavigation';
import { ProductLandingPage } from './components/showcase/ProductLandingPage';
import { detectPlatform } from './utils/platform';
import { triggerHaptic } from './utils/haptics';
import {
  Download,
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
import { executeThemeTransition } from './utils/themeTransition';
import { sanitizeUserForStorage } from './utils/security';

export type SystemNavTab = 'POS' | 'BISA' | 'INVENTORY' | 'FINANCIALS' | 'STAFF' | 'GRA' | 'DOCS';

export function parseHashRoute(hash: string): { isShowcase: boolean; tab: SystemNavTab } {
  const clean = (hash || '').replace(/^#\/?/, '').trim().toLowerCase();
  
  // Default root, empty, or #/showcase to Showcase
  if (!clean || clean === 'showcase' || clean === 'landing' || clean === 'home') {
    return { isShowcase: true, tab: 'POS' };
  }
  
  if (clean === 'pos' || clean === 'checkout' || clean === 'terminal') {
    return { isShowcase: false, tab: 'POS' };
  }
  if (clean === 'inventory' || clean === 'stock' || clean === 'uom') {
    return { isShowcase: false, tab: 'INVENTORY' };
  }
  if (clean === 'debt' || clean === 'bisa' || clean === 'credit') {
    return { isShowcase: false, tab: 'BISA' };
  }
  if (clean === 'financials' || clean === 'finance' || clean === 'sales' || clean === 'safedrop') {
    return { isShowcase: false, tab: 'FINANCIALS' };
  }
  if (clean === 'staff' || clean === 'employees' || clean === 'shifts') {
    return { isShowcase: false, tab: 'STAFF' };
  }
  if (clean === 'taxes' || clean === 'gra' || clean === 'vsdc') {
    return { isShowcase: false, tab: 'GRA' };
  }
  if (clean === 'docs' || clean === 'help' || clean === 'manual') {
    return { isShowcase: false, tab: 'DOCS' };
  }

  // Any other hash falls back to Showcase as safe default
  return { isShowcase: true, tab: 'POS' };
}

export function getHashFromRoute(isShowcase: boolean, tab: SystemNavTab): string {
  if (isShowcase) return '#/showcase';
  switch (tab) {
    case 'POS': return '#/pos';
    case 'INVENTORY': return '#/inventory';
    case 'BISA': return '#/debt';
    case 'FINANCIALS': return '#/financials';
    case 'STAFF': return '#/staff';
    case 'GRA': return '#/taxes';
    case 'DOCS': return '#/docs';
    default: return '#/pos';
  }
}

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
        const parsed = JSON.parse(saved);
        return sanitizeUserForStorage(parsed);
      } catch (e) {
        return null;
      }
    }
    // Start with default cashier for seamless preview, but allow instant logout/login
    return sanitizeUserForStorage(SYSTEM_USERS[0]);
  });

  // Navigation & Route State (defaults to Showcase unless explicit POS / tab route is in hash)
  const initialRoute = typeof window !== 'undefined' ? parseHashRoute(window.location.hash) : { isShowcase: true, tab: 'POS' as SystemNavTab };
  const [showLandingPage, setShowLandingPage] = useState<boolean>(initialRoute.isShowcase);
  const [activeTab, setActiveTab] = useState<SystemNavTab>(initialRoute.tab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);

  // Sync Hash Route & Browser History
  useEffect(() => {
    // If no hash was present on initial visit, set it to #/showcase so URL clearly shows the route
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.location.replace('#/showcase');
    }

    const handleHashChange = () => {
      const { isShowcase, tab } = parseHashRoute(window.location.hash);
      setShowLandingPage(isShowcase);
      setActiveTab(tab);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (newShowcase: boolean, newTab?: SystemNavTab) => {
    const targetTab = newTab || activeTab;
    const targetHash = getHashFromRoute(newShowcase, targetTab);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      setShowLandingPage(newShowcase);
      if (newTab) setActiveTab(newTab);
    }
  };

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
  const [shiftLockToast, setShiftLockToast] = useState<string | null>(null);

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

  // Multi-Platform App Downloads Modal State
  const [showPlatformModal, setShowPlatformModal] = useState<boolean>(false);
  const [currentPlatform] = useState(() => detectPlatform());

  // Enterprise Modals State (Notifications, Backups, Setup Wizard)
  const [showNotificationPrefsModal, setShowNotificationPrefsModal] = useState<boolean>(false);
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);
  const [showWizardModal, setShowWizardModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('akwaaba_setup_completed') !== 'true';
  });

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
    const safeUser = sanitizeUserForStorage(user);
    setCurrentUser(safeUser);
    localStorage.setItem('akwaaba_pos_session_user', JSON.stringify(safeUser));
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
    if (tabId === activeTab && !showLandingPage) return;
    triggerHaptic('tap');
    setPageTransition(true);
    setTimeout(() => {
      navigateTo(false, tabId as SystemNavTab);
      setMobileMenuOpen(false);
      setTimeout(() => setPageTransition(false), 50);
    }, 120);
  };

  // If showcase website view is active
  if (showLandingPage) {
    return (
      <>
        <ProductLandingPage
          onLaunchPos={() => navigateTo(false, 'POS')}
          onOpenDownloads={() => setShowPlatformModal(true)}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
        />
        <PlatformDownloadModal
          isOpen={showPlatformModal}
          onClose={() => setShowPlatformModal(false)}
          isDark={isDark}
        />
      </>
    );
  }

  // If user is not authenticated, render the dedicated Non-Repudiation Login Page
  if (!currentUser) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          branchName={branchName}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          onOpenShowcase={() => navigateTo(true)}
        />
        <PlatformDownloadModal
          isOpen={showPlatformModal}
          onClose={() => setShowPlatformModal(false)}
          isDark={isDark}
        />
      </>
    );
  }

  // Navigation tabs tailored for role but intuitive for all retail staff
  const getNavTabsForRole = () => {
    const role = currentUser.role;
    switch (role) {
      case 'CASHIER':
        return [
          { id: 'POS', label: 'Checkout', icon: ShoppingBag },
          { id: 'FINANCIALS', label: 'Sales', icon: TrendingUp },
          { id: 'BISA', label: 'Customers', icon: BookOpen },
        ];
      case 'INVENTORY_OFFICER':
        return [
          { id: 'INVENTORY', label: 'Inventory', icon: Boxes, badge: lowStockProducts.length > 0 ? lowStockProducts.length : null },
          { id: 'POS', label: 'Checkout', icon: ShoppingBag },
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
          { id: 'POS', label: 'Checkout', icon: ShoppingBag },
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
      isDark ? 'bg-[#121316] text-[#F4F4F6]' : 'bg-[#EBEEF2] text-[#0F172A]'
    }`}>
      
      {/* ═══ REDESIGNED PREMIUM RETAIL OS TOP NAVIGATION BAR ═══ */}
      <header className={`h-16 border-b flex items-center justify-between px-3 sm:px-6 shrink-0 z-40 transition-colors backdrop-blur-md ${
        isDark 
          ? 'border-[#282B34] bg-[#16181F]/95' 
          : 'border-slate-300 bg-white/95 shadow-xs'
      }`}>
        
        {/* Left: Brand Identity & Location */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
              isDark 
                ? 'border-[#282B34] text-stone-300 hover:text-white hover:bg-[#20232B]' 
                : 'border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
            title="Open Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#FF4500]" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            {/* Fiery Red-Orange Brand Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5722] via-[#FF4500] to-[#E03E00] text-white flex items-center justify-center font-black text-sm shadow-[0_2px_12px_rgba(255,69,0,0.35)] shrink-0">
              <Store className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm sm:text-[15px] tracking-tight text-slate-900 dark:text-stone-100">
                    AKWAABA
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black tracking-wider uppercase bg-[#FF4500]/10 text-[#FF4500] dark:bg-[#FF4500]/20 dark:text-[#FF5722] border border-[#FF4500]/25">
                    POS
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-stone-400 font-semibold truncate max-w-[130px] sm:max-w-[200px]">
                  {branchName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Clean Segmented Navigation Dock (Desktop >= 1024px) */}
        <nav className={`hidden lg:flex items-center gap-1 p-1 rounded-2xl border ${
          isDark 
            ? 'bg-[#12141A] border-[#282B34]' 
            : 'bg-slate-200/90 border-slate-300 shadow-2xs'
        }`}>
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-[#FF4500] text-white font-bold shadow-[0_2px_10px_rgba(255,69,0,0.35)]'
                    : isDark
                    ? 'text-stone-400 hover:text-stone-100 hover:bg-[#1C2028]'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                    isActive ? 'bg-black/25 text-white' : 'bg-[#FF4500] text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Streamlined, Clutter-Free Utility Cluster */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* Showcase Website Button in Header */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              navigateTo(true);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isDark
                ? 'border-[#282B34] bg-[#16181F] text-[#FF5722] hover:bg-[#20232B] hover:border-[#FF4500]/50'
                : 'border-slate-300 bg-orange-50/80 text-[#C43400] hover:bg-orange-100 hover:border-orange-300 shadow-2xs'
            }`}
            title="Visit Product Showcase & Platform Downloads Website"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF4500]" />
            <span className="hidden sm:inline font-bold">Showcase</span>
          </button>

          {/* Active Shift Indicator / Cash Drawer Status */}
          {activeShift ? (
            <button
              onClick={() => setShowShiftModal(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'border-[#00CED1]/30 bg-[#00CED1]/10 text-[#00CED1] hover:bg-[#00CED1]/15 shadow-[0_0_12px_rgba(0,206,209,0.15)]'
                  : 'border-[#00CED1]/60 bg-[#00CED1]/15 text-[#007A7C] font-bold hover:bg-[#00CED1]/25'
              }`}
              title="Till status, float balance & cash drops"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00CED1] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00CED1]"></span>
              </span>
              <span className="hidden sm:inline">Till Active</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOpenShiftPrompt(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#FF4500] hover:bg-[#E03E00] text-white transition-all active:scale-95 shadow-[0_2px_10px_rgba(255,69,0,0.3)] cursor-pointer"
            >
              Open Shift
            </button>
          )}

          {/* Notification & Sound Settings */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              setShowNotificationPrefsModal(true);
            }}
            className={`p-2.5 rounded-xl border transition-all active:scale-90 cursor-pointer ${
              isDark
                ? 'border-[#282B34] text-stone-300 hover:text-emerald-400 hover:bg-[#20232B]'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-emerald-600'
            }`}
            title="Notification, Sound & Haptic Settings"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Backup & Disaster Recovery (for Managers & Super Admins) */}
          {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'GENERAL_MANAGER' || currentUser.role === 'BRANCH_MANAGER') && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowBackupModal(true);
              }}
              className={`hidden sm:flex p-2.5 rounded-xl border transition-all active:scale-90 cursor-pointer ${
                isDark
                  ? 'border-[#282B34] text-stone-300 hover:text-orange-400 hover:bg-[#20232B]'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-orange-600'
              }`}
              title="Disaster Recovery & Backup Center"
            >
              <Database className="w-4 h-4" />
            </button>
          )}

          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={(e) => {
              triggerHaptic('tap');
              executeThemeTransition(e, isDark, (next) => setIsDark(next));
            }}
            className={`p-2.5 rounded-xl border transition-all duration-200 active:scale-90 cursor-pointer ${
              isDark
                ? 'border-[#282B34] text-stone-300 hover:text-[#FF5722] hover:bg-[#20232B]'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-[#FF4500]'
            }`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4" strokeWidth={2} /> : <Moon className="w-4 h-4" strokeWidth={2} />}
          </button>

          {/* User Profile Avatar & Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center gap-2 p-1 sm:pr-2.5 sm:pl-1 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'border-[#282B34] bg-[#16181F] text-stone-200 hover:border-[#FF4500]/50'
                  : 'border-slate-300 bg-white text-slate-900 hover:border-[#FF4500]/50 shadow-2xs'
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white font-mono shadow-xs bg-[#FF4500]"
              >
                {currentUser.fullName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <span className="font-bold text-xs block max-w-[90px] truncate text-slate-900 dark:text-stone-100">
                  {currentUser.fullName.split(' ')[0]}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-stone-400 font-semibold block">
                  {currentUser.role.split('_')[0]}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* User Details & Logout Dropdown */}
            {userMenuOpen && (
              <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl p-3 z-50 text-xs border shadow-2xl animate-expand-in ${
                isDark 
                  ? 'bg-[#16181F] border-[#282B34] text-stone-200' 
                  : 'bg-white border-slate-300 text-slate-900 shadow-xl'
              }`}>
                {/* User Identity Info */}
                <div className={`p-3 rounded-xl mb-2.5 ${isDark ? 'bg-[#121316]' : 'bg-slate-100 border border-slate-200'}`}>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>{currentUser.fullName}</span>
                    <ShieldCheck className="w-4 h-4 text-[#FF4500]" />
                  </div>
                  <div className="text-[11px] text-[#FF4500] dark:text-[#FF5722] font-semibold mt-0.5">
                    {currentUser.role}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
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
                        ? 'bg-[#1E222B] border-[#282B34] text-[#FF5722] hover:bg-[#252A36]'
                        : 'bg-orange-50 border-orange-200 text-[#C43400] hover:bg-orange-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Manage Employees</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF4500]/15 text-[#FF4500] dark:text-[#FF5722]">
                      Admin
                    </span>
                  </button>
                )}

                {/* Feature Showcase Website Link */}
                <button
                  type="button"
                  onClick={() => {
                    navigateTo(true);
                    setUserMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between mb-2 transition-all border active:scale-[0.98] cursor-pointer ${
                    isDark
                      ? 'bg-[#1E222B] border-[#282B34] text-stone-200 hover:bg-[#252A36]'
                      : 'bg-orange-50/50 border-orange-200/80 text-slate-800 hover:bg-orange-100/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF4500]" />
                    <span>Feature Showcase Website</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF4500]/15 text-[#FF4500] dark:text-[#FF5722]">
                    Showcase
                  </span>
                </button>

                {/* Multi-Platform App Downloads Link */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlatformModal(true);
                    setUserMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between mb-2 transition-all border active:scale-[0.98] cursor-pointer ${
                    isDark
                      ? 'bg-[#1E222B] border-[#282B34] text-stone-200 hover:bg-[#252A36]'
                      : 'bg-orange-50/50 border-orange-200/80 text-slate-800 hover:bg-orange-100/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-orange-500" />
                    <span>Download Native Apps</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">
                    .exe / .dmg / Tablet
                  </span>
                </button>

                {/* Backup & Disaster Recovery Link */}
                <button
                  type="button"
                  onClick={() => {
                    setShowBackupModal(true);
                    setUserMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between mb-2 transition-all border active:scale-[0.98] cursor-pointer ${
                    isDark
                      ? 'bg-[#1E222B] border-[#282B34] text-stone-200 hover:bg-[#252A36]'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-orange-400" />
                    <span>Backup &amp; Disaster Recovery</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                    SHA-256
                  </span>
                </button>

                {/* Notification Settings Link */}
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationPrefsModal(true);
                    setUserMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between mb-2 transition-all border active:scale-[0.98] cursor-pointer ${
                    isDark
                      ? 'bg-[#1E222B] border-[#282B34] text-stone-200 hover:bg-[#252A36]'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Audio Chimes &amp; Haptics</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                    Web Audio
                  </span>
                </button>

                {/* Setup & Installation Wizard Re-run */}
                <button
                  type="button"
                  onClick={() => {
                    setShowWizardModal(true);
                    setUserMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between mb-2 transition-all border active:scale-[0.98] cursor-pointer ${
                    isDark
                      ? 'bg-[#1E222B] border-[#282B34] text-stone-200 hover:bg-[#252A36]'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Setup &amp; Legal Wizard</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                    Re-run
                  </span>
                </button>

                {/* GitHub Support & Complaint Center Link */}
                <a
                  href="https://github.com/Mazonia/pos-n-sales-system/issues"
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between mb-2 transition-all border cursor-pointer ${
                    isDark
                      ? 'bg-[#1E222B] border-[#282B34] text-stone-200 hover:bg-[#252A36]'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Report Issue / Support</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    GitHub Issues
                  </span>
                </a>

                {/* Developer Attribution */}
                <div className="px-2.5 py-1.5 text-center text-[10px] text-slate-500 dark:text-stone-400 font-semibold border-t border-slate-800/60 my-1">
                  Built by <strong className="text-orange-400">Mazonia</strong>
                </div>

                {/* Switch User Helper */}
                <div className="space-y-1 mb-2.5">
                  <div className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 text-slate-500 dark:text-stone-400">
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
                        isDark ? 'hover:bg-[#20232B] text-stone-300' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <span className="truncate">{u.fullName}</span>
                      <span className="text-[10px] text-slate-500 dark:text-stone-400">{u.role.split('_')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Explicit Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                    isDark 
                      ? 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40' 
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
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
            ? 'bg-[#16181F]/95 backdrop-blur-md border-[#282B34]' 
            : 'bg-white/98 backdrop-blur-md border-slate-300 shadow-md'
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
                    ? 'bg-[#FF4500] text-white font-bold shadow-[0_2px_10px_rgba(255,69,0,0.3)]'
                    : isDark
                    ? 'text-stone-300 hover:text-white hover:bg-[#20232B]'
                    : 'text-slate-800 hover:text-slate-950 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] tabular-nums ${
                    isActive ? 'bg-black/25 text-white' : 'bg-[#FF4500] text-white'
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
        <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold animate-slide-in-top bg-[#FF4500] text-white">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* MAIN VIEWPORT with page transition */}
      <main className={`flex-1 flex overflow-hidden transition-all duration-200 pb-16 lg:pb-0 ${
        pageTransition ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'
      }`}>
        {activeTab === 'POS' && (
          <div className="register-view w-full h-full flex flex-1 overflow-hidden" data-view="POS">
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
          </div>
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
            currentUser={currentUser}
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
            setShiftLockToast(`Till successfully locked! Z-Report #${report.zReportNumber} saved (${report.varianceStatus}). Cash drawer closed.`);
            refreshAllData();
            setTimeout(() => setShiftLockToast(null), 6500);
          }}
        />
      )}

      {/* SHIFT LOCK CONFIRMATION TOAST */}
      {shiftLockToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-serif font-bold text-xs shadow-2xl flex items-center gap-2.5 animate-bounce border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{shiftLockToast}</span>
        </div>
      )}

      {/* PROMPT OPEN NEW SHIFT */}
      {showOpenShiftPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-slide-in">
          <form onSubmit={handleOpenNewShift} className={`w-full max-w-sm rounded-2xl border p-6 space-y-5 animate-scale-in ${
            isDark 
              ? 'bg-[#1A1C22] border-[#282B34] text-stone-100 shadow-2xl' 
              : 'bg-white border-stone-200 text-stone-900 shadow-xl'
          }`}>
            <h3 className={`font-bold text-sm flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-stone-900'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700'
              }`}>
                <DollarSign className="w-4 h-4" />
              </div>
              <span>Open New Cashier Till Shift</span>
            </h3>
            <p className="text-xs text-stone-400">
              Assigned Cashier: <span className="font-semibold text-amber-500">{currentUser.fullName}</span>
            </p>

            <div>
              <label className="text-[11px] text-stone-400 font-medium block mb-1.5">Opening Cash Float (GH₵):</label>
              <input
                type="number"
                step="1"
                value={openingFloatInput || ''}
                onChange={e => setOpeningFloatInput(parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-2.5 rounded-xl font-mono tabular-nums text-sm outline-none border transition-all duration-200 focus:ring-2 focus:ring-amber-500/30 ${
                  isDark 
                    ? 'bg-[#141519] border-[#282B34] text-white focus:border-amber-500' 
                    : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-amber-500'
                }`}
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowOpenShiftPrompt(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-[0.97] ${
                  isDark 
                    ? 'border-[#282B34] text-stone-400 hover:text-white hover:bg-[#232630]' 
                    : 'border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs transition-all duration-200 active:scale-[0.97] ${
                  isDark
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                }`}
              >
                Start Shift
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Multi-Platform Download Center Modal */}
      <PlatformDownloadModal
        isOpen={showPlatformModal}
        onClose={() => setShowPlatformModal(false)}
      />

      {/* Tablet & iPad Bottom Touch Navigation */}
      <TabletTouchNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenBackup={() => setShowBackupModal(true)}
        onOpenNotifications={() => setShowNotificationPrefsModal(true)}
        onOpenDownloads={() => setShowPlatformModal(true)}
        onOpenShowcase={() => navigateTo(true)}
        isDark={isDark}
      />

      {/* Universal Custom Toast & Dialog System (No native alerts anywhere) */}
      <UniversalToastContainer isDark={isDark} />

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={showNotificationPrefsModal}
        onClose={() => setShowNotificationPrefsModal(false)}
        isDark={isDark}
      />

      {/* Installation & Legal Onboarding Wizard */}
      <InstallationWizardModal
        isOpen={showWizardModal}
        onComplete={() => setShowWizardModal(false)}
        onExitToShowcase={() => {
          setShowWizardModal(false);
          navigateTo(true);
        }}
        isDark={isDark}
      />

      {/* Backup & Disaster Recovery Center */}
      <BackupManagerModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        currentUser={currentUser}
        isDark={isDark}
      />

    </div>
  );
}
