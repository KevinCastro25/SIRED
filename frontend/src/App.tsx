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
import { RefreshCw, Building2, PlusCircle, Phone, LogOut } from 'lucide-react';

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
  const [pestanaActiva, setPestanaActiva] = useState<'calendario' | 'metricas'>('calendario');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Barra de Navegación Superior Limpia */}
      <header className="bg-white sticky top-0 z-40 px-6 py-2.5 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo y Empresa Activa */}
          <div className="flex items-center gap-4">
            <BrandLogo size="md" theme="light" />
            
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Selector de Empresa para SuperAdmin o Badge de Club */}
            {esSuperAdmin ? (
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs">
                <Building2 className="w-4 h-4 text-emerald-700 mr-2 shrink-0" />
                <select
                  value={complejoActualId}
                  onChange={(e) => setComplejoActualId(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer pr-1"
                >
                  {complejos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.ciudad ? `(${c.ciudad})` : ''}
                    </option>
                  ))}
                  {complejos.length === 0 && (
                    <option value="">Cargando empresas...</option>
                  )}
                </select>
              </div>
            ) : (
              <div className="flex items-center bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-3 py-1 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5 text-emerald-700 mr-1.5 shrink-0" />
                <span>{complejoActivo?.nombre || 'Mi Complejo'}</span>
              </div>
            )}
          </div>

          {/* Navegación por Pestañas Central: Calendario vs Estadísticas */}
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setPestanaActiva('calendario')}
              className={`px-4 py-1.5 rounded-lg transition flex items-center gap-2 ${
                pestanaActiva === 'calendario'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📅</span>
              <span>Turnos & Calendario</span>
            </button>
            <button
              onClick={() => setPestanaActiva('metricas')}
              className={`px-4 py-1.5 rounded-lg transition flex items-center gap-2 ${
                pestanaActiva === 'metricas'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📊</span>
              <span>Métricas & Caja</span>
            </button>
          </nav>

          {/* Acciones y Perfil */}
          <div className="flex items-center gap-2.5">
            {esSuperAdmin && (
              <button
                onClick={() => setModalComplejoAbierto(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition"
                title="Registrar una nueva empresa"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Nueva Empresa</span>
              </button>
            )}

            <button
              onClick={() => cargarDatos()}
              disabled={actualizando}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actualizando ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Perfil & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-bold text-slate-800">{usuarioActual.nombre}</span>
                <span className="text-[10px] text-slate-500 capitalize">
                  {esSuperAdmin ? 'SuperAdmin' : 'Administrador'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl border border-slate-200 hover:border-rose-200 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal Limpio */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* PESTAÑA 1: CALENDARIO DE CANCHAS (Limpieza total, sin saturación) */}
        {pestanaActiva === 'calendario' && (
          <div className="space-y-4">
            {/* Barra informativa minimalista y limpia */}
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900 text-sm">{complejoActivo?.nombre}</span>
                {complejoActivo?.telefono_whatsapp && (
                  <span className="text-slate-500 flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> {complejoActivo.telefono_whatsapp}
                  </span>
                )}
                {complejoActivo?.nequi_numero && (
                  <span className="text-slate-500 hidden sm:inline">
                    • Nequi/Davi: <strong className="text-slate-800 font-mono">{complejoActivo.nequi_numero}</strong>
                  </span>
                )}
              </div>
              <div className="text-slate-500 font-mono">
                Horario: {complejoActivo?.hora_apertura?.slice(0, 5) || '06:00'} - {complejoActivo?.hora_cierre?.slice(0, 5) || '23:00'}
              </div>
            </div>

            {canchas.length > 0 ? (
              <CalendarView
                canchas={canchas}
                reservas={reservas}
                fechaSeleccionada={fechaSeleccionada}
                onCambiarFecha={setFechaSeleccionada}
                onSeleccionarTurno={handleSeleccionarTurno}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                <p className="text-slate-600 text-sm">
                  No hay canchas registradas para <strong className="text-slate-900">{complejoActivo?.nombre || 'esta empresa'}</strong>.
                </p>
                <button
                  onClick={() => cargarDatos()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  Reintentar Conexión
                </button>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: MÉTRICAS Y ESTADÍSTICAS (Espacio dedicado para análisis) */}
        {pestanaActiva === 'metricas' && (
          <div className="space-y-6">
            <MetricCards metricas={metricas} />

            <AnalyticsCharts
              canchas={canchas}
              reservas={reservas}
              metricas={metricas}
              nombreComplejo={complejoActivo?.nombre || 'Complejo Deportivo'}
            />
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
