import React, { useState } from 'react';
import { UserRole, UserIdentity } from '../types';
import { resetAdminUserPassword, resendAdminUserInvite } from '../services/apiService';
import {
  X,
  KeyRound,
  Send,
  Lock,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  user: UserIdentity | null;
  onClose: () => void;
  callerRole: UserRole;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  user,
  onClose,
  callerRole,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPass, setGeneratedPass] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setActionNotice(null);
    setIsSubmitting(true);

    try {
      const res = await resetAdminUserPassword(user.id, newPassword.trim() || undefined, callerRole);
      setGeneratedPass(res.temporaryPassword || newPassword || 'AkherSaa@2026');
      setActionNotice('تمت إعادة تعيين كلمة المرور بنجاح وتوثيق العملية في سجل التدقيق والأمان.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر إعادة تعيين كلمة المرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvite = async () => {
    setErrorMsg(null);
    setActionNotice(null);
    setIsSubmitting(true);

    try {
      const res = await resendAdminUserInvite(user.id, callerRole);
      setGeneratedPass(res.temporaryPassword || 'AkherSaa@2026');
      setActionNotice('تم توليد وإعادة إرسال بيانات الدعوة وكلمة المرور المؤقتة بنجاح.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر إعادة إرسال الدعوة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!generatedPass) return;
    const text = `بيانات تسجيل الدخول الجديدة - آخر ساعة إسبشيال:
المستخدم: ${user.fullName}
البريد الإلكتروني: ${user.email}
كلمة المرور الجديدة: ${generatedPass}
الرابط: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-zinc-200 w-full max-w-md max-h-[94dvh] sm:max-h-[92vh] overflow-hidden text-right flex flex-col animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="bg-[#111318] border-b-2 border-[#DC2626] p-4 sm:p-5 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#DC2626] flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white truncate">إعادة تعيين كلمة المرور واستعادة الحساب</h2>
              <p className="text-[11px] text-zinc-300 mt-0.5 truncate">
                المستخدم: {user.fullName} ({user.email})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {actionNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {generatedPass ? (
            <div className="space-y-4 py-2 animate-in fade-in">
              <div className="p-4 bg-[#111318] text-white rounded-2xl border border-zinc-800 space-y-3">
                <div className="text-xs text-zinc-200">كلمة المرور المؤقتة الجديدة للحساب:</div>
                <div className="p-3 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between">
                  <span className="font-mono font-bold text-red-400 text-sm tracking-wider" dir="ltr">
                    {generatedPass}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  تم تشفير وحفظ كلمة المرور في قاعدة البيانات بواسطة خوارزمية التمليح المشددة (PBKDF2 SHA-512).
                  يرجى تسليم كلمة المرور للمستخدم لمتابعة عمله.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-zinc-600 leading-relaxed">
                يمكنك تعيين كلمة مرور مخصصة أو توليد كلمة مرور عشوائية آمنة تلقائياً وفق سياسة أمان المنظومة.
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  كلمة المرور الجديدة (اختياري - سيتم التوليد تلقائياً إذا تركت فارغة)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="مثال: Akher#8931"
                    className="w-full pr-10 pl-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-sm sm:text-xs text-[#111318] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-[#DC2626] transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-2xl shadow-md shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جاري التعيين والتشفير...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-red-100" />
                      <span>إعادة تعيين كلمة المرور الآن</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendInvite}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-bold text-xs rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-zinc-600" />
                  <span>إعادة إرسال وتوليد دعوة إنشاء كلمة المرور</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
