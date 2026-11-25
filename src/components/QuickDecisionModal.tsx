import React, { useState } from 'react';
import {
  JobApplication,
  UserRole,
  EvaluationResult,
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
import { parseEgyptianNationalId } from '../utils/nationalId';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Award,
  UserCheck,
  X,
  Banknote,
  Briefcase,
  Building2,
  Save,
  AlertTriangle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Copy,
} from 'lucide-react';
import {
  DEPARTMENTS,
  guessDepartmentFromPosition,
  isDepartmentManagerRole,
  getDepartmentManagerTitle,
  getRoleDisplayTitle,
  getDepartmentForRole,
  getDepartmentPendingStatus,
  isDeptPending,
} from '../utils/departments';
import { DecisionPayload, PerApplicationSalaryLevelsPayload } from '../services/apiService';
import { validateWorkflowTransition } from '../utils/workflowAuthorization';
import { useAuth } from '../context/AuthContext';
import { PendingAutoSignatureBox } from './ElectronicSignatureBadge';

export interface StageDraftPayload {
  stage?: 'hr' | 'hr_manager' | 'direct_manager';
  positives?: string;
  negatives?: string;
  notice?: string;
  result?: EvaluationResult | null;
  assignedDepartment?: DepartmentType;
  salaryLevels?: PerApplicationSalaryLevelsPayload;
  proposedSalary?: number | null;
  proposalNotes?: string;
}

interface QuickDecisionModalProps {
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
  onConfirm: (updated: JobApplication, payload?: DecisionPayload) => Promise<void> | void;
}

const QUICK_NOTES = [
  'اجتاز المقابلة التمهيدية وفحص الموارد البشرية بنجاح',
  'معتمد من مدير الموارد البشرية للإحالة لمدير الإدارة المختصة',
  'اجتاز المقابلة والاختبار الفني بنجاح وموصى بالتعيين',
  'خبرة ممتازة ومطابق لمتطلبات الوظيفة',
  'جاهز لبدء العمل فوراً',
  'تحت التجربة لمدة 3 أشهر',
];

export const QuickDecisionModal: React.FC<QuickDecisionModalProps> = ({
  applicant,
  activeRole,
  salaryStructure,
  canManageSalaryStructure,
  onSaveAppSalaryLevels,
  onSaveDraft,
  onClose,
  onConfirm,
}) => {
  const initialDept: DepartmentType =
    applicant.assignedDepartment || guessDepartmentFromPosition(applicant.positionApplied);
  const [selectedDept, setSelectedDept] = useState<DepartmentType>(initialDept);

  const { appUser } = useAuth();
  const isSystemAdmin =
    activeRole === 'admin' || Boolean(appUser?.isSuperAdmin) || appUser?.role === 'admin';
  const [overrideTargetStatus, setOverrideTargetStatus] = useState<'auto' | ApplicationStatus>('auto');

  const activeDraftStage: 'hr' | 'hr_manager' | 'direct_manager' | null =
    activeRole === 'hr'
      ? 'hr'
      : activeRole === 'hr_manager'
      ? 'hr_manager'
      : isDepartmentManagerRole(activeRole) || activeRole === 'direct_manager'
      ? 'direct_manager'
      : activeRole === 'admin'
      ? applicant.status === 'hr_manager_pending'
        ? 'hr_manager'
        : isDeptPending(applicant.status)
        ? 'direct_manager'
        : applicant.status === 'new' || applicant.status === 'hr_pending'
        ? 'hr'
        : null
      : null;

  const isGmDecisionContext =
    activeRole === 'general_manager' ||
    (activeRole === 'admin' &&
      (applicant.status === 'gm_pending' ||
        applicant.status.startsWith('approved') ||
        overrideTargetStatus.startsWith('approved')));

  const initialStageReview =
    activeDraftStage === 'hr_manager'
      ? applicant.hrManagerReview
      : activeDraftStage === 'direct_manager'
      ? applicant.directManagerReview
      : applicant.hrReview;

  const [positives, setPositives] = useState<string>(initialStageReview?.positives || '');
  const [negatives, setNegatives] = useState<string>(initialStageReview?.negatives || '');
  const [proposedSalaryInput, setProposedSalaryInput] = useState<string>(
    activeDraftStage === 'hr_manager'
      ? applicant.hrManagerSalaryProposal?.proposedAmount?.toString() || ''
      : activeDraftStage === 'direct_manager'
      ? applicant.directManagerSalaryProposal?.proposedAmount?.toString() || ''
      : ''
  );
  const [proposalNotes, setProposalNotes] = useState<string>(
    activeDraftStage === 'hr_manager'
      ? applicant.hrManagerSalaryProposal?.notes || ''
      : activeDraftStage === 'direct_manager'
      ? applicant.directManagerSalaryProposal?.notes || ''
      : ''
  );

  const initialGmSource: FinalSalarySource | null = (() => {
    if (
      applicant.generalManagerReview?.result === 'مرفوض' ||
      applicant.generalManagerReview?.result === 'انتظار'
    ) {
      return null;
    }
    if (applicant.generalManagerReview?.finalSalarySource) {
      return applicant.generalManagerReview.finalSalarySource;
    }
    if (applicant.generalManagerReview?.selectedSalaryLevel) {
      return applicant.generalManagerReview.selectedSalaryLevel;
    }
    const fromResult = decisionToSalaryLevel(applicant.generalManagerReview?.result);
    if (fromResult) return fromResult;
    if (!isGmDecisionContext) return null;
    if (getApplicationSalaryForLevel(applicant.generalManagerReview, 'level1')) return 'level1';
    if (getApplicationSalaryForLevel(applicant.generalManagerReview, 'level2')) return 'level2';
    if (getApplicationSalaryForLevel(applicant.generalManagerReview, 'level3')) return 'level3';
    if (applicant.hrManagerSalaryProposal?.proposedAmount) return 'hr_manager_proposal';
    if (applicant.directManagerSalaryProposal?.proposedAmount) return 'direct_manager_proposal';
    return 'level1';
  })();

  const [selectedSalarySource, setSelectedSalarySource] = useState<FinalSalarySource | null>(
    initialGmSource
  );
  const [selectedLevel, setSelectedLevel] = useState<SalaryLevelKey | null>(
    initialGmSource === 'level1' || initialGmSource === 'level2' || initialGmSource === 'level3'
      ? initialGmSource
      : null
  );
  const [decision, setDecision] = useState<EvaluationResult>(
    isGmDecisionContext
      ? initialGmSource === 'level1' || initialGmSource === 'level2' || initialGmSource === 'level3'
        ? salaryLevelToDecision(initialGmSource)
        : applicant.generalManagerReview?.result || 'مستوى أول'
      : initialStageReview?.result || 'مستوى أول'
  );

  const currentRoleDept = getDepartmentForRole(activeRole);
  const effectiveDeptTitle =
    getDepartmentManagerTitle(currentRoleDept || applicant.assignedDepartment || selectedDept);
  const verifiedSignerName =
    appUser?.fullName || appUser?.displayName || getRoleDisplayTitle(activeRole);

  const getDefaultNotice = () => {
    if (activeDraftStage === 'hr' && applicant.hrReview?.notice) return applicant.hrReview.notice;
    if (activeDraftStage === 'hr_manager' && applicant.hrManagerReview?.notice)
      return applicant.hrManagerReview.notice;
    if (activeDraftStage === 'direct_manager' && applicant.directManagerReview?.notice)
      return applicant.directManagerReview.notice;
    if (isGmDecisionContext && applicant.generalManagerReview?.notice)
      return applicant.generalManagerReview.notice;

    switch (activeRole) {
      case 'admin':
        return `معتمد ومصادق بقرار مدير النظام (${verifiedSignerName})`;
      case 'general_manager':
        return 'تم اعتماد المستوى الوظيفي والراتب المقرر وفق هيكل الرواتب';
      case 'hr_manager':
        return `تمت مراجعة تقييم الموارد البشرية واعتماد إحالة المرشح إلى ${getDepartmentManagerTitle(selectedDept)}`;
      case 'hr':
        return 'تمت مراجعة الاستمارة وتوثيق الإيجابيات والسلبيات والإحالة إلى مدير الموارد البشرية';
      default:
        return `اجتاز التقييم الفني والاختبار العملي بنجاح، وموصى بالتعيين لدى ${applicant.assignedDepartment || selectedDept}`;
    }
  };

  const [notice, setNotice] = useState(getDefaultNotice());
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [salarySaveSuccess, setSalarySaveSuccess] = useState<string | null>(null);

  const isSalaryLocked = Boolean(applicant.generalManagerReview?.isSalaryLocked);
  const canEditAppSalary = Boolean(
    (canManageSalaryStructure || activeRole === 'hr' || isSystemAdmin) && !isSalaryLocked
  );

  const [appCurrency] = useState<string>(applicant.generalManagerReview?.currency || 'ج.م');
  const [appLevel1, setAppLevel1] = useState<string>(
    getApplicationSalaryForLevel(applicant.generalManagerReview, 'level1')?.toString() || ''
  );
  const [appLevel2, setAppLevel2] = useState<string>(
    getApplicationSalaryForLevel(applicant.generalManagerReview, 'level2')?.toString() || ''
  );
  const [appLevel3, setAppLevel3] = useState<string>(
    getApplicationSalaryForLevel(applicant.generalManagerReview, 'level3')?.toString() || ''
  );

  const national = parseEgyptianNationalId(applicant.nationalId);

  const effectiveOverrideLevel: SalaryLevelKey | null =
    overrideTargetStatus === 'approved_lvl1'
      ? 'level1'
      : overrideTargetStatus === 'approved_lvl2'
      ? 'level2'
      : overrideTargetStatus === 'approved_lvl3'
      ? 'level3'
      : null;

  const getAppModalSalaryForLevel = (lvl: SalaryLevelKey): number | null => {
    if (lvl === 'level1') return parseSalaryNumeric(appLevel1);
    if (lvl === 'level2') return parseSalaryNumeric(appLevel2);
    return parseSalaryNumeric(appLevel3);
  };

  const getSourceNumericAmount = (src: FinalSalarySource): number | null => {
    if (src === 'level1' || src === 'level2' || src === 'level3') {
      return getAppModalSalaryForLevel(src);
    }
    if (src === 'hr_manager_proposal') {
      return applicant.hrManagerSalaryProposal?.proposedAmount ?? null;
    }
    return applicant.directManagerSalaryProposal?.proposedAmount ?? null;
  };

  const effectiveChosenSource: FinalSalarySource | null =
    effectiveOverrideLevel ||
    (decision === 'مرفوض' || decision === 'انتظار'
      ? null
      : selectedSalarySource || selectedLevel || decisionToSalaryLevel(decision));

  const effectiveChosenLevel: SalaryLevelKey | null =
    effectiveChosenSource === 'level1' ||
    effectiveChosenSource === 'level2' ||
    effectiveChosenSource === 'level3'
      ? effectiveChosenSource
      : null;

  const isFinalApprovalAction =
    isGmDecisionContext &&
    (Boolean(effectiveOverrideLevel) ||
      overrideTargetStatus === 'approved_proposal' ||
      (overrideTargetStatus === 'auto' &&
        decision !== 'مرفوض' &&
        decision !== 'انتظار'));

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
    if (salaryStructure.level1Salary) setAppLevel1(String(salaryStructure.level1Salary));
    if (salaryStructure.level2Salary) setAppLevel2(String(salaryStructure.level2Salary));
    if (salaryStructure.level3Salary) setAppLevel3(String(salaryStructure.level3Salary));
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
      await onSaveAppSalaryLevels(applicant.id, {
        level1Salary: l1,
        level2Salary: l2,
        level3Salary: l3,
        currency: appCurrency,
      });
      setSalarySaveSuccess('تم حفظ مستويات الرواتب الثلاثة داخل هذه الاستمارة بنجاح');
    } catch (err: any) {
      setLocalError(err?.message || 'تعذر حفظ مستويات الرواتب داخل الاستمارة');
    } finally {
      setIsSavingSalary(false);
    }
  };

  const chosenSourceNumericSalary = effectiveChosenSource
    ? getSourceNumericAmount(effectiveChosenSource)
    : null;

  const isSalaryStructureReadyForChosen = Boolean(
    chosenSourceNumericSalary && chosenSourceNumericSalary > 0
  );

  const isSalaryLockedForNonAdmin = Boolean(isSalaryLocked && !isSystemAdmin && isGmDecisionContext);

  const isSalaryGateBlocked = Boolean(
    (isFinalApprovalAction && !isSalaryStructureReadyForChosen) || isSalaryLockedForNonAdmin
  );

  const handleSelectGmSource = (src: FinalSalarySource) => {
    if (isSalaryLocked && !isSystemAdmin) return;
    const amt = getSourceNumericAmount(src);
    if (!amt || amt <= 0) return;
    setSelectedSalarySource(src);
    if (src === 'level1' || src === 'level2' || src === 'level3') {
      setSelectedLevel(src);
      setDecision(salaryLevelToDecision(src));
    } else {
      setSelectedLevel(null);
      setDecision('مستوى أول');
    }
    setLocalError(null);
  };

  const parsedStageProposedSalary =
    activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager'
      ? parseSalaryNumeric(proposedSalaryInput)
      : null;

  const handleSaveDraftClick = async () => {
    if (!onSaveDraft || !activeDraftStage) return;
    setLocalError(null);
    setSalarySaveSuccess(null);
    if (
      (activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager') &&
      proposedSalaryInput.trim() !== '' &&
      (!parsedStageProposedSalary || parsedStageProposedSalary <= 0)
    ) {
      setLocalError('يرجى إدخال قيمة راتب مقترح صحيحة أكبر من الصفر.');
      return;
    }
    setIsSavingDraft(true);
    try {
      await onSaveDraft(applicant.id, {
        stage: activeDraftStage,
        positives,
        negatives,
        notice,
        result: decision,
        assignedDepartment: selectedDept,
        salaryLevels: buildSalaryLevelsPayload(),
        proposedSalary:
          activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager'
            ? parsedStageProposedSalary
            : undefined,
        proposalNotes:
          activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager'
            ? proposalNotes
            : undefined,
      });
    } catch (err: any) {
      setLocalError(err?.message || 'تعذر حفظ التقييمات والملاحظات');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApprove = async () => {
    setLocalError(null);
    if (isSalaryLockedForNonAdmin) {
      setLocalError('تم تثبيت الراتب نهائياً بقرار المدير العام داخل هذه الاستمارة ولا يمكن تغييره.');
      return;
    }
    if (
      (activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager') &&
      proposedSalaryInput.trim() !== '' &&
      (!parsedStageProposedSalary || parsedStageProposedSalary <= 0)
    ) {
      setLocalError('يرجى إدخال قيمة راتب مقترح صحيحة أكبر من الصفر.');
      return;
    }
    if (isSalaryGateBlocked) {
      setLocalError(
        'لا يمكن إتمام الاعتماد النهائي: يجب اختيار خيار راتب صالح ومتاح (مستوى من هيكل الرواتب أو مقترح راتب معتمد).'
      );
      return;
    }

    const updated: JobApplication = {
      ...applicant,
      assignedDepartment: selectedDept || applicant.assignedDepartment,
      assignedDepartmentManager: getDepartmentManagerTitle(
        selectedDept || applicant.assignedDepartment
      ),
      hrManagerReview: applicant.hrManagerReview || {
        positives: '',
        negatives: '',
        result: null,
        notice: '',
        signature: '',
      },
    };
    const now = new Date().toLocaleString('ar-EG');
    const resolvedFinalSalary =
      effectiveChosenSource && chosenSourceNumericSalary
        ? formatSalaryAmount(chosenSourceNumericSalary, appCurrency)
        : '';

    const modalL1 = getAppModalSalaryForLevel('level1');
    const modalL2 = getAppModalSalaryForLevel('level2');
    const modalL3 = getAppModalSalaryForLevel('level3');

    if (activeRole === 'admin') {
      if (isGmDecisionContext) {
        let status: JobApplication['status'] = 'approved_lvl1';
        if (decision === 'انتظار') status = 'waitlist';
        else if (decision === 'مرفوض') status = 'rejected';
        else if (
          effectiveChosenSource === 'hr_manager_proposal' ||
          effectiveChosenSource === 'direct_manager_proposal'
        ) {
          status = 'approved_proposal';
        } else if (effectiveChosenSource === 'level2') status = 'approved_lvl2';
        else if (effectiveChosenSource === 'level3') status = 'approved_lvl3';
        else status = 'approved_lvl1';

        updated.status = status;
        updated.generalManagerReview = {
          ...updated.generalManagerReview,
          currency: appCurrency,
          level1Amount: modalL1,
          level2Amount: modalL2,
          level3Amount: modalL3,
          salaryLevel1:
            formatSalaryAmount(modalL1, appCurrency) ||
            updated.generalManagerReview?.salaryLevel1 ||
            '',
          salaryLevel2:
            formatSalaryAmount(modalL2, appCurrency) ||
            updated.generalManagerReview?.salaryLevel2 ||
            '',
          salaryLevel3:
            formatSalaryAmount(modalL3, appCurrency) ||
            updated.generalManagerReview?.salaryLevel3 ||
            '',
          selectedSalaryLevel: effectiveChosenLevel,
          finalSalarySource: status.startsWith('approved') ? effectiveChosenSource : null,
          finalApprovedSalaryAmount: status.startsWith('approved') ? chosenSourceNumericSalary : null,
          result:
            status === 'approved_proposal'
              ? null
              : effectiveChosenLevel
              ? salaryLevelToDecision(effectiveChosenLevel)
              : decision,
          finalApprovedSalary: resolvedFinalSalary,
          isSalaryLocked: status.startsWith('approved') ? true : Boolean(updated.generalManagerReview?.isSalaryLocked),
          notice: notice || 'تم الاعتماد النهائي بقرار مدير النظام',
          signature: verifiedSignerName,
          reviewedAt: now,
        };
        updated.lastActionType =
          decision === 'مرفوض'
            ? 'رفض'
            : decision === 'انتظار'
            ? 'انتظار'
            : 'اعتماد وقبول نهائي (مدير النظام)';
      } else if (isDeptPending(applicant.status)) {
        updated.status =
          decision === 'مرفوض' ? 'rejected' : decision === 'انتظار' ? 'waitlist' : 'gm_pending';
        updated.directManagerReview = {
          ...updated.directManagerReview,
          positives,
          negatives,
          result: decision,
          notice: notice || 'اعتماد فني مباشر بقرار مدير النظام',
          signature: verifiedSignerName,
          reviewedAt: now,
        };
        updated.lastActionType = 'اعتماد مدير النظام وإحالة للمدير العام';
      } else if (applicant.status === 'hr_manager_pending') {
        const assignedTitle = getDepartmentManagerTitle(selectedDept || updated.assignedDepartment);
        updated.assignedDepartment = selectedDept || updated.assignedDepartment;
        updated.assignedDepartmentManager = assignedTitle;
        updated.status =
          decision === 'مرفوض'
            ? 'rejected'
            : decision === 'انتظار'
            ? 'waitlist'
            : getDepartmentPendingStatus(updated.assignedDepartment);
        updated.hrManagerReview = {
          ...updated.hrManagerReview,
          positives,
          negatives,
          result: decision,
          notice: notice || 'موافقة وتوجيه بقرار مدير النظام',
          signature: verifiedSignerName,
          reviewedAt: now,
        };
        updated.lastActionType = `توجيه لـ ${assignedTitle} (مدير النظام)`;
      } else {
        const assignedTitle = getDepartmentManagerTitle(selectedDept);
        updated.assignedDepartment = selectedDept;
        updated.assignedDepartmentManager = assignedTitle;
        updated.status =
          decision === 'مرفوض'
            ? 'rejected'
            : decision === 'انتظار'
            ? 'waitlist'
            : 'hr_manager_pending';
        updated.hrReview = {
          ...updated.hrReview,
          positives,
          negatives,
          result: decision,
          notice: notice || 'فحص أولي وتوجيه بقرار مدير النظام',
          signature: verifiedSignerName,
          reviewedAt: now,
        };
        updated.lastActionType = 'إحالة إلى مدير الموارد البشرية (مدير النظام)';
      }
    } else if (activeRole === 'general_manager') {
      let status: JobApplication['status'] = 'approved_lvl1';
      if (decision === 'انتظار') status = 'waitlist';
      else if (decision === 'مرفوض') status = 'rejected';
      else if (
        effectiveChosenSource === 'hr_manager_proposal' ||
        effectiveChosenSource === 'direct_manager_proposal'
      ) {
        status = 'approved_proposal';
      } else if (effectiveChosenSource === 'level2') status = 'approved_lvl2';
      else if (effectiveChosenSource === 'level3') status = 'approved_lvl3';
      else status = 'approved_lvl1';

      updated.status = status;
      updated.generalManagerReview = {
        ...updated.generalManagerReview,
        currency: appCurrency,
        level1Amount: modalL1,
        level2Amount: modalL2,
        level3Amount: modalL3,
        salaryLevel1:
          formatSalaryAmount(modalL1, appCurrency) ||
          updated.generalManagerReview?.salaryLevel1 ||
          '',
        salaryLevel2:
          formatSalaryAmount(modalL2, appCurrency) ||
          updated.generalManagerReview?.salaryLevel2 ||
          '',
        salaryLevel3:
          formatSalaryAmount(modalL3, appCurrency) ||
          updated.generalManagerReview?.salaryLevel3 ||
          '',
        selectedSalaryLevel: effectiveChosenLevel,
        finalSalarySource: status.startsWith('approved') ? effectiveChosenSource : null,
        finalApprovedSalaryAmount: status.startsWith('approved') ? chosenSourceNumericSalary : null,
        result:
          status === 'approved_proposal'
            ? null
            : effectiveChosenLevel
            ? salaryLevelToDecision(effectiveChosenLevel)
            : decision,
        finalApprovedSalary: resolvedFinalSalary,
        isSalaryLocked: status.startsWith('approved') ? true : Boolean(updated.generalManagerReview?.isSalaryLocked),
        notice: notice || 'تم الاعتماد النهائي والموافقة على التعيين',
        signature: verifiedSignerName,
        reviewedAt: now,
      };
      updated.lastActionType =
        decision === 'مرفوض' ? 'رفض' : decision === 'انتظار' ? 'انتظار' : 'اعتماد وقبول نهائي';
    } else if (isDepartmentManagerRole(activeRole)) {
      const deptTitle = effectiveDeptTitle;
      updated.status =
        decision === 'مرفوض' ? 'rejected' : decision === 'انتظار' ? 'waitlist' : 'gm_pending';
      updated.directManagerReview = {
        ...updated.directManagerReview,
        positives,
        negatives,
        result: decision,
        notice: notice || `تمت الموافقة الفنية من ${deptTitle} والإحالة للمدير العام`,
        signature: verifiedSignerName,
        department: updated.assignedDepartment,
        managerTitle: deptTitle,
        reviewedAt: now,
      };
      updated.lastActionType =
        decision === 'مرفوض'
          ? 'رفض فني'
          : decision === 'انتظار'
          ? 'انتظار'
          : `إحالة للمدير العام بعد اعتماد ${deptTitle}`;
    } else if (activeRole === 'hr_manager') {
      const assignedTitle = getDepartmentManagerTitle(selectedDept || updated.assignedDepartment);
      updated.assignedDepartment = selectedDept || updated.assignedDepartment;
      updated.assignedDepartmentManager = assignedTitle;
      updated.status =
        decision === 'مرفوض'
          ? 'rejected'
          : decision === 'انتظار'
          ? 'waitlist'
          : getDepartmentPendingStatus(updated.assignedDepartment);
      updated.hrManagerReview = {
        ...updated.hrManagerReview,
        positives,
        negatives,
        result: decision,
        notice:
          notice ||
          (decision === 'مرفوض'
            ? 'رفض بقرار مدير الموارد البشرية'
            : `وافق مدير الموارد البشرية على قبول الاستمارة وإحالتها لـ ${assignedTitle} لإجراء المقابلة الفنية`),
        signature: verifiedSignerName,
        reviewedAt: now,
      };
      updated.lastActionType =
        decision === 'مرفوض'
          ? 'رفض من مدير الموارد البشرية'
          : decision === 'انتظار'
          ? 'انتظار'
          : `قبول مدير الموارد البشرية وإحالة لـ ${assignedTitle}`;
    } else {
      const assignedTitle = getDepartmentManagerTitle(selectedDept);
      updated.assignedDepartment = selectedDept;
      updated.assignedDepartmentManager = assignedTitle;
      updated.status =
        decision === 'مرفوض'
          ? 'rejected'
          : decision === 'انتظار'
          ? 'waitlist'
          : 'hr_manager_pending';
      updated.hrReview = {
        ...updated.hrReview,
        positives,
        negatives,
        result: decision,
        notice:
          notice ||
          `اجتاز فحص الموارد البشرية وتوجهت الاستمارة لـ (${selectedDept})، بانتظار قرار مدير الموارد البشرية`,
        signature: verifiedSignerName,
        reviewedAt: now,
      };
      updated.lastActionType =
        decision === 'مرفوض'
          ? 'رفض في المقابلة التمهيدية'
          : decision === 'انتظار'
          ? 'انتظار'
          : 'إحالة إلى مدير الموارد البشرية';
    }

    updated.lastActionDate = now;
    updated.lastUpdated = new Date().toISOString();

    const explicitOverride =
      isSystemAdmin && overrideTargetStatus !== 'auto' ? overrideTargetStatus : undefined;
    if (explicitOverride) {
      updated.status = explicitOverride;
    }

    const effectiveAction: DecisionPayload['action'] = explicitOverride
      ? explicitOverride === 'rejected'
        ? 'reject'
        : explicitOverride === 'waitlist'
        ? 'waitlist'
        : 'override'
      : decision === 'مرفوض'
      ? 'reject'
      : decision === 'انتظار'
      ? 'waitlist'
      : 'approve';

    setIsSubmitting(true);
    try {
      await onConfirm(updated, {
        action: effectiveAction,
        decision:
          isGmDecisionContext &&
          (effectiveChosenSource === 'hr_manager_proposal' ||
            effectiveChosenSource === 'direct_manager_proposal') &&
          effectiveAction !== 'reject' &&
          effectiveAction !== 'waitlist'
            ? finalSalarySourceToLabel(effectiveChosenSource)
            : decision,
        selectedSalaryLevel: isGmDecisionContext ? effectiveChosenLevel : undefined,
        selectedSalarySource:
          isGmDecisionContext &&
          effectiveAction !== 'reject' &&
          effectiveAction !== 'waitlist'
            ? effectiveChosenSource
            : undefined,
        proposedSalary:
          activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager'
            ? parsedStageProposedSalary
            : undefined,
        proposalNotes:
          activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager'
            ? proposalNotes
            : undefined,
        salaryLevels: buildSalaryLevelsPayload(),
        reviewData: {
          positives,
          negatives,
          notice: notice || '',
          department: selectedDept,
        },
        targetDepartment: selectedDept,
        overrideTargetStatus: explicitOverride,
      });
    } catch (err: any) {
      setLocalError(err?.message || 'تعذر تنفيذ القرار الإداري');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setLocalError(null);
    const updated = {
      ...applicant,
      hrManagerReview: applicant.hrManagerReview || {
        positives: '',
        negatives: '',
        result: null,
        notice: '',
        signature: '',
      },
    };
    const now = new Date().toLocaleString('ar-EG');
    updated.status = 'rejected';

    if (activeRole === 'admin' || activeRole === 'general_manager') {
      updated.generalManagerReview = {
        ...updated.generalManagerReview,
        selectedSalaryLevel: null,
        finalApprovedSalary: '',
        result: 'مرفوض',
        notice:
          notice ||
          (activeRole === 'admin' ? 'تم الرفض بقرار مدير النظام' : 'تم الرفض بقرار المدير العام'),
        signature: verifiedSignerName,
        reviewedAt: now,
      };
    } else if (isDepartmentManagerRole(activeRole)) {
      updated.directManagerReview = {
        ...updated.directManagerReview,
        positives,
        negatives,
        result: 'مرفوض',
        notice: notice || 'غير مناسب لمتطلبات الإدارة في الوقت الحالي',
        signature: verifiedSignerName,
        reviewedAt: now,
      };
    } else if (activeRole === 'hr_manager') {
      updated.hrManagerReview = {
        ...updated.hrManagerReview,
        positives,
        negatives,
        result: 'مرفوض',
        notice: notice || 'مرفوض بقرار مدير الموارد البشرية لعدم استيفاء الشروط',
        signature: verifiedSignerName,
        reviewedAt: now,
      };
    } else {
      updated.hrReview = {
        ...updated.hrReview,
        positives,
        negatives,
        result: 'مرفوض',
        notice: notice || 'غير مطابق لشروط الوظيفة والمعايير الأولية',
        signature: verifiedSignerName,
        reviewedAt: now,
      };
    }

    updated.lastActionDate = now;
    updated.lastActionType = 'رفض الطلب';
    updated.lastUpdated = new Date().toISOString();

    setIsSubmitting(true);
    try {
      await onConfirm(updated, {
        action: 'reject',
        decision: 'مرفوض',
        selectedSalaryLevel: null,
        reviewData: {
          positives,
          negatives,
          notice: notice || 'رفض الطلب',
          department: selectedDept,
        },
        targetDepartment: selectedDept,
      });
    } catch (err: any) {
      setLocalError(err?.message || 'تعذر تنفيذ الرفض');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleTitle =
    activeRole === 'admin'
      ? 'مدير النظام • صلاحيات شاملة والتحكم الكامل في مراحل الاعتماد'
      : activeRole === 'general_manager'
      ? 'المدير العام • اختيار المستوى والاعتماد المالي النهائي'
      : isDepartmentManagerRole(activeRole)
      ? `${effectiveDeptTitle} • المقابلة الفنية والاختبار العملي`
      : activeRole === 'hr_manager'
      ? 'مدير الموارد البشرية • اعتماد ملف المرشح وتوجيهه للإدارة المختصة'
      : 'الموارد البشرية • مراجعة البيانات، تقييم المرشح، والإحالة لمدير الموارد البشرية';

  const userDept = getDepartmentForRole(activeRole);
  const authCheck = validateWorkflowTransition(
    activeRole,
    userDept,
    applicant,
    'approve',
    selectedDept,
    decision,
    {
      isAdminOverride: isSystemAdmin,
      overrideTargetStatus:
        isSystemAdmin && overrideTargetStatus !== 'auto' ? overrideTargetStatus : undefined,
      selectedSalarySource: isGmDecisionContext ? effectiveChosenSource : undefined,
    }
  );

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg max-w-2xl w-full max-h-[92vh] flex flex-col border-t sm:border border-zinc-200 overflow-hidden text-right animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Mobile Pull Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="bg-[#111318] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b-2 border-[#DC2626]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#DC2626] text-white shadow-sm shadow-red-600/25">
              {activeRole === 'general_manager' ? (
                <Award className="w-5 h-5" />
              ) : isDepartmentManagerRole(activeRole) ? (
                <ShieldCheck className="w-5 h-5" />
              ) : activeRole === 'hr_manager' ? (
                <Briefcase className="w-5 h-5" />
              ) : (
                <UserCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-black text-base text-white">اتخاذ قرار واعتماد إداري</h3>
              <p className="text-[11px] text-zinc-300 font-medium">{roleTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RBAC Permission Status Banner */}
        {!authCheck.allowed ? (
          <div className="bg-red-50 border-b border-red-200 px-5 py-2.5 flex items-center gap-2 text-[#991B1B] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
            <span>تنبيه صلاحية: {authCheck.reason}</span>
          </div>
        ) : (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>صلاحية معتمدة: مصرح لك باتخاذ الإجراء في هذه المرحلة وفقاً لقواعد دورة العمل (RBAC).</span>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {localError && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-300 text-[#991B1B] text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          {/* Candidate Snapshot Card */}
          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-[#111318] text-base">{applicant.fullName}</span>
                <span className="font-mono text-xs bg-white px-2 py-0.5 rounded-md border border-zinc-200 text-zinc-700 font-bold">
                  {applicant.recordNumber}
                </span>
                {applicant.assignedDepartment && (
                  <span className="text-[11px] bg-red-50 text-[#B91C1C] font-bold px-2 py-0.5 rounded border border-red-200">
                    {applicant.assignedDepartment}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-600 flex-wrap">
                <span className="font-bold text-[#111318] bg-white px-2 py-0.5 rounded border border-zinc-300">
                  {applicant.positionApplied}
                </span>
                {national.isValid && (
                  <span>• {national.age} سنة ({national.governorate})</span>
                )}
                <span>• هاتف: <strong className="font-mono">{applicant.phone}</strong></span>
                {applicant.expectedSalary && (
                  <span>• الراتب المتوقع: <strong className="font-mono text-amber-800">{applicant.expectedSalary}</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* Previous Stages Summary & Assessments (Positives / Negatives / Notes visible for all subsequent stages) */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-black text-zinc-600">
              تقييمات وملاحظات المراحل الإدارية:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* 1. الموارد البشرية */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="flex items-center justify-between text-[#111318]">
                  <span className="font-black text-[11px]">1. الموارد البشرية</span>
                  <UserCheck className="w-3.5 h-3.5 text-[#DC2626]" />
                </div>
                <div className="font-bold text-[#111318] text-xs">
                  {applicant.hrReview?.result || 'قيد المراجعة'}
                </div>
                {applicant.hrReview?.positives && (
                  <p className="text-[10px] text-emerald-900 leading-relaxed">
                    <strong>الإيجابيات:</strong> {applicant.hrReview.positives}
                  </p>
                )}
                {applicant.hrReview?.negatives && (
                  <p className="text-[10px] text-[#991B1B] leading-relaxed">
                    <strong>السلبيات:</strong> {applicant.hrReview.negatives}
                  </p>
                )}
                {applicant.hrReview?.notice && (
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    <strong>ملاحظات:</strong> {applicant.hrReview.notice}
                  </p>
                )}
              </div>

              {/* 2. مدير الموارد البشرية */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="flex items-center justify-between text-[#111318]">
                  <span className="font-black text-[11px]">2. مدير الموارد البشرية</span>
                  <Briefcase className="w-3.5 h-3.5 text-[#DC2626]" />
                </div>
                <div className="font-bold text-[#111318] text-xs">
                  {applicant.hrManagerReview?.result || 'لم يُقيّم بعد'}
                </div>
                {applicant.hrManagerSalaryProposal && (
                  <div className="text-[10px] font-bold bg-teal-50 text-teal-900 border border-teal-200 px-2 py-1 rounded-lg font-mono tabular-nums">
                    مقترح الراتب: {applicant.hrManagerSalaryProposal.formattedAmount}
                  </div>
                )}
                {applicant.hrManagerReview?.positives && (
                  <p className="text-[10px] text-emerald-900 leading-relaxed">
                    <strong>الإيجابيات:</strong> {applicant.hrManagerReview.positives}
                  </p>
                )}
                {applicant.hrManagerReview?.negatives && (
                  <p className="text-[10px] text-[#991B1B] leading-relaxed">
                    <strong>السلبيات:</strong> {applicant.hrManagerReview.negatives}
                  </p>
                )}
                {applicant.hrManagerReview?.notice && (
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    <strong>ملاحظات:</strong> {applicant.hrManagerReview.notice}
                  </p>
                )}
              </div>

              {/* 3. مدير الإدارة المختصة */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="flex items-center justify-between text-[#111318]">
                  <span className="font-black text-[11px] truncate">
                    3. {applicant.assignedDepartmentManager || 'مدير الإدارة'}
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#DC2626]" />
                </div>
                <div className="font-bold text-[#111318] text-xs">
                  {applicant.directManagerReview?.result || 'لم يُقيّم بعد'}
                </div>
                {applicant.directManagerSalaryProposal && (
                  <div className="text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2 py-1 rounded-lg font-mono tabular-nums">
                    مقترح الراتب: {applicant.directManagerSalaryProposal.formattedAmount}
                  </div>
                )}
                {applicant.directManagerReview?.positives && (
                  <p className="text-[10px] text-emerald-900 leading-relaxed">
                    <strong>الإيجابيات:</strong> {applicant.directManagerReview.positives}
                  </p>
                )}
                {applicant.directManagerReview?.negatives && (
                  <p className="text-[10px] text-[#991B1B] leading-relaxed">
                    <strong>السلبيات:</strong> {applicant.directManagerReview.negatives}
                  </p>
                )}
                {applicant.directManagerReview?.notice && (
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    <strong>ملاحظات:</strong> {applicant.directManagerReview.notice}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* HR Specialist / System Admin (Stage 1): Direct candidate to the appropriate department */}
          {(activeRole === 'hr' || (activeRole === 'admin' && activeDraftStage === 'hr')) && (
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#DC2626]" />
                  <span>توجيه الاستمارة إلى الإدارة المناسبة (المرحلة الأولى - الموارد البشرية):</span>
                </label>
                <span className="text-[10px] bg-[#111318] text-white font-bold px-2.5 py-0.5 rounded-lg">
                  المرحلة 1
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
                أدخل الإيجابيات والسلبيات والملاحظات أدناه، ويمكنك <strong>حفظ التقييمات في قاعدة البيانات</strong> أو الضغط على <strong>إحالة إلى مدير الموارد البشرية</strong>.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                {DEPARTMENTS.map((dept) => {
                  const isSelected = selectedDept === dept.name;
                  return (
                    <button
                      key={dept.name}
                      type="button"
                      onClick={() => {
                        setSelectedDept(dept.name);
                        setNotice(`اجتاز المقابلة التمهيدية وتوجهت الاستمارة لـ (${dept.name}) بانتظار قرار مدير الموارد البشرية`);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#DC2626] text-white border-[#DC2626] font-black shadow-sm shadow-red-600/20'
                          : 'bg-white text-[#111318] border-zinc-200 hover:bg-red-50/40 hover:border-red-300'
                      }`}
                    >
                      <div className="text-[11px] font-bold leading-tight">{dept.name}</div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-red-100 font-bold' : 'text-zinc-500'}`}>
                        {dept.managerTitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* HR Manager: Decision to Accept (routes to Dept Manager) or Reject */}
          {(activeRole === 'hr_manager' || (activeRole === 'admin' && activeDraftStage === 'hr_manager')) && (
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#DC2626]" />
                  <span>قرار مدير الموارد البشرية: القبول والإحالة للإدارة أو الرفض</span>
                </label>
                <span className="text-[10px] bg-[#111318] text-white font-bold px-2.5 py-0.5 rounded-lg">
                  المرحلة 2
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-zinc-200 text-xs">
                <span className="text-zinc-500 text-[10px] block">الإدارة المختصة المستلمة بعد القبول:</span>
                <div className="font-black text-[#111318] text-sm mt-0.5">
                  {selectedDept} — {getDepartmentManagerTitle(selectedDept)}
                </div>
              </div>
              <details className="text-xs">
                <summary className="text-[11px] font-bold text-[#DC2626] cursor-pointer hover:underline mb-1">
                  تعديل الإدارة الموجه إليها (اختياري)
                </summary>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  {DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDept === dept.name;
                    return (
                      <button
                        key={dept.name}
                        type="button"
                        onClick={() => {
                          setSelectedDept(dept.name);
                          setNotice(`تم اعتماد قبول المرشح وتوجيهه إلى ${dept.managerTitle} للاختبار الفني`);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#DC2626] text-white border-[#DC2626] font-black shadow-sm shadow-red-600/20'
                            : 'bg-white text-[#111318] border-zinc-200 hover:bg-red-50/40 hover:border-red-300'
                        }`}
                      >
                        <div className="text-[11px] font-bold leading-tight">{dept.name}</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-red-100 font-bold' : 'text-zinc-500'}`}>
                          {dept.managerTitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </details>
            </div>
          )}

          {/* Stage-specific Positives & Negatives Inputs (Stages 1-3) */}
          {activeDraftStage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الإيجابيات (Positives):</span>
                </label>
                <textarea
                  rows={2}
                  value={positives}
                  onChange={(e) => setPositives(e.target.value)}
                  placeholder="أدخل نقاط القوة والمميزات الخاصة بالمرشح..."
                  className="w-full p-2.5 rounded-xl border border-emerald-200 text-xs text-[#111318] focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600 bg-emerald-50/30"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#991B1B]">
                  <ThumbsDown className="w-3.5 h-3.5 text-[#DC2626]" />
                  <span>السلبيات / التحفظات (Negatives):</span>
                </label>
                <textarea
                  rows={2}
                  value={negatives}
                  onChange={(e) => setNegatives(e.target.value)}
                  placeholder="أدخل أي ملاحظات سلبية أو تحفظات..."
                  className="w-full p-2.5 rounded-xl border border-red-200 text-xs text-[#111318] focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-red-50/30"
                />
              </div>
            </div>
          )}

          {/* Read-only HR Manager Salary Proposal visible to Department Manager */}
          {activeDraftStage === 'direct_manager' && applicant.hrManagerSalaryProposal && (
            <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="font-black text-teal-950 block">
                  الراتب المقترح من مدير الموارد البشرية (للاطلاع فقط):
                </span>
                <span className="text-[11px] text-teal-800 block">
                  بواسطة: <strong>{applicant.hrManagerSalaryProposal.proposerName}</strong> ·{' '}
                  {applicant.hrManagerSalaryProposal.proposedAtArabic}
                </span>
              </div>
              <div className="font-mono tabular-nums font-black text-sm bg-white text-teal-900 border border-teal-300 px-3 py-1.5 rounded-xl">
                {applicant.hrManagerSalaryProposal.formattedAmount}
              </div>
            </div>
          )}

          {/* Salary Proposal Input (HR Manager & Department Manager ONLY) */}
          {(activeDraftStage === 'hr_manager' || activeDraftStage === 'direct_manager') && (
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-[#DC2626]" />
                  <span>
                    {activeDraftStage === 'hr_manager'
                      ? 'الراتب المقترح من مدير الموارد البشرية (اختياري):'
                      : 'الراتب المقترح من مدير الإدارة (اختياري):'}
                  </span>
                </label>
                {isSalaryLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-lg">
                    <Lock className="w-3 h-3" />
                    <span>مقفل بعد الاعتماد النهائي</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    disabled={isSalaryLocked && !isSystemAdmin}
                    value={proposedSalaryInput}
                    onChange={(e) => setProposedSalaryInput(e.target.value)}
                    placeholder="أدخل مبلغ الراتب المقترح (مثال: 7500)"
                    className="w-full p-2.5 rounded-xl border border-zinc-300 bg-white font-mono text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                  <span className="text-xs font-bold text-zinc-700 bg-white border border-zinc-200 px-2.5 py-2.5 rounded-xl shrink-0">
                    {appCurrency}
                  </span>
                </div>

                <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-bold">المعاينة الفورية:</span>
                  <span className="font-mono tabular-nums font-black text-emerald-800">
                    {parsedStageProposedSalary
                      ? formatSalaryAmount(parsedStageProposedSalary, appCurrency)
                      : 'لم يُحدد مقترح'}
                  </span>
                </div>
              </div>

              {((activeDraftStage === 'hr_manager' && applicant.hrManagerSalaryProposal) ||
                (activeDraftStage === 'direct_manager' && applicant.directManagerSalaryProposal)) && (
                <div className="text-[10px] text-zinc-600 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5">
                  آخر مقترح مسجل:{' '}
                  <strong className="font-mono text-[#111318]">
                    {activeDraftStage === 'hr_manager'
                      ? applicant.hrManagerSalaryProposal?.formattedAmount
                      : applicant.directManagerSalaryProposal?.formattedAmount}
                  </strong>{' '}
                  بواسطة{' '}
                  <strong>
                    {activeDraftStage === 'hr_manager'
                      ? applicant.hrManagerSalaryProposal?.proposerName
                      : applicant.directManagerSalaryProposal?.proposerName}
                  </strong>{' '}
                  ({activeDraftStage === 'hr_manager'
                    ? applicant.hrManagerSalaryProposal?.proposedAtArabic
                    : applicant.directManagerSalaryProposal?.proposedAtArabic})
                </div>
              )}

              <input
                type="text"
                disabled={isSalaryLocked && !isSystemAdmin}
                value={proposalNotes}
                onChange={(e) => setProposalNotes(e.target.value)}
                placeholder="ملاحظة مالية على المقترح (اختياري)..."
                className="w-full p-2 rounded-xl border border-zinc-300 bg-white text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100"
              />

              <p className="text-[10px] text-zinc-600">
                يُحفظ المقترح داخل قاعدة البيانات ويظهر أمام المدير العام عند الاعتماد النهائي، ولا يملك أي دور غير المدير العام صلاحية تثبيت الراتب النهائي.
              </p>
            </div>
          )}

          {/* Per-Application Salary Tiers Entry (HR & System Admin ONLY, locked once GM approves) */}
          {(canManageSalaryStructure || activeRole === 'hr' || isSystemAdmin) && (
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-3">
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
                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-white hover:bg-zinc-100 text-[#111318] border border-zinc-300 px-2 py-1 rounded-lg cursor-pointer"
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
                <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-[11px] font-bold">
                  {salarySaveSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                      setSalarySaveSuccess(null);
                    }}
                    placeholder="مثال: 6000"
                    className="w-full p-2 rounded-xl border border-zinc-300 bg-white font-mono text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
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
                      setSalarySaveSuccess(null);
                    }}
                    placeholder="مثال: 8000"
                    className="w-full p-2 rounded-xl border border-zinc-300 bg-white font-mono text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
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
                      setSalarySaveSuccess(null);
                    }}
                    placeholder="مثال: 10000"
                    className="w-full p-2 rounded-xl border border-zinc-300 bg-white font-mono text-xs text-[#111318] focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-zinc-600">
                {isSalaryLocked
                  ? 'تم تثبيت الراتب نهائياً بقرار المدير العام داخل هذه الاستمارة ولا يتأثر بأي تعديلات أخرى.'
                  : 'تدخل الموارد البشرية مستويات الرواتب الثلاثة داخل الاستمارة، ويختار المدير العام المستوى المناسب فقط عند الاعتماد النهائي.'}
              </p>
            </div>
          )}

          {/* GENERAL MANAGER: 5-Option Salary Comparison & Single Radio Selection Panel */}
          {isGmDecisionContext ? (
            <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-[#DC2626]" />
                  <span>المرحلة الرابعة (المدير العام): مقارنة الرواتب والاعتماد النهائي (اختر خياراً واحداً فقط)</span>
                </label>
                {isSalaryLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-lg">
                    <Lock className="w-3 h-3" />
                    <span>معتمد نهائياً</span>
                  </span>
                )}
              </div>

              {isSalaryLockedForNonAdmin && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    تم اعتماد وتثبيت الراتب النهائي داخل هذه الاستمارة ({applicant.generalManagerReview?.finalApprovedSalary}) ولا يمكن تعديله.
                  </span>
                </div>
              )}

              {/* 5-Option Structured Comparison & Radio Selection */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['level1', 'level2', 'level3'] as const).map((lvl) => {
                    const amount = getSourceNumericAmount(lvl);
                    const formatted = formatSalaryAmount(amount, appCurrency);
                    const isAvailable = Boolean(amount && amount > 0);
                    const isChosen =
                      selectedSalarySource === lvl && decision !== 'مرفوض' && decision !== 'انتظار';
                    const titleText =
                      lvl === 'level1'
                        ? 'المستوى الأول (هيكل الرواتب)'
                        : lvl === 'level2'
                        ? 'المستوى الثاني (هيكل الرواتب)'
                        : 'المستوى الثالث (هيكل الرواتب)';

                    return (
                      <label
                        key={lvl}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                          isSalaryLockedForNonAdmin || !isAvailable
                            ? 'opacity-60 cursor-not-allowed bg-zinc-100 border-zinc-200 text-zinc-500'
                            : isChosen
                            ? 'cursor-pointer bg-[#111318] text-white border-[#DC2626] shadow-md ring-2 ring-red-600/20'
                            : 'cursor-pointer bg-white text-[#111318] border-zinc-200 hover:border-red-300 hover:bg-red-50/35'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="gm-final-salary-source"
                              value={lvl}
                              checked={isChosen}
                              disabled={isSalaryLockedForNonAdmin || !isAvailable}
                              onChange={() => handleSelectGmSource(lvl)}
                              className="accent-[#DC2626] w-3.5 h-3.5"
                            />
                            <span className="font-black text-[11px]">{titleText}</span>
                          </div>
                        </div>
                        <div
                          className={`font-mono tabular-nums font-black text-sm ${
                            formatted
                              ? isChosen
                                ? 'text-white'
                                : 'text-[#111318]'
                              : 'text-[#DC2626] text-xs'
                          }`}
                        >
                          {formatted || 'غير محدد'}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Manager Salary Proposals (Options 4 & 5) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    const amount = getSourceNumericAmount(item.key);
                    const formatted = formatSalaryAmount(
                      amount,
                      item.proposal?.currency || appCurrency
                    );
                    const isAvailable = Boolean(amount && amount > 0);
                    const isChosen =
                      selectedSalarySource === item.key &&
                      decision !== 'مرفوض' &&
                      decision !== 'انتظار';

                    return (
                      <label
                        key={item.key}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                          isSalaryLockedForNonAdmin || !isAvailable
                            ? 'opacity-65 cursor-not-allowed bg-zinc-100 border-zinc-200 text-zinc-500'
                            : isChosen
                            ? 'cursor-pointer bg-[#111318] text-white border-[#DC2626] shadow-md ring-2 ring-red-600/20'
                            : 'cursor-pointer bg-white text-[#111318] border-zinc-200 hover:border-red-300 hover:bg-red-50/35'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="gm-final-salary-source"
                              value={item.key}
                              checked={isChosen}
                              disabled={isSalaryLockedForNonAdmin || !isAvailable}
                              onChange={() => handleSelectGmSource(item.key)}
                              className="accent-[#DC2626] w-3.5 h-3.5"
                            />
                            <span className="font-black text-xs">{item.title}</span>
                          </div>
                          {isAvailable && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                isChosen ? 'bg-[#DC2626] text-white' : 'bg-teal-50 text-teal-800 border border-teal-200'
                              }`}
                            >
                              مقترح مسجل
                            </span>
                          )}
                        </div>
                        <div
                          className={`font-mono tabular-nums font-black text-sm ${
                            formatted
                              ? isChosen
                                ? 'text-white'
                                : 'text-[#111318]'
                              : 'text-zinc-500 text-xs font-semibold'
                          }`}
                        >
                          {formatted || 'لم يتم تقديم مقترح'}
                        </div>
                        {item.proposal && isAvailable && (
                          <div className={`text-[10px] space-y-0.5 ${isChosen ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            <div>
                              المقترح بواسطة: <strong>{item.proposal.proposerName}</strong>
                              {item.proposal.proposerDepartment ? ` • ${item.proposal.proposerDepartment}` : ''}
                            </div>
                            <div className="font-mono">{item.proposal.proposedAtArabic}</div>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Waitlist / Reject alternative options for GM */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSalaryLockedForNonAdmin}
                  onClick={() => {
                    setSelectedSalarySource(null);
                    setSelectedLevel(null);
                    setDecision('انتظار');
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all disabled:opacity-60 ${
                    decision === 'انتظار'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                      : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  قائمة الانتظار
                </button>
                <button
                  type="button"
                  disabled={isSalaryLockedForNonAdmin}
                  onClick={() => {
                    setSelectedSalarySource(null);
                    setSelectedLevel(null);
                    setDecision('مرفوض');
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all disabled:opacity-60 ${
                    decision === 'مرفوض'
                      ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-sm'
                      : 'bg-white text-[#991B1B] border-red-200 hover:bg-red-50'
                  }`}
                >
                  رفض نهائي
                </button>
              </div>

              {/* Read-Only Auto-Populated Approved Salary Box */}
              <div className="p-3 rounded-xl bg-white border border-zinc-200 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-zinc-500 block">
                    الراتب النهائي المعتمد ومصدر الاعتماد (للقراءة فقط):
                  </span>
                  <span className="text-xs font-bold text-[#111318]">
                    {effectiveChosenSource
                      ? finalSalarySourceToLabel(effectiveChosenSource)
                      : decision === 'انتظار'
                      ? 'قائمة الانتظار'
                      : decision === 'مرفوض'
                      ? 'مرفوض'
                      : 'اختر خياراً واحداً من الخيارات الخمسة'}
                  </span>
                </div>
                <div className="font-mono font-black text-base text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  {effectiveChosenSource
                    ? formatSalaryAmount(
                        getSourceNumericAmount(effectiveChosenSource),
                        appCurrency
                      ) || 'غير محدد'
                    : '—'}
                </div>
              </div>
            </div>
          ) : (
            /* Stages 1-3 Recommendation Options */
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#111318]">
                اختر التقييم / التوصية المبدئية لهذا المرشح:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { val: 'مستوى أول', label: 'مستوى أول', desc: 'توصية متميزة', color: 'border-emerald-200 text-emerald-900 bg-emerald-50/40 hover:bg-emerald-50' },
                  { val: 'مستوى ثاني', label: 'مستوى ثاني', desc: 'توصية قياسية', color: 'border-zinc-200 text-[#111318] bg-zinc-50 hover:bg-zinc-100' },
                  { val: 'مستوى ثالث', label: 'مستوى ثالث', desc: 'تحت التجربة', color: 'border-zinc-200 text-zinc-800 bg-zinc-50 hover:bg-zinc-100' },
                  { val: 'انتظار', label: 'قائمة انتظار', desc: 'احتياط مؤهل', color: 'border-amber-200 text-amber-900 bg-amber-50/50 hover:bg-amber-50' },
                  { val: 'مرفوض', label: 'مرفوض', desc: 'غير مناسب', color: 'border-red-200 text-[#991B1B] bg-red-50/40 hover:bg-red-50' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setDecision(opt.val as EvaluationResult)}
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                      decision === opt.val
                        ? opt.val === 'مرفوض'
                          ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-sm font-black'
                          : opt.val === 'انتظار'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-black'
                          : 'bg-[#111318] text-white border-[#111318] ring-2 ring-red-600/20 shadow-sm font-black'
                        : opt.color
                    }`}
                  >
                    <div className="font-bold text-xs">{opt.label}</div>
                    <div className="text-[10px] opacity-75">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* System Admin Stage Override / Bypass / Revert Controls */}
          {isSystemAdmin && (
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-[#111318] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#DC2626]" />
                  <span>تحكم مدير النظام: نقل / تجاوز / إرجاع المرحلة الإدارية</span>
                </label>
                <span className="text-[10px] bg-[#111318] text-white font-bold px-2 py-0.5 rounded font-mono">
                  System Admin
                </span>
              </div>
              <select
                value={overrideTargetStatus}
                onChange={(e) => setOverrideTargetStatus(e.target.value as 'auto' | ApplicationStatus)}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-[#111318] focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] cursor-pointer"
              >
                <option value="auto">المسار التلقائي (التنفيذ والانتقال للمرحلة التالية حسب الحالة الحالية)</option>
                <option value="hr_pending">إرجاع / توجيه إلى: 1. الموارد البشرية (HR)</option>
                <option value="hr_manager_pending">تحويل / إرجاع إلى: 2. مدير الموارد البشرية</option>
                <option value={getDepartmentPendingStatus(selectedDept)}>
                  تحويل / إرجاع إلى: 3. {getDepartmentManagerTitle(selectedDept)} ({selectedDept})
                </option>
                <option value="gm_pending">تحويل إلى: 4. المدير العام (GM)</option>
                <option value="approved_lvl1">تجاوز المراحل: اعتماد نهائي (المستوى الأول)</option>
                <option value="approved_lvl2">تجاوز المراحل: اعتماد نهائي (المستوى الثاني)</option>
                <option value="approved_lvl3">تجاوز المراحل: اعتماد نهائي (المستوى الثالث)</option>
                <option value="approved_proposal">تجاوز المراحل: اعتماد بالراتب المقترح المختار</option>
                <option value="waitlist">تحويل إلى: قائمة الانتظار</option>
                <option value="rejected">رفض الاستمارة نهائياً</option>
              </select>
            </div>
          )}

          {/* Quick Notice & Remarks */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#111318]">
              الملاحظات والتوجيهات الإدارية:
            </label>
            <textarea
              rows={2}
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
              placeholder="اكتب ملاحظاتك وتقييمك الإداري..."
              className="w-full p-3 rounded-xl border border-zinc-300 text-xs text-[#111318] focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] bg-zinc-50 focus:bg-white"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_NOTES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setNotice(q)}
                  className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  + {q}
                </button>
              ))}
            </div>
          </div>

          {/* Official Electronic Signature */}
          <PendingAutoSignatureBox
            appUser={appUser}
            activeRole={activeRole}
            compactPreview
            stageLabel={
              activeRole === 'admin'
                ? 'مدير النظام (صلاحيات كاملة)'
                : activeRole === 'general_manager'
                ? 'اعتماد المدير العام'
                : isDepartmentManagerRole(activeRole)
                ? effectiveDeptTitle
                : activeRole === 'hr_manager'
                ? 'مدير الموارد البشرية'
                : 'الموارد البشرية'
            }
          />
        </div>

        {/* Footer Actions */}
        <div className="bg-zinc-50 px-5 sm:px-6 py-4 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!authCheck.allowed || isSubmitting}
              onClick={handleReject}
              title={!authCheck.allowed ? authCheck.reason : 'رفض الطلب'}
              className="flex items-center gap-1.5 px-3 py-2.5 min-h-[40px] bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white font-bold text-xs rounded-xl border border-red-200 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4" />
              <span>رفض الطلب</span>
            </button>

            {onSaveDraft && activeDraftStage && (
              <button
                type="button"
                disabled={isSavingDraft || isSubmitting || !authCheck.allowed}
                onClick={handleSaveDraftClick}
                className="flex items-center gap-1.5 px-3 py-2.5 min-h-[40px] bg-white hover:bg-zinc-100 text-[#111318] font-bold text-xs rounded-xl border border-zinc-300 transition-colors cursor-pointer disabled:opacity-45"
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 min-h-[40px] bg-white hover:bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl border border-zinc-300 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={!authCheck.allowed || isSalaryGateBlocked || isSubmitting}
              onClick={handleApprove}
              title={
                !authCheck.allowed
                  ? authCheck.reason
                  : isSalaryGateBlocked
                  ? 'يجب أن تقوم الموارد البشرية باعتماد هيكل الرواتب أولاً'
                  : undefined
              }
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 min-h-[40px] text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer hover:shadow-md disabled:opacity-45 disabled:cursor-not-allowed ${
                decision === 'مرفوض'
                  ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                  : decision === 'انتظار'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-white" />
              )}
              <span>
                {isSystemAdmin && overrideTargetStatus !== 'auto'
                  ? 'تنفيذ وتوجيه المرحلة بقرار مدير النظام'
                  : activeRole === 'admin'
                  ? 'تنفيذ واعتماد بقرار مدير النظام'
                  : activeRole === 'hr_manager'
                  ? `اعتماد وتوجيه لـ ${getDepartmentManagerTitle(selectedDept)}`
                  : isDepartmentManagerRole(activeRole)
                  ? 'اعتماد فني وإحالة للمدير العام'
                  : activeRole === 'general_manager'
                  ? 'الموافقة والاعتماد المالي النهائي'
                  : decision === 'مرفوض'
                  ? 'حفظ الرفض'
                  : decision === 'انتظار'
                  ? 'تحويل لقائمة الانتظار'
                  : 'إحالة إلى مدير الموارد البشرية'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
