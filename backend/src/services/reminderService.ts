import { supabase } from '../config/supabase.js';
import axios from 'axios';

export class ReminderService {
  /**
   * Revisa las reservas de las próximas 2 a 3 horas y despacha recordatorios por WhatsApp
   */
  static async procesarRecordatoriosProximos() {
    const ahora = new Date();
    const limiteTresHoras = new Date(ahora.getTime() + 3 * 60 * 60 * 1000).toISOString();
    const ahoraIso = ahora.toISOString();

    const { data: reservas, error } = await supabase
      .from('reservas')
      .select('*, canchas(nombre), clientes(nombre, telefono_wa)')
      .eq('estado', 'confirmada')
      .eq('recordatorio_enviado', false)
      .gte('fecha_inicio', ahoraIso)
      .lte('fecha_inicio', limiteTresHoras);

    if (error) {
      console.error('Error buscando reservas para recordatorio:', error);
      return { enviados: 0, errores: 1, mensaje: error.message };
    }

    if (!reservas || reservas.length === 0) {
      return { enviados: 0, errores: 0, mensaje: 'No hay partidos próximos pendientes de recordatorio' };
    }

    let enviadosCount = 0;

    for (const r of reservas) {
      const clienteNombre = r.clientes?.nombre || 'Deportista';
      const telefono = r.clientes?.telefono_wa;
      const canchaNombre = r.canchas?.nombre || 'Cancha Deportiva';
      const horaInicio = r.fecha_inicio.split('T')[1].slice(0, 5);
      const horaFin = r.fecha_fin.split('T')[1].slice(0, 5);

      if (!telefono) continue;

      const mensaje = `🔔 *RECORDATORIO DE TU PARTIDO HOY*\n\n` +
        `¡Hola ${clienteNombre}! Te recordamos tu reserva deportiva programada para hoy:\n\n` +
        `🏟️ Cancha: *${canchaNombre}*\n` +
        `⏰ Horario: *${horaInicio} a ${horaFin}*\n\n` +
        `👟 Te recomendamos llegar con tu equipo *10 minutos antes* para ingresar puntualmente a la cancha.\n` +
        `¡Que disfruten un gran partido! ⚽🎾`;

      await this.enviarWhatsApp(telefono, mensaje);

      await supabase
        .from('reservas')
        .update({ recordatorio_enviado: true })
        .eq('id', r.id);

      enviadosCount++;
    }

    return { enviados: enviadosCount, errores: 0 };
  }

  private static async enviarWhatsApp(to: string, message: string) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      console.log(`[RECORDATORIO AUTOMÁTICO WHATSAPP a ${to}]:\n${message}`);
      return;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err: any) {
      console.error(`Error enviando recordatorio a ${to}:`, err.response?.data || err.message);
    }
  }
}
