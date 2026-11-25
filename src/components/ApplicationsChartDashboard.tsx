import React, { useState, useMemo } from 'react';
import { JobApplication, isApprovedStatus } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ApplicationsChartDashboardProps {
  applicants: JobApplication[];
  onFilterStatus?: (statusCategory: string) => void;
}

export const ApplicationsChartDashboard: React.FC<ApplicationsChartDashboardProps> = ({
  applicants,
  onFilterStatus,
}) => {
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut');
  const [isExpanded, setIsExpanded] = useState(true);

  // Grouping status counts
  const stats = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    let waitlist = 0;
    let pendingReview = 0;

    let lvl1 = 0;
    let lvl2 = 0;
    let lvl3 = 0;
    let proposalCount = 0;

    applicants.forEach((a) => {
      if (a.status === 'approved_lvl1') {
        approved++;
        lvl1++;
      } else if (a.status === 'approved_lvl2') {
        approved++;
        lvl2++;
      } else if (a.status === 'approved_lvl3') {
        approved++;
        lvl3++;
      } else if (isApprovedStatus(a.status)) {
        approved++;
        proposalCount++;
      } else if (a.status === 'rejected') {
        rejected++;
      } else if (a.status === 'waitlist') {
        waitlist++;
      } else {
        pendingReview++;
      }
    });

    const total = applicants.length || 1;

    // Main 3 categories requested: مقبول، مرفوض، قيد الانتظار / المراجعة
    const mainDistribution = [
      {
        name: 'مقبول (معتمد)',
        key: 'approved',
        value: approved,
        percentage: Math.round((approved / total) * 100),
        color: '#10B981', // Emerald
      },
      {
        name: 'قيد الانتظار / المراجعة',
        key: 'in_review',
        value: waitlist + pendingReview,
        percentage: Math.round(((waitlist + pendingReview) / total) * 100),
        color: '#F97316', // Orange
      },
      {
        name: 'مرفوض',
        key: 'rejected',
        value: rejected,
        percentage: Math.round((rejected / total) * 100),
        color: '#F43F5E', // Rose Red
      },
    ];

    // Detailed breakdown
    const detailedData = [
      { stage: 'مستوى أول', count: lvl1, fill: '#2563EB' }, // Royal Blue
      { stage: 'مستوى ثاني', count: lvl2, fill: '#0891B2' }, // Cyan
      { stage: 'مستوى ثالث', count: lvl3, fill: '#10B981' }, // Emerald
      { stage: 'راتب مقترح', count: proposalCount, fill: '#0D9488' }, // Teal
      { stage: 'قيد المراجعة', count: pendingReview, fill: '#F97316' }, // Orange
      { stage: 'قائمة انتظار', count: waitlist, fill: '#7C3AED' }, // Violet
      { stage: 'مرفوض', count: rejected, fill: '#E11D48' }, // Rose Red
    ];

    return {
      approved,
      rejected,
      waitlist: waitlist + pendingReview,
      pureWaitlist: waitlist,
      pendingReview,
      total: applicants.length,
      mainDistribution,
      detailedData,
    };
  }, [applicants]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg border border-blue-500/30 text-right">
          <p className="font-bold flex items-center gap-1.5 justify-end">
            <span>{data.name || data.stage}</span>
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: data.color || data.fill }}
            />
          </p>
          <p className="text-slate-300 mt-1">
            العدد: <span className="font-mono font-bold text-white tabular-nums">{data.value ?? data.count}</span> طلب
            {data.percentage !== undefined && (
              <span className="text-cyan-300 font-mono font-bold mr-1.5 tabular-nums">({data.percentage}%)</span>
            )}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden text-right transition-all">
      {/* Top Accent Bar */}
      <div className="h-1 w-full bg-gradient-to-l from-blue-600 via-cyan-500 to-violet-600" />

      {/* Dashboard Card Header */}
      <div className="p-4 bg-gradient-to-l from-slate-50 to-blue-50/40 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-slate-900 text-sm">
                مخطط توزيع قرارات الطلبات والتحليلات
              </h3>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-xs font-bold text-blue-700 font-mono tabular-nums">
                {stats.total} طلب
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              توزيع إحصائي مباشر لحالات القبول والرفض وقوائم الانتظار
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart View Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartType === 'donut'
                  ? 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span className="text-[11px]">دائري</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="text-[11px]">أعمدة</span>
            </button>
          </div>

          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? 'طي المخطط' : 'توسيع المخطط'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* KPI Badges Summary */}
            <div className="lg:col-span-5 grid grid-cols-3 gap-2.5 text-xs">
              {/* Approved Card */}
              <button
                type="button"
                onClick={() => onFilterStatus && onFilterStatus('approved')}
                className="bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl p-3 text-right transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-emerald-800 mb-1">
                  <span className="text-[11px] font-bold">مقبول</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-black font-mono text-emerald-950 tabular-nums">
                  {stats.approved}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 tabular-nums">
                  {Math.round((stats.approved / (stats.total || 1)) * 100)}% من الإجمالي
                </div>
              </button>

              {/* Waiting / Pending Card */}
              <button
                type="button"
                onClick={() => onFilterStatus && onFilterStatus('in_review')}
                className="bg-orange-50/80 hover:bg-orange-100/80 border border-orange-200 rounded-xl p-3 text-right transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-orange-900 mb-1">
                  <span className="text-[11px] font-bold">قيد المراجعة</span>
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-xl font-black font-mono text-orange-950 tabular-nums">
                  {stats.waitlist}
                </div>
                <div className="text-[10px] text-orange-700 font-semibold mt-0.5 tabular-nums">
                  {Math.round((stats.waitlist / (stats.total || 1)) * 100)}% من الإجمالي
                </div>
              </button>

              {/* Rejected Card */}
              <button
                type="button"
                onClick={() => onFilterStatus && onFilterStatus('rejected')}
                className="bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200 rounded-xl p-3 text-right transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-rose-800 mb-1">
                  <span className="text-[11px] font-bold">مرفوض</span>
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-xl font-black font-mono text-rose-950 tabular-nums">
                  {stats.rejected}
                </div>
                <div className="text-[10px] text-rose-700 font-semibold mt-0.5 tabular-nums">
                  {Math.round((stats.rejected / (stats.total || 1)) * 100)}% من الإجمالي
                </div>
              </button>

              {/* Mini Legend & Click Instruction */}
              <div className="col-span-3 bg-gradient-to-l from-blue-50/70 to-violet-50/70 border border-blue-100 rounded-xl p-2.5 text-[11px] text-slate-600 flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  اضغط على أي فئة لتصفية الجدول فوراً
                </span>
                <span className="font-bold text-blue-800 tabular-nums">
                  نسبة القبول: {Math.round((stats.approved / (stats.total || 1)) * 100)}%
                </span>
              </div>
            </div>

            {/* Visual Recharts Area */}
            <div className="lg:col-span-7 h-52 sm:h-56 w-full flex items-center justify-center">
              {chartType === 'donut' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={stats.mainDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="value"
                      animationDuration={800}
                    >
                      {stats.mainDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="cursor-pointer outline-none hover:opacity-85 transition-opacity"
                          onClick={() => onFilterStatus && onFilterStatus(entry.key)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-[11px] font-bold text-slate-700 px-1">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.detailedData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="stage"
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#475569', fontSize: 10 }}
                      width={28}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    >
                      {stats.detailedData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
