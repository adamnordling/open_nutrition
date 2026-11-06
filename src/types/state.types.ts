export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface DietItem {
    id: number;
    foodKey: string;
    amount: number;
    displayName: string;
}

export interface Meal {
    id: string;
    name: string;
    items: DietItem[];
}

export interface DayData {
    unassigned: DietItem[];
    meals: Meal[];
}

export type WeekData = Record<DayOfWeek, DayData>;

export interface CompareSlot {
    id: 'slot1' | 'slot2';
    parsed: DietItem | null;
    color: string;
    displayName: string;
}

export interface SavedPlan {
    name: string;
    date: string;
    data: WeekData;
}
