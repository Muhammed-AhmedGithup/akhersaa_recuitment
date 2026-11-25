import React, { useState } from 'react';
import { UserRole } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { useAuth } from '../context/AuthContext';
import { LoginModal } from './LoginModal';
import {
  Bell,
  Search,
  X,
  LogIn,
  Bot,
} from 'lucide-react';
import { getRoleDisplayTitle } from '../utils/departments';

interface MobileAppBarProps {
  activeRole: UserRole;
  canSwitchRole?: boolean;
  onOpenRoleSwitcher: () => void;
  onOpenNotifications: () => void;
  onOpenGeminiModal?: () => void;
  unreadNotificationsCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalApplicantsCount: number;
  onOpenFiltersSheet?: () => void;
}

export const MobileAppBar: React.FC<MobileAppBarProps> = ({
  activeRole,
  onOpenNotifications,
  onOpenGeminiModal,
  unreadNotificationsCount,
  searchQuery,
  onSearchChange,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const { user, appUser } = useAuth();

  React.useEffect(() => {
    setAvatarError(false);
  }, [appUser?.photoURL, user?.photoURL]);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-l from-blue-700 via-indigo-700 to-violet-700 text-white border-b border-blue-600/40 pt-safe transition-all duration-200 shadow-md md:hidden">
      {/* Compact Vibrant Gradient Top Row */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CompanyLogo size="sm" variant="icon" theme="dark" />
          <div className="min-w-0">
            <span className="font-black text-sm text-white tracking-tight block truncate">
              آخر ساعة إسبشيال
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-200 truncate max-w-[165px]">
                {getRoleDisplayTitle(activeRole)}
              </span>
            </div>
          </div>
        </div>

        {/* Touch Action Controls (>=40px hit targets) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer ${
              showSearch || searchQuery
                ? 'bg-white text-blue-700 border-white shadow-xs'
                : 'bg-white/15 text-white border-white/20 hover:bg-white/25'
            }`}
            title="بحث في الطلبات"
            aria-label="البحث"
          >
            <Search className="w-4 h-4" />
          </button>

          {onOpenGeminiModal && (
            <button
              type="button"
              onClick={onOpenGeminiModal}
              className="flex items-center gap-1 px-2.5 h-10 bg-white/15 hover:bg-white/25 text-white rounded-xl border border-white/25 active:scale-95 cursor-pointer font-black text-[11px]"
              title="المساعد الذكي (AI)"
              aria-label="المساعد الذكي"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-200" />
              <span>AI</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative w-10 h-10 flex items-center justify-center bg-white/15 hover:bg-white/25 text-white rounded-xl border border-white/20 transition-all active:scale-95 cursor-pointer"
            title="الإشعارات الإدارية"
            aria-label="الإشعارات"
          >
            <Bell className="w-4 h-4 text-white" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-mono text-[9px] font-black flex items-center justify-center ring-2 ring-indigo-700 tabular-nums">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {!user && !appUser ? (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-1 px-2.5 h-10 bg-white text-blue-700 font-black text-xs rounded-xl active:scale-95 cursor-pointer shadow-xs"
              title="تسجيل الدخول"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>دخول</span>
            </button>
          ) : (
            <div
              className="w-9 h-9 rounded-xl border-2 border-white/60 overflow-hidden shrink-0 shadow-xs"
              title={appUser?.fullName || user?.displayName || user?.email || 'المستخدم'}
            >
              {(appUser?.photoURL || user?.photoURL) && !avatarError ? (
                <img
                  src={appUser?.photoURL || user?.photoURL || ''}
                  alt={appUser?.fullName || user?.displayName || 'المستخدم'}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-white/20 text-white flex items-center justify-center font-black text-xs">
                  {(appUser?.fullName || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Search Input Row */}
      {showSearch && (
        <div className="px-3.5 pb-3 pt-0.5 animate-in fade-in slide-in-from-top-1 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-blue-200 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث بالاسم، الرقم القومي، الهاتف، الوظيفة..."
              className="w-full min-h-[40px] pr-9 pl-8 py-2 rounded-xl border border-white/25 focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white/15 text-xs text-white placeholder:text-blue-100 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-100 hover:text-white p-1 cursor-pointer"
                aria-label="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowSearch(false)}
            className="text-xs text-white font-bold px-3 min-h-[40px] rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 cursor-pointer shrink-0 transition-colors"
          >
            إغلاق
          </button>
        </div>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </header>
  );
};
