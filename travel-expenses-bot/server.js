import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getAllMovements, getSummary, deleteMovement } from "./db.js";
import { startBot } from "./bot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/api/movements", (req, res) => {
  res.json(getAllMovements());
});

app.get("/api/summary", (req, res) => {
  res.json(getSummary());
});

app.delete("/api/movements/:id", (req, res) => {
  deleteMovement(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Dashboard corriendo en el puerto ${PORT}`);
});

// El bot arranca junto con el servidor web, en el mismo proceso.
if (process.env.TELEGRAM_BOT_TOKEN) {
  startBot();
} else {
  console.warn("TELEGRAM_BOT_TOKEN no configurado, el bot no va a arrancar.");
}
