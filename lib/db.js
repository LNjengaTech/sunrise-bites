import { neon } from '@neondatabase/serverless';

// Single Neon SQL client, reused across requests
let _sql = null;

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is not set. Create a .env.local file with your Neon connection string.\n' +
        'Get a free database at https://neon.tech'
      );
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Convert ? placeholders → $1, $2, ... for PostgreSQL
function toNeonSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// One-time schema init flag (per serverless instance lifetime)
let _ready = false;

export async function ensureSchema() {
  if (_ready) return;
  const sql = getSql();

  // Neon HTTP driver requires one statement per call
  await sql`CREATE TABLE IF NOT EXISTS ingredients (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,
    unit_type     TEXT NOT NULL,
    base_unit     TEXT NOT NULL,
    is_shared     INTEGER NOT NULL DEFAULT 0,
    purchase_qty  REAL DEFAULT 0,
    purchase_cost REAL DEFAULT 0,
    unit_cost     REAL DEFAULT 0,
    notes         TEXT,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  await sql`CREATE TABLE IF NOT EXISTS ingredient_price_history (
    id            SERIAL PRIMARY KEY,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    purchase_qty  REAL NOT NULL,
    purchase_cost REAL NOT NULL,
    unit_cost     REAL NOT NULL,
    recorded_at   TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  await sql`CREATE TABLE IF NOT EXISTS recipes (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    category      TEXT,
    yield_qty     REAL NOT NULL DEFAULT 1,
    yield_unit    TEXT NOT NULL DEFAULT 'piece',
    selling_price REAL NOT NULL DEFAULT 0,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  await sql`CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id            SERIAL PRIMARY KEY,
    recipe_id     INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity      REAL NOT NULL,
    cost_mode     TEXT NOT NULL DEFAULT 'direct'
  )`;

  await sql`CREATE TABLE IF NOT EXISTS sales (
    id         SERIAL PRIMARY KEY,
    recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    quantity   REAL NOT NULL,
    unit_price REAL NOT NULL,
    sale_date  TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  await sql`CREATE TABLE IF NOT EXISTS expenses (
    id            SERIAL PRIMARY KEY,
    category      TEXT NOT NULL,
    description   TEXT,
    amount        REAL NOT NULL,
    expense_date  TEXT NOT NULL,
    ingredient_id INTEGER,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  await sql`CREATE TABLE IF NOT EXISTS production_batches (
    id              SERIAL PRIMARY KEY,
    recipe_id       INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    batch_count     REAL NOT NULL DEFAULT 1,
    produced_qty    REAL NOT NULL,
    batch_cost      REAL NOT NULL DEFAULT 0,
    production_date TEXT NOT NULL,
    notes           TEXT,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  await sql`CREATE TABLE IF NOT EXISTS purchases (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    quantity      REAL,
    unit          TEXT,
    unit_price    REAL NOT NULL,
    total_cost    REAL NOT NULL,
    purchase_date TEXT NOT NULL,
    notes         TEXT,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
  )`;

  await sql`CREATE INDEX IF NOT EXISTS idx_sales_date     ON sales(sale_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_exp_date       ON expenses(expense_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_date   ON production_batches(production_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date)`;

  // Safe migration: guarantee cost_mode exists if recipe_ingredients was created previously
  try {
    await sql`ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS cost_mode TEXT NOT NULL DEFAULT 'direct'`;
  } catch {}

  _ready = true;
}

// ── Query helpers with Neon Cold-Start Retry ───────────────────────

/**
 * Retries a query function if Neon is currently waking up from auto-suspend.
 * Neon free tier compute endpoints spin down after inactivity and take 1-2s to wake up.
 */
async function withRetry(fn, retries = 3, delay = 700) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isConnectionIssue =
        err?.message?.includes('fetch failed') ||
        err?.message?.includes('connecting to database') ||
        err?.message?.includes('ETIMEDOUT') ||
        err?.message?.includes('ECONNRESET') ||
        err?.message?.includes('ECONNREFUSED') ||
        String(err).includes('fetch failed') ||
        err?.cause?.name === 'AggregateError';

      if (attempt < retries && isConnectionIssue) {
        console.warn(`[Neon DB] Cold-start wake up in progress (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.round(delay * 1.5);
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

/** Returns array of rows */
export async function dbQuery(rawSql, params = []) {
  return withRetry(async () => {
    await ensureSchema();
    const sql = getSql();
    return sql(toNeonSql(rawSql), params);
  });
}

/** Returns first row or null */
export async function dbGet(rawSql, params = []) {
  const rows = await dbQuery(rawSql, params);
  return rows[0] ?? null;
}

/** INSERT / UPDATE / DELETE — returns { lastInsertRowid, changes } */
export async function dbRun(rawSql, params = []) {
  return withRetry(async () => {
    await ensureSchema();
    const sql = getSql();
    let pgSql = toNeonSql(rawSql);
    const verb = rawSql.trimStart().toUpperCase().slice(0, 6);
    if (verb === 'INSERT' && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }
    const rows = await sql(pgSql, params);
    return {
      lastInsertRowid: rows[0]?.id ?? null,
      changes: rows.length,
    };
  });
}

// ── Unit helpers ───────────────────────────────────────────────────

export const UNIT_TYPES = {
  weight: {
    base: 'g',
    options: [
      { label: 'grams (g)', value: 'g', factor: 1 },
      { label: 'kilograms (kg)', value: 'kg', factor: 1000 },
    ],
  },
  volume: {
    base: 'ml',
    options: [
      { label: 'millilitres (ml)', value: 'ml', factor: 1 },
      { label: 'litres (L)', value: 'l', factor: 1000 },
    ],
  },
  count: {
    base: 'piece',
    options: [{ label: 'pieces', value: 'piece', factor: 1 }],
  },
  flat: {
    base: 'ksh',
    options: [{ label: 'flat cost (per batch/portion)', value: 'ksh', factor: 1 }],
  },
};

export function toBaseUnit(unitType, purchaseUnit, qty) {
  const opt = UNIT_TYPES[unitType]?.options.find((o) => o.value === purchaseUnit);
  return Number(qty) * (opt?.factor ?? 1);
}

// ── Recipe costing ─────────────────────────────────────────────────

export async function computeRecipeCost(recipeId) {
  const recipe = await dbGet('SELECT * FROM recipes WHERE id = ?', [recipeId]);
  if (!recipe) return null;
  let lines = [];
  try {
    lines = await dbQuery(
      `SELECT ri.id, ri.quantity, ri.cost_mode,
              i.id AS ingredient_id, i.name, i.base_unit, i.unit_cost, i.is_shared
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = ?`,
      [recipeId]
    );
  } catch {
    lines = await dbQuery(
      `SELECT ri.id, ri.quantity,
              i.id AS ingredient_id, i.name, i.base_unit, i.unit_cost, i.is_shared
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = ?`,
      [recipeId]
    );
  }

  let directCostPerBatch = 0;
  const directLines = [];
  const sharedLines = [];

  for (const l of lines) {
    const lineCost = Number(l.unit_cost ?? 0) * Number(l.quantity);
    const isOverhead = l.cost_mode === 'overhead';
    if (isOverhead) {
      sharedLines.push({ ...l, lineCost });
    } else {
      directCostPerBatch += lineCost;
      directLines.push({ ...l, lineCost });
    }
  }

  const yieldQty     = Number(recipe.yield_qty)    || 1;
  const sellingPrice = Number(recipe.selling_price) || 0;
  const costPerUnit    = directCostPerBatch / yieldQty;
  const profitPerUnit  = sellingPrice - costPerUnit;
  const marginPercent  = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;
  const revenuePerBatch = sellingPrice * yieldQty;
  const profitPerBatch  = revenuePerBatch - directCostPerBatch;

  return {
    recipe: { ...recipe, yield_qty: yieldQty, selling_price: sellingPrice },
    directLines,
    sharedLines,
    directCostPerBatch,
    costPerUnit,
    profitPerUnit,
    marginPercent,
    revenuePerBatch,
    profitPerBatch,
  };
}

export function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
