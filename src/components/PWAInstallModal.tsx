import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  Check,
  Copy,
  X,
} from 'lucide-react';

interface PWAInstallModalProps {
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ onClose }) => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[94dvh] sm:max-h-[92vh] flex flex-col border-t sm:border border-zinc-200 overflow-hidden text-right animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="bg-[#111318] border-b-2 border-[#DC2626] text-white px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-[#DC2626] rounded-2xl shadow-inner shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-[#DC2626] text-white font-black px-2 py-0.5 rounded">
                  PWA Mobile App
                </span>
                <span className="text-xs text-zinc-300">يعمل بدون متجر</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5 truncate">
                تثبيت التطبيق على هاتفك المحمول
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 text-xs overflow-y-auto flex-1">
          {/* App preview badge */}
          <div className="flex items-center gap-3.5 bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl">
            <img
              src="/assets/aistudio/akher_saa_special_symbol_only_5dcc4516.png"
              alt="آخر ساعة"
              className="w-14 h-14 p-1.5 bg-white rounded-2xl shadow-sm border border-zinc-200 object-contain flex-shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[#111318] text-sm">
                  إدارة توظيف آخر ساعة
                </span>
                <span className="text-[10px] bg-[#DC2626] text-white font-bold px-1.5 py-0.5 rounded">
                  تطبيق رسمي
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-1 leading-relaxed">
                يتم تثبيته كتطبيق مستقل يعمل في وضع ملء الشاشة مع حفظ البيانات محلياً وإشعارات القرارات.
              </p>
            </div>
          </div>

          {/* Direct Install Button (Android / Desktop Chrome / Edge) */}
          {isInstallable && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleNativeInstall}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-black text-sm rounded-2xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                <Download className="w-5 h-5 text-red-100" />
                <span>تثبيت الآن على الهاتف (بنقرة واحدة)</span>
              </button>
              <p className="text-center text-[11px] text-zinc-500">
                سيتوفر التطبيق مباشرة في قائمة تطبيقات هاتفك وعلى الشاشة الرئيسية.
              </p>
            </div>
          )}

          {/* Android Guide if not immediately installable via prompt */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-black text-[#111318] text-xs">
              <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[11px]">
                🤖
              </div>
              <span>طريقة التثبيت على هواتف أندرويد (Chrome):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-zinc-700 text-[11px] pr-1 leading-relaxed">
              <li>افتح الرابط في متصفح <strong>Google Chrome</strong> على هاتفك.</li>
              <li>اضغط على قائمة الخيارات <strong>( الثلاث نقاط ⋮ في الزاوية العلوية )</strong>.</li>
              <li>اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</li>
              <li>سيتم تثبيت التطبيق وفتحه كبرنامج مستقل بدون شريط المتصفح!</li>
            </ol>
          </div>

          {/* iOS Safari Guide */}
          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2 font-black text-[#111318] text-xs">
              <div className="w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-[11px]">
                🍏
              </div>
              <span>طريقة التثبيت على آيفون / آيباد (iOS Safari):</span>
            </div>
            <div className="space-y-2 text-[11px] text-zinc-700">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#DC2626]">1.</span>
                <span>افتح الرابط في متصفح <strong>Safari</strong> الرسمي.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#DC2626]">2.</span>
                <span>اضغط على زر المشاركة بالأسفل <strong>(مربع وسهم لأعلى <Share2 className="w-3.5 h-3.5 inline text-[#DC2626] mx-0.5" />)</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#DC2626]">3.</span>
                <span>انزل للأسفل واضغط <strong>«إضافة إلى الشاشة الرئيسية» <PlusSquare className="w-3.5 h-3.5 inline text-[#DC2626] mx-0.5" /></strong> (Add to Home Screen).</span>
              </div>
            </div>
          </div>

          {/* Open on mobile / Share link */}
          <div className="pt-2 border-t border-zinc-200 space-y-2">
            <label className="block font-bold text-zinc-700 text-xs">
              رابط التطبيق لفتحه على هاتفك:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                dir="ltr"
                className="flex-1 p-2 rounded-xl border border-zinc-300 font-mono text-[11px] bg-zinc-100 text-zinc-600 text-left"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-red-100" /> : <Copy className="w-4 h-4 text-red-100" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-200 flex justify-between items-center text-xs">
          <span className="text-zinc-500 text-[11px]">
            يدعم العمل أوفلاين وسرعة فائقة
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-bold cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
