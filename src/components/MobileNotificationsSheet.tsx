import React, { useState } from 'react';
import { AppNotification, UserRole } from '../types';
import {
  X,
  Bell,
  CheckCheck,
  Award,
  ShieldCheck,
  UserCheck,
  Clock,
  ChevronLeft,
  Briefcase
} from 'lucide-react';

interface MobileNotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  activeRole: UserRole;
  onSelectApplicant: (applicantId: string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export const MobileNotificationsSheet: React.FC<MobileNotificationsSheetProps> = ({
  isOpen,
  onClose,
  notifications,
  activeRole,
  onSelectApplicant,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [filterUnread, setFilterUnread] = useState(false);

  if (!isOpen) return null;

  const roleNotifications = notifications.filter(
    (n) => n.targetRole === activeRole || activeRole === 'admin'
  );

  const displayedNotifications = filterUnread
    ? roleNotifications.filter((n) => !n.isRead)
    : roleNotifications;

  const unreadCount = roleNotifications.filter((n) => !n.isRead).length;

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
    <div className="fixed inset-0 z-50 bg-zinc-950/65 backdrop-blur-sm flex items-end justify-center md:hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl max-h-[85vh] w-full flex flex-col shadow-2xl border-t border-zinc-200 overflow-hidden text-right animate-slide-up-mobile pb-safe">
        {/* Drag Pill Handle */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-zinc-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#111318] text-white shadow-xs">
              <Bell className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#111318] text-base">مركز الإشعارات والتنبيهات</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#DC2626] text-white font-mono text-[10px] font-black tabular-nums">
                    {unreadCount} غير مقروء
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">طلبات التوظيف بانتظار إجراء من صلاحيتك</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-[#111318] rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Bulk Action Toolbar */}
        <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 bg-zinc-200/80 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterUnread(false)}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                !filterUnread ? 'bg-[#DC2626] text-white shadow-2xs' : 'text-zinc-700'
              }`}
            >
              الكل ({roleNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterUnread(true)}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                filterUnread ? 'bg-[#DC2626] text-white shadow-2xs' : 'text-zinc-700'
              }`}
            >
              غير المقروءة ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1 text-[11px] font-bold text-[#DC2626] hover:text-[#B91C1C] cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* List of Notifications */}
        <div className="p-3 space-y-2 overflow-y-auto momentum-scroll max-h-[55vh]">
          {displayedNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-zinc-700">لا توجد إشعارات جديدة</p>
              <p className="text-[11px] text-zinc-400">ستصلك تنبيهات فورية فور ورود طلبات جديدة أو تحديثات</p>
            </div>
          ) : (
            displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  onMarkAsRead(notif.id);
                  onClose();
                  onSelectApplicant(notif.applicantId);
                }}
                className={`p-3.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer flex items-start justify-between gap-3 ${
                  !notif.isRead
                    ? 'bg-red-50/50 border-red-200'
                    : 'bg-white border-zinc-200/80 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      !notif.isRead ? 'bg-white border border-red-200 shadow-2xs' : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {getRoleIcon(notif.targetRole)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-[#111318] truncate">{notif.title}</h4>
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0 flex items-center gap-1 tabular-nums">
                        <Clock className="w-2.5 h-2.5" />
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 line-clamp-2 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold text-[#111318] bg-white px-2 py-0.5 rounded-md border border-zinc-200">
                        {notif.applicantName}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate">{notif.position}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center self-center text-zinc-400 pl-1">
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
