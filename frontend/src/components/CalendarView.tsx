import React from 'react';
import { Cancha, Reserva } from '../types.ts';
import { CheckCircle2, Clock, Ban, User, Phone, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

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
          bg: 'bg-cyan-500/15',
          text: 'text-cyan-400',
          border: 'border-cyan-500/30',
          badge: '🎾 Pádel',
        };
      case 'futbol_8':
      case 'futbol_11':
        return {
          bg: 'bg-teal-500/15',
          text: 'text-teal-400',
          border: 'border-teal-500/30',
          badge: '⚽ Fútbol Grande',
        };
      case 'tenis':
        return {
          bg: 'bg-lime-500/15',
          text: 'text-lime-400',
          border: 'border-lime-500/30',
          badge: '🎾 Tenis',
        };
      case 'voley':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          badge: '🏐 Vóley Playa',
        };
      default:
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          badge: '⚽ Fútbol 5',
        };
    }
  };

  return (
    <div className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-sm flex flex-col border border-slate-800">
      {/* Barra de Control de Fecha y Navegación Rápida */}
      <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/80 shadow-inner">
            <button
              onClick={() => moverDia(-1)}
              className="p-1.5 hover:bg-slate-700/80 rounded-lg text-slate-300 hover:text-white transition"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onCambiarFecha(new Date().toISOString().split('T')[0])}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                esHoy
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Sparkles className="w-3 h-3" /> Hoy
            </button>
            <button
              onClick={() => moverDia(1)}
              className="p-1.5 hover:bg-slate-700/80 rounded-lg text-slate-300 hover:text-white transition"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex items-center">
            <CalendarIcon className="w-4 h-4 text-emerald-400 absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => onCambiarFecha(e.target.value)}
              className="bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-medium transition cursor-pointer shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold capitalize text-slate-200 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-sm">
            {formatearFecha(fechaSeleccionada)}
          </span>
        </div>
      </div>

      {/* Grilla Horaria de Escenarios Deportivos */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <th className="p-3.5 w-24 text-center font-bold border-r border-slate-800 bg-slate-950/60">
                Horario
              </th>
              {canchas.map((c) => {
                const sportStyle = getDeporteColor(c.deporte);
                return (
                  <th key={c.id} className="p-3.5 font-semibold border-r border-slate-800 last:border-r-0 min-w-[260px]">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-white text-sm font-bold block">{c.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ${(c.precio_estandar / 1000).toFixed(0)}k std • ${(c.precio_pico / 1000).toFixed(0)}k pico
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
          <tbody className="divide-y divide-slate-800">
            {horas.map((slot) => (
              <tr key={slot.inicio} className="hover:bg-slate-800/30 transition-colors">
                {/* Eje de Horas */}
                <td className="p-3 text-center border-r border-slate-800 text-xs font-mono font-bold text-slate-400 bg-slate-950/40 select-none">
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
                        className="p-1.5 border-r border-slate-800 last:border-r-0 cursor-pointer"
                      >
                        <div
                          className={`p-2.5 rounded-xl border text-xs transition duration-150 relative overflow-hidden group shadow-sm ${
                            esConfirmada
                              ? 'bg-[#10241b] border-emerald-500/50 text-emerald-100 hover:border-emerald-400'
                              : esPendiente
                              ? tieneAlerta
                                ? 'bg-[#2a1215] border-rose-500/60 text-rose-100 hover:border-rose-400'
                                : 'bg-[#281d0f] border-amber-500/50 text-amber-100 hover:border-amber-400'
                              : 'diagonal-stripes border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              {esConfirmada && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              {esPendiente && (
                                <Clock className={`w-3.5 h-3.5 ${tieneAlerta ? 'text-rose-400' : 'text-amber-400'}`} />
                              )}
                              {esBloqueo && <Ban className="w-3.5 h-3.5 text-slate-400" />}
                              
                              <span className={tieneAlerta ? 'text-rose-300' : ''}>
                                {esConfirmada
                                  ? 'CONFIRMADA'
                                  : esPendiente
                                  ? tieneAlerta
                                    ? 'ALERTA IA (REVISAR)'
                                    : 'ANTICIPO PENDIENTE'
                                  : 'BLOQUEADA'}
                              </span>
                            </span>
                            <span className="font-mono text-[11px] font-bold text-white bg-slate-900/60 px-2 py-0.5 rounded-md border border-white/10">
                              ${(reserva.valor_total / 1000).toFixed(0)}k
                            </span>
                          </div>

                          <div className="space-y-0.5 text-[11px]">
                            <p className="flex items-center gap-1 font-semibold text-white truncate">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{reserva.clientes?.nombre || 'Reserva Directa'}</span>
                            </p>
                            {reserva.clientes?.telefono_wa && (
                              <p className="flex items-center gap-1 text-slate-300 text-[10px] font-mono">
                                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
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
                      className="p-1.5 border-r border-slate-800/80 last:border-r-0 cursor-pointer group"
                    >
                      <div className="h-full min-h-[58px] rounded-xl border border-dashed border-slate-800/80 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/5 transition flex items-center justify-center">
                        <span className="text-xs text-slate-600 group-hover:text-emerald-400 font-medium transition flex items-center gap-1">
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
