import React from 'react';
import { Cancha, Reserva } from '../types.ts';
import { CheckCircle2, Clock, Ban, User, Phone } from 'lucide-react';

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

  return (
    <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => moverDia(-1)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition"
          >
            ← Día anterior
          </button>
          <button
            onClick={() => onCambiarFecha(new Date().toISOString().split('T')[0])}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold transition text-white"
          >
            Hoy
          </button>
          <button
            onClick={() => moverDia(1)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition"
          >
            Día siguiente →
          </button>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => onCambiarFecha(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1 text-sm text-slate-200 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <span className="text-sm font-medium capitalize text-slate-300">
            {formatearFecha(fechaSeleccionada)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-700 text-xs uppercase text-slate-400">
              <th className="p-3 w-28 text-center font-bold border-r border-slate-700">Horario</th>
              {canchas.map((c) => (
                <th key={c.id} className="p-3 font-semibold border-r border-slate-700 last:border-r-0 min-w-[240px]">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">{c.nombre}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
                      {c.deporte.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {horas.map((slot) => (
              <tr key={slot.inicio} className="hover:bg-slate-750 transition-colors">
                <td className="p-3 text-center border-r border-slate-700 text-xs font-mono font-semibold text-slate-400 bg-slate-850/40">
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
                    const esConfirmada = reserva.estado === 'confirmada';
                    const esPendiente = reserva.estado === 'pendiente_pago';
                    const esBloqueo = reserva.estado === 'bloqueada';

                    return (
                      <td
                        key={cancha.id}
                        onClick={() => onSeleccionarTurno(cancha, slot.inicio, slot.fin, reserva)}
                        className="p-2 border-r border-slate-700 last:border-r-0 cursor-pointer"
                      >
                        <div
                          className={`p-2.5 rounded-lg border text-xs transition shadow-sm ${
                            esConfirmada
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/60'
                              : esPendiente
                              ? 'bg-amber-950/60 border-amber-500/50 text-amber-200 hover:bg-amber-900/60'
                              : 'bg-slate-700/60 border-slate-600 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              {esConfirmada && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              {esPendiente && <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                              {esBloqueo && <Ban className="w-3.5 h-3.5 text-slate-400" />}
                              {esConfirmada ? 'CONFIRMADA' : esPendiente ? 'EN ESPERA ANTICIPO' : 'BLOQUEADA'}
                            </span>
                            <span className="font-mono text-[11px] text-slate-300">
                              ${(reserva.valor_total / 1000).toFixed(0)}k
                            </span>
                          </div>

                          <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-300">
                            <p className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="font-medium text-white">{reserva.clientes?.nombre || 'Reserva Directa'}</span>
                            </p>
                            {reserva.clientes?.telefono_wa && (
                              <p className="flex items-center gap-1 text-slate-400">
                                <Phone className="w-3 h-3" />
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
                      className="p-2 border-r border-slate-700 last:border-r-0 cursor-pointer group"
                    >
                      <div className="p-2.5 rounded-lg border border-dashed border-slate-700/80 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/5 transition text-center">
                        <span className="text-xs text-slate-500 group-hover:text-emerald-400 font-medium">
                          + Libre (Apartar)
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
