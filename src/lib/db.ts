import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const databasePath = join(process.cwd(), "data", "ocean-forest.db");
mkdirSync(dirname(databasePath), { recursive: true });
const globalDb = globalThis as unknown as { oceanForestDb?: Database.Database };
export const sqlite = globalDb.oceanForestDb ?? new Database(databasePath);
if (process.env.NODE_ENV !== "production") globalDb.oceanForestDb = sqlite;

sqlite.pragma("foreign_keys = ON");
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL, category TEXT NOT NULL, image TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS product_options (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), author TEXT NOT NULL, rating INTEGER NOT NULL, content TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS regions (id INTEGER PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL, season TEXT NOT NULL, note TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL);
  CREATE TABLE IF NOT EXISTS kit_codes (code TEXT PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), used INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), total_price INTEGER NOT NULL, status TEXT NOT NULL, recipient TEXT NOT NULL, address TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL, unit_price INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS certifications (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE REFERENCES kit_codes(code), region_id INTEGER NOT NULL REFERENCES regions(id), user_id INTEGER REFERENCES users(id), certified_at TEXT NOT NULL);
`);
