import React, { useState, useEffect } from 'react';
import {
  UserRole,
  SYSTEM_ROLES,
  UserIdentity,
  AccountStatus,
  ManagerPermissions,
  PERMISSION_LABELS,
  GENERAL_PERMISSION_KEYS,
  HR_PERMISSION_KEYS,
  HrPermissionKey,
  FULL_PERMISSIONS,
  SYSTEM_ADMIN_FULL_PERMISSIONS,
  DEFAULT_HR_PERMISSIONS,
  DEFAULT_DEPT_MANAGER_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  getDefaultPermissionsForRole,
} from '../types';
import { DEPARTMENTS } from '../utils/departments';
import { updateAdminUser } from '../services/apiService';
import {
  X,
  Edit,
  Mail,
  Phone,
  Shield,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  user: UserIdentity | null;
  onClose: () => void;
  onUserUpdated: (updated: UserIdentity) => void;
  callerRole: UserRole;
  isCallerSuperAdmin: boolean;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  onClose,
  onUserUpdated,
  callerRole,
  isCallerSuperAdmin: _isCallerSuperAdmin,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>('dept_services');
  const [department, setDepartment] = useState('إدارة الخدمات');
  const [status, setStatus] = useState<AccountStatus>('active');
  const [permissions, setPermissions] = useState<ManagerPermissions>(() => ({
    ...DEFAULT_EMPLOYEE_PERMISSIONS,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const targetIsAdmin =
        user.email.toLowerCase() === 'ma1927393@gmail.com' ||
        Boolean(user.isSuperAdmin) ||
        user.role === 'admin';
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setRole(user.role);
      setDepartment(user.department || 'إدارة الخدمات');
      setStatus(user.status || 'active');
      setPermissions(
        targetIsAdmin
          ? { ...SYSTEM_ADMIN_FULL_PERMISSIONS }
          : user.permissions
          ? { ...user.permissions }
          : getDefaultPermissionsForRole(user.role)
      );
      setErrorMsg(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isTargetSuperAdmin =
    user.email.toLowerCase() === 'ma1927393@gmail.com' || Boolean(user.isSuperAdmin);
  const isAdminProtected = isTargetSuperAdmin || role === 'admin';

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    const def = SYSTEM_ROLES.find((r) => r.key === newRole);
    if (def) {
      setDepartment(def.defaultDepartment);
    }
    // Auto-suggest permissions based on role
    setPermissions(getDefaultPermissionsForRole(newRole));
  };

  const togglePermission = (key: keyof ManagerPermissions) => {
    if (isAdminProtected) return;
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyPreset = (preset: 'full' | 'hr' | 'manager' | 'employee') => {
    if (isAdminProtected) return;
    if (preset === 'full') setPermissions({ ...FULL_PERMISSIONS });
    else if (preset === 'hr') setPermissions({ ...DEFAULT_HR_PERMISSIONS });
    else if (preset === 'manager') setPermissions({ ...DEFAULT_DEPT_MANAGER_PERMISSIONS });
    else setPermissions({ ...DEFAULT_EMPLOYEE_PERMISSIONS });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('الاسم الكامل مطلوب');
      return;
    }

    if (!email.trim()) {
      setErrorMsg('البريد الإلكتروني مطلوب');
      return;
    }

    if (isTargetSuperAdmin && role !== 'admin') {
      setErrorMsg('لا يمكن تجريد حساب مدير النظام الأعلى من صلاحية Super Admin');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateAdminUser(
        user.id,
        {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim(),
          role,
          department,
          status,
          permissions: isAdminProtected ? SYSTEM_ADMIN_FULL_PERMISSIONS : permissions,
        },
        callerRole
      );

      onUserUpdated(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر تعديل بيانات المستخدم في قاعدة البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generalKeys = GENERAL_PERMISSION_KEYS;
  const hrKeys: HrPermissionKey[] = HR_PERMISSION_KEYS;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-zinc-200 w-full max-w-2xl overflow-hidden text-right flex flex-col max-h-[94dvh] sm:max-h-[92vh] animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="bg-[#111318] p-4 sm:p-5 text-white flex items-center justify-between border-b-2 border-[#DC2626] shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#DC2626] flex items-center justify-center text-white font-bold shrink-0 shadow-sm shadow-red-600/25">
              <Edit className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white truncate">تعديل بيانات المستخدم والصلاحيات</h2>
              <p className="text-[11px] text-zinc-300 mt-0.5 truncate">
                تحديث السجل في قاعدة البيانات المركزية: {user.fullName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isTargetSuperAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                هذا حساب <strong>مدير النظام الأعلى (Super Admin)</strong>. البريد والصلاحيات الكاملة والحالة محمية من التجريد.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  الاسم الكامل <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-sm sm:text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-medium"
                />
              </div>

              {/* Email Address (Editable with duplicate protection) */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  البريد الإلكتروني <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    dir="ltr"
                    required
                    disabled={isTargetSuperAdmin}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-sm sm:text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-sm sm:text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-mono"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  الدور الوظيفي (Role) <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={role}
                    disabled={isTargetSuperAdmin}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {SYSTEM_ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.titleArabic}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  الإدارة التابعة (Department) <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-medium cursor-pointer"
                  >
                    <option value="الإدارة العامة">الإدارة العامة</option>
                    <option value="إدارة الموارد البشرية">إدارة الموارد البشرية</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">حالة الحساب</label>
                <div className="flex items-center gap-3 pt-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-zinc-800">
                    <input
                      type="radio"
                      name="edit_status"
                      checked={status === 'active'}
                      onChange={() => setStatus('active')}
                      className="accent-emerald-600"
                    />
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>مفعل (Active)</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-zinc-800">
                    <input
                      type="radio"
                      name="edit_status"
                      disabled={isTargetSuperAdmin}
                      checked={status === 'inactive'}
                      onChange={() => setStatus('inactive')}
                      className="accent-[#DC2626] disabled:opacity-50"
                    />
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      <span>معطل (Inactive)</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Granular Permissions Section */}
            <div className="pt-3 border-t border-zinc-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#DC2626]" />
                  <span className="text-xs font-black text-[#111318]">
                    صلاحيات المستخدم التفصيلية (Granular Permissions)
                  </span>
                </div>

                {/* Preset shortcuts */}
                {!isAdminProtected && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-zinc-400">نماذج جاهزة:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('hr')}
                      className="px-2 py-0.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#DC2626] font-bold transition-colors cursor-pointer border border-red-200"
                    >
                      الموارد البشرية (HR)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('full')}
                      className="px-2 py-0.5 rounded-lg bg-[#111318] hover:bg-zinc-800 text-white font-bold transition-colors cursor-pointer border border-[#111318]"
                    >
                      إدارية عليا
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('manager')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[#111318] font-bold transition-colors cursor-pointer border border-zinc-300"
                    >
                      مدير إدارة
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('employee')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-bold transition-colors cursor-pointer border border-zinc-200"
                    >
                      محدود
                    </button>
                  </div>
                )}
              </div>

              {/* Independent HR Permissions Group */}
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span>مجموعة صلاحيات الموارد البشرية المستقلة (HR Permissions)</span>
                  </span>
                  <span className="text-[10px] font-bold text-[#DC2626] bg-white px-2 py-0.5 rounded-lg border border-red-200">
                    صلاحية صريحة مطلوبة لغير HR
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hrKeys.map((pKey) => {
                    const info = PERMISSION_LABELS[pKey];
                    const isChecked = isAdminProtected ? true : Boolean(permissions[pKey]);
                    return (
                      <label
                        key={pKey}
                        className={`flex items-start gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-white border-[#DC2626] text-[#111318] shadow-xs'
                            : 'bg-white/60 border-zinc-200 text-zinc-600 hover:bg-white'
                        } ${isAdminProtected ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <input
                          type="checkbox"
                          disabled={isAdminProtected}
                          checked={isChecked}
                          onChange={() => togglePermission(pKey)}
                          className="mt-0.5 rounded accent-[#DC2626] border-zinc-300 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold leading-tight">{info.title}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                            {info.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* General System Permissions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {generalKeys.map((pKey) => {
                  const info = PERMISSION_LABELS[pKey];
                  const isChecked = isAdminProtected ? true : Boolean(permissions[pKey]);
                  return (
                    <label
                      key={pKey}
                      className={`flex items-start gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-red-50/50 border-red-300 text-[#111318] shadow-xs'
                          : 'bg-zinc-50/70 border-zinc-200 text-zinc-600 hover:bg-zinc-100/70'
                      } ${isAdminProtected ? 'cursor-not-allowed opacity-90' : ''}`}
                    >
                      <input
                        type="checkbox"
                        disabled={isAdminProtected}
                        checked={isChecked}
                        onChange={() => togglePermission(pKey)}
                        className="mt-0.5 rounded accent-[#DC2626] border-zinc-300 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold leading-tight">{info.title}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight line-clamp-1">
                          {info.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-sm shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>جاري الحفظ في قاعدة البيانات...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>حفظ التعديلات في قاعدة البيانات</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
