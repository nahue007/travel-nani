import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORIES = [
  "Comida",
  "Transporte",
  "Alojamiento",
  "Entretenimiento",
  "Compras",
  "Salud",
  "Otros",
];

let exchangeRateCache = { rate: null, fetchedAt: 0 };

// Convierte 1 unidad de la moneda local a USD, cacheado por 6 horas
// para no golpear la API de cambio en cada mensaje.
async function getRateToUsd(currencyLocal) {
  if (currencyLocal === "USD") return 1;

  const sixHours = 6 * 60 * 60 * 1000;
  if (exchangeRateCache.rate && Date.now() - exchangeRateCache.fetchedAt < sixHours) {
    return exchangeRateCache.rate;
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${currencyLocal}`);
    const data = await res.json();
    const rate = data?.rates?.USD;
    if (!rate) throw new Error("No se encontro tasa USD en la respuesta");
    exchangeRateCache = { rate, fetchedAt: Date.now() };
    return rate;
  } catch (err) {
    console.error("Error obteniendo tipo de cambio:", err.message);
    // Si falla la API, seguimos guardando el gasto pero sin conversion (0 = desconocido)
    return exchangeRateCache.rate || 0;
  }
}

// Le pide a Claude que extraiga tipo, monto, categoria y descripcion corta
// de un mensaje en lenguaje natural tipo "sushi 8000" o "cobre 50000 de reintegro".
export async function parseExpenseMessage(text, currencyLocal) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: `Extraes datos de gastos/ingresos de viaje desde mensajes cortos en español.
Categorias validas: ${CATEGORIES.join(", ")}.
Respondes SOLO con JSON valido, sin texto adicional, con este formato exacto:
{"type": "gasto" | "ingreso", "amount": number, "category": string, "description": string}
- "type" es "ingreso" solo si claramente menciona cobrar, recibir plata, reintegro, sueldo, etc. Si no, es "gasto".
- "category" debe ser una de las categorias validas exactas.
- "description" es un resumen corto (2-4 palabras) de que fue el gasto.
- Si no podes identificar un monto numerico, devolve amount: null.`,
    messages: [{ role: "user", content: text }],
  });

  const raw = response.content.find((b) => b.type === "text")?.text?.trim() || "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (!parsed.amount || typeof parsed.amount !== "number") return null;
  if (!CATEGORIES.includes(parsed.category)) parsed.category = "Otros";

  const rate = await getRateToUsd(currencyLocal);

  return {
    type: parsed.type === "ingreso" ? "ingreso" : "gasto",
    description: parsed.description || text.slice(0, 40),
    category: parsed.category,
    amount_local: parsed.amount,
    currency_local: currencyLocal,
    amount_usd: rate ? Number((parsed.amount * rate).toFixed(2)) : 0,
    raw_message: text,
  };
}

export { CATEGORIES };
