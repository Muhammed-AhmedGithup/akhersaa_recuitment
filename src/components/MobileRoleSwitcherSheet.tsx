import React from 'react';
import { UserRole } from '../types';
import {
  X,
  UserCheck,
  ShieldCheck,
  Award,
  Check,
  Briefcase
} from 'lucide-react';

interface MobileRoleSwitcherSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const MobileRoleSwitcherSheet: React.FC<MobileRoleSwitcherSheetProps> = ({
  isOpen,
  onClose,
  activeRole,
  onSelectRole,
}) => {
  if (!isOpen) return null;

  const roles = [
    {
      id: 'admin' as UserRole,
      title: 'مدير النظام (Admin) - كامل الصلاحيات',
      subtitle: 'محمد احمد عبد اللطيف - إشراف شامل واعتماد لكافة الإدارات والمراحل',
      icon: <ShieldCheck className="w-5 h-5 text-[#DC2626]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'hr' as UserRole,
      title: 'الموارد البشرية',
      subtitle: 'الفحص المبدئي، استلام الاستمارات، والإحالة لمدير الموارد البشرية',
      icon: <UserCheck className="w-5 h-5 text-emerald-600" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'hr_manager' as UserRole,
      title: 'مدير الموارد البشرية',
      subtitle: 'مراجعة وتدقيق تقييم الموارد البشرية، وتوجيه الاستمارة للإدارة المعنية',
      icon: <Briefcase className="w-5 h-5 text-[#111318]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'dept_finance' as UserRole,
      title: 'مدير إدارة المالية',
      subtitle: 'التقييم الفني لوظائف الحسابات، الخزينة، والمراجعة المالية',
      icon: <ShieldCheck className="w-5 h-5 text-[#111318]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'dept_executive' as UserRole,
      title: 'مدير إدارة التنفيذية',
      subtitle: 'التقييم الفني لوظائف التشغيل الميداني والإشراف العام',
      icon: <ShieldCheck className="w-5 h-5 text-[#111318]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'dept_tech' as UserRole,
      title: 'مدير إدارة التقنية',
      subtitle: 'التقييم الفني لوظائف تقنية المعلومات، الشبكات، والأنظمة',
      icon: <ShieldCheck className="w-5 h-5 text-[#111318]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'dept_services' as UserRole,
      title: 'مدير إدارة الخدمات',
      subtitle: 'التقييم الفني لوظائف الصالة، الضيافة، والديليفري',
      icon: <ShieldCheck className="w-5 h-5 text-[#111318]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'dept_production' as UserRole,
      title: 'مدير إدارة الإنتاج',
      subtitle: 'التقييم العملي لوظائف المطبخ، الطهاة، وخطوط الإنتاج',
      icon: <ShieldCheck className="w-5 h-5 text-[#111318]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'dept_control' as UserRole,
      title: 'مدير إدارة الرقابة',
      subtitle: 'التقييم الفني لمراقبي الجودة وسلامة الغذاء والتفتيش',
      icon: <ShieldCheck className="w-5 h-5 text-[#111318]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'dept_marketing' as UserRole,
      title: 'مدير إدارة التسويق',
      subtitle: 'التقييم الفني لوظائف التسويق الرقمي والمحتوى والإعلانات',
      icon: <ShieldCheck className="w-5 h-5 text-[#111318]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'dept_sales' as UserRole,
      title: 'مدير إدارة المبيعات',
      subtitle: 'التقييم الفني لمسؤولي المبيعات، الكول سنتر والتعاقدات',
      icon: <ShieldCheck className="w-5 h-5 text-[#111318]" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
    {
      id: 'general_manager' as UserRole,
      title: 'المدير العام (General Manager)',
      subtitle: 'الاعتماد النهائي، تحديد وتثبيت الراتب، وتصديق التعيين',
      icon: <Award className="w-5 h-5 text-amber-600" />,
      color: 'border-[#DC2626] ring-red-600/20',
      activeBg: 'bg-red-50/70',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-end justify-center md:hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl max-h-[80vh] w-full flex flex-col shadow-2xl border-t border-zinc-200 overflow-hidden text-right animate-slide-up-mobile pb-safe">
        {/* Drag Pill Handle */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-zinc-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-[#111318] text-base">تبديل صلاحية المستخدم</h3>
            <p className="text-[11px] text-zinc-500">اختر المنصب لعرض الطلبات المعلقة بصلاحياتك</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-[#111318] rounded-xl hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles List */}
        <div className="p-4 space-y-2.5 overflow-y-auto max-h-[68vh]">
          {roles.map((r) => {
            const isSelected = activeRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelectRole(r.id);
                  onClose();
                }}
                className={`w-full p-4 rounded-2xl border text-right flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer ${
                  isSelected
                    ? `${r.color} ${r.activeBg} border-2 shadow-xs`
                    : 'bg-zinc-50/80 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-2xs">
                    {r.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-[#111318]">{r.title}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{r.subtitle}</p>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-[#DC2626] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-zinc-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
