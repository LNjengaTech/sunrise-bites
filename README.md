# Duka Cost Tracker

A simple installable PWA for tracking ingredient-level dish costing, sales, production batches, and expenses for a small restaurant. Built with Next.js + SQLite (local) or Neon Postgres (free cloud).

---

## What this system is called

This is a **recipe costing / COGS (Cost of Goods Sold) system** combined with basic **cashflow tracking** and a lightweight **production log**. In bigger software this is sometimes called a "Bill of Materials" applied to food.

---

## How it solves the tricky cases

| Problem | Solution |
|---|---|
| Prices change | Record a new purchase in **Ingredients → Update price** — every recipe using that ingredient recalculates instantly. Price history is saved. |
| Bulk-bought ingredients | Bought in kg, stored in grams internally. Recipe just says how many grams per batch. |
| Flat-cost items (iliki, hamiri) | Use **"Flat cost per portion"** measurement type. |
| Shared overhead (charcoal, reused oil) | Mark as **Overhead** per ingredient line in the recipe. Tracked for reference, excluded from per-unit margin. |
| Absorbed oil (10% actually consumed) | Enter absorbed amount (e.g. 100 ml) as **Direct cost** — only that portion is counted, not the whole bottle. |
| Unsold food / spoilage | Use **Production Log** to log how many batches you cooked. Reports then compares produced vs sold and shows unsold cost. |

---

## Database options (free!)

### Option A — Local SQLite (default, no setup needed)
Stores data in `data/restaurant.db` on the same machine running the app.
Best for: running on an old laptop or Raspberry Pi at the shop.

```bash
npm install
npm run seed   # optional: loads the Mahamri example
npm run dev    # http://localhost:3000
```

### Option B — Neon Postgres (free cloud, deploy to Vercel)
1. Create a free database at [neon.tech](https://neon.tech) (free tier, no credit card needed)
2. Copy your connection string
3. Create a `.env.local` file:

```
DATABASE_URL=postgresql://neondb_owner:your_password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

4. Run the seed (optional):

```bash
npm run seed
```

5. Deploy to Vercel:

```bash
npx vercel
# Set DATABASE_URL in Vercel's Environment Variables dashboard
```

---

## Day-to-day workflow

1. **Ingredients** — add every ingredient once with its purchase price. Mark charcoal as shared overhead. Oil gets entered with the amount absorbed per batch as "Direct".
2. **Dishes** — build each recipe. Set how many grams of each ingredient per batch and the batch yield.
3. **Counter 🏪** — During breakfast rush, open Counter on your phone and tap +1/+5/+10 per dish, then "Log Sale" in one tap.
4. **Production 🍳** — After each cooking session, log how many batches were cooked. This enables unsold-food cost tracking in reports.
5. **Expenses** — log rent, wages, transport, etc. (ingredient restocks are auto-logged from Ingredients).
6. **Reports** — pick a date range to see cashflow, dish performance, and the real net profit (including unsold food if batches were logged).

---

## Project structure

```
app/
  page.js              — Dashboard (today's snapshot)
  counter/page.js      — POS Counter for fast tap-to-sell
  batches/page.js      — Production log (batches cooked)
  ingredients/page.js  — Ingredient management & price updates
  recipes/page.js      — Dish list & recipe cards
  recipes/new/page.js  — Add new dish
  recipes/[id]/page.js — Dish detail & edit
  expenses/page.js     — Expense logging
  reports/page.js      — Cashflow & profitability reports
  api/                 — REST endpoints
components/
  NavBar.js            — Sidebar (desktop) + bottom tab bar (mobile)
  RecipeForm.js        — Recipe builder with live cost preview & cost_mode selector
lib/
  db.js                — Unified Neon + SQLite database layer
scripts/
  seed.js              — Example data seeder (supports both Neon and SQLite)
public/
  manifest.json        — PWA manifest
  sw.js                — Service worker (app shell caching)
```
