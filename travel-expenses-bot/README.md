# 🧳 Bot de Gastos de Viaje

Bot de Telegram + dashboard para trackear gastos del viaje. Le escribís al bot
cosas como "sushi 8000" o "taxi 1200" y categoriza el gasto solo con IA.

## Qué incluye

- **Bot de Telegram**: recibe tus mensajes y carga el gasto automáticamente
- **Categorización con IA**: usa Claude para extraer monto, categoría y tipo (gasto/ingreso)
- **Conversión a USD**: automática, usando el tipo de cambio del momento
- **Dashboard**: gráfico por categoría + tabla de movimientos, se actualiza solo

## 1. Conseguir las credenciales (5 min)

### Bot de Telegram
1. Abrí Telegram y buscá `@BotFather`
2. Mandale `/newbot`, elegí un nombre y un username (debe terminar en `bot`)
3. Te va a dar un **token** — copialo, es tu `TELEGRAM_BOT_TOKEN`

### API key de Anthropic
1. Andá a https://console.anthropic.com/settings/keys
2. Creá una API key — es tu `ANTHROPIC_API_KEY`
3. Esto tiene costo por uso, pero categorizar mensajes cortos con Haiku es
   centavos de dólar por mes de uso normal de viaje

## 2. Deploy en Railway (gratis para este uso)

1. Subí esta carpeta a un repo de GitHub (o usá el botón de "Deploy from local" de Railway)
2. Entrá a https://railway.app, creá cuenta, "New Project" → "Deploy from GitHub repo"
3. En **Variables**, agregá:
   - `TELEGRAM_BOT_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `DESTINATION_CURRENCY` (código ISO de 3 letras del país destino, ej `BRL`, `EUR`, `CLP`)
   - `TELEGRAM_ALLOWED_CHAT_ID` (lo dejás vacío por ahora, ver paso 3)
4. Railway detecta el `package.json` y lo despliega solo

## 3. Encontrar tu chat_id (para que el bot solo te escuche a vos)

1. Una vez desplegado, andá a Telegram y mandale `/start` a tu bot
2. Te va a responder con tu `chat_id`
3. Copialo en la variable `TELEGRAM_ALLOWED_CHAT_ID` en Railway y redeploy

## 4. Usarlo

- Mandale mensajes al bot: `"sushi 8000"`, `"uber al hotel 1500"`, `"cobré 50000 de vuelto"`
- Mandale `/resumen` para un resumen rápido dentro de Telegram
- Entrá al dashboard: Railway te da una URL pública (Settings → Networking → Generate Domain)

## Desarrollo local

```bash
npm install
cp .env.example .env   # completá las variables
npm start
```

El dashboard queda en `http://localhost:3000`.

## Notas

- La base de datos es un archivo SQLite local (`data/expenses.db`). En Railway,
  si querés que persista entre deploys, agregá un **Volume** apuntando a `/app/data`.
- Las categorías son fijas (Comida, Transporte, Alojamiento, Entretenimiento,
  Compras, Salud, Otros) — se pueden editar en `categorize.js`.
- El tipo de cambio se cachea 6 horas para no golpear la API en cada mensaje.
