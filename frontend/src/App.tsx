import { useState, useEffect } from 'react';
import { CalendarView } from './components/CalendarView.tsx';
import { MetricCards } from './components/MetricCards.tsx';
import { AnalyticsCharts } from './components/AnalyticsCharts.tsx';
import { NewBookingModal } from './components/NewBookingModal.tsx';
import { NewComplejoModal } from './components/NewComplejoModal.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { Cancha, Reserva, Metricas, Complejo, PerfilUsuario } from './types.ts';
import { supabase } from './config/supabase.ts';
import { BrandLogo } from './components/BrandLogo.tsx';
import { RefreshCw, BellRing, Building2, PlusCircle, Phone, LogOut } from 'lucide-react';

export function App() {
  const hoyIso = new Date().toISOString().split('T')[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyIso);
  const [complejos, setComplejos] = useState<Complejo[]>([]);
  const [complejoActualId, setComplejoActualId] = useState<string>('');
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [metricas, setMetricas] = useState<Metricas>({
    total_reservas: 0,
    reservas_confirmadas: 0,
    ingresos_estimados: 0,
    anticipos_recaudados: 0,
  });

  // Estado de Autenticación y Control de Roles
  const [usuarioActual, setUsuarioActual] = useState<PerfilUsuario | null>(() => {
    try {
      const guardado = localStorage.getItem('sired_usuario');
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const [modalTurnoAbierto, setModalTurnoAbierto] = useState(false);
  const [modalComplejoAbierto, setModalComplejoAbierto] = useState(false);
  const [canchaSeleccionadaModal, setCanchaSeleccionadaModal] = useState<Cancha | undefined>();
  const [horaInicioModal, setHoraInicioModal] = useState<string | undefined>();
  const [horaFinModal, setHoraFinModal] = useState<string | undefined>();
  const [reservaExistenteModal, setReservaExistenteModal] = useState<Reserva | undefined>();
  const [actualizando, setActualizando] = useState(false);

  // 1. Cargar lista de complejos / empresas
  const cargarComplejos = async () => {
    try {
      const res = await fetch('/api/complejos');
      if (res.ok) {
        const data: Complejo[] = await res.json();
        setComplejos(data || []);
        if (data.length > 0 && !complejoActualId) {
          // Si el usuario es de un complejo específico, forzar su empresa
          if (usuarioActual && usuarioActual.rol !== 'superadmin' && usuarioActual.complejo_id) {
            setComplejoActualId(usuarioActual.complejo_id);
          } else {
            setComplejoActualId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error cargando empresas:', err);
    }
  };

  // 2. Cargar canchas, reservas y métricas filtradas por la empresa seleccionada
  const cargarDatos = async (complejoId?: string) => {
    setActualizando(true);
    const targetComplejoId = complejoId || complejoActualId;
    const queryParam = targetComplejoId ? `?complejo_id=${targetComplejoId}` : '';

    try {
      const [resCanchas, resReservas, resMetricas] = await Promise.all([
        fetch(`/api/canchas${queryParam}`),
        fetch(`/api/reservas${queryParam}`),
        fetch(`/api/metricas${queryParam}`),
      ]);

      if (resCanchas.ok) {
        const dataCanchas = await resCanchas.json();
        setCanchas(dataCanchas || []);
      }

      if (resReservas.ok) {
        const dataReservas = await resReservas.json();
        setReservas(dataReservas || []);
      }

      if (resMetricas.ok) {
        const dataMetricas = await resMetricas.json();
        setMetricas(dataMetricas || {
          total_reservas: 0,
          reservas_confirmadas: 0,
          ingresos_estimados: 0,
          anticipos_recaudados: 0,
        });
      }
    } catch (err) {
      console.error('Error sincronizando con la base de datos:', err);
    } finally {
      setActualizando(false);
    }
  };

  // Carga inicial de empresas
  useEffect(() => {
    cargarComplejos();
  }, []);

  // Al cambiar la empresa o la fecha, refrescar los datos
  useEffect(() => {
    if (complejoActualId) {
      cargarDatos(complejoActualId);
    }
  }, [complejoActualId, fechaSeleccionada]);

  // Si cambia el usuario actual y tiene un complejo asignado, fijar ese complejo
  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== 'superadmin' && usuarioActual.complejo_id) {
      setComplejoActualId(usuarioActual.complejo_id);
    }
  }, [usuarioActual]);

  // Suscripción Realtime en Supabase
  useEffect(() => {
    const canal = supabase
      .channel('cambios-reservas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        () => {
          cargarDatos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [complejoActualId]);

  const handleSeleccionarTurno = (
    cancha: Cancha,
    horaInicio: string,
    horaFin: string,
    reservaExistente?: Reserva
  ) => {
    setCanchaSeleccionadaModal(cancha);
    setHoraInicioModal(horaInicio);
    setHoraFinModal(horaFin);
    setReservaExistenteModal(reservaExistente);
    setModalTurnoAbierto(true);
  };

  const handleLogin = (perfil: PerfilUsuario) => {
    setUsuarioActual(perfil);
    localStorage.setItem('sired_usuario', JSON.stringify(perfil));
    if (perfil.rol !== 'superadmin' && perfil.complejo_id) {
      setComplejoActualId(perfil.complejo_id);
    }
  };

  const handleLogout = () => {
    setUsuarioActual(null);
    localStorage.removeItem('sired_usuario');
  };

  // Si no hay sesión iniciada, mostrar pantalla de Login
  if (!usuarioActual) {
    return <LoginScreen complejos={complejos} onLogin={handleLogin} />;
  }

  const complejoActivo = complejos.find((c) => c.id === complejoActualId) || complejos[0];
  const esSuperAdmin = usuarioActual.rol === 'superadmin';

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Resplandor ambiental de estadio en la cabecera */}
      <div className="stadium-glow absolute top-0 left-0 right-0 h-96 pointer-events-none" />

      <header className="glass-panel sticky top-0 z-40 px-6 py-3 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div className="hidden sm:block h-6 w-px bg-slate-800 mx-1" />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              esSuperAdmin
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}>
              {esSuperAdmin ? '👑 SuperAdmin' : '🏢 Club Autorizado'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Si es SuperAdmin: Selector de Empresa Activa */}
            {esSuperAdmin ? (
              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
                <Building2 className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Empresa Activa</span>
                  <select
                    value={complejoActualId}
                    onChange={(e) => setComplejoActualId(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer pr-2"
                  >
                    {complejos.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.nombre} {c.ciudad ? `(${c.ciudad})` : ''}
                      </option>
                    ))}
                    {complejos.length === 0 && (
                      <option value="" className="bg-slate-900 text-slate-400">
                        Cargando empresas...
                      </option>
                    )}
                  </select>
                </div>
              </div>
            ) : (
              /* Si es Administrador de Club: Bloqueado a su empresa exclusiva */
              <div className="flex items-center bg-slate-800/90 border border-emerald-500/30 rounded-xl px-3.5 py-1.5 shadow-sm">
                <Building2 className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Empresa</span>
                  <span className="text-xs font-bold text-white">
                    {complejoActivo?.nombre || 'Mi Complejo'}
                  </span>
                </div>
              </div>
            )}

            {/* Botón "+ Nueva Empresa" visible ÚNICAMENTE para SuperAdmin */}
            {esSuperAdmin && (
              <button
                onClick={() => setModalComplejoAbierto(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
                title="Registrar una nueva empresa en el sistema (Solo SuperAdmin)"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Nueva Empresa</span>
              </button>
            )}

            <button
              onClick={() => cargarDatos()}
              disabled={actualizando}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${actualizando ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Perfil del usuario autenticado & Cerrar sesión */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-bold text-white">{usuarioActual.nombre}</span>
                <span className={`text-[10px] font-semibold ${esSuperAdmin ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {esSuperAdmin ? 'SuperAdmin' : 'Administrador'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 hover:border-rose-500/30 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* Banner de información de la empresa activa */}
        <div className="glass-panel rounded-2xl p-4.5 mb-6 flex flex-wrap items-center justify-between gap-4 border border-white/[0.08] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-20 bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3.5 z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-extrabold text-white tracking-tight">
                  {complejoActivo?.nombre || 'Complejo Deportivo'}
                </h4>
                {complejoActivo?.ciudad && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800/90 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700/80">
                    {complejoActivo.ciudad}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2.5 mt-0.5">
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-medium">
                  <Phone className="w-3.5 h-3.5" /> {complejoActivo?.telefono_whatsapp || 'Canal Oficial Meta'}
                </span>
                {complejoActivo?.nequi_numero && (
                  <span className="text-slate-400 flex items-center gap-1">
                    • Nequi/Davi: <strong className="text-slate-200 font-mono">{complejoActivo.nequi_numero}</strong>
                  </span>
                )}
                {complejoActivo?.titular_cuenta && (
                  <span className="text-slate-400 hidden md:inline">
                    ({complejoActivo.titular_cuenta})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right z-10">
            <span className="text-[11px] font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 inline-flex items-center gap-1.5 font-mono shadow-sm">
              <BellRing className="w-3 h-3 text-emerald-400" />
              {complejoActivo?.hora_apertura ? complejoActivo.hora_apertura.slice(0, 5) : '06:00'} - {complejoActivo?.hora_cierre ? complejoActivo.hora_cierre.slice(0, 5) : '23:00'}
            </span>
          </div>
        </div>

        <MetricCards metricas={metricas} />

        <AnalyticsCharts
          canchas={canchas}
          reservas={reservas}
          metricas={metricas}
          nombreComplejo={complejoActivo?.nombre || 'Complejo Deportivo'}
        />

        {canchas.length > 0 ? (
          <CalendarView
            canchas={canchas}
            reservas={reservas}
            fechaSeleccionada={fechaSeleccionada}
            onCambiarFecha={setFechaSeleccionada}
            onSeleccionarTurno={handleSeleccionarTurno}
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <p className="text-slate-400 text-sm">
              No hay canchas registradas para <strong className="text-white">{complejoActivo?.nombre || 'esta empresa'}</strong> o aún no se ha ejecutado la migración multi-tenant en Supabase.
            </p>
            <button
              onClick={() => cargarDatos()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              Reintentar Conexión
            </button>
          </div>
        )}
      </main>

      <NewBookingModal
        isOpen={modalTurnoAbierto}
        onClose={() => setModalTurnoAbierto(false)}
        cancha={canchaSeleccionadaModal}
        horaInicio={horaInicioModal}
        horaFin={horaFinModal}
        fechaSeleccionada={fechaSeleccionada}
        reservaExistente={reservaExistenteModal}
        onGuardar={() => cargarDatos()}
      />

      <NewComplejoModal
        isOpen={modalComplejoAbierto}
        onClose={() => setModalComplejoAbierto(false)}
        onComplejoCreado={(nuevo) => {
          setComplejos((prev) => [...prev, nuevo]);
          setComplejoActualId(nuevo.id);
        }}
      />
    </div>
  );
}

export default App;
