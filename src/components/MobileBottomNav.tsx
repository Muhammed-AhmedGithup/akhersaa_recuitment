import React from 'react';
import {
  Zap,
  BarChart3,
  Menu,
  Users,
  Bot,
} from 'lucide-react';

export type MobileTab = 'applicants' | 'pending' | 'ai' | 'stats' | 'menu';

interface MobileBottomNavProps {
  currentTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onOpenGeminiModal: () => void;
  pendingCount: number;
  unreadNotificationsCount: number;
  totalApplicantsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenGeminiModal,
  pendingCount,
  unreadNotificationsCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-zinc-200 shadow-[0_-4px_20px_rgba(17,19,24,0.08)] md:hidden pb-safe">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1 items-center">
        {/* Tab 1: Applicants */}
        <button
          type="button"
          onClick={() => onSelectTab('applicants')}
          className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 gap-1 transition-all duration-150 active:scale-95 cursor-pointer ${
            currentTab === 'applicants'
              ? 'text-[#DC2626] font-black'
              : 'text-zinc-500 hover:text-[#111318] font-medium'
          }`}
        >
          <Users className={`w-5 h-5 ${currentTab === 'applicants' ? 'stroke-[2.5] text-[#DC2626]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight">الطلبات</span>
          {currentTab === 'applicants' && (
            <span className="absolute top-0 w-8 h-0.5 bg-[#DC2626] rounded-full" />
          )}
        </button>

        {/* Tab 2: Pending Decisions for Me */}
        <button
          type="button"
          onClick={() => onSelectTab('pending')}
          className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 gap-1 transition-all duration-150 active:scale-95 cursor-pointer ${
            currentTab === 'pending'
              ? 'text-[#DC2626] font-black'
              : 'text-zinc-500 hover:text-[#111318] font-medium'
          }`}
        >
          <div className="relative">
            <Zap className={`w-5 h-5 ${currentTab === 'pending' ? 'stroke-[2.5] text-[#DC2626]' : 'stroke-2'}`} />
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#DC2626] text-white font-mono text-[9px] font-black flex items-center justify-center tabular-nums shadow-xs">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">قراراتي</span>
          {currentTab === 'pending' && (
            <span className="absolute top-0 w-8 h-0.5 bg-[#DC2626] rounded-full" />
          )}
        </button>

        {/* Tab 3 (Center): AI Assistant */}
        <button
          type="button"
          onClick={onOpenGeminiModal}
          className="relative flex flex-col items-center justify-center -top-2 transition-all duration-200 active:scale-95 cursor-pointer group"
          title="المساعد الذكي (AI) لإدارة التوظيف"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#111318] flex items-center justify-center text-white shadow-lg shadow-zinc-950/25 border-2 border-white ring-2 ring-[#DC2626]/70 group-hover:scale-105 transition-transform duration-200">
            <Bot className="w-6 h-6 text-[#DC2626]" />
          </div>
          <span className="text-[10px] font-black text-[#111318] mt-0.5">
            مساعد AI
          </span>
        </button>

        {/* Tab 4: Stats */}
        <button
          type="button"
          onClick={() => onSelectTab('stats')}
          className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 gap-1 transition-all active:scale-95 cursor-pointer ${
            currentTab === 'stats'
              ? 'text-[#DC2626] font-black'
              : 'text-zinc-500 hover:text-[#111318] font-medium'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${currentTab === 'stats' ? 'stroke-[2.5] text-[#DC2626]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight">إحصائيات</span>
          {currentTab === 'stats' && (
            <span className="absolute top-0 w-8 h-0.5 bg-[#DC2626] rounded-full" />
          )}
        </button>

        {/* Tab 5: Menu / More */}
        <button
          type="button"
          onClick={() => onSelectTab('menu')}
          className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 gap-1 transition-all active:scale-95 cursor-pointer ${
            currentTab === 'menu'
              ? 'text-[#DC2626] font-black'
              : 'text-zinc-500 hover:text-[#111318] font-medium'
          }`}
        >
          <div className="relative">
            <Menu className={`w-5 h-5 ${currentTab === 'menu' ? 'stroke-[2.5] text-[#DC2626]' : 'stroke-2'}`} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626] ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">المزيد</span>
          {currentTab === 'menu' && (
            <span className="absolute top-0 w-8 h-0.5 bg-[#DC2626] rounded-full" />
          )}
        </button>
      </div>
    </nav>
  );
};
