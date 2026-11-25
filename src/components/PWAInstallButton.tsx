import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { Smartphone, Download, Sparkles } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'floating' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already installed in standalone mode, hide
  if (isInstalled) {
    return null;
  }

  const handleClick = () => {
    // If the browser supports native prompt, we can try install or show guided modal
    setShowModal(true);
  };

  if (variant === 'floating') {
    return (
      <>
        <div className="fixed bottom-4 right-4 z-40 sm:hidden">
          <button
            onClick={handleClick}
            className="flex items-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2.5 rounded-full shadow-2xl border border-red-500/40 font-bold text-xs active:scale-95 transition-all"
          >
            <Smartphone className="w-4 h-4 text-red-100" />
            <span>تثبيت كتطبيق</span>
          </button>
        </div>
        {showModal && <PWAInstallModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#111318] hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm border border-zinc-800 cursor-pointer"
        title="تثبيت التطبيق على شاشة الموبايل"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#DC2626]" />
        <span className="hidden sm:inline">تثبيت التطبيق</span>
        <span className="sm:hidden">تطبيق الموبايل</span>
      </button>

      {showModal && <PWAInstallModal onClose={() => setShowModal(false)} />}
    </>
  );
};
