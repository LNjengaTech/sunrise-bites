/**
 * Seeds the Neon Postgres database with a working Mahamri example.
 * Run: DATABASE_URL="..." node scripts/seed.js
 *  or: node scripts/seed.js   (if DATABASE_URL is in .env.local — but note
 *      dotenv isn't installed; set the env var in your shell or Vercel dashboard)
 */
require('dotenv').config({ path: '.env.local' }); // works if dotenv is available

const { neon } = require('@neondatabase/serverless');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL not set. Add it to .env.local or export it in your shell.');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const today = new Date().toISOString().slice(0, 10);

  // ── Create tables individually (Neon HTTP driver requires one statement per call) ──
  await sql`CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, unit_type TEXT NOT NULL,
    base_unit TEXT NOT NULL, is_shared INTEGER NOT NULL DEFAULT 0,
    purchase_qty REAL DEFAULT 0, purchase_cost REAL DEFAULT 0, unit_cost REAL DEFAULT 0,
    notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`;
  await sql`CREATE TABLE IF NOT EXISTS ingredient_price_history (
    id SERIAL PRIMARY KEY, ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    purchase_qty REAL, purchase_cost REAL, unit_cost REAL, recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`;
  await sql`CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, category TEXT, yield_qty REAL DEFAULT 1,
    yield_unit TEXT DEFAULT 'piece', selling_price REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`;
  await sql`CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY, recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity REAL NOT NULL, cost_mode TEXT DEFAULT 'direct'
  )`;
  await sql`CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY, recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    quantity REAL NOT NULL, unit_price REAL NOT NULL, sale_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`;
  await sql`CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY, category TEXT NOT NULL, description TEXT,
    amount REAL NOT NULL, expense_date TEXT NOT NULL, ingredient_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`;
  await sql`CREATE TABLE IF NOT EXISTS production_batches (
    id SERIAL PRIMARY KEY, recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    batch_count REAL DEFAULT 1, produced_qty REAL NOT NULL, batch_cost REAL DEFAULT 0,
    production_date TEXT NOT NULL, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sales_date   ON sales(sale_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_exp_date     ON expenses(expense_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_date ON production_batches(production_date)`;
  try {
    await sql`ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS cost_mode TEXT NOT NULL DEFAULT 'direct'`;
  } catch {}
  console.log('✅  Tables created / verified.');

  // Skip seed if data exists
  const [{ c }] = await sql`SELECT COUNT(*) as c FROM ingredients`;
  if (Number(c) > 0) {
    console.log('⚠️   Database already has data — skipping seed.');
    process.exit(0);
  }

  // Helper: convert ? placeholders → $1 $2 ...
  function toNeon(q) { let i = 0; return q.replace(/\?/g, () => `$${++i}`); }
  async function run(q, p = []) {
    let pq = toNeon(q);
    if (q.trim().toUpperCase().startsWith('INSERT') && !pq.toUpperCase().includes('RETURNING')) pq += ' RETURNING id';
    const rows = await sql(pq, p);
    return { id: rows[0]?.id };
  }

  async function addIngredient({ name, unit_type, base_unit, is_shared, purchase_qty, purchase_cost, notes }) {
    const unit_cost = purchase_cost / purchase_qty;
    const { id } = await run(
      `INSERT INTO ingredients (name,unit_type,base_unit,is_shared,purchase_qty,purchase_cost,unit_cost,notes) VALUES (?,?,?,?,?,?,?,?)`,
      [name, unit_type, base_unit, is_shared ? 1 : 0, purchase_qty, purchase_cost, unit_cost, notes || null]
    );
    await run(`INSERT INTO ingredient_price_history (ingredient_id,purchase_qty,purchase_cost,unit_cost) VALUES (?,?,?,?)`, [id, purchase_qty, purchase_cost, unit_cost]);
    await run(`INSERT INTO expenses (category,description,amount,expense_date,ingredient_id) VALUES ('ingredient',?,?,?,?)`, [`Purchased ${name}`, purchase_cost, today, id]);
    return id;
  }

  console.log('🌱  Seeding example data (Mahamri)...');

  const flour    = await addIngredient({ name:'Wheat flour',      unit_type:'weight', base_unit:'g',    purchase_qty:2000, purchase_cost:220, notes:'2kg packet' });
  const sugar    = await addIngredient({ name:'Sugar',            unit_type:'weight', base_unit:'g',    purchase_qty:2000, purchase_cost:260, notes:'2kg packet' });
  const iliki    = await addIngredient({ name:'Iliki (cardamom)', unit_type:'flat',   base_unit:'ksh',  purchase_qty:1,    purchase_cost:20,  notes:'per portion' });
  const hamiri   = await addIngredient({ name:'Hamiri (yeast)',   unit_type:'flat',   base_unit:'ksh',  purchase_qty:1,    purchase_cost:20,  notes:'per portion' });
  const blueband = await addIngredient({ name:'Blueband',         unit_type:'flat',   base_unit:'ksh',  purchase_qty:1,    purchase_cost:80,  notes:'per portion' });
  const water    = await addIngredient({ name:'Water',            unit_type:'flat',   base_unit:'ksh',  purchase_qty:1,    purchase_cost:5,   notes:'nominal' });
  const charcoal = await addIngredient({ name:'Charcoal',         unit_type:'flat',   base_unit:'ksh',  purchase_qty:1,    purchase_cost:40,  is_shared:1, notes:'SHARED: used for many dishes' });
  const oil      = await addIngredient({ name:'Cooking oil',      unit_type:'volume', base_unit:'ml',   purchase_qty:1000, purchase_cost:250, notes:'Deep frying; ~100ml absorbed per batch' });

  const { id: mahamriId } = await run(
    `INSERT INTO recipes (name,category,yield_qty,yield_unit,selling_price) VALUES (?,?,?,?,?)`,
    ['Mahamri','Snacks',160,'piece',5]
  );

  // Direct ingredients (counted in per-unit cost)
  for (const [ing, qty, mode] of [
    [flour, 2000, 'direct'], [sugar, 200, 'direct'], [iliki, 1, 'direct'],
    [hamiri, 1, 'direct'],  [blueband, 1, 'direct'], [water, 1, 'direct'],
    [oil, 100, 'direct'],   // 100 ml absorbed per batch
    [charcoal, 1, 'overhead'], // shared across all dishes
  ]) {
    await run(`INSERT INTO recipe_ingredients (recipe_id,ingredient_id,quantity,cost_mode) VALUES (?,?,?,?)`, [mahamriId, ing, qty, mode]);
  }

  // 3 days of sample data
  for (let i = 2; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const sold = 120 + i * 10;
    const batchCost = (220 / 2000) * 2000 + (260 / 2000) * 200 + 20 + 20 + 80 + 5 + (250 / 1000) * 100;
    await run(`INSERT INTO production_batches (recipe_id,batch_count,produced_qty,batch_cost,production_date) VALUES (?,?,?,?,?)`, [mahamriId, 1, 160, batchCost, dateStr]);
    await run(`INSERT INTO sales (recipe_id,quantity,unit_price,sale_date) VALUES (?,?,?,?)`, [mahamriId, sold, 5, dateStr]);
  }
  await run(`INSERT INTO expenses (category,description,amount,expense_date) VALUES (?,?,?,?)`, ['wages',    'Daily helper wage', 300, today]);
  await run(`INSERT INTO expenses (category,description,amount,expense_date) VALUES (?,?,?,?)`, ['transport','Market transport',  100, today]);

  const batchCost = (220/2000)*2000 + (260/2000)*200 + 20 + 20 + 80 + 5 + (250/1000)*100;
  console.log(`\n📊  Cost per Mahamri (incl. 100ml absorbed oil, excl. charcoal overhead):`);
  console.log(`    KSh ${(batchCost/160).toFixed(2)} / piece  →  sell at KSh 5  →  profit KSh ${(5 - batchCost/160).toFixed(2)} / piece`);
  console.log('\n🚀  Done! Deploy to Vercel and open the app.');
}

main().catch((e) => { console.error(e); process.exit(1); });
