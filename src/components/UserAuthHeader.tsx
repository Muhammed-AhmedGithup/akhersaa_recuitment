import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LogIn,
  LogOut,
  Shield,
  UserCheck,
  Briefcase,
  ChevronDown,
  Loader2,
  Building2,
  Users,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DEPARTMENTS, getRoleDisplayTitle } from '../utils/departments';
import { LoginModal } from './LoginModal';

interface UserAuthHeaderProps {
  activeRole: UserRole;
  onRoleChange?: (role: UserRole) => void;
  onOpenUserManagement?: () => void;
  canManageUsers?: boolean;
}

export const UserAuthHeader: React.FC<UserAuthHeaderProps> = ({
  activeRole,
  onOpenUserManagement,
  canManageUsers,
}) => {
  const {
    user,
    appUser,
    isLoading,
    logout,
    authError,
    clearAuthError,
    isSuperAdmin,
    department,
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvatarError(false);
  }, [appUser?.photoURL, user?.photoURL]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentUser = appUser || (user ? {
    id: user.uid,
    email: user.email || '',
    fullName: user.displayName || 'مستخدم النظام',
    role: activeRole,
    department: department || 'الإدارة العامة',
    status: 'active' as const,
    photoURL: user.photoURL || undefined,
  } : null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DC2626]" />
        <span>جاري التحقق...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            title="تسجيل الدخول بالبريد الإلكتروني وكلمة المرور أو Google"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </button>

          {authError && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] max-w-[200px]">
              <span className="truncate" title={authError}>
                {authError}
              </span>
              <button
                type="button"
                onClick={clearAuthError}
                className="text-amber-700 hover:text-amber-950 font-bold px-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-zinc-50 hover:bg-red-50/60 border border-zinc-200 hover:border-red-300 text-[#111318] transition-all duration-150 shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          {currentUser.photoURL && !avatarError ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.fullName}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
              className="w-7 h-7 rounded-lg border border-zinc-200 object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#111318] text-white font-black flex items-center justify-center text-xs shadow-2xs">
              {(currentUser.fullName || currentUser.email || 'م')[0].toUpperCase()}
            </div>
          )}

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold leading-tight text-[#111318] flex items-center gap-1.5">
              <span className="truncate max-w-[120px]">{currentUser.fullName}</span>
            </div>
            <div className="text-[10px] text-[#DC2626] font-bold leading-none mt-0.5">
              {getRoleDisplayTitle(currentUser.role || activeRole)}
            </div>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180 text-[#DC2626]' : ''
            }`}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-zinc-200 shadow-soft-lg z-50 overflow-hidden text-right animate-in fade-in zoom-in-95">
            {/* User Info Header Card */}
            <div className="bg-[#111318] border-b-2 border-[#DC2626] p-3.5 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DC2626] text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                {(currentUser.fullName || 'م')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                  <span>{currentUser.fullName}</span>
                  {isSuperAdmin && (
                    <span className="text-[9px] bg-[#DC2626] text-white px-1.5 py-0.2 rounded font-black font-mono">
                      Super Admin
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-300 truncate dir-ltr text-right font-mono">
                  {currentUser.email}
                </div>
                <div className="text-[10px] text-red-400 font-semibold mt-0.5">
                  الإدارة: {currentUser.department || 'الإدارة العامة'}
                </div>
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              {/* Admin Management Navigation Shortcut */}
              {(canManageUsers ?? isSuperAdmin) && onOpenUserManagement && (
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenUserManagement();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-red-50 hover:bg-red-100/80 border border-red-200 text-[#111318] transition-colors text-xs font-bold cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#DC2626]" />
                    <span>إدارة المستخدمين والصلاحيات</span>
                  </div>
                  <span className="text-[10px] bg-[#111318] text-white font-black px-1.5 py-0.5 rounded font-mono">
                    Admin
                  </span>
                </button>
              )}

              {/* Assigned Role Info (Locked by Email via System Admin) */}
              <div className="py-1">
                <div className="text-[10px] text-zinc-500 mb-1 font-bold">
                  الصلاحية المعتمدة لهذا البريد:
                </div>
                <div className="px-2.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-[#111318] font-bold flex items-center justify-between">
                  <span>{getRoleDisplayTitle(currentUser.role || activeRole)}</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                    DB Verified
                  </span>
                </div>
              </div>

              {/* Sign Out */}
              <div className="pt-1 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#DC2626] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج من الحساب</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
};
