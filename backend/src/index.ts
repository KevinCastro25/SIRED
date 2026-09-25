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
    servicio: 'Sistema Automatizado de Reservas Deportivas - API & WhatsApp Bot',
    base_de_datos: 'Supabase PostgreSQL Conectada',
    version: '1.0.0',
    webhook_url: '/webhook',
    simulador_bot: '/api/bot/simulate',
    cron_recordatorios: '/api/cron/recordatorios',
  });
});

// ==============================================================================
// 2. WHATSAPP CLOUD API - WEBHOOK (META)
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
        const messageObj = body.entry[0].changes[0].value.messages[0];
        const contactObj = body.entry[0].changes[0].value.contacts?.[0];

        const telefono = messageObj.from;
        const texto = messageObj.text?.body || '';
        const nombrePush = contactObj?.profile?.name;

        const respuestaBot = await WhatsAppFlow.procesarMensaje(telefono, texto, nombrePush);
        await enviarMensajeWhatsApp(telefono, respuestaBot);
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.sendStatus(500);
  }
});

async function enviarMensajeWhatsApp(to: string, message: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

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
// 3. SIMULADOR CONVERSACIONAL DE WHATSAPP
// ==============================================================================
app.post('/api/bot/simulate', async (req: Request, res: Response) => {
  try {
    const { telefono = '573009999999', mensaje = 'HOLA', nombre = 'Jugador' } = req.body;
    const respuesta = await WhatsAppFlow.procesarMensaje(telefono, mensaje, nombre);
    res.json({ remitente: telefono, mensaje_recibido: mensaje, respuesta_bot: respuesta });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==============================================================================
// 4. ENDPOINTS REST CONECTADOS A SUPABASE
// ==============================================================================

app.get('/api/canchas', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('canchas').select('*').order('nombre');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/reservas', async (req: Request, res: Response) => {
  const { desde, hasta } = req.query;

  let query = supabase
    .from('reservas')
    .select('*, canchas(nombre, deporte), clientes(nombre, telefono_wa), pagos_anticipos(*)');

  if (desde) query = query.gte('fecha_inicio', desde as string);
  if (hasta) query = query.lte('fecha_fin', hasta as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

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

app.get('/api/metricas', async (req: Request, res: Response) => {
  try {
    const { data: reservas, error } = await supabase
      .from('reservas')
      .select('estado, valor_total, valor_anticipo_requerido');

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
