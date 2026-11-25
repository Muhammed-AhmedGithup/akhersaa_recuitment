import React, { useState } from 'react';
import {
  UserRole,
  SYSTEM_ROLES,
  ManagerPermissions,
  PERMISSION_LABELS,
  GENERAL_PERMISSION_KEYS,
  HR_PERMISSION_KEYS,
  FULL_PERMISSIONS,
  SYSTEM_ADMIN_FULL_PERMISSIONS,
  DEFAULT_HR_PERMISSIONS,
  DEFAULT_DEPT_MANAGER_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  getDefaultPermissionsForRole,
} from '../types';
import { DEPARTMENTS } from '../utils/departments';
import { createAdminUser } from '../services/apiService';
import {
  X,
  UserPlus,
  Mail,
  Phone,
  Shield,
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sliders,
} from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: (newUser: any, tempPass?: string) => void;
  callerRole: UserRole;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onUserAdded,
  callerRole,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>('dept_services');
  const [department, setDepartment] = useState('إدارة الخدمات');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [permissions, setPermissions] = useState<ManagerPermissions>(() =>
    getDefaultPermissionsForRole('dept_services')
  );
  const [customPassword, setCustomPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ user: any; tempPass: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate username from email prefix / unique handle - immutable and non-editable
  const derivedUsername = email.trim()
    ? email.includes('@')
      ? email.trim().split('@')[0].toLowerCase()
      : email.trim().toLowerCase()
    : '';

  if (!isOpen) return null;

  const isAdminRoleSelected = role === 'admin';

  // Whenever role changes, auto-select corresponding department and default permissions
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    const def = SYSTEM_ROLES.find((r) => r.key === newRole);
    if (def) {
      setDepartment(def.defaultDepartment);
    }
    setPermissions(getDefaultPermissionsForRole(newRole));
  };

  const togglePermission = (key: keyof ManagerPermissions) => {
    if (isAdminRoleSelected) return;
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyPreset = (preset: 'full' | 'hr' | 'manager' | 'employee') => {
    if (isAdminRoleSelected) return;
    if (preset === 'full') setPermissions({ ...FULL_PERMISSIONS });
    else if (preset === 'hr') setPermissions({ ...DEFAULT_HR_PERMISSIONS });
    else if (preset === 'manager') setPermissions({ ...DEFAULT_DEPT_MANAGER_PERMISSIONS });
    else setPermissions({ ...DEFAULT_EMPLOYEE_PERMISSIONS });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !email.trim() || !phoneNumber.trim()) {
      setErrorMsg('يرجى استيفاء جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAdminUser(
        {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          username: derivedUsername || email.trim().toLowerCase().split('@')[0],
          phoneNumber: phoneNumber.trim(),
          role,
          department,
          status,
          permissions: isAdminRoleSelected ? SYSTEM_ADMIN_FULL_PERMISSIONS : permissions,
          initialPassword: customPassword.trim() || undefined,
        },
        callerRole
      );

      setSuccessInfo({
        user: res.user,
        tempPass: res.temporaryPassword || customPassword || 'AkherSaa@2026',
      });
      onUserAdded(res.user, res.temporaryPassword);
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر إضافة المستخدم. يرجى التحقق من صحة البيانات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!successInfo) return;
    const uName =
      successInfo.user.username ||
      successInfo.user.email?.split('@')[0] ||
      successInfo.user.email;
    const text = `بيانات الدخول لمنظومة التوظيف - آخر ساعة إسبشيال:
المستخدم: ${successInfo.user.fullName}
اسم المستخدم: ${uName}
البريد الإلكتروني: ${successInfo.user.email}
كلمة المرور: ${successInfo.tempPass}
الدور: ${successInfo.user.role}
الإدارة: ${successInfo.user.department}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generalKeys = GENERAL_PERMISSION_KEYS;
  const hrKeys = HR_PERMISSION_KEYS;

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
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white truncate">إضافة مستخدم جديد للنظام</h2>
              <p className="text-[11px] text-zinc-300 mt-0.5 line-clamp-1">
                تحديد الهوية الإدارية، وتعيين الإدارة، وتخصيص الصلاحيات في قاعدة البيانات
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

          {successInfo ? (
            <div className="space-y-4 py-2 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-950">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>تم حفظ المستخدم بنجاح في قاعدة البيانات المركزية!</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  تم تسجيل حساب <strong>({successInfo.user.fullName})</strong> وتعيين دوره كـ{' '}
                  <strong>({successInfo.user.role})</strong> في <strong>({successInfo.user.department})</strong>.
                </p>

                <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>اسم المستخدم:</span>
                    <span className="font-mono font-bold text-[#111318]" dir="ltr">
                      {successInfo.user.username ||
                        successInfo.user.email?.split('@')[0] ||
                        successInfo.user.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>البريد الإلكتروني:</span>
                    <span className="font-mono font-bold text-[#111318]" dir="ltr">
                      {successInfo.user.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>كلمة المرور المؤقتة:</span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {successInfo.tempPass}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyCredentials}
                  className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم نسخ بيانات الدخول إلى الحافظة</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ بيانات الدخول للمستخدم</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  إغلاق ومتابعة
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    الاسم الكامل (Full Name) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أ. محمود كمال الشريف"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-sm sm:text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-medium"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    البريد الإلكتروني (Email) <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      dir="ltr"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@akhersaa.com"
                      className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-sm sm:text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    يجب أن يكون فريداً لكل مستخدم (يتم التحقق في قاعدة البيانات)
                  </span>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    رقم الهاتف (Phone Number) <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      dir="ltr"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="01012345678"
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
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-bold cursor-pointer"
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
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    حالة الحساب (Account Status) <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="flex items-center gap-3 pt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-zinc-800">
                      <input
                        type="radio"
                        name="account_status"
                        checked={status === 'active'}
                        onChange={() => setStatus('active')}
                        className="accent-emerald-600"
                      />
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>مفعل (Active)</span>
                      </span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-zinc-800 mr-2">
                      <input
                        type="radio"
                        name="account_status"
                        checked={status === 'inactive'}
                        onChange={() => setStatus('inactive')}
                        className="accent-[#DC2626]"
                      />
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-zinc-400" />
                        <span>معطل (Inactive)</span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Optional Custom Password */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    كلمة مرور مخصصة (اختياري)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="تلقائي: يتم توليد كلمة مرور عشوائية"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-mono"
                  />
                </div>
              </div>

              {/* Granular Permissions Section */}
              <div className="pt-3 border-t border-zinc-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#DC2626]" />
                    <span className="text-xs font-black text-[#111318]">
                      صلاحيات المستخدم الممنوحة (Granular Permissions)
                    </span>
                  </div>

                  {/* Preset shortcuts */}
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
                </div>

                {/* Independent HR Permissions Group */}
                <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>مجموعة صلاحيات الموارد البشرية المستقلة (HR Permissions)</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#DC2626] bg-white px-2 py-0.5 rounded-lg border border-red-200">
                      مخصصة لدور HR فقط افتراضياً
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {hrKeys.map((pKey) => {
                      const info = PERMISSION_LABELS[pKey];
                      const isChecked = isAdminRoleSelected ? true : Boolean(permissions[pKey]);
                      return (
                        <label
                          key={pKey}
                          className={`flex items-start gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-white border-[#DC2626] text-[#111318] shadow-xs'
                              : 'bg-white/60 border-zinc-200 text-zinc-600 hover:bg-white'
                          } ${isAdminRoleSelected ? 'cursor-not-allowed opacity-90' : ''}`}
                        >
                          <input
                            type="checkbox"
                            disabled={isAdminRoleSelected}
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
                    const isChecked = isAdminRoleSelected ? true : Boolean(permissions[pKey]);
                    return (
                      <label
                        key={pKey}
                        className={`flex items-start gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-red-50/50 border-red-300 text-[#111318] shadow-xs'
                            : 'bg-zinc-50/70 border-zinc-200 text-zinc-600 hover:bg-zinc-100/70'
                        } ${isAdminRoleSelected ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <input
                          type="checkbox"
                          disabled={isAdminRoleSelected}
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

              {/* Submit Buttons */}
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
                      <UserPlus className="w-4 h-4 text-white" />
                      <span>إنشاء الحساب وحفظه في قاعدة البيانات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
