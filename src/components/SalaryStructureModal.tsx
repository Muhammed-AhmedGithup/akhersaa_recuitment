import React, { useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  Save,
  Loader2,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import {
  SalaryStructureConfig,
  SalaryStructureHistoryEntry,
  UserRole,
  formatSalaryAmount,
} from '../types';
import { fetchSalaryStructure, updateSalaryStructure } from '../services/apiService';

interface SalaryStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: UserRole;
  salaryStructure: SalaryStructureConfig | null;
  history: SalaryStructureHistoryEntry[];
  onSaved: (
    structure: SalaryStructureConfig,
    history: SalaryStructureHistoryEntry[],
    message: string
  ) => void;
}

export const SalaryStructureModal: React.FC<SalaryStructureModalProps> = ({
  isOpen,
  onClose,
  activeRole,
  salaryStructure,
  history,
  onSaved,
}) => {
  const [level1, setLevel1] = useState<string>('');
  const [level2, setLevel2] = useState<string>('');
  const [level3, setLevel3] = useState<string>('');
  const [currency, setCurrency] = useState<string>('ج.م');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<SalaryStructureHistoryEntry[]>(history);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setNotes('');
    setLevel1(
      typeof salaryStructure?.level1Salary === 'number' && salaryStructure.level1Salary > 0
        ? String(salaryStructure.level1Salary)
        : ''
    );
    setLevel2(
      typeof salaryStructure?.level2Salary === 'number' && salaryStructure.level2Salary > 0
        ? String(salaryStructure.level2Salary)
        : ''
    );
    setLevel3(
      typeof salaryStructure?.level3Salary === 'number' && salaryStructure.level3Salary > 0
        ? String(salaryStructure.level3Salary)
        : ''
    );
    setCurrency(salaryStructure?.currency || 'ج.م');
    setLocalHistory(history || []);

    // Fetch freshest SQL state whenever opened
    setIsRefreshing(true);
    fetchSalaryStructure(activeRole)
      .then((res) => {
        const s = res.salaryStructure;
        setLevel1(s.level1Salary && s.level1Salary > 0 ? String(s.level1Salary) : '');
        setLevel2(s.level2Salary && s.level2Salary > 0 ? String(s.level2Salary) : '');
        setLevel3(s.level3Salary && s.level3Salary > 0 ? String(s.level3Salary) : '');
        setCurrency(s.currency || 'ج.م');
        setLocalHistory(res.history || []);
      })
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  }, [isOpen, activeRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const n1 = Number(level1);
    const n2 = Number(level2);
    const n3 = Number(level3);

    if (
      !Number.isFinite(n1) ||
      !Number.isFinite(n2) ||
      !Number.isFinite(n3) ||
      n1 <= 0 ||
      n2 <= 0 ||
      n3 <= 0
    ) {
      setErrorMsg(
        'يجب إدخال قيم رقمية صحيحة أكبر من صفر لجميع المستويات الثلاثة (المستوى الأول، الثاني، الثالث).'
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateSalaryStructure(
        {
          level1Salary: Math.round(n1),
          level2Salary: Math.round(n2),
          level3Salary: Math.round(n3),
          currency: currency.trim() || 'ج.م',
          notes: notes.trim() || undefined,
        },
        activeRole
      );
      setLocalHistory(res.history || []);
      onSaved(res.salaryStructure, res.history || [], res.message);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر حفظ هيكل الرواتب في قاعدة البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg max-w-3xl w-full max-h-[92vh] flex flex-col border-t sm:border border-zinc-200 overflow-hidden text-right animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Header */}
        <div className="bg-[#111318] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b-2 border-[#DC2626]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#DC2626] text-white shadow-sm shadow-red-600/25">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                إدارة هيكل الرواتب المعتمد (3 مستويات)
              </h3>
              <p className="text-[11px] text-zinc-300 font-medium">
                صلاحية الموارد البشرية • يُستخدم تلقائياً عند اختيار المدير العام لمستوى التعيين النهائي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Current Status Banner */}
          {salaryStructure?.isApproved ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>هيكل الرواتب معتمد ومفعل حالياً في قاعدة البيانات</span>
              </div>
              {salaryStructure.updatedByName && (
                <span className="text-[11px] text-emerald-800 font-medium">
                  آخر تحديث: <strong>{salaryStructure.updatedByName}</strong> (
                  {new Date(salaryStructure.updatedAt).toLocaleString('ar-EG')})
                </span>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div>تنبيه: لم يتم إدخال واعتماد هيكل الرواتب بعد</div>
                <p className="text-[11px] font-medium text-amber-900 mt-0.5 leading-relaxed">
                  لن يتمكن المدير العام من إتمام الموافقة النهائية على أي مستوى وظيفي حتى تقوم إدارة الموارد البشرية بإدخال وحفظ رواتب المستويات الثلاثة هنا.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-3 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 3-Level Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {[
              {
                label: 'المستوى الأول (Level 1)',
                sub: 'أعلى فئة / كفاءة متميزة',
                val: level1,
                setter: setLevel1,
                accent: 'border-red-300 bg-white focus:border-[#DC2626] focus:ring-red-600/20',
                previewColor: 'text-[#DC2626]',
              },
              {
                label: 'المستوى الثاني (Level 2)',
                sub: 'الفئة القياسية المتوسطة',
                val: level2,
                setter: setLevel2,
                accent: 'border-zinc-300 bg-white focus:border-[#111318] focus:ring-zinc-900/15',
                previewColor: 'text-[#111318]',
              },
              {
                label: 'المستوى الثالث (Level 3)',
                sub: 'مستوى البداية / تحت التجربة',
                val: level3,
                setter: setLevel3,
                accent: 'border-zinc-300 bg-white focus:border-[#DC2626] focus:ring-red-600/20',
                previewColor: 'text-zinc-800',
              },
            ].map((item) => {
              const num = Number(item.val);
              const preview =
                item.val && Number.isFinite(num) && num > 0
                  ? formatSalaryAmount(num, currency || 'ج.م')
                  : 'غير محدد بعد';

              return (
                <div
                  key={item.label}
                  className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 space-y-2"
                >
                  <div>
                    <div className="text-xs font-black text-[#111318]">{item.label}</div>
                    <div className="text-[10px] text-zinc-500 font-medium">{item.sub}</div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={item.val}
                      onChange={(e) => item.setter(e.target.value)}
                      placeholder="أدخل الراتب..."
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-mono font-black text-[#111318] focus:outline-none focus:ring-2 ${item.accent}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-zinc-500">القيمة المعتمدة:</span>
                    <span
                      className={`font-mono font-bold ${
                        preview === 'غير محدد بعد' ? 'text-zinc-400' : item.previewColor
                      }`}
                    >
                      {preview}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Currency & Edit Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">العملة المعتمدة:</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="ج.م"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 text-xs font-bold text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                ملاحظات أو سبب التعديل (يُسجل في السجل):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: اعتماد سلم الرواتب الشهري الجديد للوظائف التشغيلية والإدارية"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-zinc-50 text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
              />
            </div>
          </div>

          {/* Change Log History */}
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-[#111318]">
                <History className="w-4 h-4 text-[#DC2626]" />
                <span>سجل تعديلات هيكل الرواتب</span>
              </div>
              {isRefreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
            </div>

            {localHistory.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-500">
                لا توجد تعديلات مسجلة بعد على هيكل الرواتب.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {localHistory.map((h) => (
                  <div
                    key={h.id}
                    className="bg-white rounded-xl border border-zinc-200 p-3 text-xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-[#111318]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span>{h.userName}</span>
                        <span className="text-[10px] font-mono text-zinc-400" dir="ltr">
                          ({h.userEmail})
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{h.dateArabic}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">المستوى 1:</span>
                        <span className="font-bold text-[#DC2626]">
                          {h.newValues.level1Salary ? `${h.newValues.level1Salary.toLocaleString('en-US')} ${currency}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">المستوى 2:</span>
                        <span className="font-bold text-[#111318]">
                          {h.newValues.level2Salary ? `${h.newValues.level2Salary.toLocaleString('en-US')} ${currency}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">المستوى 3:</span>
                        <span className="font-bold text-zinc-700">
                          {h.newValues.level3Salary ? `${h.newValues.level3Salary.toLocaleString('en-US')} ${currency}` : '—'}
                        </span>
                      </div>
                    </div>

                    {h.notes && (
                      <div className="text-[11px] text-zinc-600 font-medium">
                        الملاحظة: {h.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-zinc-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 min-h-[42px] bg-white hover:bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl border border-zinc-200 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 min-h-[42px] bg-[#DC2626] hover:bg-[#B91C1C] text-white font-black text-xs rounded-xl shadow-sm shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-white" />
              )}
              <span>حفظ واعتماد هيكل الرواتب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
