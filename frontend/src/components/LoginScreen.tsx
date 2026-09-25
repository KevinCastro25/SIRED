import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PerfilUsuario, Complejo } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';
import {
  IconLock,
  IconMail,
  IconArrowRight,
  IconShieldCheck,
  IconCrown,
  IconBallFootball,
  IconBallTennis,
} from '@tabler/icons-react';

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
        onLogin({
          id: 'usr-custom-' + Date.now(),
          email,
          nombre: email.split('@')[0],
          rol: 'superadmin',
        });
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md z-10 space-y-6"
      >
        {/* Cabecera del Logo */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <BrandLogo size="lg" theme="light" className="justify-center" />
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            Plataforma Integral de Gestión de Canchas Deportivas & Atención WhatsApp
          </p>
        </div>

        {/* Tarjeta Principal de Inicio de Sesión */}
        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconLock className="w-4 h-4 text-emerald-600" /> Iniciar Sesión
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingresa tus credenciales o elige un rol demo para explorar el panel.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Formulario de email y password */}
          <form onSubmit={handleLoginManual} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <IconMail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@complejodeportivo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <IconLock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{cargando ? 'Ingresando...' : 'Entrar al Panel'}</span>
              <IconArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Separador */}
          <div className="relative flex items-center justify-center pt-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              o prueba un rol demo
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Tarjetas de Acceso Rápido por Rol */}
          <div className="space-y-2">
            {/* 1. SuperAdmin */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => onLogin(perfilesDemo[0])}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xs">
                  <IconCrown className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-amber-900 transition">
                      Kevin Castro
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                      SuperAdmin
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Control maestro de todas las empresas y sedes.
                  </p>
                </div>
              </div>
              <IconArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
            </motion.button>

            {/* 2. Admin El Diamante */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => onLogin(perfilesDemo[1])}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                  <IconBallFootball className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 transition">
                      Carlos Pérez
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                      El Diamante
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Aislado a su club: reservas, canchas de fútbol y caja.
                  </p>
                </div>
              </div>
              <IconArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
            </motion.button>

            {/* 3. Admin Pádel Club 127 */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => onLogin(perfilesDemo[2])}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-cyan-50/60 border border-slate-200 hover:border-cyan-300 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 border border-cyan-200 flex items-center justify-center font-bold text-xs">
                  <IconBallTennis className="w-4 h-4 text-cyan-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-cyan-900 transition">
                      Valentina Ruiz
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 font-semibold border border-cyan-200">
                      Pádel Club 127
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Aislado a Pádel Club 127: solo sus pistas e ingresos.
                  </p>
                </div>
              </div>
              <IconArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition" />
            </motion.button>
          </div>
        </div>

        {/* Pie de página con garantía de seguridad */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <IconShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Aislamiento por Row Level Security (RLS) & PostgreSQL</span>
        </div>
      </motion.div>
    </div>
  );
};
