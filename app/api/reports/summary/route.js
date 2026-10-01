import { NextResponse } from 'next/server';
import { dbQuery, dbGet, computeRecipeCost } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || new Date().toISOString().slice(0, 10);
    const to = searchParams.get('to') || new Date().toISOString().slice(0, 10);

    // ---- Cashflow: Revenue ----
    const totalRevenueRow = await dbGet(
      `SELECT COALESCE(SUM(quantity * unit_price), 0) as total FROM sales WHERE sale_date BETWEEN ? AND ?`,
      [from, to]
    );
    const totalRevenue = Number(totalRevenueRow?.total) || 0;

    // ---- Cashflow: Purchases (Daily market buys: flour, oil, etc.) ----
    let totalPurchases = 0;
    let purchaseRows = [];
    try {
      const totalPurchasesRow = await dbGet(
        `SELECT COALESCE(SUM(total_cost), 0) as total FROM purchases WHERE purchase_date BETWEEN ? AND ?`,
        [from, to]
      );
      totalPurchases = Number(totalPurchasesRow?.total) || 0;

      purchaseRows = (await dbQuery(
        `SELECT id, purchase_date as date, name as description, 'Purchases' as category,
                quantity, unit, unit_price, total_cost as amount, notes
         FROM purchases WHERE purchase_date BETWEEN ? AND ? ORDER BY purchase_date DESC, id DESC`,
        [from, to]
      )) || [];
    } catch (e) {
      console.warn('Purchases table query fallback:', e.message);
    }

    // ---- Cashflow: Other Overheads (Rent, Wages, Utilities, etc. — excluding legacy ingredient auto-logs) ----
    const expensesByCategory = (await dbQuery(
      `SELECT category, COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE expense_date BETWEEN ? AND ? AND category != 'ingredient'
       GROUP BY category ORDER BY total DESC`,
      [from, to]
    )) || [];
    const totalOtherExpenses = expensesByCategory.reduce((sum, e) => sum + Number(e.total || 0), 0);

    const expenseRows = (await dbQuery(
      `SELECT id, expense_date as date, COALESCE(description, category) as description,
              category, NULL as quantity, NULL as unit, amount as unit_price, amount, NULL as notes
       FROM expenses
       WHERE expense_date BETWEEN ? AND ? AND category != 'ingredient'
       ORDER BY expense_date DESC, id DESC`,
      [from, to]
    )) || [];

    const totalExpenses = totalOtherExpenses + totalPurchases;
    const netCashflow = totalRevenue - totalExpenses;

    // Build Daily Spending Sheet / Expense Ledger rows (sorted by date desc)
    const ledger = [
      ...purchaseRows.map((p) => ({
        ...p,
        type: 'purchase',
        amount: Number(p.amount) || 0,
        unit_price: Number(p.unit_price) || 0,
        quantity: p.quantity != null ? Number(p.quantity) : null,
      })),
      ...expenseRows.map((e) => ({
        ...e,
        type: 'expense',
        amount: Number(e.amount) || 0,
        unit_price: Number(e.unit_price) || 0,
      })),
    ].sort((a, b) => {
      if (a.date === b.date) return (Number(b.id) || 0) - (Number(a.id) || 0);
      return a.date < b.date ? 1 : -1;
    });

    // ---- Production Batches in period ----
    const batchesByRecipe = await dbQuery(
      `SELECT recipe_id, 
              COALESCE(SUM(batch_count), 0) as total_batches,
              COALESCE(SUM(produced_qty), 0) as total_produced,
              COALESCE(SUM(batch_cost), 0) as total_cost
       FROM production_batches
       WHERE production_date BETWEEN ? AND ?
       GROUP BY recipe_id`,
      [from, to]
    );

    // ---- Dish Sales in period ----
    const salesByRecipe = await dbQuery(
      `SELECT recipe_id, COALESCE(SUM(quantity), 0) as units_sold, COALESCE(SUM(quantity * unit_price), 0) as revenue
       FROM sales WHERE sale_date BETWEEN ? AND ? GROUP BY recipe_id`,
      [from, to]
    );

    const recipes = (await dbQuery('SELECT * FROM recipes ORDER BY name ASC')) || [];

    let totalActualProductionCost = 0;
    let totalTheoreticalDirectCost = 0;
    let totalUnsoldCost = 0;

    const dishReport = await Promise.all(
      recipes.map(async (r) => {
        const cost = await computeRecipeCost(r.id);
        const sold = (salesByRecipe || []).find((s) => Number(s.recipe_id) === Number(r.id)) || {};
        const prod = (batchesByRecipe || []).find((b) => Number(b.recipe_id) === Number(r.id)) || {};

        const unitsSold = Number(sold.units_sold ?? sold.unitssold ?? sold.unitsSold ?? 0);
        const revenue = Number(sold.revenue ?? 0);
        const unitsProduced = Number(prod.total_produced ?? prod.totalproduced ?? prod.totalProduced ?? 0);
        const batchesCooked = Number(prod.total_batches ?? prod.totalbatches ?? prod.totalBatches ?? 0);
        const actualBatchCost = Number(prod.total_cost ?? prod.totalcost ?? prod.totalCost ?? 0);

        const costPerUnit = cost ? Number(cost.costPerUnit || 0) : 0;
        const theoreticalDirectCost = costPerUnit * unitsSold;

        const hasBatchData = unitsProduced > 0;
        const effectiveDirectCost = hasBatchData ? actualBatchCost : theoreticalDirectCost;
        const unsoldQty = hasBatchData ? Math.max(0, unitsProduced - unitsSold) : 0;
        const unsoldCost = unsoldQty * costPerUnit;

        const grossProfit = revenue - effectiveDirectCost;
        const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

        totalActualProductionCost += actualBatchCost;
        totalTheoreticalDirectCost += theoreticalDirectCost;
        totalUnsoldCost += unsoldCost;

        return {
          recipeId: r.id,
          name: r.name,
          yieldUnit: r.yield_unit || 'piece',
          unitsSold,
          revenue,
          unitsProduced,
          batchesCooked,
          costPerUnit,
          sellingPrice: Number(r.selling_price) || 0,
          theoreticalDirectCost,
          actualBatchCost,
          effectiveDirectCost,
          unsoldQty,
          unsoldCost,
          grossProfit,
          marginPercent,
          hasBatchData,
        };
      })
    );

    dishReport.sort((a, b) => b.revenue - a.revenue);

    const totalEffectiveDirectCost = dishReport.reduce((sum, d) => sum + d.effectiveDirectCost, 0);
    const totalGrossProfit = totalRevenue - totalEffectiveDirectCost;
    const estimatedNetProfit = totalGrossProfit - totalOtherExpenses;

    return NextResponse.json({
      range: { from, to },
      cashflow: {
        totalRevenue,
        totalPurchases,
        totalOtherExpenses,
        totalExpenses,
        netCashflow,
        expensesByCategory,
      },
      profitability: {
        dishReport,
        totalEffectiveDirectCost,
        totalTheoreticalDirectCost,
        totalActualProductionCost,
        totalUnsoldCost,
        totalGrossProfit,
        otherExpenses: totalOtherExpenses,
        estimatedNetProfit,
      },
      ledger,
    });
  } catch (err) {
    console.error('Error in /api/reports/summary:', err);
    return NextResponse.json(
      {
        error: err.message || 'Internal Server Error',
        detail: String(err),
      },
      { status: 500 }
    );
  }
}
