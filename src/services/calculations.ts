import type { CategoryKey } from '../types/nutrient.types.js';
import type { DietItem } from '../types/state.types.js';
import { NUTRIENT_UNITS } from '../config/units.js';
import { RDA_TARGETS } from '../config/targets.js';
import { FOOD_DATABASE } from '../data/index.js';
import { getCurrentDayData, getAllCurrentDayItems, state } from '../state/store.js';

export type AggregatedNutrients = Record<CategoryKey, Record<string, number>>;

export function getNutrientValue(item: DietItem, category: CategoryKey, nutrient: string): number {
    const food = FOOD_DATABASE[item.foodKey];
    if (!food) return 0;
    const baseValue = food[category]?.[nutrient] ?? 0;
    return baseValue * (item.amount / 100);
}

export function calculateAggregate(items: DietItem[]): AggregatedNutrients {
    const totals = {} as AggregatedNutrients;

    for (const [cat, compounds] of Object.entries(NUTRIENT_UNITS) as [CategoryKey, typeof NUTRIENT_UNITS[CategoryKey]][]) {
        totals[cat] = {};
        for (const compound of Object.keys(compounds)) {
            totals[cat][compound] = 0;
            totals[cat][`${compound}_absorbed`] = 0;
        }
    }

    items.forEach(item => {
        const food = FOOD_DATABASE[item.foodKey];
        if (!food) return;
        const absorptionMap = food.absorption ?? {};

        for (const cat of Object.keys(NUTRIENT_UNITS) as CategoryKey[]) {
            for (const compound of Object.keys(NUTRIENT_UNITS[cat])) {
                const rawVal = getNutrientValue(item, cat, compound);
                const rate = absorptionMap[compound] ?? 1.0;
                totals[cat][compound] += rawVal;
                totals[cat][`${compound}_absorbed`] += rawVal * rate;
            }
        }
    });

    return totals;
}

export function getActiveContext(): { items: DietItem[]; label: string } {
    const day = getCurrentDayData();
    const allItems = getAllCurrentDayItems();

    if (state.hoveredFood) {
        return { items: [state.hoveredFood], label: `Preview: ${state.hoveredFood.displayName}` };
    }

    if (state.selectedFoodId !== null) {
        const item = allItems.find(i => i.id === state.selectedFoodId);
        if (item) return { items: [item], label: `Locked: ${item.displayName}` };
    }

    if (state.hoveredMealId !== null) {
        const meal = day.meals.find(m => m.id === state.hoveredMealId);
        if (meal) return { items: meal.items, label: `Preview: ${meal.name}` };
    }

    if (state.selectedMealId !== null) {
        if (state.selectedMealId === 'quick_log') {
            return { items: day.unassigned, label: 'Locked: Quick Log' };
        }
        const meal = day.meals.find(m => m.id === state.selectedMealId);
        if (meal) return { items: meal.items, label: `Locked: ${meal.name}` };
    }

    return { items: allItems, label: `${state.currentDay} Summary (${allItems.length} foods)` };
}

export function getCategoryProgress(category: CategoryKey, activeData: AggregatedNutrients): number | null {
    const nutrients = NUTRIENT_UNITS[category];
    if (!nutrients) return 0;

    let totalTargeted = 0;
    let sumPercentage = 0;

    for (const [name, meta] of Object.entries(nutrients)) {
        if (meta.isSubheader || meta.noTarget) continue;
        const rda = RDA_TARGETS[category]?.[name] ?? 0;
        if (rda <= 0) continue;

        const rawVal = activeData[category]?.[name] ?? 0;
        sumPercentage += Math.min(100, (rawVal / rda) * 100);
        totalTargeted++;
    }

    if (totalTargeted === 0) return null;
    return Math.round(sumPercentage / totalTargeted);
}

export function formatMultiUnits(grams: number): string {
    const g = Math.round(grams);
    const oz = (grams / 28.3495231).toFixed(2);
    const lbs = (grams / 453.59237).toFixed(2);
    return `${g}g / ${oz}oz / ${lbs} pounds`;
}