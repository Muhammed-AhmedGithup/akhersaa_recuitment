import { JobApplication, ApplicationStatus, finalSalarySourceToLabel } from '../types';
import { guessDepartmentFromPosition, getDepartmentInfo } from './departments';

/**
 * Robust CSV parser that handles quotes, escaped quotes, commas, and linebreaks.
 */
export function parseCSV(text: string): string[][] {
  const p: string[][] = [];
  let row: string[] = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      if (row.length > 1 || row[0].trim() !== '') {
        p.push(row.map(cell => cell.trim()));
      }
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }

  if (row.length > 1 || row[0].trim() !== '') {
    p.push(row.map(cell => cell.trim()));
  }

  return p;
}

/**
 * Formats Google Drive open/view links to direct thumbnail/viewable image URLs for <img> rendering.
 */
export function formatGoogleDriveImageUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Extract ID from Google Drive links:
  // e.g. https://drive.google.com/open?id=10eg5NjT-YmM1XME3yXW78w-bgoPU7qBM
  // or https://drive.google.com/file/d/10eg5NjT-YmM1XME3yXW78w-bgoPU7qBM/view
  // or https://drive.google.com/uc?id=10eg5NjT-YmM1XME3yXW78w-bgoPU7qBM
  const idMatch =
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);

  if (idMatch && idMatch[1]) {
    const fileId = idMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }

  return trimmed;
}

export function getOriginalDriveUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  const idMatch =
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/file/d/${idMatch[1]}/view`;
  }
  return trimmed;
}

export function parseGoogleSheetApplicants(csvText: string): JobApplication[] {
  const matrix = parseCSV(csvText);
  if (matrix.length < 2) return [];

  // Find column indices by Arabic/English keywords
  const headers = matrix[0].map(h => h.trim().replace(/^"|"$/g, ''));

  const findAllIdx = (patterns: string[], excludePatterns: string[] = []): number[] => {
    const matches: number[] = [];
    headers.forEach((h, i) => {
      const matched = patterns.some(p => h.includes(p));
      const excluded = excludePatterns.some(e => h.includes(e));
      if (matched && !excluded) matches.push(i);
    });
    return matches;
  };

  const findIdx = (patterns: string[], excludePatterns: string[] = []): number => {
    const matches = findAllIdx(patterns, excludePatterns);
    return matches.length > 0 ? matches[0] : -1;
  };

  const idxTimestamp = findIdx(['Timestamp', 'الطابع الزمني', 'الوقت']);
  const idxName = findIdx(['الاسم', 'الرباعي', 'الثلاثي', 'Name']);
  const idxNationalId = findIdx(['الرقم القومي', 'القومي', 'بطاقة', 'National ID']);
  const idxBirthDate = findIdx(['تاريخ الميلاد', 'الميلاد', 'Birth']);
  const idxGender = findIdx(['النوع', 'الجنس', 'Gender']);
  const idxAddress = findIdx(['العنوان', 'العنوان التفصيلي', 'Address']);
  const idxPhone = findIdx(['رقم الهاتف', 'الواتساب', 'Phone', 'Mobile']);
  const idxEmergency = findIdx(['أقارب', 'صلة القرابة', 'طوارئ', 'Emergency']);
  const idxQualification = findIdx(['المؤهل', 'المؤهل الدراسي', 'Education']);
  const idxQualDate = findIdx(['تاريخ الحصول', 'سنة التخرج']);
  const idxMarital = findIdx(['الحالة الاجتماعية', 'Marital']);
  const idxPosition = findIdx(['الوظيفة المتقدم لها', 'الوظيفة المطلوبة', 'Position']);
  const idxReferral = findIdx(['معارف', 'توصية', 'Referral']);

  // Multi-experience columns
  const companyIndices = findAllIdx(['اسم الشركة', 'الشركة السابقة'], ['معارف']);
  const positionIndices = findAllIdx(['المسمى الوظيفي', 'الوظيفة'], ['المتقدم لها', 'المطلوبة']);
  const managerIndices = findAllIdx(['المدير المباشر']);
  const periodIndices = findAllIdx(['عدد السنين', 'الفترات']);
  const hoursIndices = findAllIdx(['ساعات العمل', 'ساعات العمل اليومية']);
  const salaryIndices = findAllIdx(['الراتب'], ['الراتب المتوقع']);
  const reasonIndices = findAllIdx(['سبب ترك العمل']);

  // Skills & Other
  const idxComputer = findIdx(['الكمبيوتر', 'مهارات']);
  const idxEnglish = findIdx(['الإنجليزية', 'English']);
  const licenseIndices = findAllIdx(['هل لديك رخصة قيادة', 'رخصة القيادة', 'License'], ['درجة']);
  const idxSmoking = findIdx(['مدخن', 'تدخين']);
  const idxHealth = findIdx(['أمراض', 'مزمنة', 'معوقة']);
  const idxToday = findIdx(['تاريخ اليوم']);
  const idxScore = findIdx(['Score', 'الدرجة']);

  // New fields from latest Google Form schema
  const idxPraying = findIdx(['مصلي', 'الصلاة', 'هل انت مصلي']);
  const idxMilitary = findIdx(['التجنيد', 'الموقف من التجنيد', 'الخدمة العسكرية']);
  const idxExpectedSalary = findIdx(['الراتب المتوقع', 'راتب متوقع']);
  const idxLicenseDegree = findIdx(['درجة رخصة القيادة', 'درجة الرخصة']);
  const photoIndices = findAllIdx(['صورة شخصية', 'الصورة الشخصية', 'Photo']);

  const applications: JobApplication[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0 || row.every(c => !c.trim())) continue;

    const getVal = (idx: number, fallback = '') => {
      if (idx >= 0 && idx < row.length) return row[idx].trim();
      return fallback;
    };

    const fullName = getVal(idxName, row[1] || 'متقدم');
    const nationalId = getVal(idxNationalId, row[2] || '');
    const phone = getVal(idxPhone, row[6] || '');

    // Skip blank rows
    if (!fullName && !phone && !nationalId) continue;

    const recordNumber = `REC-${new Date().getFullYear()}-${String(r).padStart(3, '0')}`;
    const timestamp = getVal(idxTimestamp, new Date().toLocaleString('ar-EG'));

    // Job 1
    const prevCompany = getVal(companyIndices[0] ?? -1, row[13] || '');
    const prevPosition = getVal(positionIndices[0] ?? -1, row[14] || '');
    const prevManager = getVal(managerIndices[0] ?? -1, row[15] || '');
    const experienceYears = getVal(periodIndices[0] ?? -1, row[16] || '');
    const workHours = getVal(hoursIndices[0] ?? -1, row[17] || '');
    const prevSalary = getVal(salaryIndices[0] ?? -1, row[18] || '');
    const reasonForLeaving = getVal(reasonIndices[0] ?? -1, row[19] || '');

    // Job 2 (if present)
    const prevCompany2 = getVal(companyIndices[1] ?? -1, row[33] || '');
    const prevPosition2 = getVal(positionIndices[1] ?? -1, row[34] || '');
    const prevManager2 = getVal(managerIndices[1] ?? managerIndices[2] ?? -1, row[30] || row[35] || '');
    const experienceYears2 = getVal(periodIndices[1] ?? periodIndices[2] ?? -1, row[31] || row[36] || '');
    const workHours2 = getVal(hoursIndices[1] ?? -1, row[32] || '');
    const reasonForLeaving2 = getVal(reasonIndices[1] ?? -1, row[37] || '');

    // Job 3 (if present)
    const prevCompany3 = getVal(companyIndices[2] ?? -1, row[38] || '');
    const prevPosition3 = getVal(positionIndices[2] ?? -1, row[39] || '');
    const prevManager3 = getVal(managerIndices[3] ?? managerIndices[managerIndices.length - 1] ?? -1, row[40] || '');
    const experienceYears3 = getVal(periodIndices[3] ?? periodIndices[periodIndices.length - 1] ?? -1, row[41] || '');
    const reasonForLeaving3 = getVal(reasonIndices[2] ?? -1, row[42] || '');

    // Personal Photo (find first non-empty among photo columns)
    let rawPhoto = '';
    for (const pIdx of photoIndices) {
      const val = getVal(pIdx);
      if (val) {
        rawPhoto = val;
        break;
      }
    }
    if (!rawPhoto && row[46]) rawPhoto = row[46].trim();
    if (!rawPhoto && row[47]) rawPhoto = row[47].trim();

    const personalPhotoUrl = formatGoogleDriveImageUrl(rawPhoto);

    // Driving license degree & status
    const drivingLicenseDegree = getVal(idxLicenseDegree, row[45] || '');
    let drivingLicense = '';
    for (const lIdx of licenseIndices) {
      const val = getVal(lIdx);
      if (val) {
        drivingLicense = val;
        break;
      }
    }
    if (!drivingLicense) {
      drivingLicense = drivingLicenseDegree ? 'نعم' : 'لا';
    }

    applications.push({
      id: `app-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`,
      recordNumber,
      timestamp,
      fullName,
      nationalId,
      birthDate: getVal(idxBirthDate, row[3] || ''),
      gender: getVal(idxGender, row[4] || 'غير محدد'),
      address: getVal(idxAddress, row[5] || ''),
      phone,
      emergencyContact: getVal(idxEmergency, row[7] || ''),
      qualification: getVal(idxQualification, row[8] || ''),
      qualificationDate: getVal(idxQualDate, row[9] || ''),
      maritalStatus: getVal(idxMarital, row[10] || ''),
      positionApplied: getVal(idxPosition, row[11] || 'غير محدد'),
      assignedDepartment: guessDepartmentFromPosition(getVal(idxPosition, row[11] || '')),
      assignedDepartmentManager: getDepartmentInfo(guessDepartmentFromPosition(getVal(idxPosition, row[11] || '')))?.managerTitle || 'مدير الإدارة',
      internalReferrals: getVal(idxReferral, row[12] || ''),
      
      // Job 1
      prevCompany,
      prevPosition,
      prevManager,
      experienceYears,
      workHours,
      prevSalary,
      reasonForLeaving,

      // Job 2
      prevCompany2: prevCompany2 || undefined,
      prevPosition2: prevPosition2 || undefined,
      prevManager2: prevManager2 || undefined,
      experienceYears2: experienceYears2 || undefined,
      workHours2: workHours2 || undefined,
      reasonForLeaving2: reasonForLeaving2 || undefined,

      // Job 3
      prevCompany3: prevCompany3 || undefined,
      prevPosition3: prevPosition3 || undefined,
      prevManager3: prevManager3 || undefined,
      experienceYears3: experienceYears3 || undefined,
      reasonForLeaving3: reasonForLeaving3 || undefined,

      // Skills & Health
      computerSkills: getVal(idxComputer, row[20] || ''),
      englishLevel: getVal(idxEnglish, row[21] || ''),
      drivingLicense,
      drivingLicenseDegree: drivingLicenseDegree || undefined,
      smoking: getVal(idxSmoking, row[23] || 'لا'),
      chronicDiseases: getVal(idxHealth, row[24] || 'لا'),
      acknowledgement: 'أقر بأن جميع البيانات صحيحة وعلى مسؤوليتي الشخصية.',
      todayDate: getVal(idxToday, row[26] || ''),
      score: getVal(idxScore, row[27] || ''),

      // New Expanded Fields
      isPraying: getVal(idxPraying, row[28] || ''),
      militaryStatus: getVal(idxMilitary, row[29] || ''),
      expectedSalary: getVal(idxExpectedSalary, row[43] || ''),
      personalPhotoUrl: personalPhotoUrl || undefined,

      // 4-Stage Reviews (kept 100% intact)
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
        salaryLevel1: '',
        salaryLevel2: '',
        salaryLevel3: '',
        result: null,
        notice: '',
        signature: '',
      },
      status: 'new',
      lastUpdated: new Date().toISOString(),
    });
  }

  return applications;
}

export function exportApplicantsToCSV(apps: JobApplication[]): string {
  const headers = [
    'رقم القيد',
    'تاريخ التقديم',
    'الاسم الكامل',
    'الرقم القومي',
    'تاريخ الميلاد',
    'النوع',
    'العنوان',
    'رقم الهاتف',
    'رقم الطوارئ',
    'المؤهل الدراسي',
    'الحالة الاجتماعية',
    'الموقف من التجنيد',
    'هل انت مصلي؟',
    'الوظيفة المتقدم لها',
    'الراتب المتوقع',
    'رخصة القيادة',
    'درجة رخصة القيادة',
    'رابط الصورة الشخصية',
    'الإدارة الموجه إليها',
    'مدير الإدارة المختص',
    'الخبرة السابقة 1 (الشركة والوظيفة)',
    'الخبرة السابقة 2',
    'الخبرة السابقة 3',
    'الحالة الحالية',
    'تاريخ آخر إجراء',
    'قرار الموارد البشرية',
    'ملاحظات الموارد البشرية',
    'قرار مدير الموارد البشرية',
    'ملاحظات مدير الموارد البشرية',
    'قرار مدير الإدارة',
    'ملاحظات مدير الإدارة',
    'قرار المدير العام النهائي',
    'مقترح راتب مدير الموارد البشرية',
    'مقترح راتب مدير الإدارة',
    'مصدر الراتب النهائي',
    'الراتب المعتمد',
    'ملاحظات المدير العام'
  ];

  const rows = apps.map(a => [
    `"${a.recordNumber}"`,
    `"${a.timestamp}"`,
    `"${a.fullName}"`,
    `"${a.nationalId}"`,
    `"${a.birthDate}"`,
    `"${a.gender}"`,
    `"${a.address}"`,
    `"${a.phone}"`,
    `"${a.emergencyContact}"`,
    `"${a.qualification}"`,
    `"${a.maritalStatus}"`,
    `"${a.militaryStatus || '—'}"`,
    `"${a.isPraying || '—'}"`,
    `"${a.positionApplied}"`,
    `"${a.expectedSalary || '—'}"`,
    `"${a.drivingLicense}"`,
    `"${a.drivingLicenseDegree || '—'}"`,
    `"${a.personalPhotoUrl || '—'}"`,
    `"${a.assignedDepartment || '—'}"`,
    `"${a.assignedDepartmentManager || '—'}"`,
    `"${a.prevCompany ? `${a.prevCompany} - ${a.prevPosition}` : '—'}"`,
    `"${a.prevCompany2 ? `${a.prevCompany2} - ${a.prevPosition2}` : '—'}"`,
    `"${a.prevCompany3 ? `${a.prevCompany3} - ${a.prevPosition3}` : '—'}"`,
    `"${getStatusLabel(a.status, a.assignedDepartment)}"`,
    `"${a.lastActionDate || '—'}"`,
    `"${a.hrReview?.result || 'معلق'}"`,
    `"${(a.hrReview?.notice || '').replace(/"/g, '""')}"`,
    `"${a.hrManagerReview?.result || 'معلق'}"`,
    `"${(a.hrManagerReview?.notice || '').replace(/"/g, '""')}"`,
    `"${a.directManagerReview?.result || 'معلق'}"`,
    `"${(a.directManagerReview?.notice || '').replace(/"/g, '""')}"`,
    `"${a.generalManagerReview?.result || 'معلق'}"`,
    `"${a.hrManagerSalaryProposal?.formattedAmount || '—'}"`,
    `"${a.directManagerSalaryProposal?.formattedAmount || '—'}"`,
    `"${finalSalarySourceToLabel(a.generalManagerReview?.finalSalarySource) || '—'}"`,
    `"${a.generalManagerReview?.finalApprovedSalary || ''}"`,
    `"${(a.generalManagerReview?.notice || '').replace(/"/g, '""')}"`
  ].join(','));

  // BOM for Excel Arabic compatibility
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

export function getStatusLabel(status: ApplicationStatus | string, assignedDepartment?: string | null): string {
  switch (status) {
    case 'new': return 'وارد جديد';
    case 'hr_pending': return 'بانتظار الموارد البشرية';
    case 'hr_manager_pending': return 'بانتظار مدير الموارد البشرية';
    case 'dept_finance_pending': return 'بإنتظار مدير ادارة الماليه';
    case 'dept_executive_pending': return 'بإنتظار مدير ادارة التنفيذيه';
    case 'dept_services_pending': return 'بإنتظار مدير ادارة الخدمات';
    case 'dept_production_pending': return 'بإنتظار مدير ادارة الإنتاج';
    case 'dept_control_pending': return 'بإنتظار مدير ادارة الرقابة';
    case 'dept_marketing_pending': return 'بإنتظار مدير ادارة التسويق';
    case 'dept_sales_pending': return 'بإنتظار مدير ادارة المبيعات';
    case 'dept_pending': {
      if (assignedDepartment === 'إدارة المالية') return 'بإنتظار مدير ادارة الماليه';
      if (assignedDepartment === 'إدارة التنفيذية') return 'بإنتظار مدير ادارة التنفيذيه';
      if (assignedDepartment === 'إدارة الخدمات') return 'بإنتظار مدير ادارة الخدمات';
      if (assignedDepartment === 'إدارة الإنتاج') return 'بإنتظار مدير ادارة الإنتاج';
      if (assignedDepartment === 'إدارة الرقابة') return 'بإنتظار مدير ادارة الرقابة';
      if (assignedDepartment === 'إدارة التسويق') return 'بإنتظار مدير ادارة التسويق';
      if (assignedDepartment === 'إدارة المبيعات') return 'بإنتظار مدير ادارة المبيعات';
      return assignedDepartment ? `بإنتظار مدير ${assignedDepartment}` : 'بإنتظار مدير الإدارة';
    }
    case 'gm_pending': return 'بانتظار اعتماد المدير العام';
    case 'approved_lvl1': return 'معتمد - مستوى أول';
    case 'approved_lvl2': return 'معتمد - مستوى ثاني';
    case 'approved_lvl3': return 'معتمد - مستوى ثالث';
    case 'approved_proposal': return 'معتمد - راتب مقترح';
    case 'waitlist': return 'قائمة الانتظار';
    case 'rejected': return 'مرفوض';
    default: return String(status);
  }
}
