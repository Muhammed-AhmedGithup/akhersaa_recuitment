import React, { useState, useRef, useEffect } from 'react';
import { AppNotification, JobApplication, UserRole } from '../types';
import {
  Bell,
  CheckCheck,
  Zap,
  Award,
  ShieldCheck,
  UserCheck,
  Clock,
  X,
  ExternalLink,
  Sparkles,
  Briefcase
} from 'lucide-react';

interface NotificationCenterProps {
  notifications: AppNotification[];
  activeRole: UserRole;
  onSelectApplicant: (applicantId: string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  align?: 'right' | 'left';
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  activeRole,
  onSelectApplicant,
  onMarkAsRead,
  onMarkAllAsRead,
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter notifications relevant to current role
  const roleNotifications = notifications.filter(
    (n) => n.targetRole === activeRole || activeRole === 'admin'
  );

  const unreadCount = roleNotifications.filter((n) => !n.isRead).length;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'general_manager':
        return <Award className="w-4 h-4 text-amber-600" />;
      case 'direct_manager':
        return <ShieldCheck className="w-4 h-4 text-[#DC2626]" />;
      case 'hr_manager':
        return <Briefcase className="w-4 h-4 text-[#111318]" />;
      default:
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-zinc-100 hover:bg-red-50 text-zinc-700 hover:text-[#DC2626] transition-colors cursor-pointer border border-zinc-200 hover:border-red-200"
        title="التنبيهات والإشعارات الإدارية"
        aria-label="الإشعارات"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-black text-white font-mono shadow-xs tabular-nums ring-2 ring-white">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0 sm:right-auto sm:left-0' : 'right-0 sm:right-0 sm:left-auto'
          } mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-soft-lg border border-zinc-200 z-50 overflow-hidden text-right animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="bg-[#111318] border-b-2 border-[#DC2626] text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#DC2626] text-white">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">إشعارات القرارات الإدارية</h3>
                <span className="text-[10px] text-zinc-300 tabular-nums">
                  {unreadCount > 0 ? `${unreadCount} طلب بانتظار إجرائك` : 'لا توجد تنبيهات جديدة'}
                </span>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-red-400" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100">
            {roleNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-red-50 text-[#DC2626] border border-red-200 flex items-center justify-center mx-auto">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-[#111318]">لا توجد طلبات معلقة لصلاحيتك الحالية</p>
                <p className="text-[11px] text-zinc-400">
                  تم إنجاز كافة الإجراءات أو لم تصل طلبات جديدة بعد.
                </p>
              </div>
            ) : (
              roleNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 transition-colors ${
                    !notif.isRead ? 'bg-red-50/40 hover:bg-red-50/70' : 'bg-white hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-white border border-zinc-200 shadow-2xs mt-0.5">
                      {getRoleIcon(notif.targetRole)}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#DC2626] flex-shrink-0" />
                          )}
                          <h4 className="font-bold text-xs text-[#111318] leading-tight">
                            {notif.title}
                          </h4>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-0.5 tabular-nums">
                          <Clock className="w-2.5 h-2.5" />
                          {notif.timestamp}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-600 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-bold text-[#111318] bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {notif.position}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onMarkAsRead(notif.id);
                              onSelectApplicant(notif.applicantId);
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-[10px] font-bold shadow-2xs transition-all cursor-pointer"
                          >
                            <Zap className="w-3 h-3 text-red-100" />
                            <span>اتخاذ الإجراء فوراً</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-zinc-50 border-t border-zinc-200 text-center text-[10px] text-zinc-500">
            <span>التنبيهات مخصصة لدور: </span>
            <strong className="text-[#DC2626]">
              {activeRole === 'general_manager'
                ? 'المدير العام'
                : activeRole === 'direct_manager'
                ? 'مدير الإدارة'
                : activeRole === 'hr_manager'
                ? 'مدير الموارد البشرية'
                : activeRole === 'admin'
                ? 'مدير النظام'
                : 'الموارد البشرية'}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};
