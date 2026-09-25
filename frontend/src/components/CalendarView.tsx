import React from 'react';
import { Cancha, Reserva } from '../types.ts';
import {
  IconCheck,
  IconClock,
  IconBan,
  IconUser,
  IconPhone,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconSparkles,
} from '@tabler/icons-react';

interface Props {
  canchas: Cancha[];
  reservas: Reserva[];
  fechaSeleccionada: string;
  onCambiarFecha: (fecha: string) => void;
  onSeleccionarTurno: (cancha: Cancha, horaInicio: string, horaFin: string, reservaExistente?: Reserva) => void;
}

export const CalendarView: React.FC<Props> = ({
  canchas,
  reservas,
  fechaSeleccionada,
  onCambiarFecha,
  onSeleccionarTurno,
}) => {
  const horas = Array.from({ length: 16 }, (_, i) => {
    const h = i + 7;
    const inicio = `${h.toString().padStart(2, '0')}:00`;
    const fin = `${(h + 1).toString().padStart(2, '0')}:00`;
    return { inicio, fin };
  });

  const formatearFecha = (fechaStr: string) => {
    const d = new Date(fechaStr + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const moverDia = (dias: number) => {
    const d = new Date(fechaSeleccionada + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    onCambiarFecha(d.toISOString().split('T')[0]);
  };

  const esHoy = fechaSeleccionada === new Date().toISOString().split('T')[0];

  const getDeporteColor = (deporte: string) => {
    switch (deporte) {
      case 'padel':
        return {
          bg: 'bg-sky-50',
          text: 'text-sky-800',
          border: 'border-sky-200',
          badge: '🎾 Pádel',
        };
      case 'futbol_8':
      case 'futbol_11':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
          badge: '⚽ Fútbol Grande',
        };
      case 'tenis':
        return {
          bg: 'bg-lime-50',
          text: 'text-lime-800',
          border: 'border-lime-200',
          badge: '🎾 Tenis',
        };
      case 'voley':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-200',
          badge: '🏐 Vóley Playa',
        };
      default:
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
          badge: '⚽ Fútbol 5',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col border border-slate-200">
      {/* Barra de Control de Fecha y Navegación Rápida */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={() => moverDia(-1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
              title="Día anterior"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onCambiarFecha(new Date().toISOString().split('T')[0])}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                esHoy
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <IconSparkles className="w-3.5 h-3.5" /> Hoy
            </button>
            <button
              onClick={() => moverDia(1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
              title="Día siguiente"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex items-center">
            <IconCalendar className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => onCambiarFecha(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-1 text-xs text-slate-800 font-semibold outline-none focus:bg-white focus:border-emerald-600 transition cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Confirmada
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Anticipo Pendiente
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 font-medium ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Disponible
            </span>
          </div>

          <span className="text-xs font-bold capitalize text-slate-800 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
            {formatearFecha(fechaSeleccionada)}
          </span>
        </div>
      </div>

      {/* Grilla Horaria de Escenarios Deportivos */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <th className="p-3 w-20 text-center font-bold border-r border-slate-200 bg-slate-100/70">
                Horario
              </th>
              {canchas.map((c) => {
                const sportStyle = getDeporteColor(c.deporte);
                return (
                  <th key={c.id} className="p-3 font-semibold border-r border-slate-200 last:border-r-0 min-w-[240px]">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-slate-900 text-sm font-bold block">{c.nombre}</span>
                        <span className="text-slate-500 text-[11px] font-normal">
                          ${(c.precio_estandar / 1000).toFixed(0)}k normal • ${(c.precio_pico / 1000).toFixed(0)}k pico
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sportStyle.bg} ${sportStyle.text} ${sportStyle.border}`}>
                        {sportStyle.badge}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {horas.map((slot) => (
              <tr key={slot.inicio} className="hover:bg-slate-50/70 transition-colors">
                {/* Eje de Horas */}
                <td className="p-2.5 text-center border-r border-slate-200 text-xs font-mono font-bold text-slate-600 bg-slate-50 select-none">
                  {slot.inicio}
                </td>

                {canchas.map((cancha) => {
                  const reserva = reservas.find((r) => {
                    if (r.cancha_id !== cancha.id) return false;
                    const rFecha = r.fecha_inicio.split('T')[0];
                    if (rFecha !== fechaSeleccionada) return false;
                    const rHora = r.fecha_inicio.split('T')[1].slice(0, 5);
                    return rHora === slot.inicio && r.estado !== 'cancelada';
                  });

                  if (reserva) {
                    const esConfirmada = reserva.estado === 'confirmada' || reserva.estado === 'completada';
                    const esPendiente = reserva.estado === 'pendiente_pago';
                    const esBloqueo = reserva.estado === 'bloqueada';
                    const tieneAlerta = reserva.notas?.includes('ALERTA FRAUDE');

                    return (
                      <td
                        key={cancha.id}
                        onClick={() => onSeleccionarTurno(cancha, slot.inicio, slot.fin, reserva)}
                        className="p-1.5 border-r border-slate-200 last:border-r-0 cursor-pointer"
                      >
                        <div
                          className={`p-2.5 rounded-xl border text-xs transition duration-150 relative overflow-hidden shadow-sm ${
                            esConfirmada
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100/70'
                              : esPendiente
                              ? tieneAlerta
                                ? 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100/70'
                                : 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100/70'
                              : 'diagonal-stripes border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              {esConfirmada && <IconCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />}
                              {esPendiente && (
                                <IconClock className={`w-4 h-4 ${tieneAlerta ? 'text-rose-600' : 'text-amber-600'} stroke-[2.5]`} />
                              )}
                              {esBloqueo && <IconBan className="w-4 h-4 text-slate-500 stroke-[2.5]" />}
                              
                              <span className={tieneAlerta ? 'text-rose-800 font-black' : esConfirmada ? 'text-emerald-900 font-bold' : 'text-amber-900 font-bold'}>
                                {esConfirmada
                                  ? 'CONFIRMADA'
                                  : esPendiente
                                  ? tieneAlerta
                                    ? 'ALERTA IA (REVISAR)'
                                    : 'ANTICIPO PENDIENTE'
                                  : 'BLOQUEADA'}
                              </span>
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                              ${(reserva.valor_total / 1000).toFixed(0)}k
                            </span>
                          </div>

                          <div className="space-y-0.5 text-[11px]">
                            <p className="flex items-center gap-1 font-semibold text-slate-900 truncate">
                              <IconUser className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{reserva.clientes?.nombre || 'Reserva Directa'}</span>
                            </p>
                            {reserva.clientes?.telefono_wa && (
                              <p className="flex items-center gap-1 text-slate-600 text-[10px] font-mono">
                                <IconPhone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{reserva.clientes.telefono_wa}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={cancha.id}
                      onClick={() => onSeleccionarTurno(cancha, slot.inicio, slot.fin)}
                      className="p-1.5 border-r border-slate-200 last:border-r-0 cursor-pointer group"
                    >
                      <div className="h-full min-h-[58px] rounded-xl border border-dashed border-slate-200 group-hover:border-emerald-500 group-hover:bg-emerald-50/40 transition flex items-center justify-center">
                        <span className="text-xs text-slate-400 group-hover:text-emerald-700 font-medium transition flex items-center gap-1">
                          + Libre
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
