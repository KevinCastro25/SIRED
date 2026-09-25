import { useState, useEffect } from 'react';
import { CalendarView } from './components/CalendarView.tsx';
import { MetricCards } from './components/MetricCards.tsx';
import { BotSimulatorModal } from './components/BotSimulatorModal.tsx';
import { NewBookingModal } from './components/NewBookingModal.tsx';
import { NewComplejoModal } from './components/NewComplejoModal.tsx';
import { Cancha, Reserva, Metricas, Complejo } from './types.ts';
import { supabase } from './config/supabase.ts';
import { MessageSquare, RefreshCw, Trophy, BellRing, Building2, PlusCircle, Phone } from 'lucide-react';

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

  const [simuladorAbierto, setSimuladorAbierto] = useState(false);
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
          setComplejoActualId(data[0].id);
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

  const complejoActivo = complejos.find((c) => c.id === complejoActualId) || complejos[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                SIRED • Visor de Reservas
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Multi-empresa
                </span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Base de Datos PostgreSQL (Supabase)
              </p>
            </div>
          </div>

          {/* Selector de Empresa Multi-tenant */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
              <Building2 className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
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

            <button
              onClick={() => setModalComplejoAbierto(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
              title="Registrar una nueva empresa en el sistema"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Nueva Empresa</span>
            </button>

            <button
              onClick={() => cargarDatos()}
              disabled={actualizando}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${actualizando ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={() => setSimuladorAbierto(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition transform active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Canal WhatsApp</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* Banner de información de la empresa activa */}
        <div className="mb-6 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                {complejoActivo?.nombre || 'Complejo Deportivo'}
                {complejoActivo?.ciudad && (
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-normal border border-slate-700">
                    {complejoActivo.ciudad}
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-300">
                  <Phone className="w-3 h-3" /> WhatsApp: {complejoActivo?.telefono_whatsapp || 'Oficial Meta Cloud API'}
                </span>
                {complejoActivo?.nequi_numero && (
                  <span className="text-slate-400">• Nequi/Daviplata: {complejoActivo.nequi_numero}</span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <span>Horario: {complejoActivo?.hora_apertura || '06:00'} - {complejoActivo?.hora_cierre || '23:00'}</span>
          </div>
        </div>

        <MetricCards metricas={metricas} />

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

      <BotSimulatorModal
        isOpen={simuladorAbierto}
        onClose={() => setSimuladorAbierto(false)}
        onReservaCreada={() => cargarDatos()}
        complejoSeleccionado={complejoActivo}
      />

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
