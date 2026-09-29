import { BookingService, Complejo, Cancha, HorarioDisponible } from '../services/bookingService.js';
import { ReceiptVerificationService } from '../services/receiptVerificationService.js';
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
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const pasado = new Date(hoy);
    pasado.setDate(hoy.getDate() + 2);

    const fHoy = hoy.toISOString().split('T')[0];
    const fManana = manana.toISOString().split('T')[0];
    const fPasado = pasado.toISOString().split('T')[0];

    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaHoy = dias[hoy.getDay()];
    const diaManana = dias[manana.getDay()];
    const diaPasado = dias[pasado.getDay()];

    const texto = `🏟️ Cancha elegida: *${session.canchaSeleccionada.nombre}*\n\n` +
      `¿Para qué fecha deseas tu partido? Despliega el menú a continuación para seleccionar el día:`;

    const rows: InteractiveRow[] = [
      { id: 'fecha_hoy', title: `Hoy (${diaHoy})`, description: fHoy },
      { id: 'fecha_manana', title: `Mañana (${diaManana})`, description: fManana },
      { id: 'fecha_pasado', title: `Pasado (${diaPasado})`, description: fPasado },
    ];

    return {
      texto,
      interactive: {
        type: 'list',
        header: 'Selección de Fecha',
        body: texto,
        footer: 'O escribe una fecha AAAA-MM-DD',
        action: {
          button: 'Elegir Fecha',
          sections: [
            {
              title: 'Próximos Días',
              rows,
            },
          ],
        },
      },
    };
  }

  private static async manejarSeleccionFecha(input: string, session: UserSession): Promise<BotResponse> {
    const hoy = new Date();
    let fecha = '';

    if (input === 'fecha_hoy' || input === '1' || input.includes('hoy')) {
      fecha = hoy.toISOString().split('T')[0];
    } else if (input === 'fecha_manana' || input === '2' || input.includes('mañana') || input.includes('manana')) {
      const m = new Date(hoy);
      m.setDate(hoy.getDate() + 1);
      fecha = m.toISOString().split('T')[0];
    } else if (input === 'fecha_pasado' || input === '3' || input.includes('pasado')) {
      const p = new Date(hoy);
      p.setDate(hoy.getDate() + 2);
      fecha = p.toISOString().split('T')[0];
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      fecha = input;
    } else {
      return {
        texto: '⚠️ Fecha no válida. Por favor selecciona una opción del menú desplegable o escribe una fecha AAAA-MM-DD.',
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
    const slotsParaMenu = disponibles.slice(0, 10);
    const rows: InteractiveRow[] = slotsParaMenu.map((h) => {
      const precioFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(h.precio);
      const esPico = session.canchaSeleccionada ? h.precio > session.canchaSeleccionada.precio_estandar : false;
      const picoTxt = esPico ? '🔥 Pico' : 'Estándar';
      return {
        id: `hora_${h.hora_inicio.slice(0, 5)}`,
        title: `${h.hora_inicio.slice(0, 5)} a ${h.hora_fin.slice(0, 5)}`,
        description: `${precioFmt} • ${picoTxt}`.slice(0, 72),
      };
    });

    const texto = `📅 *${session.canchaSeleccionada!.nombre}* el *${fecha}*\n\n` +
      `¡Hay ${disponibles.length} turnos disponibles! Despliega el menú a continuación para seleccionar el horario de tu partido:`;

    return {
      texto,
      interactive: {
        type: 'list',
        header: 'Horarios Disponibles',
        body: texto,
        footer: 'Turnos de 60 minutos',
        action: {
          button: 'Elegir Horario',
          sections: [
            {
              title: `Turnos para ${fecha}`,
              rows,
            },
          ],
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

    let horario: HorarioDisponible | undefined;

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

    if (!horario) {
      return {
        texto: '⚠️ Opción de horario inválida. Despliega el menú y selecciona uno de los turnos disponibles.',
      };
    }

    session.horarioSeleccionado = horario;

    const cliente = await BookingService.getOrCreateCliente(telefono);

    const fechaInicioIso = `${session.fechaSeleccionada}T${horario.hora_inicio}:00Z`;
    const fechaFinIso = `${session.fechaSeleccionada}T${horario.hora_fin}:00Z`;

    try {
      const porcentaje = complejo.porcentaje_anticipo_minimo ?? 50;
      const reserva = await BookingService.crearPreReserva({
        canchaId: session.canchaSeleccionada!.id,
        clienteId: cliente.id,
        fechaInicio: fechaInicioIso,
        fechaFin: fechaFinIso,
        valorTotal: horario.precio,
        porcentajeAnticipo: porcentaje,
      });

      session.reservaId = reserva.id;
      session.paso = 'ESPERA_PAGO';

      const anticipoFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(reserva.valor_anticipo_requerido);
      const totalFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(horario.precio);

      const titular = complejo.titular_cuenta || complejo.nombre;
      const nequi = complejo.nequi_numero || 'Consultar con administración';
      const daviplata = complejo.daviplata_numero || nequi;

      return {
        texto: `🔒 *¡Turno apartado temporalmente por 15 minutos!*\n\n` +
          `🏢 Establecimiento: *${complejo.nombre}*\n` +
          `🏟️ Cancha: *${session.canchaSeleccionada!.nombre}*\n` +
          `📅 Fecha: *${session.fechaSeleccionada}*\n` +
          `⏰ Horario: *${horario.hora_inicio.slice(0, 5)} - ${horario.hora_fin.slice(0, 5)}*\n` +
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
      return {
        texto: `❌ ${err.message || 'Error al apartar el turno'}. Por favor selecciona otro horario o escribe *MENU*.`,
      };
    }
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
