import type { CategoryKey, NutrientRecord } from './nutrient.types.js';

export interface BioInsights {
    family?: string;
    tags?: string[];
    superpower?: string;
    nuance?: string;
    prepTip?: string;
}

export interface FoodProfile {
    id: string;
    displayName: string;
    aliases: string[];
    insights: BioInsights | null;
    absorption: Record<string, number>;
    general: NutrientRecord;
    organic_acids: NutrientRecord;
    carbohydrates: NutrientRecord;
    lipids: NutrientRecord;
    proteins_and_aminos: NutrientRecord;
    biogenic_amines: NutrientRecord;
    nucleic_acids_and_purines: NutrientRecord;
    vitamins: NutrientRecord;
    minerals: NutrientRecord;
    cellular_bioactives: NutrientRecord;
    myconutrients_and_adaptogens: NutrientRecord;
    bioactive_enzymes: NutrientRecord;
    antinutrients: NutrientRecord;
    antioxidants: NutrientRecord;
}

export type SparseFoodProfile = {
    id: string;
    displayName: string;
    aliases?: string[];
    insights?: BioInsights;
    absorption?: Record<string, number>;
} & Partial<Record<CategoryKey, NutrientRecord>>;
