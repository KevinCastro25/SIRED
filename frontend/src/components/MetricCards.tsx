import React from 'react';
import { DollarSign, ShieldCheck, CalendarCheck, MessageSquareCode, ArrowUpRight, Zap } from 'lucide-react';
import { Metricas } from '../types.ts';

interface Props {
  metricas: Metricas;
}

export const MetricCards: React.FC<Props> = ({ metricas }) => {
  const formatPesos = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Ingresos Totales */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition duration-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Ingresos Estimados
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-white tracking-tight">
            {formatPesos(metricas.ingresos_estimados)}
          </h3>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> Basado en turnos apartados
          </p>
        </div>
      </div>

      {/* 2. Anticipos en Caja */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition duration-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Anticipos Recaudados
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-cyan-300 tracking-tight">
            {formatPesos(metricas.anticipos_recaudados)}
          </h3>
          <p className="text-[11px] text-cyan-400/90 flex items-center gap-1 font-medium">
            <Zap className="w-3 h-3 text-cyan-400" /> Garantizado en Nequi / Daviplata
          </p>
        </div>
      </div>

      {/* 3. Partidos / Reservas */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition duration-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Partidos Agendados
          </span>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-white tracking-tight">
            {metricas.reservas_confirmadas} <span className="text-xs font-normal text-slate-400">confirmadas</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">
            De {metricas.total_reservas} solicitudes registradas
          </p>
        </div>
      </div>

      {/* 4. Estado Bot WhatsApp */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition duration-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Atención WhatsApp 24/7
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MessageSquareCode className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-emerald-400 tracking-tight flex items-center gap-2">
            Canal Oficial
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">
            Meta Cloud API • Respuesta &lt; 2s
          </p>
        </div>
      </div>
    </div>
  );
};
