import React from 'react';
import {
  JobApplication,
  EvaluationResult,
  ElectronicSignature,
  SalaryStructureConfig,
  formatSalaryAmount,
  salaryLevelToLabel,
  finalSalarySourceToLabel,
  isApprovedStatus,
} from '../types';

const renderPrintSignatureCell = (
  sig: ElectronicSignature | undefined,
  legacySignature: string | undefined,
  legacyReviewedAt: string | undefined
) => {
  const isSigned = Boolean(sig?.fullName || (legacySignature && legacyReviewedAt));
  const fullName = sig?.fullName || (isSigned ? legacySignature : '') || 'بانتظار التوقيع';

  return (
    <div className="border-t border-dotted border-black pt-1 text-[10px] text-center">
      <div className={`leading-tight ${isSigned ? 'font-bold text-black' : 'text-gray-400'}`}>
        {fullName}
      </div>
    </div>
  );
};

interface PrintOfficialSheetProps {
  applicant: JobApplication;
  salaryStructure?: SalaryStructureConfig | null;
}

const RESULT_OPTIONS: EvaluationResult[] = [
  'مستوى أول',
  'مستوى ثاني',
  'مستوى ثالث',
  'انتظار',
  'مرفوض',
];

export const PrintOfficialSheet: React.FC<PrintOfficialSheetProps> = ({
  applicant,
  salaryStructure,
}) => {
  return (
    <div className="bg-white text-black p-6 max-w-4xl mx-auto border-2 border-black font-sans leading-normal">
      {/* Top Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
        {/* Right Info (in RTL: right is right) */}
        <div className="text-right">
          <h2 className="text-xl font-bold tracking-tight">شركة أخر ساعة إسبشيال</h2>
          <h3 className="text-base font-semibold text-gray-800">إدارة المـوارد البشـرية</h3>
          <div className="mt-2 text-sm">
            <span className="font-bold">القيد: </span>
            <span className="border-b border-dotted border-black px-4 font-mono font-bold">
              {applicant.recordNumber || '...................'}
            </span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            <span>التاريخ: </span>
            <span className="font-mono">{applicant.timestamp || new Date().toLocaleDateString('ar-EG')}</span>
          </div>
        </div>

        {/* Center / Left Logo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2.5 border-2 border-black px-3 py-1.5 rounded-lg bg-white">
            <div className="w-10 h-10 flex-shrink-0">
              <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
                <path d="M 100 100 L 100 8 A 92 92 0 0 0 8 100 Z" fill="#E51A24" />
                <circle cx="100" cy="100" r="54" fill="#E51A24" />
                <path d="M 107 8.27 A 92 92 0 1 1 8.27 107 L 32.36 107 A 68 68 0 1 0 107 32.36 Z" fill="#0F0F0F" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-gray-700 leading-tight">شركة آخر ساعة</div>
              <div className="text-base font-black tracking-wider text-black leading-tight">إسبشيال</div>
            </div>
          </div>
          <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-mono">
            Employment Application Review & Approval
          </span>
        </div>
      </div>

      {/* Main Title matching photo */}
      <div className="text-center my-4 py-2 bg-gray-100 border-y-2 border-black">
        <h1 className="text-2xl font-black tracking-wide">خاص بإدارة الشركة - مسار اعتماد استمارة المرشح</h1>
        <h2 className="text-sm font-bold tracking-widest text-gray-700 uppercase">
          FOR COMPANY MANAGEMENT ONLY (4-STAGE RECRUITMENT APPROVAL)
        </h2>
      </div>

      {/* Applicant Quick Information Box */}
      <div className="flex gap-4 items-center bg-gray-50 border border-black p-3 mb-5 text-sm">
        {applicant.personalPhotoUrl ? (
          <div className="w-20 h-24 border border-black p-0.5 bg-white shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src={applicant.personalPhotoUrl}
              alt={applicant.fullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-20 h-24 border border-dashed border-gray-400 p-1 bg-white shrink-0 flex flex-col items-center justify-center text-[10px] text-gray-400 text-center">
            <span>صورة شخصية</span>
            <span>4×6</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 flex-1">
          <div>
            <span className="text-gray-600 text-xs block">اسم المتقدم:</span>
            <span className="font-bold text-black">{applicant.fullName}</span>
          </div>
          <div>
            <span className="text-gray-600 text-xs block">الوظيفة المتقدم لها:</span>
            <span className="font-bold text-black">{applicant.positionApplied}</span>
          </div>
          <div>
            <span className="text-gray-600 text-xs block">الرقم القومي:</span>
            <span className="font-mono font-bold text-black">{applicant.nationalId || '—'}</span>
          </div>
          <div>
            <span className="text-gray-600 text-xs block">رقم الهاتف:</span>
            <span className="font-mono font-bold text-black">{applicant.phone || '—'}</span>
          </div>

          <div>
            <span className="text-gray-600 text-xs block">الموقف من التجنيد:</span>
            <span className="font-bold text-black">{applicant.militaryStatus || '—'}</span>
          </div>
          <div>
            <span className="text-gray-600 text-xs block">هل انت مصلي؟:</span>
            <span className="font-bold text-black">{applicant.isPraying || '—'}</span>
          </div>
          <div>
            <span className="text-gray-600 text-xs block">الراتب المتوقع:</span>
            <span className="font-mono font-bold text-black">{applicant.expectedSalary || '—'}</span>
          </div>
          <div>
            <span className="text-gray-600 text-xs block">رخصة القيادة والدرجة:</span>
            <span className="font-bold text-black">
              {applicant.drivingLicense} {applicant.drivingLicenseDegree ? `(${applicant.drivingLicenseDegree})` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Official 4-Tier Grid matching recruitment pipeline */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black text-center text-xs">
          <thead>
            <tr className="bg-gray-200 border-b-2 border-black divide-x divide-x-reverse divide-black font-bold">
              <th className="py-2.5 px-2 w-[16%]">
                <div>الجهة / المرحلة</div>
                <div className="text-[10px] text-gray-600 font-normal">Department</div>
              </th>
              <th className="py-2.5 px-2 w-[22%]">
                <div>الإيجابيات / التوصيات</div>
                <div className="text-[10px] text-gray-600 font-normal">Positives</div>
              </th>
              <th className="py-2.5 px-2 w-[22%]">
                <div>السلبيات / الملاحظات</div>
                <div className="text-[10px] text-gray-600 font-normal">Negatives</div>
              </th>
              <th className="py-2.5 px-2 w-[14%]">
                <div>النتيجة</div>
                <div className="text-[10px] text-gray-600 font-normal">Result</div>
              </th>
              <th className="py-2.5 px-2 w-[14%]">
                <div>ملاحظات وتوجيه</div>
                <div className="text-[10px] text-gray-600 font-normal">Notice</div>
              </th>
              <th className="py-2.5 px-2 w-[12%]">
                <div>التوقيع والاعتماد</div>
                <div className="text-[10px] text-gray-600 font-normal">Signature</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black">
            {/* ROW 1: HR (الموارد البشرية) */}
            <tr className="divide-x divide-x-reverse divide-black">
              <td className="p-3 bg-gray-50 font-bold text-sm align-middle">
                <div>1. الموارد</div>
                <div>البشرية</div>
                <div className="text-xs text-gray-600 font-normal">HR</div>
              </td>
              <td className="p-3 text-right text-xs align-top whitespace-pre-wrap leading-relaxed">
                {applicant.hrReview?.positives || '...................................................'}
              </td>
              <td className="p-3 text-right text-xs align-top whitespace-pre-wrap leading-relaxed">
                {applicant.hrReview?.negatives || '...................................................'}
              </td>
              <td className="p-2 align-middle">
                <div className="flex flex-col gap-1 text-[11px] text-right pr-2">
                  {RESULT_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-default">
                      <span
                        className={`inline-block w-3.5 h-3.5 border border-black rounded-sm ${
                          applicant.hrReview?.result === opt ? 'bg-black text-white text-[9px] text-center font-bold leading-3' : 'bg-white'
                        }`}
                      >
                        {applicant.hrReview?.result === opt ? '✓' : ''}
                      </span>
                      <span className={applicant.hrReview?.result === opt ? 'font-bold underline' : ''}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              </td>
              <td className="p-2 text-right text-xs align-top whitespace-pre-wrap">
                {applicant.hrReview?.notice || '........................'}
              </td>
              <td className="p-2 align-bottom">
                {renderPrintSignatureCell(
                  applicant.signatures?.hr || applicant.hrReview?.electronicSignature,
                  applicant.hrReview?.signature,
                  applicant.hrReview?.reviewedAt
                )}
              </td>
            </tr>

            {/* ROW 2: HR Manager (مدير الموارد البشرية) */}
            <tr className="divide-x divide-x-reverse divide-black bg-teal-50/10">
              <td className="p-3 bg-gray-50 font-bold text-sm align-middle">
                <div>2. مدير</div>
                <div>الموارد البشرية</div>
                <div className="text-xs text-gray-600 font-normal">HR Manager</div>
              </td>
              <td className="p-3 text-right text-xs align-top whitespace-pre-wrap leading-relaxed">
                {applicant.hrManagerReview?.positives || '...................................................'}
              </td>
              <td className="p-3 text-right text-xs align-top whitespace-pre-wrap leading-relaxed">
                {applicant.hrManagerReview?.negatives || '...................................................'}
              </td>
              <td className="p-2 align-middle">
                <div className="flex flex-col gap-1 text-[11px] text-right pr-2">
                  {RESULT_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-default">
                      <span
                        className={`inline-block w-3.5 h-3.5 border border-black rounded-sm ${
                          applicant.hrManagerReview?.result === opt ? 'bg-black text-white text-[9px] text-center font-bold leading-3' : 'bg-white'
                        }`}
                      >
                        {applicant.hrManagerReview?.result === opt ? '✓' : ''}
                      </span>
                      <span className={applicant.hrManagerReview?.result === opt ? 'font-bold underline text-teal-900' : ''}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              </td>
              <td className="p-2 text-right text-xs align-top whitespace-pre-wrap space-y-1.5">
                <div>{applicant.hrManagerReview?.notice || '........................'}</div>
                {applicant.hrManagerSalaryProposal && (
                  <div className="p-1.5 border border-teal-700 bg-teal-50/70 rounded text-[11px] font-bold text-black">
                    <div>مقترح الراتب: <span className="font-mono">{applicant.hrManagerSalaryProposal.formattedAmount}</span></div>
                    <div className="text-[10px] font-normal text-gray-700">
                      {applicant.hrManagerSalaryProposal.proposerName}
                    </div>
                  </div>
                )}
              </td>
              <td className="p-2 align-bottom">
                {renderPrintSignatureCell(
                  applicant.signatures?.hr_manager || applicant.hrManagerReview?.electronicSignature,
                  applicant.hrManagerReview?.signature,
                  applicant.hrManagerReview?.reviewedAt
                )}
              </td>
            </tr>

            {/* ROW 3: Direct Manager (مدير الإدارة المختص) */}
            <tr className="divide-x divide-x-reverse divide-black">
              <td className="p-3 bg-gray-50 font-bold text-sm align-middle">
                <div>3. {applicant.assignedDepartment ? `مدير إدارة ${applicant.assignedDepartment}` : 'مدير الإدارة'}</div>
                <div className="text-xs text-gray-600 font-normal">{applicant.assignedDepartment ? `إدارة ${applicant.assignedDepartment}` : 'Direct Manager'}</div>
              </td>
              <td className="p-3 text-right text-xs align-top whitespace-pre-wrap leading-relaxed">
                {applicant.directManagerReview?.positives || '...................................................'}
              </td>
              <td className="p-3 text-right text-xs align-top whitespace-pre-wrap leading-relaxed">
                {applicant.directManagerReview?.negatives || '...................................................'}
              </td>
              <td className="p-2 align-middle">
                <div className="flex flex-col gap-1 text-[11px] text-right pr-2">
                  {RESULT_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-default">
                      <span
                        className={`inline-block w-3.5 h-3.5 border border-black rounded-sm ${
                          applicant.directManagerReview?.result === opt ? 'bg-black text-white text-[9px] text-center font-bold leading-3' : 'bg-white'
                        }`}
                      >
                        {applicant.directManagerReview?.result === opt ? '✓' : ''}
                      </span>
                      <span className={applicant.directManagerReview?.result === opt ? 'font-bold underline text-blue-900' : ''}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              </td>
              <td className="p-2 text-right text-xs align-top whitespace-pre-wrap space-y-1.5">
                <div>{applicant.directManagerReview?.notice || '........................'}</div>
                {applicant.directManagerSalaryProposal && (
                  <div className="p-1.5 border border-blue-700 bg-blue-50/70 rounded text-[11px] font-bold text-black">
                    <div>مقترح الراتب: <span className="font-mono">{applicant.directManagerSalaryProposal.formattedAmount}</span></div>
                    <div className="text-[10px] font-normal text-gray-700">
                      {applicant.directManagerSalaryProposal.proposerName}
                    </div>
                  </div>
                )}
              </td>
              <td className="p-2 align-bottom">
                {renderPrintSignatureCell(
                  applicant.signatures?.direct_manager || applicant.directManagerReview?.electronicSignature,
                  applicant.directManagerReview?.signature,
                  applicant.directManagerReview?.reviewedAt
                )}
              </td>
            </tr>

            {/* Intermediary Section: Approved Salary According to Level */}
            <tr className="bg-gray-100 border-y-2 border-black">
              <td colSpan={2} className="p-2 text-right font-bold text-sm border-l border-black">
                جدول رواتب الاستمارة حسب المستوى:
              </td>
              <td className="p-2 text-center border-l border-black">
                <span className="font-semibold text-gray-700">الأول : </span>
                <span className="font-bold font-mono">
                  {applicant.generalManagerReview?.salaryLevel1 ||
                    (applicant.generalManagerReview?.level1Amount
                      ? formatSalaryAmount(
                          applicant.generalManagerReview.level1Amount,
                          applicant.generalManagerReview?.currency || 'ج.م'
                        )
                      : '') ||
                    '................'}
                </span>
              </td>
              <td className="p-2 text-center border-l border-black">
                <span className="font-semibold text-gray-700">الثاني : </span>
                <span className="font-bold font-mono">
                  {applicant.generalManagerReview?.salaryLevel2 ||
                    (applicant.generalManagerReview?.level2Amount
                      ? formatSalaryAmount(
                          applicant.generalManagerReview.level2Amount,
                          applicant.generalManagerReview?.currency || 'ج.م'
                        )
                      : '') ||
                    '................'}
                </span>
              </td>
              <td colSpan={2} className="p-2 text-center">
                <span className="font-semibold text-gray-700">الثالث : </span>
                <span className="font-bold font-mono">
                  {applicant.generalManagerReview?.salaryLevel3 ||
                    (applicant.generalManagerReview?.level3Amount
                      ? formatSalaryAmount(
                          applicant.generalManagerReview.level3Amount,
                          applicant.generalManagerReview?.currency || 'ج.م'
                        )
                      : '') ||
                    '................'}
                </span>
              </td>
            </tr>

            {/* ROW 4: General Manager (المدير العام) */}
            <tr className="divide-x divide-x-reverse divide-black bg-emerald-50/20">
              <td className="p-3 bg-gray-50 font-bold text-sm align-middle">
                <div>4. المدير العام</div>
                <div className="text-xs text-gray-600 font-normal">General Manager</div>
              </td>
              <td colSpan={2} className="p-3 text-right text-xs align-middle space-y-1">
                <div className="font-bold text-sm text-gray-800">القرار والراتب النهائي المعتمد:</div>
                {applicant.generalManagerReview?.finalSalarySource ? (
                  <div className="text-[11px] font-bold text-gray-800">
                    مصدر الراتب المختار: {finalSalarySourceToLabel(applicant.generalManagerReview.finalSalarySource)}
                  </div>
                ) : (
                  applicant.generalManagerReview?.selectedSalaryLevel && (
                    <div className="text-[11px] font-bold text-gray-800">
                      المستوى المختار: {salaryLevelToLabel(applicant.generalManagerReview.selectedSalaryLevel)}
                    </div>
                  )
                )}
                <div className="p-2 border border-gray-400 bg-white rounded font-mono font-bold text-sm">
                  {applicant.generalManagerReview?.finalApprovedSalary ||
                    (applicant.generalManagerReview?.result === 'مستوى أول'
                      ? applicant.generalManagerReview.salaryLevel1 ||
                        formatSalaryAmount(
                          applicant.generalManagerReview.level1Amount,
                          applicant.generalManagerReview?.currency || 'ج.م'
                        )
                      : applicant.generalManagerReview?.result === 'مستوى ثاني'
                      ? applicant.generalManagerReview.salaryLevel2 ||
                        formatSalaryAmount(
                          applicant.generalManagerReview.level2Amount,
                          applicant.generalManagerReview?.currency || 'ج.م'
                        )
                      : applicant.generalManagerReview?.result === 'مستوى ثالث'
                      ? applicant.generalManagerReview.salaryLevel3 ||
                        formatSalaryAmount(
                          applicant.generalManagerReview.level3Amount,
                          applicant.generalManagerReview?.currency || 'ج.م'
                        )
                      : '') ||
                    'الراتب المعتمد: ........................'}
                </div>
                {applicant.generalManagerReview?.finalSalaryApprovedBy && (
                  <div className="text-[10px] text-gray-700">
                    اعتماد: <span className="font-bold">{applicant.generalManagerReview.finalSalaryApprovedBy}</span>
                    {applicant.generalManagerReview.finalSalaryApprovedAt
                      ? ` (${applicant.generalManagerReview.finalSalaryApprovedAt})`
                      : ''}
                  </div>
                )}
              </td>
              <td className="p-2 align-middle">
                <div className="flex flex-col gap-1 text-[11px] text-right pr-2">
                  {RESULT_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-default">
                      <span
                        className={`inline-block w-3.5 h-3.5 border border-black rounded-sm ${
                          applicant.generalManagerReview?.result === opt ? 'bg-black text-white text-[9px] text-center font-bold leading-3' : 'bg-white'
                        }`}
                      >
                        {applicant.generalManagerReview?.result === opt ? '✓' : ''}
                      </span>
                      <span className={applicant.generalManagerReview?.result === opt ? 'font-bold underline text-emerald-800' : ''}>
                        {opt}
                      </span>
                    </label>
                  ))}
                  {isApprovedStatus(applicant.status) && !applicant.generalManagerReview?.result && (
                    <label className="flex items-center gap-1.5 cursor-default mt-0.5 pt-1 border-t border-gray-300">
                      <span className="inline-block w-3.5 h-3.5 border border-black rounded-sm bg-black text-white text-[9px] text-center font-bold leading-3">
                        ✓
                      </span>
                      <span className="font-bold underline text-emerald-900">راتب مقترح</span>
                    </label>
                  )}
                </div>
              </td>
              <td className="p-2 text-right text-xs align-top whitespace-pre-wrap">
                {applicant.generalManagerReview?.notice || '........................'}
              </td>
              <td className="p-2 align-bottom">
                {renderPrintSignatureCell(
                  applicant.signatures?.general_manager || applicant.generalManagerReview?.electronicSignature,
                  applicant.generalManagerReview?.signature,
                  applicant.generalManagerReview?.reviewedAt
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Official Footer / Stamp area */}
      <div className="mt-6 pt-4 border-t-2 border-black flex justify-between items-center text-xs text-gray-700">
        <div>
          <span>محرر السجل: </span>
          <span className="font-semibold">نظام إدارة التوظيف الإلكتروني (آخر ساعة إسبشيال)</span>
        </div>
        <div className="border-2 border-dashed border-gray-400 px-6 py-2 rounded text-center">
          <span className="text-[10px] text-gray-500 block">خاتم الإدارة والاعتماد المالي</span>
          <span className="font-bold text-gray-800 tracking-wider">شركة آخر ساعة إسبشيال</span>
        </div>
        <div>
          <span>صفحة 1 من 1</span>
        </div>
      </div>
    </div>
  );
};
