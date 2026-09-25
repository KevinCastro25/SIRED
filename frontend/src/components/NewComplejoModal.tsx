import React, { useState } from 'react';
import {
  IconX,
  IconBuilding,
  IconMapPin,
  IconPhone,
  IconCreditCard,
  IconClock,
  IconCheck,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { Complejo } from '../types.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplejoCreado: (nuevo: Complejo) => void;
}

export const NewComplejoModal: React.FC<Props> = ({ isOpen, onClose, onComplejoCreado }) => {
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [ciudad, setCiudad] = useState('Bogotá');
  const [direccion, setDireccion] = useState('');
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('+57');
  const [phoneId, setPhoneId] = useState('');
  const [nequi, setNequi] = useState('');
  const [daviplata, setDaviplata] = useState('');
  const [titular, setTitular] = useState('');
  const [horaApertura, setHoraApertura] = useState('06:00:00');
  const [horaCierre, setHoraCierre] = useState('23:00:00');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNombreChange = (val: string) => {
    setNombre(val);
    const autogenerado = val
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(autogenerado);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      const res = await fetch('/api/complejos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          slug,
          ciudad,
          direccion,
          telefono_whatsapp: telefonoWhatsApp,
          whatsapp_phone_number_id: phoneId || undefined,
          nequi_numero: nequi,
          daviplata_numero: daviplata,
          titular_cuenta: titular || 'Administrador',
          hora_apertura: horaApertura,
          hora_cierre: horaCierre,
          duracion_turno_minutos: 60,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'No se pudo registrar la nueva empresa.');
      }

      const nuevo = await res.json();
      onComplejoCreado(nuevo);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la empresa');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
              <IconBuilding className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Registrar Nueva Empresa / Complejo</h3>
              <p className="text-xs text-slate-500">Configuración multi-empresa independiente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mx-4 mt-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Comercial de la Empresa / Complejo *</label>
            <input
              type="text"
              required
              placeholder="Ej. Club Campestre Padel & Soccer"
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Identificador Slug (Único)</label>
              <input
                type="text"
                required
                placeholder="club-campestre"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <IconMapPin className="w-3.5 h-3.5 text-slate-400" /> Ciudad
              </label>
              <input
                type="text"
                required
                placeholder="Bogotá / Medellín / Cali"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Física</label>
            <input
              type="text"
              placeholder="Ej. Calle 127 # 19-30"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <IconPhone className="w-3.5 h-3.5 text-emerald-600" /> Canal Oficial de WhatsApp
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número de WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="+573001234567"
                  value={telefonoWhatsApp}
                  onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number ID (Meta API)</label>
                <input
                  type="text"
                  placeholder="Ej. 109827364512345 (Opcional)"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <IconCreditCard className="w-3.5 h-3.5 text-emerald-600" /> Cuentas para Anticipos
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cuenta Nequi</label>
                <input
                  type="text"
                  placeholder="3001234567"
                  value={nequi}
                  onChange={(e) => setNequi(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cuenta Daviplata</label>
                <input
                  type="text"
                  placeholder="3001234567"
                  value={daviplata}
                  onChange={(e) => setDaviplata(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Titular de las Cuentas Bancarias</label>
              <input
                type="text"
                placeholder="Ej. Inversiones Deportivas S.A.S"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <IconClock className="w-3.5 h-3.5 text-emerald-600" /> Horario de Funcionamiento
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hora de Apertura</label>
                <input
                  type="text"
                  placeholder="06:00:00"
                  value={horaApertura}
                  onChange={(e) => setHoraApertura(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hora de Cierre</label>
                <input
                  type="text"
                  placeholder="23:00:00"
                  value={horaCierre}
                  onChange={(e) => setHoraCierre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-semibold text-white flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <IconCheck className="w-4 h-4" />
              {cargando ? 'Guardando...' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
