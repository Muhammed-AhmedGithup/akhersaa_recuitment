import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { Smartphone, Download, X, Sparkles, ShieldCheck } from 'lucide-react';

export const MobileSmartInstallBanner: React.FC = () => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // If already running standalone or user dismissed, don't show
  if (isInstalled || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="md:hidden bg-[#111318] text-white p-3 border-b border-[#DC2626]/50 shadow-xs relative z-20">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#DC2626] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-black text-xs text-white">
                <span className="truncate">تطبيق آخر ساعة للجوال</span>
                <span className="text-[9px] bg-white/10 text-red-400 border border-white/15 px-1 rounded">
                  PWA
                </span>
              </div>
              <p className="text-[10px] text-zinc-300 truncate mt-0.5">
                ثبّت التطبيق على شاشتك لتجربة سريعة ودون متصفح
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-black text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تثبيت</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showModal && <PWAInstallModal onClose={() => setShowModal(false)} />}
    </>
  );
};
