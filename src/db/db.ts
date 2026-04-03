import { Pool } from 'pg';

let pool: Pool | null = null;
let dbEnabled = false;

export function isDbEnabled(): boolean {
  return dbEnabled;
}

export function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString === "postgresql://user:password@localhost:5432/dbname") {
    dbEnabled = false;
    return null;
  }

  if (!pool) {
    try {
      // Basic validation to avoid TypeError: Invalid URL
      new URL(connectionString);
      
      pool = new Pool({
        connectionString,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
      dbEnabled = true;
    } catch (err) {
      console.warn("Invalid DATABASE_URL provided. Persistence is disabled.", err);
      dbEnabled = false;
      return null;
    }
  }
  return pool;
}

export async function initDb() {
  const p = getPool();
  if (!p) {
    console.warn("DATABASE_URL is not set or is placeholder. Persistence is disabled.");
    return;
  }

  let client;
  try {
    client = await p.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id UUID PRIMARY KEY,
        description TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        context JSONB DEFAULT '{}',
        phase TEXT DEFAULT '0_INIT',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY,
        goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        persona TEXT NOT NULL,
        phase TEXT NOT NULL,
        reasoning TEXT,
        result JSONB,
        error TEXT,
        dependencies UUID[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        content TEXT NOT NULL,
        phase TEXT NOT NULL,
        author TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("PostgreSQL Database initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize PostgreSQL database:", err);
    throw err;
  } finally {
    client.release();
  }
}
