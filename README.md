# Ecosistema de Reservas Deportivas vía WhatsApp & Visor Web

Sistema integral de gestión de reservas en tiempo real diseñado para complejos deportivos (Fútbol 5/8/11, Pádel, Tenis y Vóley), implementado con una arquitectura **100% Gratuita ($0 USD de costo mensual)**.

---

## 📁 Estructura del Proyecto

```text
desarrollo/
├── PLAN_DE_ACCION.md       # Hoja de ruta completa, estudio de costos y arquitectura
├── GUIA_DESPLIEGUE_NUBE.md # Guía para publicar en Vercel, Render y Meta WhatsApp gratis
├── database/               # Base de Datos (PostgreSQL / Supabase)
│   ├── schema.sql          # Tablas, constraints anti-sobreventa y funciones RPC
│   └── README.md           # Guía de despliegue en Supabase en 2 minutos
├── backend/                # Servidor Node.js + Express + TypeScript
│   ├── src/
│   │   ├── bot/            # Motor del Bot de WhatsApp y flujos conversacionales
│   │   ├── services/       # Lógica atómica de reservas, pagos y recordatorios
│   │   └── index.ts        # Webhook de Meta, simulador y API REST
│   └── package.json
└── frontend/               # Visor Web Administrativo (React + Vite + Tailwind)
    ├── src/
    │   ├── components/     # Calendario interactivo, métricas y simulador de chat
    │   └── App.tsx         # Dashboard administrativo con WebSockets en tiempo real
    └── package.json
```

---

## 🚀 Cómo Ejecutar en Modo Local

### 1. Iniciar el Backend (API y Bot de WhatsApp)
Abre una terminal en `desarrollo/backend`:
```powershell
npm.cmd run dev
```
El servidor quedará disponible en `http://localhost:3000`:
- **Webhook de WhatsApp:** `http://localhost:3000/webhook`
- **Simulador del Bot:** `http://localhost:3000/api/bot/simulate`
- **Cron Recordatorios:** `http://localhost:3000/api/cron/recordatorios`

### 2. Iniciar el Frontend (Visor Web de Gestión)
Abre otra terminal en `desarrollo/frontend`:
```powershell
npm.cmd run dev
```
Abre tu navegador en `http://localhost:5173`.
