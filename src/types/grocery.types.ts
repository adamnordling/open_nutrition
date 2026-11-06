import type { FoodProfile } from './food.types.js';

export interface ParsedIngredient {
    name: string;
    percent: number | null;
}

export interface ParsedNutrition {
    Calories: number;
    EnergyKj: number;
    Fat: number;
    SaturatedFat: number;
    Carbs: number;
    Sugars: number;
    Fiber: number;
    Protein: number;
    Salt: number;
}

export interface ExtractedProduct {
    foodDef: FoodProfile;
    ingredients: ParsedIngredient[];
    nutritionPer100g: ParsedNutrition;
    matchedBaseFoodName: string | null;
}