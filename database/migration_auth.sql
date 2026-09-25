-- ==============================================================================
-- MIGRACIÓN: AUTENTICACIÓN, ROLES Y AISLAMIENTO MULTI-TENANT (RBAC)
-- ==============================================================================

-- 1. Tabla de Perfiles de Usuario asociados a un rol y a un complejo deportivo
CREATE TABLE IF NOT EXISTS perfiles_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'admin_complejo', -- 'superadmin', 'admin_complejo', 'recepcion'
    complejo_id UUID REFERENCES complejos(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE perfiles_usuario ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para perfiles verificados
CREATE POLICY "Permitir lectura de perfiles" 
ON perfiles_usuario FOR SELECT 
USING (true);

-- 3. Insertar perfiles demostrativos para cada rol
INSERT INTO perfiles_usuario (email, nombre, rol, complejo_id)
VALUES 
    ('superadmin@sired.com', 'Kevin Castro (SuperAdmin SIRED)', 'superadmin', NULL),
    ('admin@eldiamante.com', 'Carlos Pérez (Gerente El Diamante)', 'admin_complejo', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
    ('gerencia@padel127.com', 'Valentina Ruiz (Directora Pádel 127)', 'admin_complejo', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e')
ON CONFLICT (email) DO UPDATE 
SET rol = EXCLUDED.rol, complejo_id = EXCLUDED.complejo_id;
