import React, { useState } from 'react';
import { Cancha, Reserva } from '../types.ts';
import { X, Check, Trash2, Ban } from 'lucide-react';

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
        await fetch('/api/bot/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefono: telefono.replace(/\s+/g, '') || '573000000000',
            mensaje: 'PAGADO',
            nombre: nombre || 'Cliente Manual',
          }),
        });
      }
      onGuardar();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado: string) => {
    if (!reservaExistente) return;
    setCargando(true);
    try {
      await fetch(`/api/reservas/${reservaExistente.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      onGuardar();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              {reservaExistente ? 'Detalles de la Reserva' : 'Gestionar Turno'}
            </h3>
            <p className="text-xs text-slate-400">
              {cancha.nombre} • {horaInicio} a {horaFin}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {reservaExistente ? (
          <div className="p-5 space-y-4">
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-semibold text-white">{reservaExistente.clientes?.nombre || 'Anónimo'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WhatsApp:</span>
                <span className="font-semibold text-emerald-400">{reservaExistente.clientes?.telefono_wa || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estado actual:</span>
                <span className="font-bold uppercase text-white">{reservaExistente.estado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Turno:</span>
                <span className="font-bold text-white">${reservaExistente.valor_total.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Anticipo:</span>
                <span className="font-bold text-cyan-400">${reservaExistente.valor_anticipo_requerido.toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={cargando}
                onClick={() => handleCambiarEstado('confirmada')}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" /> Aprobar Anticipo
              </button>
              <button
                disabled={cargando}
                onClick={() => handleCambiarEstado('cancelada')}
                className="py-2.5 px-3 bg-rose-600/80 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" /> Cancelar Turno
              </button>
            </div>
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
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
