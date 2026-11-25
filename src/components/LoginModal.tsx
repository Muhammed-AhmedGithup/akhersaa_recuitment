import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Lock,
  Mail,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithEmailPassword, loginWithGoogle, authError, clearAuthError } = useAuth();
  const [activeTab, setActiveTab] = useState<'password' | 'google'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim() || !password) {
      setLocalError('يرجى كتابة البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithEmailPassword(email.trim(), password);
      if (res.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setLocalError(res.error || 'فشل تسجيل الدخول');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setLocalError(null);
    clearAuthError();
    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (res) {
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setLocalError(err?.message || 'تعذر استكمال تسجيل الدخول عبر Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-zinc-200 w-full max-w-md overflow-hidden text-right flex flex-col max-h-[94dvh] sm:max-h-[92vh] animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="bg-[#111318] border-b-2 border-[#DC2626] p-4 sm:p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute left-3.5 top-3.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626] flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">تسجيل الدخول للمنظومة</h2>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                نظام إدارة طلبات التوظيف والصلاحيات - آخر ساعة إسبشيال
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-4 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'password'
                  ? 'bg-[#DC2626] text-white font-black shadow-xs'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              البريد وكلمة المرور
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('google')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'google'
                  ? 'bg-[#DC2626] text-white font-black shadow-xs'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              حساب Google
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Error Message */}
          {(localError || authError) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">تعذر الدخول:</span>
                <span>{localError || authError}</span>
              </div>
            </div>
          )}

          {activeTab === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  البريد الإلكتروني المعتمد <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    dir="ltr"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@akhersaa.com"
                    className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm sm:text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  كلمة المرور <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    dir="ltr"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm sm:text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-black text-xs rounded-xl shadow-sm shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جاري التحقق من الهوية...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-red-100" />
                      <span>تسجيل الدخول والتحقق</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-zinc-500 text-center leading-relaxed">
                إنشاء الحسابات وتعيين الأدوار والصلاحيات بالإيميل مقتصر حصراً على مدير النظام (System Admin).
              </div>
            </form>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-xs text-zinc-600 leading-relaxed text-center">
                يمكن للمديرين المعتمدين تسجيل الدخول المباشر باستخدام حساب Google المربوط بالنظام.
              </p>

              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-white hover:bg-zinc-50 text-[#111318] border border-zinc-300 font-bold text-xs rounded-2xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-700" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>متابعة تسجيل الدخول بحساب Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
