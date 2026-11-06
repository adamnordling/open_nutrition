// src/state/store.ts
import type { DayOfWeek, WeekData, CompareSlot, DietItem, DayData } from '../types/state.types';
import type { CategoryKey } from '../types/nutrient.types';
import { leftColumnLayout, rightColumnLayout } from '../config/layout';

export const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface AppState {
    currentDay: DayOfWeek;
    weekData: WeekData;
    selectedMealId: string | null;
    selectedFoodId: number | null;
    hoveredMealId: string | null;
    hoveredFood: DietItem | null;
    allCollapsed: boolean;
    collapsedCategories: Record<CategoryKey, boolean>;
    expandedNutrient: string | null;
    mode: 'diet' | 'compare';
    compareSlots: [CompareSlot, CompareSlot];
}

const emptyDay = (): DayData => ({ unassigned: [], meals: [] });

export const state: AppState = {
    currentDay: 'Mon',
    weekData: {
        Mon: emptyDay(),
        Tue: emptyDay(),
        Wed: emptyDay(),
        Thu: emptyDay(),
        Fri: emptyDay(),
        Sat: emptyDay(),
        Sun: emptyDay()
    },
    selectedMealId: null,
    selectedFoodId: null,
    hoveredMealId: null,
    hoveredFood: null,
    allCollapsed: true,
    collapsedCategories: {} as Record<CategoryKey, boolean>,
    expandedNutrient: null,
    mode: 'diet',
    compareSlots: [
        { id: 'slot1', parsed: null, color: '#0072b2', displayName: 'Item A' },
        { id: 'slot2', parsed: null, color: '#e69f00', displayName: 'Item B' }
    ]
};

[...leftColumnLayout, ...rightColumnLayout].forEach(cat => {
    state.collapsedCategories[cat] = true;
});

const stored = localStorage.getItem('open_nutrition_active_week');
if (stored) {
    try {
        state.weekData = JSON.parse(stored) as WeekData;
    } catch {
        // fallback
    }
}

export function persistActiveWeek(): void {
    try {
        localStorage.setItem('open_nutrition_active_week', JSON.stringify(state.weekData));
    } catch {
        // fallback
    }
}

export function getCurrentDayData(): DayData {
    return state.weekData[state.currentDay] ?? emptyDay();
}

export function getAllCurrentDayItems(): DietItem[] {
    const day = getCurrentDayData();
    const mealItems = day.meals.flatMap(m => m.items);
    return [...day.unassigned, ...mealItems];
}
