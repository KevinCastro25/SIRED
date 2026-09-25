-- ==============================================================================
-- SISTEMA DE RESERVAS DE ESCENARIOS DEPORTIVOS - ESQUEMA DE BASE DE DATOS
-- Compatible con PostgreSQL y Supabase (Nivel Gratuito)
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Requerido para evitar solapamientos de horarios

-- 2. Tipos Enums
DO $$ BEGIN
    CREATE TYPE tipo_deporte AS ENUM ('futbol_5', 'futbol_8', 'futbol_11', 'padel', 'tenis', 'voley');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_reserva AS ENUM ('pendiente_pago', 'confirmada', 'cancelada', 'completada', 'bloqueada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metodo_pago AS ENUM ('nequi', 'daviplata', 'transferencia_bancaria', 'efectivo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabla: Complejos Deportivos
CREATE TABLE IF NOT EXISTS complejos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(255),
    ciudad VARCHAR(100) DEFAULT 'Bogotá',
    telefono_whatsapp VARCHAR(25) NOT NULL,
    hora_apertura TIME NOT NULL DEFAULT '06:00:00',
    hora_cierre TIME NOT NULL DEFAULT '23:00:00',
    duracion_turno_minutos INTEGER NOT NULL DEFAULT 60,
    -- Datos de recaudo para el bot (Nequi, Daviplata, etc.)
    nequi_numero VARCHAR(30),
    daviplata_numero VARCHAR(30),
    porcentaje_anticipo_minimo NUMERIC(5, 2) DEFAULT 50.00, -- Ej: 50% de anticipo
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla: Canchas / Escenarios
CREATE TABLE IF NOT EXISTS canchas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complejo_id UUID NOT NULL REFERENCES complejos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    deporte tipo_deporte NOT NULL DEFAULT 'futbol_5',
    precio_estandar NUMERIC(10, 2) NOT NULL DEFAULT 80000.00,
    precio_pico NUMERIC(10, 2) NOT NULL DEFAULT 110000.00, -- Para horas de alta demanda (ej: 6pm a 10pm)
    activa BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla: Clientes / Deportistas (registrados vía WhatsApp)
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono_wa VARCHAR(25) UNIQUE NOT NULL, -- Identificador único en WhatsApp (+57300...)
    nombre VARCHAR(120),
    email VARCHAR(120),
    bloqueado BOOLEAN DEFAULT false,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla: Reservas (Corazón del sistema)
CREATE TABLE IF NOT EXISTS reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cancha_id UUID NOT NULL REFERENCES canchas(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    estado estado_reserva NOT NULL DEFAULT 'pendiente_pago',
    valor_total NUMERIC(10, 2) NOT NULL,
    valor_anticipo_requerido NUMERIC(10, 2) NOT NULL,
    notas TEXT,
    -- Fecha límite para subir comprobante antes de liberar el turno (ej. 15 minutos)
    expiracion_reserva TIMESTAMPTZ,
    recordatorio_enviado BOOLEAN DEFAULT false,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW(),

    -- Validación lógica de horas
    CONSTRAINT chk_rango_fechas CHECK (fecha_fin > fecha_inicio),

    -- REGLA ANTI-SOBREVENTA: Evita que existan reservas solapadas en la misma cancha
    -- Se excluyen las reservas canceladas
    CONSTRAINT no_doble_reserva EXCLUDE USING gist (
        cancha_id WITH =,
        tstzrange(fecha_inicio, fecha_fin) WITH &&
    ) WHERE (estado IN ('pendiente_pago', 'confirmada', 'bloqueada'))
);

-- 7. Tabla: Pagos y Comprobantes de Anticipo
CREATE TABLE IF NOT EXISTS pagos_anticipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    metodo metodo_pago NOT NULL DEFAULT 'nequi',
    monto NUMERIC(10, 2) NOT NULL,
    referencia_transaccion VARCHAR(100),
    comprobante_url TEXT, -- URL de la imagen en Supabase Storage
    estado estado_pago NOT NULL DEFAULT 'pendiente',
    notas_admin TEXT,
    revisado_por VARCHAR(100),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla: Bloqueos de Horario (Mantenimiento, Torneos, Lluvia)
CREATE TABLE IF NOT EXISTS bloqueos_horario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cancha_id UUID NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGERS Y FUNCIONES DE APOYO
-- ==============================================================================

-- Función para actualizar timestamp 'actualizado_en'
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_complejos
BEFORE UPDATE ON complejos
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trg_actualizar_reservas
BEFORE UPDATE ON reservas
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- Función RPC para consultar turnos libres para una cancha en una fecha específica
CREATE OR REPLACE FUNCTION obtener_horarios_disponibles(
    p_cancha_id UUID,
    p_fecha DATE
)
RETURNS TABLE (
    hora_inicio TIME,
    hora_fin TIME,
    disponible BOOLEAN,
    precio NUMERIC
) AS $$
DECLARE
    v_apertura TIME;
    v_cierre TIME;
    v_duracion INT;
    v_precio_estandar NUMERIC;
    v_precio_pico NUMERIC;
    v_actual_inicio TIMESTAMPTZ;
    v_actual_fin TIMESTAMPTZ;
BEGIN
    -- Obtener horarios del complejo asociado
    SELECT c.hora_apertura, c.hora_cierre, c.duracion_turno_minutos, ca.precio_estandar, ca.precio_pico
    INTO v_apertura, v_cierre, v_duracion, v_precio_estandar, v_precio_pico
    FROM canchas ca
    JOIN complejos c ON c.id = ca.complejo_id
    WHERE ca.id = p_cancha_id;

    -- Iterar por cada bloque de hora
    v_actual_inicio := p_fecha + v_apertura;
    
    WHILE (v_actual_inicio::time < v_cierre) LOOP
        v_actual_fin := v_actual_inicio + (v_duracion || ' minutes')::interval;
        
        hora_inicio := v_actual_inicio::time;
        hora_fin := v_actual_fin::time;
        
        -- Tarifa pico: típicamente después de las 18:00 (6:00 PM)
        IF hora_inicio >= '18:00:00'::time THEN
            precio := v_precio_pico;
        ELSE
            precio := v_precio_estandar;
        END IF;

        -- Verificar si ya hay reserva activa o bloqueo
        IF EXISTS (
            SELECT 1 FROM reservas r
            WHERE r.cancha_id = p_cancha_id
              AND r.estado IN ('pendiente_pago', 'confirmada', 'bloqueada')
              AND (r.fecha_inicio, r.fecha_fin) OVERLAPS (v_actual_inicio, v_actual_fin)
        ) OR EXISTS (
            SELECT 1 FROM bloqueos_horario b
            WHERE b.cancha_id = p_cancha_id
              AND (b.fecha_inicio, b.fecha_fin) OVERLAPS (v_actual_inicio, v_actual_fin)
        ) THEN
            disponible := false;
        ELSE
            disponible := true;
        END IF;

        RETURN NEXT;
        v_actual_inicio := v_actual_fin;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Habilitar Supabase Realtime para sincronización del Visor Web
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservas;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pagos_anticipos;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE canchas;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- DATOS SEMILLA DE PRUEBA (SEED DATA)
-- ==============================================================================
INSERT INTO complejos (id, nombre, direccion, ciudad, telefono_whatsapp, hora_apertura, hora_cierre, duracion_turno_minutos, nequi_numero, daviplata_numero)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Club Deportivo El Diamante',
    'Calle 127 # 45-20',
    'Bogotá',
    '+573001234567',
    '07:00:00',
    '23:00:00',
    60,
    '3001234567',
    '3001234567'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO canchas (id, complejo_id, nombre, deporte, precio_estandar, precio_pico, activa)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cancha 1 - Fútbol 5 (Sintética)', 'futbol_5', 80000, 110000, true),
    ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cancha 2 - Pádel Cristal Pro', 'padel', 90000, 130000, true),
    ('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cancha 3 - Tenis Polvo de Ladrillo', 'tenis', 70000, 95000, true)
ON CONFLICT (id) DO NOTHING;
