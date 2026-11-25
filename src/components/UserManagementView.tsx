import React, { useState, useEffect, useMemo } from 'react';
import {
  UserRole,
  UserIdentity,
  AuditLogEntry,
  SYSTEM_ROLES,
  PERMISSION_LABELS,
  HR_PERMISSION_KEYS,
} from '../types';
import { DEPARTMENTS, getRoleDisplayTitle } from '../utils/departments';
import {
  fetchAdminUsers,
  toggleAdminUserStatus,
  fetchAdminAuditLogs,
  deleteAdminUser,
} from '../services/apiService';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit,
  Power,
  RefreshCw,
  History,
  ArrowRight,
  Clock,
  Lock,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface UserManagementViewProps {
  onBackToApplications: () => void;
  activeRole: UserRole;
  isSuperAdmin: boolean;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  onBackToApplications,
  activeRole,
  isSuperAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit_logs'>('users');
  const [users, setUsers] = useState<UserIdentity[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Audit Logs Filter
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserIdentity | null>(null);
  const [resettingUser, setResettingUser] = useState<UserIdentity | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserIdentity | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Handle Confirmed Delete User
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const isSuper =
      (userToDelete.email && userToDelete.email.toLowerCase() === 'ma1927393@gmail.com') ||
      Boolean(userToDelete.isSuperAdmin) ||
      userToDelete.id === 'usr-super-admin-01';

    if (isSuper) {
      showToast('غير مصرح: حساب مدير النظام الأعلى (Super Admin) محمي تماماً ولا يمكن حذفه', 'error');
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      await deleteAdminUser(userToDelete.id, activeRole);
      await loadUsers();
      showToast(`تم حذف حساب المستخدم (${userToDelete.fullName}) بنجاح من قاعدة البيانات`, 'success');
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      showToast(err?.message || 'تعذر حذف المستخدم من قاعدة البيانات', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Load Users from API
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await fetchAdminUsers(activeRole);
      const normalized = (data || []).map((u) => {
        const isSuper =
          (u.email && u.email.trim().toLowerCase() === 'ma1927393@gmail.com') ||
          Boolean(u.isSuperAdmin);
        return {
          ...u,
          fullName: u.fullName || u.displayName || u.email || 'مستخدم النظام',
          email: u.email || '',
          role: u.role || (isSuper ? 'admin' : 'hr'),
          department: u.department || (isSuper ? 'الإدارة العامة' : 'إدارة الموارد البشرية'),
          status: u.status || 'active',
          permissions: u.permissions,
          isSuperAdmin: isSuper,
        };
      });
      setUsers(normalized);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      showToast(err?.message || 'تعذر تحميل بيانات المستخدمين', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Load Audit Logs from API
  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await fetchAdminAuditLogs(activeRole);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      showToast(err?.message || 'تعذر تحميل سجل العمليات', 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [activeRole]);

  useEffect(() => {
    if (activeTab === 'audit_logs') {
      loadAuditLogs();
    }
  }, [activeTab]);

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (user: UserIdentity) => {
    const isSuper =
      (user.email && user.email.toLowerCase() === 'ma1927393@gmail.com') || Boolean(user.isSuperAdmin);
    if (isSuper) {
      showToast('لا يمكن تعطيل حساب مدير النظام الأعلى (Super Admin)', 'error');
      return;
    }

    try {
      const res = await toggleAdminUserStatus(user.id, activeRole);
      await loadUsers();
      showToast(
        `تم ${res.status === 'active' ? 'تفعيل' : 'تعطيل'} حساب (${user.fullName}) بنجاح وحفظه في قاعدة البيانات`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'تعذر تغيير حالة الحساب', 'error');
    }
  };

  // Statistics Computations
  const stats = useMemo(() => {
    const total = users.length;
    const activeCount = users.filter((u) => u.status === 'active').length;
    const inactiveCount = users.filter((u) => u.status === 'inactive' || u.status === 'suspended').length;
    const uniqueDepts = new Set(users.map((u) => u.department || 'الإدارة العامة')).size;

    return { total, activeCount, inactiveCount, uniqueDepts };
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (u.fullName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phoneNumber && u.phoneNumber.includes(q)) ||
          (u.role && String(u.role).toLowerCase().includes(q)) ||
          (u.department && String(u.department).toLowerCase().includes(q)) ||
          (u.identityNumber && String(u.identityNumber).toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Department filter
      if (departmentFilter !== 'all' && u.department !== departmentFilter) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const isUserActive = u.status === 'active';
        if (statusFilter === 'active' && !isUserActive) return false;
        if (statusFilter === 'inactive' && isUserActive) return false;
      }

      return true;
    });
  }, [users, searchQuery, departmentFilter, roleFilter, statusFilter]);

  // Filtered Audit Logs List
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditActionFilter !== 'all' && log.action !== auditActionFilter) {
        return false;
      }
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase().trim();
        const matches =
          (log.details && log.details.toLowerCase().includes(q)) ||
          (log.userName && log.userName.toLowerCase().includes(q)) ||
          (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
          (log.targetName && log.targetName.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [auditLogs, auditActionFilter, auditSearchQuery]);

  const formatDateDisplay = (isoString?: string) => {
    if (!isoString) return 'لم يسجل دخول بعد';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold border flex items-center gap-2 animate-in slide-in-from-top-3 ${
            feedbackToast.type === 'success'
              ? 'bg-[#111318] text-white border-[#DC2626]'
              : 'bg-[#991B1B] text-white border-red-400/50'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#DC2626]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-200" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Top Breadcrumb & Return Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-zinc-200 shadow-soft">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToApplications}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 min-h-[40px] bg-zinc-100 hover:bg-zinc-200 text-[#111318] font-bold text-xs rounded-xl transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-2xs shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للطلبات</span>
          </button>
          <div className="h-6 w-px bg-zinc-200 hidden sm:block shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black text-[#111318] flex items-center gap-2 leading-tight">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#DC2626] shrink-0" />
              <span className="truncate">إدارة المستخدمين والصلاحيات</span>
            </h1>
            <p className="text-[11px] text-zinc-500 font-medium line-clamp-1">
              التحكم بهويات المستخدمين، إدارات الشركة، الصلاحيات المشددة، وسجلات التدقيق والأمان
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Users vs Audit Logs) */}
        <div className="w-full lg:w-auto grid grid-cols-2 sm:flex items-center gap-1.5 bg-zinc-100 p-1 rounded-2xl border border-zinc-200 text-[11px] sm:text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-[#DC2626] text-white shadow-sm shadow-red-600/20'
                : 'text-zinc-600 hover:text-[#111318] hover:bg-zinc-200/70'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="tabular-nums">المستخدمون ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit_logs')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit_logs'
                ? 'bg-[#DC2626] text-white shadow-sm shadow-red-600/20'
                : 'text-zinc-600 hover:text-[#111318] hover:bg-zinc-200/70'
            }`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>سجل العمليات</span>
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <div key="users-tab" className="space-y-4 animate-view-enter">
          {/* Statistics Cards Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Users */}
            <div className="bg-[#111318] text-white p-4 rounded-3xl border border-zinc-800 shadow-soft hover:shadow-soft-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-300">إجمالي المستخدمين</span>
                <div className="w-8 h-8 rounded-xl bg-[#DC2626] flex items-center justify-center text-white">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono tracking-tight tabular-nums">
                {stats.total}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">جميع الحسابات المسجلة بقاعدة البيانات</p>
            </div>

            {/* 2. Active Accounts */}
            <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-soft hover:shadow-soft-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-800">الحسابات النشطة</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight tabular-nums flex items-center gap-2">
                <span>{stats.activeCount}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-emerald-700/80 mt-1">حسابات مفعلة ومصرح لها بالدخول</p>
            </div>

            {/* 3. Inactive / Suspended */}
            <div className="bg-white p-4 rounded-3xl border border-red-200 shadow-soft hover:shadow-soft-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#991B1B]">الحسابات المعطلة</span>
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-[#DC2626]">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#DC2626] font-mono tracking-tight tabular-nums">
                {stats.inactiveCount}
              </div>
              <p className="text-[10px] text-red-700/80 mt-1">ممنوعة من تسجيل الدخول أو اتخاذ قرارات</p>
            </div>

            {/* 4. Departments Covered */}
            <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-soft hover:shadow-soft-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-600">الإدارات المعتمدة</span>
                <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-[#111318]">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#111318] font-mono tracking-tight tabular-nums">
                {stats.uniqueDepts} <span className="text-xs font-bold text-zinc-500">إدارات</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">توزيع شامل على قطاعات ومطاعم الشركة</p>
            </div>
          </div>

          {/* Search, Filter & Add User Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-zinc-200 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs">
            {/* Search Input */}
            <div className="relative w-full lg:flex-1 lg:min-w-[200px]">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، البريد الإلكتروني، الهاتف، الدور..."
                className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Filter by Department */}
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="w-4 h-4 text-zinc-400 hidden sm:inline shrink-0" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full sm:w-auto min-w-0 truncate py-2.5 px-2.5 sm:px-3 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs font-bold text-zinc-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] cursor-pointer"
                >
                  <option value="all">كافة الإدارات</option>
                  <option value="الإدارة العامة">الإدارة العامة</option>
                  <option value="إدارة الموارد البشرية">إدارة الموارد البشرية</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Role */}
              <div className="flex items-center gap-1.5 min-w-0">
                <Shield className="w-4 h-4 text-zinc-400 hidden sm:inline shrink-0" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full sm:w-auto min-w-0 truncate py-2.5 px-2.5 sm:px-3 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs font-bold text-zinc-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] cursor-pointer"
                >
                  <option value="all">كافة الأدوار</option>
                  {SYSTEM_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.titleArabic}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Status */}
              <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="flex-1 sm:flex-initial py-2.5 px-3 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs font-bold text-zinc-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] cursor-pointer"
                >
                  <option value="all">كافة الحالات</option>
                  <option value="active">مفعل فقط (Active)</option>
                  <option value="inactive">معطل فقط (Inactive)</option>
                </select>

                <button
                  type="button"
                  onClick={loadUsers}
                  title="تحديث البيانات"
                  className="sm:hidden p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-2xl transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin text-[#DC2626]' : ''}`} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadUsers}
                  title="تحديث البيانات"
                  className="hidden sm:flex p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-2xl transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin text-[#DC2626]' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 min-h-[40px] bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-2xl font-bold text-xs shadow-sm shadow-red-600/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>إضافة مستخدم جديد</span>
                </button>
              </div>
            </div>
          </div>

          {/* Users Table / List */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-soft overflow-hidden">
            {isLoadingUsers ? (
              <div className="divide-y divide-zinc-100" aria-busy="true" aria-label="جاري تحميل المستخدمين">
                <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#DC2626]" />
                    <span>جاري تحميل بيانات المستخدمين والصلاحيات...</span>
                  </span>
                </div>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-2xl skeleton-shimmer shrink-0" />
                      <div className="space-y-1.5 flex-1 max-w-[200px]">
                        <div className="h-3.5 w-32 rounded-lg skeleton-shimmer" />
                        <div className="h-2.5 w-44 rounded-lg skeleton-shimmer" />
                      </div>
                    </div>
                    <div className="hidden sm:block h-3 w-24 rounded-lg skeleton-shimmer" />
                    <div className="hidden md:block h-6 w-28 rounded-xl skeleton-shimmer" />
                    <div className="h-6 w-24 rounded-xl skeleton-shimmer" />
                    <div className="hidden lg:block h-6 w-20 rounded-full skeleton-shimmer" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-xl skeleton-shimmer" />
                      <div className="w-7 h-7 rounded-xl skeleton-shimmer" />
                      <div className="w-7 h-7 rounded-xl skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <h3 className="text-sm font-black text-slate-800">لا توجد حسابات مطابقة للبحث</h3>
                <p className="text-xs text-slate-400">جرب تعديل معايير البحث أو التصفية.</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-zinc-100">
                  {filteredUsers.map((u) => {
                    const isActive = u.status === 'active';
                    const isSuper =
                      (u.email && u.email.toLowerCase() === 'ma1927393@gmail.com') ||
                      Boolean(u.isSuperAdmin);
                    const safeRole = u.role || (isSuper ? 'admin' : 'hr');

                    return (
                      <div key={u.id} className="p-4 space-y-3 hover:bg-red-50/35 transition-colors">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-2xl bg-[#111318] text-white border border-zinc-800 font-bold flex items-center justify-center text-sm shrink-0 shadow-2xs">
                              {u.fullName ? u.fullName.charAt(0) : 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm text-[#111318] flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{u.fullName || 'مستخدم'}</span>
                                {isSuper && (
                                  <span className="text-[10px] bg-red-50 text-[#B91C1C] border border-red-200 px-1.5 py-0.5 rounded-full font-black shrink-0">
                                    Super Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 font-mono truncate" dir="ltr">
                                {u.email}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSuper}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shrink-0 ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : 'bg-zinc-100 text-zinc-600 border border-zinc-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-600' : 'bg-zinc-400'
                              }`}
                            />
                            <span>{isActive ? 'نشط' : 'معطل'}</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 font-bold">
                            <Building2 className="w-3 h-3 text-zinc-500" />
                            <span>{u.department || 'الإدارة العامة'}</span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-black border ${
                              safeRole === 'admin'
                                ? 'bg-[#DC2626] text-white border-[#DC2626]'
                                : safeRole === 'general_manager'
                                ? 'bg-[#111318] text-white border-[#111318]'
                                : safeRole === 'hr_manager'
                                ? 'bg-red-50 text-[#B91C1C] border-red-200'
                                : safeRole && String(safeRole).startsWith('dept_')
                                ? 'bg-zinc-100 text-[#111318] border-zinc-300'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{getRoleDisplayTitle(safeRole)}</span>
                          </span>
                          {u.permissions && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50/70 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>
                                {isSuper
                                  ? `مدير نظام أعلى (${Object.values(u.permissions).filter(Boolean).length}/${Object.keys(PERMISSION_LABELS).length})`
                                  : `${Object.values(u.permissions).filter(Boolean).length}/${Object.keys(PERMISSION_LABELS).length} صلاحيات`}
                              </span>
                            </span>
                          )}
                          {HR_PERMISSION_KEYS.some((k) => Boolean(u.permissions?.[k])) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 text-[#B91C1C] border border-red-200 text-[10px] font-black">
                              <span>
                                HR ({HR_PERMISSION_KEYS.filter((k) => Boolean(u.permissions?.[k])).length}/{HR_PERMISSION_KEYS.length})
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                          <div className="min-w-0 truncate">
                            {u.phoneNumber ? (
                              <span className="font-mono" dir="ltr">{u.phoneNumber}</span>
                            ) : (
                              <span>آخر دخول: {formatDateDisplay(u.lastLoginAt)}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              title="تعديل بيانات المستخدم والصلاحية"
                              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-red-50 text-zinc-700 hover:text-[#DC2626] transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setResettingUser(u)}
                              title="إعادة تعيين كلمة المرور أو إرسال دعوة"
                              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-amber-50 text-zinc-700 hover:text-amber-700 transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            {!isSuper && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                title={isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-zinc-100 hover:bg-amber-50 text-zinc-700 hover:text-amber-700'
                                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                }`}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            )}
                            {isSuper ? (
                              <div
                                title="حساب مدير النظام الأعلى محمي تماماً"
                                className="min-w-[36px] min-h-[36px] rounded-xl bg-red-50 text-[#B91C1C] border border-red-200 flex items-center justify-center"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                title="حذف حساب المستخدم نهائياً"
                                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-red-50 text-zinc-700 hover:text-[#DC2626] transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#111318] border-b-2 border-[#DC2626] text-white font-bold">
                    <tr>
                      <th className="py-3.5 px-4">المستخدم (User)</th>
                      <th className="py-3.5 px-4">الهاتف</th>
                      <th className="py-3.5 px-4">الإدارة التابعة</th>
                      <th className="py-3.5 px-4">الدور الوظيفي (Role)</th>
                      <th className="py-3.5 px-4">حالة الحساب</th>
                      <th className="py-3.5 px-4">تاريخ الإنشاء / آخر دخول</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredUsers.map((u) => {
                      const isActive = u.status === 'active';
                      const isSuper =
                        (u.email && u.email.toLowerCase() === 'ma1927393@gmail.com') ||
                        Boolean(u.isSuperAdmin);
                      const safeRole = u.role || (isSuper ? 'admin' : 'hr');

                      return (
                        <tr key={u.id} className="hover:bg-red-50/35 transition-colors">
                          {/* User Name & Email */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-[#111318] text-white border border-zinc-800 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                {u.fullName ? u.fullName.charAt(0) : 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#111318] flex items-center gap-1.5">
                                  <span>{u.fullName || 'مستخدم'}</span>
                                  {isSuper && (
                                    <span className="text-[10px] bg-red-50 text-[#B91C1C] border border-red-200 px-1.5 py-0.2 rounded-full font-black">
                                      Super Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono truncate" dir="ltr">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3.5 px-4 font-mono text-zinc-600" dir="ltr">
                            {u.phoneNumber || '—'}
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] font-bold">
                              <Building2 className="w-3 h-3 text-zinc-500" />
                              <span>{u.department || 'الإدارة العامة'}</span>
                            </span>
                          </td>

                          {/* Role & Permissions */}
                          <td className="py-3.5 px-4">
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black border ${
                                  safeRole === 'admin'
                                    ? 'bg-[#DC2626] text-white border-[#DC2626]'
                                    : safeRole === 'general_manager'
                                    ? 'bg-[#111318] text-white border-[#111318]'
                                    : safeRole === 'hr_manager'
                                    ? 'bg-red-50 text-[#B91C1C] border-red-200'
                                    : (safeRole && String(safeRole).startsWith('dept_'))
                                    ? 'bg-zinc-100 text-[#111318] border-zinc-300'
                                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                }`}
                              >
                                <Shield className="w-3 h-3" />
                                <span>{getRoleDisplayTitle(safeRole)}</span>
                              </span>

                              {u.permissions && (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px] text-zinc-500 font-medium">
                                  <span className="inline-flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>
                                      {`${Object.values(u.permissions).filter(Boolean).length}/${Object.keys(PERMISSION_LABELS).length} صلاحيات مفعلة`}
                                    </span>
                                  </span>
                                  {HR_PERMISSION_KEYS.some((k) => Boolean(u.permissions?.[k])) && (
                                    <span className="px-1.5 py-0.2 rounded-md bg-red-50 text-[#B91C1C] border border-red-200 font-black">
                                      HR Permissions ({HR_PERMISSION_KEYS.filter((k) => Boolean(u.permissions?.[k])).length}/{HR_PERMISSION_KEYS.length})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status Toggle Switch */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              disabled={isSuper}
                              title={isSuper ? 'لا يمكن تعطيل حساب مدير النظام الأعلى' : 'اضغط لتغيير الحالة'}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-zinc-100 text-zinc-600 border border-zinc-300 hover:bg-zinc-200'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isActive ? 'bg-emerald-600' : 'bg-zinc-400'
                                }`}
                              />
                              <span>{isActive ? 'نشط (مفعل)' : 'معطل وموقوف'}</span>
                            </button>
                          </td>

                          {/* Created & Last Login Dates */}
                          <td className="py-3.5 px-4 text-[11px] text-zinc-500 space-y-0.5">
                            <div className="flex items-center gap-1 text-zinc-700 font-medium">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span>آخر دخول: {formatDateDisplay(u.lastLoginAt)}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              الإنشاء: {u.createdDateArabic || formatDateDisplay(u.createdAt)}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => setEditingUser(u)}
                                title="تعديل بيانات المستخدم والصلاحية"
                                className="p-1.5 rounded-xl bg-zinc-100 hover:bg-red-50 text-zinc-700 hover:text-[#DC2626] transition-colors cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Reset Password Button */}
                              <button
                                type="button"
                                onClick={() => setResettingUser(u)}
                                title="إعادة تعيين كلمة المرور أو إرسال دعوة"
                                className="p-1.5 rounded-xl bg-zinc-100 hover:bg-amber-50 text-zinc-700 hover:text-amber-700 transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Toggle Power Status */}
                              {!isSuper && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(u)}
                                  title={isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                    isActive
                                      ? 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700'
                                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                  }`}
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete User Button (Protected for Super Admin) */}
                              {isSuper ? (
                                <div
                                  title="حساب مدير النظام الأعلى (Super Admin) محمي تماماً من الحذف أو التعطيل"
                                  className="p-1.5 rounded-xl bg-red-50 text-[#B91C1C] border border-red-200 flex items-center justify-center cursor-help"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(u)}
                                  title="حذف حساب المستخدم نهائياً"
                                  className="p-1.5 rounded-xl bg-zinc-100 hover:bg-red-50 text-zinc-700 hover:text-[#DC2626] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
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
              </>
            )}
          </div>
        </div>
      ) : (
        /* Audit Logs View */
        <div key="audit-tab" className="space-y-4 animate-view-enter">
          {/* Audit Controls Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-zinc-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder="ابحث في سجل العمليات (الاسم، البريد، التفاصيل)..."
                className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="flex-1 sm:flex-initial min-w-0 truncate py-2.5 px-3 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs font-bold text-zinc-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] cursor-pointer"
              >
                <option value="all">كافة العمليات</option>
                <option value="USER_CREATED">إنشاء مستخدم (USER_CREATED)</option>
                <option value="USER_UPDATED">تعديل مستخدم (USER_UPDATED)</option>
                <option value="USER_ROLE_CHANGED">تغيير دور وظيفي (USER_ROLE_CHANGED)</option>
                <option value="USER_STATUS_CHANGED">تفعيل أو تعطيل حساب (USER_STATUS_CHANGED)</option>
                <option value="PASSWORD_RESET">إعادة تعيين كلمة مرور (PASSWORD_RESET)</option>
                <option value="LOGIN_SUCCESS">تسجيل دخول ناجح (LOGIN_SUCCESS)</option>
                <option value="LOGIN_FAILED">محاولة دخول مرفوضة (LOGIN_FAILED)</option>
                <option value="APPLICATION_APPROVED">اعتماد طلب توظيف (APPLICATION_APPROVED)</option>
                <option value="APPLICATION_FORWARDED">إحالة مرحلة توظيف (APPLICATION_FORWARDED)</option>
                <option value="APPLICATION_WAITLISTED">قائمة الانتظار (APPLICATION_WAITLISTED)</option>
                <option value="APPLICATION_REJECTED">رفض طلب توظيف (APPLICATION_REJECTED)</option>
                <option value="SALARY_STRUCTURE_UPDATED">تعديل هيكل الرواتب (SALARY_STRUCTURE_UPDATED)</option>
              </select>

              <button
                type="button"
                onClick={loadAuditLogs}
                title="تحديث سجل العمليات"
                className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-2xl transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin text-[#DC2626]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-soft overflow-hidden">
            {isLoadingLogs ? (
              <div className="divide-y divide-zinc-100" aria-busy="true" aria-label="جاري تحميل سجل العمليات">
                <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3.5 flex items-center gap-2 text-xs font-bold text-zinc-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#DC2626]" />
                  <span>جاري تحميل سجل العمليات والأمان...</span>
                </div>
                {[1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <div className="h-3.5 w-28 rounded-lg skeleton-shimmer" />
                    <div className="h-6 w-32 rounded-xl skeleton-shimmer" />
                    <div className="h-3.5 flex-1 max-w-md rounded-lg skeleton-shimmer" />
                    <div className="hidden sm:block h-3 w-24 rounded-lg skeleton-shimmer" />
                  </div>
                ))}
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 space-y-2">
                <History className="w-10 h-10 mx-auto text-zinc-300" />
                <h3 className="text-sm font-black text-[#111318]">لا توجد سجلات مطابقة</h3>
                <p className="text-xs text-zinc-400">جميع العمليات الإدارية وأحداث الدخول تُسجل تلقائياً هنا.</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-zinc-100">
                  {filteredAuditLogs.map((log) => (
                    <div key={log.id} className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black font-mono border ${
                            log.action.includes('CREATE')
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : log.action.includes('DELETE') || log.action.includes('REJECT') || log.action.includes('SUSPEND')
                              ? 'bg-red-50 text-[#B91C1C] border-red-200'
                              : log.action.includes('LOGIN')
                              ? 'bg-zinc-100 text-[#111318] border-zinc-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {log.dateArabic || formatDateDisplay(log.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="min-w-0">
                          <span className="font-bold text-[#111318]">{log.userName || log.userEmail}</span>
                          <span className="text-[10px] text-zinc-400 font-mono block truncate" dir="ltr">
                            {log.userEmail} ({log.userRole})
                          </span>
                        </div>
                        {(log.targetName || log.targetId) && (
                          <span className="text-[11px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-lg shrink-0 max-w-[140px] truncate">
                            {log.targetName || log.targetId}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-zinc-600 leading-relaxed">{log.details}</p>

                      {log.metadata?.signature && (
                        <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-900 font-bold">
                          <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
                          <span>توقيع موثق: {log.metadata.signature.fullName}</span>
                          {log.metadata.signature.stageLabel && (
                            <span className="text-emerald-700">({log.metadata.signature.stageLabel})</span>
                          )}
                        </div>
                      )}

                      {(log.previousValue || log.newValue) && (
                        <div className="text-[10px] font-mono text-zinc-500 bg-zinc-50 p-1.5 rounded-lg border border-zinc-200 overflow-x-auto">
                          {log.previousValue && (
                            <div className="truncate">السابق: {JSON.stringify(log.previousValue)}</div>
                          )}
                          {log.newValue && (
                            <div className="text-emerald-700 font-bold truncate">
                              الجديد: {JSON.stringify(log.newValue)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#111318] border-b-2 border-[#DC2626] text-white font-bold">
                    <tr>
                      <th className="py-3 px-4">التاريخ والوقت (Date & Time)</th>
                      <th className="py-3 px-4">المستخدم المنفذ (User ID & Name)</th>
                      <th className="py-3 px-4">نوع العملية (Action)</th>
                      <th className="py-3 px-4">العنصر المستهدف</th>
                      <th className="py-3 px-4">التفاصيل والبيان (Details)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-red-50/35 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-4 font-mono text-zinc-600 text-[11px] whitespace-nowrap">
                          {log.dateArabic || formatDateDisplay(log.timestamp)}
                        </td>

                        {/* Performed by */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#111318]">{log.userName || log.userEmail}</div>
                          <div className="text-[10px] text-zinc-400 font-mono" dir="ltr">
                            {log.userEmail} ({log.userRole})
                          </div>
                        </td>

                        {/* Action badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono border ${
                              log.action.includes('CREATE')
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : log.action.includes('DELETE') || log.action.includes('REJECT') || log.action.includes('SUSPEND')
                                ? 'bg-red-50 text-[#B91C1C] border-red-200'
                                : log.action.includes('LOGIN')
                                ? 'bg-zinc-100 text-[#111318] border-zinc-300'
                                : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>

                        {/* Target */}
                        <td className="py-3 px-4 text-zinc-700 font-bold">
                          {log.targetName || log.targetId || '—'}
                        </td>

                        {/* Details */}
                        <td className="py-3 px-4 text-zinc-600 leading-relaxed max-w-md">
                          <div>{log.details}</div>
                          {log.metadata?.signature && (
                            <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-900 font-bold">
                              <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
                              <span>توقيع موثق: {log.metadata.signature.fullName}</span>
                              {log.metadata.signature.stageLabel && (
                                <span className="text-emerald-700">• {log.metadata.signature.stageLabel}</span>
                              )}
                            </div>
                          )}
                          {(log.previousValue || log.newValue) && (
                            <div className="mt-1 text-[10px] font-mono text-zinc-500 bg-zinc-50 p-1 rounded border border-zinc-200">
                              {log.previousValue && (
                                <div>السابق: {JSON.stringify(log.previousValue)}</div>
                              )}
                              {log.newValue && (
                                <div className="text-emerald-700 font-bold">
                                  الجديد: {JSON.stringify(log.newValue)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        callerRole={activeRole}
        onUserAdded={async (newUser) => {
          await loadUsers();
          showToast(`تم إضافة وحفظ المستخدم (${newUser.fullName}) في قاعدة البيانات بنجاح`, 'success');
        }}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        callerRole={activeRole}
        isCallerSuperAdmin={isSuperAdmin}
        onUserUpdated={async (updated) => {
          await loadUsers();
          showToast(`تم تحديث بيانات وصلاحيات (${updated.fullName}) في قاعدة البيانات بنجاح`, 'success');
        }}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={Boolean(resettingUser)}
        user={resettingUser}
        onClose={() => setResettingUser(null)}
        callerRole={activeRole}
      />

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden text-right p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center mx-auto border border-red-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-[#111318]">
                تأكيد حذف حساب المستخدم
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                هل أنت متأكد من حذف حساب المستخدم <strong>({userToDelete.fullName})</strong> ({userToDelete.email})؟
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-[11px] text-[#991B1B] font-bold">
                ⚠️ سيتم حذف الحساب وكافة الصلاحيات المرتبطة به نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-black text-xs rounded-xl shadow-sm shadow-red-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، حذف الحساب نهائياً</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
