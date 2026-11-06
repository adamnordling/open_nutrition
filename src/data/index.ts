import type { FoodProfile, SparseFoodProfile } from '../types/food.types.js';
import type { CategoryKey } from '../types/nutrient.types.js';
import { NUTRIENT_UNITS } from '../config/units.js';
import { chicken } from './foods/chicken.js';
import { potato } from './foods/potato.js';

export function createFood(sparse: SparseFoodProfile): FoodProfile {
    const profile: FoodProfile = {
        id: sparse.id,
        displayName: sparse.displayName,
        aliases: sparse.aliases ?? [sparse.id],
        insights: sparse.insights ?? null,
        absorption: {},
        general: {},
        organic_acids: {},
        carbohydrates: {},
        lipids: {},
        proteins_and_aminos: {},
        biogenic_amines: {},
        nucleic_acids_and_purines: {},
        vitamins: {},
        minerals: {},
        cellular_bioactives: {},
        myconutrients_and_adaptogens: {},
        bioactive_enzymes: {},
        antinutrients: {},
        antioxidants: {}
    };

    const categories = Object.keys(NUTRIENT_UNITS) as CategoryKey[];

    for (const category of categories) {
        const compounds = NUTRIENT_UNITS[category];
        for (const [name, meta] of Object.entries(compounds)) {
            if (meta.isSubheader) continue;

            const categoryData = sparse[category];
            profile[category][name] = categoryData?.[name] ?? 0;

            const customRate = sparse.absorption?.[name];
            profile.absorption[name] = customRate !== undefined ? customRate : (meta.defaultAbsorb ?? 1.0);
        }
    }

    return profile;
}

export const FOOD_DATABASE: Record<string, FoodProfile> = {
    chicken: createFood(chicken),
    potato: createFood(potato)
};