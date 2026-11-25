import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logOut, signInWithGoogle } from '../lib/firebase';
import {
  clearInMemoryAuthToken,
  fetchCurrentSessionUser,
  loginWithEmailPassword as apiLoginWithEmailPassword,
  logoutSession,
} from '../services/apiService';
import { AppUser, SUPER_ADMIN_EMAIL, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  isLoading: boolean;
  role: UserRole;
  department: string | null;
  setRole: (role: UserRole) => void;
  loginWithEmailPassword: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
  loginWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = SUPER_ADMIN_EMAIL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRoleState] = useState<UserRole>('hr');
  const [department, setDepartmentState] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const hydrateFromServer = async (fbUser: User | null) => {
      try {
        const res = await fetchCurrentSessionUser();
        if (!active) return;

        if (res.status === 200 && res.user) {
          const serverUser = res.user;
          const isSuper = Boolean(
            serverUser.isSuperAdmin ||
              serverUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
          );
          const resolvedRole: UserRole = (serverUser.baseRole || serverUser.role || 'hr') as UserRole;
          const mappedUser: AppUser = {
            id: serverUser.id,
            email: serverUser.email,
            fullName: serverUser.fullName,
            displayName: serverUser.displayName || serverUser.fullName,
            jobTitle: serverUser.jobTitle,
            phoneNumber: serverUser.phoneNumber,
            role: resolvedRole,
            department: serverUser.department || 'الإدارة العامة',
            status: serverUser.status || 'active',
            permissions: serverUser.permissions,
            isSuperAdmin: isSuper,
            photoURL: fbUser?.photoURL || serverUser.photoURL || undefined,
            lastLoginAt: serverUser.lastLoginAt,
          };
          setAppUser(mappedUser);
          setRoleState(resolvedRole);
          setDepartmentState(mappedUser.department || null);
          setAuthError(null);
        } else if (res.status === 403) {
          setAppUser(null);
          setRoleState('hr');
          setDepartmentState(null);
          clearInMemoryAuthToken();
          setAuthError(
            res.error || 'عذراً، هذا الحساب معطل أو موقوف حالياً. يرجى التواصل مع مدير النظام.'
          );
          if (fbUser) {
            await logOut().catch(() => {});
          }
        } else {
          setAppUser(null);
          setRoleState('hr');
          setDepartmentState(null);
        }
      } catch {
        if (!active) return;
        setAppUser(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;
      setUser(currentUser);
      await hydrateFromServer(currentUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const isSuperAdmin = Boolean(
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      appUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      appUser?.isSuperAdmin ||
      role === 'admin'
  );

  // Roles are assigned strictly by email via System Admin; no post-login self-switching allowed.
  const setRole = (_newRole: UserRole) => {
    // Intentionally locked to PostgreSQL appUser.role
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  /**
   * Secure Email & Password Login against PostgreSQL + HttpOnly Cookie
   */
  const loginWithEmailPassword = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: AppUser; error?: string }> => {
    setAuthError(null);
    try {
      const result = await apiLoginWithEmailPassword(email, password);
      if (result.success && result.user) {
        const loggedUser: AppUser = result.user;
        setAppUser(loggedUser);
        setRoleState(loggedUser.role);
        setDepartmentState(loggedUser.department || null);
        return { success: true, user: loggedUser };
      } else {
        const err = result.error || 'فشل تسجيل الدخول';
        setAuthError(err);
        return { success: false, error: err };
      }
    } catch (err: any) {
      const msg = err?.message || 'تعذر تسجيل الدخول بالبريد الإلكتروني وكلمة المرور';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const login = async (): Promise<User | null> => {
    setAuthError(null);
    try {
      const userCredential = await signInWithGoogle();
      return userCredential?.user || null;
    } catch (error: any) {
      const code = error?.code || '';

      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('popup-closed-by-user')
      ) {
        setAuthError(null);
        return null;
      }

      if (code === 'auth/popup-blocked') {
        setAuthError(
          'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة لتسجيل الدخول.'
        );
        return null;
      }

      if (code === 'auth/unauthorized-domain') {
        setAuthError(
          'نطاق التطبيق الحالي غير مضاف في قائمة النطاقات المصرح بها في إعدادات المصادقة.'
        );
        return null;
      }

      if (code === 'auth/network-request-failed') {
        setAuthError('تعذر الاتصال بخدمة المصادقة، يرجى التحقق من اتصال الإنترنت.');
        return null;
      }

      setAuthError('تعذر استكمال تسجيل الدخول، يرجى المحاولة مرة أخرى.');
      return null;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutSession();
      await logOut();
    } catch (error: any) {
      console.warn('Logout notice:', error);
    } finally {
      setAppUser(null);
      setUser(null);
      setRoleState('hr');
      setDepartmentState(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        isLoading,
        role,
        department,
        setRole,
        loginWithEmailPassword,
        loginWithGoogle: login,
        logout: handleLogout,
        authError,
        clearAuthError,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
