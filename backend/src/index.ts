import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { supabase } from './config/supabase.js';
import { WhatsAppFlow } from './bot/whatsappFlow.js';
import { ReminderService } from './services/reminderService.js';
import { BookingService } from './services/bookingService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==============================================================================
// 1. HEALTH CHECK & ESTADO DE CONEXIÓN
// ==============================================================================
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    servicio: 'SIRED - Ecosistema Multi-empresa de Reservas Deportivas & WhatsApp Bot',
    base_de_datos: 'Supabase PostgreSQL Conectada',
    modelo: 'Modelo A (Cada complejo con su propio WhatsApp oficial)',
    version: '2.0.0',
    webhook_url: '/webhook',
    simulador_bot: '/api/bot/simulate',
    cron_recordatorios: '/api/cron/recordatorios',
  });
});

// ==============================================================================
// 2. WHATSAPP CLOUD API - WEBHOOK (META MULTI-EMPRESA)
// ==============================================================================

app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'token_secreto_para_webhook_12345';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook de WhatsApp verificado con éxito');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const value = body.entry[0].changes[0].value;
        const messageObj = value.messages[0];
        const contactObj = value.contacts?.[0];

        // 1. Identificar el número de teléfono del establecimiento que recibió el mensaje (Modelo A)
        const phoneId = value.metadata?.phone_number_id;
        const displayPhone = value.metadata?.display_phone_number;

        // Buscar a qué empresa le pertenece este número de WhatsApp
        const complejo = await BookingService.getComplejoByPhone(phoneId, displayPhone);

        const telefonoCliente = messageObj.from;
        const texto = messageObj.text?.body || '';
        const nombrePush = contactObj?.profile?.name;

        // 2. Procesar con las canchas, tarifas y Nequi de ESE complejo
        const respuestaBot = await WhatsAppFlow.procesarMensaje(telefonoCliente, texto, nombrePush, complejo);

        // 3. Responder al cliente usando el token y número de ese complejo
        await enviarMensajeWhatsApp(telefonoCliente, respuestaBot, complejo.whatsapp_token, phoneId);
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error procesando webhook multi-tenant:', error);
    res.sendStatus(500);
  }
});

async function enviarMensajeWhatsApp(to: string, message: string, customToken?: string, customPhoneId?: string) {
  const token = customToken || process.env.WHATSAPP_TOKEN;
  const phoneId = customPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.log(`[WHATSAPP MENSAJE a ${to}]:\n${message}`);
    return;
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('Error enviando mensaje a WhatsApp:', err.response?.data || err.message);
  }
}

// ==============================================================================
// 3. SIMULADOR CONVERSACIONAL DE WHATSAPP (SOPORTA SELECCIÓN DE EMPRESA)
// ==============================================================================
app.post('/api/bot/simulate', async (req: Request, res: Response) => {
  try {
    const { telefono = '573009999999', mensaje = 'HOLA', nombre = 'Jugador', complejo_id } = req.body;
    let complejo = null;

    if (complejo_id) {
      complejo = await BookingService.getComplejo(complejo_id);
    }
    if (!complejo) {
      const complejos = await BookingService.getComplejos();
      complejo = complejos[0];
    }

    const respuesta = await WhatsAppFlow.procesarMensaje(telefono, mensaje, nombre, complejo);
    res.json({
      complejo: complejo.nombre,
      remitente: telefono,
      mensaje_recibido: mensaje,
      respuesta_bot: respuesta,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==============================================================================
// 4. GESTIÓN MULTI-TENANT DE EMPRESAS (COMPLEJOS)
// ==============================================================================

// Listar todos los complejos deportivos
app.get('/api/complejos', async (req: Request, res: Response) => {
  try {
    const complejos = await BookingService.getComplejos();
    res.json(complejos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar un nuevo complejo deportivo en la plataforma
app.post('/api/complejos', async (req: Request, res: Response) => {
  try {
    const nuevoComplejo = await BookingService.crearComplejo(req.body);
    res.status(201).json(nuevoComplejo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==============================================================================
// 5. ENDPOINTS REST POR COMPLEJO (CALENDARIO, RESERVAS, MÉTRICAS)
// ==============================================================================

// Lista de Canchas filtradas por complejo
app.get('/api/canchas', async (req: Request, res: Response) => {
  const { complejo_id } = req.query;
  try {
    const canchas = await BookingService.getCanchas(complejo_id as string | undefined);
    res.json(canchas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Lista de Reservas para el Calendario (filtradas por complejo)
app.get('/api/reservas', async (req: Request, res: Response) => {
  const { desde, hasta, complejo_id } = req.query;

  let query = supabase
    .from('reservas')
    .select('*, canchas!inner(id, nombre, deporte, complejo_id), clientes(nombre, telefono_wa), pagos_anticipos(*)');

  if (complejo_id) {
    query = query.eq('canchas.complejo_id', complejo_id as string);
  }
  if (desde) query = query.gte('fecha_inicio', desde as string);
  if (hasta) query = query.lte('fecha_fin', hasta as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Bloquear Franja Horaria (Mantenimiento, torneo, lluvia)
app.post('/api/bloqueos', async (req: Request, res: Response) => {
  const { cancha_id, fecha_inicio, fecha_fin, motivo } = req.body;

  const { data, error } = await supabase
    .from('bloqueos_horario')
    .insert({
      cancha_id,
      fecha_inicio,
      fecha_fin,
      motivo: motivo || 'Mantenimiento preventivo',
    })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Actualizar estado de una reserva
app.patch('/api/reservas/:id/estado', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { estado } = req.body;

  const { data, error } = await supabase
    .from('reservas')
    .update({ estado })
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Métricas y Resumen Financiero filtradas por complejo
app.get('/api/metricas', async (req: Request, res: Response) => {
  try {
    const { complejo_id } = req.query;
    let query = supabase.from('reservas').select('estado, valor_total, valor_anticipo_requerido, canchas!inner(complejo_id)');

    if (complejo_id) {
      query = query.eq('canchas.complejo_id', complejo_id as string);
    }

    const { data: reservas, error } = await query;
    if (error) throw error;

    const totalReservas = reservas?.length || 0;
    const confirmadas = reservas?.filter((r) => r.estado === 'confirmada' || r.estado === 'completada') || [];
    const ingresosTotales = confirmadas.reduce((sum, r) => sum + Number(r.valor_total || 0), 0);
    const anticiposRecaudados = confirmadas.reduce((sum, r) => sum + Number(r.valor_anticipo_requerido || 0), 0);

    res.json({
      total_reservas: totalReservas,
      reservas_confirmadas: confirmadas.length,
      ingresos_estimados: ingresosTotales,
      anticipos_recaudados: anticiposRecaudados,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tarea de recordatorios automáticos
app.post('/api/cron/recordatorios', async (req: Request, res: Response) => {
  try {
    const resultado = await ReminderService.procesarRecordatoriosProximos();
    await BookingService.liberarReservasExpiradas();
    res.json({ status: 'ok', ...resultado });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📡 Webhook WhatsApp listo en: http://localhost:${PORT}/webhook`);
  console.log(`💬 Simulador del Bot listo en: POST http://localhost:${PORT}/api/bot/simulate`);
  console.log(`⏰ Cron Recordatorios listo en: POST http://localhost:${PORT}/api/cron/recordatorios`);

  setInterval(async () => {
    try {
      await ReminderService.procesarRecordatoriosProximos();
      await BookingService.liberarReservasExpiradas();
    } catch (e) {
      console.error('Error en tarea programada:', e);
    }
  }, 5 * 60 * 1000);
});
