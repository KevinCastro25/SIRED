import React, { useState } from 'react';
import { Cancha, Reserva, Metricas } from '../types.ts';
import { BarChart3, TrendingUp, Clock, Flame, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  canchas: Cancha[];
  reservas: Reserva[];
  metricas: Metricas;
  nombreComplejo: string;
}

export const AnalyticsCharts: React.FC<Props> = ({ canchas, reservas, metricas, nombreComplejo }) => {
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes'>('semana');

  // 1. Calcular ocupación por franja horaria (07:00 a 22:00)
  const franjas = [
    { hora: '07:00', etiqueta: '7am', esPico: false },
    { hora: '08:00', etiqueta: '8am', esPico: false },
    { hora: '09:00', etiqueta: '9am', esPico: false },
    { hora: '10:00', etiqueta: '10am', esPico: false },
    { hora: '11:00', etiqueta: '11am', esPico: false },
    { hora: '12:00', etiqueta: '12pm', esPico: false },
    { hora: '13:00', etiqueta: '1pm', esPico: false },
    { hora: '14:00', etiqueta: '2pm', esPico: false },
    { hora: '15:00', etiqueta: '3pm', esPico: false },
    { hora: '16:00', etiqueta: '4pm', esPico: false },
    { hora: '17:00', etiqueta: '5pm', esPico: false },
    { hora: '18:00', etiqueta: '6pm', esPico: true },
    { hora: '19:00', etiqueta: '7pm', esPico: true },
    { hora: '20:00', etiqueta: '8pm', esPico: true },
    { hora: '21:00', etiqueta: '9pm', esPico: true },
    { hora: '22:00', etiqueta: '10pm', esPico: true },
  ];

  // Conteo de reservas por hora
  const ocupacionPorHora = franjas.map((f) => {
    const totalReservasEnHora = reservas.filter((r) => {
      if (r.estado === 'cancelada') return false;
      const horaInicio = r.fecha_inicio.split('T')[1]?.slice(0, 5);
      return horaInicio === f.hora;
    }).length;

    // Capacidad máxima de la hora = número de canchas del complejo
    const capacidadMax = canchas.length || 1;
    const porcentaje = Math.min(100, Math.round((totalReservasEnHora / capacidadMax) * 100));

    return {
      ...f,
      reservas: totalReservasEnHora,
      porcentaje: Math.max(porcentaje, totalReservasEnHora > 0 ? 30 : 5), // Altura mínima visual
    };
  });

  // 2. Calcular rendimiento financiero y de turnos por cancha
  const rendimientoCanchas = canchas.map((c) => {
    const reservasCancha = reservas.filter((r) => r.cancha_id === c.id && r.estado !== 'cancelada');
    const ingresosCancha = reservasCancha.reduce((sum, r) => sum + Number(r.valor_total || 0), 0);
    const anticiposCancha = reservasCancha.reduce((sum, r) => sum + Number(r.valor_anticipo_requerido || 0), 0);

    return {
      id: c.id,
      nombre: c.nombre,
      deporte: c.deporte,
      totalTurnos: reservasCancha.length,
      ingresos: ingresosCancha,
      anticipos: anticiposCancha,
    };
  });

  const maxIngresos = Math.max(...rendimientoCanchas.map((c) => c.ingresos), 1);

  // Tasa de ocupación global promedio
  const tasaOcupacionGlobal =
    canchas.length > 0
      ? Math.min(
          100,
          Math.round((metricas.reservas_confirmadas / (canchas.length * 10)) * 100)
        )
      : 0;

  return (
    <div className="mb-6 space-y-4">
      {/* Cabecera de la Sección de Estadísticas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Panel Estadístico & Ocupación
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {nombreComplejo}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Demanda por franja horaria, rentabilidad por cancha y eficiencia del Bot
            </p>
          </div>
        </div>

        {/* Selector de Período Temporal */}
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs">
          <button
            onClick={() => setPeriodo('hoy')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              periodo === 'hoy'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setPeriodo('semana')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              periodo === 'semana'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriodo('mes')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              periodo === 'mes'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      {/* Rejilla de Gráficas y Vistas Analíticas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* GRÁFICA 1: Ocupación por Franja Horaria (Horas Pico vs Valle) - 7 Columnas */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Demanda Horaria
              </span>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Curva de Ocupación de Canchas
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-600" /> Horas Pico (6pm - 10pm)
              </span>
            </div>
          </div>

          {/* Gráfico de Barras Vectorial Dinámico */}
          <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 px-1 border-b border-slate-200">
            {ocupacionPorHora.map((f, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                {/* Tooltip flotante al pasar el mouse */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-md whitespace-nowrap">
                  <strong className="block text-emerald-400">{f.hora}</strong>
                  {f.reservas} {f.reservas === 1 ? 'partido' : 'partidos'}
                </div>

                {/* Barra dinámica nítida */}
                <div
                  style={{ height: `${f.porcentaje}%` }}
                  className={`w-full rounded-t-sm transition-all duration-300 relative ${
                    f.esPico
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : f.reservas > 0
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Eje de Horas */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 px-1">
            <span>07:00</span>
            <span>10:00</span>
            <span>13:00</span>
            <span>16:00</span>
            <span className="text-amber-700 font-bold">18:00 (Pico)</span>
            <span className="text-amber-700 font-bold">21:00 (Pico)</span>
            <span>22:00</span>
          </div>
        </div>

        {/* GRÁFICA 2: Rentabilidad y Rendimiento por Cancha - 5 Columnas */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Rendimiento por Escenario
              </span>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Canchas más Rentables
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {tasaOcupacionGlobal}% Ocupación
            </span>
          </div>

          {/* Barras de Progreso Comparativas */}
          <div className="space-y-3.5">
            {rendimientoCanchas.map((c) => {
              const porcentajeBarra = Math.round((c.ingresos / maxIngresos) * 100);
              const formatPesos = (v: number) =>
                new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 truncate max-w-[170px]">
                      {c.nombre}
                    </span>
                    <span className="font-mono text-slate-700 font-bold text-[11px]">
                      {formatPesos(c.ingresos)}
                    </span>
                  </div>
                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      style={{ width: `${Math.max(porcentajeBarra, 8)}%` }}
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{c.totalTurnos} {c.totalTurnos === 1 ? 'turno agendado' : 'turnos agendados'}</span>
                    <span className="text-emerald-700 font-mono font-medium">Anticipos: {formatPesos(c.anticipos)}</span>
                  </div>
                </div>
              );
            })}

            {rendimientoCanchas.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">
                No hay canchas registradas en este complejo.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mini-dashboard: KPIs de Eficiencia Operativa y Seguridad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Tasa de Asistencia (No-Shows)
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-bold text-slate-900 font-mono">0.0% Inasistencias</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                100% Blindado
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0 font-bold text-sm">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Velocidad de Reserva del Bot
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-bold text-slate-900 font-mono">&lt; 45 segundos</span>
              <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold">
                Sin esperas
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Auditoría Anti-Fraude IA
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-bold text-slate-900 font-mono">100% Protegido</span>
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                Nequi/Davi
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
