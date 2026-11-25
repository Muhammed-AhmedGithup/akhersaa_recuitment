import React, { useMemo, useState } from 'react';
import { JobApplication, UserRole } from '../types';
import { getStatusLabel } from '../utils/csvHandler';
import { exportApplicationsExcel } from '../services/apiService';
import { isDeptPending } from '../utils/departments';
import {
  FileSpreadsheet,
  Download,
  X,
  CheckSquare,
  Square,
  Filter,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';

interface ExcelExportModalProps {
  applicants: JobApplication[];
  activeRole: UserRole;
  onClose: () => void;
  onExportSuccess: (message: string) => void;
}

const EXPORT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'جميع الاستمارات' },
  { value: 'hr_pending', label: 'في انتظار الموارد البشرية' },
  { value: 'hr_manager_pending', label: 'في انتظار مدير الموارد البشرية' },
  { value: 'dept_pending', label: 'في انتظار مديري الإدارات' },
  { value: 'gm_pending', label: 'في انتظار المدير العام' },
  { value: 'approved', label: 'مقبول ومعتمد' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'waitlist', label: 'قائمة الانتظار' },
];

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  applicants,
  activeRole,
  onClose,
  onExportSuccess,
}) => {
  const [exportMode, setExportMode] = useState<'all_or_status' | 'selected'>('all_or_status');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const statusMatchedApplicants = useMemo(() => {
    return applicants.filter((app) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'hr_pending') return app.status === 'new' || app.status === 'hr_pending';
      if (statusFilter === 'hr_manager_pending') return app.status === 'hr_manager_pending';
      if (statusFilter === 'dept_pending') {
        return isDeptPending(app.status) || app.status === 'dept_finance_pending';
      }
      if (statusFilter === 'gm_pending') return app.status === 'gm_pending';
      if (statusFilter === 'approved') return String(app.status).startsWith('approved');
      if (statusFilter === 'rejected') return app.status === 'rejected';
      if (statusFilter === 'waitlist') return app.status === 'waitlist';
      return app.status === statusFilter;
    });
  }, [applicants, statusFilter]);

  const searchableApplicants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return statusMatchedApplicants;
    return statusMatchedApplicants.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.positionApplied.toLowerCase().includes(q) ||
        (a.phone || '').includes(q)
    );
  }, [statusMatchedApplicants, searchTerm]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      searchableApplicants.forEach((a) => next.add(a.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const targetCount =
    exportMode === 'selected' ? selectedIds.size : statusMatchedApplicants.length;

  const handleExport = async () => {
    setErrorMsg(null);
    if (exportMode === 'selected' && selectedIds.size === 0) {
      setErrorMsg('يرجى تحديد استمارة واحدة على الأقل للتصدير.');
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportApplicationsExcel(
        {
          statusFilter: exportMode === 'selected' ? 'all' : statusFilter,
          selectedIds: exportMode === 'selected' ? Array.from(selectedIds) : undefined,
        },
        activeRole
      );

      const blob = new Blob([result.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        result.filename || `استمارات_توظيف_آخر_ساعة_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onExportSuccess(result.message || `تم تصدير (${result.count}) استمارة إلى Excel بنجاح`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر تصدير البيانات إلى ملف Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg max-w-2xl w-full max-h-[94dvh] sm:max-h-[92vh] flex flex-col border-t sm:border border-zinc-200 overflow-hidden text-right animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="bg-[#111318] text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-2 border-b-2 border-[#DC2626] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[#DC2626] rounded-xl shrink-0 shadow-sm shadow-red-600/25">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                تصدير استمارات التوظيف إلى Excel
              </h2>
              <span className="text-[11px] sm:text-xs text-zinc-300 block truncate">
                تنسيق عربي كامل متوافق مع Microsoft Excel (حسب الصلاحيات المعتمدة)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Export Mode Switch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setExportMode('all_or_status')}
              className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                exportMode === 'all_or_status'
                  ? 'border-[#DC2626] bg-red-50/70 text-[#111318]'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <Filter className={`w-3.5 h-3.5 ${exportMode === 'all_or_status' ? 'text-[#DC2626]' : 'text-zinc-500'}`} />
                <span>تصدير الكل أو حسب الحالة</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                تصدير جميع الاستمارات أو تصفيتها حسب مرحلة الاعتماد
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExportMode('selected')}
              className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                exportMode === 'selected'
                  ? 'border-[#DC2626] bg-red-50/70 text-[#111318]'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <CheckSquare className={`w-3.5 h-3.5 ${exportMode === 'selected' ? 'text-[#DC2626]' : 'text-zinc-500'}`} />
                <span>تصدير استمارات محددة ({selectedIds.size})</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                اختر استمارات معينة بالاسم لتصديرها في ملف مستقل
              </p>
            </button>
          </div>

          {/* Status Filter Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700">
              تصفية حسب حالة الاستمارة:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === opt.value
                      ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Specific Selection List */}
          {exportMode === 'selected' && (
            <div className="border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="bg-zinc-50 p-2.5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="بحث بالاسم أو الوظيفة أو الهاتف..."
                    className="w-full pr-8 pl-3 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs text-[#111318] focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className="px-2.5 py-1 rounded-lg bg-red-50 text-[#DC2626] border border-red-200 font-bold hover:bg-red-100 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    تحديد الكل ({searchableApplicants.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-2.5 py-1 rounded-lg bg-zinc-200 text-zinc-700 font-bold hover:bg-zinc-300 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100">
                {searchableApplicants.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400">
                    لا توجد استمارات مطابقة للتصفية الحالية
                  </div>
                ) : (
                  searchableApplicants.map((app) => {
                    const isChecked = selectedIds.has(app.id);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => toggleSelect(app.id)}
                        className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-right transition-colors cursor-pointer ${
                          isChecked ? 'bg-red-50/60' : 'hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#DC2626] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#111318] truncate">
                              {app.fullName}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {app.positionApplied} {app.phone ? `• ${app.phone}` : ''}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
                          {getStatusLabel(app.status, app.assignedDepartment)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Error Feedback */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Summary Strip */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex items-center justify-between text-xs">
            <span className="text-zinc-600 font-medium">عدد الاستمارات الجاهزة للتصدير:</span>
            <span className="font-black text-[#DC2626] text-sm">{targetCount} استمارة</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 px-4 sm:px-6 py-3.5 border-t border-zinc-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={isExporting || targetCount === 0}
            onClick={handleExport}
            className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-zinc-400 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm shadow-red-600/20 transition-all cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التصدير...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>تنزيل ملف Excel ({targetCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
