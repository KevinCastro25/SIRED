import React, { useState } from 'react';
import { Send, Bot, RefreshCw, X, MessageSquare } from 'lucide-react';
import { Complejo } from '../types.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReservaCreada?: () => void;
  complejoSeleccionado?: Complejo;
}

interface MensajeChat {
  id: string;
  autor: 'usuario' | 'bot';
  texto: string;
  hora: string;
}

export const BotSimulatorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onReservaCreada,
  complejoSeleccionado,
}) => {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: '1',
      autor: 'bot',
      texto: `👋 ¡Hola! Soy el asistente 24/7 de reservas de ${complejoSeleccionado?.nombre || 'tu complejo deportivo'}.\nEscribe *HOLA* para consultar canchas y horarios disponibles.`,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputTexto, setInputTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [telefonoDemo] = useState('573001234567');

  if (!isOpen) return null;

  const enviarMensaje = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputTexto).trim();
    if (!texto || cargando) return;

    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nuevoMensajeUsuario: MensajeChat = {
      id: Date.now().toString(),
      autor: 'usuario',
      texto,
      hora: horaActual,
    };

    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setInputTexto('');
    setCargando(true);

    try {
      const res = await fetch('/api/bot/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: telefonoDemo,
          mensaje: texto,
          nombre: 'Santiago (Capitán)',
          complejo_id: complejoSeleccionado?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const mensajeError = errorData?.error || 'Error al comunicarse con el servidor.';
        throw new Error(mensajeError);
      }

      const data = await res.json();
      const nuevoMensajeBot: MensajeChat = {
        id: (Date.now() + 1).toString(),
        autor: 'bot',
        texto: data.respuesta_bot,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMensajes((prev) => [...prev, nuevoMensajeBot]);

      if (data.respuesta_bot.includes('RESERVA CONFIRMADA') && onReservaCreada) {
        onReservaCreada();
      }
    } catch (err: any) {
      setMensajes((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          autor: 'bot',
          texto: `⚠️ ${err.message || 'Error de conexión con el servidor.'}`,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const reiniciarChat = () => {
    setMensajes([]);
    enviarMensaje('MENU');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
      <div className="bg-emerald-800 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-400">
            🤖
          </div>
          <div>
            <h3 className="font-semibold text-sm truncate max-w-[210px]">
              {complejoSeleccionado ? complejoSeleccionado.nombre : 'Bot WhatsApp 24/7'}
            </h3>
            <p className="text-xs text-emerald-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-ping" />
              {complejoSeleccionado?.telefono_whatsapp || 'Canal Oficial'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={reiniciarChat}
            title="Reiniciar conversación"
            className="p-2 hover:bg-emerald-700/80 rounded-lg text-emerald-200 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-emerald-700/80 rounded-lg text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-slate-800/80 px-4 py-2 text-[11px] text-slate-300 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Simulador multi-empresa Modelo A</span>
        </div>
        {complejoSeleccionado && (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
            {complejoSeleccionado.ciudad || 'Colombia'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.autor === 'usuario' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md text-xs whitespace-pre-line leading-relaxed ${
                m.autor === 'usuario'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none'
              }`}
            >
              {m.texto}
              <div
                className={`text-[9px] mt-1 text-right ${
                  m.autor === 'usuario' ? 'text-emerald-200' : 'text-slate-400'
                }`}
              >
                {m.hora}
              </div>
            </div>
          </div>
        ))}

        {cargando && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 p-2 rounded-lg max-w-[140px]">
            <Bot className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Bot respondiendo...</span>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-800 border-t border-slate-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviarMensaje();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Escribe un mensaje o número..."
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={cargando || !inputTexto.trim()}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
