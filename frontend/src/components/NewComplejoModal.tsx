import React, { useState } from 'react';
import { X, Building2, MapPin, Phone, CreditCard, Clock, Check } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Registrar Nueva Empresa / Complejo</h3>
              <p className="text-xs text-slate-400">Modelo Multi-empresa independiente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mx-4 mt-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Comercial de la Empresa / Complejo *</label>
            <input
              type="text"
              required
              placeholder="Ej. Club Campestre Padel & Soccer"
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Identificador Slug (Único)</label>
              <input
                type="text"
                required
                placeholder="club-campestre"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Ciudad
              </label>
              <input
                type="text"
                required
                placeholder="Bogotá / Medellín / Cali"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Dirección Física</label>
            <input
              type="text"
              placeholder="Ej. Calle 127 # 19-30"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Canal Oficial de WhatsApp
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Número de WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="+573001234567"
                  value={telefonoWhatsApp}
                  onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number ID (Meta API)</label>
                <input
                  type="text"
                  placeholder="Ej. 109827364512345 (Opcional)"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Métodos de Pago del Complejo (Para Anticipos)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cuenta Nequi</label>
                <input
                  type="text"
                  placeholder="3001234567"
                  value={nequi}
                  onChange={(e) => setNequi(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cuenta Daviplata</label>
                <input
                  type="text"
                  placeholder="3001234567"
                  value={daviplata}
                  onChange={(e) => setDaviplata(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Titular de las Cuentas Bancarias</label>
              <input
                type="text"
                placeholder="Ej. Inversiones Deportivas S.A.S"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Horario de Funcionamiento
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Hora de Apertura</label>
                <input
                  type="text"
                  placeholder="06:00:00"
                  value={horaApertura}
                  onChange={(e) => setHoraApertura(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Hora de Cierre</label>
                <input
                  type="text"
                  placeholder="23:00:00"
                  value={horaCierre}
                  onChange={(e) => setHoraCierre(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {cargando ? 'Guardando...' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
