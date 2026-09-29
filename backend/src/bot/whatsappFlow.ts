import { BookingService, Complejo, Cancha, HorarioDisponible } from '../services/bookingService.js';
import { ReceiptVerificationService } from '../services/receiptVerificationService.js';
import { AIReceptionistService } from '../services/aiReceptionistService.js';
import { supabase } from '../config/supabase.js';

export interface InteractiveRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveSection {
  title?: string;
  rows: InteractiveRow[];
}

export interface BotInteractiveMessage {
  type: 'list';
  header?: string;
  body: string;
  footer?: string;
  action: {
    button: string; // Max 20 chars
    sections: InteractiveSection[];
  };
}

export interface BotResponse {
  texto: string;
  interactive?: BotInteractiveMessage;
}

interface UserSession {
  paso: 'INICIO' | 'SELECCION_CANCHA' | 'SELECCION_FECHA' | 'SELECCION_HORA' | 'CONFIRMACION' | 'ESPERA_PAGO';
  complejoId?: string;
  canchasDisponibles?: Cancha[];
  canchaSeleccionada?: Cancha;
  fechaSeleccionada?: string; // YYYY-MM-DD
  horariosDisponibles?: HorarioDisponible[];
  horarioSeleccionado?: HorarioDisponible;
  reservaId?: string;
  nombreCliente?: string;
  ultimoMensaje: number;
}

const sesiones: Map<string, UserSession> = new Map();

export class WhatsAppFlow {
  /**
   * Procesa el mensaje identificando a qué complejo deportivo pertenece
   * y genera respuestas interactivas de menú desplegable para WhatsApp
   */
  static async procesarMensaje(
    telefono: string,
    texto: string,
    nombrePush?: string,
    complejoDirecto?: Complejo,
    mediaId?: string,
    mediaType?: string
  ): Promise<BotResponse> {
    try {
      const ahora = Date.now();
      let session = sesiones.get(telefono);

      // Obtener complejo asignado
      const complejo = complejoDirecto || (await BookingService.getComplejos())[0];

      if (!session || ahora - session.ultimoMensaje > 30 * 60 * 1000 || session.complejoId !== complejo.id) {
        session = { paso: 'INICIO', complejoId: complejo.id, ultimoMensaje: ahora };
        sesiones.set(telefono, session);
      }
      session.ultimoMensaje = ahora;

      const input = texto.trim().toLowerCase();

      if (input === 'reiniciar' || input === 'menu' || input === 'cancelar' || (input === 'hola' && session.paso !== 'INICIO')) {
        session.paso = 'INICIO';
      }

      // Detección inteligente de consultas libres (FAQ) y derivación a asesor humano
      if (!mediaId && (AIReceptionistService.esSolicitudHumano(input) || AIReceptionistService.esPreguntaFrecuente(input))) {
        const consulta = await AIReceptionistService.responderConsulta(texto, complejo);
        if (consulta.esPreguntaOAtencion && consulta.respuestaTexto) {
          return { texto: consulta.respuestaTexto };
        }
      }

      switch (session.paso) {
        case 'INICIO':
          return await this.manejarInicio(telefono, session, complejo, nombrePush);

        case 'SELECCION_CANCHA':
          return await this.manejarSeleccionCancha(input, session);

        case 'SELECCION_FECHA':
          return await this.manejarSeleccionFecha(input, session);

        case 'SELECCION_HORA':
          return await this.manejarSeleccionHora(input, session, telefono, complejo);

        case 'ESPERA_PAGO':
          return await this.manejarEsperaPago(input, session, complejo, mediaId, mediaType);

        default:
          session.paso = 'INICIO';
          return {
            texto: `¡Hola! Escribe *HOLA* para comenzar tu reserva en *${complejo.nombre}* ⚽🎾.`,
          };
      }
    } catch (globalErr: any) {
      console.error('Error general procesando flujo de WhatsApp:', globalErr);
      return {
        texto: '👋 ¡Hola! Ocurrió una pequeña interrupción en nuestro sistema. Por favor escribe *HOLA* o *MENU* para continuar.',
      };
    }
  }

  private static async manejarInicio(
    telefono: string,
    session: UserSession,
    complejo: Complejo,
    nombrePush?: string
  ): Promise<BotResponse> {
    await BookingService.getOrCreateCliente(telefono, nombrePush);

    // Consultar ÚNICAMENTE las canchas de esta empresa
    const canchas = await BookingService.getCanchas(complejo.id);
    session.canchasDisponibles = canchas;
    session.paso = 'SELECCION_CANCHA';

    if (canchas.length === 0) {
      return {
        texto: `👋 ¡Hola ${nombrePush || ''}! Bienvenido a las reservas 24/7 de *${complejo.nombre}*.\n\n⚠️ Este complejo aún no tiene canchas activas registradas.`,
      };
    }

    const rows: InteractiveRow[] = canchas.slice(0, 10).map((c) => ({
      id: `cancha_${c.id}`,
      title: c.nombre.slice(0, 24),
      description: `${c.deporte.toUpperCase().replace('_', ' ')} • $${c.precio_estandar.toLocaleString('es-CO')}`.slice(0, 72),
    }));

    const texto = `👋 ¡Hola ${nombrePush || ''}! Bienvenido a las reservas 24/7 de *${complejo.nombre}*.\n\n` +
      `Por favor abre el menú desplegable a continuación para seleccionar la cancha en la que deseas jugar ⚽🎾:`;

    return {
      texto,
      interactive: {
        type: 'list',
        header: complejo.nombre.slice(0, 60),
        body: texto,
        footer: 'Toca abajo para desplegar opciones',
        action: {
          button: 'Elegir Cancha',
          sections: [
            {
              title: 'Canchas Disponibles',
              rows,
            },
          ],
        },
      },
    };
  }

  private static async manejarSeleccionCancha(input: string, session: UserSession): Promise<BotResponse> {
    if (!session.canchasDisponibles || session.canchasDisponibles.length === 0) {
      session.paso = 'INICIO';
      return { texto: '⚠️ Sesión expirada. Por favor escribe *HOLA* para iniciar tu reserva.' };
    }

    let canchaEncontrada: Cancha | undefined;

    if (input.startsWith('cancha_')) {
      const id = input.replace('cancha_', '');
      canchaEncontrada = session.canchasDisponibles.find((c) => c.id === id);
    } else {
      const idx = parseInt(input, 10) - 1;
      if (!isNaN(idx) && session.canchasDisponibles[idx]) {
        canchaEncontrada = session.canchasDisponibles[idx];
      } else {
        canchaEncontrada = session.canchasDisponibles.find(
          (c) => c.nombre.toLowerCase().includes(input) || input.includes(c.nombre.toLowerCase())
        );
      }
    }

    if (!canchaEncontrada) {
      return {
        texto: '⚠️ Por favor selecciona una opción válida del menú desplegable de canchas.',
      };
    }

    session.canchaSeleccionada = canchaEncontrada;
    session.paso = 'SELECCION_FECHA';

    const hoy = new Date();
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const filasProximosDias: InteractiveRow[] = [];

    // Generar opciones para los próximos 6 días
    for (let i = 0; i < 6; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);
      const anio = d.getFullYear();
      const mesStr = String(d.getMonth() + 1).padStart(2, '0');
      const diaStr = String(d.getDate()).padStart(2, '0');
      const fechaIso = `${anio}-${mesStr}-${diaStr}`;

      const nombreDia = nombresDias[d.getDay()];
      const nombreMes = nombresMeses[d.getMonth()];

      let etiqueta = `${nombreDia} ${diaStr} ${nombreMes}`;
      if (i === 0) etiqueta = `Hoy (${nombreDia})`;
      else if (i === 1) etiqueta = `Mañana (${nombreDia})`;

      filasProximosDias.push({
        id: `fecha_${fechaIso}`,
        title: etiqueta.slice(0, 24),
        description: `Reservar para el ${fechaIso}`,
      });
    }

    const filasPersonalizadas: InteractiveRow[] = [
      {
        id: 'fecha_personalizada',
        title: '✏️ Escribir otra fecha',
        description: 'Escribe cualquier fecha del año',
      },
    ];

    const sections: InteractiveSection[] = [
      { title: 'Fechas Próximas', rows: filasProximosDias },
      { title: 'Cualquier Otra Fecha', rows: filasPersonalizadas },
    ];

    const texto = `🏟️ Cancha elegida: *${session.canchaSeleccionada.nombre}*\n\n` +
      `¿Para qué fecha deseas tu partido?\n` +
      `• Puedes desplegar el menú tocando *[Elegir Fecha]*.\n` +
      `• O puedes **escribir directamente la fecha que quieras** en el chat:\n` +
      `  👉 Ejemplos: *"18 de octubre"*, *"el próximo viernes"*, *"25/11"* o *"2026-10-15"*.`;

    return {
      texto,
      interactive: {
        type: 'list',
        header: 'Selección de Fecha',
        body: texto,
        footer: 'Elige del menú o escribe tu fecha',
        action: {
          button: 'Elegir Fecha',
          sections,
        },
      },
    };
  }

  private static interpretarFecha(input: string): string | null {
    const limpio = input.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const hoy = new Date();

    // 1. Selección directa desde el menú interactivo (ej. fecha_2026-10-06)
    if (limpio.startsWith('fecha_')) {
      const f = limpio.replace('fecha_', '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
    }

    // 2. Comandos rápidos
    if (limpio === 'hoy' || limpio === '1') {
      return hoy.toISOString().split('T')[0];
    }
    if (limpio === 'manana' || limpio === '2') {
      const m = new Date(hoy);
      m.setDate(hoy.getDate() + 1);
      return m.toISOString().split('T')[0];
    }
    if (limpio === 'pasado manana' || limpio === '3') {
      const p = new Date(hoy);
      p.setDate(hoy.getDate() + 2);
      return p.toISOString().split('T')[0];
    }

    // 3. Formato AAAA-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(limpio)) {
      return limpio;
    }

    // 4. Formato DD/MM o DD-MM o DD/MM/AAAA (ej. 15/10 o 15-10-2026)
    const regexBarra = /^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?$/;
    const matchBarra = limpio.match(regexBarra);
    if (matchBarra) {
      const dia = parseInt(matchBarra[1], 10);
      const mes = parseInt(matchBarra[2], 10) - 1;
      const anio = matchBarra[3] ? parseInt(matchBarra[3], 10) : hoy.getFullYear();
      const d = new Date(anio, mes, dia);
      if (!matchBarra[3] && d < hoy && (hoy.getTime() - d.getTime()) > 86400000) {
        d.setFullYear(anio + 1);
      }
      const mesStr = String(d.getMonth() + 1).padStart(2, '0');
      const diaStr = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mesStr}-${diaStr}`;
    }

    // 5. Formato texto natural: "15 de octubre", "15 oct"
    const meses: Record<string, number> = {
      enero: 0, ene: 0,
      febrero: 1, feb: 1,
      marzo: 2, mar: 2,
      abril: 3, abr: 3,
      mayo: 4, may: 4,
      junio: 5, jun: 5,
      julio: 6, jul: 6,
      agosto: 7, ago: 7,
      septiembre: 8, sep: 8, sept: 8,
      octubre: 9, oct: 9,
      noviembre: 10, nov: 10,
      diciembre: 11, dic: 11,
    };

    const regexTextoMes = /^(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+(?:de\s+)?(\d{4}))?$/;
    const matchTextoMes = limpio.match(regexTextoMes);
    if (matchTextoMes) {
      const dia = parseInt(matchTextoMes[1], 10);
      const nombreMes = matchTextoMes[2];
      if (meses[nombreMes] !== undefined) {
        const mes = meses[nombreMes];
        const anio = matchTextoMes[3] ? parseInt(matchTextoMes[3], 10) : hoy.getFullYear();
        const d = new Date(anio, mes, dia);
        const mesStr = String(d.getMonth() + 1).padStart(2, '0');
        const diaStr = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mesStr}-${diaStr}`;
      }
    }

    // 6. Días de la semana relativos: "lunes", "el próximo viernes", "el otro sábado"
    const diasSemana: Record<string, number> = {
      domingo: 0, dom: 0,
      lunes: 1, lun: 1,
      martes: 2, mar: 2,
      miercoles: 3, mie: 3,
      jueves: 4, jue: 4,
      viernes: 5, vie: 5,
      sabado: 6, sab: 6,
    };

    for (const [nombreDia, targetDay] of Object.entries(diasSemana)) {
      if (limpio.includes(nombreDia)) {
        const esProximaSemana = limpio.includes('proxim') || limpio.includes('otra') || limpio.includes('siguiente');
        const diaActual = hoy.getDay();
        let diff = targetDay - diaActual;

        if (diff <= 0) {
          diff += 7; // Próximo día
        }
        if (esProximaSemana && diff < 7) {
          diff += 7; // Próxima semana
        }

        const fechaCalculada = new Date(hoy);
        fechaCalculada.setDate(hoy.getDate() + diff);
        const mesStr = String(fechaCalculada.getMonth() + 1).padStart(2, '0');
        const diaStr = String(fechaCalculada.getDate()).padStart(2, '0');
        return `${fechaCalculada.getFullYear()}-${mesStr}-${diaStr}`;
      }
    }

    return null;
  }

  private static async manejarSeleccionFecha(input: string, session: UserSession): Promise<BotResponse> {
    const inputLimpio = input.toLowerCase().trim();

    // Si el usuario tocó "✏️ Escribir otra fecha" en el menú desplegable
    if (inputLimpio === 'fecha_personalizada' || inputLimpio.includes('otra fecha') || inputLimpio === 'otra') {
      return {
        texto: `📅 *Escribe la fecha que deseas para tu partido:*\n\nPuedes escribirla con total libertad como prefieras:\n` +
          `• Por nombre del mes: *"18 de octubre"*, *"5 de noviembre"*\n` +
          `• Por números: *"18/10"*, *"25/11/2026"*\n` +
          `• Por día relativo: *"el próximo viernes"*, *"el otro sábado"*\n\n` +
          `✍️ Escribe tu fecha aquí abajo:`,
      };
    }

    const fecha = this.interpretarFecha(input);

    if (!fecha) {
      return {
        texto: '⚠️ No entendí la fecha. Puedes seleccionar una fecha sugerida en el menú tocando *Elegir Fecha*, o escribir libremente la fecha que quieras (ej. *"18 de octubre"*, *"el próximo viernes"* o *"15/10"*).',
      };
    }

    // Validar que no sea una fecha en el pasado
    const hoyStr = new Date().toISOString().split('T')[0];
    if (fecha < hoyStr) {
      return {
        texto: `⚠️ La fecha que ingresaste (*${fecha}*) ya pasó. Por favor escribe una fecha futura (ejemplo: *"18 de octubre"* o *"el próximo sábado"*).`,
      };
    }

    session.fechaSeleccionada = fecha;
    session.paso = 'SELECCION_HORA';

    const horarios: HorarioDisponible[] = await BookingService.getHorariosDisponibles(session.canchaSeleccionada!.id, fecha);
    const disponibles = horarios.filter((h: HorarioDisponible) => h.disponible);
    session.horariosDisponibles = disponibles;

    if (disponibles.length === 0) {
      session.paso = 'SELECCION_FECHA';
      return {
        texto: `❌ No hay horarios disponibles para el *${fecha}* en *${session.canchaSeleccionada!.nombre}*.\nPor favor selecciona otra fecha desde el menú desplegable.`,
      };
    }

    // WhatsApp permite un máximo de 10 filas por mensaje interactivo de tipo lista
    const filas1Hora: InteractiveRow[] = [];
    const filas2Horas: InteractiveRow[] = [];

    // Opciones de 1 hora (hasta 5 opciones)
    for (const h of disponibles.slice(0, 5)) {
      const precioFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(h.precio);
      filas1Hora.push({
        id: `hora_${h.hora_inicio.slice(0, 5)}`,
        title: `${h.hora_inicio.slice(0, 5)} a ${h.hora_fin.slice(0, 5)} (1h)`,
        description: `${precioFmt} • 60 min`,
      });
    }

    // Opciones de 2 horas seguidas (hasta 4 opciones si hay horas consecutivas libres)
    for (let i = 0; i < disponibles.length - 1; i++) {
      const h1 = disponibles[i];
      const h2 = disponibles[i + 1];
      if (h1 && h2 && h1.hora_fin === h2.hora_inicio && filas2Horas.length < 4) {
        const precioTotal2h = h1.precio + h2.precio;
        const precioTotalFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(precioTotal2h);
        filas2Horas.push({
          id: `hora2_${h1.hora_inicio.slice(0, 5)}`,
          title: `${h1.hora_inicio.slice(0, 5)} a ${h2.hora_fin.slice(0, 5)} (2h)`,
          description: `${precioTotalFmt} • 120 min seguidos`,
        });
      }
    }

    const sections: InteractiveSection[] = [];
    if (filas1Hora.length > 0) {
      sections.push({ title: 'Turnos de 1 Hora (60 min)', rows: filas1Hora });
    }
    if (filas2Horas.length > 0) {
      sections.push({ title: 'Bloques de 2 Horas (120 min)', rows: filas2Horas });
    }

    const texto = `📅 *${session.canchaSeleccionada!.nombre}* el *${fecha}*\n\n` +
      `¡Hay turnos disponibles de 1 y 2 horas! Despliega el menú a continuación para seleccionar el horario de tu partido:`;

    return {
      texto,
      interactive: {
        type: 'list',
        header: 'Horarios Disponibles',
        body: texto,
        footer: 'Elige 1 hora o 2 horas seguidas',
        action: {
          button: 'Elegir Horario',
          sections,
        },
      },
    };
  }

  private static async manejarSeleccionHora(
    input: string,
    session: UserSession,
    telefono: string,
    complejo: Complejo
  ): Promise<BotResponse> {
    if (!session.horariosDisponibles || session.horariosDisponibles.length === 0) {
      session.paso = 'SELECCION_FECHA';
      return { texto: '⚠️ Horarios no cargados. Por favor selecciona nuevamente la fecha.' };
    }

    const esBloque2h = input.startsWith('hora2_') || input.includes('2 horas') || input.includes('2h');
    let duracionHoras = esBloque2h ? 2 : 1;
    let horario: HorarioDisponible | undefined;
    let horaIniNorm = '';
    let horaFinNorm = '';
    let precioTotal = 0;

    if (esBloque2h) {
      const horaLimpia = input.replace('hora2_', '').replace('hora_', '').slice(0, 5);
      const h1Idx = session.horariosDisponibles.findIndex((h) => h.hora_inicio.startsWith(horaLimpia));
      const h1 = session.horariosDisponibles[h1Idx];
      const h2 = session.horariosDisponibles[h1Idx + 1];

      if (h1 && h2 && h1.hora_fin === h2.hora_inicio) {
        horario = h1;
        horaIniNorm = h1.hora_inicio.slice(0, 5);
        horaFinNorm = h2.hora_fin.slice(0, 5);
        precioTotal = h1.precio + h2.precio;
      } else if (h1) {
        duracionHoras = 1;
        horario = h1;
        horaIniNorm = h1.hora_inicio.slice(0, 5);
        horaFinNorm = h1.hora_fin.slice(0, 5);
        precioTotal = h1.precio;
      }
    } else {
      if (input.startsWith('hora_')) {
        const horaLimpia = input.replace('hora_', '').slice(0, 5);
        horario = session.horariosDisponibles.find((h) => h.hora_inicio.startsWith(horaLimpia));
      } else {
        const idx = parseInt(input, 10) - 1;
        if (!isNaN(idx) && session.horariosDisponibles[idx]) {
          horario = session.horariosDisponibles[idx];
        } else {
          horario = session.horariosDisponibles.find((h) => input.includes(h.hora_inicio.slice(0, 5)));
        }
      }
      if (horario) {
        horaIniNorm = horario.hora_inicio.slice(0, 5);
        horaFinNorm = horario.hora_fin.slice(0, 5);
        precioTotal = horario.precio;
      }
    }

    if (!horario || !horaIniNorm || !horaFinNorm) {
      return {
        texto: '⚠️ Opción de horario inválida. Despliega el menú y selecciona uno de los turnos disponibles.',
      };
    }

    session.horarioSeleccionado = horario;

    const cliente = await BookingService.getOrCreateCliente(telefono);

    const fechaInicioIso = `${session.fechaSeleccionada}T${horaIniNorm}:00Z`;
    const fechaFinIso = `${session.fechaSeleccionada}T${horaFinNorm}:00Z`;

    try {
      // Re-verificar en tiempo real que el horario siga verdaderamente libre y no haya sido tomado
      const horariosActuales = await BookingService.getHorariosDisponibles(session.canchaSeleccionada!.id, session.fechaSeleccionada!);
      const turnoLibre = horariosActuales.find((h) => h.hora_inicio.startsWith(horaIniNorm) && h.disponible);
      if (!turnoLibre) {
        return {
          texto: '⚠️ *Horario no disponible*\n\nEste turno acaba de ser apartado por otro usuario o se encuentra bloqueado. Por favor despliega el menú para seleccionar un horario libre.',
        };
      }

      const porcentaje = complejo.porcentaje_anticipo_minimo ?? 50;
      const exigeAnticipo = porcentaje > 0;

      const reserva = await BookingService.crearPreReserva({
        canchaId: session.canchaSeleccionada!.id,
        clienteId: cliente.id,
        fechaInicio: fechaInicioIso,
        fechaFin: fechaFinIso,
        valorTotal: precioTotal,
        porcentajeAnticipo: porcentaje,
      });

      const totalFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(precioTotal);

      // CASO A: EL ESCENARIO NO EXIGE ABONO / ANTICIPO (CONFIRMACIÓN INMEDIATA)
      if (!exigeAnticipo) {
        session.reservaId = reserva.id;
        session.paso = 'INICIO';

        return {
          texto: `🎉 *¡RESERVA 100% CONFIRMADA!*\n\n` +
            `🏢 Establecimiento: *${complejo.nombre}*\n` +
            `🏟️ Cancha: *${session.canchaSeleccionada!.nombre}*\n` +
            `📅 Fecha: *${session.fechaSeleccionada}*\n` +
            `⏰ Horario: *${horaIniNorm} - ${horaFinNorm}* (${duracionHoras === 2 ? '2 Horas seguidas' : '1 Hora'})\n` +
            `💰 Total a pagar: *${totalFmt}*\n\n` +
            `✅ *En este escenario no requieres abono previo.*\n` +
            `El valor total de tu turno lo pagas en efectivo o transferencia al llegar a la recepción del complejo.\n\n` +
            `🔔 Te recordaremos tu partido antes de la hora fijada. ¡Nos vemos en la cancha! ⚽🎾`,
        };
      }

      // CASO B: EL ESCENARIO EXIGE ABONO (BLOQUEO TEMPORAL DE 15 MIN Y ESPERA DE COMPROBANTE)
      session.reservaId = reserva.id;
      session.paso = 'ESPERA_PAGO';

      const anticipoFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(reserva.valor_anticipo_requerido);
      const titular = complejo.titular_cuenta || complejo.nombre;
      const nequi = complejo.nequi_numero || 'Consultar con administración';
      const daviplata = complejo.daviplata_numero || nequi;

      return {
        texto: `🔒 *¡Turno apartado temporalmente por 15 minutos!*\n\n` +
          `🏢 Establecimiento: *${complejo.nombre}*\n` +
          `🏟️ Cancha: *${session.canchaSeleccionada!.nombre}*\n` +
          `📅 Fecha: *${session.fechaSeleccionada}*\n` +
          `⏰ Horario: *${horaIniNorm} - ${horaFinNorm}* (${duracionHoras === 2 ? '2 Horas seguidas' : '1 Hora'})\n` +
          `💰 Total: *${totalFmt}*\n` +
          `💵 Anticipo requerido: *${anticipoFmt}* (${porcentaje}%)\n\n` +
          `📲 *Cuentas Oficiales de Recaudo:*\n` +
          `• Nequi / Daviplata: *${nequi}*\n` +
          `• Titular: *${titular}*\n\n` +
          `📸 *¿Cómo confirmar?*\n` +
          `Realiza la transferencia y *envía aquí la foto o captura del comprobante*.\n` +
          `🤖 Nuestro sistema con Inteligencia Artificial lo auditará al instante para confirmar tu reserva, o será validado por la administración.`,
      };
    } catch (err: any) {
      console.error('Error al apartar turno en reserva:', err);
      return {
        texto: this.formatearErrorAmigable(err),
      };
    }
  }

  private static formatearErrorAmigable(err: any): string {
    const raw = (err?.message || '').toLowerCase();

    // 1. Conflicto de turno ya reservado por otro usuario
    if (
      raw.includes('apartado por otra') ||
      raw.includes('conflict') ||
      raw.includes('23p01') ||
      raw.includes('solapad') ||
      raw.includes('no_doble_reserva')
    ) {
      return (
        '⚠️ *¡Horario no disponible!*\n\n' +
        'Este turno acaba de ser apartado por otra persona hace un momento.\n' +
        'Por favor selecciona otro horario disponible o escribe *MENU* para volver a empezar.'
      );
    }

    // 2. Mantenimiento o cancha bloqueada
    if (raw.includes('bloquead') || raw.includes('mantenimiento') || raw.includes('inactiva')) {
      return (
        '⚠️ *Horario no disponible*\n\n' +
        'Esta cancha se encuentra temporalmente fuera de servicio en ese rango horario.\n' +
        'Por favor selecciona otro horario o escribe *MENU*.'
      );
    }

    // 3. Fallo genérico / base de datos / sintaxis
    return (
      '⚠️ *No pudimos apartar el turno en este momento*\n\n' +
      'Por favor intenta seleccionar otro horario o escribe *MENU* para volver al inicio.'
    );
  }

  private static async manejarEsperaPago(
    input: string,
    session: UserSession,
    complejo: Complejo,
    mediaId?: string,
    mediaType?: string
  ): Promise<BotResponse> {
    if (!session.reservaId) {
      session.paso = 'INICIO';
      return { texto: 'No hay ninguna reserva en proceso. Escribe *HOLA* para iniciar una nueva.' };
    }

    const porcentaje = complejo.porcentaje_anticipo_minimo ?? 50;
    const anticipoRequerido = (session.horarioSeleccionado?.precio || 0) * (porcentaje / 100);

    // ==============================================================================
    // CASO 1: EL CLIENTE ENVIÓ UNA IMAGEN (COMPROBANTE MULTIMEDIA -> OPCIÓN B CON IA)
    // ==============================================================================
    if (mediaId) {
      const mediaDescargado = await ReceiptVerificationService.descargarImagenMeta(mediaId, complejo.whatsapp_token);

      if (mediaDescargado) {
        const analisis = await ReceiptVerificationService.analizarComprobante(
          mediaDescargado.buffer,
          mediaDescargado.mimeType,
          anticipoRequerido,
          complejo.nequi_numero,
          complejo.titular_cuenta
        );

        // 1.1 DETECCIÓN DE FRAUDE / ALTERACIÓN
        if (analisis.es_sospechoso_fraude) {
          const motivos = analisis.indicios_fraude.join(', ') || 'Inconsistencia tipográfica o visual';
          await supabase
            .from('reservas')
            .update({ notas: `⚠️ ALERTA FRAUDE IA: ${motivos} - ${analisis.explicacion}` })
            .eq('id', session.reservaId);

          return {
            texto: `⚠️ *ALERTA EN VALIDACIÓN AUTOMÁTICA*\n\n` +
              `El sistema detectó posibles inconsistencias en el comprobante (${motivos}).\n\n` +
              `🔒 Tu turno sigue apartado temporalmente, pero *un administrador de ${complejo.nombre} revisará manualmente el pago en la cuenta bancaria antes de confirmar.* Te notificaremos en cuanto sea verificado.`,
          };
        }

        // 1.2 COMPROBANTE AUTÉNTICO Y VÁLIDO (CONFIRMACIÓN 100% AUTOMÁTICA - OPCIÓN B)
        if (analisis.es_valido && analisis.referencia_detectada) {
          const yaUsada = await ReceiptVerificationService.esReferenciaDuplicada(analisis.referencia_detectada);

          if (yaUsada) {
            return {
              texto: `⚠️ *Comprobante ya utilizado:*\nEl número de referencia *${analisis.referencia_detectada}* ya fue registrado en otra reserva previa. Por favor envía un comprobante nuevo o contacta a la administración de ${complejo.nombre}.`,
            };
          }

          // Confirmar automáticamente la reserva
          await BookingService.registrarPagoAnticipo({
            reservaId: session.reservaId,
            metodo: 'nequi',
            monto: analisis.monto_detectado || anticipoRequerido,
            referencia: analisis.referencia_detectada,
          });

          await supabase
            .from('pagos_anticipos')
            .update({ revisado_por: 'IA_GEMINI', notas_admin: `Auditado por Gemini Flash: ${analisis.explicacion}` })
            .eq('reserva_id', session.reservaId);

          session.paso = 'INICIO';

          const montoFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(analisis.monto_detectado || anticipoRequerido);

          return {
            texto: `🤖⚡ *¡PAGO AUDITADO Y APROBADO POR IA!*\n\n` +
              `✅ Comprobante verificado con éxito:\n` +
              `• Referencia: *#${analisis.referencia_detectada}*\n` +
              `• Monto: *${montoFmt}*\n` +
              `• Destino: *${analisis.destinatario_detectado || complejo.nombre}*\n\n` +
              `🎉 *¡RESERVA 100% CONFIRMADA!*\n` +
              `🏢 *${complejo.nombre}*\n` +
              `🏟️ Cancha: *${session.canchaSeleccionada?.nombre}*\n` +
              `📅 Fecha: *${session.fechaSeleccionada}*\n` +
              `⏰ Horario: *${session.horarioSeleccionado?.hora_inicio.slice(0, 5)} - ${session.horarioSeleccionado?.hora_fin.slice(0, 5)}*\n\n` +
              `🔔 Te enviaremos un recordatorio 2 horas antes de tu juego. ¡Nos vemos en la cancha!`,
          };
        }

        // 1.3 IA CON BAJA CONFIANZA O SIN API KEY -> FALLBACK ELEGANTE A OPCIÓN A (VISOR ADMIN)
        await supabase
          .from('reservas')
          .update({ notas: `Comprobante recibido vía WhatsApp (Media ID: ${mediaId}). Pendiente de aprobación manual en visor.` })
          .eq('id', session.reservaId);

        return {
          texto: `📸 *¡Comprobante recibido con éxito!*\n\n` +
            `Nuestro equipo de administración en *${complejo.nombre}* está verificando tu pago en el visor de control.\n\n` +
            `⏳ Tu turno sigue bloqueado para ti. Te llegará la confirmación oficial por este mismo chat en cuanto el administrador presione "Aprobar Anticipo".`,
        };
      }
    }

    // ==============================================================================
    // CASO 2: EL CLIENTE ESCRIBIÓ TEXTO O CÓDIGO MANUAL (DERIVACIÓN A OPCIÓN A)
    // ==============================================================================
    await supabase
      .from('reservas')
      .update({ notas: `Cliente reportó pago manual vía texto: "${input}". Pendiente de verificación por administrador.` })
      .eq('id', session.reservaId);

    return {
      texto: `📄 *Datos de pago registrados: "${input}"*\n\n` +
        `Tu comprobante/referencia ha sido enviado al visor de control de *${complejo.nombre}*.\n\n` +
        `⏳ Un administrador lo validará en la cuenta bancaria y recibirás un mensaje de confirmación por este chat en cuanto sea aprobado.`,
    };
  }
}
