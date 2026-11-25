import React from 'react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { LoginModal } from './LoginModal';
import {
  X,
  Bot,
  Plus,
  RefreshCw,
  Download,
  Smartphone,
  ShieldCheck,
  LogIn,
  LogOut,
  Database,
  ChevronLeft,
  Banknote,
  Building2,
  Briefcase,
} from 'lucide-react';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: UserRole;
  onChangeRole?: (role: UserRole) => void;
  onOpenAddModal: () => void;
  onOpenSyncModal: () => void;
  onOpenGeminiModal: () => void;
  onExportCSV: () => void;
  onOpenPWAInstall: () => void;
  totalApplicants: number;
  onOpenUserManagement?: () => void;
  onOpenDepartmentsView?: () => void;
  onOpenInterviewsFilter?: () => void;
  canManageUsers?: boolean;
  canAddApplicant?: boolean;
  canSyncSheets?: boolean;
  canExportCSV?: boolean;
  canManageSalaryStructure?: boolean;
  onOpenSalaryStructure?: () => void;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  isOpen,
  onClose,
  onOpenAddModal,
  onOpenSyncModal,
  onOpenGeminiModal,
  onExportCSV,
  onOpenPWAInstall,
  totalApplicants,
  onOpenUserManagement,
  onOpenDepartmentsView,
  onOpenInterviewsFilter,
  canManageUsers,
  canAddApplicant = true,
  canSyncSheets = true,
  canExportCSV = true,
  canManageSalaryStructure = false,
  onOpenSalaryStructure,
}) => {
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState(false);
  const { user, appUser, isSuperAdmin, logout } = useAuth();

  React.useEffect(() => {
    setAvatarError(false);
  }, [appUser?.photoURL, user?.photoURL]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/65 backdrop-blur-sm flex items-end justify-center md:hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl max-h-[88dvh] w-full flex flex-col shadow-2xl border-t border-zinc-200 overflow-hidden text-right animate-slide-up-mobile pb-safe">
        {/* Drag Pill Handle */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-zinc-300" />
        </div>

        {/* Drawer Header */}
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-[#111318] text-base">القائمة وإعدادات التطبيق</h3>
            <p className="text-[11px] text-zinc-500">لوحة الإدارة والخدمات السريعة للهاتف</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-[#111318] rounded-xl hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto momentum-scroll text-xs">
          {/* User Account Card */}
          <div className="p-3.5 rounded-2xl bg-[#111318] border-b-2 border-[#DC2626] text-white flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl ring-2 ring-[#DC2626]/60 bg-zinc-800 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                {(appUser?.photoURL || user?.photoURL) && !avatarError ? (
                  <img
                    src={appUser?.photoURL || user?.photoURL || undefined}
                    alt=""
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(appUser?.fullName || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                  <span>{appUser?.fullName || user?.displayName || user?.email || 'جلسة غير مسجلة'}</span>
                  {isSuperAdmin && (
                    <span className="text-[9px] bg-[#DC2626] text-white font-black px-1.5 py-0.2 rounded font-mono">
                      Super Admin
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-300 flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      user || appUser ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    {appUser ? `الدور: ${appUser.role} • ${appUser.department}` : user ? 'محفوظ سحابياً' : 'تسجيل الدخول للمتابعة'}
                  </span>
                </div>
              </div>
            </div>

            {user || appUser ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-[#DC2626] text-white rounded-xl text-[11px] font-bold border border-zinc-700 flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول</span>
              </button>
            )}
          </div>

          {/* Key Actions List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-zinc-500 block px-1">
              أدوات المنظومة السريعة:
            </span>

            {/* User Management & RBAC */}
            {(canManageUsers ?? isSuperAdmin) && onOpenUserManagement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUserManagement();
                }}
                className="w-full p-3 bg-[#111318] hover:bg-zinc-900 text-white rounded-2xl flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer border border-zinc-800"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#DC2626] text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xs flex items-center gap-1.5">
                      <span>إدارة المستخدمين والصلاحيات (RBAC)</span>
                      <span className="text-[9px] bg-[#DC2626] text-white font-black px-1.5 py-0.2 rounded font-mono">
                        Admin
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-300">
                      إضافة وتعديل المديرين وتعيين الإدارات والأدوار
                    </div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-zinc-300" />
              </button>
            )}

            {/* Departments & Interviews Quick Navigation */}
            {onOpenInterviewsFilter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInterviewsFilter();
                }}
                className="w-full p-3 bg-zinc-50 hover:bg-red-50/50 text-[#111318] rounded-2xl flex items-center justify-between border border-zinc-200 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-[#DC2626] border border-red-200 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-[#111318]">المقابلات الفنية (الإدارات)</div>
                    <div className="text-[10px] text-zinc-500">الطلبات المحالة لمديري الإدارات المختصة</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
            )}

            {onOpenDepartmentsView && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDepartmentsView();
                }}
                className="w-full p-3 bg-zinc-50 hover:bg-red-50/50 text-[#111318] rounded-2xl flex items-center justify-between border border-zinc-200 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 text-[#111318] border border-zinc-200 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-[#111318]">دليل الإدارات والوظائف</div>
                    <div className="text-[10px] text-zinc-500">عرض قطاعات الشركة والمسميات المتاحة</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
            )}

            {/* Gemini AI Bot Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGeminiModal();
              }}
              className="w-full p-3 bg-[#111318] text-white rounded-2xl flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer border border-zinc-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#DC2626] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <div className="font-black text-xs flex items-center gap-1.5">
                    <span>المساعد الذكي (Gemini AI)</span>
                    <span className="text-[9px] bg-white text-[#111318] font-black px-1.5 py-0.2 rounded font-mono">
                      AI
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-300">
                    تحليل السير الذاتية وتوصيات القبول والرواتب
                  </div>
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-zinc-300" />
            </button>

            {/* Add New Applicant */}
            {canAddApplicant && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddModal();
                }}
                className="w-full p-3 bg-red-50/70 hover:bg-red-100/70 text-[#111318] rounded-2xl flex items-center justify-between border border-red-200 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#DC2626] text-white flex items-center justify-center shrink-0">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-[#111318]">إدخال طلب ورقي يدوياً</div>
                    <div className="text-[10px] text-[#B91C1C]">تسجيل مرشح جديد من فروع الشركة</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#DC2626]" />
              </button>
            )}

            {/* Salary Structure Management */}
            {canManageSalaryStructure && onOpenSalaryStructure && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSalaryStructure();
                }}
                className="w-full p-3 bg-emerald-50/80 hover:bg-emerald-100/70 text-[#111318] rounded-2xl flex items-center justify-between border border-emerald-200 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-[#111318]">إدارة هيكل الرواتب العام</div>
                    <div className="text-[10px] text-emerald-700">تحديد مرجعية رواتب المستويات الثلاثة</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-emerald-700" />
              </button>
            )}

            {/* Sync from Google Sheet */}
            {canSyncSheets && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSyncModal();
                }}
                className="w-full p-3 bg-zinc-50 hover:bg-red-50/50 text-[#111318] rounded-2xl flex items-center justify-between border border-zinc-200 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 text-[#111318] border border-zinc-200 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 text-[#DC2626]" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-[#111318]">سحب من Google Sheet</div>
                    <div className="text-[10px] text-zinc-500">استيراد الردود الإلكترونية الجديدة فورياً</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
            )}

            {/* Export CSV / Excel */}
            {canExportCSV && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExportCSV();
                }}
                className="w-full p-3 bg-zinc-50 hover:bg-emerald-50/70 text-[#111318] rounded-2xl flex items-center justify-between border border-zinc-200 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-[#111318]">تصدير كشف القرارات Excel</div>
                    <div className="text-[10px] text-zinc-500">تحميل تقرير كامل بكافة الرواتب والاعتمادات</div>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
            )}

            {/* PWA Mobile App Installation */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPWAInstall();
              }}
              className="w-full p-3 bg-[#111318] text-white rounded-2xl flex items-center justify-between border border-zinc-800 active:scale-[0.98] transition-transform shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-red-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-white">تثبيت التطبيق على الشاشة الرئيسية</div>
                  <div className="text-[10px] text-zinc-300">
                    تشغيل سريع دون متصفح مع دعم وضع عدم الاتصال
                  </div>
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-red-400" />
            </button>
          </div>

          {/* Database Info pill */}
          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-[10px] text-zinc-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">
              <Database className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>إجمالي الطلبات المسجلة:</span>
            </span>
            <span className="font-mono font-black text-[#111318] bg-white px-2 py-0.5 rounded-lg border border-zinc-200 tabular-nums">
              {totalApplicants} طلب
            </span>
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};
