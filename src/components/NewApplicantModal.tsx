import React, { useState } from 'react';
import {
  JobApplication,
  formatSalaryAmount,
  getApplicationSalaryForLevel,
  parseSalaryNumeric,
} from '../types';
import { parseEgyptianNationalId } from '../utils/nationalId';
import { guessDepartmentFromPosition, getDepartmentInfo } from '../utils/departments';
import { UserPlus, X, Check, AlertCircle, Banknote, Lock } from 'lucide-react';

interface NewApplicantModalProps {
  onClose: () => void;
  onAdd: (applicant: JobApplication) => void;
  onUpdate?: (applicant: JobApplication) => void;
  initialData?: JobApplication | null;
  canManageSalaryStructure?: boolean;
}

export const NewApplicantModal: React.FC<NewApplicantModalProps> = ({
  onClose,
  onAdd,
  onUpdate,
  initialData,
  canManageSalaryStructure = false,
}) => {
  const isEditing = Boolean(initialData);
  const isSalaryLocked = Boolean(initialData?.generalManagerReview?.isSalaryLocked);

  const [formData, setFormData] = useState({
    fullName: initialData?.fullName || '',
    nationalId: initialData?.nationalId || '',
    birthDate: initialData?.birthDate || '',
    gender: initialData?.gender || 'ذكر',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    emergencyContact: initialData?.emergencyContact || '',
    qualification: initialData?.qualification || '',
    qualificationDate: initialData?.qualificationDate || '',
    maritalStatus: initialData?.maritalStatus || 'أعزب',
    positionApplied: initialData?.positionApplied || 'محاسب فرع / أمين خزينة',
    internalReferrals: initialData?.internalReferrals || '',
    prevCompany: initialData?.prevCompany || '',
    prevPosition: initialData?.prevPosition || '',
    prevManager: initialData?.prevManager || '',
    experienceYears: initialData?.experienceYears || '',
    workHours: initialData?.workHours || '',
    prevSalary: initialData?.prevSalary || '',
    reasonForLeaving: initialData?.reasonForLeaving || '',
    computerSkills: initialData?.computerSkills || '',
    englishLevel: initialData?.englishLevel || 'متوسط',
    drivingLicense: initialData?.drivingLicense || 'نعم',
    smoking: initialData?.smoking || 'لا',
    chronicDiseases: initialData?.chronicDiseases || 'سليم والحمد لله',

    // New Fields
    isPraying: initialData?.isPraying || 'نعم',
    militaryStatus: initialData?.militaryStatus || 'أدى الخدمة',
    expectedSalary: initialData?.expectedSalary || '',
    drivingLicenseDegree: initialData?.drivingLicenseDegree || '',
    personalPhotoUrl: initialData?.personalPhotoUrl || '',

    // Job 2
    prevCompany2: initialData?.prevCompany2 || '',
    prevPosition2: initialData?.prevPosition2 || '',
    prevManager2: initialData?.prevManager2 || '',
    experienceYears2: initialData?.experienceYears2 || '',
    workHours2: initialData?.workHours2 || '',
    reasonForLeaving2: initialData?.reasonForLeaving2 || '',

    // Job 3
    prevCompany3: initialData?.prevCompany3 || '',
    prevPosition3: initialData?.prevPosition3 || '',
    prevManager3: initialData?.prevManager3 || '',
    experienceYears3: initialData?.experienceYears3 || '',
    reasonForLeaving3: initialData?.reasonForLeaving3 || '',
  });

  const [showExtraJobs, setShowExtraJobs] = useState(
    Boolean(
      initialData?.prevCompany2 ||
        initialData?.prevPosition2 ||
        initialData?.prevCompany3 ||
        initialData?.prevPosition3
    )
  );

  const [salaryTiers, setSalaryTiers] = useState({
    level1:
      getApplicationSalaryForLevel(initialData?.generalManagerReview, 'level1')?.toString() || '',
    level2:
      getApplicationSalaryForLevel(initialData?.generalManagerReview, 'level2')?.toString() || '',
    level3:
      getApplicationSalaryForLevel(initialData?.generalManagerReview, 'level3')?.toString() || '',
    currency: initialData?.generalManagerReview?.currency || 'ج.م',
  });

  const [nationalInfo, setNationalInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNationalIdChange = (val: string) => {
    setFormData((prev) => ({ ...prev, nationalId: val }));
    const parsed = parseEgyptianNationalId(val);
    setNationalInfo(parsed.isValid ? parsed : null);
    if (parsed.isValid) {
      if (parsed.birthDate && !formData.birthDate) {
        setFormData((prev) => ({ ...prev, birthDate: parsed.birthDate || '' }));
      }
      if (parsed.gender) {
        setFormData((prev) => ({ ...prev, gender: parsed.gender || 'ذكر' }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.fullName.trim() || !formData.phone.trim()) {
      setErrorMsg('يرجى كتابة الاسم الثلاثي ورقم الهاتف على الأقل.');
      return;
    }

    const assignedDept = guessDepartmentFromPosition(formData.positionApplied);
    const assignedMgr = getDepartmentInfo(assignedDept)?.managerTitle || 'مدير الإدارة';
    const nowIso = new Date().toISOString();
    const nowArabic = new Date().toLocaleString('ar-EG');

    const parsedL1 = parseSalaryNumeric(salaryTiers.level1);
    const parsedL2 = parseSalaryNumeric(salaryTiers.level2);
    const parsedL3 = parseSalaryNumeric(salaryTiers.level3);
    const currency = salaryTiers.currency.trim() || 'ج.م';

    if (canManageSalaryStructure && !isSalaryLocked) {
      if (
        (salaryTiers.level1.trim() && !parsedL1) ||
        (salaryTiers.level2.trim() && !parsedL2) ||
        (salaryTiers.level3.trim() && !parsedL3)
      ) {
        setErrorMsg('يرجى إدخال أرقام صحيحة وموجبة لمستويات الرواتب داخل الاستمارة.');
        return;
      }
    }

    if (isEditing && initialData && onUpdate) {
      const preservedGm = initialData.generalManagerReview || {
        salaryLevel1: '',
        salaryLevel2: '',
        salaryLevel3: '',
        finalApprovedSalary: '',
        result: null,
        notice: '',
        signature: '',
      };
      const updatedGmReview =
        canManageSalaryStructure && !isSalaryLocked
          ? {
              ...preservedGm,
              currency,
              level1Amount: parsedL1,
              level2Amount: parsedL2,
              level3Amount: parsedL3,
              salaryLevel1: parsedL1 ? formatSalaryAmount(parsedL1, currency) : preservedGm.salaryLevel1 || '',
              salaryLevel2: parsedL2 ? formatSalaryAmount(parsedL2, currency) : preservedGm.salaryLevel2 || '',
              salaryLevel3: parsedL3 ? formatSalaryAmount(parsedL3, currency) : preservedGm.salaryLevel3 || '',
            }
          : preservedGm;

      const updated: JobApplication = {
        ...initialData,
        fullName: formData.fullName,
        nationalId: formData.nationalId,
        birthDate: formData.birthDate,
        gender: formData.gender,
        address: formData.address,
        phone: formData.phone,
        emergencyContact: formData.emergencyContact,
        qualification: formData.qualification,
        qualificationDate: formData.qualificationDate,
        maritalStatus: formData.maritalStatus,
        positionApplied: formData.positionApplied,
        assignedDepartment: initialData.assignedDepartment || assignedDept,
        assignedDepartmentManager: initialData.assignedDepartmentManager || assignedMgr,
        internalReferrals: formData.internalReferrals,
        prevCompany: formData.prevCompany,
        prevPosition: formData.prevPosition,
        prevManager: formData.prevManager,
        experienceYears: formData.experienceYears,
        workHours: formData.workHours,
        prevSalary: formData.prevSalary,
        reasonForLeaving: formData.reasonForLeaving,
        prevCompany2: formData.prevCompany2 || undefined,
        prevPosition2: formData.prevPosition2 || undefined,
        prevManager2: formData.prevManager2 || undefined,
        experienceYears2: formData.experienceYears2 || undefined,
        workHours2: formData.workHours2 || undefined,
        reasonForLeaving2: formData.reasonForLeaving2 || undefined,
        prevCompany3: formData.prevCompany3 || undefined,
        prevPosition3: formData.prevPosition3 || undefined,
        prevManager3: formData.prevManager3 || undefined,
        experienceYears3: formData.experienceYears3 || undefined,
        reasonForLeaving3: formData.reasonForLeaving3 || undefined,
        computerSkills: formData.computerSkills,
        englishLevel: formData.englishLevel,
        drivingLicense: formData.drivingLicense,
        drivingLicenseDegree: formData.drivingLicenseDegree || undefined,
        smoking: formData.smoking,
        chronicDiseases: formData.chronicDiseases,
        isPraying: formData.isPraying,
        militaryStatus: formData.militaryStatus,
        expectedSalary: formData.expectedSalary,
        personalPhotoUrl: formData.personalPhotoUrl || undefined,
        generalManagerReview: updatedGmReview,
        lastUpdated: nowIso,
        lastActionDate: nowArabic,
      };

      onUpdate(updated);
      onClose();
      return;
    }

    const timestamp = nowArabic;
    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      recordNumber: `قيد/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      timestamp,
      fullName: formData.fullName,
      nationalId: formData.nationalId,
      birthDate: formData.birthDate,
      gender: formData.gender,
      address: formData.address,
      phone: formData.phone,
      emergencyContact: formData.emergencyContact,
      qualification: formData.qualification,
      qualificationDate: formData.qualificationDate,
      maritalStatus: formData.maritalStatus,
      positionApplied: formData.positionApplied,
      assignedDepartment: assignedDept,
      assignedDepartmentManager: assignedMgr,
      internalReferrals: formData.internalReferrals,
      prevCompany: formData.prevCompany,
      prevPosition: formData.prevPosition,
      prevManager: formData.prevManager,
      experienceYears: formData.experienceYears,
      workHours: formData.workHours,
      prevSalary: formData.prevSalary,
      reasonForLeaving: formData.reasonForLeaving,
      prevCompany2: formData.prevCompany2 || undefined,
      prevPosition2: formData.prevPosition2 || undefined,
      prevManager2: formData.prevManager2 || undefined,
      experienceYears2: formData.experienceYears2 || undefined,
      workHours2: formData.workHours2 || undefined,
      reasonForLeaving2: formData.reasonForLeaving2 || undefined,
      prevCompany3: formData.prevCompany3 || undefined,
      prevPosition3: formData.prevPosition3 || undefined,
      prevManager3: formData.prevManager3 || undefined,
      experienceYears3: formData.experienceYears3 || undefined,
      reasonForLeaving3: formData.reasonForLeaving3 || undefined,
      computerSkills: formData.computerSkills,
      englishLevel: formData.englishLevel,
      drivingLicense: formData.drivingLicense,
      drivingLicenseDegree: formData.drivingLicenseDegree || undefined,
      smoking: formData.smoking,
      chronicDiseases: formData.chronicDiseases,
      isPraying: formData.isPraying,
      militaryStatus: formData.militaryStatus,
      expectedSalary: formData.expectedSalary,
      personalPhotoUrl: formData.personalPhotoUrl || undefined,
      acknowledgement: 'أنا الموقع أعلاه أقر بأن جميع البيانات المذكورة صحيحة وعلى مسؤوليتي الشخصية.',
      todayDate: new Date().toLocaleDateString('ar-EG'),
      score: '0',
      status: 'new',
      hrReview: {
        positives: '',
        negatives: '',
        result: null,
        notice: '',
        signature: '',
      },
      hrManagerReview: {
        positives: '',
        negatives: '',
        result: null,
        notice: '',
        signature: '',
      },
      directManagerReview: {
        positives: '',
        negatives: '',
        result: null,
        notice: '',
        signature: '',
      },
      generalManagerReview: {
        salaryLevel1: parsedL1 ? formatSalaryAmount(parsedL1, currency) : '',
        salaryLevel2: parsedL2 ? formatSalaryAmount(parsedL2, currency) : '',
        salaryLevel3: parsedL3 ? formatSalaryAmount(parsedL3, currency) : '',
        level1Amount: parsedL1,
        level2Amount: parsedL2,
        level3Amount: parsedL3,
        currency,
        isSalaryLocked: false,
        finalApprovedSalary: '',
        result: null,
        notice: '',
        signature: '',
      },
      lastUpdated: nowIso,
    };

    onAdd(newApp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg max-w-3xl w-full max-h-[94vh] sm:max-h-[92vh] flex flex-col border-t sm:border border-zinc-200 overflow-hidden text-right animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="bg-[#111318] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-2 border-b-2 border-[#DC2626]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#DC2626] text-white shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {isEditing ? `تعديل استمارة طلب التوظيف (${initialData?.fullName})` : 'إضافة طلب توظيف يدوي جديد'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 sm:p-1.5 text-zinc-300 hover:text-white hover:bg-white/15 rounded-xl sm:rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* Section 1 */}
          <div>
            <h3 className="font-bold text-[#111318] text-sm mb-3 border-b border-zinc-200 pb-1.5">
              1. البيانات الشخصية والمؤهل
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-zinc-700 mb-1">الاسم الثلاثي / الرباعي *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="محمد أحمد علي"
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">الرقم القومي (14 رقم)</label>
                <input
                  type="text"
                  maxLength={14}
                  value={formData.nationalId}
                  onChange={(e) => handleNationalIdChange(e.target.value)}
                  placeholder="29405152501977"
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] font-mono"
                />
              </div>

              {nationalInfo && (
                <div className="sm:col-span-3 bg-emerald-50 border border-emerald-300 p-2 rounded-lg flex items-center gap-3 text-emerald-900 text-[11px]">
                  <span>محافظة: <strong>{nationalInfo.governorate}</strong></span>
                  <span>السن: <strong>{nationalInfo.age} سنة</strong></span>
                  <span>النوع: <strong>{nationalInfo.gender}</strong></span>
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-700 mb-1">رقم الهاتف / الواتساب *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01114778557"
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">الوظيفة المتقدم لها *</label>
                <input
                  type="text"
                  required
                  value={formData.positionApplied}
                  onChange={(e) => setFormData({ ...formData, positionApplied: e.target.value })}
                  placeholder="كابتن صالة / محاسب / سائق..."
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">المؤهل الدراسي</label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder="مؤهل عالي / متوسط..."
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-zinc-700 mb-1">العنوان التفصيلي</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="المحافظة - الحي - الشارع"
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">الحالة الاجتماعية</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                >
                  <option value="أعزب">أعزب</option>
                  <option value="متزوج">متزوج</option>
                  <option value="مطلق">مطلق</option>
                  <option value="أرمل">أرمل</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">الموقف من التجنيد</label>
                <select
                  value={formData.militaryStatus}
                  onChange={(e) => setFormData({ ...formData, militaryStatus: e.target.value })}
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                >
                  <option value="أدى الخدمة">أدى الخدمة</option>
                  <option value="إعفاء نهائي">إعفاء نهائي</option>
                  <option value="إعفاء مؤقت">إعفاء مؤقت</option>
                  <option value="غير مطلوب">غير مطلوب</option>
                  <option value="مؤجل">مؤجل</option>
                  <option value="أنثى (غير منطبق)">أنثى (غير منطبق)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">هل أنت مصلي؟</label>
                <select
                  value={formData.isPraying}
                  onChange={(e) => setFormData({ ...formData, isPraying: e.target.value })}
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                >
                  <option value="نعم">نعم</option>
                  <option value="لا">لا</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">الراتب المتوقع</label>
                <input
                  type="text"
                  value={formData.expectedSalary}
                  onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
                  placeholder="مثال: 12,000 ج.م"
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">رخصة القيادة</label>
                <select
                  value={formData.drivingLicense}
                  onChange={(e) => setFormData({ ...formData, drivingLicense: e.target.value })}
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                >
                  <option value="نعم">نعم</option>
                  <option value="لا">لا</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">درجة رخصة القيادة (إن وجدت)</label>
                <input
                  type="text"
                  value={formData.drivingLicenseDegree}
                  onChange={(e) => setFormData({ ...formData, drivingLicenseDegree: e.target.value })}
                  placeholder="أولى / ثانية / ثالثة / خاصة..."
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-bold text-zinc-700 mb-1">رابط الصورة الشخصية (أو رابط Google Drive)</label>
                <input
                  type="url"
                  value={formData.personalPhotoUrl}
                  onChange={(e) => setFormData({ ...formData, personalPhotoUrl: e.target.value })}
                  placeholder="https://drive.google.com/open?id=... أو رابط مباشر"
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 mb-3">
              <h3 className="font-bold text-[#111318] text-sm">
                2. الخبرات السابقة (جهة العمل الأولى)
              </h3>
              <button
                type="button"
                onClick={() => setShowExtraJobs(!showExtraJobs)}
                className="text-xs text-[#DC2626] font-bold hover:underline cursor-pointer"
              >
                {showExtraJobs ? '− إخفاء الوظائف الإضافية' : '+ إضافة جهات عمل سابقة أخرى (2 و 3)'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">اسم الشركة (1)</label>
                <input
                  type="text"
                  value={formData.prevCompany}
                  onChange={(e) => setFormData({ ...formData, prevCompany: e.target.value })}
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 mb-1">الوظيفة السابقة (1)</label>
                <input
                  type="text"
                  value={formData.prevPosition}
                  onChange={(e) => setFormData({ ...formData, prevPosition: e.target.value })}
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 mb-1">سنوات الخبرة (1)</label>
                <input
                  type="text"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  placeholder="سنتان"
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 mb-1">المدير المباشر وهاتفه (1)</label>
                <input
                  type="text"
                  value={formData.prevManager}
                  onChange={(e) => setFormData({ ...formData, prevManager: e.target.value })}
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 mb-1">ساعات العمل اليومية (1)</label>
                <input
                  type="text"
                  value={formData.workHours}
                  onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
                  placeholder="8 ساعات"
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 mb-1">آخر راتب (1)</label>
                <input
                  type="text"
                  value={formData.prevSalary}
                  onChange={(e) => setFormData({ ...formData, prevSalary: e.target.value })}
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block font-bold text-zinc-700 mb-1">سبب ترك العمل (1)</label>
                <input
                  type="text"
                  value={formData.reasonForLeaving}
                  onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
                  className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626]"
                />
              </div>
            </div>

            {/* Extra Jobs 2 & 3 */}
            {showExtraJobs && (
              <div className="mt-4 space-y-4 pt-3 border-t border-dashed border-zinc-300">
                {/* Job 2 */}
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <h4 className="font-bold text-[#111318] text-xs mb-2">جهة العمل السابقة الثانية (2)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">اسم الشركة (2)</label>
                      <input
                        type="text"
                        value={formData.prevCompany2}
                        onChange={(e) => setFormData({ ...formData, prevCompany2: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">المسمى الوظيفي (2)</label>
                      <input
                        type="text"
                        value={formData.prevPosition2}
                        onChange={(e) => setFormData({ ...formData, prevPosition2: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">الفترة / عدد السنين (2)</label>
                      <input
                        type="text"
                        value={formData.experienceYears2}
                        onChange={(e) => setFormData({ ...formData, experienceYears2: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">المدير المباشر وهاتفه (2)</label>
                      <input
                        type="text"
                        value={formData.prevManager2}
                        onChange={(e) => setFormData({ ...formData, prevManager2: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">ساعات العمل (2)</label>
                      <input
                        type="text"
                        value={formData.workHours2}
                        onChange={(e) => setFormData({ ...formData, workHours2: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">سبب ترك العمل (2)</label>
                      <input
                        type="text"
                        value={formData.reasonForLeaving2}
                        onChange={(e) => setFormData({ ...formData, reasonForLeaving2: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                  </div>
                </div>

                {/* Job 3 */}
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <h4 className="font-bold text-[#111318] text-xs mb-2">جهة العمل السابقة الثالثة (3)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">اسم الشركة (3)</label>
                      <input
                        type="text"
                        value={formData.prevCompany3}
                        onChange={(e) => setFormData({ ...formData, prevCompany3: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">المسمى الوظيفي (3)</label>
                      <input
                        type="text"
                        value={formData.prevPosition3}
                        onChange={(e) => setFormData({ ...formData, prevPosition3: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">الفترة / عدد السنين (3)</label>
                      <input
                        type="text"
                        value={formData.experienceYears3}
                        onChange={(e) => setFormData({ ...formData, experienceYears3: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">المدير المباشر وهاتفه (3)</label>
                      <input
                        type="text"
                        value={formData.prevManager3}
                        onChange={(e) => setFormData({ ...formData, prevManager3: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-zinc-600 mb-0.5">سبب ترك العمل (3)</label>
                      <input
                        type="text"
                        value={formData.reasonForLeaving3}
                        onChange={(e) => setFormData({ ...formData, reasonForLeaving3: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Per-Application Salary Tiers (HR / System Admin Only) */}
          {canManageSalaryStructure && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-200 pb-2">
                <h3 className="font-bold text-[#111318] text-xs flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-[#DC2626]" />
                  <span>3. هيكل الرواتب الخاص بهذه الاستمارة (المستويات الثلاثة)</span>
                </h3>
                {isSalaryLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-lg">
                    <Lock className="w-3 h-3" />
                    <span>مقفل ومثبت نهائياً ({initialData?.generalManagerReview?.finalApprovedSalary})</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">المستوى الأول ({salaryTiers.currency})</label>
                  <input
                    type="number"
                    min="0"
                    disabled={isSalaryLocked}
                    value={salaryTiers.level1}
                    onChange={(e) => setSalaryTiers((p) => ({ ...p, level1: e.target.value }))}
                    placeholder="مثال: 6000"
                    className="w-full p-2 rounded-lg border border-zinc-300 bg-white font-mono focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">المستوى الثاني ({salaryTiers.currency})</label>
                  <input
                    type="number"
                    min="0"
                    disabled={isSalaryLocked}
                    value={salaryTiers.level2}
                    onChange={(e) => setSalaryTiers((p) => ({ ...p, level2: e.target.value }))}
                    placeholder="مثال: 8000"
                    className="w-full p-2 rounded-lg border border-zinc-300 bg-white font-mono focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">المستوى الثالث ({salaryTiers.currency})</label>
                  <input
                    type="number"
                    min="0"
                    disabled={isSalaryLocked}
                    value={salaryTiers.level3}
                    onChange={(e) => setSalaryTiers((p) => ({ ...p, level3: e.target.value }))}
                    placeholder="مثال: 10000"
                    className="w-full p-2 rounded-lg border border-zinc-300 bg-white font-mono focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-600">
                يتم حفظ مستويات الرواتب داخل هذه الاستمارة فقط، ويختار المدير العام المستوى المناسب عند الاعتماد لتثبيت الراتب نهائياً.
              </p>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-zinc-200 flex flex-wrap justify-between items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[42px] bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[42px] bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl font-bold shadow-sm shadow-red-600/20 cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4 text-white shrink-0" />
              <span>{isEditing ? 'حفظ التعديلات' : 'إضافة الطلب للمنظومة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
