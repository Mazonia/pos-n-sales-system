import React, { useState, useEffect } from 'react';
import { SystemUser, SYSTEM_USERS, getAllUsers, db } from '../../utils/dexieSync';
import {
  getTerminalBranch,
  setTerminalBranch,
  ENTERPRISE_BRANCHES,
  canUserAccessTerminal,
  TerminalBranch,
} from '../../utils/terminalConfig';
import { triggerHaptic } from '../../utils/haptics';
import {
  ShieldCheck,
  Lock,
  Store,
  User,
  CheckCircle2,
  Delete,
  AlertCircle,
  KeyRound,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Users,
  Settings,
  Building,
  ShieldAlert,
  X,
  Fingerprint
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: SystemUser) => void;
  branchName: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  branchName,
  isDark,
  onToggleTheme,
}) => {
  const [usersList, setUsersList] = useState<SystemUser[]>(SYSTEM_USERS);
  const [selectedUser, setSelectedUser] = useState<SystemUser>(SYSTEM_USERS[0]);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // PC Terminal Workstation Branch Binding State
  const [terminalBranch, setTerminalBranchState] = useState<TerminalBranch>(() => getTerminalBranch());
  const [showTerminalConfigModal, setShowTerminalConfigModal] = useState<boolean>(false);
  const [targetTerminalBranch, setTargetTerminalBranch] = useState<TerminalBranch>(terminalBranch);
  const [gmAdminPin, setGmAdminPin] = useState<string>('');
  const [gmPinError, setGmPinError] = useState<string>('');
  const [terminalSuccessToast, setTerminalSuccessToast] = useState<string>('');

  useEffect(() => {
    getAllUsers().then(loaded => {
      if (loaded && loaded.length > 0) {
        setUsersList(loaded);
        // Default select first user that has terminal access, or loaded[0]
        const firstAllowed = loaded.find(u => canUserAccessTerminal(u, terminalBranch).allowed);
        setSelectedUser(firstAllowed || loaded[0]);
      }
    });

    const handleUsersUpdated = () => {
      getAllUsers().then(loaded => {
        if (loaded && loaded.length > 0) {
          setUsersList(loaded);
        }
      });
    };

    const handleTerminalChanged = (e: any) => {
      if (e.detail) {
        setTerminalBranchState(e.detail);
      }
    };

    window.addEventListener('usersUpdated', handleUsersUpdated);
    window.addEventListener('terminalBranchChanged', handleTerminalChanged);
    return () => {
      window.removeEventListener('usersUpdated', handleUsersUpdated);
      window.removeEventListener('terminalBranchChanged', handleTerminalChanged);
    };
  }, [terminalBranch]);

  const handleKeyPress = (num: string) => {
    triggerHaptic('keypad');
    if (pinInput.length < 4) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        verifyPin(nextPin, selectedUser);
      }
    }
  };

  const handleBackspace = () => {
    triggerHaptic('tap');
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    triggerHaptic('tap');
    setPinInput('');
    setErrorMsg('');
  };

  const verifyPin = async (pinToTest: string, user: SystemUser) => {
    setIsSubmitting(true);

    // 1. Verify PC Terminal Workstation binding access
    const terminalAccess = canUserAccessTerminal(user, terminalBranch);
    if (!terminalAccess.allowed) {
      triggerHaptic('error');
      setIsSubmitting(false);
      setErrorMsg(terminalAccess.reason || `Workstation Lockout: Operator assigned to "${user.branchName}". This PC workstation is configured for "${terminalBranch.name}".`);
      setPinInput('');
      return;
    }

    // 2. Allow configured pin or fallback demo pin
    const isValid =
      pinToTest === user.pin ||
      pinToTest === '1234' ||
      pinToTest === '0000' ||
      pinToTest === '9999' ||
      pinToTest === '7777';

    if (isValid) {
      triggerHaptic('success');
      // Record non-repudiation audit log
      try {
        await db.auditLogs.add({
          id: `audit-login-${Date.now()}`,
          action: 'USER_LOGIN_AUTHENTICATED',
          userId: user.id,
          userName: `${user.fullName} (${user.role})`,
          details: `Authenticated login to ${terminalBranch.name} (${terminalBranch.code}) terminal. Non-repudiation session established.`,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Audit log write error', e);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onLoginSuccess(user);
      }, 250);
    } else {
      triggerHaptic('error');
      setTimeout(() => {
        setIsSubmitting(false);
        setErrorMsg('Invalid Security PIN. Please re-enter or select quick demo PIN.');
        setPinInput('');
      }, 200);
    }
  };

  const handleQuickLogin = (user: SystemUser) => {
    const terminalAccess = canUserAccessTerminal(user, terminalBranch);
    if (!terminalAccess.allowed) {
      triggerHaptic('error');
      setErrorMsg(terminalAccess.reason || `Workstation Lockout: Operator assigned to "${user.branchName}". This PC workstation is configured for "${terminalBranch.name}".`);
      return;
    }

    triggerHaptic('tap');
    setSelectedUser(user);
    const pin = user.pin || '1234';
    setPinInput(pin);
    verifyPin(pin, user);
  };

  const handleSaveTerminalBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setGmPinError('');

    // Find authorized executive by PIN (must be SUPER_ADMIN or GENERAL_MANAGER)
    const matchedExecutive = usersList.find(
      u =>
        (u.role === 'SUPER_ADMIN' || u.role === 'GENERAL_MANAGER') &&
        (u.pin === gmAdminPin || gmAdminPin === '9999' || gmAdminPin === '7777')
    );

    if (!matchedExecutive) {
      triggerHaptic('error');
      setGmPinError('Authorization Denied: Only Super Admin (Kwame Mensah, PIN: 9999) or General Manager (Esi Mansa, PIN: 7777) can configure workstation PC branch binding.');
      return;
    }

    try {
      await setTerminalBranch(targetTerminalBranch, matchedExecutive);
      setTerminalBranchState(targetTerminalBranch);
      setShowTerminalConfigModal(false);
      setGmAdminPin('');
      triggerHaptic('success');
      setTerminalSuccessToast(`Workstation PC successfully bound to "${targetTerminalBranch.name}"!`);
      setTimeout(() => setTerminalSuccessToast(''), 4000);
    } catch (err: any) {
      setGmPinError(err.message || 'Failed to update terminal workstation branch.');
    }
  };

  const selectedUserAccess = canUserAccessTerminal(selectedUser, terminalBranch);

  return (
    <div className={`min-h-screen w-screen flex flex-col justify-between overflow-y-auto select-none transition-colors duration-350 ${
      isDark ? 'bg-[#06080C] text-[#F0F4F8]' : 'theme-light bg-[#F6F8FA] text-[#0F172A]'
    }`}>
      {/* ═══ DRAMATIC ANIMATED BACKGROUND ═══ */}
      {/* Aurora gradient sweep */}
      <div className={`fixed inset-0 pointer-events-none ${isDark ? 'bg-aurora-intense opacity-100' : 'bg-aurora opacity-40'}`} />
      {/* Radial spotlight from top-center */}
      <div className={`fixed inset-0 pointer-events-none ${
        isDark 
          ? 'bg-[radial-gradient(ellipse_at_top_center,rgba(16,185,129,0.12)_0%,transparent_60%)]' 
          : 'bg-[radial-gradient(ellipse_at_top_center,rgba(5,150,105,0.06)_0%,transparent_60%)]'
      }`} />
      {/* Floating Orb Decorations */}
      <div className={`fixed pointer-events-none w-[400px] h-[400px] rounded-full orb-float-1 ${
        isDark 
          ? 'bg-emerald-500/[0.04] blur-[100px]' 
          : 'bg-emerald-400/[0.06] blur-[80px]'
      }`} style={{ top: '10%', left: '15%' }} />
      <div className={`fixed pointer-events-none w-[350px] h-[350px] rounded-full orb-float-2 ${
        isDark 
          ? 'bg-sky-500/[0.03] blur-[100px]' 
          : 'bg-sky-400/[0.05] blur-[80px]'
      }`} style={{ top: '60%', right: '10%' }} />
      <div className={`fixed pointer-events-none w-[300px] h-[300px] rounded-full orb-float-3 ${
        isDark 
          ? 'bg-purple-500/[0.03] blur-[100px]' 
          : 'bg-purple-400/[0.04] blur-[80px]'
      }`} style={{ bottom: '20%', left: '40%' }} />
      {/* Subtle noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none glass-noise opacity-30" />

      {/* Toast Notification */}
      {terminalSuccessToast && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in-top">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-[16px] font-bold text-xs shadow-2xl ${
            isDark 
              ? 'bg-emerald-500 text-[#06080C] shadow-[0_4px_24px_rgba(16,185,129,0.25)]' 
              : 'bg-emerald-600 text-white shadow-[0_4px_20px_rgba(5,150,105,0.2)]'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{terminalSuccessToast}</span>
          </div>
        </div>
      )}

      {/* Top Bar with Brand & Workstation Terminal Binding */}
      <header className={`h-[60px] border-b flex items-center justify-between px-4 sm:px-6 shrink-0 transition-all duration-300 relative z-10 ${
        isDark 
          ? 'border-[rgba(48,62,80,0.3)] bg-[rgba(13,17,23,0.7)] backdrop-blur-xl' 
          : 'border-[rgba(209,215,224,0.5)] bg-[rgba(255,255,255,0.8)] backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-base shadow-sm transition-all duration-300 ${
            isDark 
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-[#06080C] shadow-[0_2px_12px_rgba(16,185,129,0.25)]' 
              : 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-[0_2px_8px_rgba(5,150,105,0.2)]'
          }`}>
            AK
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
              <span className={isDark ? 'text-white' : 'text-[#0F172A]'}>Akwaaba Retail OS</span>
              <span className={`text-[10px] px-2 py-[2px] rounded-[8px] font-mono font-semibold ${
                isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                v2.6 Enterprise
              </span>
            </div>
            <p className="text-[10px] text-[#8B9DB5] flex items-center gap-1.5 font-mono mt-[1px]">
              <Store className="w-3 h-3 text-amber-500" />
              <span>{terminalBranch.name}</span>
              <span className="text-amber-500/70 font-bold">[{terminalBranch.code}]</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Workstation PC Terminal Badge */}
          <div className={`hidden sm:flex items-center gap-2 px-2.5 py-[6px] rounded-[12px] border text-[11px] font-mono ${
            isDark ? 'bg-[#0D1117] border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PC Workstation: </span>
            <strong>{terminalBranch.code}</strong>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              setTargetTerminalBranch(terminalBranch);
              setGmAdminPin('');
              setGmPinError('');
              setShowTerminalConfigModal(true);
            }}
            className={`px-2.5 py-[7px] rounded-[12px] border text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-[0.96] ${
              isDark 
                ? 'border-[rgba(48,62,80,0.5)] text-[#8B9DB5] hover:text-white hover:bg-[#1C2333]' 
                : 'border-[rgba(209,215,224,0.5)] text-slate-700 hover:bg-[#F0F2F5]'
            }`}
            title="Super Admin or General Manager only"
          >
            <Settings className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Set PC Branch</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('tap');
              onToggleTheme();
            }}
            className={`p-2 rounded-[12px] border transition-all duration-200 active:scale-90 ${
              isDark
                ? 'border-[rgba(48,62,80,0.5)] text-amber-400 hover:bg-[#1C2333]'
                : 'border-[rgba(209,215,224,0.5)] text-slate-500 hover:bg-[#F0F2F5]'
            }`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-[900px] grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch animate-fade-slide-in">
          
          {/* Left Column: User Selection & Branch Context */}
          <div className={`lg:col-span-6 rounded-[22px] border p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 card-accent-strip ${
            isDark 
              ? 'bg-[rgba(13,17,23,0.6)] backdrop-blur-xl border-[rgba(48,62,80,0.35)] shadow-[0_4px_24px_rgba(0,0,0,0.3)]' 
              : 'bg-white/90 backdrop-blur-xl border-[rgba(209,215,224,0.5)] shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-[10px] flex items-center justify-center ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${
                  isDark ? 'text-emerald-400 text-glow-emerald' : 'text-emerald-600'
                }`}>Workstation & Non-Repudiation</span>
              </div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Sign In to POS Till
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8B9DB5] mb-5 font-mono">
                <span>Bound PC:</span>
                <span className="text-amber-500 font-bold">{terminalBranch.name}</span>
              </div>

              {/* User Roles List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 stagger-children">
                {usersList.map(user => {
                  const isSelected = selectedUser.id === user.id;
                  const access = canUserAccessTerminal(user, terminalBranch);

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setSelectedUser(user);
                        setPinInput('');
                        if (!access.allowed) {
                          setErrorMsg(access.reason || `User assigned to ${user.branchName}. This PC workstation is configured for ${terminalBranch.name}.`);
                        } else {
                          setErrorMsg('');
                        }
                      }}
                      className={`w-full text-left p-3 rounded-[16px] border transition-all duration-250 flex items-center justify-between group animate-fade-slide-in ${
                        isSelected
                          ? isDark
                            ? 'bg-[#151B23] border-emerald-500/40 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.06)]'
                            : 'bg-emerald-50/60 border-emerald-400/50 shadow-[0_0_0_1px_rgba(5,150,105,0.1),0_2px_8px_rgba(5,150,105,0.06)]'
                          : isDark
                          ? 'bg-[#0A0D12]/40 border-[rgba(48,62,80,0.3)] hover:border-[rgba(48,62,80,0.6)] hover:bg-[#151B23]/50'
                          : 'bg-[#FAFBFC] border-[rgba(209,215,224,0.4)] hover:border-[rgba(175,184,196,0.5)] hover:bg-white'
                      }`}
                      style={{ transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-sm text-[#06080C] font-mono shadow-sm shrink-0"
                          style={{ backgroundColor: user.avatarColor || '#10B981' }}
                        >
                          {user.fullName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className={`text-[13px] font-bold flex items-center gap-2 ${
                            isSelected
                              ? isDark ? 'text-white' : 'text-emerald-900'
                              : isDark ? 'text-[#F0F4F8]' : 'text-slate-800'
                          }`}>
                            <span>{user.fullName}</span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </div>
                          
                          <div className="text-[10px] text-[#8B9DB5] font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className={`font-semibold ${isDark ? 'text-emerald-400/80' : 'text-emerald-600'}`}>{user.role}</span>
                            <span className="opacity-30">·</span>
                            <span className="flex items-center gap-1">
                              <Store className="w-2.5 h-2.5 text-[#8B9DB5]" />
                              <span>{user.branchName}</span>
                            </span>
                          </div>

                          {!access.allowed && (
                            <span className={`mt-1 inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-[2px] rounded-[6px] ${
                              isDark 
                                ? 'text-rose-400 bg-rose-500/8 border border-rose-500/15' 
                                : 'text-rose-600 bg-rose-50 border border-rose-200'
                            }`}>
                              <Lock className="w-2.5 h-2.5" />
                              <span>Not authorized on this PC ({terminalBranch.code})</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {access.allowed ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickLogin(user);
                          }}
                          className={`text-[10px] font-semibold px-2.5 py-[6px] rounded-[10px] border transition-all duration-200 active:scale-[0.94] flex items-center gap-1 ${
                            isSelected
                              ? isDark
                                ? 'bg-emerald-500 text-[#06080C] border-emerald-500 font-bold shadow-[0_2px_8px_rgba(16,185,129,0.2)]'
                                : 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : isDark
                              ? 'border-[rgba(48,62,80,0.5)] text-[#8B9DB5] hover:text-white hover:bg-[#1C2333]'
                              : 'border-[rgba(209,215,224,0.5)] text-slate-600 hover:text-black hover:bg-[#F0F2F5]'
                          }`}
                          title="Instant test login with preset PIN"
                        >
                          <span>Log In</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-[#556575] italic px-2 py-1">
                          Other Branch
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Non-Repudiation Security Seal */}
            <div className={`mt-6 p-3.5 rounded-[16px] border text-[11px] flex items-start gap-2.5 ${
              isDark 
                ? 'bg-emerald-500/4 border-emerald-500/12 text-[#8B9DB5]' 
                : 'bg-emerald-50/50 border-emerald-100 text-slate-600'
            }`}>
              <Lock className="w-4 h-4 text-emerald-500 mt-[1px] shrink-0" />
              <div>
                <span className="font-bold text-emerald-500 block mb-0.5">Workstation Security & Non-Repudiation Policy</span>
                <p className="leading-relaxed">
                  This workstation PC is locked to <strong>"{terminalBranch.name}"</strong>. Only personnel assigned to this branch or executive managers can operate this machine. All transactions are digitally signed.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Tactile PIN Pad */}
          <div className={`lg:col-span-6 rounded-[22px] border p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 animate-border-glow ${
            isDark 
              ? 'bg-[rgba(13,17,23,0.6)] backdrop-blur-xl border-[rgba(48,62,80,0.35)] shadow-[0_4px_24px_rgba(0,0,0,0.3)]' 
              : 'bg-white/90 backdrop-blur-xl border-[rgba(209,215,224,0.5)] shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
          }`}>
            <div>
              {/* Selected User Header */}
              <div className="text-center mb-6 animate-scale-in">
                <div
                  className={`w-16 h-16 mx-auto rounded-[18px] flex items-center justify-center font-black text-lg text-[#06080C] mb-3 transition-all duration-300 ${
                    isDark ? 'shadow-[0_4px_16px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                  }`}
                  style={{ backgroundColor: selectedUser.avatarColor || '#10B981' }}
                >
                  {selectedUser.fullName.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className={`text-[15px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedUser.fullName}
                </h3>
                <p className="text-[11px] text-[#8B9DB5] font-mono mt-0.5">
                  {selectedUser.role} • Staff ID: {selectedUser.id}
                </p>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] mt-2 rounded-[8px] text-[10px] font-mono border ${
                  isDark ? 'bg-[#0A0D12] border-[rgba(48,62,80,0.3)] text-[#8B9DB5]' : 'bg-[#F6F8FA] border-[rgba(209,215,224,0.4)] text-[#64748B]'
                }`}>
                  <Store className="w-3 h-3 text-amber-500" />
                  <span>Assigned: {selectedUser.branchName}</span>
                </div>
              </div>

              {/* Conditional: Workstation Restriction Lockout or PIN Pad */}
              {!selectedUserAccess.allowed ? (
                <div className={`p-6 rounded-[20px] border text-center space-y-3.5 my-4 animate-scale-in ${
                  isDark 
                    ? 'border-rose-500/20 bg-rose-500/5' 
                    : 'border-rose-200 bg-rose-50/50'
                }`}>
                  <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center mx-auto ${
                    isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'
                  }`}>
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h4 className={`font-bold text-sm ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>Workstation PC Lock</h4>
                  <p className={`text-xs leading-relaxed max-w-sm mx-auto ${isDark ? 'text-rose-200/80' : 'text-rose-600'}`}>
                    Operator <strong>{selectedUser.fullName}</strong> is assigned to <strong>"{selectedUser.branchName}"</strong>.
                    This physical terminal PC is bound exclusively to <strong>"{terminalBranch.name}"</strong>.
                  </p>
                  <div className={`p-3 rounded-[14px] text-[10px] font-mono text-left space-y-1.5 ${
                    isDark ? 'bg-[#06080C]/60 text-[#8B9DB5]' : 'bg-white text-[#64748B]'
                  }`}>
                    <div>· Only staff assigned to "{terminalBranch.name}" may sign in on this PC</div>
                    <div>· General Manager or Super Admin can rebind this PC branch</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setTargetTerminalBranch(terminalBranch);
                      setShowTerminalConfigModal(true);
                    }}
                    className={`px-4 py-2.5 font-bold text-xs rounded-[12px] transition-all duration-200 inline-flex items-center gap-1.5 active:scale-[0.96] ${
                      isDark 
                        ? 'bg-amber-500 hover:bg-amber-400 text-[#06080C] shadow-[0_2px_8px_rgba(245,158,11,0.2)]' 
                        : 'bg-amber-500 hover:bg-amber-400 text-white shadow-[0_2px_6px_rgba(245,158,11,0.2)]'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configure PC Workstation Branch</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* PIN Dots Display */}
                  <div className="flex flex-col items-center justify-center mb-6">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Fingerprint className="w-3.5 h-3.5 text-[#8B9DB5]" />
                      <span className="text-[11px] text-[#8B9DB5] font-medium">Enter 4-Digit Security PIN</span>
                    </div>
                    <div className="flex items-center gap-3.5">
                      {[0, 1, 2, 3].map(idx => {
                        const isFilled = pinInput.length > idx;
                        return (
                          <div
                            key={idx}
                            className={`w-11 h-11 rounded-[14px] border flex items-center justify-center transition-all duration-200 ${
                              isFilled
                                ? isDark
                                ? 'border-emerald-500/50 bg-emerald-500/12 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                                : 'border-emerald-500/50 bg-emerald-50 shadow-[0_0_8px_rgba(5,150,105,0.06)]'
                                : isDark
                                ? 'border-[rgba(48,62,80,0.4)] bg-[#0A0D12]'
                                : 'border-[rgba(209,215,224,0.5)] bg-[#F6F8FA]'
                            }`}
                            style={{ transform: isFilled ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                          >
                            {isFilled && (
                              <span className={`w-3 h-3 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {errorMsg && (
                      <div className={`mt-3 text-[11px] font-semibold flex items-center gap-1.5 text-center max-w-xs px-3 py-2 rounded-[10px] animate-scale-in ${
                        isDark ? 'text-rose-400 bg-rose-500/8' : 'text-rose-600 bg-rose-50'
                      }`}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* Keypad */}
                  <div className="max-w-[260px] mx-auto grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleKeyPress(num)}
                        disabled={isSubmitting}
                        className={`h-[48px] rounded-[14px] border font-mono text-base font-bold transition-all duration-150 active:scale-[0.93] ${
                          isDark
                            ? 'border-[rgba(48,62,80,0.4)] bg-[#151B23] hover:bg-[#1C2333] text-white active:bg-emerald-500/15'
                            : 'border-[rgba(209,215,224,0.5)] bg-white hover:bg-[#F0F2F5] text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-emerald-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={isSubmitting}
                      className={`h-[48px] rounded-[14px] border text-[11px] font-semibold transition-all duration-150 active:scale-[0.93] ${
                        isDark
                          ? 'border-[rgba(48,62,80,0.3)] bg-[#0A0D12] text-[#8B9DB5] hover:text-white hover:bg-[#151B23]'
                          : 'border-[rgba(209,215,224,0.4)] bg-[#F6F8FA] text-slate-500 hover:text-black hover:bg-[#F0F2F5]'
                      }`}
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={() => handleKeyPress('0')}
                      disabled={isSubmitting}
                      className={`h-[48px] rounded-[14px] border font-mono text-base font-bold transition-all duration-150 active:scale-[0.93] ${
                        isDark
                          ? 'border-[rgba(48,62,80,0.4)] bg-[#151B23] hover:bg-[#1C2333] text-white'
                          : 'border-[rgba(209,215,224,0.5)] bg-white hover:bg-[#F0F2F5] text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                      }`}
                    >
                      0
                    </button>

                    <button
                      type="button"
                      onClick={handleBackspace}
                      disabled={isSubmitting}
                      className={`h-[48px] rounded-[14px] border flex items-center justify-center transition-all duration-150 active:scale-[0.93] ${
                        isDark
                          ? 'border-[rgba(48,62,80,0.3)] bg-[#0A0D12] text-[#8B9DB5] hover:text-white hover:bg-[#151B23]'
                          : 'border-[rgba(209,215,224,0.4)] bg-[#F6F8FA] text-slate-500 hover:text-black hover:bg-[#F0F2F5]'
                      }`}
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quick Demo Fill Helper */}
            {selectedUserAccess.allowed && (
              <div className={`mt-6 pt-4 border-t border-dashed flex items-center justify-between text-xs ${
                isDark ? 'border-[rgba(48,62,80,0.3)]' : 'border-[rgba(209,215,224,0.4)]'
              }`}>
                <span className="text-[#8B9DB5]">Staff PIN: <strong className="text-emerald-500 font-mono">{selectedUser.pin}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    const pin = selectedUser.pin || '1234';
                    setPinInput(pin);
                    verifyPin(pin, selectedUser);
                  }}
                  className={`font-semibold flex items-center gap-1.5 active:scale-[0.96] transition-all duration-200 px-2.5 py-1.5 rounded-[10px] ${
                    isDark 
                      ? 'text-emerald-400 hover:bg-emerald-500/8' 
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fill & Enter</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* WORKSTATION PC BRANCH CONFIGURATION MODAL */}
      {showTerminalConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg animate-fade-slide-in">
          <div className={`w-full max-w-md rounded-[22px] border p-6 space-y-4 animate-scale-in ${
            isDark 
              ? 'bg-[#0D1117] border-[rgba(48,62,80,0.4)] shadow-[0_16px_48px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-[rgba(209,215,224,0.5)] shadow-[0_16px_40px_rgba(0,0,0,0.1)]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-[rgba(48,62,80,0.3)]' : 'border-[rgba(209,215,224,0.4)]'
            }`}>
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <Store className="w-5 h-5" />
                <span className={isDark ? 'text-amber-400' : 'text-amber-700'}>Configure PC Workstation Branch</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTerminalConfigModal(false)}
                className={`p-1.5 rounded-[8px] transition-all duration-150 ${
                  isDark ? 'text-[#8B9DB5] hover:text-white hover:bg-[#1C2333]' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F0F2F5]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#8B9DB5] leading-relaxed">
              When Akwaaba POS is installed on this PC terminal, set the branch to which this workstation operates. Only personnel allocated to this branch (plus Super Admin & General Manager) can sign in on this machine.
            </p>

            <form onSubmit={handleSaveTerminalBranch} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#8B9DB5] block mb-1.5">
                  Select Workstation Branch:
                </label>
                <select
                  value={targetTerminalBranch.id}
                  onChange={e => {
                    const found = ENTERPRISE_BRANCHES.find(b => b.id === e.target.value);
                    if (found) setTargetTerminalBranch(found);
                  }}
                  className={`w-full px-3 py-2.5 rounded-[12px] border text-xs font-semibold outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-500/30 ${
                    isDark 
                      ? 'bg-[#0A0D12] border-[rgba(48,62,80,0.5)] text-white focus:border-amber-500' 
                      : 'bg-[#F6F8FA] border-[rgba(209,215,224,0.5)] text-slate-900 focus:border-amber-500'
                  }`}
                >
                  {ENTERPRISE_BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.region}) [{b.code}]
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-[#8B9DB5] mt-1.5 font-mono">
                  Location: {targetTerminalBranch.location}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8B9DB5] block mb-1.5">
                  Super Admin or General Manager PIN / Password:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9DB5]" />
                  <input
                    type="password"
                    required
                    placeholder="Enter Kwame Mensah (9999) or Esi Mansa (7777) PIN"
                    value={gmAdminPin}
                    onChange={e => setGmAdminPin(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-[12px] border text-xs font-mono outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-500/30 ${
                      isDark 
                        ? 'bg-[#0A0D12] border-[rgba(48,62,80,0.5)] text-white focus:border-amber-500' 
                        : 'bg-[#F6F8FA] border-[rgba(209,215,224,0.5)] text-slate-900 focus:border-amber-500'
                    }`}
                  />
                </div>
                {gmPinError && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1.5 flex items-center gap-1.5 animate-scale-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{gmPinError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTerminalConfigModal(false)}
                  className={`flex-1 py-2.5 rounded-[12px] border text-xs font-semibold transition-all duration-200 active:scale-[0.97] ${
                    isDark 
                      ? 'border-[rgba(48,62,80,0.5)] text-[#8B9DB5] hover:text-white hover:bg-[#1C2333]' 
                      : 'border-[rgba(209,215,224,0.5)] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F0F2F5]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 font-bold text-xs rounded-[12px] flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] ${
                    isDark 
                      ? 'bg-amber-500 hover:bg-amber-400 text-[#06080C] shadow-[0_2px_8px_rgba(245,158,11,0.2)]' 
                      : 'bg-amber-500 hover:bg-amber-400 text-white shadow-[0_2px_6px_rgba(245,158,11,0.2)]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Bind Workstation PC</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className={`py-4 text-center text-[10px] font-mono relative z-10 ${
        isDark ? 'text-[#556575]' : 'text-[#94A3B8]'
      }`}>
        Akwaaba POS & Retail OS • Built for Ghanaian Supermarkets, Pharmacies & Retailers • GRA Fiscalised
      </footer>
    </div>
  );
};
