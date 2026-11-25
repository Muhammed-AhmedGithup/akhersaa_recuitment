import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import {
  JobApplication,
  UserRole,
  AppNotification,
  SalaryStructureConfig,
  SalaryStructureHistoryEntry,
  hasHrPermission,
  isApprovedStatus,
  finalSalarySourceToLabel,
} from './types';
import { getStatusLabel } from './utils/csvHandler';
import { parseEgyptianNationalId } from './utils/nationalId';
import {
  DEPARTMENTS,
  DepartmentType,
  isDepartmentManagerRole,
  getDepartmentForRole,
  getRoleDisplayTitle,
  isDeptPending,
  matchesDeptFilter
} from './utils/departments';
import {
  submitDecision,
  DecisionPayload,
  deleteApplicant,
  createApplicant,
  updateApplicant,
  fetchAuthorizedApplications,
  importApplicants,
  fetchNotifications,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
  saveStageReviewDraft,
  saveApplicationSalaryLevels,
  fetchSalaryStructure,
  PerApplicationSalaryLevelsPayload,
} from './services/apiService';
import { doesDepartmentMatch } from './utils/workflowAuthorization';
import { CompanyLogo } from './components/CompanyLogo';
import { StatsOverview } from './components/StatsOverview';
import { OfflineIndicator } from './components/OfflineIndicator';
import { NotificationCenter } from './components/NotificationCenter';
import { NotificationToast } from './components/NotificationToast';
import { UserAuthHeader } from './components/UserAuthHeader';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './context/AuthContext';
import { MobileAppBar } from './components/MobileAppBar';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { MobileFloatingFAB } from './components/MobileFloatingFAB';
import { MobileMenuDrawer } from './components/MobileMenuDrawer';
import { MobileNotificationsSheet } from './components/MobileNotificationsSheet';
import { MobileStatsSheet } from './components/MobileStatsSheet';
import { ApplicantAvatar } from './components/ApplicantAvatar';
import { Bot, Database, Loader2 } from 'lucide-react';

const EvaluationSheetModal = lazy(() =>
  import('./components/EvaluationSheetModal').then((m) => ({ default: m.EvaluationSheetModal }))
);
const ApplicantDetailModal = lazy(() =>
  import('./components/ApplicantDetailModal').then((m) => ({ default: m.ApplicantDetailModal }))
);
const GoogleSheetSyncModal = lazy(() =>
  import('./components/GoogleSheetSyncModal').then((m) => ({ default: m.GoogleSheetSyncModal }))
);
const NewApplicantModal = lazy(() =>
  import('./components/NewApplicantModal').then((m) => ({ default: m.NewApplicantModal }))
);
const QuickDecisionModal = lazy(() =>
  import('./components/QuickDecisionModal').then((m) => ({ default: m.QuickDecisionModal }))
);
const PrintOfficialSheet = lazy(() =>
  import('./components/PrintOfficialSheet').then((m) => ({ default: m.PrintOfficialSheet }))
);
const PWAInstallModal = lazy(() =>
  import('./components/PWAInstallModal').then((m) => ({ default: m.PWAInstallModal }))
);
const GeminiAssistantModal = lazy(() =>
  import('./components/GeminiAssistantModal').then((m) => ({ default: m.GeminiAssistantModal }))
);
const UserManagementView = lazy(() =>
  import('./components/UserManagementView').then((m) => ({ default: m.UserManagementView }))
);
const ImagePreviewModal = lazy(() =>
  import('./components/ImagePreviewModal').then((m) => ({ default: m.ImagePreviewModal }))
);
const ExcelExportModal = lazy(() =>
  import('./components/ExcelExportModal').then((m) => ({ default: m.ExcelExportModal }))
);
const SalaryStructureModal = lazy(() =>
  import('./components/SalaryStructureModal').then((m) => ({ default: m.SalaryStructureModal }))
);
const ApplicationsChartDashboard = lazy(() =>
  import('./components/ApplicationsChartDashboard').then((m) => ({
    default: m.ApplicationsChartDashboard,
  }))
);
const DepartmentsOverviewView = lazy(() =>
  import('./components/DepartmentsOverviewView').then((m) => ({
    default: m.DepartmentsOverviewView,
  }))
);

import {
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Clock,
  ShieldCheck,
  Trash2,
  MessageCircle,
  FileCheck2,
  RefreshCw,
  Zap,
  Building2,
  Plus,
  Smartphone,
  Phone,
  LayoutGrid,
  Table as TableIcon,
  Check,
  Copy,
  Briefcase,
  Pencil,
  Banknote,
  BarChart3,
  LogOut,
  Lock,
  Calendar,
} from 'lucide-react';

export default function App() {
  const [applicants, setApplicants] = useState<JobApplication[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  const {
    appUser,
    role: authRole,
    isSuperAdmin,
    isLoading,
    logout,
  } = useAuth();

  const isAuthenticated = Boolean(appUser);
  const [activeRole, setActiveRole] = useState<UserRole>('hr');
  const [currentView, setCurrentView] = useState<'applications' | 'departments' | 'users'>('applications');

  // Authoritative UI RBAC booleans aligned with backend permissions
  const isAdminSystem = Boolean(
    isSuperAdmin || appUser?.role === 'admin' || activeRole === 'admin'
  );
  const canManageUsers = Boolean(
    isAdminSystem || appUser?.permissions?.manage_identities
  );
  // Independent HR Permissions Group: System Admin automatically inherits 100%, other roles strictly isolated
  const canSyncGoogleSheets = isAdminSystem || hasHrPermission(appUser, 'hr_sync_google_sheets');
  const canAddApplicant = isAdminSystem || hasHrPermission(appUser, 'hr_create_applications');
  const canEditApplicant = isAdminSystem || hasHrPermission(appUser, 'hr_edit_applications');
  const canExportCSV = isAdminSystem || hasHrPermission(appUser, 'hr_export_excel');
  const canManageSalaryStructure = isAdminSystem || hasHrPermission(appUser, 'hr_manage_salary_structure');
  const canDeleteApplicant = Boolean(
    isAdminSystem ||
    (activeRole === 'general_manager' && appUser?.permissions?.delete_data !== false)
  );
  const canEditApplicationRow = (app: JobApplication | null | undefined) =>
    Boolean(app && canEditApplicant && (isAdminSystem || app.status === 'new' || app.status === 'hr_pending'));

  useEffect(() => {
    const verifiedRole = appUser?.role || authRole;
    if (verifiedRole) {
      setActiveRole(verifiedRole);
    }
  }, [authRole, appUser]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [viewScope, setViewScope] = useState<'all' | 'pending_me'>('pending_me');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showCharts, setShowCharts] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [evaluatingApplicant, setEvaluatingApplicant] = useState<JobApplication | null>(null);
  const [quickDecisionApplicant, setQuickDecisionApplicant] = useState<JobApplication | null>(null);
  const [viewingApplicant, setViewingApplicant] = useState<JobApplication | null>(null);
  const [editingApplicant, setEditingApplicant] = useState<JobApplication | null>(null);
  const [appToDelete, setAppToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingApp, setIsDeletingApp] = useState(false);
  const [printingApplicant, setPrintingApplicant] = useState<JobApplication | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSalaryStructureModal, setShowSalaryStructureModal] = useState(false);
  const [salaryStructure, setSalaryStructure] = useState<SalaryStructureConfig | null>(null);
  const [salaryStructureHistory, setSalaryStructureHistory] = useState<SalaryStructureHistoryEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiTargetApplicant, setGeminiTargetApplicant] = useState<JobApplication | null>(null);
  const [previewApplicant, setPreviewApplicant] = useState<{ applicant: JobApplication; photoUrl: string } | null>(null);

  // Mobile App state
  const [mobileTab, setMobileTab] = useState<MobileTab>('applicants');
  const [showMobileNotifsSheet, setShowMobileNotifsSheet] = useState(false);
  const [showMobileMenuDrawer, setShowMobileMenuDrawer] = useState(false);
  const [showMobileStatsSheet, setShowMobileStatsSheet] = useState(false);
  const [showPWAInstallModal, setShowPWAInstallModal] = useState(false);

  const handleSelectMobileTab = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === 'applicants') {
      setCurrentView('applications');
      setViewScope('all');
    } else if (tab === 'pending') {
      setCurrentView('applications');
      setViewScope('pending_me');
    } else if (tab === 'ai') {
      setGeminiTargetApplicant(null);
      setShowGeminiModal(true);
    } else if (tab === 'stats') {
      setShowMobileStatsSheet(true);
    } else if (tab === 'menu') {
      setShowMobileMenuDrawer(true);
    }
  };

  // In-App Notifications state (sourced from SQL DB)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [dbFeedbackToast, setDbFeedbackToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showFeedbackToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setDbFeedbackToast({ message, type });
    setTimeout(() => {
      setDbFeedbackToast((curr) => (curr?.message === message ? null : curr));
    }, 3800);
  };

  // Clear any legacy localStorage keys from older client-side versions
  useEffect(() => {
    try {
      const legacyKeys = [
        'akher_saa_applications_v1',
        'akher_saa_notifs_v1',
        'akher_saa_session_v2',
        'akher_saa_session_v1',
        'akher_saa_db_initialized_v2',
      ];
      legacyKeys.forEach((k) => window.localStorage?.removeItem(k));
    } catch {}
  }, []);

  // Fetch authoritative applications and notifications directly from SQL Database API
  const refreshFromDatabase = useCallback(
    async (showSpinner = false) => {
      if (!isAuthenticated || isLoading) {
        if (!isAuthenticated && !isLoading) {
          setApplicants([]);
          setNotifications([]);
        }
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return;
      }
      if (!showSpinner && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (showSpinner) setIsLoadingData(true);
      try {
        const dept = getDepartmentForRole(activeRole);
        const [appsRes, notifsRes, salaryRes] = await Promise.all([
          fetchAuthorizedApplications(activeRole, dept, 'all'),
          fetchNotifications(activeRole).catch(() => [] as AppNotification[]),
          fetchSalaryStructure(activeRole).catch(() => null),
        ]);
        setApplicants(appsRes.applicants || []);
        setNotifications(notifsRes || []);
        if (salaryRes?.salaryStructure) {
          setSalaryStructure(salaryRes.salaryStructure);
          setSalaryStructureHistory(salaryRes.history || []);
        }
      } catch (err: any) {
        const msg = String(err?.message || err || '').toLowerCase();
        const isTransientNetwork =
          err instanceof TypeError ||
          msg.includes('failed to fetch') ||
          msg.includes('networkerror') ||
          msg.includes('load failed');

        if (!showSpinner && isTransientNetwork) {
          console.warn('[SQL Sync] Transient background sync pause:', err?.message || err);
        } else {
          console.error('[SQL Sync Error]:', err);
          if (showSpinner) {
            showFeedbackToast(err?.message || 'تعذر جلب البيانات من قاعدة البيانات', 'error');
          }
        }
      } finally {
        if (showSpinner) setIsLoadingData(false);
      }
    },
    [isAuthenticated, isLoading, activeRole]
  );

  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      if (!isAuthenticated && !isLoading) {
        setApplicants([]);
        setNotifications([]);
      }
      return;
    }

    refreshFromDatabase(true);
    const interval = setInterval(() => {
      refreshFromDatabase(false);
    }, 30000);

    const handleOnlineOrVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        refreshFromDatabase(false);
      }
    };
    window.addEventListener('online', handleOnlineOrVisible);
    document.addEventListener('visibilitychange', handleOnlineOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnlineOrVisible);
      document.removeEventListener('visibilitychange', handleOnlineOrVisible);
    };
  }, [isAuthenticated, isLoading, activeRole, refreshFromDatabase]);

  // Unique positions for filter dropdown
  const uniquePositions = useMemo(() => {
    const set = new Set<string>();
    applicants.forEach((a) => {
      if (a.positionApplied) set.add(a.positionApplied.trim());
    });
    return Array.from(set);
  }, [applicants]);

  // Count pending for active role
  const pendingForMeCount = useMemo(() => {
    return applicants.filter((app) => {
      if (activeRole === 'admin') {
        return !isApprovedStatus(app.status) && !['rejected', 'waitlist'].includes(app.status);
      }
      if (activeRole === 'general_manager') return app.status === 'gm_pending';
      if (activeRole === 'direct_manager') return isDeptPending(app.status);
      if (isDepartmentManagerRole(activeRole)) {
        if (!isDeptPending(app.status)) return false;
        const roleDept = getDepartmentForRole(activeRole);
        return doesDepartmentMatch(roleDept, app.assignedDepartment);
      }
      if (activeRole === 'hr_manager') return app.status === 'hr_manager_pending';
      if (activeRole === 'hr') return app.status === 'new' || app.status === 'hr_pending';
      return false;
    }).length;
  }, [applicants, activeRole]);

  // Unread notifications for active role
  const unreadCount = useMemo(() => {
    return notifications.filter(
      (n) => !n.isRead && (n.targetRole === activeRole || activeRole === 'admin')
    ).length;
  }, [notifications, activeRole]);

  // Count pending technical interviews (Stage 3)
  const deptInterviewsCount = useMemo(
    () => applicants.filter((a) => isDeptPending(a.status)).length,
    [applicants]
  );

  // Safe date extractor for filtering by submission/update date
  const parseAppDate = (app: JobApplication): Date | null => {
    const candidates = [app.lastUpdated, app.timestamp, app.todayDate].filter(Boolean) as string[];
    for (const raw of candidates) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return parsed;
      const slashMatch = raw.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
      if (slashMatch) {
        const [, p1, p2, p3] = slashMatch;
        const year = p3.length === 2 ? Number(`20${p3}`) : Number(p3);
        const d = new Date(year, Number(p2) - 1, Number(p1));
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
    return null;
  };

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return applicants.filter((app) => {
      // 1. Strict Department Manager isolation: Department managers can ONLY ever view applications for their department
      if (isDepartmentManagerRole(activeRole)) {
        const mgrDept = getDepartmentForRole(activeRole);
        if (!doesDepartmentMatch(mgrDept, app.assignedDepartment)) {
          return false;
        }
      }

      // Scope filter: Pending My Approval
      if (viewScope === 'pending_me') {
        if (
          activeRole === 'admin' &&
          (isApprovedStatus(app.status) || ['rejected', 'waitlist'].includes(app.status))
        ) {
          return false;
        }
        if (activeRole === 'general_manager' && app.status !== 'gm_pending') return false;
        if (activeRole === 'direct_manager' && !isDeptPending(app.status)) return false;
        if (isDepartmentManagerRole(activeRole) && !isDeptPending(app.status)) return false;
        if (activeRole === 'hr_manager' && app.status !== 'hr_manager_pending') return false;
        if (activeRole === 'hr' && app.status !== 'new' && app.status !== 'hr_pending') return false;
      }

      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          app.fullName.toLowerCase().includes(q) ||
          app.nationalId.includes(q) ||
          app.phone.includes(q) ||
          app.recordNumber.toLowerCase().includes(q) ||
          app.positionApplied.toLowerCase().includes(q) ||
          (app.assignedDepartment && app.assignedDepartment.toLowerCase().includes(q)) ||
          (app.assignedDepartmentManager && app.assignedDepartmentManager.toLowerCase().includes(q)) ||
          (app.address && app.address.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Position filter
      if (filterPosition !== 'all' && app.positionApplied !== filterPosition) {
        return false;
      }

      // Department filter
      if (filterDepartment !== 'all' && app.assignedDepartment !== filterDepartment) {
        return false;
      }

      // Date filter
      if (filterDate !== 'all') {
        const appDate = parseAppDate(app);
        if (!appDate) return false;
        if (filterDate === 'today') {
          if (appDate < startOfToday) return false;
        } else if (filterDate === 'week') {
          const weekAgo = new Date(startOfToday);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (appDate < weekAgo) return false;
        } else if (filterDate === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (appDate < monthStart) return false;
        } else if (filterDate === 'custom' && customDate) {
          const yyyy = appDate.getFullYear();
          const mm = String(appDate.getMonth() + 1).padStart(2, '0');
          const dd = String(appDate.getDate()).padStart(2, '0');
          if (`${yyyy}-${mm}-${dd}` !== customDate) return false;
        }
      }

      // Status filter
      if (statusFilter === 'all') return true;
      if (statusFilter === 'in_review') {
        return !isApprovedStatus(app.status) && app.status !== 'rejected';
      }
      if (statusFilter === 'hr') return app.status === 'new' || app.status === 'hr_pending';
      if (statusFilter === 'hr_manager') return app.status === 'hr_manager_pending';
      if (statusFilter === 'dept') return isDeptPending(app.status);
      if (statusFilter.startsWith('dept_')) {
        return matchesDeptFilter(app, statusFilter);
      }
      if (statusFilter === 'gm') return app.status === 'gm_pending';
      if (statusFilter === 'approved') {
        return isApprovedStatus(app.status);
      }
      if (['approved_lvl1', 'approved_lvl2', 'approved_lvl3', 'approved_proposal'].includes(statusFilter)) {
        return app.status === statusFilter;
      }
      if (statusFilter === 'waitlist') return app.status === 'waitlist';
      if (statusFilter === 'rejected') return app.status === 'rejected';

      return true;
    });
  }, [applicants, searchQuery, filterPosition, filterDepartment, statusFilter, filterDate, customDate, viewScope, activeRole]);

  // Handlers
  const handleSaveEvaluation = async (updated: JobApplication, payload?: DecisionPayload) => {
    const userDept = getDepartmentForRole(activeRole);
    const decisionPayload: DecisionPayload = payload || {
      action: updated.status === 'rejected' ? 'reject' : updated.status === 'waitlist' ? 'waitlist' : 'approve',
      decision: updated.status.startsWith('approved')
        ? 'مستوى أول'
        : updated.status === 'rejected'
        ? 'مرفوض'
        : updated.status === 'waitlist'
        ? 'انتظار'
        : 'مستوى أول',
      reviewData: {
        notice: updated.lastActionType || 'تحديث التقييم والاعتماد',
        department: updated.assignedDepartment,
      },
      targetDepartment: updated.assignedDepartment,
    };

    try {
      // 1. Submit through Backend API with strict Authorization, Status Checking, and Transactions
      const result = await submitDecision(updated.id, decisionPayload, activeRole, userDept);
      const authoritative = result.application;

      setApplicants((prev) => prev.map((a) => (a.id === authoritative.id ? authoritative : a)));
      setEvaluatingApplicant(null);
      setQuickDecisionApplicant(null);
      if (viewingApplicant?.id === authoritative.id) {
        setViewingApplicant(authoritative);
      }
      fetchNotifications(activeRole).then(setNotifications).catch(() => {});

      showFeedbackToast(
        `تم اعتماد القرار الإداري لـ (${authoritative.fullName}) بنجاح وحفظه في قاعدة البيانات`,
        'success'
      );
    } catch (err: any) {
      console.error('[Decision Execution Failed]', err);
      const errMsg = err?.message || 'فشلت معالجة القرار - يرجى التحقق من الصلاحيات والمرحلة';
      showFeedbackToast(errMsg, 'error');
      throw err;
    }
  };

  const handleSaveDraftReview = async (
    applicantId: string,
    draft: {
      stage?: 'hr' | 'hr_manager' | 'direct_manager';
      positives?: string;
      negatives?: string;
      notice?: string;
      result?: any;
      assignedDepartment?: DepartmentType;
      salaryLevels?: PerApplicationSalaryLevelsPayload;
      proposedSalary?: number | null;
      proposalNotes?: string;
    }
  ) => {
    try {
      const userDept = getDepartmentForRole(activeRole);
      const res = await saveStageReviewDraft(applicantId, draft, activeRole, userDept);
      const authoritative = res.application;
      setApplicants((prev) => prev.map((a) => (a.id === authoritative.id ? authoritative : a)));
      if (viewingApplicant?.id === authoritative.id) {
        setViewingApplicant(authoritative);
      }
      if (evaluatingApplicant?.id === authoritative.id) {
        setEvaluatingApplicant(authoritative);
      }
      if (quickDecisionApplicant?.id === authoritative.id) {
        setQuickDecisionApplicant(authoritative);
      }
      showFeedbackToast(
        res.message || `تم حفظ تقييمات وملاحظات (${authoritative.fullName}) في قاعدة البيانات`,
        'success'
      );
    } catch (err: any) {
      console.error('[Save Draft Review Failed]', err);
      showFeedbackToast(err?.message || 'تعذر حفظ التقييمات والملاحظات', 'error');
      throw err;
    }
  };

  const handleSaveAppSalaryLevels = async (
    applicantId: string,
    payload: {
      level1Salary: number;
      level2Salary: number;
      level3Salary: number;
      currency: string;
    }
  ) => {
    try {
      const res = await saveApplicationSalaryLevels(applicantId, payload, activeRole);
      const authoritative = res.application;
      setApplicants((prev) => prev.map((a) => (a.id === authoritative.id ? authoritative : a)));
      if (viewingApplicant?.id === authoritative.id) {
        setViewingApplicant(authoritative);
      }
      if (evaluatingApplicant?.id === authoritative.id) {
        setEvaluatingApplicant(authoritative);
      }
      if (quickDecisionApplicant?.id === authoritative.id) {
        setQuickDecisionApplicant(authoritative);
      }
      showFeedbackToast(
        res.message || `تم حفظ مستويات الرواتب داخل استمارة (${authoritative.fullName}) في قاعدة البيانات`,
        'success'
      );
    } catch (err: any) {
      console.error('[Save App Salary Levels Failed]', err);
      showFeedbackToast(err?.message || 'تعذر حفظ مستويات الرواتب داخل الاستمارة', 'error');
      throw err;
    }
  };

  const handleAddNewApplicant = async (newApp: JobApplication) => {
    if (!canAddApplicant) {
      showFeedbackToast('غير مصرح: صلاحيتك لا تسمح بإضافة طلبات توظيف جديدة (403 Forbidden)', 'error');
      return;
    }

    try {
      const saved = await createApplicant(newApp, activeRole);
      setApplicants((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
      const latestNotifs = await fetchNotifications(activeRole).catch(() => null);
      if (latestNotifs) {
        setNotifications(latestNotifs);
        if (activeRole === 'hr' && latestNotifs[0]) {
          setActiveToast(latestNotifs[0]);
        }
      }
      showFeedbackToast(`تمت إضافة المتقدم (${saved.fullName}) وحفظه بنجاح في قاعدة البيانات`, 'success');
    } catch (err: any) {
      console.error('Could not save new applicant:', err);
      showFeedbackToast(err?.message || 'تعذر حفظ طلب التوظيف في قاعدة البيانات', 'error');
      throw err;
    }
  };

  const handleImportApplicants = async (imported: JobApplication[], mode: 'append' | 'upsert' | 'replace') => {
    if (!canSyncGoogleSheets) {
      const msg = 'غير مصرح: سحب واستيراد البيانات من Google Sheets مخصص لصلاحية الموارد البشرية (HR Permissions) فقط';
      showFeedbackToast(msg, 'error');
      throw new Error(msg);
    }
    try {
      const res = await importApplicants(imported, mode, activeRole);
      await refreshFromDatabase(false);
      showFeedbackToast(
        res?.message || `تمت مزامنة ${res.insertedCount} سجل جديد وتحديث ${res.updatedCount || 0} سجل في قاعدة البيانات`,
        'success'
      );
      if (res.insertedCount > 0 || (res.updatedCount || 0) > 0) {
        const latestNotifs = await fetchNotifications(activeRole).catch(() => null);
        if (latestNotifs && activeRole === 'hr' && latestNotifs[0]) {
          setActiveToast(latestNotifs[0]);
        }
      }
    } catch (err: any) {
      console.error('Error importing applicants:', err);
      showFeedbackToast(err?.message || 'تعذر استيراد الطلبات إلى قاعدة البيانات', 'error');
      throw err;
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const prevNotifs = notifications;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await markNotificationAsReadApi(id, activeRole);
    } catch (err: any) {
      setNotifications(prevNotifs);
      showFeedbackToast(err?.message || 'تعذر تحديث حالة الإشعار', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    const prevNotifs = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsAsReadApi(activeRole);
    } catch (err: any) {
      setNotifications(prevNotifs);
      showFeedbackToast(err?.message || 'تعذر تحديث الإشعارات', 'error');
    }
  };

  const handleSelectApplicantFromNotification = (applicantId: string) => {
    const target = applicants.find((a) => a.id === applicantId);
    if (target) {
      setQuickDecisionApplicant(target);
    }
  };

  const handleDeleteApplicant = (id: string, name: string) => {
    if (!canDeleteApplicant) {
      showFeedbackToast('غير مصرح: حذف استمارات المتقدمين مقتصر على المخولين فقط (403 Forbidden)', 'error');
      return;
    }
    setAppToDelete({ id, name });
  };

  const handleConfirmDeleteApp = async () => {
    if (!appToDelete) return;
    setIsDeletingApp(true);
    try {
      await deleteApplicant(appToDelete.id, activeRole);
      setApplicants((prev) => prev.filter((a) => a.id !== appToDelete.id));
      if (viewingApplicant?.id === appToDelete.id) setViewingApplicant(null);
      if (evaluatingApplicant?.id === appToDelete.id) setEvaluatingApplicant(null);
      if (quickDecisionApplicant?.id === appToDelete.id) setQuickDecisionApplicant(null);
      fetchNotifications(activeRole).then(setNotifications).catch(() => {});

      showFeedbackToast(`تم حذف استمارة (${appToDelete.name}) نهائياً من قاعدة البيانات`, 'success');
    } catch (err: any) {
      console.error('Could not delete applicant:', err);
      showFeedbackToast(err?.message || 'تعذر الحذف من قاعدة البيانات', 'error');
    } finally {
      setIsDeletingApp(false);
      setAppToDelete(null);
    }
  };

  const handleUpdateApplicant = async (updatedApp: JobApplication) => {
    if (!canEditApplicant) {
      showFeedbackToast('غير مصرح: تعديل بيانات الاستمارات مخصص لصلاحية الموارد البشرية (HR Permissions) فقط', 'error');
      setEditingApplicant(null);
      return;
    }
    if (!isAdminSystem && updatedApp.status !== 'new' && updatedApp.status !== 'hr_pending') {
      showFeedbackToast('لا يمكن تعديل الاستمارة بعد إحالتها للمرحلة الإدارية التالية', 'error');
      setEditingApplicant(null);
      return;
    }

    const previousSnapshot = applicants;
    const prevViewing = viewingApplicant;
    const prevEvaluating = evaluatingApplicant;

    try {
      const authoritative = await updateApplicant(updatedApp.id, updatedApp, activeRole);
      setApplicants((prev) => prev.map((a) => (a.id === authoritative.id ? authoritative : a)));
      if (viewingApplicant?.id === authoritative.id) {
        setViewingApplicant(authoritative);
      }
      if (evaluatingApplicant?.id === authoritative.id) {
        setEvaluatingApplicant(authoritative);
      }
      showFeedbackToast(`تم تحديث استمارة (${authoritative.fullName}) بنجاح في قاعدة البيانات`, 'success');
    } catch (err: any) {
      console.error('Failed to update applicant:', err);
      setApplicants(previousSnapshot);
      if (prevViewing?.id === updatedApp.id) setViewingApplicant(prevViewing);
      if (prevEvaluating?.id === updatedApp.id) setEvaluatingApplicant(prevEvaluating);
      showFeedbackToast(err?.message || 'تعذر حفظ التعديلات في قاعدة البيانات', 'error');
    }
    setEditingApplicant(null);
  };

  const handleExportCSV = () => {
    if (!canExportCSV) {
      showFeedbackToast('غير مصرح: تصدير ملفات Excel مخصص لصلاحية الموارد البشرية (HR Permissions) فقط (403 Forbidden)', 'error');
      return;
    }
    setShowExportModal(true);
  };

  const triggerPrint = (app: JobApplication) => {
    setPrintingApplicant(app);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const copyPhoneNumber = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Arabic formatted date
  const todayArabic = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Strict Authentication Gate: LoginPage is the sole entry point to the system
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#111C44] to-indigo-950 flex flex-col items-center justify-center text-white space-y-4 p-6 relative overflow-hidden" dir="rtl">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-soft-lg flex flex-col items-center max-w-sm w-full text-center animate-modal-enter">
          <CompanyLogo size="lg" theme="dark" />
          <div className="mt-6 flex items-center gap-2.5 text-xs text-cyan-200 font-bold">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>جاري التحقق من الهوية والصلاحيات الأمنية...</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-4">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 opacity-90" />
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            بوابة التوظيف الموحدة • شركة آخر ساعة إسبشيال (منذ 1960)
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans flex flex-col text-slate-800 pb-24 md:pb-0">
      {/* Printable Area (shown only during print) */}
      {printingApplicant && (
        <div className="print-only">
          <Suspense fallback={null}>
            <PrintOfficialSheet applicant={printingApplicant} salaryStructure={salaryStructure} />
          </Suspense>
        </div>
      )}

      {/* Connectivity Banner */}
      <OfflineIndicator />

      {/* Real-time In-App Notification Toast */}
      <NotificationToast
        notification={activeToast}
        onClose={() => setActiveToast(null)}
        onAction={handleSelectApplicantFromNotification}
      />

      {/* Enterprise RTL App Shell */}
      <div className="no-print flex-1 flex flex-col lg:flex-row min-h-screen">
        {/* Desktop Persistent Vibrant SaaS Sidebar (>= lg) */}
        <aside className="hidden lg:flex lg:flex-col w-[264px] shrink-0 bg-gradient-to-b from-slate-900 via-[#111C44] to-[#172554] text-white border-l border-indigo-950/60 sticky top-0 h-screen z-40 shadow-xl">
          {/* Sidebar Brand Header */}
          <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
            <CompanyLogo size="md" theme="dark" />
          </div>

          {/* Verified User & Role Card */}
          <div className="p-3.5 border-b border-white/10">
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-3 space-y-2 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                  {(appUser?.fullName || appUser?.email || 'م').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-white truncate">
                    {appUser?.fullName || 'مستخدم النظام'}
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono truncate" dir="ltr">
                    {appUser?.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/10">
                <span className="text-[11px] font-bold text-cyan-200 truncate flex items-center gap-1">
                  <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">{getRoleDisplayTitle(activeRole)}</span>
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                  DB Verified
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar Navigation & Tools */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* Core Views */}
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-bold text-slate-400 tracking-wide mb-1.5">
                لوحة التحكم والطلبات
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentView('applications');
                  setViewScope('all');
                  setStatusFilter('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'applications' && viewScope === 'all' && statusFilter !== 'dept'
                    ? 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Briefcase
                    className={`w-4 h-4 shrink-0 ${
                      currentView === 'applications' && viewScope === 'all' && statusFilter !== 'dept'
                        ? 'text-white'
                        : 'text-blue-400'
                    }`}
                  />
                  <span>كافة طلبات التوظيف</span>
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full tabular-nums ${
                    currentView === 'applications' && viewScope === 'all' && statusFilter !== 'dept'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-slate-200'
                  }`}
                >
                  {applicants.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentView('applications');
                  setViewScope('pending_me');
                  setStatusFilter('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'applications' && viewScope === 'pending_me'
                    ? 'bg-gradient-to-l from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 font-black'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Zap
                    className={`w-4 h-4 shrink-0 ${
                      currentView === 'applications' && viewScope === 'pending_me'
                        ? 'text-white'
                        : 'text-orange-400'
                    }`}
                  />
                  <span>بانتظار قراري</span>
                </span>
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full tabular-nums ${
                    pendingForMeCount > 0
                      ? currentView === 'applications' && viewScope === 'pending_me'
                        ? 'bg-white text-orange-700'
                        : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {pendingForMeCount}
                </span>
              </button>
            </div>

            {/* Interviews & Departments */}
            <div className="space-y-1 pt-3 border-t border-white/10">
              <div className="px-2.5 text-[10px] font-bold text-slate-400 tracking-wide mb-1.5">
                المقابلات والأقسام
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentView('applications');
                  setViewScope('all');
                  setStatusFilter('dept');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'applications' && statusFilter === 'dept'
                    ? 'bg-gradient-to-l from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Clock
                    className={`w-4 h-4 shrink-0 ${
                      currentView === 'applications' && statusFilter === 'dept' ? 'text-white' : 'text-cyan-400'
                    }`}
                  />
                  <span>المقابلات الفنية</span>
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full tabular-nums ${
                    currentView === 'applications' && statusFilter === 'dept'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-slate-200'
                  }`}
                >
                  {deptInterviewsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('departments')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'departments'
                    ? 'bg-gradient-to-l from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-600/25 font-black'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Building2
                    className={`w-4 h-4 shrink-0 ${
                      currentView === 'departments' ? 'text-white' : 'text-teal-400'
                    }`}
                  />
                  <span>الأقسام والوظائف</span>
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full tabular-nums ${
                    currentView === 'departments'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {DEPARTMENTS.length}
                </span>
              </button>
            </div>

            {/* Reports & Salary Structures */}
            <div className="space-y-1 pt-3 border-t border-white/10">
              <div className="px-2.5 text-[10px] font-bold text-slate-400 tracking-wide mb-1.5">
                التقارير وهياكل الرواتب
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentView('applications');
                  setShowCharts((prev) => !prev);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  showCharts && currentView === 'applications'
                    ? 'bg-white/15 text-white border border-cyan-400/30'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>التقارير والتحليلات</span>
                </span>
                <span className={`text-[10px] font-mono font-bold ${showCharts ? 'text-cyan-300' : 'text-slate-400'}`}>
                  {showCharts ? 'مفعل' : 'عرض'}
                </span>
              </button>

              {canManageSalaryStructure && (
                <button
                  type="button"
                  onClick={() => setShowSalaryStructureModal(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>هيكل الرواتب المعتمد</span>
                </button>
              )}

              {canExportCSV && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تصدير تقارير Excel</span>
                </button>
              )}
            </div>

            {/* Admin & System Tools */}
            <div className="space-y-1 pt-3 border-t border-white/10">
              <div className="px-2.5 text-[10px] font-bold text-slate-400 tracking-wide mb-1.5">
                الإدارة والأدوات
              </div>

              {canManageUsers && (
                <button
                  type="button"
                  onClick={() => setCurrentView('users')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentView === 'users'
                      ? 'bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25 font-black'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck
                      className={`w-4 h-4 shrink-0 ${
                        currentView === 'users' ? 'text-white' : 'text-violet-400'
                      }`}
                    />
                    <span>المستخدمون والصلاحيات</span>
                  </span>
                  <span
                    className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                      currentView === 'users'
                        ? 'bg-white text-indigo-700'
                        : 'bg-violet-500/20 text-violet-300'
                    }`}
                  >
                    Admin
                  </span>
                </button>
              )}

              {canAddApplicant && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>إضافة متقدم جديد</span>
                </button>
              )}

              {canSyncGoogleSheets && (
                <button
                  type="button"
                  onClick={() => setShowSyncModal(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>سحب من Google Sheet</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setGeminiTargetApplicant(null);
                  setShowGeminiModal(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>المساعد الذكي</span>
                </span>
                <span className="text-[9px] bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-black px-1.5 py-0.5 rounded font-mono">
                  AI
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowPWAInstallModal(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                <span>تثبيت التطبيق (PWA)</span>
              </button>
            </div>
          </nav>

          {/* Sidebar Bottom Sign Out */}
          <div className="p-3 border-t border-white/10">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-600/80 border border-rose-500/20 hover:border-rose-500 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile App Bar (< md) */}
          <MobileAppBar
            activeRole={activeRole}
            canSwitchRole={false}
            onOpenRoleSwitcher={() => {}}
            onOpenNotifications={() => setShowMobileNotifsSheet(true)}
            onOpenGeminiModal={() => {
              setGeminiTargetApplicant(null);
              setShowGeminiModal(true);
            }}
            unreadNotificationsCount={unreadCount}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalApplicantsCount={applicants.length}
          />

          {/* Sticky Crisp White Top Bar (>= md) */}
          <header className="hidden md:flex sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 lg:px-6 items-center justify-between gap-4 shadow-2xs">
            {/* Right side (RTL): Company Logo + Active Section Title + Tablet Navigation */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <CompanyLogo size="sm" variant="compact" />
              </div>
              <div className="h-5 w-px bg-slate-200 shrink-0" />
              <div className="min-w-0 hidden sm:block">
                <div className="text-sm font-black text-slate-900 truncate">
                  {currentView === 'users' && canManageUsers
                    ? 'إدارة المستخدمين والصلاحيات'
                    : currentView === 'departments'
                    ? 'دليل الإدارات والوظائف'
                    : 'لوحة طلبات التوظيف والاعتماد'}
                </div>
                <div className="text-[11px] text-slate-500 font-medium hidden xl:block truncate">
                  {todayArabic}
                </div>
              </div>

              {/* Tablet Navigation Switcher (md..lg where Sidebar is hidden) */}
              <div className="flex lg:hidden items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentView('applications')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                    currentView === 'applications'
                      ? 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  الطلبات
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('departments')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                    currentView === 'departments'
                      ? 'bg-gradient-to-l from-teal-600 to-cyan-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-teal-700'
                  }`}
                >
                  الأقسام
                </button>
                {canManageUsers && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('users')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                      currentView === 'users'
                        ? 'bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-indigo-700'
                    }`}
                  >
                    المستخدمون
                  </button>
                )}
              </div>
            </div>

            {/* Left side (RTL): Quick Actions + Notifications + User Account + Explicit Sign Out */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Refresh Data Button */}
              <button
                type="button"
                onClick={() => refreshFromDatabase(true)}
                title="تحديث البيانات من قاعدة البيانات"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              {/* Tablet quick shortcuts (hidden on lg+ because Sidebar holds them) */}
              <div className="flex lg:hidden items-center gap-1.5">
                {canSyncGoogleSheets && (
                  <button
                    type="button"
                    onClick={() => setShowSyncModal(true)}
                    title="سحب من Google Sheet"
                    className="p-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-cyan-100"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                {canManageSalaryStructure && (
                  <button
                    type="button"
                    onClick={() => setShowSalaryStructureModal(true)}
                    title="هيكل الرواتب"
                    className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-100"
                  >
                    <Banknote className="w-4 h-4" />
                  </button>
                )}
                {canExportCSV && (
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    title="تصدير Excel"
                    className="p-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>

              {canAddApplicant && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">طلب جديد</span>
                </button>
              )}

              <NotificationCenter
                notifications={notifications}
                activeRole={activeRole}
                onSelectApplicant={handleSelectApplicantFromNotification}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                align="left"
              />

              <div className="pr-2 border-r border-slate-200 flex items-center">
                <UserAuthHeader
                  activeRole={activeRole}
                  canManageUsers={canManageUsers}
                  onOpenUserManagement={() => setCurrentView('users')}
                />
              </div>
            </div>
          </header>

          {/* Main Content Dashboard */}
          {currentView === 'users' && canManageUsers ? (
            <main key="users-view" className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 flex-1 w-full animate-view-enter">
              <Suspense
                fallback={
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 shadow-soft">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>جاري تحميل وحدة إدارة المستخدمين...</span>
                  </div>
                }
              >
                <UserManagementView
                  onBackToApplications={() => setCurrentView('applications')}
                  activeRole={activeRole}
                  isSuperAdmin={isSuperAdmin || activeRole === 'admin'}
                />
              </Suspense>
            </main>
          ) : currentView === 'departments' ? (
            <main key="departments-view" className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 flex-1 w-full animate-view-enter">
              <Suspense
                fallback={
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 shadow-soft">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    <span>جاري تحميل دليل الإدارات والوظائف...</span>
                  </div>
                }
              >
                <DepartmentsOverviewView
                  applicants={applicants}
                  onBackToApplications={() => setCurrentView('applications')}
                  onFilterByDepartment={(deptName) => {
                    setFilterDepartment(deptName);
                    setViewScope('all');
                    setStatusFilter('all');
                    setCurrentView('applications');
                  }}
                  onFilterByPosition={(pos) => {
                    setFilterPosition(pos);
                    setViewScope('all');
                    setStatusFilter('all');
                    setCurrentView('applications');
                  }}
                />
              </Suspense>
            </main>
          ) : (
            <main key="applications-view" className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 py-3.5 sm:py-6 space-y-3.5 sm:space-y-5 flex-1 w-full animate-view-enter">
              {/* Executive Management Gradient Banner */}
              <div className="relative overflow-hidden bg-gradient-to-l from-blue-700 via-indigo-700 to-violet-700 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg shadow-blue-700/15 border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-5">
                {/* Ambient Cyan & Violet Glow */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 right-1/4 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-1 sm:space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap text-[11px] sm:text-xs font-bold text-cyan-200">
                    <span>لوحة الإدارة والاعتماد التنفيذية</span>
                    <span aria-hidden="true" className="text-white/40 hidden sm:inline">·</span>
                    <span className="text-blue-100 font-medium hidden sm:inline">
                      {todayArabic}
                    </span>
                  </div>
                  <h1 className="text-base sm:text-2xl font-black text-white tracking-tight leading-snug text-balance">
                    إدارة واعتماد طلبات التوظيف وقرارات الرواتب
                  </h1>
                  <p className="text-[11px] sm:text-xs text-blue-100 leading-relaxed max-w-2xl font-medium">
                    الصلاحية المعتمدة:{' '}
                    <span className="text-white font-black">{getRoleDisplayTitle(activeRole)}</span>
                  </p>
                </div>

                {/* Scope Switcher: All vs Pending My Action */}
                <div className="relative z-10 w-full md:w-auto grid grid-cols-2 md:flex flex-row items-center gap-1.5 sm:gap-2 flex-shrink-0 bg-slate-950/25 p-1.5 rounded-2xl border border-white/15 backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={() => setViewScope('pending_me')}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 min-h-[42px] rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                      viewScope === 'pending_me'
                        ? 'bg-gradient-to-l from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${viewScope === 'pending_me' ? 'text-white' : 'text-amber-300'}`} />
                    <span>بانتظار قراري</span>
                    {pendingForMeCount > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] sm:text-[11px] font-black font-mono bg-rose-600 text-white shadow-sm border border-white/25 tabular-nums">
                        {pendingForMeCount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-mono font-bold bg-white/15 text-white tabular-nums">
                        0
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewScope('all')}
                    className={`px-3 sm:px-4 py-2.5 min-h-[42px] rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap text-center tabular-nums ${
                      viewScope === 'all'
                        ? 'bg-white text-blue-700 shadow-md'
                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    كافة الطلبات ({applicants.length})
                  </button>
                </div>
              </div>

              {/* Stats Overview Bar */}
              <StatsOverview
                applicants={applicants}
                selectedStatus={statusFilter}
                onSelectStatus={(status) => {
                  setStatusFilter(status);
                  if (status !== 'all') setViewScope('all');
                }}
              />

              {/* Collapsible Executive Analytics Strip */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCharts((prev) => !prev)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      showCharts
                        ? 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50/70 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50 shadow-2xs'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span>{showCharts ? 'إخفاء الرسوم البيانية والتحليلات' : 'عرض الرسوم البيانية والتحليلات'}</span>
                  </button>
                </div>

                {showCharts && (
                  <Suspense
                    fallback={
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>جاري تحميل المخطط التحليلي...</span>
                      </div>
                    }
                  >
                    <ApplicationsChartDashboard
                      applicants={applicants}
                      onFilterStatus={(statusCategory) => {
                        setStatusFilter(statusCategory);
                        setViewScope('all');
                      }}
                    />
                  </Suspense>
                )}
              </div>

              {/* Advanced Search, Filter (Job / Dept / Status / Date) & View Controls */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-soft space-y-3 text-xs">
                <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
                  {/* Search Input */}
                  <div className="relative w-full lg:flex-1 lg:min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم، الرقم القومي، الهاتف، رقم القيد، الوظيفة..."
                      className="w-full pr-10 pl-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 bg-slate-50/80 text-xs text-slate-900 placeholder:text-slate-400 transition-all font-medium"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                        aria-label="مسح البحث"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filters Grid: Job, Department, Status, Date */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Filter className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 hidden xl:block" />
                      <select
                        value={filterPosition}
                        onChange={(e) => setFilterPosition(e.target.value)}
                        aria-label="تصفية حسب الوظيفة"
                        className="w-full lg:w-auto min-w-0 truncate py-2.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 text-xs cursor-pointer"
                      >
                        <option value="all">كافة الوظائف ({applicants.length})</option>
                        {uniquePositions.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 hidden xl:block" />
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        aria-label="تصفية حسب القسم"
                        className="w-full lg:w-auto min-w-0 truncate py-2.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 text-xs cursor-pointer"
                      >
                        <option value="all">كافة الإدارات</option>
                        {DEPARTMENTS.map((dept) => {
                          const deptCount = applicants.filter((a) => a.assignedDepartment === dept.name).length;
                          return (
                            <option key={dept.id} value={dept.name}>
                              إدارة {dept.name} ({deptCount})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          if (e.target.value !== 'all') setViewScope('all');
                        }}
                        aria-label="تصفية حسب الحالة"
                        className="w-full lg:w-auto min-w-0 truncate py-2.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 text-xs cursor-pointer"
                      >
                        <option value="all">كافة الحالات</option>
                        <option value="in_review">قيد المراجعة والاعتماد</option>
                        <option value="hr">1. الموارد البشرية</option>
                        <option value="hr_manager">2. مدير الموارد البشرية</option>
                        <option value="dept">3. المقابلات الفنية (الإدارات)</option>
                        <option value="gm">4. اعتماد المدير العام</option>
                        <option value="approved">مقبول نهائياً</option>
                        <option value="waitlist">قائمة الانتظار</option>
                        <option value="rejected">مرفوض</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-violet-600 flex-shrink-0 hidden xl:block" />
                      <select
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value as any)}
                        aria-label="تصفية حسب التاريخ"
                        className="w-full lg:w-auto min-w-0 truncate py-2.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 text-xs cursor-pointer"
                      >
                        <option value="all">كل التواريخ</option>
                        <option value="today">اليوم</option>
                        <option value="week">آخر 7 أيام</option>
                        <option value="month">هذا الشهر</option>
                        <option value="custom">تاريخ محدد</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Second Compact Row: Custom Date Input (when active) + View Mode Switcher + Count & Reset */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* View Mode Switcher (Cards Grid vs Table View) */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/90">
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          viewMode === 'cards'
                            ? 'bg-gradient-to-l from-blue-600 to-indigo-600 shadow-xs text-white'
                            : 'text-slate-600 hover:text-blue-700'
                        }`}
                        title="عرض بطاقات تفاعلية"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>بطاقات</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          viewMode === 'table'
                            ? 'bg-gradient-to-l from-blue-600 to-indigo-600 shadow-xs text-white'
                            : 'text-slate-600 hover:text-blue-700'
                        }`}
                        title="عرض جدول تنفيذي"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>جدول</span>
                      </button>
                    </div>

                    {filterDate === 'custom' && (
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="py-1.5 px-3 rounded-xl border border-blue-200 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* Filter Count & Reset */}
                  <div className="flex items-center gap-3 text-slate-600 text-xs font-semibold mr-auto">
                    <span className="tabular-nums">
                      النتائج: <strong className="font-mono text-blue-700">{filteredApplicants.length}</strong> طلب
                    </span>
                    {(statusFilter !== 'all' ||
                      filterPosition !== 'all' ||
                      filterDepartment !== 'all' ||
                      filterDate !== 'all' ||
                      searchQuery ||
                      viewScope !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('all');
                          setFilterPosition('all');
                          setFilterDepartment('all');
                          setFilterDate('all');
                          setCustomDate('');
                          setSearchQuery('');
                          setViewScope('all');
                        }}
                        className="text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg font-bold cursor-pointer whitespace-nowrap transition-colors"
                      >
                        إعادة ضبط الفلاتر
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Applications View */}
              {isLoadingData && applicants.length === 0 ? (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 animate-view-enter"
                  aria-label="جاري تحميل طلبات التوظيف"
                >
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-soft p-5 space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl skeleton-shimmer shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-2/3 rounded-lg skeleton-shimmer" />
                          <div className="h-3 w-1/2 rounded-lg skeleton-shimmer" />
                        </div>
                      </div>
                      <div className="h-14 rounded-xl skeleton-shimmer" />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <div className="h-12 rounded-xl skeleton-shimmer" />
                        <div className="h-12 rounded-xl skeleton-shimmer" />
                        <div className="h-12 rounded-xl skeleton-shimmer" />
                        <div className="h-12 rounded-xl skeleton-shimmer" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="h-10 rounded-xl skeleton-shimmer" />
                        <div className="h-10 rounded-xl skeleton-shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredApplicants.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-soft animate-view-enter">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto">
                    <FileCheck2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800">
                      {viewScope === 'pending_me'
                        ? 'لا توجد طلبات معلقة بانتظار قرارك في هذا القسم حالياً'
                        : 'لا توجد طلبات تطابق معايير البحث والفلترة'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {viewScope === 'pending_me'
                        ? 'كافة طلبات هذه المرحلة تم اتخاذ إجراء عليها بنجاح، أو يمكنك التبديل إلى "كافة الطلبات".'
                        : 'جرب تغيير كلمات البحث أو إعادة ضبط خيارات الوظيفة والحالة.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    {applicants.length === 0 ? (
                      <>
                        {canAddApplicant && (
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2.5 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-xs font-bold text-white cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4 text-white" />
                            <span>إضافة متقدم جديد</span>
                          </button>
                        )}
                        <button
                          onClick={() => refreshFromDatabase(true)}
                          className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-bold text-blue-700 border border-blue-200 cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                          <span>تحديث من قاعدة البيانات</span>
                        </button>
                        {canSyncGoogleSheets && (
                          <button
                            onClick={() => setShowSyncModal(true)}
                            className="px-4 py-2.5 bg-cyan-50 hover:bg-cyan-100 rounded-xl text-xs font-bold text-cyan-800 border border-cyan-200 cursor-pointer transition-colors"
                          >
                            سحب ردود من Google Sheets
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setViewScope('all');
                            setStatusFilter('all');
                            setFilterPosition('all');
                            setSearchQuery('');
                          }}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer transition-colors"
                        >
                          عرض كافة الطلبات
                        </button>
                        {canAddApplicant && (
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2.5 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-xs font-bold text-white cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4 text-white" />
                            <span>إضافة متقدم</span>
                          </button>
                        )}
                        {canSyncGoogleSheets && (
                          <button
                            onClick={() => setShowSyncModal(true)}
                            className="px-4 py-2.5 bg-cyan-50 hover:bg-cyan-100 rounded-xl text-xs font-bold text-cyan-800 border border-cyan-200 cursor-pointer transition-colors"
                          >
                            سحب ردود من Google Sheets
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : viewMode === 'cards' ? (
                /* ============================================================== */
                /* 1. INTERACTIVE RICH CARDS GRID VIEW                            */
                /* ============================================================== */
                <div key="cards-view" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-view-enter">
                  {filteredApplicants.map((app) => {
                    const national = parseEgyptianNationalId(app.nationalId);
                    const cleanPhone = (app.phone || '').replace(/[^0-9]/g, '');
                    const waNum = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
                    const isPendingForMe =
                      (activeRole === 'admin' &&
                        !isApprovedStatus(app.status) &&
                        !['rejected', 'waitlist'].includes(app.status)) ||
                      (activeRole === 'general_manager' && app.status === 'gm_pending') ||
                      (activeRole === 'direct_manager' && isDeptPending(app.status)) ||
                      (isDepartmentManagerRole(activeRole) &&
                        isDeptPending(app.status) &&
                        doesDepartmentMatch(getDepartmentForRole(activeRole), app.assignedDepartment)) ||
                      (activeRole === 'hr_manager' && app.status === 'hr_manager_pending') ||
                      (activeRole === 'hr' && (app.status === 'new' || app.status === 'hr_pending'));

                    const topAccentGradient = app.status.startsWith('approved')
                      ? 'from-emerald-500 to-teal-500'
                      : app.status === 'rejected'
                      ? 'from-rose-500 to-red-600'
                      : app.status === 'waitlist'
                      ? 'from-purple-500 to-fuchsia-600'
                      : app.status === 'gm_pending'
                      ? 'from-violet-600 to-indigo-600'
                      : isDeptPending(app.status)
                      ? 'from-blue-600 to-indigo-600'
                      : app.status === 'hr_manager_pending'
                      ? 'from-teal-500 to-cyan-600'
                      : 'from-cyan-500 to-blue-500';

                    return (
                      <div
                        key={app.id}
                        className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-soft hover:shadow-soft-md hover:-translate-y-0.5 ${
                          isPendingForMe
                            ? 'border-orange-400 ring-2 ring-orange-400/25'
                            : 'border-slate-200/90 hover:border-blue-300'
                        }`}
                      >
                    {/* Distinct Colored Top Accent Strip */}
                    <div className={`h-1.5 w-full bg-gradient-to-l ${topAccentGradient}`} />

                    {/* Card Top Content */}
                    <div className="p-4 sm:p-5 space-y-3.5 flex-1">
                      {/* Header row: Avatar + Name + Record */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <ApplicantAvatar
                            applicant={app}
                            size="md"
                            onPreview={(applicant, url) =>
                              setPreviewApplicant({ applicant, photoUrl: url })
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-black text-slate-900 text-sm leading-snug truncate">
                              {app.fullName}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1 flex-wrap">
                              <span className="font-mono font-bold text-slate-700 tabular-nums">
                                {app.recordNumber}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span className="font-bold text-blue-700 truncate max-w-[165px]">
                                {app.positionApplied}
                              </span>
                              {app.assignedDepartment && (
                                <>
                                  <span aria-hidden="true" className="text-slate-300">·</span>
                                  <span className="font-semibold text-teal-700">
                                    إدارة {app.assignedDepartment}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                              app.status.startsWith('approved')
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-2xs'
                                : app.status === 'rejected'
                                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-2xs'
                                : app.status === 'waitlist'
                                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-2xs'
                                : app.status === 'gm_pending'
                                ? 'bg-violet-50 text-violet-800 border border-violet-200 font-black'
                                : isDeptPending(app.status)
                                ? 'bg-blue-50 text-blue-800 border border-blue-200 font-bold'
                                : app.status === 'hr_manager_pending'
                                ? 'bg-teal-50 text-teal-800 border border-teal-200 font-bold'
                                : 'bg-orange-50 text-orange-800 border border-orange-200 font-bold'
                            }`}
                          >
                            {getStatusLabel(app.status, app.assignedDepartment)}
                          </span>
                        </div>
                      </div>

                      {/* Candidate Meta Info */}
                      <div className="bg-slate-50/70 rounded-xl px-3 py-2.5 border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600 flex-wrap gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">الهاتف:</span>
                            <span className="font-mono font-bold text-slate-900 tabular-nums">{app.phone || '—'}</span>
                            {app.phone && (
                              <button
                                type="button"
                                onClick={() => copyPhoneNumber(app.phone, app.id)}
                                className="text-slate-400 hover:text-emerald-700 p-0.5 cursor-pointer"
                                title="نسخ رقم الهاتف"
                              >
                                {copiedId === app.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          {national.isValid && (
                            <span className="text-[11px] text-slate-500 font-medium tabular-nums">
                              {national.age} سنة · {national.governorate}
                            </span>
                          )}
                        </div>

                        {app.prevCompany && (
                          <div className="text-[11px] text-slate-500 truncate">
                            <span>سابقاً: </span>
                            <strong className="text-slate-800">{app.prevCompany}</strong>
                            {app.experienceYears && <span> ({app.experienceYears})</span>}
                          </div>
                        )}
                      </div>

                      {/* 4-Tier Approval Pipeline Progress Track */}
                      <div className="space-y-1.5 pt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 block">
                          مسار اعتماد وتدقيق الإدارة (4 مراحل):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[10px]">
                          {/* Stage 1: HR Specialist */}
                          {(() => {
                            const sig = app.signatures?.hr || app.hrReview?.electronicSignature;
                            const signerName = sig?.fullName || (app.hrReview?.reviewedAt ? app.hrReview?.signature : '');
                            return (
                              <div
                                className={`p-1.5 rounded-xl border transition-colors ${
                                  app.hrReview?.result === 'مرفوض'
                                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                                    : app.hrReview?.result
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}
                                title={sig ? `${sig.fullName} — ${sig.jobTitle} (${sig.signedAtArabic})` : undefined}
                              >
                                <span className="block text-[9px] text-slate-400 font-medium">1. الموارد البشرية</span>
                                <span className="font-bold truncate block">
                                  {app.hrReview?.result || 'بانتظار الفحص'}
                                </span>
                                {signerName && (
                                  <span className="block text-[8.5px] opacity-80 truncate mt-0.5 font-medium">
                                    ✓ {signerName}
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {/* Stage 2: HR Manager */}
                          {(() => {
                            const sig = app.signatures?.hr_manager || app.hrManagerReview?.electronicSignature;
                            const signerName = sig?.fullName || (app.hrManagerReview?.reviewedAt ? app.hrManagerReview?.signature : '');
                            return (
                              <div
                                className={`p-1.5 rounded-xl border transition-colors ${
                                  app.hrManagerReview?.result === 'مرفوض'
                                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                                    : app.hrManagerReview?.result
                                    ? 'bg-teal-50 border-teal-200 text-teal-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}
                                title={sig ? `${sig.fullName} — ${sig.jobTitle} (${sig.signedAtArabic})` : undefined}
                              >
                                <span className="block text-[9px] text-slate-400 font-medium">2. مدير الموارد البشرية</span>
                                <span className="font-bold truncate block">
                                  {app.hrManagerReview?.result || 'بانتظار الاعتماد'}
                                </span>
                                {app.hrManagerSalaryProposal?.formattedAmount && (
                                  <span className="block text-[8.5px] font-mono font-bold text-teal-700 truncate mt-0.5 tabular-nums">
                                    مقترح: {app.hrManagerSalaryProposal.formattedAmount}
                                  </span>
                                )}
                                {signerName && (
                                  <span className="block text-[8.5px] opacity-80 truncate mt-0.5 font-medium">
                                    ✓ {signerName}
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {/* Stage 3: Department Manager */}
                          {(() => {
                            const sig = app.signatures?.direct_manager || app.directManagerReview?.electronicSignature;
                            const signerName = sig?.fullName || (app.directManagerReview?.reviewedAt ? app.directManagerReview?.signature : '');
                            return (
                              <div
                                className={`p-1.5 rounded-xl border transition-colors ${
                                  app.directManagerReview?.result === 'مرفوض'
                                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                                    : app.directManagerReview?.result
                                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}
                                title={sig ? `${sig.fullName} — ${sig.jobTitle} (${sig.signedAtArabic})` : undefined}
                              >
                                <span
                                  className="block text-[9px] text-slate-400 font-medium truncate"
                                  title={app.assignedDepartmentManager || '3. مدير الإدارة'}
                                >
                                  3. {app.assignedDepartmentManager || 'مدير الإدارة'}
                                </span>
                                <span className="font-bold truncate block">
                                  {app.directManagerReview?.result || 'بانتظار الفني'}
                                </span>
                                {app.directManagerSalaryProposal?.formattedAmount && (
                                  <span className="block text-[8.5px] font-mono font-bold text-blue-700 truncate mt-0.5 tabular-nums">
                                    مقترح: {app.directManagerSalaryProposal.formattedAmount}
                                  </span>
                                )}
                                {signerName && (
                                  <span className="block text-[8.5px] opacity-80 truncate mt-0.5 font-medium">
                                    ✓ {signerName}
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {/* Stage 4: General Manager */}
                          {(() => {
                            const sig = app.signatures?.general_manager || app.generalManagerReview?.electronicSignature;
                            const signerName = sig?.fullName || (app.generalManagerReview?.reviewedAt ? app.generalManagerReview?.signature : '');
                            const gmResult = app.generalManagerReview?.result;
                            const isGmRejected = gmResult === 'مرفوض';
                            const isGmApproved =
                              !isGmRejected &&
                              (isApprovedStatus(app.status) ||
                                Boolean(app.generalManagerReview?.finalApprovedSalary) ||
                                (Boolean(gmResult) && gmResult !== 'انتظار'));
                            const finalSourceLabel = finalSalarySourceToLabel(
                              app.generalManagerReview?.finalSalarySource
                            );
                            return (
                              <div
                                className={`p-1.5 rounded-xl border transition-colors ${
                                  isGmRejected
                                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                                    : isGmApproved
                                    ? 'bg-violet-50 border-violet-200 text-violet-950'
                                    : gmResult === 'انتظار'
                                    ? 'bg-purple-50 border-purple-200 text-purple-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}
                                title={
                                  [
                                    sig ? `${sig.fullName} — ${sig.jobTitle} (${sig.signedAtArabic})` : '',
                                    finalSourceLabel ? `مصدر الراتب: ${finalSourceLabel}` : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' | ') || undefined
                                }
                              >
                                <span className="block text-[9px] text-slate-400 font-medium">4. المدير العام</span>
                                <span
                                  className={`font-black truncate block tabular-nums ${
                                    isGmRejected
                                      ? 'text-rose-800'
                                      : isGmApproved
                                      ? 'text-violet-900'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {app.generalManagerReview?.finalApprovedSalary ||
                                    gmResult ||
                                    (isGmApproved ? 'راتب مقترح معتمد' : 'معلق')}
                                </span>
                                {isGmApproved && finalSourceLabel && (
                                  <span className="block text-[8px] font-bold text-indigo-700 truncate mt-0.5">
                                    {finalSourceLabel}
                                  </span>
                                )}
                                {signerName && (
                                  <span className="block text-[8.5px] opacity-80 truncate mt-0.5 font-medium">
                                    ✓ {signerName}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Last Action Date */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          {app.lastActionDate ? (
                            <span className="font-mono text-[10px] tabular-nums">
                              {app.lastActionType ? `${app.lastActionType}: ` : ''}
                              {app.lastActionDate}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">بانتظار أول إجراء</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {app.timestamp?.slice(0, 10)}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="bg-slate-50/90 p-3 sm:p-4 border-t border-slate-200/90 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickDecisionApplicant(app)}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer hover:shadow-sm"
                        >
                          <Zap className="w-3.5 h-3.5 text-white" />
                          <span>قرار واعتماد</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingApplicant(app)}
                          className="flex items-center justify-center gap-1 py-2.5 px-3 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-bold text-xs rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>عرض الاستمارة</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 text-xs text-slate-500">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => triggerPrint(app)}
                            className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-blue-700 font-medium cursor-pointer py-1"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            <span>طباعة</span>
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setGeminiTargetApplicant(app);
                              setShowGeminiModal(true);
                            }}
                            className="flex items-center gap-1 text-[11px] text-violet-700 font-bold hover:text-violet-900 cursor-pointer py-1"
                            title="تحليل واستشارة Gemini حول هذا المرشح"
                          >
                            <Bot className="w-3.5 h-3.5 text-violet-600" />
                            <span>استشر AI</span>
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setEvaluatingApplicant(app)}
                            className="text-[11px] text-teal-700 font-bold hover:underline cursor-pointer py-1"
                          >
                            النموذج الكامل
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {app.phone && (
                            <>
                              <a
                                href={`https://wa.me/${waNum}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-[34px] min-h-[34px] flex items-center justify-center p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                                title="محادثة واتساب سريعة"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={`tel:${app.phone}`}
                                className="min-w-[34px] min-h-[34px] flex items-center justify-center p-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors shadow-2xs"
                                title="اتصال هاتفي"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          {canEditApplicationRow(app) && (
                            <button
                              type="button"
                              onClick={() => setEditingApplicant(app)}
                              className="min-w-[34px] min-h-[34px] flex items-center justify-center p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-lg border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                              title={isAdminSystem ? 'تعديل واستكمال بيانات الاستمارة' : 'تعديل واستكمال بيانات استمارة التوظيف (قبل الإحالة)'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDeleteApplicant && (
                            <button
                              type="button"
                              onClick={() => handleDeleteApplicant(app.id, app.fullName)}
                              className="min-w-[34px] min-h-[34px] flex items-center justify-center p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                              title="حذف الطلب نهائياً من قاعدة البيانات"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ============================================================== */
            /* 2. HIGH-DENSITY EXECUTIVE TABLE VIEW                           */
            /* ============================================================== */
            <div key="table-view" className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden animate-view-enter">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-gradient-to-l from-blue-700 via-indigo-700 to-cyan-700 text-white font-bold whitespace-nowrap">
                      <th className="py-3.5 px-4">رقم القيد / التاريخ</th>
                      <th className="py-3.5 px-4">بيانات المتقدم</th>
                      <th className="py-3.5 px-4">الوظيفة والخبرة</th>
                      <th className="py-3.5 px-4 text-center">1. الموارد البشرية</th>
                      <th className="py-3.5 px-4 text-center">2. مدير الموارد البشرية</th>
                      <th className="py-3.5 px-4 text-center">3. مدير الإدارة المختص</th>
                      <th className="py-3.5 px-4 text-center">4. المدير العام</th>
                      <th className="py-3.5 px-4 text-center">الحالة وتاريخ الإجراء</th>
                      <th className="py-3.5 px-4 text-center">اتخاذ القرار والإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApplicants.map((app) => {
                      const national = parseEgyptianNationalId(app.nationalId);
                      const cleanPhone = (app.phone || '').replace(/[^0-9]/g, '');
                      const waNum = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;

                      return (
                        <tr
                          key={app.id}
                          className="hover:bg-blue-50/40 transition-colors duration-150 group"
                        >
                          {/* Record & Time */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 text-[11px] block tabular-nums">
                              {app.recordNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 block font-mono tabular-nums">
                              {app.timestamp}
                            </span>
                          </td>

                          {/* Applicant Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <ApplicantAvatar
                                applicant={app}
                                size="sm"
                                onPreview={(applicant, url) =>
                                  setPreviewApplicant({ applicant, photoUrl: url })
                                }
                              />
                              <div>
                                <div className="font-black text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                                  <span>{app.fullName}</span>
                                  {app.militaryStatus && (
                                    <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                      {app.militaryStatus}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  <span className="font-mono font-semibold">{app.phone}</span>
                                  {national.isValid && (
                                    <>
                                      <span>•</span>
                                      <span>{national.age} سنة ({national.governorate})</span>
                                    </>
                                  )}
                                  {app.expectedSalary && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-800 font-mono font-bold">متوقع: {app.expectedSalary}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Position Applied */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200">
                                {app.positionApplied}
                              </span>
                              {app.assignedDepartment && (
                                <span className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-flex items-center gap-1 font-bold">
                                  <Building2 className="w-2.5 h-2.5 text-teal-600" />
                                  <span>إدارة {app.assignedDepartment}</span>
                                </span>
                              )}
                            </div>
                            {app.prevCompany && (
                              <span className="text-[10px] text-slate-400 block mt-1">
                                سابقاً: {app.prevCompany}
                              </span>
                            )}
                          </td>

                          {/* Stage 1: HR */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {app.hrReview?.result ? (
                              <div className="space-y-0.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                    app.hrReview.result === 'مرفوض'
                                      ? 'bg-rose-100 text-rose-800'
                                      : app.hrReview.result === 'انتظار'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {app.hrReview.result}
                                </span>
                                {(app.signatures?.hr?.fullName || (app.hrReview.reviewedAt && app.hrReview.signature)) && (
                                  <span className="text-[10px] text-slate-500 block font-medium">
                                    ✓ {app.signatures?.hr?.fullName || app.hrReview.signature}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">بانتظار الموارد البشرية</span>
                            )}
                          </td>

                          {/* Stage 2: HR Manager */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {app.hrManagerReview?.result || app.hrManagerSalaryProposal ? (
                              <div className="space-y-0.5">
                                {app.hrManagerReview?.result ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                      app.hrManagerReview.result === 'مرفوض'
                                        ? 'bg-rose-100 text-rose-800'
                                        : app.hrManagerReview.result === 'انتظار'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-teal-100 text-teal-800'
                                    }`}
                                  >
                                    {app.hrManagerReview.result}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px] italic block">قيد المراجعة</span>
                                )}
                                {app.hrManagerSalaryProposal?.formattedAmount && (
                                  <div className="text-[10px] font-mono font-bold text-teal-700 tabular-nums">
                                    مقترح: {app.hrManagerSalaryProposal.formattedAmount}
                                  </div>
                                )}
                                {(app.signatures?.hr_manager?.fullName || (app.hrManagerReview?.reviewedAt && app.hrManagerReview?.signature)) && (
                                  <span className="text-[10px] text-slate-500 block font-medium">
                                    ✓ {app.signatures?.hr_manager?.fullName || app.hrManagerReview?.signature}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">بانتظار مدير الموارد البشرية</span>
                            )}
                          </td>

                          {/* Stage 3: Department Manager */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {app.directManagerReview?.result || app.directManagerSalaryProposal ? (
                              <div className="space-y-0.5">
                                {app.directManagerReview?.result ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                      app.directManagerReview.result === 'مرفوض'
                                        ? 'bg-rose-100 text-rose-800'
                                        : app.directManagerReview.result === 'انتظار'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {app.directManagerReview.result}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px] italic block">قيد المقابلة</span>
                                )}
                                {app.directManagerSalaryProposal?.formattedAmount && (
                                  <div className="text-[10px] font-mono font-bold text-blue-700 tabular-nums">
                                    مقترح: {app.directManagerSalaryProposal.formattedAmount}
                                  </div>
                                )}
                                <span className="text-[10px] text-slate-500 block font-medium">
                                  {app.signatures?.direct_manager?.fullName
                                    ? `✓ ${app.signatures.direct_manager.fullName}`
                                    : (app.assignedDepartmentManager || (app.assignedDepartment ? `إدارة ${app.assignedDepartment}` : 'مدير الإدارة'))}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-slate-400 text-[11px] italic block">بانتظار المقابلة الفنية</span>
                                {app.assignedDepartment && (
                                  <span className="text-[10px] text-blue-700 block font-bold">
                                    {app.assignedDepartmentManager || `إدارة ${app.assignedDepartment}`}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Stage 4: General Manager */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {app.generalManagerReview?.result ||
                            app.generalManagerReview?.finalApprovedSalary ||
                            isApprovedStatus(app.status) ? (
                              <div className="space-y-0.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                    app.generalManagerReview?.result === 'مرفوض'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-violet-100 text-violet-900 border border-violet-200'
                                  }`}
                                >
                                  {app.generalManagerReview?.result ||
                                    (isApprovedStatus(app.status) ? 'معتمد - راتب مقترح' : '')}
                                </span>
                                {app.generalManagerReview?.finalApprovedSalary && (
                                  <div className="text-[10px] font-mono font-black text-emerald-700 tabular-nums">
                                    {app.generalManagerReview.finalApprovedSalary}
                                  </div>
                                )}
                                {app.generalManagerReview?.finalSalarySource && (
                                  <div className="text-[9.5px] font-semibold text-indigo-700">
                                    {finalSalarySourceToLabel(app.generalManagerReview.finalSalarySource)}
                                  </div>
                                )}
                                {(app.signatures?.general_manager?.fullName || (app.generalManagerReview?.reviewedAt && app.generalManagerReview?.signature)) && (
                                  <span className="text-[10px] text-slate-500 block font-medium">
                                    ✓ {app.signatures?.general_manager?.fullName || app.generalManagerReview?.signature}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">بانتظار الاعتماد</span>
                            )}
                          </td>

                          {/* Overall Status Badge & Last Action Timestamp */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  app.status.startsWith('approved')
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : app.status === 'rejected'
                                    ? 'bg-rose-600 text-white'
                                    : app.status === 'waitlist'
                                    ? 'bg-purple-600 text-white'
                                    : app.status === 'gm_pending'
                                    ? 'bg-violet-100 text-violet-900 border border-violet-300'
                                    : isDeptPending(app.status)
                                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                    : app.status === 'hr_manager_pending'
                                    ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                    : 'bg-orange-50 text-orange-800 border border-orange-200'
                                }`}
                              >
                                {getStatusLabel(app.status, app.assignedDepartment)}
                              </span>
                              {app.lastActionDate ? (
                                <div
                                  className="flex items-center gap-1 text-[10px] text-slate-500 font-mono tabular-nums"
                                  title={`نوع الإجراء: ${app.lastActionType || 'اتخاذ قرار'}`}
                                >
                                  <Clock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                  <span>{app.lastActionDate}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">بانتظار أول إجراء</span>
                              )}
                            </div>
                          </td>

                          {/* Actions: Manager Decisions */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 1-Click Quick Decision */}
                              <button
                                type="button"
                                onClick={() => setQuickDecisionApplicant(app)}
                                title="اتخاذ قرار سريع (قبول / رفض / اعتماد راتب)"
                                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[11px] font-black transition-all shadow-xs cursor-pointer"
                              >
                                <Zap className="w-3 h-3 text-white" />
                                <span>قرار واعتماد</span>
                              </button>

                              {/* Open Full Evaluation Form */}
                              <button
                                type="button"
                                onClick={() => setEvaluatingApplicant(app)}
                                title="نموذج التقييم الإداري الرسمي (4 مراحل)"
                                className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl border border-teal-200 transition-colors cursor-pointer"
                              >
                                <FileCheck2 className="w-4 h-4" />
                              </button>

                              {/* AI Candidate Consultation */}
                              <button
                                type="button"
                                onClick={() => {
                                  setGeminiTargetApplicant(app);
                                  setShowGeminiModal(true);
                                }}
                                title="استشارة وتحليل Gemini للمرشح"
                                className="p-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl border border-violet-200 transition-colors cursor-pointer"
                              >
                                <Bot className="w-4 h-4" />
                              </button>

                              {/* View Full Applicant Details */}
                              <button
                                type="button"
                                onClick={() => setViewingApplicant(app)}
                                title="عرض استمارة المتقدم الكاملة"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* WhatsApp Direct Chat */}
                              {app.phone && (
                                <a
                                  href={`https://wa.me/${waNum}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="محادثة واتساب سريعة"
                                  className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl border border-green-200 transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              )}

                              {/* Print Official Sheet */}
                              <button
                                type="button"
                                onClick={() => triggerPrint(app)}
                                title="طباعة استمارة الاعتماد الإدارية الرسمية (A4)"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                              >
                                <Printer className="w-4 h-4 text-slate-600" />
                              </button>

                              {/* Edit Applicant */}
                              {canEditApplicationRow(app) && (
                                <button
                                  type="button"
                                  onClick={() => setEditingApplicant(app)}
                                  title={isAdminSystem ? 'تعديل واستكمال بيانات الاستمارة' : 'تعديل واستكمال بيانات استمارة التوظيف (قبل الإحالة)'}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete */}
                              {canDeleteApplicant && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApplicant(app.id, app.fullName)}
                                  title="حذف الطلب نهائياً"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      )}

        {/* Executive Minimal Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white/90 py-4 text-center text-xs text-slate-500">
          <div className="max-w-[1440px] mx-auto px-4 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-700">شركة آخر ساعة إسبشيال</span>
              <span>•</span>
              <span>نظام إدارة واعتماد شؤون التوظيف والرواتب</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>جميع الحقوق محفوظة © {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
        </div>
      </div>

      {/* MODALS */}
      <Suspense fallback={null}>
        {viewingApplicant && (
          <ApplicantDetailModal
            applicant={viewingApplicant}
            activeRole={activeRole}
            salaryStructure={salaryStructure}
            onClose={() => setViewingApplicant(null)}
            onOpenEvaluation={() => {
              setEvaluatingApplicant(viewingApplicant);
              setViewingApplicant(null);
            }}
            onPrint={() => triggerPrint(viewingApplicant)}
            onDelete={canDeleteApplicant ? handleDeleteApplicant : undefined}
            onEdit={
              canEditApplicationRow(viewingApplicant)
                ? (app) => {
                    setEditingApplicant(app);
                    setViewingApplicant(null);
                  }
                : undefined
            }
            onConsultAI={(app) => {
              setGeminiTargetApplicant(app);
              setShowGeminiModal(true);
            }}
            onQuickStatusChange={(status) => {
              const updated = {
                ...viewingApplicant,
                status,
                lastActionDate: new Date().toLocaleString('ar-EG'),
                lastActionType: getStatusLabel(status),
              };
              handleSaveEvaluation(updated);
            }}
          />
        )}

        {evaluatingApplicant && (
          <EvaluationSheetModal
            applicant={evaluatingApplicant}
            activeRole={activeRole}
            salaryStructure={salaryStructure}
            canManageSalaryStructure={canManageSalaryStructure}
            onOpenSalaryStructure={() => setShowSalaryStructureModal(true)}
            onSaveAppSalaryLevels={handleSaveAppSalaryLevels}
            onSaveDraft={handleSaveDraftReview}
            onClose={() => setEvaluatingApplicant(null)}
            onSave={handleSaveEvaluation}
            onPrint={() => triggerPrint(evaluatingApplicant)}
          />
        )}

        {quickDecisionApplicant && (
          <QuickDecisionModal
            applicant={quickDecisionApplicant}
            activeRole={activeRole}
            salaryStructure={salaryStructure}
            canManageSalaryStructure={canManageSalaryStructure}
            onOpenSalaryStructure={() => setShowSalaryStructureModal(true)}
            onSaveAppSalaryLevels={handleSaveAppSalaryLevels}
            onSaveDraft={handleSaveDraftReview}
            onClose={() => setQuickDecisionApplicant(null)}
            onConfirm={handleSaveEvaluation}
          />
        )}

        {showSyncModal && canSyncGoogleSheets && (
          <GoogleSheetSyncModal
            onClose={() => setShowSyncModal(false)}
            onImport={handleImportApplicants}
          />
        )}

        {showExportModal && canExportCSV && (
          <ExcelExportModal
            applicants={applicants}
            activeRole={activeRole}
            onClose={() => setShowExportModal(false)}
            onExportSuccess={(msg) => showFeedbackToast(msg, 'success')}
          />
        )}

        {showSalaryStructureModal && canManageSalaryStructure && (
          <SalaryStructureModal
            isOpen={showSalaryStructureModal}
            onClose={() => setShowSalaryStructureModal(false)}
            activeRole={activeRole}
            salaryStructure={salaryStructure}
            history={salaryStructureHistory}
            onSaved={(structure, history, msg) => {
              setSalaryStructure(structure);
              setSalaryStructureHistory(history);
              showFeedbackToast(msg, 'success');
            }}
          />
        )}

        {(showAddModal || editingApplicant) && (showAddModal ? canAddApplicant : canEditApplicationRow(editingApplicant)) && (
          <NewApplicantModal
            initialData={editingApplicant}
            canManageSalaryStructure={canManageSalaryStructure}
            onClose={() => {
              setShowAddModal(false);
              setEditingApplicant(null);
            }}
            onAdd={handleAddNewApplicant}
            onUpdate={handleUpdateApplicant}
          />
        )}

        {showGeminiModal && (
          <GeminiAssistantModal
            isOpen={showGeminiModal}
            onClose={() => {
              setShowGeminiModal(false);
              setGeminiTargetApplicant(null);
            }}
            applicants={applicants}
            userRole={activeRole}
            selectedApplicant={geminiTargetApplicant}
          />
        )}

        {showPWAInstallModal && (
          <PWAInstallModal onClose={() => setShowPWAInstallModal(false)} />
        )}

        {/* Full Photo Lightbox / Preview Modal */}
        <ImagePreviewModal
          isOpen={Boolean(previewApplicant)}
          applicant={previewApplicant?.applicant || null}
          photoUrl={previewApplicant?.photoUrl || null}
          onClose={() => setPreviewApplicant(null)}
        />
      </Suspense>

      {/* Delete Application In-App Confirmation Modal */}
      {appToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg border-t sm:border border-slate-200 w-full max-w-md overflow-hidden text-right p-5 sm:p-6 pb-safe sm:pb-6 space-y-4 animate-slide-up-mobile sm:animate-modal-enter">
            <div className="pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-slate-900">
                تأكيد حذف استمارة طلب التوظيف
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف استمارة المتقدم <strong>({appToDelete.name})</strong>؟
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 font-bold">
                ⚠️ سيتم حذف الاستمارة وكافة قرارات الاعتماد وسجلات التقييم نهائياً من قاعدة البيانات.
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAppToDelete(null)}
                disabled={isDeletingApp}
                className="px-4 py-2.5 min-h-[42px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteApp}
                disabled={isDeletingApp}
                className="px-5 py-2.5 min-h-[42px] bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingApp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، حذف الاستمارة نهائياً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <MobileFloatingFAB
        onOpenAddModal={() => setShowAddModal(true)}
        onOpenGeminiModal={() => {
          setGeminiTargetApplicant(null);
          setShowGeminiModal(true);
        }}
        onOpenSyncModal={() => setShowSyncModal(true)}
        canAddApplicant={canAddApplicant}
        canSyncSheets={canSyncGoogleSheets}
      />

      {/* Mobile Bottom Navigation Bar (Fixed for mobile) */}
      <MobileBottomNav
        currentTab={mobileTab}
        onSelectTab={handleSelectMobileTab}
        onOpenGeminiModal={() => {
          setGeminiTargetApplicant(null);
          setShowGeminiModal(true);
        }}
        pendingCount={pendingForMeCount}
        unreadNotificationsCount={unreadCount}
        totalApplicantsCount={applicants.length}
      />

      {/* Mobile Bottom Sheets & Drawers */}
      <MobileNotificationsSheet
        isOpen={showMobileNotifsSheet}
        onClose={() => setShowMobileNotifsSheet(false)}
        notifications={notifications}
        activeRole={activeRole}
        onSelectApplicant={(id) => {
          handleSelectApplicantFromNotification(id);
          setShowMobileNotifsSheet(false);
        }}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      <MobileStatsSheet
        isOpen={showMobileStatsSheet}
        onClose={() => setShowMobileStatsSheet(false)}
        applicants={applicants}
        activeRole={activeRole}
        onFilterByStatus={(status) => {
          setStatusFilter(status);
          setShowMobileStatsSheet(false);
        }}
      />

      <MobileMenuDrawer
        isOpen={showMobileMenuDrawer}
        onClose={() => setShowMobileMenuDrawer(false)}
        activeRole={activeRole}
        onOpenAddModal={() => setShowAddModal(true)}
        onOpenSyncModal={() => setShowSyncModal(true)}
        onOpenGeminiModal={() => {
          setGeminiTargetApplicant(null);
          setShowGeminiModal(true);
        }}
        onExportCSV={handleExportCSV}
        onOpenPWAInstall={() => setShowPWAInstallModal(true)}
        totalApplicants={applicants.length}
        onOpenUserManagement={() => setCurrentView('users')}
        onOpenDepartmentsView={() => setCurrentView('departments')}
        onOpenInterviewsFilter={() => {
          setCurrentView('applications');
          setViewScope('all');
          setStatusFilter('dept');
        }}
        canManageUsers={canManageUsers}
        canAddApplicant={canAddApplicant}
        canSyncSheets={canSyncGoogleSheets}
        canExportCSV={canExportCSV}
        canManageSalaryStructure={canManageSalaryStructure}
        onOpenSalaryStructure={() => setShowSalaryStructureModal(true)}
      />

      {/* Real-time Database Action Feedback Toast */}
      {dbFeedbackToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-[calc(env(safe-area-inset-top,0px)+4.75rem)] md:top-auto md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] sm:w-auto max-w-md px-4 sm:px-5 py-3 rounded-2xl shadow-lg border flex items-center gap-3 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-3 md:slide-in-from-bottom-3 ${
            dbFeedbackToast.type === 'error'
              ? 'bg-rose-900/95 text-rose-50 border-rose-500/40'
              : dbFeedbackToast.type === 'info'
              ? 'bg-slate-900/95 text-slate-100 border-blue-500/30'
              : 'bg-gradient-to-l from-blue-700 to-indigo-700 text-white border-cyan-400/40'
          }`}
        >
          <div className="p-1 rounded-lg bg-white/15 shrink-0">
            <Database
              className={`w-4 h-4 ${
                dbFeedbackToast.type === 'error' ? 'text-rose-200' : 'text-cyan-200'
              }`}
            />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-wide">
            {dbFeedbackToast.message}
          </span>
        </div>
      )}
    </div>
  );
}
