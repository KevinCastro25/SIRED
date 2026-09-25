import { supabase } from '../config/supabase.js';

export interface Cancha {
  id: string;
  nombre: string;
  deporte: string;
  precio_estandar: number;
  precio_pico: number;
}

export interface HorarioDisponible {
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
  precio: number;
}

export class BookingService {
  /**
   * Obtiene o crea un cliente en la base de datos a partir de su número de WhatsApp
   */
  static async getOrCreateCliente(telefono: string, nombre?: string) {
    const { data: existing, error: findError } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefono_wa', telefono)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      if (nombre && (!existing.nombre || existing.nombre !== nombre)) {
        await supabase.from('clientes').update({ nombre }).eq('id', existing.id);
      }
      return existing;
    }

    const { data: created, error: createError } = await supabase
      .from('clientes')
      .insert({ telefono_wa: telefono, nombre: nombre || 'Usuario WhatsApp' })
      .select()
      .single();

    if (createError) throw createError;
    return created;
  }

  /**
   * Obtiene todas las canchas activas registradas en Supabase
   */
  static async getCanchas(complejoId?: string): Promise<Cancha[]> {
    let query = supabase.from('canchas').select('*').eq('activa', true).order('nombre');
    if (complejoId) {
      query = query.eq('complejo_id', complejoId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Consulta los horarios disponibles ejecutando la función RPC 'obtener_horarios_disponibles'
   */
  static async getHorariosDisponibles(canchaId: string, fechaIso: string): Promise<HorarioDisponible[]> {
    await this.liberarReservasExpiradas();

    const { data, error } = await supabase.rpc('obtener_horarios_disponibles', {
      p_cancha_id: canchaId,
      p_fecha: fechaIso,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Crea una pre-reserva con bloqueo de 15 minutos en PostgreSQL.
   */
  static async crearPreReserva(params: {
    canchaId: string;
    clienteId: string;
    fechaInicio: string;
    fechaFin: string;
    valorTotal: number;
    porcentajeAnticipo?: number;
  }) {
    const porcentaje = params.porcentajeAnticipo ?? 50;
    const anticipoRequerido = (params.valorTotal * porcentaje) / 100;
    const expiracion = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('reservas')
      .insert({
        cancha_id: params.canchaId,
        cliente_id: params.clienteId,
        fecha_inicio: params.fechaInicio,
        fecha_fin: params.fechaFin,
        estado: 'pendiente_pago',
        valor_total: params.valorTotal,
        valor_anticipo_requerido: anticipoRequerido,
        expiracion_reserva: expiracion,
      })
      .select('*, canchas(nombre)')
      .single();

    if (error) {
      if (error.code === '23P01') {
        throw new Error('Lo sentimos, este turno acaba de ser apartado por otra persona.');
      }
      throw error;
    }

    return data;
  }

  /**
   * Registra el pago del anticipo y confirma la reserva en la base de datos
   */
  static async registrarPagoAnticipo(params: {
    reservaId: string;
    metodo: 'nequi' | 'daviplata' | 'transferencia_bancaria';
    monto: number;
    comprobanteUrl?: string;
    referencia?: string;
  }) {
    const { data: pago, error: pagoError } = await supabase
      .from('pagos_anticipos')
      .insert({
        reserva_id: params.reservaId,
        metodo: params.metodo,
        monto: params.monto,
        comprobante_url: params.comprobanteUrl,
        referencia_transaccion: params.referencia,
        estado: 'pendiente',
      })
      .select()
      .single();

    if (pagoError) throw pagoError;

    const { data: reserva, error: reservaError } = await supabase
      .from('reservas')
      .update({ estado: 'confirmada', expiracion_reserva: null })
      .eq('id', params.reservaId)
      .select()
      .single();

    if (reservaError) throw reservaError;
    return { pago, reserva };
  }

  /**
   * Libera reservas pendientes cuyo tiempo de pago superó los 15 minutos
   */
  static async liberarReservasExpiradas() {
    const ahora = new Date().toISOString();
    await supabase
      .from('reservas')
      .update({ estado: 'cancelada', notas: 'Cancelada automáticamente por expiración de tiempo de pago.' })
      .eq('estado', 'pendiente_pago')
      .lt('expiracion_reserva', ahora);
  }
}
