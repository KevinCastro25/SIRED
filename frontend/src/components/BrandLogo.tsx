import React from 'react';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<Props> = ({ className = '', size = 'md', showSubtitle = true }) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconSize = isSm ? 'w-8 h-8' : isLg ? 'w-14 h-14' : 'w-10 h-10';
  const titleSize = isSm ? 'text-sm' : isLg ? 'text-2xl' : 'text-lg';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Isotipo Vectorial Deportivo Personalizado (Cancha Dinámica + Trayectoria Neón) */}
      <div className={`relative ${iconSize} shrink-0 group`}>
        {/* Resplandor ambiental de estadio */}
        <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500" />

        {/* Emblema Principal */}
        <div className="relative w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-400/40 rounded-2xl p-1.5 flex items-center justify-center shadow-inner overflow-hidden">
          {/* Trazado geométrico del campo deportivo */}
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <linearGradient id="siredTurf" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="ballGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#67e8f9" />
              </linearGradient>
            </defs>

            {/* Perímetro de la cancha estilizada en perspectiva isométrica */}
            <rect x="6" y="8" width="36" height="32" rx="4" stroke="url(#siredTurf)" strokeWidth="2.5" strokeOpacity="0.8" />
            
            {/* Círculo central y línea divisoria */}
            <line x1="6" y1="24" x2="42" y2="24" stroke="url(#siredTurf)" strokeWidth="2" strokeOpacity="0.6" strokeDasharray="2 2" />
            <circle cx="24" cy="24" r="7" stroke="url(#siredTurf)" strokeWidth="2" strokeOpacity="0.8" />
            
            {/* Vórtice dinámico de reserva / movimiento */}
            <path
              d="M12 36C16 28 28 16 38 12"
              stroke="url(#ballGlow)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            {/* Esfera deportiva brillante */}
            <circle cx="38" cy="12" r="3.5" fill="#34d399" />
            <circle cx="38" cy="12" r="1.5" fill="#ffffff" />
          </svg>
        </div>
      </div>

      {/* Logotipo Tipográfico */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight text-white ${titleSize} font-sans`}>
            SIRED
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        {showSubtitle && (
          <span className="text-[9px] font-bold tracking-widest text-emerald-400/90 uppercase mt-0.5 font-mono">
            Sports Intelligence
          </span>
        )}
      </div>
    </div>
  );
};
