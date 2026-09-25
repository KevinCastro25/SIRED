import { BookingService, Complejo, Cancha, HorarioDisponible } from '../services/bookingService.js';

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
   */
  static async procesarMensaje(
    telefono: string,
    texto: string,
    nombrePush?: string,
    complejoDirecto?: Complejo
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

    if (input === 'reiniciar' || input === 'menu' || input === 'cancelar' || input === 'hola' && session.paso !== 'INICIO') {
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
        return await this.manejarEsperaPago(input, session, complejo);

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

    const hoy = new Date().toISOString().split('T')[0];
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return `🏟️ Elegiste: *${session.canchaSeleccionada.nombre}*\n\n` +
      `¿Para qué fecha deseas tu reserva?\n` +
      `*1*. Hoy (${hoy})\n` +
      `*2*. Mañana (${manana})\n` +
      `*3*. Otra fecha (escríbela en formato AAAA-MM-DD, ej. ${manana})`;
  }

  private static async manejarSeleccionFecha(input: string, session: UserSession): Promise<string> {
    let fecha = '';
    const hoy = new Date().toISOString().split('T')[0];
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (input === '1' || input === 'hoy') {
      fecha = hoy;
    } else if (input === '2' || input === 'mañana' || input === 'manana') {
      fecha = manana;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      fecha = input;
    } else {
      return '⚠️ Formato de fecha no reconocido. Elige *1* (Hoy), *2* (Mañana) o escribe la fecha como *AAAA-MM-DD*.';
    }

    session.fechaSeleccionada = fecha;

    const horarios = await BookingService.getHorariosDisponibles(session.canchaSeleccionada!.id, fecha);
    const disponibles = horarios.filter((h) => h.disponible);

    if (disponibles.length === 0) {
      return `❌ No hay horarios disponibles para el *${fecha}* en esta cancha.\nEscribe otra fecha (AAAA-MM-DD) o *MENU* para volver al inicio.`;
    }

    session.horariosDisponibles = disponibles;
    session.paso = 'SELECCION_HORA';

    let respuesta = `📅 Horarios disponibles para *${fecha}*:\n\n`;
    disponibles.forEach((h, idx) => {
      const tarifaFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(h.precio);
      respuesta += `*${idx + 1}*. ${h.hora_inicio.slice(0, 5)} a ${h.hora_fin.slice(0, 5)} — ${tarifaFmt}\n`;
    });

    respuesta += `\n_Responde con el número del horario que deseas apartar:_`;
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
      return '⚠️ Por favor selecciona un número de horario válido de la lista.';
    }

    const horario = session.horariosDisponibles[idx];
    session.horarioSeleccionado = horario;

    const cliente = await BookingService.getOrCreateCliente(telefono);

    const fechaInicioIso = `${session.fechaSeleccionada}T${horario.hora_inicio}Z`;
    const fechaFinIso = `${session.fechaSeleccionada}T${horario.hora_fin}Z`;

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
        `📲 *Datos de Recaudo Oficial:*\n` +
        `• Nequi / Daviplata: *${nequi}*\n` +
        `• Titular: *${titular}*\n\n` +
        `👉 Una vez realizada la transferencia, responde con la palabra *PAGADO* o el número de comprobante para confirmar tu reserva al instante.`;
    } catch (err: any) {
      return `❌ ${err.message || 'Error al apartar el turno'}. Por favor selecciona otro horario o escribe *MENU*.`;
    }
  }

  private static async manejarEsperaPago(input: string, session: UserSession, complejo: Complejo): Promise<string> {
    if (!session.reservaId) {
      session.paso = 'INICIO';
      return 'No hay ninguna reserva en proceso. Escribe *HOLA* para iniciar una nueva.';
    }

    const porcentaje = complejo.porcentaje_anticipo_minimo ?? 50;
    await BookingService.registrarPagoAnticipo({
      reservaId: session.reservaId,
      metodo: 'nequi',
      monto: session.horarioSeleccionado!.precio * (porcentaje / 100),
      referencia: input,
    });

    session.paso = 'INICIO';

    return `🎉 *¡RESERVA CONFIRMADA CON ÉXITO!*\n\n` +
      `🏢 Establecimiento: *${complejo.nombre}*\n` +
      `🏟️ Cancha: *${session.canchaSeleccionada?.nombre}*\n` +
      `📅 Fecha: *${session.fechaSeleccionada}*\n` +
      `⏰ Horario: *${session.horarioSeleccionado?.hora_inicio.slice(0, 5)} a ${session.horarioSeleccionado?.hora_fin.slice(0, 5)}*\n\n` +
      `🔔 Te enviaremos un recordatorio 2 horas antes de tu partido.\n` +
      `¡Que tengas un excelente juego en ${complejo.nombre}!`;
  }
}
