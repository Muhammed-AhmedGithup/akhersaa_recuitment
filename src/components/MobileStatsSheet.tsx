import React from 'react';
import { JobApplication, UserRole, isApprovedStatus } from '../types';
import {
  X,
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  Percent,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { isDeptPending, matchesDeptFilter } from '../utils/departments';

interface MobileStatsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  applicants: JobApplication[];
  activeRole: UserRole;
  onFilterByStatus: (status: string) => void;
}

export const MobileStatsSheet: React.FC<MobileStatsSheetProps> = ({
  isOpen,
  onClose,
  applicants,
  onFilterByStatus,
}) => {
  if (!isOpen) return null;

  const total = applicants.length;
  const approvedLvl1 = applicants.filter((a) => a.status === 'approved_lvl1').length;
  const approvedLvl2 = applicants.filter((a) => a.status === 'approved_lvl2').length;
  const approvedLvl3 = applicants.filter((a) => a.status === 'approved_lvl3').length;
  const approvedProposal = applicants.filter((a) => a.status === 'approved_proposal').length;
  const totalApproved = applicants.filter((a) => isApprovedStatus(a.status)).length;
  const rejected = applicants.filter((a) => a.status === 'rejected').length;
  const gmPending = applicants.filter((a) => a.status === 'gm_pending').length;
  const allDeptPending = applicants.filter((a) => isDeptPending(a.status)).length;
  const deptFinanceCount = applicants.filter((a) => matchesDeptFilter(a, 'dept_finance')).length;
  const deptExecutiveCount = applicants.filter((a) => matchesDeptFilter(a, 'dept_executive')).length;
  const deptServicesCount = applicants.filter((a) => matchesDeptFilter(a, 'dept_services')).length;
  const deptProductionCount = applicants.filter((a) => matchesDeptFilter(a, 'dept_production')).length;
  const deptControlCount = applicants.filter((a) => matchesDeptFilter(a, 'dept_control')).length;
  const deptMarketingCount = applicants.filter((a) => matchesDeptFilter(a, 'dept_marketing')).length;
  const deptSalesCount = applicants.filter((a) => matchesDeptFilter(a, 'dept_sales')).length;

  const hrManagerPending = applicants.filter((a) => a.status === 'hr_manager_pending').length;
  const hrPending = applicants.filter((a) => a.status === 'new' || a.status === 'hr_pending').length;

  const acceptanceRate = total > 0 ? Math.round((totalApproved / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/65 backdrop-blur-sm flex items-end justify-center md:hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl max-h-[88vh] w-full flex flex-col shadow-2xl border-t border-zinc-200 overflow-hidden text-right animate-slide-up-mobile pb-safe">
        {/* Drag Pill Handle */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-zinc-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#111318] text-white shadow-xs">
              <BarChart3 className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <h3 className="font-black text-[#111318] text-base">إحصائيات ومؤشرات التوظيف</h3>
              <p className="text-[11px] text-zinc-500">نظرة عامة على نتائج المقابلات ومعدلات القبول</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-[#111318] rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto momentum-scroll text-xs">
          {/* Top Big KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#111318] text-white shadow-md border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-300 mb-2">
                <span className="text-[11px] font-bold">إجمالي الطلبات</span>
                <Users className="w-4 h-4 text-[#DC2626]" />
              </div>
              <div className="text-2xl font-black font-mono text-white tabular-nums">{total}</div>
              <div className="text-[10px] text-zinc-400 mt-1">مسجلة بالمنظومة</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-md">
              <div className="flex items-center justify-between text-emerald-50 mb-2">
                <span className="text-[11px] font-bold">معدل الاعتماد</span>
                <Percent className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-black font-mono text-white tabular-nums">%{acceptanceRate}</div>
              <div className="text-[10px] text-emerald-50 font-bold mt-1 tabular-nums">{totalApproved} مرشح مقبول</div>
            </div>
          </div>

          {/* Detailed Decision Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-zinc-500 block px-1">
              توزيع الحالات والقرارات (انقر للفلترة السريعة):
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('approved_lvl1');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-emerald-700 font-bold">مقبول مستوى أول</div>
                  <div className="text-lg font-black font-mono text-emerald-900 tabular-nums">{approvedLvl1}</div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('approved_lvl2');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-emerald-700 font-bold">مقبول مستوى ثاني</div>
                  <div className="text-lg font-black font-mono text-emerald-900 tabular-nums">{approvedLvl2}</div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('approved_proposal');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-teal-50/80 border border-teal-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-teal-800 font-bold">مقبول براتب مقترح</div>
                  <div className="text-lg font-black font-mono text-teal-950 tabular-nums">{approvedProposal}</div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('gm_pending');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-amber-800 font-bold">بانتظار المدير العام</div>
                  <div className="text-lg font-black font-mono text-amber-950 tabular-nums">{gmPending}</div>
                </div>
                <Award className="w-5 h-5 text-amber-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('dept_finance');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-zinc-700 font-bold">بإنتظار مدير ادارة الماليه</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{deptFinanceCount}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('dept_executive');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-zinc-700 font-bold">بإنتظار مدير ادارة التنفيذيه</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{deptExecutiveCount}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('dept_services');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-zinc-700 font-bold">بإنتظار مدير ادارة الخدمات</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{deptServicesCount}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('dept_production');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-zinc-700 font-bold">بإنتظار مدير ادارة الإنتاج</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{deptProductionCount}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('dept_control');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-zinc-700 font-bold">بإنتظار مدير ادارة الرقابة</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{deptControlCount}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('dept_marketing');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-zinc-700 font-bold">بإنتظار مدير ادارة التسويق</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{deptMarketingCount}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('dept_sales');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-zinc-700 font-bold">بإنتظار مدير ادارة المبيعات</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{deptSalesCount}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('dept');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-red-50/70 border border-red-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-[#B91C1C] font-bold">كافة مديري الإدارات</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{allDeptPending}</div>
                </div>
                <Building2 className="w-5 h-5 text-[#DC2626]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('hr_manager_pending');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-zinc-700 font-bold">بانتظار مدير الموارد البشرية</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{hrManagerPending}</div>
                </div>
                <Clock className="w-5 h-5 text-[#111318]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('hr_pending');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-zinc-700 font-bold">بانتظار الموارد البشرية</div>
                  <div className="text-lg font-black font-mono text-[#111318]">{hrPending}</div>
                </div>
                <Clock className="w-5 h-5 text-[#DC2626]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterByStatus('rejected');
                  onClose();
                }}
                className="p-3 rounded-2xl bg-red-50 border border-red-200 text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="text-[10px] text-[#B91C1C] font-bold">مرفوض</div>
                  <div className="text-lg font-black font-mono text-[#DC2626]">{rejected}</div>
                </div>
                <XCircle className="w-5 h-5 text-[#DC2626]" />
              </button>
            </div>
          </div>

          {/* Reset Filters CTA */}
          <button
            type="button"
            onClick={() => {
              onFilterByStatus('all');
              onClose();
            }}
            className="w-full py-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-2xl transition-colors text-center cursor-pointer shadow-xs"
          >
            عرض كافة الطلبات دون فلترة ({total})
          </button>
        </div>
      </div>
    </div>
  );
};
