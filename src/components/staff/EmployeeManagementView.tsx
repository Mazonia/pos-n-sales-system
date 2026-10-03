import React, { useState, useEffect } from 'react';
import {
  SystemUser,
  getAllUsers,
  enrollEmployee,
  updateEmployee,
  deleteEmployee,
  db
} from '../../utils/dexieSync';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Building,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Printer,
  Trash2,
  Filter,
  BadgeCheck,
  UserCheck,
  Store,
  X,
  Pencil
} from 'lucide-react';
import { ENTERPRISE_BRANCHES } from '../../utils/terminalConfig';
import {
  validatePasswordRules,
  validateSixDigitPin,
  generateRandomSixDigitPin,
  PasswordRuleStatus
} from '../../utils/credentialValidator';

interface EmployeeManagementViewProps {
  currentUser: SystemUser;
  onSwitchUser: (user: SystemUser) => void;
  branchName: string;
  isDark: boolean;
}

const AVATAR_COLORS = [
  '#F59E0B', // Amber (Manager)
  '#D97706', // Burnt Amber
  '#8B5CF6', // Purple (General Manager)
  '#78716C', // Warm Stone
  '#EC4899', // Pink (Inventory)
  '#EA580C', // Terracotta
  '#10B981', // Emerald (Cashier)
  '#14B8A6', // Teal
];

const PRESET_BRANCHES = [
  'Accra Central Mall Store',
  'Kumasi Adum Branch',
  'Headquarters & Multi-Store',
  'Takoradi Market Circle Branch',
  'Tamale Central Store',
];

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({
  currentUser,
  onSwitchUser,
  branchName,
  isDark,
}) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State for Enrollment
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    role: 'CASHIER' as SystemUser['role'],
    branchName: branchName || 'Accra Central Mall Store',
    credentialType: 'PIN' as 'PIN' | 'PASSWORD',
    pin: generateRandomSixDigitPin(),
    password: '',
    phone: '',
    email: '',
    avatarColor: '#10B981',
  });
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check authorization: only SUPER_ADMIN, GENERAL_MANAGER, and BRANCH_MANAGER can assign/change branches
  const isAuthorized =
    currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'GENERAL_MANAGER';

  const canManageBranches =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'GENERAL_MANAGER' ||
    currentUser.role === 'BRANCH_MANAGER';

  // Edit Employee & Branch Assignment Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    role: 'CASHIER' as SystemUser['role'],
    branchName: 'Accra Central Mall Store',
    branchId: 'branch-accra-01',
    credentialType: 'PIN' as 'PIN' | 'PASSWORD',
    pin: '',
    password: '',
    phone: '',
    email: '',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
  });
  const [editFormError, setEditFormError] = useState<string>('');

  const handleOpenEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setEditFormData({
      fullName: user.fullName,
      role: user.role,
      branchName: user.branchName,
      branchId: user.branchId,
      credentialType: user.password && !user.pin ? 'PASSWORD' : 'PIN',
      pin: user.pin || '123456',
      password: user.password || '',
      phone: user.phone || '',
      email: user.email || '',
      status: user.status || 'ACTIVE',
    });
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!canManageBranches) {
      setEditFormError('Permission Denied: Only Managers and Super Admin can assign branches.');
      return;
    }

    // Role security restriction
    if (editFormData.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      setEditFormError('Permission Denied: General Managers cannot assign the Super Admin role.');
      return;
    }

    if (editingUser.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      setEditFormError('Permission Denied: Only Super Admin can modify a Super Administrator account.');
      return;
    }

    if (!editFormData.fullName.trim()) {
      setEditFormError('Full name is required.');
      return;
    }

    let effectivePin = editFormData.pin.trim();
    let effectivePassword = editFormData.password.trim();

    if (editFormData.credentialType === 'PIN') {
      const pinValidation = validateSixDigitPin(effectivePin);
      if (!pinValidation.isValid) {
        setEditFormError(pinValidation.error || 'Security PIN must be exactly 6 numeric digits.');
        return;
      }
    } else {
      const pwdValidation = validatePasswordRules(effectivePassword);
      if (!pwdValidation.isValid) {
        setEditFormError(`Password must satisfy complexity standards: ${pwdValidation.errors.join(', ')}`);
        return;
      }
      if (!effectivePin || effectivePin.length < 6) {
        effectivePin = generateRandomSixDigitPin();
      }
    }

    setIsSubmitting(true);
    try {
      await updateEmployee(
        editingUser.id,
        {
          fullName: editFormData.fullName.trim(),
          role: editFormData.role,
          branchId: editFormData.branchId,
          branchName: editFormData.branchName,
          pin: effectivePin,
          password: effectivePassword || undefined,
          phone: editFormData.phone.trim() || undefined,
          email: editFormData.email.trim() || undefined,
          status: editFormData.status,
        },
        currentUser
      );

      // Audit log branch assignment
      if (editingUser.branchName !== editFormData.branchName) {
        await db.auditLogs.add({
          id: `audit-branch-${Date.now()}`,
          action: 'STAFF_BRANCH_REASSIGNED',
          userId: currentUser.id,
          userName: currentUser.fullName,
          details: `Branch reassignment: ${editingUser.fullName} (@${editingUser.username}) reassigned from "${editingUser.branchName}" to "${editFormData.branchName}" by ${currentUser.fullName} (${currentUser.role}).`,
          timestamp: new Date().toISOString(),
        });
      }

      setIsEditModalOpen(false);
      setEditingUser(null);
      await loadUsersList();
      showToast(`Employee profile & credentials updated for ${editFormData.fullName}!`);
    } catch (err: any) {
      console.error('Update employee error', err);
      setEditFormError(err.message || 'Failed to update employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    loadUsersList();

    const handleUsersUpdated = () => {
      loadUsersList();
    };

    window.addEventListener('usersUpdated', handleUsersUpdated);
    return () => {
      window.removeEventListener('usersUpdated', handleUsersUpdated);
    };
  }, []);

  const loadUsersList = async () => {
    setIsLoading(true);
    try {
      const all = await getAllUsers();
      setUsers(all);
    } catch (e) {
      console.error('Failed loading users', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEnrollModal = () => {
    // Generate clean initial values
    setFormData({
      fullName: '',
      username: '',
      role: 'CASHIER',
      branchName: branchName || 'Accra Central Mall Store',
      credentialType: 'PIN',
      pin: generateRandomSixDigitPin(),
      password: '',
      phone: '',
      email: '',
      avatarColor: '#10B981',
    });
    setFormError('');
    setIsEnrollModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    // Auto-generate clean suggested username if user hasn't explicitly typed one
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suggestedUsername = cleanName
      ? `${cleanName}.${formData.role.toLowerCase().split('_')[0]}`
      : '';
    setFormData(prev => ({
      ...prev,
      fullName: name,
      username: prev.username && !prev.username.includes('.') ? prev.username : suggestedUsername,
    }));
  };

  const handleRoleChange = (newRole: SystemUser['role']) => {
    if (newRole === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      setFormError('Permission Denied: General Managers cannot assign the Super Admin role.');
      return;
    }

    let color = '#10B981';
    if (newRole === 'SUPER_ADMIN') color = '#F59E0B';
    else if (newRole === 'GENERAL_MANAGER') color = '#8B5CF6';
    else if (newRole === 'BRANCH_MANAGER') color = '#D97706';
    else if (newRole === 'INVENTORY_OFFICER') color = '#EC4899';
    else if (newRole === 'AUDITOR') color = '#78716C';

    const cleanName = formData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suggestedUsername = cleanName
      ? `${cleanName}.${newRole.toLowerCase().split('_')[0]}`
      : formData.username;

    setFormData(prev => ({
      ...prev,
      role: newRole,
      avatarColor: color,
      username: suggestedUsername || prev.username,
    }));
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isAuthorized) {
      setFormError('Access Denied: Only Super Admin and General Manager can enroll employee accounts.');
      return;
    }

    // Role security restriction: GM cannot assign SUPER_ADMIN
    if (formData.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      setFormError('Permission Denied: General Managers cannot assign the Super Admin role to anyone.');
      return;
    }

    if (!formData.fullName.trim()) {
      setFormError('Please enter the employee full name.');
      return;
    }

    if (!formData.username.trim()) {
      setFormError('Please provide a unique username for system login.');
      return;
    }

    // Check duplicate username
    const duplicate = users.find(
      u => u.username.toLowerCase() === formData.username.trim().toLowerCase()
    );
    if (duplicate) {
      setFormError(`Username '@${formData.username}' is already registered to ${duplicate.fullName}. Please choose another.`);
      return;
    }

    let effectivePin = formData.pin.trim();
    let effectivePassword = formData.password.trim();

    if (formData.credentialType === 'PIN') {
      const pinValidation = validateSixDigitPin(effectivePin);
      if (!pinValidation.isValid) {
        setFormError(pinValidation.error || 'Security PIN must be exactly 6 numeric digits (0-9).');
        return;
      }
      if (!effectivePassword) {
        effectivePassword = `User#${effectivePin}!`;
      }
    } else {
      const pwdValidation = validatePasswordRules(effectivePassword);
      if (!pwdValidation.isValid) {
        setFormError(`Password does not meet rules: ${pwdValidation.errors.join(', ')}`);
        return;
      }
      effectivePin = generateRandomSixDigitPin();
    }

    setIsSubmitting(true);
    try {
      const enrolled = await enrollEmployee(
        {
          fullName: formData.fullName.trim(),
          username: formData.username.trim().toLowerCase(),
          role: formData.role,
          branchId: `branch-${formData.branchName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          branchName: formData.branchName,
          pin: effectivePin,
          password: effectivePassword,
          avatarColor: formData.avatarColor,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          status: 'ACTIVE',
        },
        currentUser
      );

      setIsEnrollModalOpen(false);
      await loadUsersList();
      showToast(`Employee '${enrolled.fullName}' enrolled successfully with 6-digit PIN ${enrolled.pin}!`);
    } catch (err: any) {
      console.error('Enrollment error', err);
      setFormError(err.message || 'Failed to enroll employee. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: SystemUser) => {
    if (!isAuthorized) return;
    if (user.id === currentUser.id) {
      alert('You cannot suspend your own active operator account.');
      return;
    }

    const nextStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    await updateEmployee(user.id, { status: nextStatus }, currentUser);
    await loadUsersList();
    showToast(`Account for ${user.fullName} is now ${nextStatus}.`);
  };

  const handleDeleteUser = async (user: SystemUser) => {
    if (!isAuthorized) return;
    if (user.id === currentUser.id) {
      alert('You cannot delete your own active operator account.');
      return;
    }

    if (
      confirm(`Are you sure you want to permanently remove employee account '${user.fullName}' (@${user.username})? This action will be audited.`)
    ) {
      await deleteEmployee(user.id, currentUser);
      await loadUsersList();
      showToast(`Account for ${user.fullName} removed.`);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const togglePinReveal = (id: string) => {
    setRevealedPins(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered roster
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone && user.phone.includes(searchQuery)) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesBranch = branchFilter === 'ALL' || user.branchName === branchFilter;

    return matchesSearch && matchesRole && matchesBranch;
  });

  const getRoleBadge = (role: SystemUser['role']) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          label: 'Super Admin',
          color: isDark
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            : 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'GENERAL_MANAGER':
        return {
          label: 'General Manager',
          color: isDark
            ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
            : 'bg-purple-100 text-purple-800 border-purple-300',
        };
      case 'BRANCH_MANAGER':
        return {
          label: 'Branch Manager',
          color: isDark
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            : 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'CASHIER':
        return {
          label: 'Cashier / Till',
          color: isDark
            ? 'bg-stone-500/15 text-stone-300 border-stone-500/30'
            : 'bg-slate-100 text-slate-800 border-slate-300',
        };
      case 'INVENTORY_OFFICER':
        return {
          label: 'Inventory Officer',
          color: isDark
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            : 'bg-rose-100 text-rose-800 border-rose-300',
        };
      case 'AUDITOR':
        return {
          label: 'Tax Auditor',
          color: isDark
            ? 'bg-stone-500/15 text-stone-300 border-stone-500/30'
            : 'bg-slate-100 text-slate-800 border-slate-300',
        };
      default:
        return {
          label: role,
          color: isDark
            ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
            : 'bg-slate-100 text-slate-700 border-slate-300',
        };
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden transition-colors ${
      isDark ? 'bg-[#090B0E] text-[#F4F6F8]' : 'bg-[#EBEEF2] text-[#0F172A]'
    }`}>
      {/* Toast Notification */}
      {successToast && (
        <div className="absolute top-16 right-6 z-50 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-xl ring-1 ring-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className={`p-4 border-b shrink-0 flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'border-[#242D37] bg-[#11151A]' : 'border-slate-300 bg-white/95 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl border ${
            isDark ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
          }`}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Staff Directory & Identity Management
              </h1>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isAuthorized
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              }`}>
                {currentUser.role === 'SUPER_ADMIN'
                  ? 'SUPER ADMIN PRIVILEGES'
                  : currentUser.role === 'GENERAL_MANAGER'
                  ? 'GENERAL MANAGER PRIVILEGES'
                  : 'READ ONLY'}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-[#8A99A8]' : 'text-slate-600 font-medium'}`}>
              Manage multi-branch retail staff, operators, and POS cashier credentials with Bank of Ghana audit trails.
            </p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsersList}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isDark ? 'border-[#242D37] text-slate-300 hover:bg-[#1A2027]' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
            }`}
            title="Refresh staff roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {isAuthorized ? (
            <button
              onClick={handleOpenEnrollModal}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll New Employee</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Enrollment Restricted</span>
            </div>
          )}
        </div>
      </header>

      {/* KPI Stats Ribbon */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-4 border-b shrink-0 ${
        isDark ? 'bg-[#090B0E]/80 border-[#242D37]' : 'bg-slate-100/90 border-slate-300'
      }`}>
        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className={`text-[10px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-500'} font-bold uppercase tracking-wider`}>Total Staff</div>
          <div className={`text-lg font-black font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{users.length}</div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className={`text-[10px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-500'} font-bold uppercase tracking-wider`}>Active Staff</div>
          <div className="text-lg font-black font-mono mt-0.5 text-emerald-500">
            {users.filter(u => (u.status || 'ACTIVE') === 'ACTIVE').length}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className={`text-[10px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-500'} font-bold uppercase tracking-wider`}>Cashiers</div>
          <div className="text-lg font-black font-mono mt-0.5 text-teal-600 dark:text-teal-400">
            {users.filter(u => u.role === 'CASHIER').length}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className={`text-[10px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-500'} font-bold uppercase tracking-wider`}>General Mgrs</div>
          <div className="text-lg font-black font-mono mt-0.5 text-purple-600 dark:text-purple-400">
            {users.filter(u => u.role === 'GENERAL_MANAGER').length}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className={`text-[10px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-500'} font-bold uppercase tracking-wider`}>Super Admins</div>
          <div className="text-lg font-black font-mono mt-0.5 text-amber-600 dark:text-amber-400">
            {users.filter(u => u.role === 'SUPER_ADMIN').length}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className={`text-[10px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-500'} font-bold uppercase tracking-wider`}>Branch Managers</div>
          <div className="text-lg font-black font-mono mt-0.5 text-amber-600 dark:text-amber-500">
            {users.filter(u => u.role === 'BRANCH_MANAGER').length}
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className={`p-3 sm:p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'
      }`}>
        <div className="flex-1 min-w-[240px] max-w-md relative">
          <Search className="w-4 h-4 text-[#8A99A8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, @username, phone..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition ${
              isDark
                ? 'bg-[#090B0E] border-[#242D37] text-white placeholder-slate-500 focus:border-purple-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role & Branch Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold outline-none transition ${
              isDark ? 'bg-[#090B0E] border-[#242D37] text-[#F4F6F8]' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-purple-600'
            }`}
          >
            <option value="ALL">All Roles</option>
            <option value="GENERAL_MANAGER">General Manager</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="BRANCH_MANAGER">Branch Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="INVENTORY_OFFICER">Inventory Officer</option>
            <option value="AUDITOR">Auditor</option>
          </select>

          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold outline-none transition ${
              isDark ? 'bg-[#090B0E] border-[#242D37] text-[#F4F6F8]' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-purple-600'
            }`}
          >
            <option value="ALL">All Branches</option>
            {PRESET_BRANCHES.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {(roleFilter !== 'ALL' || branchFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setRoleFilter('ALL');
                setBranchFilter('ALL');
                setSearchQuery('');
              }}
              className={`p-2 rounded-xl border text-xs font-semibold transition ${
                isDark ? 'border-[#242D37] text-slate-400 hover:text-white hover:bg-[#1A2027]' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Staff Roster List / Table */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {filteredUsers.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'
          }`}>
            <Users className="w-12 h-12 text-[#8A99A8] mx-auto mb-3 opacity-40" />
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              No Staff Accounts Found
            </h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-[#8A99A8]' : 'text-slate-600'}`}>
              No employee accounts match the current filter or search criteria.
            </p>
            {isAuthorized && (
              <button
                onClick={handleOpenEnrollModal}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Enroll New Employee</span>
              </button>
            )}
          </div>
        ) : (
          <div className={`rounded-3xl border overflow-hidden ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-white border-slate-300 shadow-xs'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-[#242D37] bg-[#090B0E]/50 text-[#8A99A8]' : 'border-slate-300 bg-slate-100 text-slate-700'
                  }`}>
                    <th className="py-3.5 px-4">Operator / Employee</th>
                    <th className="py-3.5 px-4">Role & Permissions</th>
                    <th className="py-3.5 px-4">Branch Assignment</th>
                    <th className="py-3.5 px-4">Staff PIN</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#242D37]/40' : 'divide-slate-200'}`}>
                  {filteredUsers.map(user => {
                    const badge = getRoleBadge(user.role);
                    const isSelf = user.id === currentUser.id;
                    const isPinRevealed = revealedPins[user.id] || false;
                    const isActive = (user.status || 'ACTIVE') === 'ACTIVE';

                    return (
                      <tr
                        key={user.id}
                        className={`transition ${
                          isDark
                            ? 'hover:bg-[#1A2027]/70'
                            : 'hover:bg-slate-50'
                        } ${isSelf ? (isDark ? 'bg-purple-950/20' : 'bg-purple-50/70') : ''}`}
                      >
                        {/* Avatar & Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-slate-950 font-mono shadow-xs shrink-0"
                              style={{ backgroundColor: user.avatarColor || '#10B981' }}
                            >
                              {user.fullName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className={isDark ? 'text-white' : 'text-slate-900'}>
                                  {user.fullName}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-mono font-bold">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className={`text-[11px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-600'} font-mono flex items-center gap-2 mt-0.5`}>
                                <span>@{user.username}</span>
                                {user.phone && (
                                  <>
                                    <span>•</span>
                                    <span>{user.phone}</span>
                                  </>
                                )}
                              </div>
                              {user.enrolledBy && (
                                <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'} mt-0.5`}>
                                  Enrolled by: {user.enrolledBy}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border font-mono ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className={`text-[10px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-500'}`}>
                              ID: {user.id}
                            </span>
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Store className={`w-3.5 h-3.5 ${isDark ? 'text-[#8A99A8]' : 'text-slate-500'} shrink-0`} />
                            <span className={isDark ? 'text-slate-300' : 'text-slate-800 font-medium'}>
                              {user.branchName}
                            </span>
                          </div>
                        </td>

                        {/* Security PIN */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs px-2 py-1 rounded-lg border font-bold ${
                              isDark ? 'bg-[#090B0E] border-[#242D37] text-purple-400' : 'bg-slate-100 border-slate-300 text-purple-700'
                            }`}>
                              {isPinRevealed ? user.pin || '000000' : '••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePinReveal(user.id)}
                              className={`p-1 rounded-lg border transition ${
                                isDark ? 'border-[#242D37] text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-black hover:bg-slate-100'
                              }`}
                              title={isPinRevealed ? 'Hide PIN' : 'Reveal PIN'}
                            >
                              {isPinRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            disabled={!isAuthorized || isSelf || (user.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN')}
                            onClick={() => handleToggleStatus(user)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 transition ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            } ${isAuthorized && !isSelf && (user.role !== 'SUPER_ADMIN' || currentUser.role === 'SUPER_ADMIN') ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-60'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span>{isActive ? 'Active' : 'Suspended'}</span>
                          </button>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit & Assign Branch */}
                            {canManageBranches && (user.role !== 'SUPER_ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(user)}
                                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition active:scale-95 ${
                                  isDark
                                    ? 'border-[#242D37] bg-[#1A2027] text-amber-400 hover:border-amber-500'
                                    : 'border-slate-300 bg-slate-50 text-amber-800 hover:border-amber-500 hover:bg-amber-50 shadow-2xs'
                                }`}
                                title="Edit employee details and assign branch"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit & Branch</span>
                              </button>
                            )}

                            {/* Quick Switch */}
                            {!isSelf && isActive && (
                              <button
                                type="button"
                                onClick={() => onSwitchUser(user)}
                                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition active:scale-95 ${
                                  isDark
                                    ? 'border-[#242D37] bg-[#1A2027] text-purple-400 hover:border-purple-500'
                                    : 'border-slate-300 bg-slate-50 text-purple-700 hover:border-purple-500 hover:bg-purple-50 shadow-2xs'
                                }`}
                                title={`Sign in as ${user.fullName}`}
                              >
                                <span>Switch User</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            {/* Delete Account */}
                            {isAuthorized && !isSelf && (user.role !== 'SUPER_ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                className={`p-1.5 rounded-xl border transition text-rose-500 hover:bg-rose-500/10 ${
                                  isDark ? 'border-[#242D37]' : 'border-slate-300 hover:bg-rose-50'
                                }`}
                                title="Remove staff account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ENROLL NEW EMPLOYEE MODAL */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-[#EBEEF2] border-slate-300'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-[#242D37] bg-[#090B0E]/60' : 'border-slate-300 bg-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Enroll New Employee Account
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-600 font-medium'}`}>
                    Authorized by <span className="font-semibold text-purple-600 dark:text-purple-400">{currentUser.fullName}</span> ({currentUser.role})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className={`p-1.5 rounded-xl border border-transparent transition ${
                  isDark ? 'text-[#8A99A8] hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEnrollSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold ${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} uppercase tracking-wider mb-1.5`}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="e.g. Efua Mensah"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none font-medium transition ${
                      isDark
                        ? 'bg-[#090B0E] border-[#242D37] text-white focus:border-purple-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold ${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} uppercase tracking-wider mb-1.5`}>
                    System Username *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">@</span>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={e => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                      placeholder="efua.cashier"
                      className={`w-full pl-7 pr-3.5 py-2.5 rounded-xl text-xs border outline-none font-mono font-medium transition ${
                        isDark
                          ? 'bg-[#090B0E] border-[#242D37] text-white focus:border-purple-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className={`block text-[11px] font-bold ${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} uppercase tracking-wider mb-1.5`}>
                  Assigned Employee Role *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'CASHIER', label: 'Cashier / Till', desc: 'POS checkout & till sales' },
                    { id: 'BRANCH_MANAGER', label: 'Branch Manager', desc: 'Store oversight & overrides' },
                    { id: 'GENERAL_MANAGER', label: 'General Manager', desc: 'Enterprise operations & staff enrollment' },
                    { id: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Multi-store owner & full controls' },
                    { id: 'INVENTORY_OFFICER', label: 'Inventory Officer', desc: 'Goods receipt & POs' },
                    { id: 'AUDITOR', label: 'Tax Auditor', desc: 'Read-only GRA fiscal logs' },
                  ]
                    .filter(r => r.id !== 'SUPER_ADMIN' || currentUser.role === 'SUPER_ADMIN')
                    .map(r => {
                      const isSelected = formData.role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRoleChange(r.id as any)}
                          className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500/15 shadow-xs ring-1 ring-purple-500/40'
                              : isDark
                              ? 'border-[#242D37] bg-[#090B0E] hover:border-slate-600'
                              : 'border-slate-300 bg-white hover:border-purple-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${
                              isSelected ? (isDark ? 'text-purple-400' : 'text-purple-700') : isDark ? 'text-white' : 'text-slate-900'
                            }`}>
                              {r.label}
                            </span>
                            {isSelected && <BadgeCheck className="w-3.5 h-3.5 text-purple-500" />}
                          </div>
                          <span className={`text-[10px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-500'} mt-1 leading-tight`}>
                            {r.desc}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Branch Assignment */}
              <div>
                <label className={`block text-[11px] font-bold ${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} uppercase tracking-wider mb-1.5`}>
                  Branch Assignment *
                </label>
                <select
                  value={formData.branchName}
                  onChange={e => setFormData(prev => ({ ...prev, branchName: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none font-medium transition ${
                    isDark
                      ? 'bg-[#090B0E] border-[#242D37] text-white focus:border-purple-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                  }`}
                >
                  {PRESET_BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Security Credentials: 6-Digit PIN or Complex Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`block text-[11px] font-bold ${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} uppercase tracking-wider`}>
                    Security Credentials *
                  </label>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, credentialType: 'PIN' }))}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        formData.credentialType === 'PIN'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                      }`}
                    >
                      6-Digit PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, credentialType: 'PASSWORD' }))}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        formData.credentialType === 'PASSWORD'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                      }`}
                    >
                      Password Rules
                    </button>
                  </div>
                </div>

                {formData.credentialType === 'PIN' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Strict 6-digit numeric terminal keypad code
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, pin: generateRandomSixDigitPin() }))}
                        className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Generate 6-Digit PIN</span>
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={formData.pin}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                          setFormData(prev => ({ ...prev, pin: val }));
                        }}
                        placeholder="123456"
                        className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs border outline-none font-mono font-bold tracking-widest text-center transition ${
                          isDark
                            ? 'bg-[#090B0E] border-[#242D37] text-purple-400 focus:border-purple-500'
                            : 'bg-white border-slate-300 text-purple-700 focus:border-purple-600'
                        }`}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.password}
                        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="e.g. Staff#Akwaaba2026!"
                        className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs border outline-none font-medium transition ${
                          isDark
                            ? 'bg-[#090B0E] border-[#242D37] text-white focus:border-purple-500'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                        }`}
                      />
                    </div>
                    {/* Password rule status chips */}
                    {(() => {
                      const rules = validatePasswordRules(formData.password);
                      return (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {[
                            { label: '8+ Chars', met: rules.hasMinLength },
                            { label: 'Uppercase', met: rules.hasUpper },
                            { label: 'Lowercase', met: rules.hasLower },
                            { label: 'Number', met: rules.hasNumber },
                            { label: 'Symbol', met: rules.hasSpecial },
                          ].map(rule => (
                            <span
                              key={rule.label}
                              className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                                rule.met
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : isDark
                                  ? 'bg-black/30 text-slate-500 border-white/5'
                                  : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${rule.met ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {rule.label}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Optional Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold ${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} uppercase tracking-wider mb-1.5`}>
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="0244123456"
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs border outline-none font-medium transition ${
                        isDark
                          ? 'bg-[#090B0E] border-[#242D37] text-white focus:border-purple-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold ${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} uppercase tracking-wider mb-1.5`}>
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="staff@akwaabaretail.gh"
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs border outline-none font-medium transition ${
                        isDark
                          ? 'bg-[#090B0E] border-[#242D37] text-white focus:border-purple-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Avatar Color Picker */}
              <div>
                <label className={`block text-[11px] font-bold ${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} uppercase tracking-wider mb-1.5`}>
                  Staff Avatar Color Badge
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, avatarColor: color }))}
                      className={`w-7 h-7 rounded-xl transition flex items-center justify-center ${
                        formData.avatarColor === color ? 'ring-2 ring-white scale-110 shadow-sm' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {formData.avatarColor === color && (
                        <CheckCircle2 className="w-4 h-4 text-slate-950 font-bold" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Non-Repudiation Audit Notice */}
              <div className={`p-3 rounded-2xl text-[11px] border ${
                isDark ? 'bg-[#090B0E] border-[#242D37] text-[#8A99A8]' : 'bg-white border-slate-300 text-slate-700 shadow-2xs'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Non-Repudiation Digital Attestation</span>
                </div>
                <span>
                  This account creation will be cryptographically signed by <strong className={isDark ? 'text-white' : 'text-slate-900'}>{currentUser.fullName}</strong> ({currentUser.role}). All shift activities under this account will be permanently audited for compliance with Bank of Ghana & GRA guidelines.
                </span>
              </div>
            </form>

            {/* Modal Footer */}
            <div className={`p-4 border-t shrink-0 flex items-center justify-between ${
              isDark ? 'border-[#242D37] bg-[#090B0E]/60' : 'border-slate-300 bg-white'
            }`}>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                  isDark ? 'border-[#242D37] text-slate-400 hover:text-white' : 'border-slate-300 bg-slate-50 text-slate-700 hover:text-black'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleEnrollSubmit}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Enrolling Account...' : 'Enroll & Issue Credentials'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EDIT EMPLOYEE & BRANCH ASSIGNMENT MODAL */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
            isDark ? 'bg-[#11151A] border-[#242D37]' : 'bg-[#EBEEF2] border-slate-300'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-[#242D37] bg-[#090B0E]/60' : 'border-slate-300 bg-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Edit Employee & Branch Assignment
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-600'} font-mono`}>
                    Editing profile for @{editingUser.username} ({editingUser.fullName})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditModalOpen(false)}
                className={`p-1 rounded-lg transition ${isDark ? 'text-[#8A99A8] hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {editFormError && (
                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              <div>
                <label className={`${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} block mb-1 font-semibold`}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={e => setEditFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Branch Assignment Section */}
              <div className={`p-4 rounded-2xl border space-y-2 ${
                isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/80 border-amber-300'
              }`}>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-bold">
                  <Store className="w-4 h-4" />
                  <span>Workstation Branch Allocation</span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-600'}`}>
                  Only operators allocated to a branch can log into PCs bound to that branch. Super Admin and General Manager retain roving executive privileges.
                </p>

                <select
                  value={editFormData.branchId}
                  onChange={e => {
                    const selId = e.target.value;
                    if (selId === 'branch-all') {
                      setEditFormData(prev => ({
                        ...prev,
                        branchId: 'branch-all',
                        branchName: 'Headquarters & Multi-Store',
                      }));
                    } else {
                      const branch = ENTERPRISE_BRANCHES.find(b => b.id === selId);
                      if (branch) {
                        setEditFormData(prev => ({
                          ...prev,
                          branchId: branch.id,
                          branchName: branch.name,
                        }));
                      }
                    }
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none focus:border-amber-500 ${
                    isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {ENTERPRISE_BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.region}) [{b.code}]
                    </option>
                  ))}
                  <option value="branch-all">Headquarters & Multi-Store (All Branches)</option>
                </select>
              </div>

              {/* Role Selection (Managers or Super Admin) */}
              {isAuthorized && (
                <div>
                  <label className={`${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} block mb-1 font-semibold`}>Staff Role & Permissions</label>
                  <select
                    value={editFormData.role}
                    onChange={e => setEditFormData(prev => ({ ...prev, role: e.target.value as any }))}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none focus:border-amber-500 ${
                      isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="CASHIER">Cashier / POS Operator</option>
                    <option value="BRANCH_MANAGER">Branch Manager</option>
                    <option value="GENERAL_MANAGER">General Manager</option>
                    {currentUser.role === 'SUPER_ADMIN' && (
                      <option value="SUPER_ADMIN">Super Administrator</option>
                    )}
                    <option value="INVENTORY_OFFICER">Inventory Officer</option>
                    <option value="AUDITOR">Tax Auditor</option>
                  </select>
                </div>
              )}

              {/* Security Credentials: 6-Digit PIN or Complex Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} block mb-1 font-semibold`}>
                    Security Credentials *
                  </label>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setEditFormData(prev => ({ ...prev, credentialType: 'PIN' }))}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        editFormData.credentialType === 'PIN'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                      }`}
                    >
                      6-Digit PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditFormData(prev => ({ ...prev, credentialType: 'PASSWORD' }))}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        editFormData.credentialType === 'PASSWORD'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                      }`}
                    >
                      Password
                    </button>
                  </div>
                </div>

                {editFormData.credentialType === 'PIN' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Strict 6-digit numeric terminal code
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditFormData(prev => ({ ...prev, pin: generateRandomSixDigitPin() }))}
                        className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Reset to Random 6-Digit PIN</span>
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A99A8]" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={editFormData.pin}
                        onChange={e => setEditFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-widest text-center outline-none focus:border-amber-500 ${
                          isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A99A8]" />
                      <input
                        type="text"
                        required
                        value={editFormData.password}
                        onChange={e => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="e.g. Manager#Akwaaba2026!"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none focus:border-amber-500 ${
                          isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    {/* Password rule status chips */}
                    {(() => {
                      const rules = validatePasswordRules(editFormData.password);
                      return (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {[
                            { label: '8+ Chars', met: rules.hasMinLength },
                            { label: 'Uppercase', met: rules.hasUpper },
                            { label: 'Lowercase', met: rules.hasLower },
                            { label: 'Number', met: rules.hasNumber },
                            { label: 'Symbol', met: rules.hasSpecial },
                          ].map(rule => (
                            <span
                              key={rule.label}
                              className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                                rule.met
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : isDark
                                  ? 'bg-black/30 text-slate-500 border-white/5'
                                  : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${rule.met ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {rule.label}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} block mb-1 font-semibold`}>Phone Number</label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={e => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 0244123456"
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none focus:border-amber-500 ${
                      isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`${isDark ? 'text-[#8A99A8]' : 'text-slate-700'} block mb-1 font-semibold`}>Status</label>
                  <select
                    value={editFormData.status}
                    onChange={e => setEditFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none focus:border-amber-500 ${
                      isDark ? 'bg-[#090B0E] border-[#242D37] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="ACTIVE">ACTIVE (Authorized)</option>
                    <option value="SUSPENDED">SUSPENDED (Locked Out)</option>
                  </select>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className={`p-4 border-t shrink-0 flex items-center justify-between ${
              isDark ? 'border-[#242D37] bg-[#090B0E]/60' : 'border-slate-300 bg-white'
            }`}>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                  isDark ? 'border-[#242D37] text-slate-400 hover:text-white' : 'border-slate-300 bg-slate-50 text-slate-700 hover:text-black'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleEditSubmit}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving Changes...' : 'Save & Assign Branch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
