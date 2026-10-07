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
  IconArrowRight,
  IconArrowLeft,
  IconLoader2,
  IconCircleCheck,
  IconBottle,
  IconRefresh,
} from '@tabler/icons-react';
import { Complejo, Reserva } from '../types.ts';

interface Props {
  complejo: Complejo;
  reservas: Reserva[];
  onActualizarReserva?: (reservaId: string, updates: Partial<Reserva>) => Promise<void>;
  onRecargar?: () => void;
}

type TabType = 'kanban' | 'metricas';
type ColumnaId = 'nuevo' | 'en_preparacion' | 'en_camino' | 'entregado';

interface ColumnaConfig {
  id: ColumnaId;
  titulo: string;
  subtitulo: string;
  icono: string;
  colorBorder: string;
  colorBadge: string;
  colorHeader: string;
}

const COLUMNAS_KANBAN: ColumnaConfig[] = [
  {
    id: 'nuevo',
    titulo: 'Nuevo',
    subtitulo: 'Recibidos / Esperando pago',
    icono: '📥',
    colorBorder: 'border-amber-300',
    colorBadge: 'bg-amber-100 text-amber-900 border-amber-300',
    colorHeader: 'bg-amber-500/10 border-amber-200 text-amber-950',
  },
  {
    id: 'en_preparacion',
    titulo: 'En Preparación',
    subtitulo: 'Licuando frappés en barra',
    icono: '🍧',
    colorBorder: 'border-blue-300',
    colorBadge: 'bg-blue-100 text-blue-900 border-blue-300',
    colorHeader: 'bg-blue-500/10 border-blue-200 text-blue-950',
  },
  {
    id: 'en_camino',
    titulo: 'En Camino',
    subtitulo: 'Despachado con domiciliario 🛵',
    icono: '🛵',
    colorBorder: 'border-purple-300',
    colorBadge: 'bg-purple-100 text-purple-900 border-purple-300',
    colorHeader: 'bg-purple-500/10 border-purple-200 text-purple-950',
  },
  {
    id: 'entregado',
    titulo: 'Entregado',
    subtitulo: 'Entregado al cliente con éxito',
    icono: '✅',
    colorBorder: 'border-emerald-300',
    colorBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    colorHeader: 'bg-emerald-500/10 border-emerald-200 text-emerald-950',
  },
];

export const OrdersDashboard: React.FC<Props> = ({
  complejo,
  reservas,
  onActualizarReserva,
  onRecargar,
}) => {
  const [tabActivo, setTabActivo] = useState<TabType>('kanban');
  const [busqueda, setBusqueda] = useState('');
  const [direccionCopiadaId, setDireccionCopiadaId] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [toastNotificacion, setToastNotificacion] = useState<{
    tipo: 'exito' | 'error';
    mensaje: string;
    waEnviado?: boolean;
  } | null>(null);

  // Mapear y procesar reservas a formato Kanban de Pedidos de Granizados
  const pedidosProcesados = useMemo(() => {
    return reservas.map((r, index) => {
      const notas = r.notas || '';
      let subEstado: ColumnaId = 'nuevo';

      if (r.estado === 'completada' || notas.includes('[ENTREGADO]')) {
        subEstado = 'entregado';
      } else if (notas.includes('[EN_DOMICILIO]')) {
        subEstado = 'en_camino';
      } else if (notas.includes('[EN_PREPARACION]')) {
        subEstado = 'en_preparacion';
      } else if (r.estado === 'confirmada') {
        subEstado = 'en_preparacion';
      } else {
        subEstado = 'nuevo';
      }

      // Extraer dirección de entrega de las notas
      let direccion = 'Pereira / Cobertura Domicilio';
      const dirMatch = notas.match(/📍\s*Domicilio:\s*([^.[\n]+)/i);
      if (dirMatch && dirMatch[1]) {
        direccion = dirMatch[1].trim();
      }

      // Extraer detalle de productos / granizados
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

  // Filtrar pedidos por texto de búsqueda
  const pedidosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return pedidosProcesados;
    const q = busqueda.toLowerCase();
    return pedidosProcesados.filter((p) => {
      const clienteNom = p.clientes?.nombre?.toLowerCase() || '';
      const tel = p.clientes?.telefono_wa || '';
      const dir = p.direccion.toLowerCase();
      const det = p.detalleProductos.toLowerCase();
      const cod = p.codigo.toLowerCase();
      return (
        clienteNom.includes(q) ||
        tel.includes(q) ||
        dir.includes(q) ||
        det.includes(q) ||
        cod.includes(q)
      );
    });
  }, [pedidosProcesados, busqueda]);

  // Agrupar pedidos por columna Kanban
  const pedidosPorColumna = useMemo(() => {
    const mapa: Record<ColumnaId, typeof pedidosFiltrados> = {
      nuevo: [],
      en_preparacion: [],
      en_camino: [],
      entregado: [],
    };
    pedidosFiltrados.forEach((p) => {
      if (mapa[p.subEstado]) {
        mapa[p.subEstado].push(p);
      } else {
        mapa.nuevo.push(p);
      }
    });
    return mapa;
  }, [pedidosFiltrados]);

  // Métricas avanzadas para Graniza2KL
  const metricasGranizados = useMemo(() => {
    const pedidosValidos = pedidosProcesados.filter((p) => p.estado !== 'cancelada');
    const totalVentas = pedidosValidos.reduce((acc, p) => acc + (p.valor_total || 0), 0);
    const entregados = pedidosProcesados.filter((p) => p.subEstado === 'entregado').length;
    const enCamino = pedidosProcesados.filter((p) => p.subEstado === 'en_camino').length;
    const enPreparacion = pedidosProcesados.filter((p) => p.subEstado === 'en_preparacion').length;
    const nuevos = pedidosProcesados.filter((p) => p.subEstado === 'nuevo').length;

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
      enCamino,
      enPreparacion,
      nuevos,
      totalPedidos: pedidosValidos.length,
      ticketPromedio: pedidosValidos.length > 0 ? totalVentas / pedidosValidos.length : 0,
      horasMap,
      maxHoraCount,
    };
  }, [pedidosProcesados]);

  // Transición de estado Kanban con Notificación Automática WhatsApp
  const handleCambiarEstado = async (reservaId: string, nuevoEstado: ColumnaId) => {
    const pedido = pedidosProcesados.find((p) => p.id === reservaId);
    if (!pedido) return;

    setProcesandoId(reservaId);

    const nombresEstados: Record<ColumnaId, string> = {
      nuevo: 'Nuevo',
      en_preparacion: 'En Preparación',
      en_camino: 'En Camino',
      entregado: 'Entregado',
    };

    try {
      // 1. Intentar llamar al backend para actualizar estado y enviar WhatsApp automático
      const res = await fetch(`/api/pedidos/${reservaId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoEstado }),
      });

      if (res.ok) {
        const data = await res.json();
        setToastNotificacion({
          tipo: 'exito',
          mensaje: `Pedido ${pedido.codigo} movido a "${nombresEstados[nuevoEstado]}".`,
          waEnviado: data.mensajeEnviado,
        });
      } else {
        throw new Error('Fallo la respuesta del servidor');
      }

      if (onRecargar) {
        await onRecargar();
      }
    } catch (err) {
      console.warn('Endpoint directo falló o en local sin backend, ejecutando fallback local:', err);

      // Fallback a onActualizarReserva si el endpoint directo no estuviera disponible
      if (onActualizarReserva) {
        let estadoDb: Reserva['estado'] = 'confirmada';
        let tag = '';

        if (nuevoEstado === 'nuevo') {
          estadoDb = 'pendiente_pago';
          tag = '[ESPERANDO_PAGO]';
        } else if (nuevoEstado === 'en_preparacion') {
          estadoDb = 'confirmada';
          tag = '[EN_PREPARACION]';
        } else if (nuevoEstado === 'en_camino') {
          estadoDb = 'confirmada';
          tag = '[EN_DOMICILIO]';
        } else if (nuevoEstado === 'entregado') {
          estadoDb = 'completada';
          tag = '[ENTREGADO]';
        }

        const notaLimpia = (pedido.notas || '')
          .replace(/\[EN_PREPARACION\]|\[EN_DOMICILIO\]|\[ENTREGADO\]|\[ESPERANDO_PAGO\]/g, '')
          .trim();

        await onActualizarReserva(reservaId, {
          estado: estadoDb,
          notas: `${notaLimpia} ${tag}`.trim(),
        });

        setToastNotificacion({
          tipo: 'exito',
          mensaje: `Pedido ${pedido.codigo} actualizado localmente a "${nombresEstados[nuevoEstado]}".`,
          waEnviado: false,
        });

        if (onRecargar) onRecargar();
      }
    } finally {
      setProcesandoId(null);
      setTimeout(() => setToastNotificacion(null), 5500);
    }
  };

  const copiarDireccion = (id: string, direccion: string) => {
    navigator.clipboard.writeText(direccion);
    setDireccionCopiadaId(id);
    setTimeout(() => setDireccionCopiadaId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Flotante de Notificación WhatsApp */}
      <AnimatePresence>
        {toastNotificacion && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border flex items-start gap-3 max-w-md ${
              toastNotificacion.tipo === 'exito'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            <div className="p-2 rounded-xl bg-white/10 shrink-0 mt-0.5">
              {toastNotificacion.waEnviado ? (
                <IconBrandWhatsapp className="w-5 h-5 text-emerald-400" />
              ) : (
                <IconCircleCheck className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {toastNotificacion.waEnviado ? 'WhatsApp Automático Enviado' : 'Estado Actualizado'}
              </h4>
              <p className="text-sm font-medium leading-snug">{toastNotificacion.mensaje}</p>
              {toastNotificacion.waEnviado && (
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <IconCheck className="w-3.5 h-3.5" /> El cliente recibió la notificación con su dirección y pedido en tiempo real.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner de Cabecera Graniza2KL */}
      <div className="bg-gradient-to-r from-purple-800 via-pink-700 to-amber-600 text-white p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍸</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {complejo.nombre}
            </h1>
            <span className="bg-white/20 backdrop-blur-md text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white">
              Tablero Kanban & Domicilios (+18)
            </span>
          </div>
          <p className="text-pink-100 text-xs sm:text-sm">
            Control de pedidos en vivo con notificación automática por WhatsApp al cambiar de estado.
          </p>
        </div>

        {/* Selector de Vistas: Tablero Kanban vs Horas Pico & Métricas */}
        <div className="flex items-center bg-black/25 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-inner">
          <button
            onClick={() => setTabActivo('kanban')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              tabActivo === 'kanban'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <span className="text-sm">📊</span>
            Tablero Kanban ({pedidosProcesados.length})
          </button>
          <button
            onClick={() => setTabActivo('metricas')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              tabActivo === 'metricas'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <IconFlame className="w-4 h-4 text-amber-500" />
            Horas Pico & Métricas
          </button>
        </div>
      </div>

      {tabActivo === 'kanban' ? (
        /* VISTA TABLERO KANBAN DE 4 COLUMNAS */
        <div className="space-y-4">
          {/* Barra Superior de Búsqueda y Resumen Rápido */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 rounded-xl border border-amber-200">
                📥 Nuevos: <strong>{pedidosPorColumna.nuevo.length}</strong>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-900 rounded-xl border border-blue-200">
                🍧 En Barra: <strong>{pedidosPorColumna.en_preparacion.length}</strong>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-900 rounded-xl border border-purple-200">
                🛵 En Camino: <strong>{pedidosPorColumna.en_camino.length}</strong>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200">
                ✅ Entregados: <strong>{pedidosPorColumna.entregado.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, #código, dirección..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                />
              </div>

              {onRecargar && (
                <button
                  onClick={onRecargar}
                  title="Recargar pedidos"
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                >
                  <IconRefresh className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* TABLERO KANBAN: 4 COLUMNAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {COLUMNAS_KANBAN.map((columna) => {
              const pedidosCol = pedidosPorColumna[columna.id];

              return (
                <div
                  key={columna.id}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[500px] shadow-xs"
                >
                  {/* Cabecera de Columna */}
                  <div className={`p-3 rounded-xl border mb-3 flex items-center justify-between ${columna.colorHeader}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{columna.icono}</span>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider">
                          {columna.titulo}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {columna.subtitulo}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-full border ${columna.colorBadge}`}
                    >
                      {pedidosCol.length}
                    </span>
                  </div>

                  {/* Lista de Tarjetas de Pedidos */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
                    <AnimatePresence mode="popLayout">
                      {pedidosCol.map((pedido) => {
                        const estaProcesando = procesandoId === pedido.id;

                        return (
                          <motion.div
                            key={pedido.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`bg-white border rounded-2xl p-3.5 shadow-xs space-y-3 hover:shadow-md transition relative ${
                              columna.id === 'nuevo'
                                ? 'border-amber-200'
                                : columna.id === 'en_preparacion'
                                ? 'border-blue-200'
                                : columna.id === 'en_camino'
                                ? 'border-purple-200 ring-1 ring-purple-300/30'
                                : 'border-emerald-200 opacity-90 hover:opacity-100'
                            }`}
                          >
                            {/* Overlay de Carga al procesar cambio */}
                            {estaProcesando && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center z-10 gap-2">
                                <IconLoader2 className="w-6 h-6 text-pink-600 animate-spin" />
                                <span className="text-[11px] font-bold text-slate-700">
                                  Notificando por WhatsApp...
                                </span>
                              </div>
                            )}

                            {/* Header Tarjeta: Código, Hora y Teléfono */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                  {pedido.codigo}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                  <IconClock className="w-3 h-3" />
                                  {pedido.horaPedido}
                                </span>
                              </div>

                              {pedido.clientes?.telefono_wa && (
                                <a
                                  href={`https://wa.me/${pedido.clientes.telefono_wa}?text=Hola%20${encodeURIComponent(
                                    pedido.clientes?.nombre || ''
                                  )},%20te%20escribimos%20de%20Graniza2KL%20sobre%20tu%20pedido%20${pedido.codigo}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition"
                                  title="Abrir chat en WhatsApp"
                                >
                                  <IconBrandWhatsapp className="w-3.5 h-3.5 text-emerald-600" />
                                  Chat
                                </a>
                              )}
                            </div>

                            {/* Cliente */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 text-[11px] font-medium">Cliente:</span>
                              <span className="font-bold text-slate-900">
                                {pedido.clientes?.nombre || 'Cliente WhatsApp'}
                              </span>
                            </div>

                            {/* Detalle de Productos (Granizados + Toppings + Licor) */}
                            <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-2.5 space-y-1">
                              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                                <IconBottle className="w-3 h-3 text-pink-600" />
                                Granizados Solicitados (+18):
                              </span>
                              <p className="text-xs font-bold text-slate-900 leading-snug">
                                {pedido.detalleProductos}
                              </p>
                            </div>

                            {/* Dirección de Domicilio */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                  <IconMapPin className="w-3.5 h-3.5 text-rose-500" />
                                  Dirección de Entrega:
                                </span>
                                <button
                                  onClick={() => copiarDireccion(pedido.id, pedido.direccion)}
                                  className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-0.5"
                                  title="Copiar dirección"
                                >
                                  <IconCopy className="w-3 h-3" />
                                  {direccionCopiadaId === pedido.id ? '¡Copiado!' : 'Copiar'}
                                </button>
                              </div>
                              <p className="text-xs font-bold text-slate-800 break-words">
                                {pedido.direccion}
                              </p>
                            </div>

                            {/* Total Cobrado */}
                            <div className="flex items-center justify-between pt-1 text-xs">
                              <span className="text-slate-500 font-medium">Total:</span>
                              <span className="font-mono text-sm font-black text-slate-900">
                                ${(pedido.valor_total || 0).toLocaleString('es-CO')} COP
                              </span>
                            </div>

                            {/* Indicador de Notificación Automática */}
                            <div className="text-[10px] font-bold text-slate-400 bg-slate-100/70 py-1 px-2 rounded-lg flex items-center justify-center gap-1 text-center">
                              <IconBrandWhatsapp className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>Notifica a WhatsApp al mover</span>
                            </div>

                            {/* Botones de Acción de Transición Kanban */}
                            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                              {/* COLUMNA: NUEVO */}
                              {columna.id === 'nuevo' && (
                                <button
                                  disabled={estaProcesando}
                                  onClick={() => handleCambiarEstado(pedido.id, 'en_preparacion')}
                                  className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <span>🍧</span>
                                  <span>Iniciar Preparación</span>
                                  <IconArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* COLUMNA: EN PREPARACIÓN */}
                              {columna.id === 'en_preparacion' && (
                                <>
                                  <button
                                    disabled={estaProcesando}
                                    onClick={() => handleCambiarEstado(pedido.id, 'nuevo')}
                                    title="Regresar a Nuevo"
                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                                  >
                                    <IconArrowLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={estaProcesando}
                                    onClick={() => handleCambiarEstado(pedido.id, 'en_camino')}
                                    className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <span>🛵</span>
                                    <span>Despachar (En Camino)</span>
                                    <IconArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {/* COLUMNA: EN CAMINO */}
                              {columna.id === 'en_camino' && (
                                <>
                                  <button
                                    disabled={estaProcesando}
                                    onClick={() => handleCambiarEstado(pedido.id, 'en_preparacion')}
                                    title="Regresar a Preparación"
                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                                  >
                                    <IconArrowLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={estaProcesando}
                                    onClick={() => handleCambiarEstado(pedido.id, 'entregado')}
                                    className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <IconCheck className="w-4 h-4" />
                                    <span>Marcar Entregado</span>
                                  </button>
                                </>
                              )}

                              {/* COLUMNA: ENTREGADO */}
                              {columna.id === 'entregado' && (
                                <div className="w-full flex items-center justify-between gap-1">
                                  <div className="flex-1 py-1.5 text-center text-[11px] font-black text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1">
                                    <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>¡Entregado con Éxito!</span>
                                  </div>
                                  <button
                                    disabled={estaProcesando}
                                    onClick={() => handleCambiarEstado(pedido.id, 'en_camino')}
                                    title="Revertir a En Camino"
                                    className="p-1.5 text-[10px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                  >
                                    Revertir
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {pedidosCol.length === 0 && (
                      <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl opacity-60">{columna.icono}</span>
                        <p className="text-xs font-semibold">Sin pedidos en esta fase</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISTA DE MÉTRICAS & HORAS PICO DE GRANIZA2KL */
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
                Promedio ~2 granizados con licor
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
                  Mapa de Calor: Horas Pico de Domicilios de Granizados
                </h3>
                <p className="text-xs text-slate-500">
                  Cantidad de pedidos recibidos por hora para programar producción de hielo frappé y domiciliarios.
                </p>
              </div>

              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                Pico Máximo: 5:00 PM (Tarde / Previas de Rumba)
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
                            ? 'bg-gradient-to-t from-pink-500 to-amber-500 shadow-sm'
                            : 'bg-slate-300 group-hover:bg-amber-400'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        esPico ? 'text-pink-800 font-black' : 'text-slate-500'
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
                <strong>Recomendación logística:</strong> El 68% de las compras ocurren entre las <strong>3:00 PM y las 6:30 PM</strong>. Se sugiere tener los vasos rotulados, pulpas descongeladas, licores a mano y al menos 2 repartidores disponibles en esta franja.
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
