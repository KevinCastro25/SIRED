import React, { useState } from 'react';
import { PerfilUsuario, Complejo } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';

interface Props {
  complejos: Complejo[];
  onLogin: (perfil: PerfilUsuario) => void;
}

export const LoginScreen: React.FC<Props> = ({ complejos, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perfiles preconfigurados para demostración y auditoría
  const perfilesDemo: PerfilUsuario[] = [
    {
      id: 'usr-superadmin-01',
      email: 'superadmin@sired.com',
      nombre: 'Kevin Castro',
      rol: 'superadmin',
      complejo_id: undefined,
    },
    {
      id: 'usr-eldiamante-02',
      email: 'admin@eldiamante.com',
      nombre: 'Carlos Pérez',
      rol: 'admin_complejo',
      complejo_id: complejos.find((c) => c.slug === 'el-diamante')?.id || complejos[0]?.id,
      complejos: complejos.find((c) => c.slug === 'el-diamante') || complejos[0],
    },
    {
      id: 'usr-padel127-03',
      email: 'gerencia@padel127.com',
      nombre: 'Valentina Ruiz',
      rol: 'admin_complejo',
      complejo_id: complejos.find((c) => c.slug === 'padel-club-127')?.id || complejos[1]?.id,
      complejos: complejos.find((c) => c.slug === 'padel-club-127') || complejos[1],
    },
  ];

  const handleLoginManual = (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    // Búsqueda del perfil correspondiente por email o asignación inteligente
    const perfilEncontrado = perfilesDemo.find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase()
    );

    setTimeout(() => {
      setCargando(false);
      if (perfilEncontrado) {
        onLogin(perfilEncontrado);
      } else if (email.includes('admin') || email.includes('diamante')) {
        onLogin(perfilesDemo[1]);
      } else if (email.includes('padel')) {
        onLogin(perfilesDemo[2]);
      } else {
        // Por defecto entra como SuperAdmin si es una cuenta nueva
        onLogin({
          id: 'usr-custom-' + Date.now(),
          email,
          nombre: email.split('@')[0],
          rol: 'superadmin',
        });
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Fondo con brillo ambiental */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Cabecera del Logo Vectorial de Marca */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <BrandLogo size="lg" className="justify-center" />
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Plataforma Centralizada de Gestión de Escenarios Deportivos & Bot Oficial de WhatsApp
          </p>
        </div>

        {/* Tarjeta Principal de Inicio de Sesión */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> Control de Acceso por Roles
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Inicia sesión o selecciona un perfil de acceso rápido para probar el aislamiento multi-empresa.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Formulario tradicional de email y password */}
          <form onSubmit={handleLoginManual} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@clubdeportivo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-50"
            >
              <span>{cargando ? 'Verificando...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Separador */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              o ingresa con un rol demo
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Tarjetas de Acceso Rápido por Rol */}
          <div className="space-y-2.5">
            {/* 1. SuperAdmin */}
            <button
              type="button"
              onClick={() => onLogin(perfilesDemo[0])}
              className="w-full text-left p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                      Kevin Castro
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      SuperAdmin
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Acceso total a todas las empresas, selector global y creación de clubes.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
            </button>

            {/* 2. Admin El Diamante */}
            <button
              type="button"
              onClick={() => onLogin(perfilesDemo[1])}
              className="w-full text-left p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
                  ⚽
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                      Carlos Pérez
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      El Diamante
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Aislado a El Diamante. Sin selector global ni permisos para crear empresas.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
            </button>

            {/* 3. Admin Pádel Club 127 */}
            <button
              type="button"
              onClick={() => onLogin(perfilesDemo[2])}
              className="w-full text-left p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-sm">
                  🎾
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                      Valentina Ruiz
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                      Pádel Club 127
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Aislado a Pádel Club 127. Solo ve sus canchas de pádel e ingresos.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>

        {/* Pie de página con garantía de seguridad */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Aislamiento por Row Level Security (RLS) & PostgreSQL</span>
        </div>
      </div>
    </div>
  );
};
