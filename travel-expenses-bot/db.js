import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");

// Git no versiona carpetas vacias, asi que en el deploy "data/" puede no existir.
// La creamos nosotros mismos antes de abrir la base.
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "expenses.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('gasto', 'ingreso')),
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount_local REAL NOT NULL,
    currency_local TEXT NOT NULL,
    amount_usd REAL NOT NULL,
    raw_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export function insertMovement(m) {
  const stmt = db.prepare(`
    INSERT INTO movements (type, description, category, amount_local, currency_local, amount_usd, raw_message)
    VALUES (@type, @description, @category, @amount_local, @currency_local, @amount_usd, @raw_message)
  `);
  const info = stmt.run(m);
  return info.lastInsertRowid;
}

export function getAllMovements() {
  return db.prepare(`SELECT * FROM movements ORDER BY created_at DESC`).all();
}

export function getSummary() {
  const totals = db.prepare(`
    SELECT type,
           SUM(amount_local) as total_local,
           SUM(amount_usd) as total_usd
    FROM movements
    GROUP BY type
  `).all();

  const byCategory = db.prepare(`
    SELECT category, type,
           SUM(amount_local) as total_local,
           SUM(amount_usd) as total_usd,
           COUNT(*) as count
    FROM movements
    WHERE type = 'gasto'
    GROUP BY category
    ORDER BY total_usd DESC
  `).all();

  return { totals, byCategory };
}

export function deleteMovement(id) {
  return db.prepare(`DELETE FROM movements WHERE id = ?`).run(id);
}

export default db;
