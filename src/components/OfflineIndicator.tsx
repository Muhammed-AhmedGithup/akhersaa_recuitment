import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:bottom-4 left-3.5 right-3.5 sm:right-auto z-50 flex items-center gap-2 rounded-xl bg-[#111318] text-white px-3.5 py-2.5 text-xs font-bold shadow-soft-lg border border-[#DC2626]">
      <WifiOff className="w-4 h-4 text-[#DC2626] shrink-0" />
      <span>انقطع الاتصال بالشبكة — يرجى إعادة الاتصال لحفظ واسترجاع أحدث البيانات.</span>
    </div>
  );
};
