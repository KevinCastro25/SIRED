-- ==============================================================================
-- MIGRACIÓN: MULTI-RUBRO (DEPORTES, BARBERÍAS, SPA DE UÑAS, SALUD)
-- ==============================================================================

-- 1. Agregar columna tipo_negocio con valor por defecto 'deportes'
ALTER TABLE complejos 
ADD COLUMN IF NOT EXISTS tipo_negocio VARCHAR(50) DEFAULT 'deportes';

-- 2. Asegurar que todos los registros actuales tengan 'deportes'
UPDATE complejos 
SET tipo_negocio = 'deportes' 
WHERE tipo_negocio IS NULL;
