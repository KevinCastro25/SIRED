================================================================================
          DOCUMENTO DE CONTEXTO TÉCNICO Y DE NEGOCIO PARA AGENTES IA
                         PROYECTO: SIRED (Cloud SaaS)
================================================================================
Fecha de generación: 29 de Septiembre de 2026
Propietario / Autor Git: Kevin Castro (KevinCastro25)
Email Git: KevinCastro25@users.noreply.github.com
Repositorio GitHub: https://github.com/KevinCastro25/SIRED
URL en Producción: https://sired1.vercel.app

Este documento fue diseñado para que cualquier modelo o agente de IA que
ingrese a este repositorio comprenda en su totalidad la arquitectura, el
modelo de datos, la lógica de negocio, las decisiones de diseño y las
convenciones del proyecto sin necesidad de deducciones ni exploración a ciegas.

================================================================================
1. VISIÓN DEL PRODUCTO Y MODELO DE NEGOCIO
================================================================================
SIRED es una plataforma Cloud SaaS Multi-Tenant orientada a mercados colombianos
y latinoamericanos, cuyo propósito es digitalizar la captación, agendamiento y
cobro de reservas y pedidos mediante una combinación de:
1. Bot de WhatsApp 24/7 interactivo con listas y botones (Meta Cloud API).
2. Verificación inteligente de comprobantes de pago (Nequi / Daviplata) mediante
   visión artificial con Google Gemini Flash (Multimodal) para evitar fraudes.
3. Asistente virtual y recepcionista IA para resolver preguntas frecuentes (FAQ)
   y derivar a asesores humanos cuando sea necesario.
4. Portal Web Administrativo reactivo para los dueños de negocios con calendarios
   de turnos, comandera digital de cocina y métricas analíticas en tiempo real.

MODELO DE COBRO AL CLIENTE FINAL:
Los negocios pagan una suscripción mensual (software como servicio) al dueño de
la plataforma (Kevin Castro) por el acceso al bot y al visor administrativo.

================================================================================
2. ARQUITECTURA MULTI-TENANT Y RUTAS DINÁMICAS (SLUGS)
================================================================================
La aplicación maneja múltiples empresas dentro de la misma base de datos y
el mismo frontend sin colisiones.

A) IDENTIFICACIÓN POR RUTA DINÁMICA (/:slug):
El frontend (SPA React alojada en Vercel) inspecciona `window.location.pathname`.
Si la ruta contiene un slug (ej: /barberia-royal o /graniza2kl):
- Carga directamente la información, colores, tarifas y agenda de ESE negocio.
- La pantalla de login se personaliza automáticamente con el nombre y logo del negocio.
- Oculta el selector global de otras empresas salvo que ingrese el SuperAdmin.

B) NICHOS Y TIPOS DE NEGOCIO SOPORTADOS (tipo_negocio):
En la base de datos (tabla 'complejos', columna 'tipo_negocio'), cada empresa
posee una etiqueta que transforma la interfaz del usuario:

1. 'deportes':
   - Canchas sintéticas de fútbol (fútbol 5, 8, 11), pádel, tenis y vóley playa.
   - Ejemplos activos:
     * Club Deportivo El Diamante -> https://sired1.vercel.app/el-diamante
     * Pádel Club 127 -> https://sired1.vercel.app/padel-club-127
   - Interfaz: Renderiza `<CalendarView />` con grilla de canchas por horas (6:00 a 23:00).

2. 'barberia':
   - Barberías, peluquerías y centros de estilo masculino.
   - Ejemplo activo: Barbería Royal Pereira -> https://sired1.vercel.app/barberia-royal
   - Interfaz: Grilla horaria donde las columnas son los puestos/barberos
     (Silla 1 Camilo, Silla 2 Mateo, Silla 3 Daniel) con badges en tonos ámbar y madera.

3. 'belleza_unas':
   - Salones de manicura, pedicura y spas estéticos.
   - Ejemplo activo: Glamour Nails & Spa -> https://sired1.vercel.app/glamour-nails
   - Interfaz: Grilla horaria donde las columnas son especialistas y mesas de manicura
     (Mesa 1 Valentina, Mesa 2 Sofía, Mesa 3 Andrea) con badges rosas.

4. 'salud' / 'consultorio':
   - Consultorios médicos, odontología y fisioterapia.
   - Interfaz: Grilla por consultorio y profesional con badges azul verdoso.

5. 'pedidos':
   - Negocios de alimentos y bebidas con despacho 100% a domicilio (sin retiro en tienda).
   - Ejemplo activo: Graniza2KL Granizados -> https://sired1.vercel.app/graniza2kl
   - Interfaz: NO muestra el calendario de canchas. Carga `<OrdersDashboard />`
     (Comandera digital de cocina con estados: Esperando Pago, En Preparación,
     En Domicilio 🛵, Entregado ✅, más gráfico de horas pico de demanda).

================================================================================
3. STACK TECNOLÓGICO Y ESTRUCTURA DEL REPOSITORIO
================================================================================

A) ESTRUCTURA DE CARPETAS:
/desarrollo
  ├── /frontend
  │     ├── /src
  │     │     ├── /components
  │     │     │     ├── CalendarView.tsx      (Calendario de canchas/puestos por horas)
  │     │     │     ├── OrdersDashboard.tsx   (Comandera de pedidos, despacho y horas pico)
  │     │     │     ├── LoginScreen.tsx       (Pantalla de login contextual con selector)
  │     │     │     ├── MetricCards.tsx       (KPIs de facturación, reservas y anticipos)
  │     │     │     ├── AnalyticsCharts.tsx   (Gráficos analíticos de ocupación e ingresos)
  │     │     │     ├── NewBookingModal.tsx   (Creación manual de reservas desde el visor)
  │     │     │     ├── NewComplejoModal.tsx  (Alta de nuevas empresas para SuperAdmin)
  │     │     │     └── BrandLogo.tsx         (Identidad visual de SIRED)
  │     │     ├── /config
  │     │     │     └── supabase.ts           (Cliente supabase-js con publishable key)
  │     │     ├── App.tsx                     (Orquestador principal y enrutador por slug)
  │     │     ├── types.ts                    (Definiciones de tipos TypeScript del frontend)
  │     │     └── main.tsx                    (Punto de entrada React 18)
  │     ├── vercel.json                       (Regla de rewrite: /:match* -> /index.html)
  │     ├── package.json
  │     └── vite.config.ts
  │
  └── /backend
        ├── /src
        │     ├── /bot
        │     │     └── whatsappFlow.ts       (Máquina de estados del bot y NLP contextual)
        │     ├── /services
        │     │     ├── bookingService.ts     (Lógica de negocio, consultas Supabase y RPCs)
        │     │     ├── receiptVerificationService.ts (Auditoría de comprobantes con Gemini)
        │     │     └── aiReceptionistService.ts (FAQ del negocio con Gemini Flash)
        │     ├── /config
        │     │     └── supabase.ts           (Cliente supabase-js con Service Role Key)
        │     └── index.ts                    (Servidor Express, endpoints y Webhook Meta)
        ├── /data
        │     └── complejos_faq.json          (Base de conocimiento FAQ por negocio/slug)
        ├── .env                              (Variables de entorno confidenciales)
        ├── package.json
        └── tsconfig.json

B) HERRAMIENTAS Y VERSIONES:
- Node.js: >= 20.x
- Frontend: Vite 6, React 18, Tailwind CSS v4, Framer Motion, Tabler Icons.
- Backend: Express 4, Axios, TypeScript, Google Generative AI / Gemini API REST.
- Base de Datos: PostgreSQL 15 en Supabase.

================================================================================
4. ESQUEMA DE BASE DE DATOS (SUPABASE / POSTGRESQL)
================================================================================
Proyecto Supabase ID: ifqpfkxqrqdrjbhijfdj
URL: https://ifqpfkxqrqdrjbhijfdj.supabase.co

TABLAS PRINCIPALES:

1. `complejos`:
   - id (uuid, PK)
   - nombre (text)
   - slug (text, UNIQUE) -> Identificador para la URL (ej: el-diamante, graniza2kl)
   - tipo_negocio (text) -> 'deportes' | 'barberia' | 'belleza_unas' | 'salud' | 'pedidos'
   - direccion (text)
   - ciudad (text)
   - telefono_whatsapp (text) -> Celular principal
   - whatsapp_phone_number_id (text) -> ID del número en Meta Cloud API
   - whatsapp_token (text) -> Token permanente específico de la empresa
   - nequi_numero (text), daviplata_numero (text), titular_cuenta (text)
   - porcentaje_anticipo_minimo (integer) -> 50% por defecto, 100% para granizados/pedidos
   - hora_apertura (time), hora_cierre (time)

2. `canchas`:
   - id (uuid, PK)
   - complejo_id (uuid, FK -> complejos.id)
   - nombre (text) -> Ej: "Cancha 1 Sintética", "Silla 1 - Camilo", "Línea de Despacho"
   - deporte (enum tipo_deporte) -> 'futbol_5' | 'futbol_8' | 'futbol_11' | 'padel' | 'tenis' | 'voley'
   - precio_estandar (numeric), precio_pico (numeric)
   - activa (boolean)

3. `clientes`:
   - id (uuid, PK)
   - telefono_wa (text, UNIQUE) -> Número internacional de WhatsApp (ej: 573112345678)
   - nombre (text)
   - creado_en (timestamptz)

4. `reservas`:
   - id (uuid, PK)
   - cancha_id (uuid, FK -> canchas.id)
   - cliente_id (uuid, FK -> clientes.id)
   - fecha_inicio (timestamptz), fecha_fin (timestamptz)
   - estado (text) -> 'pendiente_pago' | 'confirmada' | 'completada' | 'cancelada' | 'bloqueada'
   - valor_total (numeric), valor_anticipo_requerido (numeric)
   - notas (text) -> Para Graniza2KL almacena productos, dirección y tags ([EN_PREPARACION], [EN_DOMICILIO], [ENTREGADO])
   - expiracion_reserva (timestamptz) -> Bloqueo temporal de 15 minutos en espera de pago

5. `pagos_anticipos`:
   - id (uuid, PK)
   - reserva_id (uuid, FK -> reservas.id)
   - metodo (text) -> 'nequi' | 'daviplata' | 'transferencia_bancaria'
   - monto (numeric)
   - referencia_transaccion (text) -> Número de comprobante bancario (evita fraudes por duplicado)
   - comprobante_url (text)
   - revisado_por (text) -> 'IA_GEMINI' o ID de usuario
   - notas_admin (text)

FUNCIONES RPC EN POSTGRESQL:
- `obtener_horarios_disponibles(p_cancha_id, p_fecha)`:
  Calcula los turnos de 1 hora libres entre la hora de apertura y cierre,
  descartando reservas confirmadas, reservas pendientes no expiradas y turnos en el pasado.

================================================================================
5. ARQUITECTURA DEL BOT DE WHATSAPP (MÁQUINA DE ESTADOS Y NLP)
================================================================================
Ubicación del código: `backend/src/bot/whatsappFlow.ts`
Controlador Webhook: `backend/src/index.ts` (POST /webhook)

A) IDENTIFICACIÓN MULTI-TENANT:
Cuando entra un mensaje por el webhook de Meta, se extrae `phone_number_id` y
`display_phone_number`. Con esto, `BookingService.getComplejoByPhone` determina
a qué negocio pertenece el chat. Todo el flujo, tarifas, cuentas bancarias y
reglas se configuran con respecto a ESE negocio.

B) SESIONES DE USUARIO EN MEMORIA (`UserSession`):
Mapea por número de teléfono del cliente con un timeout de 30 minutos:
- `paso`:
  * 'INICIO': Menú de bienvenida o punto de partida.
  * 'SELECCION_CANCHA': Lista interactiva de canchas o profesionales.
  * 'SELECCION_FECHA': Selector inteligente (Hoy, Mañana, fechas naturales).
  * 'SELECCION_HORA': Menú interactivo de horarios disponibles de 1h o 2h.
  * 'ESPERA_PAGO': Turno o pedido apartado temporalmente esperando comprobante.
  * 'PEDIDO_ESPERA_DIRECCION': Exclusivo para pedidos de domicilios.

C) MOTOR DE COMPRENSIÓN DE CONTEXTO INICIAL (NLP):
Si el cliente no escribe un saludo estándar sino una petición completa:
- Ejemplo Citas: "Hola quiero padel hoy a las 7pm" o "Cita con Camilo mañana a las 3"
  -> Extrae cancha, fecha y hora; si está libre, aparta el turno de inmediato sin
     obligar al cliente a pasar por 3 menús interactivos.
- Ejemplo Pedidos: "Hola quiero 2 granizados de mango biche para la calle 15 # 4-20"
  -> Extrae productos, cantidad, tamaño, dirección, calcula total ($18.000) y
     pide la transferencia a Nequi en un solo paso.

D) AUDITORÍA DE COMPROBANTES CON GEMINI VISION (`receiptVerificationService.ts`):
Cuando el cliente envía una imagen mientras está en 'ESPERA_PAGO':
1. Descarga el binario de Meta Graph API.
2. Envía la imagen al modelo Google Gemini Flash Multimodal.
3. Evalúa:
   - Detección de alteraciones o fraude (fuente tipográfica alterada, edición digital).
   - Coincidencia del monto transferido vs. anticipo requerido.
   - Cuenta de destino (Nequi / Daviplata del negocio).
   - Nombre del titular.
   - Referencia de transacción (valida que no haya sido usada previamente).
4. Si es válida: Confirma la reserva/pedido inmediatamente y pasa a cocina o agenda.

E) RECEPCIONISTA VIRTUAL FAQ (`aiReceptionistService.ts`):
Resuelve dudas libres en lenguaje natural sobre parqueadero, vestimenta, ubicación,
precios o cancelaciones usando la base de conocimiento en `complejos_faq.json`.
Si el usuario pide hablar con una persona, activa derivación a asesor humano.

================================================================================
6. CASO ESPECIAL GASTRONÓMICO: GRANIZA2KL (GRANIZADOS CON LICOR - 100% DOMICILIOS)
================================================================================
Slug: `graniza2kl`
Tipo de negocio: `'pedidos'`
Ubicación: Pereira y Dosquebradas (Servicio EXCLUSIVO a domicilio +18, no hay retiro).

A) CARTA DE PRODUCTOS CONFIGURADA (+18):
- Personal con Licor (12oz): $9.000 COP
- Clásico con Licor (16oz): $12.000 COP (El más vendido)
- Mega Cóctel Frappé (24oz): $17.000 COP (Para rumbear o compartir)
- Especialidades y Combinaciones con Licor:
  * Maracuyá con Vodka Smirnoff (con lecherita)
  * Mango Biche Tequilero (con Tequila José Cuervo, sal, limón y tajín)
  * Frutos Rojos con Ron (Ron Medellín / Caldas con frutas silvestres)
  * Café Baileys Frappé (con crema de whisky Baileys)
  * Tamarindo Tequilero (con Chamoy y Tajín)
  * Coco Loco Frappé (con Ron Blanco)
- Licores disponibles: Vodka Smirnoff, Tequila José Cuervo, Ron Caldas/Medellín, Baileys, Aguardiente.
- Toppings gratis: Lecherita, Chamoy, Tajín o Sal y Limón.

B) COMPONENTES EN FRONTEND (`OrdersDashboard.tsx`):
1. Comandera Digital en Tiempo Real:
   - Filtros: Todos, Esperando Nequi, En Preparación (Barra de licuado), En Domicilio 🛵, Entregados ✅.
   - Tarjetas de comanda con copia rápida de dirección y enlace directo a WhatsApp.
   - Botones para avanzar estado en 1 clic.
2. Analíticas de Horas Pico:
   - Mapa de calor de 12:00 PM a 10:00 PM.
   - Franja pico identificada: Tardes de 3:00 PM a 6:00 PM y noches de previas/fiestas de 7:00 PM a 10:00 PM.
   - Ranking porcentual de licores más pedidos: Vodka (48%), Tequila (35%), Ron (17%).


================================================================================
7. CONVENCIONES DE CÓDIGO Y CONTROL DE VERSIONES (GIT)
================================================================================

A) REGLA ESTRICTA DE AUTORÍA EN COMMITS:
Cualquier commit en este repositorio DEBE ser firmado con la siguiente identidad:
Name: KevinCastro25
Email: KevinCastro25@users.noreply.github.com

Comando para git en terminal:
git commit --author="KevinCastro25 <KevinCastro25@users.noreply.github.com>" -m "mensaje"

B) COMPILACIÓN Y VERIFICACIÓN PRE-PUSH:
- Frontend: `cd frontend && npm run build` (debe terminar en código 0 sin errores de tipos).
- Backend: `cd backend && npm run build` (tsc sin errores).

C) DESPLIEGUE EN PRODUCCIÓN (CI/CD):
- Repositorio remoto: `https://github.com/KevinCastro25/SIRED.git` en rama `main`.
- Vercel tiene configurado el webhook con GitHub: cada `git push origin main`
  despliega automáticamente el nuevo build del frontend en `https://sired1.vercel.app`.
- En `frontend/vercel.json` se encuentra la regla de reescritura que previene 404s en slugs:
  {
    "rewrites": [
      { "source": "/:match*", "destination": "/index.html" }
    ]
  }

D) SEGURIDAD Y VARIABLES DE ENTORNO:
Nunca subir credenciales maestras a repositorios públicos.
Las variables de entorno requeridas se encuentran respaldadas en:
`ACCESOS_Y_CONFIGURACION_SIRED.txt`.
================================================================================
