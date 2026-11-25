import React, { useState } from 'react';
import {
  Plus,
  Bot,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface MobileFloatingFABProps {
  onOpenAddModal: () => void;
  onOpenGeminiModal: () => void;
  onOpenSyncModal: () => void;
  canAddApplicant?: boolean;
  canSyncSheets?: boolean;
}

export const MobileFloatingFAB: React.FC<MobileFloatingFABProps> = ({
  onOpenAddModal,
  onOpenGeminiModal,
  onOpenSyncModal,
  canAddApplicant = true,
  canSyncSheets = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] left-3.5 z-30 md:hidden flex flex-col items-start gap-2">
      {/* Speed Dial Menu items */}
      {isOpen && (
        <div className="flex flex-col items-start gap-2 animate-in fade-in slide-in-from-bottom-3">
          {/* AI Assistant */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenGeminiModal();
            }}
            className="flex items-center gap-2 bg-[#111318] text-white px-3.5 py-2.5 rounded-2xl shadow-lg border border-zinc-700 text-xs font-bold active:scale-95 transition-transform cursor-pointer"
          >
            <Bot className="w-4 h-4 text-[#DC2626]" />
            <span>المساعد الذكي</span>
            <span className="text-[9px] bg-[#DC2626] text-white font-black px-1.5 py-0.2 rounded font-mono">
              AI
            </span>
          </button>

          {/* Sync Sheets */}
          {canSyncSheets && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSyncModal();
              }}
              className="flex items-center gap-2 bg-white text-[#111318] px-3.5 py-2.5 rounded-2xl shadow-lg border border-zinc-200 text-xs font-bold active:scale-95 transition-transform cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-[#DC2626]" />
              <span>سحب Sheets</span>
            </button>
          )}

          {/* Add Applicant Manual */}
          {canAddApplicant && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenAddModal();
              }}
              className="flex items-center gap-2 bg-[#DC2626] text-white px-3.5 py-2.5 rounded-2xl shadow-lg border border-red-500 text-xs font-black active:scale-95 transition-transform cursor-pointer"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>إدخال طلب جديد</span>
            </button>
          )}
        </div>
      )}

      {/* Main Floating Action Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer border ${
          isOpen
            ? 'bg-[#111318] text-white border-zinc-700 rotate-45'
            : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-red-500/40'
        }`}
        aria-label="إجراء سريع"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
