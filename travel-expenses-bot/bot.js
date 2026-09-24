import TelegramBot from "node-telegram-bot-api";
import { parseExpenseMessage } from "./categorize.js";
import { insertMovement, getSummary } from "./db.js";

const DESTINATION_CURRENCY = process.env.DESTINATION_CURRENCY || "USD";
const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID;

export function startBot() {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

  bot.on("polling_error", (err) => console.error("Polling error:", err.message));

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `¡Hola! Soy tu bot de gastos de viaje.\n\n` +
        `Tu chat_id es: ${msg.chat.id}\n` +
        `Copialo en la variable TELEGRAM_ALLOWED_CHAT_ID para que solo yo te escuche.\n\n` +
        `Despues mandame cosas como "sushi 8000" o "taxi al hotel 1200" y te lo cargo solo.`
    );
  });

  bot.onText(/\/resumen/, async (msg) => {
    if (!isAllowed(msg.chat.id)) return;
    const { totals, byCategory } = getSummary();
    const gasto = totals.find((t) => t.type === "gasto");
    const ingreso = totals.find((t) => t.type === "ingreso");

    let text = `📊 *Resumen del viaje*\n\n`;
    text += `💸 Gastado: US$${(gasto?.total_usd || 0).toFixed(2)}\n`;
    text += `💰 Ingresos: US$${(ingreso?.total_usd || 0).toFixed(2)}\n\n`;
    text += `*Por categoria:*\n`;
    for (const c of byCategory) {
      text += `- ${c.category}: US$${c.total_usd.toFixed(2)} (${c.count})\n`;
    }
    bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
  });

  bot.on("message", async (msg) => {
    if (msg.text?.startsWith("/")) return; // los comandos ya se manejan arriba
    if (!isAllowed(msg.chat.id)) {
      bot.sendMessage(msg.chat.id, "No estas autorizado. Mandá /start para ver tu chat_id.");
      return;
    }

    const text = msg.text;
    if (!text) return;

    try {
      const movement = await parseExpenseMessage(text, DESTINATION_CURRENCY);

      if (!movement) {
        bot.sendMessage(msg.chat.id, "No pude identificar un monto ahí 🤔 Probá algo como \"sushi 8000\".");
        return;
      }

      insertMovement(movement);

      const emoji = movement.type === "ingreso" ? "💰" : "💸";
      bot.sendMessage(
        msg.chat.id,
        `${emoji} ${movement.description} — ${movement.currency_local} ${movement.amount_local} ` +
          `(≈ US$${movement.amount_usd.toFixed(2)})\n📁 ${movement.category}`
      );
    } catch (err) {
      console.error("Error procesando mensaje:", err.message);
      bot.sendMessage(msg.chat.id, "Uh, algo falló procesando eso. Probá de nuevo.");
    }
  });

  console.log("Bot de Telegram corriendo (polling)...");
  return bot;
}

function isAllowed(chatId) {
  if (!ALLOWED_CHAT_ID) return true; // si no se configuro todavia, deja pasar (fase de setup)
  return String(chatId) === String(ALLOWED_CHAT_ID);
}
