import React from 'react';
import { motion } from 'framer-motion';
import {
  IconCoin,
  IconShieldCheck,
  IconCalendarEvent,
  IconBrandWhatsapp,
  IconArrowUpRight,
  IconBolt,
} from '@tabler/icons-react';
import { Metricas } from '../types.ts';

interface Props {
  metricas: Metricas;
  periodo?: 'hoy' | 'semana' | 'mes';
}

export const MetricCards: React.FC<Props> = ({ metricas, periodo = 'semana' }) => {
  const formatPesos = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const etiquetaPeriodo =
    periodo === 'hoy'
      ? 'Hoy'
      : periodo === 'mes'
      ? 'Este Mes'
      : 'Esta Semana';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Ingresos Totales */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Ingresos Estimados
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {etiquetaPeriodo}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <IconCoin className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatPesos(metricas.ingresos_estimados)}
          </h3>
          <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
            <IconArrowUpRight className="w-3.5 h-3.5" /> Turnos agendados ({etiquetaPeriodo.toLowerCase()})
          </p>
        </div>
      </motion.div>

      {/* 2. Anticipos en Caja */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Anticipos Recaudados
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
              {etiquetaPeriodo}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
            <IconShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatPesos(metricas.anticipos_recaudados)}
          </h3>
          <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <IconBolt className="w-3.5 h-3.5 text-sky-600" /> Nequi / Daviplata ({etiquetaPeriodo.toLowerCase()})
          </p>
        </div>
      </motion.div>

      {/* 3. Partidos / Reservas */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Partidos Agendados
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
              {etiquetaPeriodo}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <IconCalendarEvent className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {metricas.reservas_confirmadas} <span className="text-xs font-normal text-slate-500">confirmadas</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            De {metricas.total_reservas} turnos ({etiquetaPeriodo.toLowerCase()})
          </p>
        </div>
      </motion.div>

      {/* 4. Estado Bot WhatsApp */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Bot WhatsApp 24/7
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <IconBrandWhatsapp className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-emerald-800 tracking-tight flex items-center gap-2">
            Canal Oficial Meta
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Respuesta automática &lt; 2s
          </p>
        </div>
      </motion.div>
    </div>
  );
};
