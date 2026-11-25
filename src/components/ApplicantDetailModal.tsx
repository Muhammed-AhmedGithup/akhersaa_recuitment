import React, { useState, useEffect } from 'react';
import {
  JobApplication,
  UserRole,
  SalaryStructureConfig,
  formatSalaryAmount,
  getApplicationSalaryForLevel,
  finalSalarySourceToLabel,
  isApprovedStatus,
} from '../types';
import { parseEgyptianNationalId } from '../utils/nationalId';
import { getStatusLabel } from '../utils/csvHandler';
import { getApplicantPhoto } from './ApplicantAvatar';
import { ElectronicSignatureBadge } from './ElectronicSignatureBadge';
import { getRoleDisplayTitle } from '../utils/departments';
import {
  X,
  Phone,
  MessageCircle,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Printer,
  Edit3,
  Award,
  Clock,
  UserCheck,
  ShieldCheck,
  Copy,
  Check,
  Trash2,
  Bot,
  Building2,
  Edit,
  Lock,
} from 'lucide-react';

interface ApplicantDetailModalProps {
  applicant: JobApplication;
  activeRole: UserRole;
  salaryStructure?: SalaryStructureConfig | null;
  onClose: () => void;
  onOpenEvaluation: () => void;
  onPrint: () => void;
  onQuickStatusChange: (status: JobApplication['status']) => void;
  onDelete?: (id: string, name: string) => void;
  onEdit?: (applicant: JobApplication) => void;
  onConsultAI?: (applicant: JobApplication) => void;
}

export const ApplicantDetailModal: React.FC<ApplicantDetailModalProps> = ({
  applicant,
  onClose,
  onOpenEvaluation,
  onPrint,
  onDelete,
  onEdit,
  onConsultAI,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'evaluation' | 'history'>('profile');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);

  const nationalInfo = parseEgyptianNationalId(applicant.nationalId);
  const resolvedPhoto = getApplicantPhoto(applicant);
  const showPhoto = Boolean(resolvedPhoto && !photoError);

  useEffect(() => {
    setPhotoError(false);
  }, [applicant.id, resolvedPhoto]);

  // Clean Egyptian phone number for WhatsApp
  const cleanPhone = (applicant.phone || '').replace(/[^0-9]/g, '');
  const waNumber = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
  const waMessage = encodeURIComponent(
    `مرحباً أستاذ ${applicant.fullName}، بخصوص طلب التوظيف المقدم لشركة آخر ساعة إسبشيال لشغل وظيفة (${applicant.positionApplied})...`
  );

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg max-w-4xl w-full max-h-[94vh] sm:max-h-[92vh] flex flex-col border-t sm:border border-zinc-200 overflow-hidden text-right animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/25" />
        </div>

        {/* Header */}
        <div className="bg-[#111318] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-[#DC2626]">
          <div className="flex items-start justify-between gap-2.5 min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {showPhoto && resolvedPhoto ? (
                <a
                  href={resolvedPhoto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group block shrink-0"
                  title="اضغط لفتح الصورة الشخصية بالحجم الكامل"
                >
                  <img
                    src={resolvedPhoto}
                    alt={applicant.fullName}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl object-cover border-2 border-[#DC2626] shadow-md group-hover:border-white transition-all"
                    onError={() => setPhotoError(true)}
                  />
                </a>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#DC2626] border border-red-400/40 flex items-center justify-center text-white font-black text-xl shadow-sm shrink-0">
                  {applicant.fullName.charAt(0) || 'م'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight">{applicant.fullName}</h2>
                  <span className="text-[11px] bg-white/10 border border-white/20 px-2 py-0.5 rounded-md font-mono font-bold text-red-200">
                    {applicant.recordNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    applicant.status.startsWith('approved')
                      ? 'bg-emerald-600 text-white'
                      : applicant.status === 'rejected'
                      ? 'bg-[#DC2626] text-white'
                      : applicant.status === 'waitlist'
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-700 text-zinc-100 border border-zinc-600'
                  }`}>
                    {getStatusLabel(applicant.status, applicant.assignedDepartment)}
                  </span>
                  {applicant.militaryStatus && (
                    <span className="hidden sm:inline-block bg-white/10 text-zinc-200 border border-white/15 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      التجنيد: {applicant.militaryStatus}
                    </span>
                  )}
                  {applicant.isPraying && (
                    <span className="hidden sm:inline-block bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      مصلي: {applicant.isPraying}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-zinc-300 mt-1 flex-wrap">
                  <span className="text-red-300 font-bold">{applicant.positionApplied}</span>
                  {applicant.expectedSalary && (
                    <span className="text-emerald-200 font-mono font-bold bg-white/10 border border-white/15 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px]">
                      الراتب: {applicant.expectedSalary}
                    </span>
                  )}
                  {applicant.assignedDepartment && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-zinc-100 bg-white/10 border border-white/15 px-2 py-0.5 rounded-md">
                      <Building2 className="w-3 h-3 text-red-300" />
                      <span>إدارة {applicant.assignedDepartment}</span>
                    </span>
                  )}
                  <span className="hidden sm:inline text-zinc-500">•</span>
                  <span className="hidden sm:inline font-mono text-zinc-400">ورد: {applicant.timestamp}</span>
                  {applicant.lastActionDate && (
                    <>
                      <span className="hidden sm:inline text-zinc-500">•</span>
                      <span className="text-zinc-200 font-bold font-mono">آخر إجراء: {applicant.lastActionDate}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="إغلاق النافذة"
              className="sm:hidden min-w-[40px] min-h-[40px] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end shrink-0">
            {onConsultAI && (
              <button
                type="button"
                onClick={() => {
                  onConsultAI(applicant);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black border border-white/20 shadow-xs transition-transform active:scale-95 cursor-pointer"
                title="تحليل شامل للمرشح بواسطة المساعد الذكي"
              >
                <Bot className="w-4 h-4 text-red-300" />
                <span>استشارة AI</span>
              </button>
            )}
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-colors cursor-pointer"
              title="طباعة الاستمارة"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">طباعة الاستمارة</span>
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(applicant);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-white/10 hover:bg-white/20 text-zinc-100 hover:text-white rounded-xl text-xs font-bold border border-white/20 transition-colors cursor-pointer"
                title="تعديل استمارة طلب التوظيف بالكامل"
              >
                <Edit className="w-3.5 h-3.5 text-red-300" />
                <span className="hidden sm:inline">تعديل الاستمارة</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(applicant.id, applicant.fullName);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold border border-red-500/40 transition-colors cursor-pointer"
                title="حذف ملف المتقدم نهائياً من قاعدة البيانات"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">حذف من السجلات</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="إغلاق النافذة"
              className="hidden sm:inline-flex p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab & Action Toolbar */}
        <div className="bg-zinc-50 px-4 sm:px-6 py-2.5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="w-full sm:w-auto flex items-center gap-1 bg-zinc-200/75 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-[#111318]'
              }`}
            >
              بيانات المتقدم واستمارة Google
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'evaluation'
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-[#111318]'
              }`}
            >
              سجل قرارات الإدارة الثلاثية
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'history'
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-[#111318]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>سجل الاعتمادات ({applicant.approvalHistory?.length || 0})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onOpenEvaluation}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl font-black text-xs shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5 text-white" />
              <span>تقييم واعتماد الطلب</span>
            </button>

            {applicant.phone && (
              <>
                <a
                  href={`https://wa.me/${waNumber}?text=${waMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs shrink-0"
                  title="واتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">واتساب</span>
                </a>
                <a
                  href={`tel:${applicant.phone}`}
                  className="flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 bg-[#111318] hover:bg-zinc-800 text-white rounded-xl font-bold text-xs shadow-2xs shrink-0"
                  title="اتصال"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">اتصال</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm">
          {activeTab === 'profile' ? (
            <>
              {/* National ID Intelligence Card */}
              {nationalInfo.isValid && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#111318] font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                    <span>تحليل الرقم القومي المصري:</span>
                    <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-zinc-300 text-[#111318] font-bold text-sm">
                      {applicant.nationalId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(applicant.nationalId, 'nid')}
                      className="text-zinc-400 hover:text-[#DC2626] p-1"
                      title="نسخ الرقم القومي"
                    >
                      {copiedField === 'nid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-zinc-700 text-xs font-semibold flex-wrap">
                    <span>العمر: <strong className="font-black text-[#111318]">{nationalInfo.age} سنة</strong></span>
                    <span>المحافظة: <strong className="font-black text-[#111318]">{nationalInfo.governorate}</strong></span>
                    <span>النوع: <strong className="font-black text-[#111318]">{nationalInfo.gender}</strong></span>
                    <span>الميلاد: <strong className="font-mono font-bold text-[#111318]">{nationalInfo.birthDate}</strong></span>
                  </div>
                </div>
              )}

              {/* Section 1: Personal Information */}
              <div className="space-y-3">
                <h3 className="font-black text-[#111318] text-sm flex items-center gap-2 border-b border-zinc-200 pb-2">
                  <GraduationCap className="w-4 h-4 text-[#DC2626]" />
                  <span>1. البيانات الشخصية والمؤهل الدراسي</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">الاسم الثلاثي / الرباعي:</span>
                    <span className="font-black text-[#111318] text-sm">{applicant.fullName}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">رقم الهاتف:</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#111318] text-sm">{applicant.phone || '—'}</span>
                      {applicant.phone && (
                        <button
                          onClick={() => copyToClipboard(applicant.phone, 'phone')}
                          className="text-zinc-400 hover:text-[#DC2626] p-0.5"
                          title="نسخ رقم الهاتف"
                        >
                          {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">المؤهل الدراسي:</span>
                    <span className="font-bold text-[#111318]">{applicant.qualification || '—'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">تاريخ الميلاد:</span>
                    <span className="font-mono font-semibold text-zinc-800">{applicant.birthDate || '—'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">النوع والحالة الاجتماعية:</span>
                    <span className="font-bold text-[#111318]">{applicant.gender || '—'} • {applicant.maritalStatus || '—'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">تاريخ المؤهل:</span>
                    <span className="font-mono text-zinc-800">{applicant.qualificationDate || '—'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80 sm:col-span-2">
                    <span className="text-zinc-500 block mb-1">العنوان بالتفصيل:</span>
                    <span className="font-medium text-[#111318]">{applicant.address || '—'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">رقم الطوارئ / صلة القرابة:</span>
                    <span className="font-semibold text-[#111318]">{applicant.emergencyContact || '—'}</span>
                  </div>

                  <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                    <span className="text-zinc-600 font-bold block mb-1">الموقف من التجنيد:</span>
                    <span className="font-black text-[#111318] text-sm">{applicant.militaryStatus || '—'}</span>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40">
                    <span className="text-emerald-800 font-bold block mb-1">هل أنت مصلي؟:</span>
                    <span className="font-black text-emerald-700 text-sm">{applicant.isPraying || '—'}</span>
                  </div>

                  <div className="p-3 rounded-xl border border-red-200 bg-red-50/40">
                    <span className="text-[#991B1B] font-bold block mb-1">الراتب المتوقع:</span>
                    <span className="font-black font-mono text-[#111318] text-sm">{applicant.expectedSalary || '—'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80 sm:col-span-3">
                    <span className="text-zinc-500 block mb-1">معارف داخل شركة آخر ساعة إسبشيال:</span>
                    <span className="font-bold text-[#111318]">{applicant.internalReferrals || 'لا يوجد'}</span>
                  </div>

                  {resolvedPhoto && (
                    <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 sm:col-span-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {!photoError ? (
                          <img
                            src={resolvedPhoto}
                            alt="صورة شخصية"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-xl object-cover border border-zinc-300 shadow-xs shrink-0"
                            onError={() => setPhotoError(true)}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-[#111318] border border-zinc-700 flex items-center justify-center text-white font-black text-lg shrink-0">
                            {applicant.fullName.charAt(0) || 'م'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-zinc-700 font-bold block text-xs">الصورة الشخصية للمرشح</span>
                          <span className="text-zinc-400 text-[11px] font-mono break-all line-clamp-1" dir="ltr">
                            {resolvedPhoto}
                          </span>
                        </div>
                      </div>
                      <a
                        href={resolvedPhoto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-[#111318] hover:bg-zinc-800 text-white rounded-lg font-bold text-xs shrink-0 shadow-xs"
                      >
                        فتح الصورة كاملة ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Previous Work Experience (Job 1, Job 2, Job 3) */}
              <div className="space-y-4">
                <h3 className="font-black text-[#111318] text-sm flex items-center gap-2 border-b border-zinc-200 pb-2">
                  <Briefcase className="w-4 h-4 text-[#DC2626]" />
                  <span>2. الخبرات العملية والوظائف السابقة</span>
                </h3>

                {/* Job 1 */}
                <div className="bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                    <span className="font-black text-[#111318] text-xs">جهة العمل السابقة الأولى (1)</span>
                    {applicant.prevSalary && (
                      <span className="text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                        الراتب: {applicant.prevSalary}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 block mb-0.5">اسم الشركة:</span>
                      <span className="font-black text-[#111318]">{applicant.prevCompany || '—'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">المسمى الوظيفي:</span>
                      <span className="font-bold text-[#111318]">{applicant.prevPosition || '—'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">سنوات / فترة الخبرة:</span>
                      <span className="font-bold text-[#111318]">{applicant.experienceYears || '—'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">المدير المباشر وهاتفه:</span>
                      <span className="font-semibold text-[#111318]">{applicant.prevManager || '—'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">ساعات العمل اليومية:</span>
                      <span className="font-mono text-[#111318]">{applicant.workHours || '—'}</span>
                    </div>
                    <div className="sm:col-span-3">
                      <span className="text-zinc-500 block mb-0.5">سبب ترك العمل:</span>
                      <span className="font-medium text-[#111318]">{applicant.reasonForLeaving || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Job 2 (if present) */}
                {(applicant.prevCompany2 || applicant.prevPosition2 || applicant.prevManager2 || applicant.experienceYears2) && (
                  <div className="bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                      <span className="font-black text-[#111318] text-xs">جهة العمل السابقة الثانية (2)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 block mb-0.5">اسم الشركة:</span>
                        <span className="font-black text-[#111318]">{applicant.prevCompany2 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">المسمى الوظيفي:</span>
                        <span className="font-bold text-[#111318]">{applicant.prevPosition2 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">الفترة / عدد السنين:</span>
                        <span className="font-bold text-[#111318]">{applicant.experienceYears2 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">المدير المباشر ورقم هاتفه:</span>
                        <span className="font-semibold text-[#111318]">{applicant.prevManager2 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">ساعات العمل اليومية:</span>
                        <span className="font-mono text-[#111318]">{applicant.workHours2 || '—'}</span>
                      </div>
                      <div className="sm:col-span-3">
                        <span className="text-zinc-500 block mb-0.5">سبب ترك العمل:</span>
                        <span className="font-medium text-[#111318]">{applicant.reasonForLeaving2 || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Job 3 (if present) */}
                {(applicant.prevCompany3 || applicant.prevPosition3 || applicant.prevManager3 || applicant.experienceYears3) && (
                  <div className="bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                      <span className="font-black text-[#111318] text-xs">جهة العمل السابقة الثالثة (3)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 block mb-0.5">اسم الشركة:</span>
                        <span className="font-black text-[#111318]">{applicant.prevCompany3 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">المسمى الوظيفي:</span>
                        <span className="font-bold text-[#111318]">{applicant.prevPosition3 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">الفترة / عدد السنين:</span>
                        <span className="font-bold text-[#111318]">{applicant.experienceYears3 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">المدير المباشر ورقم هاتفه:</span>
                        <span className="font-semibold text-[#111318]">{applicant.prevManager3 || '—'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-zinc-500 block mb-0.5">سبب ترك العمل:</span>
                        <span className="font-medium text-[#111318]">{applicant.reasonForLeaving3 || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Skills, Health & Social */}
              <div className="space-y-3">
                <h3 className="font-black text-[#111318] text-sm flex items-center gap-2 border-b border-zinc-200 pb-2">
                  <HeartPulse className="w-4 h-4 text-[#DC2626]" />
                  <span>3. المهارات، اللغات، والموقف الصحي ورخصة القيادة</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">رخصة القيادة:</span>
                    <span className="font-bold text-[#111318]">{applicant.drivingLicense || 'لا يوجد'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">درجة رخصة القيادة:</span>
                    <span className="font-bold text-[#111318]">{applicant.drivingLicenseDegree || '—'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">مهارات الحاسب الآلي:</span>
                    <span className="font-bold text-[#111318]">{applicant.computerSkills || 'متوسط'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">مستوى اللغة الإنجليزية:</span>
                    <span className="font-bold text-[#111318]">{applicant.englishLevel || 'مقبول'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                    <span className="text-zinc-500 block mb-1">التدخين:</span>
                    <span className="font-bold text-[#111318]">{applicant.smoking || 'غير مدخن'}</span>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200/80 sm:col-span-4">
                    <span className="text-zinc-500 block mb-1">أي أمراض مزمنة أو عمليات جراحية سابقة:</span>
                    <span className="font-bold text-[#111318]">{applicant.chronicDiseases || 'سليم طبياً والحمد لله'}</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Verified Electronic Signatures Summary (سجل التوقيعات الإلكترونية المستقل) */}
              <div className="space-y-3">
                <h3 className="font-black text-[#111318] text-sm flex items-center gap-2 border-b border-zinc-200 pb-2">
                  <ShieldCheck className="w-4 h-4 text-[#DC2626]" />
                  <span>4. التوقيعات الإلكترونية المعتمدة للمراحل الأربع</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <ElectronicSignatureBadge
                    compact
                    signature={applicant.signatures?.hr || applicant.hrReview?.electronicSignature}
                    legacySignature={applicant.hrReview?.signature}
                    legacyReviewedAt={applicant.hrReview?.reviewedAt}
                    stageTitle="1. الموارد البشرية"
                    accent="emerald"
                  />
                  <ElectronicSignatureBadge
                    compact
                    signature={applicant.signatures?.hr_manager || applicant.hrManagerReview?.electronicSignature}
                    legacySignature={applicant.hrManagerReview?.signature}
                    legacyReviewedAt={applicant.hrManagerReview?.reviewedAt}
                    stageTitle="2. مدير الموارد البشرية"
                    accent="teal"
                  />
                  <ElectronicSignatureBadge
                    compact
                    signature={applicant.signatures?.direct_manager || applicant.directManagerReview?.electronicSignature}
                    legacySignature={applicant.directManagerReview?.signature}
                    legacyReviewedAt={applicant.directManagerReview?.reviewedAt}
                    stageTitle={`3. ${applicant.assignedDepartmentManager || 'مدير الإدارة المختصة'}`}
                    accent="blue"
                  />
                  <ElectronicSignatureBadge
                    compact
                    signature={applicant.signatures?.general_manager || applicant.generalManagerReview?.electronicSignature}
                    legacySignature={applicant.generalManagerReview?.signature}
                    legacyReviewedAt={applicant.generalManagerReview?.reviewedAt}
                    stageTitle="4. المدير العام"
                    accent="amber"
                  />
                </div>
              </div>
            </>
          ) : activeTab === 'evaluation' ? (
            /* Tab 2: 4-Tier Management Review History */
            <div className="space-y-4">
              {/* Stage 1: HR Specialist */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#DC2626]" />
                    <span className="font-black text-[#111318] text-sm">المرحلة الأولى: الموارد البشرية</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    applicant.hrReview?.result === 'مرفوض'
                      ? 'bg-red-100 text-[#B91C1C]'
                      : applicant.hrReview?.result
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {applicant.hrReview?.result || 'معلق'}
                  </span>
                </div>

                {/* Targeted Department for Interview */}
                {applicant.assignedDepartment && (
                  <div className="bg-white border border-zinc-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-700 font-bold">الإدارة الموجه إليها لعمل المقابلة الفنية:</span>
                    <span className="font-black text-[#111318] bg-zinc-100 border border-zinc-300 px-3 py-1 rounded-lg">
                      إدارة {applicant.assignedDepartment} — {applicant.assignedDepartmentManager || 'مدير الإدارة'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">الإيجابيات:</span>
                    <p className="font-bold text-emerald-800 bg-white p-2 rounded-lg border border-zinc-200">
                      {applicant.hrReview?.positives || 'لا توجد ملاحظات مسجلة'}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">السلبيات:</span>
                    <p className="font-bold text-[#B91C1C] bg-white p-2 rounded-lg border border-zinc-200">
                      {applicant.hrReview?.negatives || 'لا توجد سلبيات مسجلة'}
                    </p>
                  </div>
                </div>

                <div className="text-xs">
                  <span className="text-zinc-500 block mb-0.5">الملاحظات والتوجيه:</span>
                  <p className="font-medium text-zinc-800 bg-white p-2 rounded-lg border border-zinc-200">
                    {applicant.hrReview?.notice || (applicant.assignedDepartment ? `اجتاز فحص الموارد البشرية وتوجهت الاستمارة إلى إدارة ${applicant.assignedDepartment} لعمل مقابلة، بانتظار قرار مدير الموارد البشرية` : 'اجتاز المقابلة التمهيدية وتوجهت الاستمارة لمدير الموارد البشرية')}
                  </p>
                </div>

                <ElectronicSignatureBadge
                  signature={applicant.signatures?.hr || applicant.hrReview?.electronicSignature}
                  legacySignature={applicant.hrReview?.signature}
                  legacyReviewedAt={applicant.hrReview?.reviewedAt}
                  stageTitle="الموارد البشرية"
                  accent="emerald"
                />
              </div>

              {/* Stage 2: HR Manager */}
              {(() => {
                const hrManagerResult = applicant.hrManagerReview?.result;
                const isHrManagerApproved = hrManagerResult && hrManagerResult !== 'مرفوض' && hrManagerResult !== 'انتظار';
                const isHrManagerRejected = hrManagerResult === 'مرفوض';

                return (
                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-[#111318]" />
                        <span className="font-black text-[#111318] text-sm">المرحلة الثانية: مدير الموارد البشرية (القبول أو الرفض)</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isHrManagerApproved
                          ? 'bg-emerald-600 text-white'
                          : isHrManagerRejected
                          ? 'bg-[#DC2626] text-white'
                          : hrManagerResult
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-zinc-200 text-zinc-600'
                      }`}>
                        {hrManagerResult || 'معلق'}
                      </span>
                    </div>

                    {/* Status Notice of HR Manager Decision */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-2.5 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1 font-bold text-[#111318]">
                        <span>قرار مدير الموارد البشرية:</span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          isHrManagerApproved
                            ? 'bg-emerald-700 text-white'
                            : isHrManagerRejected
                            ? 'bg-[#DC2626] text-white'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {isHrManagerApproved
                            ? `مقبول (${hrManagerResult}) — أُحيل لـ (${applicant.assignedDepartmentManager || 'مدير الإدارة'})`
                            : isHrManagerRejected
                            ? 'مرفوض — توقف الطلب نهائياً'
                            : 'بانتظار قرار مدير الموارد البشرية (إذا قَبِلَ يتوجه لمدير الإدارة، وإذا رفض ينتهي الطلب)'}
                        </span>
                      </div>
                      {isHrManagerApproved && applicant.assignedDepartment && (
                        <p className="text-[11px] text-zinc-700 leading-relaxed">
                          ✓ وافق مدير الموارد البشرية على الطلب ووجهه رسميًا إلى <strong>إدارة {applicant.assignedDepartment} ({applicant.assignedDepartmentManager || 'مدير الإدارة'})</strong> لإجراء المقابلة الفنية والاختبار العملي.
                        </p>
                      )}
                      {isHrManagerRejected && (
                        <p className="text-[11px] text-[#B91C1C] leading-relaxed font-bold">
                          ✕ تم رفض الاستمارة من قِبل مدير الموارد البشرية، ولن تتوجه الاستمارة لمدير الإدارة.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 block mb-0.5">التوصيات الإدارية:</span>
                        <p className="font-bold text-[#111318] bg-white p-2 rounded-lg border border-zinc-200">
                          {applicant.hrManagerReview?.positives || 'استيفاء مسوغات التعيين الأولية والشروط القانونية'}
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">الملاحظات والشروط:</span>
                        <p className="font-bold text-[#B91C1C] bg-white p-2 rounded-lg border border-zinc-200">
                          {applicant.hrManagerReview?.negatives || 'لا توجد ملاحظات'}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="text-zinc-500 block mb-0.5">توجيه واعتماد مدير الموارد البشرية:</span>
                      <p className="font-medium text-zinc-800 bg-white p-2 rounded-lg border border-zinc-200">
                        {applicant.hrManagerReview?.notice || (isHrManagerApproved ? `معتمد للإحالة إلى ${applicant.assignedDepartmentManager || 'مدير الإدارة'} لإجراء المقابلة الفنية` : 'بانتظار قرار مدير الموارد البشرية بالقبول أو الرفض')}
                      </p>
                    </div>

                    {applicant.hrManagerSalaryProposal && (
                      <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-black text-teal-950">الراتب المقترح من مدير الموارد البشرية:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-sm text-teal-900 bg-white border border-teal-200 px-2.5 py-0.5 rounded-lg tabular-nums">
                              {applicant.hrManagerSalaryProposal.formattedAmount}
                            </span>
                            {applicant.hrManagerSalaryProposal.status === 'selected' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white">
                                معتمد نهائياً
                              </span>
                            )}
                            {applicant.hrManagerSalaryProposal.status === 'not_selected' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-200 text-zinc-700">
                                لم يتم اختياره
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-teal-800 flex flex-wrap items-center justify-between gap-2">
                          <span>مقدم المقترح: <strong>{applicant.hrManagerSalaryProposal.proposerName}</strong></span>
                          {applicant.hrManagerSalaryProposal.proposedAtArabic && (
                            <span className="font-mono text-[10px]">{applicant.hrManagerSalaryProposal.proposedAtArabic}</span>
                          )}
                        </div>
                        {applicant.hrManagerSalaryProposal.notes && (
                          <p className="text-[11px] text-teal-900 bg-white/80 p-2 rounded-lg border border-teal-100">
                            {applicant.hrManagerSalaryProposal.notes}
                          </p>
                        )}
                      </div>
                    )}

                    <ElectronicSignatureBadge
                      signature={applicant.signatures?.hr_manager || applicant.hrManagerReview?.electronicSignature}
                      legacySignature={applicant.hrManagerReview?.signature}
                      legacyReviewedAt={applicant.hrManagerReview?.reviewedAt}
                      stageTitle="مدير الموارد البشرية"
                      accent="teal"
                    />
                  </div>
                );
              })()}

              {/* Stage 3: Department Manager */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#DC2626]" />
                    <div>
                      <span className="font-black text-[#111318] text-sm">
                        المرحلة الثالثة: {applicant.assignedDepartmentManager || applicant.directManagerReview?.managerTitle || 'مدير الإدارة'}
                      </span>
                      {applicant.assignedDepartment && (
                        <span className="text-[11px] text-[#DC2626] font-bold block">
                          إدارة {applicant.assignedDepartment}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    applicant.directManagerReview?.result === 'مرفوض'
                      ? 'bg-red-100 text-[#B91C1C]'
                      : applicant.directManagerReview?.result
                      ? 'bg-[#111318] text-white'
                      : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {applicant.directManagerReview?.result || 'معلق'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">الإيجابيات والمهارات الفنية:</span>
                    <p className="font-bold text-[#111318] bg-white p-2 rounded-lg border border-zinc-200">
                      {applicant.directManagerReview?.positives || 'لا توجد ملاحظات مسجلة'}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">السلبيات الفنية:</span>
                    <p className="font-bold text-[#B91C1C] bg-white p-2 rounded-lg border border-zinc-200">
                      {applicant.directManagerReview?.negatives || 'لا توجد سلبيات مسجلة'}
                    </p>
                  </div>
                </div>

                <div className="text-xs">
                  <span className="text-zinc-500 block mb-0.5">ملاحظات المقابلة الفنية والاختبار:</span>
                  <p className="font-medium text-zinc-800 bg-white p-2 rounded-lg border border-zinc-200">
                    {applicant.directManagerReview?.notice || '—'}
                  </p>
                </div>

                {applicant.directManagerSalaryProposal && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black text-blue-950">الراتب المقترح من مدير الإدارة:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-sm text-blue-900 bg-white border border-blue-200 px-2.5 py-0.5 rounded-lg tabular-nums">
                          {applicant.directManagerSalaryProposal.formattedAmount}
                        </span>
                        {applicant.directManagerSalaryProposal.status === 'selected' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white">
                            معتمد نهائياً
                          </span>
                        )}
                        {applicant.directManagerSalaryProposal.status === 'not_selected' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-200 text-zinc-700">
                            لم يتم اختياره
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-blue-800 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        مقدم المقترح: <strong>{applicant.directManagerSalaryProposal.proposerName}</strong>
                        {applicant.directManagerSalaryProposal.proposerDepartment
                          ? ` (${applicant.directManagerSalaryProposal.proposerDepartment})`
                          : ''}
                      </span>
                      {applicant.directManagerSalaryProposal.proposedAtArabic && (
                        <span className="font-mono text-[10px]">{applicant.directManagerSalaryProposal.proposedAtArabic}</span>
                      )}
                    </div>
                    {applicant.directManagerSalaryProposal.notes && (
                      <p className="text-[11px] text-blue-900 bg-white/80 p-2 rounded-lg border border-blue-100">
                        {applicant.directManagerSalaryProposal.notes}
                      </p>
                    )}
                  </div>
                )}

                <ElectronicSignatureBadge
                  signature={applicant.signatures?.direct_manager || applicant.directManagerReview?.electronicSignature}
                  legacySignature={applicant.directManagerReview?.signature}
                  legacyReviewedAt={applicant.directManagerReview?.reviewedAt}
                  stageTitle={applicant.assignedDepartmentManager || 'مدير الإدارة المختصة'}
                  accent="blue"
                />
              </div>

              {/* Stage 4: General Manager */}
              {(() => {
                const gmReview = applicant.generalManagerReview;
                const finalSource = gmReview?.finalSalarySource;
                const finalSourceLabel = finalSalarySourceToLabel(finalSource);
                const isFinalApproved =
                  isApprovedStatus(applicant.status) ||
                  Boolean(gmReview?.finalApprovedSalary || finalSource);
                const stageBadgeText =
                  gmReview?.result ||
                  (isFinalApproved ? 'معتمد نهائياً' : 'معلق');

                const currency = gmReview?.currency || 'ج.م';
                const level1Text =
                  gmReview?.salaryLevel1 ||
                  formatSalaryAmount(getApplicationSalaryForLevel(gmReview, 'level1'), currency) ||
                  'غير محدد بعد';
                const level2Text =
                  gmReview?.salaryLevel2 ||
                  formatSalaryAmount(getApplicationSalaryForLevel(gmReview, 'level2'), currency) ||
                  'غير محدد بعد';
                const level3Text =
                  gmReview?.salaryLevel3 ||
                  formatSalaryAmount(getApplicationSalaryForLevel(gmReview, 'level3'), currency) ||
                  'غير محدد بعد';

                return (
                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-300 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-[#DC2626]" />
                        <span className="font-black text-[#111318] text-sm">المرحلة الرابعة: المدير العام والاعتماد المالي والراتب</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {gmReview?.isSalaryLocked && (
                          <span className="inline-flex items-center gap-1 font-black text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-lg">
                            <Lock className="w-3 h-3" />
                            <span>تم تثبيت الراتب نهائياً داخل الاستمارة</span>
                          </span>
                        )}
                        {finalSourceLabel && (
                          <span className="font-bold text-[11px] text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {finalSourceLabel}
                          </span>
                        )}
                        {!finalSourceLabel && gmReview?.selectedSalaryLevel && (
                          <span className="font-bold text-[11px] text-[#111318] bg-zinc-200/80 px-2 py-0.5 rounded border border-zinc-300">
                            {gmReview.selectedSalaryLevel === 'level1'
                              ? 'المستوى الأول'
                              : gmReview.selectedSalaryLevel === 'level2'
                              ? 'المستوى الثاني'
                              : 'المستوى الثالث'}
                          </span>
                        )}
                        {gmReview?.finalApprovedSalary && (
                          <span className="font-mono tabular-nums font-black text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            الراتب النهائي: {gmReview.finalApprovedSalary}
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          gmReview?.result === 'مرفوض'
                            ? 'bg-[#DC2626] text-white'
                            : gmReview?.result === 'انتظار'
                            ? 'bg-amber-600 text-white'
                            : isFinalApproved || gmReview?.result
                            ? 'bg-emerald-700 text-white'
                            : 'bg-zinc-200 text-zinc-600'
                        }`}>
                          {stageBadgeText}
                        </span>
                      </div>
                    </div>

                    {(gmReview?.finalApprovedSalary || gmReview?.finalSalaryApprovedBy) && (
                      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="font-black text-emerald-950 block">ملخص الاعتماد المالي النهائي:</span>
                          <div className="text-[11px] text-emerald-800 flex flex-wrap items-center gap-2">
                            {finalSourceLabel && <span>المصدر المعتمد: <strong>{finalSourceLabel}</strong></span>}
                            {gmReview?.finalSalaryApprovedBy && <span>• اعتمد بواسطة: <strong>{gmReview.finalSalaryApprovedBy}</strong></span>}
                            {gmReview?.finalSalaryApprovedAt && (
                              <span className="font-mono text-[10px]">({gmReview.finalSalaryApprovedAt})</span>
                            )}
                          </div>
                        </div>
                        {gmReview?.finalApprovedSalary && (
                          <span className="font-mono tabular-nums font-black text-base text-emerald-900 bg-white border border-emerald-300 px-3 py-1 rounded-xl">
                            {gmReview.finalApprovedSalary}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 block mb-0.5">ملاحظات وتوجيهات المدير العام:</span>
                        <p className="font-bold text-[#111318] bg-white p-2.5 rounded-lg border border-zinc-200">
                          {gmReview?.notice || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">خيارات الراتب الخمسة المسجلة بالاستمارة:</span>
                        <div className="bg-white p-2.5 rounded-lg border border-zinc-200 text-xs space-y-1.5 text-[#111318]">
                          <div className={`flex items-center justify-between px-2 py-1 rounded ${finalSource === 'level1' ? 'bg-emerald-50 border border-emerald-300 font-black' : ''}`}>
                            <span>المستوى الأول:</span>
                            <span className="font-mono tabular-nums">{level1Text}</span>
                          </div>
                          <div className={`flex items-center justify-between px-2 py-1 rounded ${finalSource === 'level2' ? 'bg-emerald-50 border border-emerald-300 font-black' : ''}`}>
                            <span>المستوى الثاني:</span>
                            <span className="font-mono tabular-nums">{level2Text}</span>
                          </div>
                          <div className={`flex items-center justify-between px-2 py-1 rounded ${finalSource === 'level3' ? 'bg-emerald-50 border border-emerald-300 font-black' : ''}`}>
                            <span>المستوى الثالث:</span>
                            <span className="font-mono tabular-nums">{level3Text}</span>
                          </div>
                          <div className={`flex items-center justify-between px-2 py-1 rounded ${finalSource === 'hr_manager_proposal' ? 'bg-emerald-50 border border-emerald-300 font-black' : ''}`}>
                            <span>مقترح مدير الموارد البشرية:</span>
                            <span className="font-mono tabular-nums">
                              {applicant.hrManagerSalaryProposal?.formattedAmount || 'لم يتم تقديم مقترح'}
                            </span>
                          </div>
                          <div className={`flex items-center justify-between px-2 py-1 rounded ${finalSource === 'direct_manager_proposal' ? 'bg-emerald-50 border border-emerald-300 font-black' : ''}`}>
                            <span>مقترح مدير الإدارة:</span>
                            <span className="font-mono tabular-nums">
                              {applicant.directManagerSalaryProposal?.formattedAmount || 'لم يتم تقديم مقترح'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                <ElectronicSignatureBadge
                  signature={applicant.signatures?.general_manager || applicant.generalManagerReview?.electronicSignature}
                  legacySignature={applicant.generalManagerReview?.signature}
                  legacyReviewedAt={applicant.generalManagerReview?.reviewedAt}
                  stageTitle="المدير العام"
                  accent="amber"
                />
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Tab 3: Approval History & Audit Trail (سجل الاعتمادات والرقابة الإدارية) */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#111318] text-white p-4 rounded-2xl border-b-2 border-[#DC2626]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#DC2626] rounded-xl text-white">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">سجل الاعتمادات والتدقيق الإداري (Approval History)</h3>
                    <p className="text-xs text-zinc-300">
                      سجل موثق بالمعاملات والقرارات المنفذة عبر Backend Transactions وحالات الانتقال
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-xl text-red-200 border border-white/15">
                  {applicant.approvalHistory?.length || 0} حركة مسجلة
                </span>
              </div>

              {(!applicant.approvalHistory || applicant.approvalHistory.length === 0) ? (
                <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl p-8 text-center space-y-2">
                  <Clock className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="text-xs font-bold text-zinc-600">لا توجد حركات مسجلة حتى الآن لهذا الطلب</p>
                  <p className="text-[11px] text-zinc-400">سيتم تسجيل كل حركة قبول أو رفض أو إحالة تلقائياً مع هوية المستخدم والوقت.</p>
                </div>
              ) : (
                <div className="relative border-r-2 border-zinc-200 mr-4 space-y-6 pr-6">
                  {applicant.approvalHistory.map((entry, index) => (
                    <div key={entry.id || index} className="relative group">
                      {/* Timeline dot */}
                      <span
                        className={`absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                          entry.action === 'reject'
                            ? 'bg-[#DC2626]'
                            : entry.action === 'waitlist'
                            ? 'bg-amber-600'
                            : entry.action === 'create'
                            ? 'bg-zinc-400'
                            : 'bg-emerald-600'
                        }`}
                      />

                      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs hover:shadow-xs transition-shadow space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                entry.action === 'reject'
                                  ? 'bg-red-100 text-[#B91C1C]'
                                  : entry.action === 'waitlist'
                                  ? 'bg-amber-100 text-amber-800'
                                  : entry.action === 'create'
                                  ? 'bg-zinc-100 text-zinc-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {entry.action === 'reject'
                                ? 'رفض الطلب'
                                : entry.action === 'waitlist'
                                ? 'قائمة انتظار'
                                : entry.action === 'create'
                                ? 'تسجيل جديد'
                                : 'اعتماد وقبول'}
                            </span>
                            <span className="text-xs font-bold text-[#111318]">{entry.decision}</span>
                            {entry.department && (
                              <span className="text-[11px] bg-zinc-100 text-[#111318] px-2 py-0.5 rounded-md font-semibold">
                                {entry.department}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                            <span>{entry.dateArabic || entry.timestamp}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl">
                          <div className="space-y-0.5">
                            <span className="text-zinc-400 block text-[10px]">الموقّع الموثق والبريد:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <strong className="text-[#111318]">
                                {entry.electronicSignature?.fullName || entry.userName || entry.signature || entry.userEmail || entry.userId}
                              </strong>
                              {entry.electronicSignature && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>موثق</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-600 block">
                              {entry.electronicSignature?.jobTitle || entry.jobTitle || getRoleDisplayTitle(entry.role)}
                              {(entry.electronicSignature?.department || entry.department) ? ` • ${entry.electronicSignature?.department || entry.department}` : ''}
                            </span>
                            {entry.userEmail && (
                              <span className="text-[10px] text-zinc-400 block font-mono" dir="ltr">
                                {entry.userEmail}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px]">
                              {entry.stageLabel ? `المرحلة (${entry.stageLabel}) — انتقال الحالة:` : 'انتقال الحالة:'}
                            </span>
                            <span className="font-mono text-zinc-500">{entry.oldStatus}</span>
                            <span className="mx-1 text-zinc-400">←</span>
                            <span className="font-mono font-bold text-[#111318]">{entry.newStatus}</span>
                          </div>
                        </div>

                        {(entry.salary || entry.metadata?.proposedSalaryFormatted || entry.metadata?.finalSalarySource) && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold flex flex-wrap items-center gap-2">
                            {entry.salary && <span>الراتب المعتمد: {entry.salary}</span>}
                            {entry.metadata?.finalSalarySource && (
                              <span className="bg-white/80 border border-amber-300 px-2 py-0.5 rounded-md text-[11px]">
                                المصدر: {finalSalarySourceToLabel(entry.metadata.finalSalarySource)}
                              </span>
                            )}
                            {entry.metadata?.proposedSalaryFormatted && (
                              <span className="bg-white/80 border border-amber-300 px-2 py-0.5 rounded-md text-[11px]">
                                مقترح الراتب المسجل: {entry.metadata.proposedSalaryFormatted}
                              </span>
                            )}
                          </div>
                        )}

                        {entry.notice && (
                          <p className="text-xs text-zinc-700 bg-white p-2 rounded-lg border border-zinc-100">
                            💬 "{entry.notice}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 px-4 sm:px-6 py-3 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-3.5 py-2 min-h-[40px] bg-white hover:bg-zinc-100 text-zinc-700 font-bold rounded-xl border border-zinc-300 transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial justify-end">
            {onConsultAI && (
              <button
                type="button"
                onClick={() => {
                  onConsultAI(applicant);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-[#111318] hover:bg-zinc-800 text-white rounded-xl font-bold border border-zinc-800 transition-colors cursor-pointer"
                title="تحليل المرشح بـ AI"
              >
                <Bot className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">تحليل المرشح بـ AI</span>
                <span className="sm:hidden">AI</span>
              </button>
            )}
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-zinc-200 hover:bg-zinc-300 text-[#111318] rounded-xl font-bold transition-colors cursor-pointer"
              title="طباعة A4 الرسمية"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">طباعة A4 الرسمية</span>
              <span className="sm:hidden">طباعة</span>
            </button>
            <button
              onClick={onOpenEvaluation}
              className="flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl font-black shadow-sm shadow-red-600/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5 text-white" />
              <span>تقييم وتعديل الحالة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
