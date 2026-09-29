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
  IconBuilding,
  IconArrowBackUp,
} from '@tabler/icons-react';

interface Props {
  complejos: Complejo[];
  onLogin: (perfil: PerfilUsuario) => void;
  complejoActivo?: Complejo;
  slugRuta?: string;
}

export const LoginScreen: React.FC<Props> = ({
  complejos,
  onLogin,
  complejoActivo,
  slugRuta,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si estamos en una ruta de negocio específico (ej: /el-diamante, /barberia-royal)
  const esLoginNegocio = Boolean(slugRuta && complejoActivo && complejoActivo.slug === slugRuta);

  const getRubroInfo = (tipo?: string) => {
    switch (tipo) {
      case 'barberia':
        return { icon: '💈', label: 'Barbería / Peluquería', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'belleza_unas':
        return { icon: '💅', label: 'Spa de Uñas & Estética', color: 'bg-pink-50 text-pink-800 border-pink-200' };
      case 'salud':
        return { icon: '🩺', label: 'Consultorio Médico', color: 'bg-teal-50 text-teal-800 border-teal-200' };
      default:
        return { icon: '⚽', label: 'Complejo Deportivo', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
  };

  const rubroActual = getRubroInfo(complejoActivo?.tipo_negocio);

  // SuperAdmin maestro
  const perfilSuperAdmin: PerfilUsuario = {
    id: 'usr-superadmin-01',
    email: 'superadmin@sired.com',
    nombre: 'Kevin Castro',
    rol: 'superadmin',
    complejo_id: undefined,
  };

  const handleLoginManual = (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    setTimeout(() => {
      setCargando(false);
      if (email.toLowerCase().includes('superadmin') || (!esLoginNegocio && email.includes('kevin'))) {
        onLogin(perfilSuperAdmin);
      } else if (esLoginNegocio && complejoActivo) {
        // En login por slug, vincular directamente al negocio activo
        onLogin({
          id: `usr-${complejoActivo.id}-${Date.now()}`,
          email: email || `admin@${complejoActivo.slug || 'empresa'}.com`,
          nombre: email.split('@')[0] || `Admin ${complejoActivo.nombre}`,
          rol: 'admin_complejo',
          complejo_id: complejoActivo.id,
          complejos: complejoActivo,
        });
      } else {
        // En portal general, tomar el primer complejo o superadmin
        onLogin({
          id: 'usr-custom-' + Date.now(),
          email,
          nombre: email.split('@')[0],
          rol: email.includes('admin') ? 'admin_complejo' : 'superadmin',
          complejo_id: complejos[0]?.id,
          complejos: complejos[0],
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
        {/* Cabecera Dinámica */}
        {esLoginNegocio && complejoActivo ? (
          <div className="flex flex-col items-center justify-center text-center space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              SIRED Cloud SaaS
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{rubroActual.icon}</span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {complejoActivo.nombre}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rubroActual.color}`}>
                {rubroActual.label}
              </span>
              {complejoActivo.ciudad && (
                <span className="text-xs text-slate-500 font-medium">
                  {complejoActivo.ciudad}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <BrandLogo size="lg" theme="light" className="justify-center" />
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Plataforma de Agendamiento Inteligente & Cobro por WhatsApp
            </p>
          </div>
        )}

        {/* Tarjeta Principal de Inicio de Sesión */}
        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconLock className="w-4 h-4 text-emerald-600" />
              {esLoginNegocio && complejoActivo
                ? `Acceso Administrativo`
                : 'Iniciar Sesión'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {esLoginNegocio && complejoActivo
                ? `Ingresa con tu cuenta de recepcionista o administrador de ${complejoActivo.nombre}.`
                : 'Ingresa tus credenciales o accede con tu rol autorizado.'}
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
                  placeholder={
                    esLoginNegocio && complejoActivo
                      ? `admin@${complejoActivo.slug || 'negocio'}.com`
                      : 'usuario@empresa.com'
                  }
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
              <span>
                {cargando
                  ? 'Verificando...'
                  : esLoginNegocio && complejoActivo
                  ? `Entrar a ${complejoActivo.nombre}`
                  : 'Entrar al Panel'}
              </span>
              <IconArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Separador */}
          <div className="relative flex items-center justify-center pt-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              o acceso rápido demo
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* Tarjetas de Acceso Rápido */}
          <div className="space-y-2">
            {esLoginNegocio && complejoActivo ? (
              // Acceso directo al negocio específico del slug
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={() =>
                  onLogin({
                    id: `usr-admin-${complejoActivo.id}`,
                    email: `admin@${complejoActivo.slug || 'negocio'}.com`,
                    nombre: `Admin ${complejoActivo.nombre}`,
                    rol: 'admin_complejo',
                    complejo_id: complejoActivo.id,
                    complejos: complejoActivo,
                  })
                }
                className="w-full text-left p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 transition group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-lg">
                    {rubroActual.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 transition">
                        Administrador
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                        {complejoActivo.nombre}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Entrar directamente a la agenda y caja de este negocio.
                    </p>
                  </div>
                </div>
                <IconArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </motion.button>
            ) : (
              // Acceso SuperAdmin
              <>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={() => onLogin(perfilSuperAdmin)}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 transition group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center">
                      <IconCrown className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-amber-900 transition">
                          Kevin Castro
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
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

                {/* Accesos rápidos a los negocios disponibles */}
                {complejos.slice(0, 3).map((comp) => {
                  const info = getRubroInfo(comp.tipo_negocio);
                  return (
                    <motion.button
                      key={comp.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={() =>
                        onLogin({
                          id: `usr-admin-${comp.id}`,
                          email: `admin@${comp.slug || 'empresa'}.com`,
                          nombre: `Admin ${comp.nombre}`,
                          rol: 'admin_complejo',
                          complejo_id: comp.id,
                          complejos: comp,
                        })
                      }
                      className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{info.icon}</span>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">
                            {comp.nombre}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {comp.ciudad || info.label}
                          </span>
                        </div>
                      </div>
                      <IconArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition" />
                    </motion.button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Enlaces de pie de navegación */}
        <div className="flex flex-col items-center gap-2 text-xs">
          {esLoginNegocio ? (
            <button
              onClick={() => {
                window.history.pushState(null, '', '/');
                window.location.reload();
              }}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition"
            >
              <IconArrowBackUp className="w-3.5 h-3.5" />
              <span>¿Eres SuperAdmin? Entrar al Portal Maestro</span>
            </button>
          ) : (
            <div className="text-slate-400 text-[11px] flex items-center gap-1 font-mono">
              <IconBuilding className="w-3.5 h-3.5" />
              <span>Multi-Tenant Architecture • SIRED Cloud</span>
            </div>
          )}

          <div className="text-center text-slate-500 flex items-center justify-center gap-1.5 pt-1 text-[11px]">
            <IconShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Datos blindados con Row Level Security (RLS) & PostgreSQL</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
