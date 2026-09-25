-- ==============================================================================
-- MIGRACIÓN: MULTI-TENANT (MODELO A - CADA EMPRESA CON SU PROPIO WHATSAPP)
-- ==============================================================================

-- 1. Agregar campos multi-empresa a la tabla 'complejos'
ALTER TABLE complejos 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS whatsapp_token TEXT,
ADD COLUMN IF NOT EXISTS titular_cuenta VARCHAR(150) DEFAULT 'Administrador';

-- 2. Asignar slug por defecto al primer complejo de prueba con las credenciales oficiales de Meta
UPDATE complejos 
SET slug = 'el-diamante', 
    whatsapp_phone_number_id = '1233193979887782',
    telefono_whatsapp = '+15551739000'
WHERE id = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

-- 3. Crear un segundo complejo deportivo de ejemplo para probar la separación de empresas
INSERT INTO complejos (
    id, 
    slug, 
    nombre, 
    direccion, 
    ciudad, 
    telefono_whatsapp, 
    whatsapp_phone_number_id, 
    hora_apertura, 
    hora_cierre, 
    duracion_turno_minutos, 
    nequi_numero, 
    daviplata_numero,
    titular_cuenta
) VALUES (
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'padel-club-127',
    'Pádel Club 127 (Empresa B)',
    'Av. Pepe Sierra # 15-40',
    'Bogotá',
    '+573109998877',
    '9876543210',
    '06:00:00',
    '23:00:00',
    60,
    '3109998877',
    '3109998877',
    'Club Pádel S.A.S'
) ON CONFLICT (id) DO NOTHING;

-- 4. Asignar canchas exclusivas para el segundo complejo deportivo (Empresa B)
INSERT INTO canchas (id, complejo_id, nombre, deporte, precio_estandar, precio_pico, activa)
VALUES 
    ('44444444-4444-4444-4444-444444444444', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Pádel Panorámica A', 'padel', 110000, 140000, true),
    ('55555555-5555-5555-5555-555555555555', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Pádel Panorámica B', 'padel', 110000, 140000, true)
ON CONFLICT (id) DO NOTHING;
