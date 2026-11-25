import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CompanyLogo } from './CompanyLogo';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithEmailPassword, authError, clearAuthError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!password) {
      setLocalError('يرجى إدخال كلمة المرور');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithEmailPassword(trimmedEmail, password);
      if (!res.success) {
        setLocalError(res.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorMessage = localError || authError;

  return (
    <div className="min-h-dvh pt-safe pb-safe w-full bg-gradient-to-br from-slate-900 via-[#13224B] to-indigo-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-300 selection:text-slate-950">
      {/* Vibrant ambient SaaS light accents */}
      <div className="absolute -top-32 -right-32 w-[480px] h-[480px] bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[380px] h-[380px] bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[460px] h-[460px] bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between border-b border-white/10">
        <CompanyLogo size="md" theme="dark" />
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-cyan-200 bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/15">
          <ShieldCheck className="w-4 h-4 text-cyan-300" />
          <span>بوابة الموظفين والإدارة المعتمدة</span>
        </span>
      </header>

      {/* Main Executive Section */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex items-center justify-center">
        <div className="w-full flex justify-center">
          {/* Transparent Glass Login Card */}
          <div className="w-full max-w-md mx-auto animate-modal-enter">
            <div className="bg-white/[0.07] backdrop-blur-xl text-white border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950/50 space-y-6 relative overflow-hidden">
              {/* Vibrant multi-color gradient top bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-blue-400 via-cyan-400 to-violet-400 opacity-85" />

              <div className="text-right space-y-1.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-cyan-300">
                    بوابة الدخول الموحدة · نظام التوظيف
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-200 shadow-sm shrink-0">
                    <LogIn className="w-4 h-4" />
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">تسجيل الدخول للنظام</h2>
                <p className="text-xs text-blue-100/80 leading-relaxed">
                  أدخل بيانات حسابك المعتمد للوصول إلى لوحة إدارة واعتماد طلبات التوظيف
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-100 text-xs flex items-start gap-2.5 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                  <div className="flex-1 font-semibold leading-relaxed">
                    {errorMessage}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-100">
                    البريد الإلكتروني الوظيفي
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-cyan-200/70 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setLocalError(null);
                        clearAuthError();
                      }}
                      placeholder="name@akhersaa.com"
                      className="w-full pr-10 pl-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-300/60 text-sm sm:text-xs font-medium focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-400/35 focus:border-cyan-300 transition-all dir-ltr text-right"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-100">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-cyan-200/70 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLocalError(null);
                        clearAuthError();
                      }}
                      placeholder="••••••••••••"
                      className="w-full pr-10 pl-12 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-300/60 text-sm sm:text-xs font-mono focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-400/35 focus:border-cyan-300 transition-all"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] py-3 px-4 rounded-xl font-black text-sm sm:text-xs bg-gradient-to-l from-blue-500 via-indigo-500 to-violet-500 hover:from-blue-600 hover:via-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-blue-600/30 border border-white/15 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جاري التحقق من الصلاحيات...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول والمتابعة</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 py-4 text-center text-xs text-blue-200/75">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>شركة آخر ساعة إسبشيال · منظومة التوظيف وشؤون العاملين</span>
          <span>جميع الحقوق محفوظة © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
};
