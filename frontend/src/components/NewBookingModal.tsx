import React, { useState } from 'react';
import { Cancha, Reserva } from '../types.ts';
import { X, Check, Trash2, Ban, ShieldAlert, Phone, Clock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cancha?: Cancha;
  horaInicio?: string;
  horaFin?: string;
  fechaSeleccionada: string;
  reservaExistente?: Reserva;
  onGuardar: () => void;
}

export const NewBookingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  cancha,
  horaInicio,
  horaFin,
  fechaSeleccionada,
  reservaExistente,
  onGuardar,
}) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [esBloqueo, setEsBloqueo] = useState(false);
  const [motivoBloqueo, setMotivoBloqueo] = useState('Mantenimiento preventivo');
  const [cargando, setCargando] = useState(false);

  if (!isOpen || !cancha) return null;

  const handleCrearReservaManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (esBloqueo) {
        await fetch('/api/bloqueos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancha_id: cancha.id,
            fecha_inicio: `${fechaSeleccionada}T${horaInicio}:00Z`,
            fecha_fin: `${fechaSeleccionada}T${horaFin}:00Z`,
            motivo: motivoBloqueo,
          }),
        });
      } else {
        await fetch('/api/reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancha_id: cancha.id,
            fecha_inicio: `${fechaSeleccionada}T${horaInicio}:00Z`,
            fecha_fin: `${fechaSeleccionada}T${horaFin}:00Z`,
            nombre: nombre || 'Cliente Manual',
            telefono: telefono.replace(/\s+/g, '') || '573000000000',
          }),
        }).catch(() => null);
      }
      onGuardar();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  // Opción A: Aprobación asistida desde el Visor (dispara mensaje de WhatsApp al cliente)
  const handleAprobarAnticipo = async () => {
    if (!reservaExistente) return;
    setCargando(true);
    try {
      await fetch(`/api/reservas/${reservaExistente.id}/aprobar-anticipo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notas_admin: 'Anticipo verificado en cuenta y aprobado por administrador',
        }),
      });
      onGuardar();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  // Rechazar comprobante (libera turno y notifica por WhatsApp al cliente)
  const handleRechazarAnticipo = async () => {
    if (!reservaExistente) return;
    setCargando(true);
    try {
      await fetch(`/api/reservas/${reservaExistente.id}/rechazar-anticipo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo: 'Comprobante no válido o pago no reflejado en la cuenta',
        }),
      });
      onGuardar();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const tieneAlertaFraude = reservaExistente?.notas?.includes('ALERTA FRAUDE');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              {reservaExistente ? 'Auditoría & Gestión de Reserva' : 'Gestionar Turno'}
            </h3>
            <p className="text-xs text-slate-400">
              {cancha.nombre} • {horaInicio} a {horaFin}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {reservaExistente ? (
          <div className="p-5 space-y-4">
            {/* Banner de alerta si la IA detectó posible fraude */}
            {tieneAlertaFraude && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-rose-200">Alerta de Seguridad IA:</strong>
                  {reservaExistente.notas}
                </div>
              </div>
            )}

            {/* Banner informativo de turno pendiente de validación */}
            {reservaExistente.estado === 'pendiente_pago' && !tieneAlertaFraude && (
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-amber-200">Anticipo en Verificación:</strong>
                  Turno apartado por WhatsApp. Revisa tu app de Nequi/Daviplata antes de aprobar.
                </div>
              </div>
            )}

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-semibold text-white">{reservaExistente.clientes?.nombre || 'Anónimo'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">WhatsApp:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3" /> {reservaExistente.clientes?.telefono_wa || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estado:</span>
                <span className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded-full ${
                  reservaExistente.estado === 'confirmada'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : reservaExistente.estado === 'pendiente_pago'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {reservaExistente.estado}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-700/60">
                <span className="text-slate-400">Total Turno:</span>
                <span className="font-bold text-white">${reservaExistente.valor_total.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Anticipo Requerido:</span>
                <span className="font-bold text-cyan-400">${reservaExistente.valor_anticipo_requerido.toLocaleString('es-CO')}</span>
              </div>
              {reservaExistente.notas && !tieneAlertaFraude && (
                <div className="pt-1 border-t border-slate-700/60 text-[11px] text-slate-300">
                  <span className="text-slate-400 block mb-0.5">Detalles del Pago:</span>
                  {reservaExistente.notas}
                </div>
              )}
            </div>

            {/* Botones de acción asistida (Opción A) */}
            {reservaExistente.estado === 'pendiente_pago' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  disabled={cargando}
                  onClick={handleAprobarAnticipo}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  title="Confirma la reserva y envía WhatsApp automático de confirmación al cliente"
                >
                  <Check className="w-4 h-4" /> Aprobar Anticipo
                </button>
                <button
                  disabled={cargando}
                  onClick={handleRechazarAnticipo}
                  className="py-2.5 px-3 bg-rose-600/80 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  title="Cancela la reserva, libera la franja horaria y notifica el rechazo al cliente"
                >
                  <Trash2 className="w-4 h-4" /> Rechazar Comprobante
                </button>
              </div>
            )}

            {reservaExistente.estado === 'confirmada' && (
              <div className="pt-2 text-center text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                <Check className="w-4 h-4" /> Reserva Confirmada y Notificada vía WhatsApp
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCrearReservaManual} className="p-5 space-y-4">
            <div className="flex items-center gap-2 p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setEsBloqueo(false)}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                  !esBloqueo ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Reserva Manual
              </button>
              <button
                type="button"
                onClick={() => setEsBloqueo(true)}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                  esBloqueo ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bloquear Horario
              </button>
            </div>

            {!esBloqueo ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nombre del Jugador</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Andrés Gómez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Teléfono WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. +573101234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Motivo del Bloqueo</label>
                <select
                  value={motivoBloqueo}
                  onChange={(e) => setMotivoBloqueo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="Mantenimiento preventivo">Mantenimiento preventivo</option>
                  <option value="Torneo o Evento Especial">Torneo o Evento Especial</option>
                  <option value="Condiciones Climáticas (Lluvia)">Condiciones Climáticas (Lluvia)</option>
                  <option value="Uso Interno del Club">Uso Interno del Club</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold text-white transition flex items-center justify-center gap-2 ${
                esBloqueo ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {esBloqueo ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {esBloqueo ? 'Confirmar Bloqueo de Franja' : 'Guardar Reserva'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
