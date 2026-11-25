import React, { useState } from 'react';
import {
  JobApplication,
  EvaluationResult,
  UserRole,
  DepartmentType,
  ApplicationStatus,
  SalaryLevelKey,
  FinalSalarySource,
  SalaryStructureConfig,
  formatSalaryAmount,
  getApplicationSalaryForLevel,
  parseSalaryNumeric,
  decisionToSalaryLevel,
  salaryLevelToDecision,
  salaryLevelToLabel,
  finalSalarySourceToLabel,
} from '../types';
import {
  Check,
  X,
  Printer,
  ShieldCheck,
  UserCheck,
  Award,
  FileText,
  Briefcase,
  Building2,
  AlertTriangle,
  Banknote,
  Save,
  Loader2,
  Lock,
  Copy,
} from 'lucide-react';
import {
  DEPARTMENTS,
  guessDepartmentFromPosition,
  isDepartmentManagerRole,
  getDepartmentManagerTitle,
  getDepartmentPendingStatus,
  getDepartmentForRole,
  isDeptPending,
} from '../utils/departments';
import { DecisionPayload, PerApplicationSalaryLevelsPayload } from '../services/apiService';
import { validateWorkflowTransition } from '../utils/workflowAuthorization';
import { useAuth } from '../context/AuthContext';
import { ElectronicSignatureBadge, PendingAutoSignatureBox } from './ElectronicSignatureBadge';
import { StageDraftPayload } from './QuickDecisionModal';

interface EvaluationSheetModalProps {
  applicant: JobApplication;
  activeRole: UserRole;
  salaryStructure?: SalaryStructureConfig | null;
  canManageSalaryStructure?: boolean;
  onOpenSalaryStructure?: () => void;
  onSaveAppSalaryLevels?: (
    applicantId: string,
    payload: {
      level1Salary: number;
      level2Salary: number;
      level3Salary: number;
      currency: string;
    }
  ) => Promise<void>;
  onSaveDraft?: (applicantId: string, draft: StageDraftPayload) => Promise<void> | void;
  onClose: () => void;
  onSave: (updatedApplicant: JobApplication, payload?: DecisionPayload) => Promise<void> | void;
  onPrint: () => void;
}

const RESULT_OPTIONS: EvaluationResult[] = [
  'مستوى أول',
  'مستوى ثاني',
  'مستوى ثالث',
  'انتظار',
  'مرفوض',
];

export const EvaluationSheetModal: React.FC<EvaluationSheetModalProps> = ({
  applicant,
  activeRole,
  salaryStructure,
  canManageSalaryStructure,
  onSaveAppSalaryLevels,
  onSaveDraft,
  onClose,
  onSave,
  onPrint,
}) => {
  const { appUser } = useAuth();
  const isSystemAdmin =
    activeRole === 'admin' || Boolean(appUser?.isSuperAdmin) || appUser?.role === 'admin';
  const [overrideTargetStatus, setOverrideTargetStatus] = useState<'auto' | ApplicationStatus>('auto');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [salarySaveSuccess, setSalarySaveSuccess] = useState<string | null>(null);
  const initialDept: DepartmentType =
    applicant.assignedDepartment || guessDepartmentFromPosition(applicant.positionApplied);
  const initialDeptManager =
    applicant.assignedDepartmentManager || getDepartmentManagerTitle(initialDept);

  const [formData, setFormData] = useState<JobApplication>({
    ...applicant,
    assignedDepartment: initialDept,
    assignedDepartmentManager: initialDeptManager,
    hrManagerReview: applicant.hrManagerReview || {
      positives: '',
      negatives: '',
      result: null,
      notice: '',
      signature: '',
    },
    directManagerReview: {
      ...applicant.directManagerReview,
      department: applicant.directManagerReview?.department || initialDept,
      managerTitle: applicant.directManagerReview?.managerTitle || initialDeptManager,
    },
  });

  const [selectedTab, setSelectedTab] = useState<'all' | 'hr' | 'hr_manager' | 'dept' | 'gm'>(
    activeRole === 'hr'
      ? 'hr'
      : activeRole === 'hr_manager'
      ? 'hr_manager'
      : isDepartmentManagerRole(activeRole)
      ? 'dept'
      : activeRole === 'general_manager'
      ? 'gm'
      : 'all'
  );

  const handleHrChange = (field: keyof JobApplication['hrReview'], value: any) => {
    setFormData((prev) => ({
      ...prev,
      hrReview: {
        ...prev.hrReview,
        [field]: value,
        reviewedAt: new Date().toLocaleString('ar-EG'),
      },
    }));
  };

  const handleHrManagerChange = (field: keyof JobApplication['hrManagerReview'], value: any) => {
    setFormData((prev) => ({
      ...prev,
      hrManagerReview: {
        ...prev.hrManagerReview,
        [field]: value,
        reviewedAt: new Date().toLocaleString('ar-EG'),
      },
    }));
  };

  const handleDeptChange = (field: keyof JobApplication['directManagerReview'], value: any) => {
    setFormData((prev) => ({
      ...prev,
      directManagerReview: {
        ...prev.directManagerReview,
        [field]: value,
        department: prev.assignedDepartment,
        managerTitle: prev.assignedDepartmentManager,
        reviewedAt: new Date().toLocaleString('ar-EG'),
      },
    }));
  };

  const handleGmChange = (field: keyof JobApplication['generalManagerReview'], value: any) => {
    setFormData((prev) => ({
      ...prev,
      generalManagerReview: {
        ...prev.generalManagerReview,
        [field]: value,
        reviewedAt: new Date().toLocaleString('ar-EG'),
      },
    }));
  };

  const isSalaryLocked = Boolean(applicant.generalManagerReview?.isSalaryLocked);
  const canEditAppSalary = Boolean(
    (canManageSalaryStructure || activeRole === 'hr' || isSystemAdmin) && !isSalaryLocked
  );
  const appCurrency = formData.generalManagerReview?.currency || 'ج.م';

  const [appLevel1, setAppLevel1] = useState<string>(
    getApplicationSalaryForLevel(applicant.generalManagerReview, 'level1')?.toString() || ''
  );
  const [appLevel2, setAppLevel2] = useState<string>(
    getApplicationSalaryForLevel(applicant.generalManagerReview, 'level2')?.toString() || ''
  );
  const [appLevel3, setAppLevel3] = useState<string>(
    getApplicationSalaryForLevel(applicant.generalManagerReview, 'level3')?.toString() || ''
  );
  const [hrManagerProposedSalary, setHrManagerProposedSalary] = useState<string>(
    applicant.hrManagerSalaryProposal?.proposedAmount?.toString() || ''
  );
  const [hrManagerProposalNotes, setHrManagerProposalNotes] = useState<string>(
    applicant.hrManagerSalaryProposal?.notes || ''
  );
  const [directManagerProposedSalary, setDirectManagerProposedSalary] = useState<string>(
    applicant.directManagerSalaryProposal?.proposedAmount?.toString() || ''
  );
  const [directManagerProposalNotes, setDirectManagerProposalNotes] = useState<string>(
    applicant.directManagerSalaryProposal?.notes || ''
  );
  const [selectedSalarySource, setSelectedSalarySource] = useState<FinalSalarySource | null>(() => {
    if (
      applicant.generalManagerReview?.result === 'مرفوض' ||
      applicant.generalManagerReview?.result === 'انتظار'
    ) {
      return null;
    }
    return (
      applicant.generalManagerReview?.finalSalarySource ??
      applicant.generalManagerReview?.selectedSalaryLevel ??
      decisionToSalaryLevel(applicant.generalManagerReview?.result) ??
      null
    );
  });

  const syncAppSalaryFieldsToForm = (l1Raw: string, l2Raw: string, l3Raw: string) => {
    const n1 = parseSalaryNumeric(l1Raw);
    const n2 = parseSalaryNumeric(l2Raw);
    const n3 = parseSalaryNumeric(l3Raw);
    setFormData((prev) => ({
      ...prev,
      generalManagerReview: {
        ...prev.generalManagerReview,
        currency: appCurrency,
        level1Amount: n1,
        level2Amount: n2,
        level3Amount: n3,
        salaryLevel1: n1 ? formatSalaryAmount(n1, appCurrency) : '',
        salaryLevel2: n2 ? formatSalaryAmount(n2, appCurrency) : '',
        salaryLevel3: n3 ? formatSalaryAmount(n3, appCurrency) : '',
      },
    }));
  };

  const getAppFormSalaryForLevel = (lvl: SalaryLevelKey): number | null => {
    if (lvl === 'level1') return parseSalaryNumeric(appLevel1) ?? getApplicationSalaryForLevel(formData.generalManagerReview, 'level1');
    if (lvl === 'level2') return parseSalaryNumeric(appLevel2) ?? getApplicationSalaryForLevel(formData.generalManagerReview, 'level2');
    return parseSalaryNumeric(appLevel3) ?? getApplicationSalaryForLevel(formData.generalManagerReview, 'level3');
  };

  const buildSalaryLevelsPayload = (): PerApplicationSalaryLevelsPayload | undefined => {
    if (!canEditAppSalary) return undefined;
    const l1 = parseSalaryNumeric(appLevel1);
    const l2 = parseSalaryNumeric(appLevel2);
    const l3 = parseSalaryNumeric(appLevel3);
    if (!l1 && !l2 && !l3) return undefined;
    return {
      level1Salary: l1,
      level2Salary: l2,
      level3Salary: l3,
      currency: appCurrency,
    };
  };

  const handleCopyGlobalTemplate = () => {
    if (!canEditAppSalary || !salaryStructure) return;
    const s1 = salaryStructure.level1Salary ? String(salaryStructure.level1Salary) : appLevel1;
    const s2 = salaryStructure.level2Salary ? String(salaryStructure.level2Salary) : appLevel2;
    const s3 = salaryStructure.level3Salary ? String(salaryStructure.level3Salary) : appLevel3;
    setAppLevel1(s1);
    setAppLevel2(s2);
    setAppLevel3(s3);
    syncAppSalaryFieldsToForm(s1, s2, s3);
    setSalarySaveSuccess(null);
    setLocalError(null);
  };

  const handleSaveAppSalaryClick = async () => {
    if (!canEditAppSalary || !onSaveAppSalaryLevels) return;
    setLocalError(null);
    setSalarySaveSuccess(null);
    const l1 = parseSalaryNumeric(appLevel1);
    const l2 = parseSalaryNumeric(appLevel2);
    const l3 = parseSalaryNumeric(appLevel3);
    if (!l1 || !l2 || !l3) {
      setLocalError('يرجى إدخال قيم صحيحة أكبر من الصفر لجميع مستويات الراتب الثلاثة داخل الاستمارة.');
      return;
    }
    setIsSavingSalary(true);
    try {
      await onSaveAppSalaryLevels(formData.id, {
        level1Salary: l1,
        level2Salary: l2,
        level3Salary: l3,
        currency: appCurrency,
      });
      syncAppSalaryFieldsToForm(String(l1), String(l2), String(l3));
      setSalarySaveSuccess('تم حفظ مستويات الرواتب الثلاثة داخل هذه الاستمارة بنجاح');
    } catch (err: any) {
      setLocalError(err?.message || 'تعذر حفظ مستويات الرواتب داخل الاستمارة');
    } finally {
      setIsSavingSalary(false);
    }
  };

  const getSourceNumericAmount = (src: FinalSalarySource): number | null => {
    if (src === 'level1' || src === 'level2' || src === 'level3') {
      return getAppFormSalaryForLevel(src);
    }
    if (src === 'hr_manager_proposal') {
      return applicant.hrManagerSalaryProposal?.proposedAmount ?? null;
    }
    return applicant.directManagerSalaryProposal?.proposedAmount ?? null;
  };

  const handleGmSelectSource = (src: FinalSalarySource) => {
    if (isSalaryLocked && !isSystemAdmin) return;
    const numericVal = getSourceNumericAmount(src);
    if (!numericVal || numericVal <= 0) return;
    setLocalError(null);
    setSelectedSalarySource(src);
    const amountStr = formatSalaryAmount(numericVal, appCurrency);
    const l1Val = getAppFormSalaryForLevel('level1');
    const l2Val = getAppFormSalaryForLevel('level2');
    const l3Val = getAppFormSalaryForLevel('level3');
    const isLevelSource = src === 'level1' || src === 'level2' || src === 'level3';
    setFormData((prev) => ({
      ...prev,
      generalManagerReview: {
        ...prev.generalManagerReview,
        currency: appCurrency,
        level1Amount: l1Val,
        level2Amount: l2Val,
        level3Amount: l3Val,
        salaryLevel1: formatSalaryAmount(l1Val, appCurrency) || prev.generalManagerReview.salaryLevel1,
        salaryLevel2: formatSalaryAmount(l2Val, appCurrency) || prev.generalManagerReview.salaryLevel2,
        salaryLevel3: formatSalaryAmount(l3Val, appCurrency) || prev.generalManagerReview.salaryLevel3,
        selectedSalaryLevel: isLevelSource ? src : null,
        finalSalarySource: src,
        finalApprovedSalaryAmount: numericVal,
        result: isLevelSource ? salaryLevelToDecision(src) : 'مستوى أول',
        finalApprovedSalary: amountStr || '',
        reviewedAt: new Date().toLocaleString('ar-EG'),
      },
    }));
  };

  const activeDraftStage: 'hr' | 'hr_manager' | 'direct_manager' | null =
    activeRole === 'hr'
      ? 'hr'
      : activeRole === 'hr_manager'
      ? 'hr_manager'
      : isDepartmentManagerRole(activeRole) || activeRole === 'direct_manager'
      ? 'direct_manager'
      : activeRole === 'admin'
      ? formData.status === 'hr_manager_pending'
        ? 'hr_manager'
        : isDeptPending(formData.status)
        ? 'direct_manager'
        : formData.status === 'new' || formData.status === 'hr_pending'
        ? 'hr'
        : null
      : null;

  const isAdminAtGmContext =
    activeRole === 'admin' &&
    (formData.status === 'gm_pending' ||
      formData.status.startsWith('approved') ||
      formData.status === 'rejected' ||
      formData.status === 'waitlist' ||
      overrideTargetStatus.startsWith('approved'));

  const isGmStageActive = activeRole === 'general_manager' || isAdminAtGmContext;

  const currentSelectedGmSource: FinalSalarySource | null =
    overrideTargetStatus === 'approved_lvl1'
      ? 'level1'
      : overrideTargetStatus === 'approved_lvl2'
      ? 'level2'
      : overrideTargetStatus === 'approved_lvl3'
      ? 'level3'
      : formData.generalManagerReview?.result === 'مرفوض' ||
        formData.generalManagerReview?.result === 'انتظار'
      ? null
      : selectedSalarySource ??
        formData.generalManagerReview?.finalSalarySource ??
        formData.generalManagerReview?.selectedSalaryLevel ??
        decisionToSalaryLevel(formData.generalManagerReview?.result);

  const currentSelectedGmLevel: SalaryLevelKey | null =
    currentSelectedGmSource === 'level1' ||
    currentSelectedGmSource === 'level2' ||
    currentSelectedGmSource === 'level3'
      ? currentSelectedGmSource
      : null;

  const isGmHiringApproval =
    isGmStageActive &&
    (overrideTargetStatus.startsWith('approved') ||
      (overrideTargetStatus === 'auto' &&
        formData.generalManagerReview?.result !== 'مرفوض' &&
        formData.generalManagerReview?.result !== 'انتظار'));

  const chosenSourceNumericSalary = currentSelectedGmSource
    ? getSourceNumericAmount(currentSelectedGmSource)
    : null;

  const isSalaryLockedForNonAdmin = Boolean(isSalaryLocked && !isSystemAdmin && isGmStageActive);

  const isSalaryGateBlocked = Boolean(
    (isGmHiringApproval &&
      (!chosenSourceNumericSalary || chosenSourceNumericSalary <= 0)) ||
      isSalaryLockedForNonAdmin
  );

  const getStageProposedSalaryInput = () => {
    if (activeDraftStage === 'hr_manager') {
      return {
        raw: hrManagerProposedSalary,
        parsed: parseSalaryNumeric(hrManagerProposedSalary),
        notes: hrManagerProposalNotes,
      };
    }
    if (activeDraftStage === 'direct_manager') {
      return {
        raw: directManagerProposedSalary,
        parsed: parseSalaryNumeric(directManagerProposedSalary),
        notes: directManagerProposalNotes,
      };
    }
    return { raw: '', parsed: null, notes: '' };
  };

  const handleSaveDraftClick = async () => {
    if (!onSaveDraft || !activeDraftStage) return;
    setLocalError(null);
    setSalarySaveSuccess(null);
    const propInput = getStageProposedSalaryInput();
    if (propInput.raw.trim() !== '' && (!propInput.parsed || propInput.parsed <= 0)) {
      setLocalError('يرجى إدخال قيمة راتب مقترح صحيحة أكبر من الصفر.');
      return;
    }
    setIsSavingDraft(true);
    try {
      const stageData =
        activeDraftStage === 'hr_manager'
          ? formData.hrManagerReview
          : activeDraftStage === 'direct_manager'
          ? formData.directManagerReview
          : formData.hrReview;
      await onSaveDraft(formData.id, {
        stage: activeDraftStage,
        positives: stageData?.positives || '',
        negatives: stageData?.negatives || '',
        notice: stageData?.notice || '',
        result: stageData?.result || null,
        assignedDepartment: formData.assignedDepartment,
        salaryLevels: buildSalaryLevelsPayload(),
        proposedSalary:
          activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager'
            ? propInput.parsed
            : undefined,
        proposalNotes:
          activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager'
            ? propInput.notes
            : undefined,
      });
    } catch (err: any) {
      setLocalError(err?.message || 'تعذر حفظ التقييمات في قاعدة البيانات');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (isSalaryLockedForNonAdmin) {
      setLocalError('تم تثبيت الراتب نهائياً بقرار المدير العام داخل هذه الاستمارة ولا يمكن تغييره.');
      return;
    }

    const propInput = getStageProposedSalaryInput();
    if (propInput.raw.trim() !== '' && (!propInput.parsed || propInput.parsed <= 0)) {
      setLocalError('يرجى إدخال قيمة راتب مقترح صحيحة أكبر من الصفر.');
      return;
    }

    if (isSalaryGateBlocked) {
      setLocalError(
        'لا يمكن إتمام الاعتماد النهائي: يجب اختيار خيار راتب صالح ومتاح (مستوى من هيكل الرواتب أو مقترح راتب معتمد).'
      );
      return;
    }

    let nextStatus = formData.status;
    let actionType = 'تحديث التقييم';
    const deptTitle = formData.assignedDepartmentManager || 'مدير الإدارة المختصة';

    if (activeRole === 'general_manager' || (activeRole === 'admin' && formData.status === 'gm_pending')) {
      if (formData.generalManagerReview?.result === 'انتظار') nextStatus = 'waitlist';
      else if (formData.generalManagerReview?.result === 'مرفوض') nextStatus = 'rejected';
      else if (
        currentSelectedGmSource === 'hr_manager_proposal' ||
        currentSelectedGmSource === 'direct_manager_proposal'
      ) {
        nextStatus = 'approved_proposal';
      } else if (currentSelectedGmSource === 'level2') nextStatus = 'approved_lvl2';
      else if (currentSelectedGmSource === 'level3') nextStatus = 'approved_lvl3';
      else nextStatus = 'approved_lvl1';
      actionType = nextStatus.startsWith('approved')
        ? 'اعتماد وقبول نهائي'
        : nextStatus === 'rejected'
        ? 'رفض بقرار المدير العام'
        : 'قائمة الانتظار';
    } else if (isDepartmentManagerRole(activeRole) || (activeRole === 'admin' && isDeptPending(formData.status))) {
      if (formData.directManagerReview?.result === 'مرفوض') {
        nextStatus = 'rejected';
        actionType = `رفض من ${deptTitle}`;
      } else if (formData.directManagerReview?.result === 'انتظار') {
        nextStatus = 'waitlist';
        actionType = 'قائمة الانتظار';
      } else {
        nextStatus = 'gm_pending';
        actionType = `إحالة للمدير العام بعد اعتماد ${deptTitle}`;
      }
    } else if (activeRole === 'hr_manager' || (activeRole === 'admin' && formData.status === 'hr_manager_pending')) {
      if (formData.hrManagerReview?.result === 'مرفوض') {
        nextStatus = 'rejected';
        actionType = 'رفض من مدير الموارد البشرية';
      } else if (formData.hrManagerReview?.result === 'انتظار') {
        nextStatus = 'waitlist';
        actionType = 'قائمة الانتظار';
      } else {
        nextStatus = getDepartmentPendingStatus(formData.assignedDepartment);
        actionType = `قبول من مدير الموارد البشرية وإحالة لـ ${deptTitle} لإجراء المقابلة الفنية`;
      }
    } else if (activeRole === 'hr' || (activeRole === 'admin' && (formData.status === 'new' || formData.status === 'hr_pending'))) {
      if (formData.hrReview?.result === 'مرفوض') {
        nextStatus = 'rejected';
        actionType = 'رفض في المقابلة التمهيدية للموارد البشرية';
      } else if (formData.hrReview?.result === 'انتظار') {
        nextStatus = 'waitlist';
        actionType = 'قائمة الانتظار';
      } else {
        nextStatus = 'hr_manager_pending';
        actionType = `إحالة إلى مدير الموارد البشرية (${formData.assignedDepartment || 'الإدارة المختصة'})`;
      }
    }

    let action: DecisionPayload['action'] = 'approve';
    let decisionVal: EvaluationResult | string = 'مستوى أول';
    let reviewData: any = {};
    let chosenLevelToSend: SalaryLevelKey | null | undefined = undefined;

    if (isGmStageActive) {
      decisionVal = formData.generalManagerReview?.result || 'مستوى أول';
      action = decisionVal === 'مرفوض' ? 'reject' : decisionVal === 'انتظار' ? 'waitlist' : 'approve';
      chosenLevelToSend = currentSelectedGmLevel;
      reviewData = {
        notice: formData.generalManagerReview?.notice,
        department: formData.assignedDepartment,
      };
    } else if (
      isDepartmentManagerRole(activeRole) ||
      (activeRole === 'admin' && isDeptPending(formData.status))
    ) {
      decisionVal = formData.directManagerReview?.result || 'مستوى أول';
      action = decisionVal === 'مرفوض' ? 'reject' : decisionVal === 'انتظار' ? 'waitlist' : 'approve';
      reviewData = {
        positives: formData.directManagerReview?.positives,
        negatives: formData.directManagerReview?.negatives,
        notice: formData.directManagerReview?.notice,
        department: formData.assignedDepartment,
      };
    } else if (
      activeRole === 'hr_manager' ||
      (activeRole === 'admin' && formData.status === 'hr_manager_pending')
    ) {
      decisionVal = formData.hrManagerReview?.result || 'مستوى أول';
      action = decisionVal === 'مرفوض' ? 'reject' : decisionVal === 'انتظار' ? 'waitlist' : 'approve';
      reviewData = {
        positives: formData.hrManagerReview?.positives,
        negatives: formData.hrManagerReview?.negatives,
        notice: formData.hrManagerReview?.notice,
        department: formData.assignedDepartment,
      };
    } else {
      decisionVal = formData.hrReview?.result || 'مستوى أول';
      action = decisionVal === 'مرفوض' ? 'reject' : decisionVal === 'انتظار' ? 'waitlist' : 'approve';
      reviewData = {
        positives: formData.hrReview?.positives,
        negatives: formData.hrReview?.negatives,
        notice: formData.hrReview?.notice,
        department: formData.assignedDepartment,
      };
    }

    const explicitOverride =
      isSystemAdmin && overrideTargetStatus !== 'auto' ? overrideTargetStatus : undefined;
    if (explicitOverride) {
      nextStatus = explicitOverride;
      action =
        explicitOverride === 'rejected'
          ? 'reject'
          : explicitOverride === 'waitlist'
          ? 'waitlist'
          : 'override';
    }

    const now = new Date().toLocaleString('ar-EG');
    const updated: JobApplication = {
      ...formData,
      status: nextStatus,
      lastActionDate: now,
      lastActionType: explicitOverride
        ? `توجيه وتعديل الحالة (${explicitOverride}) بقرار مدير النظام`
        : actionType,
      lastUpdated: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(updated, {
        action,
        decision:
          isGmStageActive &&
          (currentSelectedGmSource === 'hr_manager_proposal' ||
            currentSelectedGmSource === 'direct_manager_proposal') &&
          action !== 'reject' &&
          action !== 'waitlist'
            ? finalSalarySourceToLabel(currentSelectedGmSource)
            : decisionVal,
        selectedSalaryLevel: isGmStageActive ? chosenLevelToSend : undefined,
        selectedSalarySource:
          isGmStageActive && action !== 'reject' && action !== 'waitlist'
            ? currentSelectedGmSource
            : undefined,
        proposedSalary:
          activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager'
            ? propInput.parsed
            : undefined,
        proposalNotes:
          activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager'
            ? propInput.notes
            : undefined,
        salaryLevels: buildSalaryLevelsPayload(),
        reviewData,
        targetDepartment: formData.assignedDepartment,
        overrideTargetStatus: explicitOverride,
      });
    } catch (err: any) {
      setLocalError(err?.message || 'تعذر تنفيذ القرار وحفظه');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userDept = getDepartmentForRole(activeRole);
  const authCheck = validateWorkflowTransition(
    activeRole,
    userDept,
    applicant,
    'approve',
    formData.assignedDepartment,
    undefined,
    {
      isAdminOverride: isSystemAdmin,
      overrideTargetStatus:
        isSystemAdmin && overrideTargetStatus !== 'auto' ? overrideTargetStatus : undefined,
      selectedSalarySource: isGmStageActive ? currentSelectedGmSource : undefined,
    }
  );

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg max-w-5xl w-full max-h-[94vh] sm:max-h-[92vh] flex flex-col border-t sm:border border-zinc-200 overflow-hidden text-right animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Modal Header */}
        <div className="bg-[#111318] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-start sm:items-center justify-between gap-2.5 border-b-2 border-[#DC2626]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 bg-[#DC2626] rounded-xl text-white shadow-sm shadow-red-600/25 shrink-0 hidden sm:flex">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs bg-white/10 border border-white/15 px-2 sm:px-2.5 py-0.5 rounded font-mono font-bold text-zinc-200">
                  {formData.recordNumber}
                </span>
                <span className="text-[11px] sm:text-xs bg-[#DC2626] text-white font-black px-2 py-0.5 rounded">
                  مسار الاعتماد الرباعي
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-bold mt-1 text-white truncate">
                تقييم واعتماد: {formData.fullName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-xl sm:rounded-lg text-xs font-semibold text-white transition-colors border border-white/15 cursor-pointer"
              title="طباعة النموذج الرسمي"
            >
              <Printer className="w-4 h-4 text-zinc-200" />
              <span className="hidden sm:inline">طباعة النموذج الرسمي</span>
            </button>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 rounded-xl sm:rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Permission Status Banner */}
        {!authCheck.allowed ? (
          <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-2 flex items-center gap-2 text-[#991B1B] text-[11px] sm:text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>⛔ تنبيه صلاحية: {authCheck.reason}</span>
          </div>
        ) : (
          <div className="bg-emerald-50/80 border-b border-emerald-200 px-4 sm:px-6 py-1.5 flex items-center gap-2 text-emerald-800 text-[11px] sm:text-xs font-bold">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>صلاحية معتمدة: مصرح لك باتخاذ الإجراء في هذه المرحلة وفقاً لقواعد دورة العمل (RBAC).</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="bg-zinc-50 px-4 sm:px-6 py-2.5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="w-full sm:w-auto flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'all'
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-[#111318]'
              }`}
            >
              النموذج الكامل (4 مراحل)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('hr')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'hr'
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-[#111318]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>1. الموارد البشرية</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('hr_manager')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'hr_manager'
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-[#111318]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>2. مدير الموارد البشرية</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('dept')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'dept'
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-[#111318]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>3. {formData.assignedDepartmentManager || 'مدير الإدارة المختصة'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('gm')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'gm'
                  ? 'bg-[#111318] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-[#111318]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>4. المدير العام (الراتب)</span>
            </button>
          </div>

          <div className="text-xs text-zinc-500 font-medium">
            الوظيفة: <span className="font-bold text-[#DC2626]">{formData.positionApplied}</span>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: HR SPECIALIST REVIEW */}
          {(selectedTab === 'all' || selectedTab === 'hr') && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
                  <h3 className="font-black text-[#111318] text-base">
                    1. تقييم الموارد البشرية
                  </h3>
                </div>
                <span className="text-xs text-zinc-500 font-medium">
                  {formData.hrReview.reviewedAt ? `تاريخ المراجعة: ${formData.hrReview.reviewedAt}` : 'معلق'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    الإيجابيات (Positives):
                  </label>
                  <textarea
                    rows={3}
                    value={formData.hrReview.positives}
                    onChange={(e) => handleHrChange('positives', e.target.value)}
                    placeholder="مثال: مظهر لائق، خبرة مناسبة، لباقة في الحوار، استعداد للعمل الفوري..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    السلبيات (Negatives):
                  </label>
                  <textarea
                    rows={3}
                    value={formData.hrReview.negatives}
                    onChange={(e) => handleHrChange('negatives', e.target.value)}
                    placeholder="مثال: بعد السكن عن الفرع، يحتاج تدريب إضافي..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>
              </div>

              {/* Department Routing by HR Specialist (توجيه الموارد البشرية للإدارة المناسبة لعمل المقابلة) */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#DC2626]" />
                    <label className="text-xs font-black text-[#111318]">
                      توجيه الاستمارة إلى الإدارة التي تناسبها لعمل مقابلة (قرار الموارد البشرية):
                    </label>
                  </div>
                  <span className="text-[11px] font-bold text-[#B91C1C] bg-red-50 px-3 py-1 rounded-full border border-red-200">
                    الإدارة الموجه إليها: {formData.assignedDepartment || 'إدارة الخدمات'} • {formData.assignedDepartmentManager || 'مدير الإدارة'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
                  حدد الإدارة المناسبة للمرشح حسب وظيفته وخبرته لعمل المقابلة الفنية. بعد اعتمادك، ستتحول الاستمارة إلى <strong>مدير الموارد البشرية للقبول أو الرفض</strong>، وإذا قَبِلَ تتوجه مباشرة إلى مدير هذه الإدارة لإجراء المقابلة.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {DEPARTMENTS.map((dept) => {
                    const isSelected = formData.assignedDepartment === dept.name;
                    return (
                      <button
                        key={dept.name}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            assignedDepartment: dept.name,
                            assignedDepartmentManager: dept.managerTitle,
                            directManagerReview: {
                              ...prev.directManagerReview,
                              department: dept.name,
                              managerTitle: dept.managerTitle,
                            },
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-sm shadow-red-600/20'
                            : 'bg-zinc-50 text-[#111318] border-zinc-200 hover:bg-red-50/40 hover:border-red-300'
                        }`}
                      >
                        <span className="text-[11px] font-black leading-tight">{dept.name}</span>
                        <span className={`text-[10px] truncate max-w-full font-medium ${isSelected ? 'text-red-100 font-bold' : 'text-zinc-500'}`}>
                          {dept.managerTitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    نتيجة فحص الموارد البشرية:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {RESULT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleHrChange('result', opt)}
                        className={`p-2 rounded-lg border font-bold text-center transition-all cursor-pointer ${
                          formData.hrReview.result === opt
                            ? opt === 'مرفوض'
                              ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-sm'
                              : opt === 'انتظار'
                              ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                              : 'bg-[#111318] text-white border-[#111318] ring-2 ring-red-600/20 shadow-sm'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    ملاحظات وتوجيه الموارد البشرية:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.hrReview.notice}
                    onChange={(e) => handleHrChange('notice', e.target.value)}
                    placeholder="ملاحظات قسم الموارد البشرية وتوصية الإحالة..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    التوقيع الإلكتروني للموارد البشرية:
                  </label>
                  {(formData.signatures?.hr || formData.hrReview?.electronicSignature || (formData.hrReview?.signature && formData.hrReview?.reviewedAt)) ? (
                    <ElectronicSignatureBadge
                      signature={formData.signatures?.hr || formData.hrReview?.electronicSignature}
                      legacySignature={formData.hrReview?.signature}
                      legacyReviewedAt={formData.hrReview?.reviewedAt}
                      stageTitle="الموارد البشرية"
                      accent="emerald"
                    />
                  ) : (
                    <PendingAutoSignatureBox
                      appUser={appUser}
                      activeRole={activeRole}
                      stageLabel="الموارد البشرية"
                    />
                  )}
                </div>
              </div>

              {/* Per-Application Salary Tiers (HR / System Admin Only) */}
              {(canManageSalaryStructure || activeRole === 'hr' || isSystemAdmin) && (
                <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-[#DC2626]" />
                      <span>هيكل الرواتب الخاص بهذه الاستمارة (المستويات الثلاثة - الموارد البشرية):</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isSalaryLocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-lg">
                          <Lock className="w-3 h-3" />
                          <span>مقفل ومثبت نهائياً ({applicant.generalManagerReview?.finalApprovedSalary})</span>
                        </span>
                      ) : (
                        <>
                          {salaryStructure?.isApproved && (
                            <button
                              type="button"
                              onClick={handleCopyGlobalTemplate}
                              className="inline-flex items-center gap-1 text-[10px] font-bold bg-zinc-50 hover:bg-zinc-100 text-[#111318] border border-zinc-300 px-2 py-1 rounded-lg cursor-pointer"
                            >
                              <Copy className="w-3 h-3 text-[#DC2626]" />
                              <span>نسخ من الهيكل العام</span>
                            </button>
                          )}
                          {onSaveAppSalaryLevels && (
                            <button
                              type="button"
                              disabled={isSavingSalary}
                              onClick={handleSaveAppSalaryClick}
                              className="inline-flex items-center gap-1 text-[10px] font-black bg-[#111318] hover:bg-zinc-800 text-white px-2.5 py-1 rounded-lg cursor-pointer disabled:opacity-50"
                            >
                              {isSavingSalary ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3 text-[#DC2626]" />
                              )}
                              <span>حفظ الرواتب داخل الاستمارة</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {salarySaveSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-950 text-[11px] font-bold">
                      {salarySaveSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        المستوى الأول ({appCurrency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={!canEditAppSalary}
                        value={appLevel1}
                        onChange={(e) => {
                          setAppLevel1(e.target.value);
                          syncAppSalaryFieldsToForm(e.target.value, appLevel2, appLevel3);
                          setSalarySaveSuccess(null);
                        }}
                        placeholder="مثال: 6000"
                        className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white font-mono text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        المستوى الثاني ({appCurrency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={!canEditAppSalary}
                        value={appLevel2}
                        onChange={(e) => {
                          setAppLevel2(e.target.value);
                          syncAppSalaryFieldsToForm(appLevel1, e.target.value, appLevel3);
                          setSalarySaveSuccess(null);
                        }}
                        placeholder="مثال: 8000"
                        className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white font-mono text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        المستوى الثالث ({appCurrency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={!canEditAppSalary}
                        value={appLevel3}
                        onChange={(e) => {
                          setAppLevel3(e.target.value);
                          syncAppSalaryFieldsToForm(appLevel1, appLevel2, e.target.value);
                          setSalarySaveSuccess(null);
                        }}
                        placeholder="مثال: 10000"
                        className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white font-mono text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: HR MANAGER DECISION: ACCEPT OR REJECT */}
          {(selectedTab === 'all' || selectedTab === 'hr_manager') && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#111318]" />
                  <h3 className="font-black text-[#111318] text-base">
                    2. قرار مدير الموارد البشرية: القبول أو الرفض
                  </h3>
                </div>
                <span className="text-xs text-zinc-500 font-medium">
                  {formData.hrManagerReview?.reviewedAt ? `تاريخ القرار: ${formData.hrManagerReview.reviewedAt}` : 'معلق'}
                </span>
              </div>

              {/* Department Routing Status & Guidance Banner */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DC2626] shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-500 font-bold block">
                        الإدارة الموجه إليها المرشح من الموارد البشرية لعمل المقابلة:
                      </span>
                      <div className="text-sm font-black text-[#111318]">
                        {formData.assignedDepartment || 'إدارة الخدمات'} — {formData.assignedDepartmentManager || 'مدير الإدارة'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#111318] bg-zinc-100 px-3 py-1 rounded-full border border-zinc-300">
                    مطلوب قرار مدير الموارد البشرية: قبول أو رفض
                  </span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-700 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-[#111318]">
                    <span>قاعدة مسار التوظيف:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>إذا قَبِلَ مدير الموارد البشرية:</strong> تتوجه الاستمارة فوراً إلى <strong>{formData.assignedDepartmentManager || 'مدير الإدارة'}</strong> لإجراء المقابلة الفنية والاختبار العملي.<br />
                    • <strong>إذا رَفَضَ مدير الموارد البشرية:</strong> يُرفض الطلب نهائياً ولا تتوجه الاستمارة لمدير الإدارة.
                  </p>
                </div>

                {/* Optional: Change Department Routing by HR Manager */}
                <div className="pt-1">
                  <span className="text-[11px] text-zinc-600 font-bold block mb-1.5">
                    تعديل توجيه الإدارة (إذا رأى مدير الموارد البشرية ملاءمة مرشح لإدارة أخرى):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {DEPARTMENTS.map((dept) => {
                      const isSelected = formData.assignedDepartment === dept.name;
                      return (
                        <button
                          key={dept.name}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              assignedDepartment: dept.name,
                              assignedDepartmentManager: dept.managerTitle,
                              directManagerReview: {
                                ...prev.directManagerReview,
                                department: dept.name,
                                managerTitle: dept.managerTitle,
                              },
                            }));
                          }}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-sm shadow-red-600/20'
                              : 'bg-zinc-50 text-[#111318] border-zinc-200 hover:bg-red-50/50 hover:border-red-300'
                          }`}
                        >
                          <span className="text-[11px] font-black leading-tight">{dept.name}</span>
                          <span className={`text-[10px] truncate max-w-full font-medium ${isSelected ? 'text-red-100 font-bold' : 'text-zinc-500'}`}>
                            {dept.managerTitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    توصيات وملاحظات مدير الموارد البشرية الإيجابية:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.hrManagerReview?.positives || ''}
                    onChange={(e) => handleHrManagerChange('positives', e.target.value)}
                    placeholder="مثال: مطابقة المرشح لسياسات التوظيف والشهادة الصحية سارية..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    التحفظات أو شروط التعيين الخاصة:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.hrManagerReview?.negatives || ''}
                    onChange={(e) => handleHrManagerChange('negatives', e.target.value)}
                    placeholder="أي ملاحظات إدارية، مسوغات ناقصة، شروط فترة الاختبار..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    قرار مدير الموارد البشرية (القبول أو الرفض):
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {RESULT_OPTIONS.map((opt) => {
                      const isSelected = formData.hrManagerReview?.result === opt;
                      const isReject = opt === 'مرفوض';
                      const isWaitlist = opt === 'انتظار';
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleHrManagerChange('result', opt)}
                          className={`p-2.5 rounded-lg border font-black text-center transition-all cursor-pointer ${
                            isSelected
                              ? isReject
                                ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-sm'
                                : isWaitlist
                                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                                : 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                              : isReject
                              ? 'bg-red-50 text-[#B91C1C] border-red-200 hover:bg-red-100'
                              : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                          }`}
                        >
                          {isReject ? 'رفض الطلب ✕' : isWaitlist ? 'قائمة انتظار' : `قبول وتوجيه لـ ${formData.assignedDepartment || 'مدير الإدارة'} ✓`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    توجيه مدير الموارد البشرية للإدارة:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.hrManagerReview?.notice || ''}
                    onChange={(e) => handleHrManagerChange('notice', e.target.value)}
                    placeholder={`توجيه المرشح لـ ${formData.assignedDepartmentManager || 'مدير الإدارة'} للاختبار الفني...`}
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    التوقيع الإلكتروني لمدير الموارد البشرية:
                  </label>
                  {(formData.signatures?.hr_manager || formData.hrManagerReview?.electronicSignature || (formData.hrManagerReview?.signature && formData.hrManagerReview?.reviewedAt)) ? (
                    <ElectronicSignatureBadge
                      signature={formData.signatures?.hr_manager || formData.hrManagerReview?.electronicSignature}
                      legacySignature={formData.hrManagerReview?.signature}
                      legacyReviewedAt={formData.hrManagerReview?.reviewedAt}
                      stageTitle="مدير الموارد البشرية"
                      accent="teal"
                    />
                  ) : (
                    <PendingAutoSignatureBox
                      appUser={appUser}
                      activeRole={activeRole}
                      stageLabel="مدير الموارد البشرية"
                    />
                  )}
                </div>
              </div>

              {/* HR Manager Proposed Salary (Editable by HR Manager / Admin only at this stage; Read-Only otherwise) */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-[#DC2626]" />
                    <span>الراتب المقترح من مدير الموارد البشرية:</span>
                  </div>
                  {applicant.hrManagerSalaryProposal && (
                    <span className="text-[10px] font-bold bg-teal-50 text-teal-900 border border-teal-200 px-2 py-0.5 rounded-lg">
                      مسجل بواسطة {applicant.hrManagerSalaryProposal.proposerName} • {applicant.hrManagerSalaryProposal.proposedAtArabic}
                    </span>
                  )}
                </div>

                {activeDraftStage === 'hr_manager' && !(isSalaryLocked && !isSystemAdmin) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={hrManagerProposedSalary}
                        onChange={(e) => setHrManagerProposedSalary(e.target.value)}
                        placeholder="أدخل مبلغ الراتب المقترح (اختياري)"
                        className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white font-mono text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none"
                      />
                      <span className="text-xs font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-2 rounded-lg shrink-0">
                        {appCurrency}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={hrManagerProposalNotes}
                      onChange={(e) => setHrManagerProposalNotes(e.target.value)}
                      placeholder="ملاحظات مالية على المقترح (اختياري)..."
                      className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none"
                    />
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-bold">المعاينة:</span>
                      <span className="font-mono tabular-nums font-black text-emerald-800">
                        {parseSalaryNumeric(hrManagerProposedSalary)
                          ? formatSalaryAmount(parseSalaryNumeric(hrManagerProposedSalary), appCurrency)
                          : 'غير محدد'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
                    <span className="text-zinc-600 font-bold">القيمة المسجلة (للقراءة فقط):</span>
                    <span className="font-mono tabular-nums font-black text-[#111318]">
                      {applicant.hrManagerSalaryProposal?.formattedAmount || 'لم يتم تقديم مقترح'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: DIRECT / DEPARTMENT MANAGER REVIEW */}
          {(selectedTab === 'all' || selectedTab === 'dept') && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-zinc-200 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
                  <div>
                    <h3 className="font-black text-[#111318] text-base">
                      3. تقييم واعتماد {formData.assignedDepartmentManager || (formData.assignedDepartment ? `مدير ${formData.assignedDepartment}` : 'مدير الإدارة المختصة')}
                    </h3>
                    <div className="text-[11px] text-zinc-600 font-semibold mt-0.5 flex items-center gap-1.5">
                      <span className="bg-zinc-200/70 text-[#111318] px-2.5 py-0.5 rounded font-bold border border-zinc-300">
                        {formData.assignedDepartment || 'إدارة غير محددة'}
                      </span>
                      <span>• موجه بقرار مدير الموارد البشرية لإجراء التقييم الفني</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-zinc-500 font-medium">
                  {formData.directManagerReview.reviewedAt ? `تاريخ المراجعة: ${formData.directManagerReview.reviewedAt}` : 'معلق'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    الإيجابيات الفنية والعملية:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.directManagerReview.positives}
                    onChange={(e) => handleDeptChange('positives', e.target.value)}
                    placeholder="تقييم المهارات الفنية، السرعة، المعرفة بمهام الوظيفة..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    السلبيات الفنية:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.directManagerReview.negatives}
                    onChange={(e) => handleDeptChange('negatives', e.target.value)}
                    placeholder="أي نقص في الخبرة أو المهارة..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    النتيجة الفنية (Result):
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {RESULT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleDeptChange('result', opt)}
                        className={`p-2 rounded-lg border font-bold text-center transition-all cursor-pointer ${
                          formData.directManagerReview.result === opt
                            ? opt === 'مرفوض'
                              ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-sm'
                              : opt === 'انتظار'
                              ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                              : 'bg-[#111318] text-white border-[#111318] shadow-sm'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    ملاحظات وتوصيات {formData.assignedDepartmentManager || 'مدير الإدارة'}:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.directManagerReview.notice}
                    onChange={(e) => handleDeptChange('notice', e.target.value)}
                    placeholder="توصيات التشغيل والفرع المناسب..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    التوقيع الإلكتروني لـ {formData.assignedDepartmentManager || 'مدير الإدارة'}:
                  </label>
                  {(formData.signatures?.direct_manager || formData.directManagerReview?.electronicSignature || (formData.directManagerReview?.signature && formData.directManagerReview?.reviewedAt)) ? (
                    <ElectronicSignatureBadge
                      signature={formData.signatures?.direct_manager || formData.directManagerReview?.electronicSignature}
                      legacySignature={formData.directManagerReview?.signature}
                      legacyReviewedAt={formData.directManagerReview?.reviewedAt}
                      stageTitle={formData.assignedDepartmentManager || 'مدير الإدارة المختصة'}
                      accent="blue"
                    />
                  ) : (
                    <PendingAutoSignatureBox
                      appUser={appUser}
                      activeRole={activeRole}
                      stageLabel={formData.assignedDepartmentManager || 'مدير الإدارة المختصة'}
                    />
                  )}
                </div>
              </div>

              {/* Department Manager Proposed Salary (plus read-only HR Manager proposal reference) */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3">
                {applicant.hrManagerSalaryProposal && (
                  <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-teal-900 font-bold">
                      مقترح راتب مدير الموارد البشرية (للاطلاع فقط • {applicant.hrManagerSalaryProposal.proposerName}):
                    </span>
                    <span className="font-mono tabular-nums font-black text-teal-950 bg-white px-2.5 py-1 rounded border border-teal-300">
                      {applicant.hrManagerSalaryProposal.formattedAmount}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-[#DC2626]" />
                    <span>الراتب المقترح من مدير الإدارة:</span>
                  </div>
                  {applicant.directManagerSalaryProposal && (
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-lg">
                      مسجل بواسطة {applicant.directManagerSalaryProposal.proposerName} • {applicant.directManagerSalaryProposal.proposedAtArabic}
                    </span>
                  )}
                </div>

                {activeDraftStage === 'direct_manager' && !(isSalaryLocked && !isSystemAdmin) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={directManagerProposedSalary}
                        onChange={(e) => setDirectManagerProposedSalary(e.target.value)}
                        placeholder="أدخل مبلغ الراتب المقترح (اختياري)"
                        className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white font-mono text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none"
                      />
                      <span className="text-xs font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-2 rounded-lg shrink-0">
                        {appCurrency}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={directManagerProposalNotes}
                      onChange={(e) => setDirectManagerProposalNotes(e.target.value)}
                      placeholder="ملاحظات فنية على المقترح (اختياري)..."
                      className="w-full p-2 rounded-lg border border-zinc-300 bg-zinc-50 focus:bg-white text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none"
                    />
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-bold">المعاينة:</span>
                      <span className="font-mono tabular-nums font-black text-emerald-800">
                        {parseSalaryNumeric(directManagerProposedSalary)
                          ? formatSalaryAmount(parseSalaryNumeric(directManagerProposedSalary), appCurrency)
                          : 'غير محدد'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
                    <span className="text-zinc-600 font-bold">القيمة المسجلة (للقراءة فقط):</span>
                    <span className="font-mono tabular-nums font-black text-[#111318]">
                      {applicant.directManagerSalaryProposal?.formattedAmount || 'لم يتم تقديم مقترح'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: GENERAL MANAGER APPROVAL */}
          {(selectedTab === 'all' || selectedTab === 'gm') && (
            <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
                  <h3 className="font-black text-[#111318] text-base">
                    4. اعتماد المدير العام وتحديد الراتب (General Manager Approval)
                  </h3>
                </div>
                <span className="text-xs text-white font-bold bg-[#111318] border border-zinc-800 px-2.5 py-0.5 rounded">
                  القرار النهائي والراتب المعتمد
                </span>
              </div>

              {/* Read-Only 5-Option Salary Comparison & Single Radio Selection */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-[#DC2626]" />
                    <span>مقارنة مستويات الراتب والمقترحات المسجلة (اختر خياراً واحداً فقط):</span>
                  </div>
                  {isSalaryLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      <Lock className="w-3 h-3" />
                      <span>معتمد نهائياً</span>
                    </span>
                  )}
                </div>

                {/* 3 Structure Levels */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['level1', 'level2', 'level3'] as const).map((lvl) => {
                    const numeric = getSourceNumericAmount(lvl);
                    const formatted =
                      formatSalaryAmount(numeric, appCurrency) ||
                      (lvl === 'level1'
                        ? formData.generalManagerReview.salaryLevel1
                        : lvl === 'level2'
                        ? formData.generalManagerReview.salaryLevel2
                        : formData.generalManagerReview.salaryLevel3) ||
                      '';
                    const isAvailable = Boolean(numeric && numeric > 0);
                    const isSelected = currentSelectedGmSource === lvl;
                    const labelText =
                      lvl === 'level1'
                        ? 'المستوى الأول (هيكل الرواتب)'
                        : lvl === 'level2'
                        ? 'المستوى الثاني (هيكل الرواتب)'
                        : 'المستوى الثالث (هيكل الرواتب)';

                    return (
                      <label
                        key={lvl}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1 ${
                          isSalaryLockedForNonAdmin || !isAvailable
                            ? 'opacity-60 cursor-not-allowed bg-zinc-100 border-zinc-200 text-zinc-500'
                            : isSelected
                            ? 'cursor-pointer bg-[#111318] text-white border-[#DC2626] shadow-md ring-2 ring-red-600/20'
                            : 'cursor-pointer bg-white text-[#111318] border-zinc-200 hover:border-red-300 hover:bg-red-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="gm-eval-final-salary-source"
                            value={lvl}
                            checked={isSelected}
                            disabled={isSalaryLockedForNonAdmin || !isAvailable}
                            onChange={() => handleGmSelectSource(lvl)}
                            className="accent-[#DC2626] w-3.5 h-3.5"
                          />
                          <span className="text-[11px] font-bold opacity-90">{labelText}</span>
                        </div>
                        <span
                          className={`font-mono tabular-nums font-black text-sm ${
                            formatted
                              ? isSelected
                                ? 'text-red-300'
                                : 'text-[#111318]'
                              : 'text-[#DC2626] text-xs'
                          }`}
                        >
                          {formatted || 'غير محدد'}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* 2 Manager Proposals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        key: 'hr_manager_proposal' as FinalSalarySource,
                        title: 'مقترح مدير الموارد البشرية',
                        proposal: applicant.hrManagerSalaryProposal,
                      },
                      {
                        key: 'direct_manager_proposal' as FinalSalarySource,
                        title: 'مقترح مدير الإدارة',
                        proposal: applicant.directManagerSalaryProposal,
                      },
                    ]
                  ).map((item) => {
                    const numeric = getSourceNumericAmount(item.key);
                    const formatted = formatSalaryAmount(
                      numeric,
                      item.proposal?.currency || appCurrency
                    );
                    const isAvailable = Boolean(numeric && numeric > 0);
                    const isSelected = currentSelectedGmSource === item.key;

                    return (
                      <label
                        key={item.key}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1 ${
                          isSalaryLockedForNonAdmin || !isAvailable
                            ? 'opacity-65 cursor-not-allowed bg-zinc-100 border-zinc-200 text-zinc-500'
                            : isSelected
                            ? 'cursor-pointer bg-[#111318] text-white border-[#DC2626] shadow-md ring-2 ring-red-600/20'
                            : 'cursor-pointer bg-white text-[#111318] border-zinc-200 hover:border-red-300 hover:bg-red-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="gm-eval-final-salary-source"
                              value={item.key}
                              checked={isSelected}
                              disabled={isSalaryLockedForNonAdmin || !isAvailable}
                              onChange={() => handleGmSelectSource(item.key)}
                              className="accent-[#DC2626] w-3.5 h-3.5"
                            />
                            <span className="text-[11px] font-black">{item.title}</span>
                          </div>
                          {isAvailable && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isSelected ? 'bg-[#DC2626] text-white' : 'bg-teal-50 text-teal-800 border border-teal-200'}`}>
                              مقترح مسجل
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-mono tabular-nums font-black text-sm ${
                            formatted
                              ? isSelected
                                ? 'text-red-300'
                                : 'text-[#111318]'
                              : 'text-zinc-500 text-xs font-semibold'
                          }`}
                        >
                          {formatted || 'لم يتم تقديم مقترح'}
                        </span>
                        {item.proposal && isAvailable && (
                          <div className={`text-[10px] ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            {item.proposal.proposerName}
                            {item.proposal.proposerDepartment ? ` • ${item.proposal.proposerDepartment}` : ''}
                            {' · '}
                            <span className="font-mono">{item.proposal.proposedAtArabic}</span>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                  <div>
                    <span className="block text-xs font-black text-[#111318]">
                      الراتب النهائي المقرر التعاقد به ومصدره (للقراءة فقط):
                    </span>
                    <span className="text-[11px] font-bold text-zinc-600">
                      {currentSelectedGmSource
                        ? finalSalarySourceToLabel(currentSelectedGmSource)
                        : formData.generalManagerReview.result === 'مرفوض'
                        ? 'مرفوض'
                        : formData.generalManagerReview.result === 'انتظار'
                        ? 'قائمة الانتظار'
                        : 'يرجى اختيار خيار واحد من الخيارات الخمسة'}
                    </span>
                  </div>
                  <div className="font-mono tabular-nums font-black text-sm px-4 py-2 rounded-lg border border-emerald-200 bg-white text-emerald-800">
                    {currentSelectedGmSource
                      ? formatSalaryAmount(
                          getSourceNumericAmount(currentSelectedGmSource),
                          appCurrency
                        ) || 'غير محدد بعد'
                      : '—'}
                  </div>
                </div>
              </div>

              {/* GM Decision & Signature */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    القرار النهائي (Final Result):
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {RESULT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={isSalaryLockedForNonAdmin}
                        onClick={() => {
                          const lvl = decisionToSalaryLevel(opt);
                          if (lvl) {
                            handleGmSelectSource(lvl);
                          } else {
                            setLocalError(null);
                            setSelectedSalarySource(null);
                            setFormData((prev) => ({
                              ...prev,
                              generalManagerReview: {
                                ...prev.generalManagerReview,
                                selectedSalaryLevel: null,
                                finalSalarySource: null,
                                finalApprovedSalaryAmount: null,
                                finalApprovedSalary: '',
                                result: opt,
                                reviewedAt: new Date().toLocaleString('ar-EG'),
                              },
                            }));
                          }
                        }}
                        className={`p-2 rounded-lg border font-black text-center transition-all cursor-pointer disabled:opacity-60 ${
                          formData.generalManagerReview.result === opt
                            ? opt === 'مرفوض'
                              ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-sm'
                              : opt === 'انتظار'
                              ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                              : 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    ملاحظات وقرار المدير العام:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.generalManagerReview.notice}
                    onChange={(e) => handleGmChange('notice', e.target.value)}
                    placeholder="ملاحظات الاعتماد النهائي أو شروط العقد..."
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-white text-[#111318]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    التوقيع الإلكتروني واعتماد المدير العام:
                  </label>
                  {(formData.signatures?.general_manager || formData.generalManagerReview?.electronicSignature || (formData.generalManagerReview?.signature && formData.generalManagerReview?.reviewedAt)) ? (
                    <ElectronicSignatureBadge
                      signature={formData.signatures?.general_manager || formData.generalManagerReview?.electronicSignature}
                      legacySignature={formData.generalManagerReview?.signature}
                      legacyReviewedAt={formData.generalManagerReview?.reviewedAt}
                      stageTitle="المدير العام"
                      accent="amber"
                    />
                  ) : (
                    <PendingAutoSignatureBox
                      appUser={appUser}
                      activeRole={activeRole}
                      stageLabel="المدير العام"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* System Admin Stage Override Bar */}
          {isSystemAdmin && (
            <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-[#111318]">
                <ShieldCheck className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span>توجيه / تجاوز / إرجاع المرحلة (صلاحية مدير النظام):</span>
              </div>
              <select
                value={overrideTargetStatus}
                onChange={(e) => setOverrideTargetStatus(e.target.value as 'auto' | ApplicationStatus)}
                className="sm:w-80 px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-bold text-[#111318] focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] cursor-pointer"
              >
                <option value="auto">المسار التلقائي حسب المرحلة الحالية</option>
                <option value="hr_pending">1. إرجاع إلى الموارد البشرية (HR)</option>
                <option value="hr_manager_pending">2. تحويل إلى مدير الموارد البشرية</option>
                <option value={getDepartmentPendingStatus(formData.assignedDepartment || 'إدارة الخدمات')}>
                  3. تحويل إلى {formData.assignedDepartmentManager || 'مدير الإدارة المختصة'}
                </option>
                <option value="gm_pending">4. تحويل إلى المدير العام (GM)</option>
                <option value="approved_lvl1">تجاوز: اعتماد نهائي مستوى أول</option>
                <option value="approved_lvl2">تجاوز: اعتماد نهائي مستوى ثاني</option>
                <option value="approved_lvl3">تجاوز: اعتماد نهائي مستوى ثالث</option>
                <option value="approved_proposal">تجاوز: اعتماد بالراتب المقترح المختار</option>
                <option value="waitlist">قائمة الانتظار</option>
                <option value="rejected">مرفوض نهائياً</option>
              </select>
            </div>
          )}

          {localError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-[#991B1B] text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="sticky bottom-0 bg-white border-t border-zinc-200 pt-3.5 pb-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 min-h-[42px] rounded-xl border border-zinc-300 text-zinc-700 font-bold text-xs hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              {onSaveDraft && activeDraftStage && (
                <button
                  type="button"
                  onClick={handleSaveDraftClick}
                  disabled={isSavingDraft || isSubmitting || !authCheck.allowed}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-[#111318] font-bold text-xs transition-colors cursor-pointer disabled:opacity-45"
                >
                  {isSavingDraft ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DC2626]" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-[#DC2626]" />
                  )}
                  <span>حفظ التقييمات (دون إحالة)</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!authCheck.allowed || isSalaryGateBlocked || isSubmitting}
              title={
                !authCheck.allowed
                  ? authCheck.reason
                  : isSalaryGateBlocked
                  ? 'يجب أن تقوم الموارد البشرية باعتماد هيكل الرواتب أولاً'
                  : undefined
              }
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-sm shadow-red-600/20 transition-all cursor-pointer whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-white shrink-0" />
              )}
              <span className="hidden sm:inline">
                {activeDraftStage === 'hr' && !isSystemAdmin
                  ? 'حفظ وإحالة إلى مدير الموارد البشرية'
                  : 'حفظ التقييم وتوجيه الاستمارة للمرحلة التالية'}
              </span>
              <span className="sm:hidden">
                {activeDraftStage === 'hr' && !isSystemAdmin
                  ? 'إحالة لمدير الموارد البشرية'
                  : 'حفظ التقييم والمتابعة'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
