-- ==============================================================================
-- MIGRACIÓN: BASE DE CONOCIMIENTO PERSONALIZADA POR EMPRESA (IA RECEPCIONISTA)
-- ==============================================================================

-- 1. Agregar campos de personalización del recepcionista virtual en 'complejos'
ALTER TABLE complejos 
ADD COLUMN IF NOT EXISTS informacion_faq TEXT,
ADD COLUMN IF NOT EXISTS telefono_admin VARCHAR(25);

-- 2. Ejemplo de conocimiento para Empresa A (Club Deportivo El Diamante - Fútbol y Tenis)
UPDATE complejos
SET informacion_faq = 'UBICACIÓN: Calle 127 # 45-20, Bogotá.
PARQUEADERO: Parqueadero privado gratuito vigilado para 25 autos y motos.
CALZADO: Para canchas sintéticas solo se permite torretín (suela de goma). Prohibido taches de aluminio. En tenis se exige calzado de suela plana para polvo de ladrillo.
SERVICIOS: Alquiler de petos ($5.000), balones oficiales, venta de bebidas hidratantes, snacks y duchas con agua caliente.
TORNEOS Y CLASES: Torneos empresariales los fines de semana y escuela de fútbol infantil.',
    telefono_admin = '3001234567'
WHERE id = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

-- 3. Ejemplo de conocimiento para Empresa B (Pádel Club 127 - Club de Pádel)
UPDATE complejos
SET informacion_faq = 'UBICACIÓN: Av. Pepe Sierra # 15-40, Bogotá.
PARQUEADERO: Bahía privada y servicio de valet parking.
CALZADO: Zapatillas reglamentarias para pádel con suela espiga (clay) o suela omni.
SERVICIOS: Alquiler de palas de pádel profesionales ($15.000 por pala), venta de tubos de pelotas Bullpadel, cafetería bar con cerveza artesanal y café gourmet, lockers y vestieres de lujo.
CLASES: Clases particulares de pádel con entrenadores certificados.',
    telefono_admin = '3109998877'
WHERE id = 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e';
