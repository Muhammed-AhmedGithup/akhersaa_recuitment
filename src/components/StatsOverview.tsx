import React, { useState } from 'react';
import { JobApplication, isApprovedStatus } from '../types';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  UserCheck,
  Briefcase,
  Building2,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { matchesDeptFilter, isDeptPending } from '../utils/departments';

interface StatsOverviewProps {
  applicants: JobApplication[];
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  applicants,
  selectedStatus,
  onSelectStatus,
}) => {
  const total = applicants.length;
  const hrCount = applicants.filter((a) => a.status === 'new' || a.status === 'hr_pending').length;
  const hrManagerCount = applicants.filter((a) => a.status === 'hr_manager_pending').length;
  const gmCount = applicants.filter((a) => a.status === 'gm_pending').length;
  const approvedCount = applicants.filter((a) => isApprovedStatus(a.status)).length;
  const waitlistCount = applicants.filter((a) => a.status === 'waitlist').length;
  const rejectedCount = applicants.filter((a) => a.status === 'rejected').length;
  const allDeptCount = applicants.filter((a) => isDeptPending(a.status)).length;
  const inReviewCount = hrCount + hrManagerCount + allDeptCount + gmCount + waitlistCount;

  const approvedRate = total > 0 ? Math.round((approvedCount / total) * 100) : 0;
  const rejectedRate = total > 0 ? Math.round((rejectedCount / total) * 100) : 0;
  const reviewRate = total > 0 ? Math.round((inReviewCount / total) * 100) : 0;

  const executiveKpis = [
    {
      id: 'all',
      title: 'إجمالي طلبات التوظيف',
      detail: 'كافة السجلات المسجلة بالنظام',
      count: total,
      rateLabel: '100% من القاعدة',
      icon: Users,
      gradientClass: 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white border-blue-500/40',
      iconWrapClass: 'bg-white/20 text-white border border-white/25',
      subTextClass: 'text-blue-100',
      dividerClass: 'border-white/20',
      activeRingClass: 'ring-4 ring-blue-500/30 shadow-lg shadow-blue-600/25 -translate-y-0.5',
      normalHoverClass: 'shadow-md shadow-blue-600/15 hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5',
    },
    {
      id: 'in_review',
      title: 'الطلبات قيد المراجعة',
      detail: `HR (${hrCount + hrManagerCount}) · إدارات (${allDeptCount}) · عام (${gmCount})`,
      count: inReviewCount,
      rateLabel: `${reviewRate}% قيد الإجراء`,
      icon: Clock,
      gradientClass: 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white border-orange-400/40',
      iconWrapClass: 'bg-white/20 text-white border border-white/25',
      subTextClass: 'text-orange-50',
      dividerClass: 'border-white/20',
      activeRingClass: 'ring-4 ring-orange-500/30 shadow-lg shadow-orange-500/25 -translate-y-0.5',
      normalHoverClass: 'shadow-md shadow-orange-500/15 hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5',
    },
    {
      id: 'approved',
      title: 'الطلبات المقبولة',
      detail: 'معتمد نهائياً بالراتب المقرر',
      count: approvedCount,
      rateLabel: `${approvedRate}% نسبة القبول`,
      icon: CheckCircle2,
      gradientClass: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white border-emerald-400/40',
      iconWrapClass: 'bg-white/20 text-white border border-white/25',
      subTextClass: 'text-emerald-50',
      dividerClass: 'border-white/20',
      activeRingClass: 'ring-4 ring-emerald-500/30 shadow-lg shadow-emerald-600/25 -translate-y-0.5',
      normalHoverClass: 'shadow-md shadow-emerald-600/15 hover:shadow-lg hover:shadow-emerald-600/25 hover:-translate-y-0.5',
    },
    {
      id: 'rejected',
      title: 'الطلبات المرفوضة',
      detail: 'طلبات غير مطابقة للشروط',
      count: rejectedCount,
      rateLabel: `${rejectedRate}% من الإجمالي`,
      icon: XCircle,
      gradientClass: 'bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white border-rose-400/40',
      iconWrapClass: 'bg-white/20 text-white border border-white/25',
      subTextClass: 'text-rose-50',
      dividerClass: 'border-white/20',
      activeRingClass: 'ring-4 ring-rose-500/30 shadow-lg shadow-rose-600/25 -translate-y-0.5',
      normalHoverClass: 'shadow-md shadow-rose-600/15 hover:shadow-lg hover:shadow-rose-600/25 hover:-translate-y-0.5',
    },
  ];

  const pipelineStages = [
    {
      id: 'hr',
      label: '1. الموارد البشرية',
      count: hrCount,
      icon: UserCheck,
      activeStyle: 'bg-gradient-to-l from-cyan-600 to-sky-600 text-white border-cyan-600 shadow-sm shadow-cyan-600/25',
      normalStyle: 'bg-cyan-50/70 text-cyan-900 border-cyan-200 hover:bg-cyan-100/70 hover:border-cyan-400',
      iconColor: 'text-cyan-600',
      badgeNormal: 'bg-white text-cyan-800 border-cyan-200',
    },
    {
      id: 'hr_manager',
      label: '2. مدير الموارد البشرية',
      count: hrManagerCount,
      icon: Briefcase,
      activeStyle: 'bg-gradient-to-l from-teal-600 to-emerald-600 text-white border-teal-600 shadow-sm shadow-teal-600/25',
      normalStyle: 'bg-teal-50/70 text-teal-900 border-teal-200 hover:bg-teal-100/70 hover:border-teal-400',
      iconColor: 'text-teal-600',
      badgeNormal: 'bg-white text-teal-800 border-teal-200',
    },
    {
      id: 'dept',
      label: '3. المقابلات الفنية (الإدارات)',
      count: allDeptCount,
      icon: ShieldCheck,
      activeStyle: 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white border-blue-600 shadow-sm shadow-blue-600/25',
      normalStyle: 'bg-blue-50/70 text-blue-900 border-blue-200 hover:bg-blue-100/70 hover:border-blue-400',
      iconColor: 'text-blue-600',
      badgeNormal: 'bg-white text-blue-800 border-blue-200',
    },
    {
      id: 'gm',
      label: '4. اعتماد المدير العام',
      count: gmCount,
      icon: Award,
      activeStyle: 'bg-gradient-to-l from-violet-600 to-purple-600 text-white border-violet-600 shadow-sm shadow-violet-600/25',
      normalStyle: 'bg-violet-50/70 text-violet-900 border-violet-200 hover:bg-violet-100/70 hover:border-violet-400',
      iconColor: 'text-violet-600',
      badgeNormal: 'bg-white text-violet-800 border-violet-200',
    },
    {
      id: 'waitlist',
      label: 'قائمة الانتظار',
      count: waitlistCount,
      icon: Clock,
      activeStyle: 'bg-gradient-to-l from-purple-600 to-fuchsia-600 text-white border-purple-600 shadow-sm shadow-purple-600/25',
      normalStyle: 'bg-purple-50/70 text-purple-900 border-purple-200 hover:bg-purple-100/70 hover:border-purple-400',
      iconColor: 'text-purple-600',
      badgeNormal: 'bg-white text-purple-800 border-purple-200',
    },
  ];

  const departmentCards = [
    {
      id: 'dept_finance',
      title: 'الإدارة المالية',
      subtitle: 'الحسابات والخزينة',
      count: applicants.filter((a) => matchesDeptFilter(a, 'dept_finance')).length,
      iconBg: 'bg-emerald-100 text-emerald-700',
      activeBg: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-600',
    },
    {
      id: 'dept_executive',
      title: 'الإدارة التنفيذية',
      subtitle: 'التشغيل والعمليات',
      count: applicants.filter((a) => matchesDeptFilter(a, 'dept_executive')).length,
      iconBg: 'bg-indigo-100 text-indigo-700',
      activeBg: 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-indigo-600',
    },
    {
      id: 'dept_tech',
      title: 'إدارة التقنية',
      subtitle: 'نظم المعلومات والدعم',
      count: applicants.filter((a) => matchesDeptFilter(a, 'dept_tech')).length,
      iconBg: 'bg-cyan-100 text-cyan-700',
      activeBg: 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white border-cyan-600',
    },
    {
      id: 'dept_services',
      title: 'إدارة الخدمات',
      subtitle: 'الصالة والديليفري',
      count: applicants.filter((a) => matchesDeptFilter(a, 'dept_services')).length,
      iconBg: 'bg-sky-100 text-sky-700',
      activeBg: 'bg-gradient-to-br from-sky-600 to-blue-700 text-white border-sky-600',
    },
    {
      id: 'dept_production',
      title: 'إدارة الإنتاج',
      subtitle: 'المطبخ وخطوط الإنتاج',
      count: applicants.filter((a) => matchesDeptFilter(a, 'dept_production')).length,
      iconBg: 'bg-orange-100 text-orange-700',
      activeBg: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white border-orange-500',
    },
    {
      id: 'dept_control',
      title: 'إدارة الرقابة',
      subtitle: 'الجودة والتفتيش',
      count: applicants.filter((a) => matchesDeptFilter(a, 'dept_control')).length,
      iconBg: 'bg-rose-100 text-rose-700',
      activeBg: 'bg-gradient-to-br from-rose-600 to-red-700 text-white border-rose-600',
    },
    {
      id: 'dept_marketing',
      title: 'إدارة التسويق',
      subtitle: 'التسويق والدعاية',
      count: applicants.filter((a) => matchesDeptFilter(a, 'dept_marketing')).length,
      iconBg: 'bg-violet-100 text-violet-700',
      activeBg: 'bg-gradient-to-br from-violet-600 to-purple-700 text-white border-violet-600',
    },
    {
      id: 'dept_sales',
      title: 'إدارة المبيعات',
      subtitle: 'المبيعات والكول سنتر',
      count: applicants.filter((a) => matchesDeptFilter(a, 'dept_sales')).length,
      iconBg: 'bg-teal-100 text-teal-700',
      activeBg: 'bg-gradient-to-br from-teal-600 to-cyan-700 text-white border-teal-600',
    },
  ];

  const isAnyDeptSelected = selectedStatus === 'dept' || selectedStatus.startsWith('dept_');
  const [deptsExpanded, setDeptsExpanded] = useState(false);

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Primary 4 Vibrant Gradient Executive KPI Stat Cards (2x2 Mobile, 4x1 Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {executiveKpis.map((kpi) => {
          const Icon = kpi.icon;
          const isSelected = selectedStatus === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => onSelectStatus(kpi.id)}
              className={`relative overflow-hidden w-full min-w-0 p-4 sm:p-5 rounded-2xl border text-right transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                kpi.gradientClass
              } ${isSelected ? kpi.activeRingClass : kpi.normalHoverClass}`}
            >
              {/* Subtle Decorative Sheen */}
              <div className="pointer-events-none absolute -top-10 -left-10 w-28 h-28 rounded-full bg-white/10" />

              <div className="relative flex items-start justify-between gap-2.5 w-full mb-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-black text-white leading-snug truncate">
                    {kpi.title}
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 truncate ${kpi.subTextClass}`}>
                    {kpi.detail}
                  </div>
                </div>
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-xs ${kpi.iconWrapClass}`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div className={`relative flex items-baseline justify-between gap-2 w-full pt-2.5 border-t ${kpi.dividerClass}`}>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums text-white">
                  {kpi.count}
                </div>
                <span className="text-[11px] font-bold text-white/90 tabular-nums truncate">
                  {kpi.rateLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Pipeline Stages & Department Filter Panel */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Interactive Pipeline Stages Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-black text-slate-800 ml-1.5 whitespace-nowrap">
              مراحل الاعتماد:
            </span>
            {pipelineStages.map((stage) => {
              const StageIcon = stage.icon;
              const active = selectedStatus === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onSelectStatus(active ? 'all' : stage.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    active ? stage.activeStyle : stage.normalStyle
                  }`}
                >
                  <StageIcon
                    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : stage.iconColor}`}
                  />
                  <span>{stage.label}</span>
                  <span
                    className={`font-mono text-[11px] font-black px-1.5 py-0.2 rounded-md tabular-nums ${
                      active ? 'bg-white/20 text-white' : `${stage.badgeNormal} border`
                    }`}
                  >
                    {stage.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Toggle Department Sub-Filters */}
          <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            {isAnyDeptSelected && (
              <button
                type="button"
                onClick={() => onSelectStatus('all')}
                className="text-[11px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-colors"
              >
                إلغاء فلتر الإدارة
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeptsExpanded((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                deptsExpanded || isAnyDeptSelected
                  ? 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/60'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${deptsExpanded || isAnyDeptSelected ? 'text-white' : 'text-blue-600'}`} />
              <span>تصفية حسب الإدارة ({allDeptCount})</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  deptsExpanded || isAnyDeptSelected ? 'rotate-180 text-white' : 'text-slate-500'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Collapsible 8-Department Grid */}
        {(deptsExpanded || isAnyDeptSelected) && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 animate-in fade-in">
            {departmentCards.map((c) => {
              const isSelected = selectedStatus === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectStatus(isSelected ? 'all' : c.id)}
                  className={`w-full min-w-0 p-2.5 rounded-xl border text-right transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? `${c.activeBg} shadow-sm`
                      : 'bg-slate-50/70 border-slate-200 text-slate-900 hover:bg-white hover:border-blue-400 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-2 w-full">
                    <span
                      className={`text-[11px] font-bold leading-snug min-w-0 line-clamp-2 ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {c.title}
                    </span>
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : c.iconBg
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between mt-auto gap-1 w-full">
                    <span
                      className={`text-lg font-black font-mono tabular-nums ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {c.count}
                    </span>
                    <span
                      className={`text-[10px] font-medium truncate ${
                        isSelected ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {c.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
