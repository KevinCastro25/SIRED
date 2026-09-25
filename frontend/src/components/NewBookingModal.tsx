import React, { useState } from 'react';
import { Cancha, Reserva } from '../types.ts';
import {
  IconX,
  IconCheck,
  IconTrash,
  IconBan,
  IconAlertTriangle,
  IconPhone,
  IconClock,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';

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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {reservaExistente ? 'Auditoría & Gestión de Reserva' : 'Gestionar Turno'}
            </h3>
            <p className="text-xs text-slate-500">
              {cancha.nombre} • {horaInicio} a {horaFin}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {reservaExistente ? (
          <div className="p-5 space-y-4">
            {/* Banner de alerta si la IA detectó posible fraude */}
            {tieneAlertaFraude && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                <IconAlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-rose-900">Alerta de Seguridad IA:</strong>
                  {reservaExistente.notas}
                </div>
              </div>
            )}

            {/* Banner informativo de turno pendiente de validación */}
            {reservaExistente.estado === 'pendiente_pago' && !tieneAlertaFraude && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
                <IconClock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-amber-900">Anticipo en Verificación:</strong>
                  Turno apartado por WhatsApp. Revisa tu app de Nequi/Daviplata antes de aprobar.
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-semibold text-slate-900">{reservaExistente.clientes?.nombre || 'Anónimo'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">WhatsApp:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1 font-mono">
                  <IconPhone className="w-3.5 h-3.5" /> {reservaExistente.clientes?.telefono_wa || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Estado:</span>
                <span className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded-full ${
                  reservaExistente.estado === 'confirmada'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : reservaExistente.estado === 'pendiente_pago'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {reservaExistente.estado}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500">Total Turno:</span>
                <span className="font-bold text-slate-900">${reservaExistente.valor_total.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Anticipo Requerido:</span>
                <span className="font-bold text-emerald-700">${reservaExistente.valor_anticipo_requerido.toLocaleString('es-CO')}</span>
              </div>
              {reservaExistente.notas && !tieneAlertaFraude && (
                <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                  <span className="text-slate-500 block mb-0.5">Detalles del Pago:</span>
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
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
                  title="Confirma la reserva y envía WhatsApp automático de confirmación al cliente"
                >
                  <IconCheck className="w-4 h-4" /> Aprobar Anticipo
                </button>
                <button
                  disabled={cargando}
                  onClick={handleRechazarAnticipo}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  title="Cancela la reserva, libera la franja horaria y notifica el rechazo al cliente"
                >
                  <IconTrash className="w-4 h-4" /> Rechazar Comprobante
                </button>
              </div>
            )}

            {reservaExistente.estado === 'confirmada' && (
              <div className="pt-2 text-center text-xs text-emerald-800 font-medium flex items-center justify-center gap-1.5 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <IconCheck className="w-4 h-4 text-emerald-600" /> Reserva Confirmada y Notificada vía WhatsApp
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCrearReservaManual} className="p-5 space-y-4">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setEsBloqueo(false)}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                  !esBloqueo ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reserva Manual
              </button>
              <button
                type="button"
                onClick={() => setEsBloqueo(true)}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                  esBloqueo ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bloquear Horario
              </button>
            </div>

            {!esBloqueo ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Jugador</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Andrés Gómez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. +573101234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600 font-mono"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo del Bloqueo</label>
                <select
                  value={motivoBloqueo}
                  onChange={(e) => setMotivoBloqueo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
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
              className={`w-full py-2.5 rounded-xl text-xs font-semibold text-white transition flex items-center justify-center gap-2 shadow-sm ${
                esBloqueo ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {esBloqueo ? <IconBan className="w-4 h-4" /> : <IconCheck className="w-4 h-4" />}
              {esBloqueo ? 'Confirmar Bloqueo de Franja' : 'Guardar Reserva'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
