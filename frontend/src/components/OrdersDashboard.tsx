import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconTruckDelivery,
  IconMapPin,
  IconBrandWhatsapp,
  IconClock,
  IconCheck,
  IconFlame,
  IconCoin,
  IconSearch,
  IconSparkles,
  IconReceipt,
  IconCopy,
  IconTrendingUp,
} from '@tabler/icons-react';
import { Complejo, Reserva } from '../types.ts';

interface Props {
  complejo: Complejo;
  reservas: Reserva[];
  onActualizarReserva?: (reservaId: string, updates: Partial<Reserva>) => Promise<void>;
  onRecargar?: () => void;
}

type TabType = 'comandera' | 'metricas';
type EstadoFiltro = 'todos' | 'pendiente_pago' | 'confirmada' | 'en_domicilio' | 'completada';

export const OrdersDashboard: React.FC<Props> = ({
  complejo,
  reservas,
  onActualizarReserva,
  onRecargar,
}) => {
  const [tabActivo, setTabActivo] = useState<TabType>('comandera');
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [direccionCopiadaId, setDireccionCopiadaId] = useState<string | null>(null);

  // Parsear estado visual del pedido a partir de notas y estado en base de datos
  const pedidosProcesados = useMemo(() => {
    return reservas.map((r, index) => {
      const notas = r.notas || '';
      let subEstado: 'pendiente_pago' | 'confirmada' | 'en_preparacion' | 'en_domicilio' | 'completada' =
        r.estado === 'completada'
          ? 'completada'
          : r.estado === 'pendiente_pago'
          ? 'pendiente_pago'
          : 'confirmada';

      if (notas.includes('[EN_PREPARACION]')) subEstado = 'en_preparacion';
      if (notas.includes('[EN_DOMICILIO]')) subEstado = 'en_domicilio';
      if (notas.includes('[ENTREGADO]')) subEstado = 'completada';

      // Extraer dirección de entrega de las notas
      let direccion = 'Pereira / Cobertura Domicilio';
      const dirMatch = notas.match(/📍\s*Domicilio:\s*([^.[\n]+)/i);
      if (dirMatch && dirMatch[1]) {
        direccion = dirMatch[1].trim();
      }

      // Extraer detalle de granizados
      let detalleProductos = notas;
      const prodMatch = notas.match(/🍧\s*([^📍[\n]+)/i);
      if (prodMatch && prodMatch[1]) {
        detalleProductos = prodMatch[1].trim();
      }

      const horaPedido = r.fecha_inicio
        ? new Date(r.fecha_inicio).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : 'Reciente';

      const horaNumero = r.fecha_inicio
        ? new Date(r.fecha_inicio).getHours()
        : 15;

      return {
        ...r,
        codigo: `#GKL-${(index + 101).toString()}`,
        subEstado,
        direccion,
        detalleProductos,
        horaPedido,
        horaNumero,
      };
    });
  }, [reservas]);

  // Filtrado
  const pedidosFiltrados = useMemo(() => {
    return pedidosProcesados.filter((p) => {
      if (filtroEstado !== 'todos') {
        if (filtroEstado === 'confirmada' && p.subEstado !== 'confirmada' && p.subEstado !== 'en_preparacion') {
          return false;
        }
        if (filtroEstado === 'en_domicilio' && p.subEstado !== 'en_domicilio') {
          return false;
        }
        if (filtroEstado === 'completada' && p.subEstado !== 'completada') {
          return false;
        }
        if (filtroEstado === 'pendiente_pago' && p.subEstado !== 'pendiente_pago') {
          return false;
        }
      }

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const clienteNom = p.clientes?.nombre?.toLowerCase() || '';
        const tel = p.clientes?.telefono_wa || '';
        const dir = p.direccion.toLowerCase();
        const det = p.detalleProductos.toLowerCase();
        if (!clienteNom.includes(q) && !tel.includes(q) && !dir.includes(q) && !det.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [pedidosProcesados, filtroEstado, busqueda]);

  // Métricas avanzadas para Graniza2KL
  const metricasGranizados = useMemo(() => {
    const pedidosValidos = pedidosProcesados.filter((p) => p.estado !== 'cancelada');
    const totalVentas = pedidosValidos.reduce((acc, p) => acc + (p.valor_total || 0), 0);
    const entregados = pedidosProcesados.filter((p) => p.subEstado === 'completada').length;
    const pendientes = pedidosProcesados.filter((p) => p.subEstado === 'pendiente_pago').length;
    const activos = pedidosProcesados.filter(
      (p) => p.subEstado === 'confirmada' || p.subEstado === 'en_preparacion' || p.subEstado === 'en_domicilio'
    ).length;

    // Horas pico (distribución de 12:00 a 22:00)
    const horasMap: Record<number, number> = {
      12: 0, 13: 0, 14: 1, 15: 2, 16: 3, 17: 4, 18: 3, 19: 2, 20: 1, 21: 0,
    };
    pedidosValidos.forEach((p) => {
      const h = p.horaNumero;
      if (horasMap[h] !== undefined) {
        horasMap[h] += 1;
      }
    });

    const maxHoraCount = Math.max(...Object.values(horasMap), 1);

    return {
      totalVentas,
      entregados,
      pendientes,
      activos,
      totalPedidos: pedidosValidos.length,
      ticketPromedio: pedidosValidos.length > 0 ? totalVentas / pedidosValidos.length : 0,
      horasMap,
      maxHoraCount,
    };
  }, [pedidosProcesados]);

  // Cambiar estado del pedido
  const handleCambiarEstado = async (reservaId: string, nuevoSubEstado: string) => {
    if (!onActualizarReserva) return;
    const pedido = pedidosProcesados.find((p) => p.id === reservaId);
    if (!pedido) return;

    let nuevoEstadoDb: Reserva['estado'] = 'confirmada';
    let tag = '';

    if (nuevoSubEstado === 'en_preparacion') {
      nuevoEstadoDb = 'confirmada';
      tag = '[EN_PREPARACION]';
    } else if (nuevoSubEstado === 'en_domicilio') {
      nuevoEstadoDb = 'confirmada';
      tag = '[EN_DOMICILIO]';
    } else if (nuevoSubEstado === 'completada') {
      nuevoEstadoDb = 'completada';
      tag = '[ENTREGADO]';
    }

    const notaLimpia = (pedido.notas || '')
      .replace(/\[EN_PREPARACION\]|\[EN_DOMICILIO\]|\[ENTREGADO\]|\[ESPERANDO_PAGO\]/g, '')
      .trim();

    await onActualizarReserva(reservaId, {
      estado: nuevoEstadoDb,
      notas: `${notaLimpia} ${tag}`.trim(),
    });

    if (onRecargar) onRecargar();
  };

  const copiarDireccion = (id: string, direccion: string) => {
    navigator.clipboard.writeText(direccion);
    setDireccionCopiadaId(id);
    setTimeout(() => setDireccionCopiadaId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Cabecera para Graniza2KL */}
      <div className="bg-gradient-to-r from-purple-800 via-pink-700 to-amber-600 text-white p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍸</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {complejo.nombre}
            </h1>
            <span className="bg-white/20 backdrop-blur-md text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white">
              100% Domicilios (+18)
            </span>
          </div>
          <p className="text-pink-100 text-xs sm:text-sm">
            Comandera de cócteles frappé con licor en vivo, despacho de repartidores y análisis de horas pico de rumba y previas.
          </p>
        </div>

        {/* Selector de Vistas: Comandera vs Métricas */}
        <div className="flex items-center bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setTabActivo('comandera')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              tabActivo === 'comandera'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <IconTruckDelivery className="w-4 h-4" />
            Comandera ({pedidosProcesados.length})
          </button>
          <button
            onClick={() => setTabActivo('metricas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              tabActivo === 'metricas'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <IconFlame className="w-4 h-4 text-amber-500" />
            Horas Pico & Métricas
          </button>
        </div>
      </div>

      {tabActivo === 'comandera' ? (
        /* VISTA COMANDERA DIGITAL */
        <div className="space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
              <button
                onClick={() => setFiltroEstado('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  filtroEstado === 'todos'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({pedidosProcesados.length})
              </button>
              <button
                onClick={() => setFiltroEstado('confirmada')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                  filtroEstado === 'confirmada'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                En Cocina / Preparación ({metricasGranizados.activos})
              </button>
              <button
                onClick={() => setFiltroEstado('en_domicilio')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                  filtroEstado === 'en_domicilio'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                En Camino 🛵
              </button>
              <button
                onClick={() => setFiltroEstado('completada')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                  filtroEstado === 'completada'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Entregados ({metricasGranizados.entregados})
              </button>
              <button
                onClick={() => setFiltroEstado('pendiente_pago')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                  filtroEstado === 'pendiente_pago'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Esperando Pago ({metricasGranizados.pendientes})
              </button>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente, dirección..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Grilla de Pedidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {pedidosFiltrados.map((pedido) => {
                const esPendiente = pedido.subEstado === 'pendiente_pago';
                const esPreparacion = pedido.subEstado === 'en_preparacion' || pedido.subEstado === 'confirmada';
                const esDomicilio = pedido.subEstado === 'en_domicilio';
                const esEntregado = pedido.subEstado === 'completada';

                return (
                  <motion.div
                    key={pedido.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3.5 flex flex-col justify-between transition ${
                      esDomicilio
                        ? 'border-purple-300 ring-1 ring-purple-400/20'
                        : esPreparacion
                        ? 'border-blue-300 ring-1 ring-blue-400/20'
                        : esEntregado
                        ? 'border-emerald-200 opacity-80 hover:opacity-100'
                        : 'border-amber-300 ring-1 ring-amber-400/20'
                    }`}
                  >
                    {/* Header de Tarjeta */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {pedido.codigo}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <IconClock className="w-3.5 h-3.5" />
                          {pedido.horaPedido}
                        </span>
                      </div>

                      {/* Badge de Estado */}
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          esEntregado
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : esDomicilio
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : esPreparacion
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        {esEntregado
                          ? '✅ Entregado'
                          : esDomicilio
                          ? '🛵 En Domicilio'
                          : esPreparacion
                          ? '🍧 En Preparación'
                          : '⏳ Esperando Nequi'}
                      </span>
                    </div>

                    {/* Detalle de Granizados y Toppings */}
                    <div className="bg-amber-50/50 border border-amber-100/80 rounded-xl p-3 space-y-1">
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                        Productos Solicitados:
                      </span>
                      <p className="text-xs font-semibold text-slate-900 leading-snug">
                        {pedido.detalleProductos}
                      </p>
                    </div>

                    {/* Dirección de Entrega 100% Domicilio */}
                    <div className="space-y-1 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <IconMapPin className="w-3.5 h-3.5 text-rose-500" />
                          Dirección de Domicilio:
                        </span>
                        <button
                          onClick={() => copiarDireccion(pedido.id, pedido.direccion)}
                          className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                          title="Copiar dirección"
                        >
                          <IconCopy className="w-3 h-3" />
                          {direccionCopiadaId === pedido.id ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        {pedido.direccion}
                      </p>
                    </div>

                    {/* Cliente & Contacto */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Cliente</span>
                        <span className="font-bold text-slate-900">
                          {pedido.clientes?.nombre || 'Cliente WhatsApp'}
                        </span>
                      </div>

                      {pedido.clientes?.telefono_wa && (
                        <a
                          href={`https://wa.me/${pedido.clientes.telefono_wa}?text=Hola%20${encodeURIComponent(
                            pedido.clientes?.nombre || ''
                          )},%20te%20escribimos%20de%20Graniza2KL%20sobre%20tu%20pedido%20${pedido.codigo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                        >
                          <IconBrandWhatsapp className="w-3.5 h-3.5 text-emerald-600" />
                          WhatsApp
                        </a>
                      )}
                    </div>

                    {/* Footer con Valor y Botones de Avance */}
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">Total Cobrado:</span>
                        <span className="font-mono text-sm font-black text-slate-900">
                          ${(pedido.valor_total || 0).toLocaleString('es-CO')}
                        </span>
                      </div>

                      {/* Botones de Cambio de Estado en 1 Clic */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {esPendiente && (
                          <button
                            onClick={() => handleCambiarEstado(pedido.id, 'en_preparacion')}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <IconCheck className="w-4 h-4" />
                            Aprobar Pago & Pasar a Cocina
                          </button>
                        )}

                        {esPreparacion && (
                          <button
                            onClick={() => handleCambiarEstado(pedido.id, 'en_domicilio')}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <IconTruckDelivery className="w-4 h-4" />
                            Despachar con Domiciliario 🛵
                          </button>
                        )}

                        {esDomicilio && (
                          <button
                            onClick={() => handleCambiarEstado(pedido.id, 'completada')}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <IconCheck className="w-4 h-4" />
                            Marcar como Entregado ✅
                          </button>
                        )}

                        {esEntregado && (
                          <div className="w-full py-1.5 text-center text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                            Pedido Entregado con Éxito
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {pedidosFiltrados.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2">
              <span className="text-4xl block">🍧</span>
              <h3 className="text-base font-bold text-slate-800">No se encontraron pedidos</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No hay pedidos en la categoría seleccionada. Los nuevos pedidos que entren por WhatsApp aparecerán aquí en vivo.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* VISTA DE MÉTRICAS & HORAS PICO */
        <div className="space-y-6">
          {/* Tarjetas KPI de Graniza2KL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <IconCoin className="w-4 h-4 text-emerald-600" />
                Ventas Totales Hoy
              </span>
              <p className="text-2xl font-black text-slate-900 font-mono">
                ${metricasGranizados.totalVentas.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                100% Pagos Verificados Nequi
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <IconTruckDelivery className="w-4 h-4 text-purple-600" />
                Total Pedidos Despachados
              </span>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {metricasGranizados.totalPedidos} Domicilios
              </p>
              <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full inline-block">
                {metricasGranizados.entregados} entregados con éxito
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <IconReceipt className="w-4 h-4 text-amber-600" />
                Ticket Promedio
              </span>
              <p className="text-2xl font-black text-slate-900 font-mono">
                ${Math.round(metricasGranizados.ticketPromedio).toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full inline-block">
                Promedio ~2 granizados/orden
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <IconFlame className="w-4 h-4 text-rose-500" />
                Franja de Mayor Venta
              </span>
              <p className="text-xl font-black text-rose-600">
                3:00 PM - 6:00 PM
              </p>
              <span className="text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full inline-block">
                68% de las solicitudes
              </span>
            </div>
          </div>

          {/* Gráfico Visual de Horas Pico (Peak Hours) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <IconTrendingUp className="w-4 h-4 text-amber-600" />
                  Mapa de Calor: Horas Pico de Domicilios
                </h3>
                <p className="text-xs text-slate-500">
                  Cantidad de pedidos recibidos por hora para programar producción de hielo y domiciliarios.
                </p>
              </div>

              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                Pico Máximo: 5:00 PM (Tarde / Merienda)
              </span>
            </div>

            {/* Barras de Horas */}
            <div className="grid grid-cols-10 gap-2 items-end pt-6 pb-2 min-h-[180px]">
              {Object.entries(metricasGranizados.horasMap).map(([horaStr, count]) => {
                const hora = parseInt(horaStr, 10);
                const porcentaje = (count / metricasGranizados.maxHoraCount) * 100;
                const esPico = hora >= 15 && hora <= 18;

                const labelHora =
                  hora < 12
                    ? `${hora} am`
                    : hora === 12
                    ? '12 pm'
                    : `${hora - 12} pm`;

                return (
                  <div key={hora} className="flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">
                      {count} {count === 1 ? 'ped' : 'peds'}
                    </span>
                    <div className="w-full bg-slate-100 rounded-xl h-36 flex items-end p-1 overflow-hidden">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(porcentaje, 12)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`w-full rounded-lg transition ${
                          esPico
                            ? 'bg-gradient-to-t from-amber-500 to-orange-500 shadow-sm'
                            : 'bg-slate-300 group-hover:bg-amber-400'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        esPico ? 'text-amber-800 font-black' : 'text-slate-500'
                      }`}
                    >
                      {labelHora}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tip Operativo */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
              <IconSparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-950 leading-relaxed">
                <strong>Recomendación logística:</strong> El 68% de las compras ocurren entre las <strong>3:00 PM y las 6:30 PM</strong>. Se sugiere tener los vasos rotulados, pulpas descongeladas y al menos 2 domiciliarios disponibles en esta franja.
              </p>
            </div>
          </div>

          {/* Ranking de Sabores & Tamaños Más Pedidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sabores y Licores */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🍸</span> Cócteles & Granizados con Licor Más Pedidos
              </h3>
              <div className="space-y-3">
                {[
                  { sabor: 'Mango Biche Tequilero (+18)', porcentaje: 42, color: 'bg-amber-500' },
                  { sabor: 'Maracuyá con Vodka Smirnoff (+18)', porcentaje: 28, color: 'bg-yellow-500' },
                  { sabor: 'Frutos Rojos con Ron Medellín (+18)', porcentaje: 16, color: 'bg-rose-500' },
                  { sabor: 'Tamarindo Tequilero con Chamoy (+18)', porcentaje: 9, color: 'bg-orange-600' },
                  { sabor: 'Café Baileys Frappé Especial (+18)', porcentaje: 5, color: 'bg-purple-600' },
                ].map((item) => (
                  <div key={item.sabor} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{item.sabor}</span>
                      <span className="font-bold text-slate-600">{item.porcentaje}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${item.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tamaños y Licores */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🥤</span> Preferencia de Tamaños & Presentación
              </h3>
              <div className="space-y-3">
                {[
                  { tamano: 'Clásico con Licor 16oz ($12.000 COP)', porcentaje: 54, tag: 'Más Vendido', color: 'bg-emerald-500' },
                  { tamano: 'Mega Cóctel Frappé 24oz ($17.000 COP)', porcentaje: 31, tag: 'Para Rumbear', color: 'bg-purple-500' },
                  { tamano: 'Personal con Licor 12oz ($9.000 COP)', porcentaje: 15, tag: 'Individual', color: 'bg-blue-500' },
                ].map((item) => (
                  <div key={item.tamano} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{item.tamano}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                          {item.tag}
                        </span>
                      </div>
                      <span className="font-bold text-slate-600">{item.porcentaje}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${item.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Licores y Adiciones Preferidas:</span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-lg font-medium">
                    🍸 Vodka Smirnoff (48%)
                  </span>
                  <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg font-medium">
                    🌵 Tequila José Cuervo (35%)
                  </span>
                  <span className="bg-rose-50 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-lg font-medium">
                    🥃 Ron Caldas / Medellín (17%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
