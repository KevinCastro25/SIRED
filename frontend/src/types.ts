export interface Cancha {
  id: string;
  nombre: string;
  deporte: 'futbol_5' | 'futbol_8' | 'futbol_11' | 'padel' | 'tenis' | 'voley';
  precio_estandar: number;
  precio_pico: number;
  activa: boolean;
}

export interface Reserva {
  id: string;
  cancha_id: string;
  cliente_id?: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'pendiente_pago' | 'confirmada' | 'cancelada' | 'completada' | 'bloqueada';
  valor_total: number;
  valor_anticipo_requerido: number;
  notas?: string;
  expiracion_reserva?: string;
  canchas?: {
    nombre: string;
    deporte: string;
  };
  clientes?: {
    nombre: string;
    telefono_wa: string;
  };
  pagos_anticipos?: Array<{
    id: string;
    metodo: string;
    monto: number;
    estado: string;
    referencia_transaccion?: string;
  }>;
}

export interface Metricas {
  total_reservas: number;
  reservas_confirmadas: number;
  ingresos_estimados: number;
  anticipos_recaudados: number;
}
