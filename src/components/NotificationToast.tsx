import React from 'react';
import { AppNotification } from '../types';
import { Bell, Zap, X } from 'lucide-react';

interface NotificationToastProps {
  notification: AppNotification | null;
  onClose: () => void;
  onAction: (applicantId: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onAction,
}) => {
  if (!notification) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] left-4 right-4 sm:right-auto sm:left-6 z-50 max-w-md w-auto sm:w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-[#111318] text-white rounded-2xl p-4 shadow-soft-lg border border-zinc-800 border-t-2 border-t-[#DC2626] flex items-start gap-3 text-right">
        <div className="p-2.5 rounded-xl bg-[#DC2626] text-white flex-shrink-0 shadow-xs">
          <Bell className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black bg-white/10 text-red-400 border border-white/10 px-2 py-0.5 rounded font-mono">
              تنبيه إداري فوري
            </span>
            <button
              onClick={onClose}
              aria-label="إغلاق التنبيه"
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="font-black text-sm text-white">{notification.title}</h4>
          <p className="text-xs text-zinc-300 leading-relaxed">{notification.message}</p>

          <div className="pt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-zinc-400">
              الوظيفة: <span className="text-white">{notification.position}</span>
            </span>

            <button
              type="button"
              onClick={() => {
                onAction(notification.applicantId);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>اتخاذ القرار الآن</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
