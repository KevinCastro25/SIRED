import React from 'react';
import { CalendarCheck, DollarSign, ShieldCheck, TrendingUp } from 'lucide-react';
import { Metricas } from '../types.ts';

interface Props {
  metricas: Metricas;
}

export const MetricCards: React.FC<Props> = ({ metricas }) => {
  const formatPesos = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Ingresos Proyectados</p>
          <h3 className="text-2xl font-bold text-emerald-400 mt-1">{formatPesos(metricas.ingresos_estimados)}</h3>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Basado en turnos confirmados
          </p>
        </div>
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Anticipos en Caja (Nequi/Davi)</p>
          <h3 className="text-2xl font-bold text-cyan-400 mt-1">{formatPesos(metricas.anticipos_recaudados)}</h3>
          <p className="text-xs text-cyan-300 mt-1">Cero riesgo de no-show</p>
        </div>
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Reservas Confirmadas</p>
          <h3 className="text-2xl font-bold text-white mt-1">{metricas.reservas_confirmadas}</h3>
          <p className="text-xs text-slate-400 mt-1">De un total de {metricas.total_reservas} solicitudes</p>
        </div>
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
          <CalendarCheck className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Canal Automatizado</p>
          <h3 className="text-2xl font-bold text-green-400 mt-1">WhatsApp 24/7</h3>
          <p className="text-xs text-slate-400 mt-1">0 minutos de atención manual</p>
        </div>
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
          <span className="text-xl">💬</span>
        </div>
      </div>
    </div>
  );
};
