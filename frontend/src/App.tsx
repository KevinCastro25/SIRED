import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarView } from './components/CalendarView.tsx';
import { MetricCards } from './components/MetricCards.tsx';
import { AnalyticsCharts } from './components/AnalyticsCharts.tsx';
import { NewBookingModal } from './components/NewBookingModal.tsx';
import { NewComplejoModal } from './components/NewComplejoModal.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { Cancha, Reserva, Metricas, Complejo, PerfilUsuario } from './types.ts';
import { supabase } from './config/supabase.ts';
import { BrandLogo } from './components/BrandLogo.tsx';
import {
  IconCalendar,
  IconChartBar,
  IconBuilding,
  IconPlus,
  IconRefresh,
  IconLogout,
  IconPhone,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react';

export function App() {
  const hoyIso = new Date().toISOString().split('T')[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyIso);
  const [complejos, setComplejos] = useState<Complejo[]>([]);
  const [complejoActualId, setComplejoActualId] = useState<string>('');
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [periodoMetricas, setPeriodoMetricas] = useState<'hoy' | 'semana' | 'mes'>('semana');
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);

  // Estado de Autenticación y Control de Roles
  const [usuarioActual, setUsuarioActual] = useState<PerfilUsuario | null>(() => {
    try {
      const guardado = localStorage.getItem('sired_usuario');
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const [modalTurnoAbierto, setModalTurnoAbierto] = useState(false);
  const [modalComplejoAbierto, setModalComplejoAbierto] = useState(false);
  const [canchaSeleccionadaModal, setCanchaSeleccionadaModal] = useState<Cancha | undefined>();
  const [horaInicioModal, setHoraInicioModal] = useState<string | undefined>();
  const [horaFinModal, setHoraFinModal] = useState<string | undefined>();
  const [reservaExistenteModal, setReservaExistenteModal] = useState<Reserva | undefined>();
  const [actualizando, setActualizando] = useState(false);
  const [pestanaActiva, setPestanaActiva] = useState<'calendario' | 'metricas'>('calendario');

  // 1. Cargar lista de complejos / empresas con detección dinámica por slug en la URL
  const cargarComplejos = async () => {
    try {
      const res = await fetch('/api/complejos');
      if (res.ok) {
        const data: Complejo[] = await res.json();
        setComplejos(data || []);

        if (data && data.length > 0) {
          // Detectar slug de la ruta actual (ej: /el-diamante, /padel-club-127, /padel-club)
          const rawSlug = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
          const slugRuta = ['login', 'admin', 'metricas', 'calendario'].includes(rawSlug) ? '' : rawSlug;

          let targetId = '';

          // A) Si la URL tiene un slug específico, buscar coincidencia exacta o flexible
          if (slugRuta) {
            const encontrado = data.find((c) => {
              const s = c.slug?.toLowerCase();
              if (!s) return false;
              return (
                s === slugRuta ||
                s.replace(/-/g, '') === slugRuta.replace(/-/g, '') ||
                (slugRuta.length >= 4 && (s.includes(slugRuta) || slugRuta.includes(s)))
              );
            });

            if (encontrado) {
              targetId = encontrado.id;
              // Normalizar URL en el navegador con el slug oficial del negocio
              window.history.replaceState(null, '', `/${encontrado.slug}`);
            }
          }

          // B) Si el usuario logueado pertenece a un negocio específico y no es superadmin
          if (!targetId && usuarioActual && usuarioActual.rol !== 'superadmin' && usuarioActual.complejo_id) {
            targetId = usuarioActual.complejo_id;
          }

          // C) Si no hay selección y no hay slug, tomar el primero pero mantener la URL limpia en '/'
          if (!targetId) {
            targetId = complejoActualId || data[0].id;
          }

          setComplejoActualId(targetId);
          cargarDatos(targetId);
        }
      }
    } catch (err) {
      console.error('Error cargando empresas:', err);
    }
  };

  // Cambiar de empresa (para SuperAdmin) y actualizar la URL en vivo
  const handleCambiarComplejo = (nuevoId: string) => {
    setComplejoActualId(nuevoId);
    cargarDatos(nuevoId);
    const target = complejos.find((c) => c.id === nuevoId);
    if (target?.slug) {
      window.history.pushState(null, '', `/${target.slug}`);
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  // 2. Cargar canchas, reservas y métricas filtradas por la empresa seleccionada
  const cargarDatos = async (complejoId?: string) => {
    setActualizando(true);
    const targetComplejoId = complejoId || complejoActualId;
    const queryParam = targetComplejoId ? `?complejo_id=${targetComplejoId}` : '';

    try {
      const [resCanchas, resReservas] = await Promise.all([
        fetch(`/api/canchas${queryParam}`),
        fetch(`/api/reservas${queryParam}`),
      ]);

      if (resCanchas.ok) {
        const dataCanchas = await resCanchas.json();
        setCanchas(dataCanchas || []);
      }

      if (resReservas.ok) {
        const dataReservas = await resReservas.json();
        setReservas(dataReservas || []);
      }
    } catch (err) {
      console.error('Error sincronizando con la base de datos:', err);
    } finally {
      setActualizando(false);
    }
  };

  // Carga inicial de empresas
  useEffect(() => {
    cargarComplejos();
  }, []);

  // Escuchar navegación del historial del navegador (Atrás / Adelante)
  useEffect(() => {
    const onPopState = () => {
      const rawSlug = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
      const currentSlug = ['login', 'admin', 'metricas', 'calendario'].includes(rawSlug) ? '' : rawSlug;
      if (complejos.length > 0 && currentSlug) {
        const match = complejos.find((c) => {
          const s = c.slug?.toLowerCase();
          return s === currentSlug || (currentSlug.length >= 4 && (s?.includes(currentSlug) || currentSlug.includes(s || '')));
        });
        if (match && match.id !== complejoActualId) {
          setComplejoActualId(match.id);
          cargarDatos(match.id);
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [complejos, complejoActualId]);

  // Al cambiar la empresa o la fecha, refrescar los datos
  useEffect(() => {
    if (complejoActualId) {
      cargarDatos(complejoActualId);
    }
  }, [complejoActualId, fechaSeleccionada]);

  // Si cambia el usuario actual y tiene un complejo asignado, fijar ese complejo
  useEffect(() => {
    if (usuarioActual && usuarioActual.rol !== 'superadmin' && usuarioActual.complejo_id) {
      setComplejoActualId(usuarioActual.complejo_id);
    }
  }, [usuarioActual]);

  // Suscripción Realtime en Supabase
  useEffect(() => {
    const canal = supabase
      .channel('cambios-reservas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        () => {
          cargarDatos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [complejoActualId]);

  // Métricas calculadas dinámicamente según el período seleccionado (hoy, semana, mes)
  const metricasFiltradas = useMemo<Metricas>(() => {
    const ahora = new Date();
    const ahoraCol = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const anio = ahoraCol.getFullYear();
    const mes = ahoraCol.getMonth();

    const toStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let inicioStr = '';
    let finStr = '';

    if (periodoMetricas === 'hoy') {
      const hoy = toStr(ahoraCol);
      inicioStr = hoy;
      finStr = hoy;
    } else if (periodoMetricas === 'semana') {
      const diaSemana = ahoraCol.getDay();
      const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
      const lunes = new Date(ahoraCol);
      lunes.setDate(ahoraCol.getDate() + diffLunes);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      inicioStr = toStr(lunes);
      finStr = toStr(domingo);
    } else {
      const primerDia = new Date(anio, mes, 1);
      const ultimoDia = new Date(anio, mes + 1, 0);
      inicioStr = toStr(primerDia);
      finStr = toStr(ultimoDia);
    }

    const filtradas = reservas.filter((r) => {
      const fecha = r.fecha_inicio.split('T')[0];
      return fecha >= inicioStr && fecha <= finStr && r.estado !== 'cancelada';
    });

    const confirmadas = filtradas.filter(
      (r) => r.estado === 'confirmada' || r.estado === 'completada'
    );

    const ingresos = confirmadas.reduce((sum, r) => sum + Number(r.valor_total || 0), 0);
    const anticipos = confirmadas.reduce(
      (sum, r) => sum + Number(r.valor_anticipo_requerido || 0),
      0
    );

    return {
      total_reservas: filtradas.length,
      reservas_confirmadas: confirmadas.length,
      ingresos_estimados: ingresos,
      anticipos_recaudados: anticipos,
    };
  }, [reservas, periodoMetricas]);

  const handleSeleccionarTurno = (
    cancha: Cancha,
    horaInicio: string,
    horaFin: string,
    reservaExistente?: Reserva
  ) => {
    setCanchaSeleccionadaModal(cancha);
    setHoraInicioModal(horaInicio);
    setHoraFinModal(horaFin);
    setReservaExistenteModal(reservaExistente);
    setModalTurnoAbierto(true);
  };

  const handleLogin = (perfil: PerfilUsuario) => {
    let targetComplejoId = perfil.complejo_id;
    if (!targetComplejoId && complejos.length > 0) {
      targetComplejoId = complejos[0].id;
    }
    const perfilFinal: PerfilUsuario = {
      ...perfil,
      ...(targetComplejoId ? { complejo_id: targetComplejoId } : {}),
    };
    setUsuarioActual(perfilFinal);
    localStorage.setItem('sired_usuario', JSON.stringify(perfilFinal));
    if (targetComplejoId) {
      setComplejoActualId(targetComplejoId);
      cargarDatos(targetComplejoId);
    }
  };

  const handleLogout = () => {
    setUsuarioActual(null);
    localStorage.removeItem('sired_usuario');
  };

  const pathSlug = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() : '';
  const slugRuta = ['login', 'admin', 'metricas', 'calendario'].includes(pathSlug) ? '' : pathSlug;
  const complejoActivo = complejos.find((c) => c.id === complejoActualId) || complejos[0];

  // Si no hay sesión iniciada, mostrar pantalla de Login personalizada por slug
  if (!usuarioActual) {
    return (
      <LoginScreen
        complejos={complejos}
        onLogin={handleLogin}
        complejoActivo={complejoActivo}
        slugRuta={slugRuta}
      />
    );
  }

  const esSuperAdmin = usuarioActual.rol === 'superadmin';

  const rubro = complejoActivo?.tipo_negocio || 'deportes';
  const configRubro = {
    deportes: {
      badge: '⚽ Deportes',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      recursos: 'Canchas Deportivas',
      vacio: 'No hay canchas registradas para este complejo deportivo.',
    },
    barberia: {
      badge: '💈 Barbería',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      recursos: 'Puestos y Barberos',
      vacio: 'No hay puestos o barberos registrados para esta barbería.',
    },
    belleza_unas: {
      badge: '💅 Spa & Uñas',
      badgeColor: 'bg-pink-50 text-pink-800 border-pink-200',
      recursos: 'Especialistas y Mesas',
      vacio: 'No hay especialistas o puestos de atención registrados para este salón.',
    },
    salud: {
      badge: '🩺 Consultorio',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      recursos: 'Consultorios y Especialistas',
      vacio: 'No hay consultorios registrados para este centro de salud.',
    },
  }[rubro as 'deportes' | 'barberia' | 'belleza_unas' | 'salud'] || {
    badge: '🏢 Negocio',
    badgeColor: 'bg-slate-50 text-slate-800 border-slate-200',
    recursos: 'Recursos / Puestos',
    vacio: 'No hay recursos registrados.',
  };

  const copiarEnlaceNegocio = () => {
    if (!complejoActivo?.slug) return;
    const url = `${window.location.origin}/${complejoActivo.slug}`;
    navigator.clipboard.writeText(url);
    setEnlaceCopiado(true);
    setTimeout(() => setEnlaceCopiado(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Barra de Navegación Superior Limpia */}
      <header className="bg-white sticky top-0 z-40 px-3 sm:px-6 py-2.5 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo y Empresa Activa */}
          <div className="flex items-center gap-4">
            <BrandLogo size="md" theme="light" />
            
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Selector de Empresa para SuperAdmin o Badge de Club */}
            {esSuperAdmin ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                  <IconBuilding className="w-4 h-4 text-emerald-700 mr-2 shrink-0" />
                  <select
                    value={complejoActualId}
                    onChange={(e) => handleCambiarComplejo(e.target.value)}
                    className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer pr-1"
                  >
                    {complejos.map((c) => {
                      const icon =
                        c.tipo_negocio === 'barberia'
                          ? '💈'
                          : c.tipo_negocio === 'belleza_unas'
                          ? '💅'
                          : c.tipo_negocio === 'salud'
                          ? '🩺'
                          : '⚽';
                      return (
                        <option key={c.id} value={c.id}>
                          {icon} {c.nombre} {c.ciudad ? `(${c.ciudad})` : ''}
                        </option>
                      );
                    })}
                    {complejos.length === 0 && (
                      <option value="">Cargando negocios...</option>
                    )}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-3 py-1 text-xs font-semibold">
                  <IconBuilding className="w-3.5 h-3.5 text-emerald-700 mr-1.5 shrink-0" />
                  <span>{complejoActivo?.nombre || 'Mi Negocio'}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${configRubro.badgeColor}`}>
                  {configRubro.badge}
                </span>
              </div>
            )}
          </div>

          {/* Navegación por Pestañas Central con Animación Fluida */}
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setPestanaActiva('calendario')}
              className={`relative px-4 py-1.5 rounded-lg transition text-xs font-semibold ${
                pestanaActiva === 'calendario'
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {pestanaActiva === 'calendario' && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <IconCalendar className="w-4 h-4 text-emerald-600" />
                <span>Turnos & Calendario</span>
              </span>
            </button>

            <button
              onClick={() => setPestanaActiva('metricas')}
              className={`relative px-4 py-1.5 rounded-lg transition text-xs font-semibold ${
                pestanaActiva === 'metricas'
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {pestanaActiva === 'metricas' && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <IconChartBar className="w-4 h-4 text-emerald-600" />
                <span>Métricas & Caja</span>
              </span>
            </button>
          </nav>

          {/* Acciones y Perfil */}
          <div className="flex items-center gap-2.5">
            {esSuperAdmin && (
              <button
                onClick={() => setModalComplejoAbierto(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                title="Registrar una nueva empresa o salón"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Nuevo Negocio</span>
              </button>
            )}

            <button
              onClick={() => cargarDatos()}
              disabled={actualizando}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition"
              title="Refrescar datos"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${actualizando ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Perfil & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-bold text-slate-800">{usuarioActual.nombre}</span>
                <span className="text-[10px] text-slate-500 capitalize">
                  {esSuperAdmin ? 'SuperAdmin' : 'Administrador'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl border border-slate-200 hover:border-rose-200 transition"
              >
                <IconLogout className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal Limpio con Animación */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        <AnimatePresence mode="wait">
          {pestanaActiva === 'calendario' ? (
            <motion.div
              key="calendario"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Barra informativa minimalista y limpia con enlace dinámico por slug */}
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{complejoActivo?.nombre}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${configRubro.badgeColor}`}>
                      {configRubro.badge}
                    </span>
                  </div>

                  {complejoActivo?.slug && (
                    <button
                      onClick={copiarEnlaceNegocio}
                      title="Copiar enlace personalizado del negocio"
                      className="flex items-center gap-1 font-mono text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 transition"
                    >
                      {enlaceCopiado ? (
                        <>
                          <IconCheck className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">¡Enlace copiado!</span>
                        </>
                      ) : (
                        <>
                          <IconCopy className="w-3 h-3 text-slate-400" />
                          <span>/{complejoActivo.slug}</span>
                        </>
                      )}
                    </button>
                  )}

                  {complejoActivo?.telefono_whatsapp && (
                    <a
                      href={`https://wa.me/${complejoActivo.telefono_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-mono transition"
                    >
                      <IconPhone className="w-3.5 h-3.5 text-emerald-600" /> {complejoActivo.telefono_whatsapp}
                    </a>
                  )}

                  {complejoActivo?.nequi_numero && (
                    <span className="text-slate-500 hidden sm:inline">
                      • Nequi/Davi: <strong className="text-slate-800 font-mono">{complejoActivo.nequi_numero}</strong>
                    </span>
                  )}
                </div>
                <div className="text-slate-500 font-mono">
                  Horario: {complejoActivo?.hora_apertura?.slice(0, 5) || '06:00'} - {complejoActivo?.hora_cierre?.slice(0, 5) || '23:00'}
                </div>
              </div>

              {canchas.length > 0 ? (
                <CalendarView
                  canchas={canchas}
                  reservas={reservas}
                  fechaSeleccionada={fechaSeleccionada}
                  onCambiarFecha={setFechaSeleccionada}
                  onSeleccionarTurno={handleSeleccionarTurno}
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                  <p className="text-slate-600 text-sm">
                    {configRubro.vacio}
                  </p>
                  <button
                    onClick={() => cargarDatos()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
                  >
                    Reintentar Conexión
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="metricas"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <MetricCards metricas={metricasFiltradas} periodo={periodoMetricas} />

              <AnalyticsCharts
                canchas={canchas}
                reservas={reservas}
                nombreComplejo={complejoActivo?.nombre || 'Complejo Deportivo'}
                periodo={periodoMetricas}
                onPeriodoChange={setPeriodoMetricas}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <NewBookingModal
        isOpen={modalTurnoAbierto}
        onClose={() => setModalTurnoAbierto(false)}
        cancha={canchaSeleccionadaModal}
        horaInicio={horaInicioModal}
        horaFin={horaFinModal}
        fechaSeleccionada={fechaSeleccionada}
        reservaExistente={reservaExistenteModal}
        onGuardar={() => cargarDatos()}
      />

      <NewComplejoModal
        isOpen={modalComplejoAbierto}
        onClose={() => setModalComplejoAbierto(false)}
        onComplejoCreado={(nuevo) => {
          setComplejos((prev) => [...prev, nuevo]);
          setComplejoActualId(nuevo.id);
        }}
      />
    </div>
  );
}

export default App;
