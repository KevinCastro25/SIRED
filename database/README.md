# Configuración de Base de Datos (Supabase - 100% Gratis)

Este proyecto utiliza **PostgreSQL** a través de **Supabase**, que incluye 500 MB de almacenamiento relacional, autenticación y WebSockets en tiempo real en su plan gratuito.

## Pasos para desplegar la base de datos en 2 minutos:

1. Ve a [https://supabase.com](https://supabase.com) e inicia sesión (con tu cuenta de GitHub o Google).
2. Haz clic en **"New Project"**.
   - Nombre: `reservas-deportivas`
   - Contraseña de BD: Elige una contraseña segura.
   - Región: `East US (North Virginia)` o `South America (São Paulo)` para menor latencia.
   - Plan: **Free ($0/month)**.
3. En el panel izquierdo de Supabase, entra a **"SQL Editor"**.
4. Haz clic en **"New query"**, copia todo el contenido del archivo [`schema.sql`](./schema.sql) y pégalo allí.
5. Haz clic en **"Run"** (o presiona `Ctrl + Enter`).
6. ¡Listo! Tendrás todas las tablas, los tipos, las reglas anti-sobreventa y los datos de prueba listos.
