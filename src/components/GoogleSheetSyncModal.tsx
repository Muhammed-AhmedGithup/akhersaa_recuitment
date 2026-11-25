import React, { useState } from 'react';
import { parseGoogleSheetApplicants } from '../utils/csvHandler';
import { JobApplication } from '../types';
import {
  Sheet,
  Upload,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  HelpCircle,
  ArrowRight,
  Table as TableIcon,
  Users,
} from 'lucide-react';

interface GoogleSheetSyncModalProps {
  onClose: () => void;
  onImport: (newApplicants: JobApplication[], mode: 'append' | 'upsert' | 'replace') => Promise<void> | void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  onClose,
  onImport,
}) => {
  const [importMode, setImportMode] = useState<'append' | 'upsert' | 'replace'>('upsert');
  const [sheetUrl, setSheetUrl] = useState('');
  const [rawCsvText, setRawCsvText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'paste'>('url');
  const [previewApplicants, setPreviewApplicants] = useState<JobApplication[] | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>('');

  const handleParsedSuccess = (applicants: JobApplication[], source: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSourceLabel(source);
    setPreviewApplicants(applicants);
  };

  const handleConfirmImport = async () => {
    if (!previewApplicants || previewApplicants.length === 0) return;
    setIsConfirming(true);
    setErrorMsg(null);
    try {
      await onImport(previewApplicants, importMode);
      setSuccessMsg(`تمت مزامنة واستيراد ${previewApplicants.length} سجل بنجاح!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر حفظ البيانات المستوردة في قاعدة البيانات');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFetchFromUrl = async () => {
    if (!sheetUrl.trim()) {
      setErrorMsg('يرجى إدخال رابط جدول بيانات Google (CSV)');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      let fetchUrl = sheetUrl.trim();
      if (fetchUrl.includes('/spreadsheets/d/')) {
        const match = fetchUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          const sheetId = match[1];
          fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        }
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`تعذر جلب البيانات (رمز الحالة: ${res.status}). تأكد من نشر الجدول للعامة بصيغة CSV.`);
      }

      const csvContent = await res.text();
      const applicants = parseGoogleSheetApplicants(csvContent);

      if (applicants.length === 0) {
        throw new Error('لم يتم العثور على سجلات صالحة في ملف CSV المستلم. تحقق من ترويسة الأعمدة.');
      }

      handleParsedSuccess(applicants, 'رابط Google Sheets المباشر');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message ||
          'حدث خطأ أثناء جلب الجدول. تأكد من نشر الملف: ملف > مشاركة > نشر على الويب > اختر بتنسيق CSV'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const applicants = parseGoogleSheetApplicants(text);
        if (applicants.length === 0) {
          setErrorMsg('لم يتم العثور على سجلات في الملف المرفوع.');
          return;
        }
        handleParsedSuccess(applicants, `ملف CSV: ${file.name}`);
      } catch {
        setErrorMsg('فشل تحليل ملف CSV. تأكد من سلامة التنسيق.');
      }
    };
    reader.onerror = () => setErrorMsg('فشل قراءة الملف.');
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    if (!rawCsvText.trim()) {
      setErrorMsg('يرجى لصق بيانات الـ CSV أولاً');
      return;
    }
    try {
      const applicants = parseGoogleSheetApplicants(rawCsvText);
      if (applicants.length === 0) {
        setErrorMsg('لم يتم العثور على أي متقدمين في النص الملصوق.');
        return;
      }
      handleParsedSuccess(applicants, 'بيانات CSV ملصوقة يدوياً');
    } catch {
      setErrorMsg('فشل تحليل النص الملصوق.');
    }
  };

  const handleLoadUploadedSheetAsset = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/assets/aistudio/____________________-________________________Responses__a9746975');
      if (!res.ok) {
        throw new Error('تعذر قراءة ملف الاستمارة المرفوع محلياً.');
      }
      const csvText = await res.text();
      const applicants = parseGoogleSheetApplicants(csvText);
      if (applicants.length === 0) {
        throw new Error('لم يتم استخراج أي سجلات صالحة من الملف المرفوع.');
      }
      handleParsedSuccess(applicants, 'ملف ردود الاستمارة المرتبط بالنظام');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل سحب بيانات الاستمارة');
    } finally {
      setIsLoading(false);
    }
  };

  const uniquePositionsCount = previewApplicants
    ? new Set(previewApplicants.map((a) => a.positionApplied).filter(Boolean)).size
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in">
      <div className={`bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg w-full ${previewApplicants ? 'max-w-4xl' : 'max-w-2xl'} max-h-[94dvh] sm:max-h-[92vh] flex flex-col border-t sm:border border-zinc-200 overflow-hidden text-right animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0 transition-all`}>
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="bg-[#111318] text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-2 border-b-2 border-[#DC2626] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[#DC2626] rounded-xl shrink-0 shadow-sm shadow-red-600/25">
              <Sheet className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                ربط ومزامنة طلبات التوظيف مع Google Sheets
              </h2>
              <span className="text-[11px] sm:text-xs text-zinc-300 block truncate">
                {previewApplicants
                  ? `معاينة البيانات المستوردة (${previewApplicants.length} سجل) قبل الحفظ النهائي`
                  : 'استيراد وتحديث الردود تلقائياً من استمارة جوجل (صلاحية الموارد البشرية)'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {previewApplicants ? (
            /* PREVIEW & CONFIRMATION VIEW */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-700 text-white rounded-xl">
                    <TableIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-950">
                      تم سحب وقراءة البيانات بنجاح من: {sourceLabel}
                    </div>
                    <div className="text-[11px] text-emerald-800 mt-0.5 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 font-bold">
                        <Users className="w-3.5 h-3.5" />
                        {previewApplicants.length} متقدم
                      </span>
                      <span>•</span>
                      <span>{uniquePositionsCount} مسميات وظيفية</span>
                      <span>•</span>
                      <span className="font-bold">
                        الوضع:{' '}
                        {importMode === 'upsert'
                          ? 'إضافة الجديد وتحديث الحالي'
                          : importMode === 'append'
                          ? 'إضافة الجديد فقط'
                          : 'استبدال الكل'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewApplicants(null);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  disabled={isConfirming}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>تغيير المصدر</span>
                </button>
              </div>

              {/* Organized Data Table */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#111318] text-white font-bold sticky top-0 border-b-2 border-[#DC2626]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">الاسم الكامل</th>
                        <th className="py-2.5 px-3">الوظيفة المتقدم لها</th>
                        <th className="py-2.5 px-3">الهاتف</th>
                        <th className="py-2.5 px-3">المؤهل</th>
                        <th className="py-2.5 px-3">الخبرة / التجنيد</th>
                        <th className="py-2.5 px-3">الراتب المتوقع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {previewApplicants.map((app, idx) => (
                        <tr key={app.id || idx} className="hover:bg-red-50/35">
                          <td className="py-2 px-3 font-mono text-zinc-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-[#111318] whitespace-nowrap">
                            {app.fullName}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-[#111318] border border-zinc-200 font-bold text-[11px]">
                              {app.positionApplied || '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-zinc-700 whitespace-nowrap" dir="ltr">
                            {app.phone || '—'}
                          </td>
                          <td className="py-2 px-3 text-zinc-600 max-w-[160px] truncate">
                            {app.qualification || '—'}
                          </td>
                          <td className="py-2 px-3 text-zinc-600 whitespace-nowrap">
                            {app.experienceYears || '—'} {app.militaryStatus ? `• ${app.militaryStatus}` : ''}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-[#DC2626] whitespace-nowrap">
                            {app.expectedSalary || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* SOURCE SELECTION VIEW */
            <>
              {/* Quick Sync Button for Uploaded Google Sheet File */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                    <span className="font-black text-[#111318] text-xs sm:text-sm">
                      ملف الاستمارة المرتبط بالنظام متوفر وجاهز للسحب:
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    يشمل التحديث: الموقف من التجنيد، هل أنت مصلي، الراتب المتوقع، درجات رخص القيادة، والخبرات السابقة والصورة الشخصية.
                  </p>
                </div>
                <button
                  onClick={handleLoadUploadedSheetAsset}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-zinc-400 text-white rounded-xl text-xs font-black shadow-sm shadow-red-600/20 transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-white ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'جاري السحب...' : 'سحب ومعاينة بيانات الملف فوراً'}</span>
                </button>
              </div>

              {/* Form Quick Link */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#111318]">
                  <span className="w-2 h-2 rounded-full bg-[#111318]" />
                  <span>استمارة التوظيف المرتبطة:</span>
                  <span className="font-mono font-bold text-[#DC2626]">u6YCAjKZbhqJ2d929</span>
                </div>
                <a
                  href="https://forms.gle/u6YCAjKZbhqJ2d929"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-bold text-[#111318] hover:text-[#DC2626] bg-white px-3 py-1 rounded-lg border border-zinc-200 shadow-2xs transition-colors"
                >
                  <span>فتح الاستمارة</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Import Modes */}
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs space-y-2">
                <span className="font-bold text-zinc-700 block">طريقة المزامنة مع قاعدة البيانات:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${importMode === 'upsert' ? 'bg-red-50 border-[#DC2626] text-[#111318] font-bold' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'upsert'}
                      onChange={() => setImportMode('upsert')}
                      className="accent-[#DC2626]"
                    />
                    <span>إضافة الجديد وتحديث الحالي</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${importMode === 'append' ? 'bg-red-50 border-[#DC2626] text-[#111318] font-bold' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-[#DC2626]"
                    />
                    <span>إضافة الجديد فقط</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${importMode === 'replace' ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-amber-600"
                    />
                    <span>استبدال الكل بالجدول</span>
                  </label>
                </div>
              </div>

              {/* Sub Tabs */}
              <div className="flex border-b border-zinc-200 gap-4 text-xs font-bold text-zinc-600 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('url')}
                  className={`pb-2.5 border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'url'
                      ? 'border-[#DC2626] text-[#DC2626]'
                      : 'border-transparent hover:text-[#111318]'
                  }`}
                >
                  رابط مباشر (URL / Published CSV)
                </button>
                <button
                  onClick={() => setActiveTab('file')}
                  className={`pb-2.5 border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'file'
                      ? 'border-[#DC2626] text-[#DC2626]'
                      : 'border-transparent hover:text-[#111318]'
                  }`}
                >
                  رفع ملف CSV من الجهاز
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`pb-2.5 border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'paste'
                      ? 'border-[#DC2626] text-[#DC2626]'
                      : 'border-transparent hover:text-[#111318]'
                  }`}
                >
                  لصق نص CSV يدوياً
                </button>
              </div>

              {/* TAB 1: URL */}
              {activeTab === 'url' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      رابط جدول Google Sheet (نشر على الويب أو رابط المشاركة):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                        className="flex-1 text-xs p-2.5 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] font-mono text-left"
                        dir="ltr"
                      />
                      <button
                        onClick={handleFetchFromUrl}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-zinc-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-white ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'جاري السحب...' : 'سحب ومعاينة'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Steps Guide */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-600 space-y-1.5 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold text-[#111318] mb-1">
                      <HelpCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>طريقة استخراج رابط الـ CSV المباشر من Google Sheets:</span>
                    </div>
                    <p>1. افتح جدول الردود الخاص بالاستمارة في Google Sheets.</p>
                    <p>2. اضغط من القائمة العلوية على: <strong>ملف (File)</strong> &gt; <strong>مشاركة (Share)</strong> &gt; <strong>نشر على الويب (Publish to web)</strong>.</p>
                    <p>3. اختر الصيغة <strong>قيم مفصولة بفواصل (Comma-separated values .csv)</strong> واضغط <strong>نشر (Publish)</strong>.</p>
                    <p>4. انسخ الرابط المولد والصقه هنا لسحب البيانات ومعاينتها قبل الحفظ.</p>
                  </div>
                </div>
              )}

              {/* TAB 2: File Upload */}
              {activeTab === 'file' && (
                <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:border-[#DC2626] transition-colors">
                  <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#111318] mb-1">
                    اختر ملف CSV المستخرج من Google Forms / Sheets
                  </p>
                  <p className="text-[11px] text-zinc-500 mb-3">
                    يدعم كافة الأعمدة باللغة العربية والترميز UTF-8
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-white" />
                    <span>اختيار ملف من الجهاز</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* TAB 3: Paste Text */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    انسخ صفوف الـ CSV والصقها هنا:
                  </label>
                  <textarea
                    rows={5}
                    value={rawCsvText}
                    onChange={(e) => setRawCsvText(e.target.value)}
                    placeholder="Timestamp,الاسم الثلاثي / الرباعي,الرقم القومي,..."
                    className="w-full text-xs font-mono p-3 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] text-left"
                    dir="ltr"
                  />
                  <button
                    onClick={handlePasteSubmit}
                    className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    تحليل ومعاينة البيانات
                  </button>
                </div>
              )}
            </>
          )}

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-200 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          {previewApplicants && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isConfirming}
              className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-zinc-400 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm shadow-red-600/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${isConfirming ? 'animate-spin' : ''}`} />
              <span>
                {isConfirming
                  ? 'جاري الحفظ في قاعدة البيانات...'
                  : `تأكيد استيراد وحفظ (${previewApplicants.length}) سجل`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
