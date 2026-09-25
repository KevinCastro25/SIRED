import { BookingService, Complejo, Cancha, HorarioDisponible } from '../services/bookingService.js';
import { ReceiptVerificationService } from '../services/receiptVerificationService.js';
import { supabase } from '../config/supabase.js';

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
   * y analiza comprobantes multimedia con IA si está en espera de pago
   */
  static async procesarMensaje(
    telefono: string,
    texto: string,
    nombrePush?: string,
    complejoDirecto?: Complejo,
    mediaId?: string,
    mediaType?: string
  ): Promise<string> {
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
        return `¡Hola! Escribe *HOLA* o *1* para comenzar tu reserva en *${complejo.nombre}* ⚽🎾.`;
    }
  }

  private static async manejarInicio(
    telefono: string,
    session: UserSession,
    complejo: Complejo,
    nombrePush?: string
  ): Promise<string> {
    await BookingService.getOrCreateCliente(telefono, nombrePush);

    // Consultar ÚNICAMENTE las canchas de esta empresa
    const canchas = await BookingService.getCanchas(complejo.id);
    session.canchasDisponibles = canchas;
    session.paso = 'SELECCION_CANCHA';

    let respuesta = `👋 ¡Hola ${nombrePush || ''}! Bienvenido a las reservas 24/7 de *${complejo.nombre}*.\n\n`;

    if (canchas.length === 0) {
      return respuesta + '⚠️ Este complejo aún no tiene canchas activas registradas.';
    }

    respuesta += `¿En qué cancha deseas jugar? Selecciona el número:\n`;
    canchas.forEach((c, idx) => {
      respuesta += `*${idx + 1}*. ${c.nombre} (${c.deporte.toUpperCase()})\n`;
    });

    respuesta += `\n_Responde con el número de tu opción (ej. 1)_`;
    return respuesta;
  }

  private static async manejarSeleccionCancha(input: string, session: UserSession): Promise<string> {
    const idx = parseInt(input, 10) - 1;
    if (isNaN(idx) || !session.canchasDisponibles || !session.canchasDisponibles[idx]) {
      return '⚠️ Por favor ingresa un número válido de la lista de canchas disponibles.';
    }

    session.canchaSeleccionada = session.canchasDisponibles[idx];
    session.paso = 'SELECCION_FECHA';

    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const pasado = new Date(hoy);
    pasado.setDate(hoy.getDate() + 2);

    const fHoy = hoy.toISOString().split('T')[0];
    const fManana = manana.toISOString().split('T')[0];
    const fPasado = pasado.toISOString().split('T')[0];

    return `🏟️ Elegiste: *${session.canchaSeleccionada.nombre}*\n\n` +
      `¿Para qué fecha deseas tu reserva?\n` +
      `*1*. Hoy (${fHoy})\n` +
      `*2*. Mañana (${fManana})\n` +
      `*3*. Pasado mañana (${fPasado})\n\n` +
      `_O escribe la fecha en formato AAAA-MM-DD (ej: 2026-10-15)_`;
  }

  private static async manejarSeleccionFecha(input: string, session: UserSession): Promise<string> {
    const hoy = new Date();
    let fecha = '';

    if (input === '1' || input.includes('hoy')) {
      fecha = hoy.toISOString().split('T')[0];
    } else if (input === '2' || input.includes('mañana')) {
      const m = new Date(hoy);
      m.setDate(hoy.getDate() + 1);
      fecha = m.toISOString().split('T')[0];
    } else if (input === '3' || input.includes('pasado')) {
      const p = new Date(hoy);
      p.setDate(hoy.getDate() + 2);
      fecha = p.toISOString().split('T')[0];
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      fecha = input;
    } else {
      return '⚠️ Fecha no válida. Selecciona 1 (Hoy), 2 (Mañana), 3 (Pasado mañana) o escribe una fecha AAAA-MM-DD.';
    }

    session.fechaSeleccionada = fecha;
    session.paso = 'SELECCION_HORA';

    const horarios: HorarioDisponible[] = await BookingService.getHorariosDisponibles(session.canchaSeleccionada!.id, fecha);
    const disponibles = horarios.filter((h: HorarioDisponible) => h.disponible);
    session.horariosDisponibles = disponibles;

    if (disponibles.length === 0) {
      session.paso = 'SELECCION_FECHA';
      return `❌ No hay horarios disponibles para el *${fecha}* en *${session.canchaSeleccionada!.nombre}*.\nPor favor escribe otra fecha (ej: 1 para Hoy o 2 para Mañana).`;
    }

    let respuesta = `📅 Horarios disponibles para *${session.canchaSeleccionada!.nombre}* el *${fecha}*:\n\n`;
    disponibles.forEach((h: HorarioDisponible, idx: number) => {
      const precioFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(h.precio);
      respuesta += `*${idx + 1}*. ${h.hora_inicio.slice(0, 5)} a ${h.hora_fin.slice(0, 5)} — ${precioFmt}\n`;
    });

    respuesta += `\n_Responde con el número del turno que deseas reservar (ej. 1)_`;
    return respuesta;
  }

  private static async manejarSeleccionHora(
    input: string,
    session: UserSession,
    telefono: string,
    complejo: Complejo
  ): Promise<string> {
    const idx = parseInt(input, 10) - 1;
    if (isNaN(idx) || !session.horariosDisponibles || !session.horariosDisponibles[idx]) {
      return '⚠️ Opción de horario inválida. Responde con el número de la lista (ej. 1).';
    }

    const horario = session.horariosDisponibles[idx];
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

      return `🔒 *¡Turno apartado temporalmente por 15 minutos!*\n\n` +
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
        `🤖 Nuestro sistema con Inteligencia Artificial lo auditará al instante para confirmar tu reserva, o será validado por la administración.`;
    } catch (err: any) {
      return `❌ ${err.message || 'Error al apartar el turno'}. Por favor selecciona otro horario o escribe *MENU*.`;
    }
  }

  private static async manejarEsperaPago(
    input: string,
    session: UserSession,
    complejo: Complejo,
    mediaId?: string,
    mediaType?: string
  ): Promise<string> {
    if (!session.reservaId) {
      session.paso = 'INICIO';
      return 'No hay ninguna reserva en proceso. Escribe *HOLA* para iniciar una nueva.';
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

          return `⚠️ *ALERTA EN VALIDACIÓN AUTOMÁTICA*\n\n` +
            `El sistema detectó posibles inconsistencias en el comprobante (${motivos}).\n\n` +
            `🔒 Tu turno sigue apartado temporalmente, pero *un administrador de ${complejo.nombre} revisará manualmente el pago en la cuenta bancaria antes de confirmar.* Te notificaremos en cuanto sea verificado.`;
        }

        // 1.2 COMPROBANTE AUTÉNTICO Y VÁLIDO (CONFIRMACIÓN 100% AUTOMÁTICA - OPCIÓN B)
        if (analisis.es_valido && analisis.referencia_detectada) {
          const yaUsada = await ReceiptVerificationService.esReferenciaDuplicada(analisis.referencia_detectada);

          if (yaUsada) {
            return `⚠️ *Comprobante ya utilizado:*\nEl número de referencia *${analisis.referencia_detectada}* ya fue registrado en otra reserva previa. Por favor envía un comprobante nuevo o contacta a la administración de ${complejo.nombre}.`;
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

          return `🤖⚡ *¡PAGO AUDITADO Y APROBADO POR IA!*\n\n` +
            `✅ Comprobante verificado con éxito:\n` +
            `• Referencia: *#${analisis.referencia_detectada}*\n` +
            `• Monto: *${montoFmt}*\n` +
            `• Destino: *${analisis.destinatario_detectado || complejo.nombre}*\n\n` +
            `🎉 *¡RESERVA 100% CONFIRMADA!*\n` +
            `🏢 *${complejo.nombre}*\n` +
            `🏟️ Cancha: *${session.canchaSeleccionada?.nombre}*\n` +
            `📅 Fecha: *${session.fechaSeleccionada}*\n` +
            `⏰ Horario: *${session.horarioSeleccionado?.hora_inicio.slice(0, 5)} - ${session.horarioSeleccionado?.hora_fin.slice(0, 5)}*\n\n` +
            `🔔 Te enviaremos un recordatorio 2 horas antes de tu juego. ¡Nos vemos en la cancha!`;
        }

        // 1.3 IA CON BAJA CONFIANZA O SIN API KEY -> FALLBACK ELEGANTE A OPCIÓN A (VISOR ADMIN)
        await supabase
          .from('reservas')
          .update({ notas: `Comprobante recibido vía WhatsApp (Media ID: ${mediaId}). Pendiente de aprobación manual en visor.` })
          .eq('id', session.reservaId);

        return `📸 *¡Comprobante recibido con éxito!*\n\n` +
          `Nuestro equipo de administración en *${complejo.nombre}* está verificando tu pago en el visor de control.\n\n` +
          `⏳ Tu turno sigue bloqueado para ti. Te llegará la confirmación oficial por este mismo chat en cuanto el administrador presione "Aprobar Anticipo".`;
      }
    }

    // ==============================================================================
    // CASO 2: EL CLIENTE ESCRIBIÓ TEXTO O CÓDIGO MANUAL (DERIVACIÓN A OPCIÓN A)
    // ==============================================================================
    await supabase
      .from('reservas')
      .update({ notas: `Cliente reportó pago manual vía texto: "${input}". Pendiente de verificación por administrador.` })
      .eq('id', session.reservaId);

    return `📄 *Datos de pago registrados: "${input}"*\n\n` +
      `Tu comprobante/referencia ha sido enviado al visor de control de *${complejo.nombre}*.\n\n` +
      `⏳ Un administrador lo validará en la cuenta bancaria y recibirás un mensaje de confirmación por este chat en cuanto sea aprobado.`;
  }
}
