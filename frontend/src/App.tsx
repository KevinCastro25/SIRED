import { useState, useEffect } from 'react';
import { CalendarView } from './components/CalendarView.tsx';
import { MetricCards } from './components/MetricCards.tsx';
import { BotSimulatorModal } from './components/BotSimulatorModal.tsx';
import { NewBookingModal } from './components/NewBookingModal.tsx';
import { Cancha, Reserva, Metricas } from './types.ts';
import { supabase } from './config/supabase.ts';
import { MessageSquare, RefreshCw, Trophy, BellRing } from 'lucide-react';

export function App() {
  const hoyIso = new Date().toISOString().split('T')[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyIso);
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
  const [canchaSeleccionadaModal, setCanchaSeleccionadaModal] = useState<Cancha | undefined>();
  const [horaInicioModal, setHoraInicioModal] = useState<string | undefined>();
  const [horaFinModal, setHoraFinModal] = useState<string | undefined>();
  const [reservaExistenteModal, setReservaExistenteModal] = useState<Reserva | undefined>();
  const [actualizando, setActualizando] = useState(false);

  const cargarDatos = async () => {
    setActualizando(true);
    try {
      const [resCanchas, resReservas, resMetricas] = await Promise.all([
        fetch('/api/canchas'),
        fetch('/api/reservas'),
        fetch('/api/metricas'),
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

  useEffect(() => {
    cargarDatos();

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
  }, [fechaSeleccionada]);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                Panel de Gestión de Reservas
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  En Vivo
                </span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Base de Datos PostgreSQL (Supabase)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cargarDatos}
              disabled={actualizando}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refrescar datos de la base de datos"
            >
              <RefreshCw className={`w-4 h-4 ${actualizando ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={() => setSimuladorAbierto(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition transform active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Abrir Canal WhatsApp</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <div className="mb-6 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Canal de WhatsApp y Gestión en Tiempo Real</h4>
              <p className="text-xs text-slate-300">
                Los turnos reservados por WhatsApp o desde este visor se sincronizan al instante en tu base de datos de Supabase.
              </p>
            </div>
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
              Cargando canchas desde tu base de datos... Si es la primera vez, asegúrate de haber ejecutado el script <code className="text-emerald-400 font-mono">schema.sql</code> en el SQL Editor de Supabase y de tener el backend corriendo.
            </p>
            <button
              onClick={cargarDatos}
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
        onReservaCreada={cargarDatos}
      />

      <NewBookingModal
        isOpen={modalTurnoAbierto}
        onClose={() => setModalTurnoAbierto(false)}
        cancha={canchaSeleccionadaModal}
        horaInicio={horaInicioModal}
        horaFin={horaFinModal}
        fechaSeleccionada={fechaSeleccionada}
        reservaExistente={reservaExistenteModal}
        onGuardar={cargarDatos}
      />
    </div>
  );
}

export default App;
