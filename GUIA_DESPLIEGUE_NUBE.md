# Guía de Despliegue en la Nube (100% Gratis - $0 USD)

Esta guía te explica cómo poner todo el sistema en producción accesible desde internet para que cualquier persona en el mundo pueda interactuar con el bot de WhatsApp y tú puedas ver el visor desde tu celular o computadora.

---

## 1. Arquitectura de Despliegue a Costo Cero

| Componente | Proveedor en la Nube | Plan Gratuito |
| :--- | :--- | :--- |
| **Base de Datos** | [Supabase](https://supabase.com) *(Ya configurada)* | PostgreSQL 500 MB + WebSockets en tiempo real |
| **Visor Web (Frontend)** | [Vercel](https://vercel.com) | Despliegues ilimitados + SSL HTTPS gratis |
| **Bot API (Backend)** | [Render](https://render.com) | 750 horas/mes gratuitas de computación continua |
| **Canal WhatsApp** | [Meta for Developers](https://developers.facebook.com) | 1.000 conversaciones de servicio al mes gratis |
| **Cron Recordatorios** | [cron-job.org](https://cron-job.org) | Tareas programadas gratuitas cada 10 minutos |

---

## 2. Paso a Paso: Desplegar el Backend en Render.com ($0)

1. Sube tu carpeta a un repositorio en **GitHub** (puede ser privado).
2. Ve a [https://render.com](https://render.com) e inicia sesión con tu cuenta de GitHub.
3. Haz clic en **"New +"** > **"Web Service"**.
4. Selecciona tu repositorio de GitHub.
5. Configura los siguientes campos:
   - **Name:** `reservas-deportivas-api`
   - **Root Directory:** `desarrollo/backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free ($0/month)`
6. En la sección **Environment Variables**, añade:
   - `PORT`: `3000`
   - `SUPABASE_URL`: `https://ifqpfkxqrqdrjbhijfdj.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `tu_clave_secreta_sb_secret...`
   - `WHATSAPP_TOKEN`: *(tu token de Meta)*
   - `WHATSAPP_PHONE_NUMBER_ID`: *(tu ID de teléfono de Meta)*
   - `WHATSAPP_VERIFY_TOKEN`: `token_secreto_para_webhook_12345`
7. Haz clic en **"Deploy Web Service"**.
   - Render te dará una URL pública como: `https://reservas-deportivas-api.onrender.com`.

---

## 3. Paso a Paso: Vincular WhatsApp Oficial en Meta for Developers ($0)

1. Ingresa a [https://developers.facebook.com](https://developers.facebook.com).
2. Ve a **Mis Apps** > **Crear app** > Selecciona **Otro** > Tipo: **Negocios**.
3. En el panel de la app, añade el producto **WhatsApp**.
4. En el menú izquierdo de WhatsApp, entra a **Configuración** > **Webhook**:
   - Haz clic en **Editar**.
   - **URL de devolución de llamada:** `https://reservas-deportivas-api.onrender.com/webhook`
   - **Identificador de verificación (Verify Token):** `token_secreto_para_webhook_12345`
   - Haz clic en **Verificar y guardar**.
5. En la lista de campos de Webhook, busca el campo **`messages`** y haz clic en **Suscribirse**.
6. ¡Listo! Cualquier mensaje que llegue al número de WhatsApp de tu complejo será respondido automáticamente las 24 horas por el bot.

---

## 4. Paso a Paso: Desplegar el Visor Web en Vercel ($0)

1. Ve a [https://vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. Haz clic en **"Add New..."** > **"Project"**.
3. Importa tu repositorio de GitHub.
4. En **Root Directory**, haz clic en *Edit* y selecciona:
   `desarrollo/frontend`
5. En **Framework Preset**, Vercel detectará automáticamente **Vite**.
6. Haz clic en **"Deploy"**.
7. En menos de 1 minuto tendrás tu dominio activo:
   `https://tu-visor-deportivo.vercel.app`

---

## 5. Paso a Paso: Activar Recordatorios Automáticos en cron-job.org ($0)

1. Ve a [https://cron-job.org](https://cron-job.org) y crea una cuenta gratuita.
2. Haz clic en **"Create Cronjob"**:
   - **Title:** Recordatorios Partidos WhatsApp
   - **URL:** `https://reservas-deportivas-api.onrender.com/api/cron/recordatorios`
   - **Execution Schedule:** Cada 10 o 15 minutos (`*/15 * * * *`).
   - **Request Method:** `POST`.
3. Haz clic en **"Create"**.
