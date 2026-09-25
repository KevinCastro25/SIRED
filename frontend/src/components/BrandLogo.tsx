import React from 'react';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  theme?: 'light' | 'dark';
}

export const BrandLogo: React.FC<Props> = ({ className = '', size = 'md', showSubtitle = true, theme = 'light' }) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  const isLight = theme === 'light';

  const iconSize = isSm ? 'w-8 h-8' : isLg ? 'w-12 h-12' : 'w-9 h-9';
  const titleSize = isSm ? 'text-sm' : isLg ? 'text-2xl' : 'text-lg';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Isotipo Vectorial Deportivo Limpio */}
      <div className={`relative ${iconSize} shrink-0`}>
        <div className="w-full h-full bg-emerald-600 rounded-xl p-1.5 flex items-center justify-center shadow-sm">
          {/* Trazado geométrico del campo deportivo */}
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
            <rect x="6" y="8" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.9" />
            <line x1="6" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="2" strokeOpacity="0.7" strokeDasharray="2 2" />
            <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9" />
            <path
              d="M12 36C16 28 28 16 38 12"
              stroke="#6ee7b7"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="38" cy="12" r="3" fill="#ffffff" />
          </svg>
        </div>
      </div>

      {/* Logotipo Tipográfico */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'} ${titleSize} font-sans`}>
            SIRED
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        </div>
        {showSubtitle && (
          <span className={`text-[9px] font-bold tracking-wider ${isLight ? 'text-slate-500' : 'text-emerald-400'} uppercase mt-0.5`}>
            Gestión Deportiva
          </span>
        )}
      </div>
    </div>
  );
};
