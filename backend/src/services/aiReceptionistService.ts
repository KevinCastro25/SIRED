import axios from 'axios';
import { Complejo } from './bookingService.js';

export interface ReceptionistResponse {
  esPreguntaOAtencion: boolean;
  esSolicitudHumano?: boolean;
  respuestaTexto?: string;
}

export class AIReceptionistService {
  /**
   * Determina si el texto del usuario es una solicitud de hablar con un humano
   */
  static esSolicitudHumano(texto: string): boolean {
    const t = texto.toLowerCase().trim();
    const patrones = [
      'humano',
      'persona',
      'asesor',
      'asesora',
      'recepcionista',
      'administrador',
      'administradora',
      'alguien real',
      'hablar con alguien',
      'atencion al cliente',
      'queja',
      'reclamo',
      'contacto humano',
      'soporte',
    ];
    return patrones.some((p) => t.includes(p));
  }

  /**
   * Determina si el texto es una pregunta libre frecuente sobre el establecimiento
   */
  static esPreguntaFrecuente(texto: string): boolean {
    const t = texto.toLowerCase().trim();
    const palabrasClave = [
      'parqueadero',
      'estacionamiento',
      'carro',
      'moto',
      'guayo',
      'guayos',
      'tache',
      'taches',
      'calzado',
      'zapatos',
      'vestier',
      'vestieres',
      'ducha',
      'duchas',
      'baño',
      'banos',
      'donde',
      'ubicacion',
      'direccion',
      'como llegar',
      'queda',
      'bebida',
      'hidratacion',
      'gatorade',
      'cerveza',
      'comida',
      'cafeteria',
      'peto',
      'petos',
      'balon',
      'balones',
      'tarjeta',
      'transferencia',
      'efectivo',
      'abono',
      'anticipo',
      'torneo',
      'cumpleaños',
      'evento',
      'alquilan',
      'precios',
      'cuanto vale',
    ];
    return palabrasClave.some((p) => t.includes(p));
  }

  /**
   * Procesa la consulta usando IA (Gemini Flash) o reglas directas
   */
  static async responderConsulta(texto: string, complejo: Complejo): Promise<ReceptionistResponse> {
    const t = texto.toLowerCase().trim();

    // 1. DERIVACIÓN A ASESOR HUMANO
    if (this.esSolicitudHumano(t)) {
      return {
        esPreguntaOAtencion: true,
        esSolicitudHumano: true,
        respuestaTexto:
          `👨‍💼 *Atención al Cliente - ${complejo.nombre}*\n\n` +
          `He notificado a la administración de nuestro complejo. Un asesor revisará tu mensaje en breve para brindarte asistencia personalizada 📱.\n\n` +
          `⚽ *¿Deseas consultar turnos disponibles mientras tanto?*\n` +
          `Escribe *HOLA* o *MENU* en cualquier momento para reservar automáticamente.`,
      };
    }

    // 2. PREGUNTAS FRECUENTES DEL COMPLEJO
    if (!this.esPreguntaFrecuente(t) && !t.includes('?')) {
      return { esPreguntaOAtencion: false };
    }

    // Si hay Gemini API Key configurada, usar IA conversacional
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const respuestaIA = await this.consultarGemini(texto, complejo, apiKey);
        if (respuestaIA) {
          return {
            esPreguntaOAtencion: true,
            respuestaTexto: respuestaIA,
          };
        }
      } catch (err: any) {
        console.error('Error consultando Gemini FAQ:', err.message);
      }
    }

    // Fallback inteligente sin IA (Reglas precisas del negocio en Colombia)
    const respuestaReglas = this.generarRespuestaPorReglas(t, complejo);
    return {
      esPreguntaOAtencion: true,
      respuestaTexto: respuestaReglas,
    };
  }

  /**
   * Consulta a Google Gemini Flash con el contexto del complejo deportivo
   */
  private static async consultarGemini(pregunta: string, complejo: Complejo, apiKey: string): Promise<string | null> {
    const apertura = complejo.hora_apertura ? complejo.hora_apertura.slice(0, 5) : '07:00';
    const cierre = complejo.hora_cierre ? complejo.hora_cierre.slice(0, 5) : '23:00';
    const direccion = complejo.direccion || 'Sede principal';
    const ciudad = complejo.ciudad || 'Colombia';

    const prompt = `Eres el asistente virtual amable, cordial y profesional del complejo deportivo "${complejo.nombre}" en ${ciudad}, Colombia.
Responde de forma clara, concisa (máximo 2 a 3 oraciones) a la siguiente pregunta del cliente por WhatsApp:

DATOS DEL COMPLEJO:
- Nombre: ${complejo.nombre}
- Ubicación: ${direccion}, ${ciudad}
- Horarios de atención: de ${apertura} a ${cierre}
- Parqueadero: Parqueadero vigilado privado gratuito para clientes (carros y motos).
- Calzado reglamentario: Permitido torretín (suela de goma) o tenis deportivos para césped sintético. NO se permiten guayos de taches de aluminio/metal.
- Comodidades: Vestieres, baños y duchas con agua caliente.
- Cafetería y tienda deportiva: Venta de bebidas hidratantes, snacks y préstamo/alquiler de petos y balones oficiales.
- Reservas: 100% automáticas las 24 horas a través de este mismo WhatsApp.

PREGUNTA DEL CLIENTE:
"${pregunta}"

INSTRUCCIONES:
- Responde con tono colombiano amable, respetuoso y profesional.
- Termina siempre invitando cordialmente a reservar con: "Escribe *HOLA* o *MENU* para ver las canchas y turnos disponibles ⚽🎾".`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await axios.post(
      endpoint,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 250 },
      },
      { timeout: 8000 }
    );

    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  /**
   * Respuestas estructuradas directas si no hay API Key de Gemini
   */
  private static generarRespuestaPorReglas(t: string, complejo: Complejo): string {
    const pie = `\n\n¿Deseas reservar tu turno? Escribe *HOLA* o *MENU* para ver canchas y horarios ⚽🎾.`;

    if (t.includes('parqueadero') || t.includes('estacionamiento') || t.includes('carro') || t.includes('moto')) {
      return `🚗 *Parqueadero en ${complejo.nombre}:*\nSí, contamos con parqueadero privado y vigilado para autos y motos, totalmente gratuito para todos los jugadores y acompañantes.` + pie;
    }

    if (t.includes('guayo') || t.includes('tache') || t.includes('calzado') || t.includes('zapato')) {
      return `👟 *Calzado permitido en ${complejo.nombre}:*\nPuedes jugar con tenis deportivos o guayos torretín (suela de goma para sintética). Por seguridad y cuidado de la grama, *no se permiten taches de aluminio o metálicos*.` + pie;
    }

    if (t.includes('ducha') || t.includes('vestier') || t.includes('baño') || t.includes('banos')) {
      return `🚿 *Servicios en ${complejo.nombre}:*\nDisponemos de vestieres amplios, baños limpios y duchas con agua caliente para que te cambies cómodamente después de tu partido.` + pie;
    }

    if (t.includes('donde') || t.includes('ubicacion') || t.includes('direccion') || t.includes('llegar') || t.includes('queda')) {
      return `📍 *Ubicación de ${complejo.nombre}:*\nNos encontramos en *${complejo.direccion}*, ${complejo.ciudad}. ¡Te esperamos!` + pie;
    }

    if (t.includes('bebida') || t.includes('hidratacion') || t.includes('comida') || t.includes('cafeteria') || t.includes('peto') || t.includes('balon')) {
      return `🥤 *Cafetería e Implementos:*\nContamos con zona de hidratación (bebidas isotónicas, agua, cerveza), snacks y disponemos de balones oficiales y petos para diferenciar equipos.` + pie;
    }

    if (t.includes('torneo') || t.includes('cumpleaños') || t.includes('evento')) {
      return `🏆 *Eventos y Torneos en ${complejo.nombre}:*\n¡Claro que sí! Organizamos torneos empresariales y prestamos las canchas para cumpleaños y eventos deportivos con franjas horarias completas. Un asesor te contactará para coordinar la logística.` + pie;
    }

    const apertura = complejo.hora_apertura ? complejo.hora_apertura.slice(0, 5) : '07:00';
    const cierre = complejo.hora_cierre ? complejo.hora_cierre.slice(0, 5) : '23:00';
    const direccion = complejo.direccion || 'nuestras instalaciones';

    return `👋 *Información de ${complejo.nombre}*\nEstamos disponibles todos los días de ${apertura} a ${cierre} en ${direccion}.\n\nPara consultar turnos o reservar tu cancha en 30 segundos, escribe *HOLA* ⚽.`;
  }
}
