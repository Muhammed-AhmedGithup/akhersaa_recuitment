import React, { useMemo } from 'react';
import { JobApplication, isApprovedStatus } from '../types';
import { DEPARTMENTS, isDeptPending } from '../utils/departments';
import {
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface DepartmentsOverviewViewProps {
  applicants: JobApplication[];
  onBackToApplications: () => void;
  onFilterByDepartment: (deptName: string) => void;
  onFilterByPosition: (position: string) => void;
}

const DEPT_ACCENTS = [
  'from-blue-600 to-indigo-600',
  'from-cyan-600 to-teal-600',
  'from-violet-600 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-sky-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-teal-600 to-cyan-600',
];

export const DepartmentsOverviewView: React.FC<DepartmentsOverviewViewProps> = ({
  applicants,
  onBackToApplications,
  onFilterByDepartment,
  onFilterByPosition,
}) => {
  const departmentStats = useMemo(() => {
    return DEPARTMENTS.map((dept, index) => {
      const deptApps = applicants.filter((a) => a.assignedDepartment === dept.name);
      const pendingInterviews = deptApps.filter((a) => isDeptPending(a.status)).length;
      const approved = deptApps.filter((a) => isApprovedStatus(a.status)).length;
      const inReview = deptApps.filter(
        (a) => !isApprovedStatus(a.status) && a.status !== 'rejected'
      ).length;

      const positionsSet = new Set<string>();
      deptApps.forEach((a) => {
        if (a.positionApplied) positionsSet.add(a.positionApplied.trim());
      });

      return {
        ...dept,
        accent: DEPT_ACCENTS[index % DEPT_ACCENTS.length],
        total: deptApps.length,
        pendingInterviews,
        approved,
        inReview,
        positionsCount: positionsSet.size,
        topPositions: Array.from(positionsSet).slice(0, 3),
      };
    });
  }, [applicants]);

  const positionStats = useMemo(() => {
    const map = new Map<
      string,
      {
        position: string;
        department: string;
        total: number;
        inReview: number;
        approved: number;
        rejected: number;
      }
    >();

    applicants.forEach((a) => {
      const pos = (a.positionApplied || '').trim() || 'وظيفة غير محددة';
      const curr = map.get(pos) || {
        position: pos,
        department: a.assignedDepartment || 'غير محدد',
        total: 0,
        inReview: 0,
        approved: 0,
        rejected: 0,
      };
      curr.total += 1;
      if (isApprovedStatus(a.status)) {
        curr.approved += 1;
      } else if (a.status === 'rejected') {
        curr.rejected += 1;
      } else {
        curr.inReview += 1;
      }
      map.set(pos, curr);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [applicants]);

  return (
    <div className="space-y-5 animate-view-enter">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToApplications}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للطلبات</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
              <span>دليل الإدارات والوظائف المعتمدة</span>
            </h1>
            <p className="text-xs text-slate-500">
              نظرة تنفيذية مباشرة على توزيع المتقدمين والمقابلات الفنية عبر إدارات الشركة الثمانية والوظائف المتاحة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 shrink-0 tabular-nums">
          <span>
            <strong className="font-mono text-blue-700">{DEPARTMENTS.length}</strong> إدارات
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>
            <strong className="font-mono text-violet-700">{positionStats.length}</strong> مسمى وظيفي
          </span>
        </div>
      </div>

      {/* Departments Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>إدارات الشركة ومديرو التقييم الفني</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {departmentStats.map((dept) => (
            <div
              key={dept.id}
              className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 shadow-soft hover:shadow-soft-md hover:border-blue-300 transition-all flex flex-col justify-between gap-4"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-l ${dept.accent}`} />

              <div className="space-y-2.5 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">إدارة {dept.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{dept.managerTitle}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${dept.accent} text-white flex items-center justify-center shrink-0 shadow-xs`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                    <div className="text-base font-black font-mono text-blue-900 tabular-nums">
                      {dept.total}
                    </div>
                    <div className="text-[10px] text-blue-700 font-semibold">الإجمالي</div>
                  </div>
                  <div className="p-2 rounded-xl bg-orange-50/80 border border-orange-100">
                    <div className="text-base font-black font-mono text-orange-800 tabular-nums">
                      {dept.pendingInterviews}
                    </div>
                    <div className="text-[10px] text-orange-700 font-semibold">مقابلات</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-100">
                    <div className="text-base font-black font-mono text-emerald-800 tabular-nums">
                      {dept.approved}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold">مقبول</div>
                  </div>
                </div>

                {dept.topPositions.length > 0 && (
                  <div className="text-[11px] text-slate-500 pt-1 truncate">
                    <span className="font-bold text-slate-700">أبرز الوظائف: </span>
                    <span>{dept.topPositions.join(' · ')}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onFilterByDepartment(dept.name)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-gradient-to-l hover:from-blue-600 hover:to-indigo-600 text-slate-800 hover:text-white border border-slate-200 hover:border-blue-600 text-xs font-bold transition-all cursor-pointer"
              >
                <span>عرض طلبات الإدارة</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Active Job Positions Table */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-violet-600" />
            <h2 className="text-sm font-black text-slate-900">الوظائف والمسميات المتقدم إليها</h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold tabular-nums">
            {positionStats.length} مسمى وظيفي
          </span>
        </div>

        {positionStats.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            لا توجد وظائف مسجلة في الطلبات الحالية بعد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-gradient-to-l from-blue-700 via-indigo-700 to-cyan-700 text-white font-bold whitespace-nowrap">
                  <th className="py-3 px-4">المسمى الوظيفي</th>
                  <th className="py-3 px-4">الإدارة المختصة</th>
                  <th className="py-3 px-4 text-center">إجمالي المتقدمين</th>
                  <th className="py-3 px-4 text-center">قيد المراجعة</th>
                  <th className="py-3 px-4 text-center">مقبول</th>
                  <th className="py-3 px-4 text-center">مرفوض</th>
                  <th className="py-3 px-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {positionStats.map((item) => (
                  <tr key={item.position} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.position}</td>
                    <td className="py-3 px-4 text-slate-600">إدارة {item.department}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-blue-700 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        {item.total}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-orange-700 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        {item.inReview}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {item.approved}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-700 tabular-nums">
                      {item.rejected}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onFilterByPosition(item.position)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        عرض الطلبات
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
