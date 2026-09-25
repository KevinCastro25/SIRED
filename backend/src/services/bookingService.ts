import { supabase } from '../config/supabase.js';

export interface Complejo {
  id: string;
  slug?: string;
  nombre: string;
  direccion?: string;
  ciudad?: string;
  telefono_whatsapp: string;
  whatsapp_phone_number_id?: string;
  whatsapp_token?: string;
  nequi_numero?: string;
  daviplata_numero?: string;
  titular_cuenta?: string;
  porcentaje_anticipo_minimo?: number;
}

export interface Cancha {
  id: string;
  complejo_id: string;
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
   * Obtiene todos los complejos registrados (Multi-empresa)
   */
  static async getComplejos(): Promise<Complejo[]> {
    const { data, error } = await supabase.from('complejos').select('*').order('nombre');
    if (error) throw error;
    return data || [];
  }

  /**
   * Obtiene un complejo por su ID o por su Slug
   */
  static async getComplejo(identificador: string): Promise<Complejo | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identificador);
    let query = supabase.from('complejos').select('*');
    if (isUuid) {
      query = query.eq('id', identificador);
    } else {
      query = query.eq('slug', identificador);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Identifica qué empresa recibió el mensaje de WhatsApp a partir del Phone ID de Meta o el número
   */
  static async getComplejoByPhone(phoneId?: string, displayPhone?: string): Promise<Complejo> {
    if (phoneId) {
      const { data } = await supabase
        .from('complejos')
        .select('*')
        .eq('whatsapp_phone_number_id', phoneId)
        .maybeSingle();
      if (data) return data;
    }

    if (displayPhone) {
      const limpio = displayPhone.replace(/\D/g, '');
      const { data } = await supabase
        .from('complejos')
        .select('*')
        .ilike('telefono_whatsapp', `%${limpio}%`)
        .maybeSingle();
      if (data) return data;
    }

    // Si no coincide o es demo, retornar el primer complejo registrado
    const complejos = await this.getComplejos();
    if (complejos.length > 0) return complejos[0];

    throw new Error('No hay complejos deportivos configurados en el sistema.');
  }

  /**
   * Crea una nueva empresa / complejo deportivo en la plataforma
   */
  static async crearComplejo(datos: Partial<Complejo>): Promise<Complejo> {
    const { data, error } = await supabase
      .from('complejos')
      .insert(datos)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

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
   * Obtiene todas las canchas activas registradas en Supabase (filtradas por complejo)
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
