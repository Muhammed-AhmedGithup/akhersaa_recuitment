import React from 'react';

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'compact' | 'banner';
  theme?: 'light' | 'dark';
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  theme = 'light',
}) => {
  const officialLogoPath = '/assets/aistudio/akher_saa_special_symbol_only_5dcc4516.png';

  if (variant === 'banner') {
    const bannerHeight =
      size === 'sm' ? 'h-8' : size === 'lg' ? 'h-14 sm:h-16' : size === 'xl' ? 'h-16 sm:h-20' : 'h-10 sm:h-12';
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src={officialLogoPath}
          alt="شعار شركة أخر ساعة اسبيشيال منذ 1960"
          className={`${bannerHeight} w-auto object-contain rounded-xl drop-shadow-sm`}
        />
      </div>
    );
  }

  const iconSize = size === 'sm' ? 36 : size === 'lg' ? 54 : size === 'xl' ? 62 : 42;
  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center gap-2.5 select-none min-w-0 ${className}`}>
      {/* Official Akher Sa'a Special Symbol */}
      <div
        className={`relative flex items-center justify-center rounded-xl flex-shrink-0 p-1 overflow-hidden transition-transform hover:scale-[1.03] duration-200 ${
          isDark
            ? 'bg-white border border-zinc-700 ring-1 ring-white/15 shadow-sm'
            : 'bg-white border border-zinc-200 ring-1 ring-red-100 shadow-2xs'
        }`}
        style={{ width: iconSize, height: iconSize }}
        title="شركة أخر ساعة اسبيشيال منذ 1960"
      >
        <img
          src={officialLogoPath}
          alt="شعار شركة أخر ساعة اسبيشيال"
          className="w-full h-full object-contain"
        />
      </div>

      {variant !== 'icon' && (
        <div className="flex flex-col leading-tight min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-sm sm:text-base font-black tracking-tight truncate ${
                isDark ? 'text-white' : 'text-[#111318]'
              }`}
            >
              شركة أخر ساعة
            </span>
            <span
              className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md bg-[#DC2626] text-white shadow-2xs"
            >
              اسبيشيال
            </span>
          </div>
          {variant !== 'compact' && (
            <span
              className={`text-[10px] sm:text-[11px] font-semibold truncate mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              أول مصنع حلويات في الصعيد منذ 1960 · منظومة التوظيف
            </span>
          )}
        </div>
      )}
    </div>
  );
};
