# Run these commands in your terminal to apply all changes:

# 1. Install the new Neon package
npm install

# 2. Delete the old database so the new schema with production_batches
#    and cost_mode column is created fresh (skip if you have real data to keep)
rm -f data/restaurant.db

# 3. Re-seed with the improved Mahamri example
npm run seed

# 4. Start the dev server
npm run dev
# → Open http://localhost:3000
