import type { ParsedIngredient, ParsedNutrition, ExtractedProduct } from '../types/grocery.types.js';
import type { FoodProfile } from '../types/food.types.js';
import { createFood, FOOD_DATABASE } from '../data/index.js';

function parseSwedishFloat(val: unknown): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val)
        .replace(/\s/g, '')
        .replace(',', '.')
        .replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

export function parseIngredients(rawText: string): ParsedIngredient[] {
    if (!rawText) return [];

    const ingBlockMatch = rawText.match(
        /(?:Ingredienser|Innehåll)[:\s]*([\s\S]*?)(?=(?:\r?\n\s*(?:Förvaring|Ursprung|Lägsta|Högsta|Tillverkningsland|Näringsvärde|Näringsdeklaration|Hållbarhet|Bäst före)|$))/i
    );

    const targetText = ingBlockMatch ? ingBlockMatch[1] : rawText;
    const cleanText = targetText.replace(/\.\s*$/, '').trim();
    const parts = cleanText.split(/[,•;]/);
    const results: ParsedIngredient[] = [];
    const percentRegex = /([a-zA-ZåäöÅÄÖ\s\(\)\-]+?)\s*(\d+(?:[.,]\d+)?)\s*%/;

    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed || /^(förvaring|kylskåp|frys|ursprung|lägsta|högsta)/i.test(trimmed)) continue;

        const match = trimmed.match(percentRegex);
        if (match) {
            results.push({ name: match[1].trim(), percent: parseSwedishFloat(match[2]) });
        } else if (trimmed.length > 1) {
            results.push({ name: trimmed, percent: null });
        }
    }
    return results;
}

export function parseNutritionDeclaration(text: string): ParsedNutrition {
    const raw = text.replace(/&nbsp;/g, ' ');
    const findMatch = (regex: RegExp): number => {
        const m = raw.match(regex);
        return m ? parseSwedishFloat(m[1]) : 0;
    };

    return {
        Calories:
            findMatch(/Energi\s*(?:\(kcal\))?[:\s\t]+(\d+(?:[.,]\d+)?)\s*kcal/i) ||
            findMatch(/(\d+(?:[.,]\d+)?)\s*kcal/i),
        EnergyKj: findMatch(/Energi\s*(?:\(kJ\))?[:\s\t]+(\d+(?:[.,]\d+)?)\s*kJ/i),
        Fat: findMatch(/Fett[:\s\t]+(\d+(?:[.,]\d+)?)\s*g/i),
        SaturatedFat: findMatch(/Varav\s+mättat\s+fett[:\s\t]+(\d+(?:[.,]\d+)?)\s*g/i),
        Carbs: findMatch(/Kolhydrat(?:er)?[:\s\t]+(\d+(?:[.,]\d+)?)\s*g/i),
        Sugars: findMatch(/Varav\s+sockerarter[:\s\t]+(\d+(?:[.,]\d+)?)\s*g/i),
        Fiber: findMatch(/Fiber[:\s\t]+(\d+(?:[.,]\d+)?)\s*g/i),
        Protein: findMatch(/Protein[:\s\t]+(\d+(?:[.,]\d+)?)\s*g/i),
        Salt: findMatch(/Salt[:\s\t]+(\d+(?:[.,]\d+)?)\s*g/i)
    };
}

function findMatchingBaseFood(title: string, ingredients: ParsedIngredient[]): FoodProfile | null {
    const tokens = [title.toLowerCase(), ...ingredients.map(i => i.name.toLowerCase())];

    for (const [key, food] of Object.entries(FOOD_DATABASE)) {
        const aliases = [key.toLowerCase(), food.displayName.toLowerCase(), ...food.aliases];
        for (const token of tokens) {
            if (aliases.some(a => token.includes(a) || a.includes(token))) {
                return food;
            }
        }
    }
    return null;
}

export function extractProductFromText(rawInput: string, sourceHint = ''): ExtractedProduct {
    const lines = rawInput
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
    let title = '';

    if (lines.length > 0 && !/^(ingredienser|näringsvärde|näringsdeklaration)/i.test(lines[0])) {
        title = lines[0];
    } else {
        title = sourceHint.replace(/^https?:\/\/[^\/]+\//, '').split('/')[0] || 'Imported Food';
    }

    const ingredients = parseIngredients(rawInput);
    const nutrition = parseNutritionDeclaration(rawInput);
    const matched = findMatchingBaseFood(title, ingredients);
    const foodId = 'prod_' + Math.random().toString(36).substring(2, 9);

    const newFood = createFood({
        id: foodId,
        displayName: title,
        aliases: [title.toLowerCase()],
        insights: {
            family: matched ? `${matched.insights?.family ?? 'Matched Food'} (Calibrated)` : 'Imported Food',
            tags: matched ? [...(matched.insights?.tags ?? []), 'Label Verified'] : ['Package Verified'],
            superpower: matched
                ? `Micronutrients mapped from ${matched.displayName}. Package macros verified.`
                : 'Custom verified package macronutrient declaration.',
            nuance: 'Official declared values per 100g.',
            prepTip: 'Scaled dynamically to target weight.'
        },
        general: {
            Calories: nutrition.Calories,
            Water: Math.max(
                0,
                100 - (nutrition.Protein + nutrition.Fat + nutrition.Carbs + nutrition.Fiber + nutrition.Salt)
            )
        },
        carbohydrates: {
            'Total Carbohydrates': nutrition.Carbs,
            'Insoluble Fiber': nutrition.Fiber,
            'Total Sugars': nutrition.Sugars
        },
        lipids: {
            'Total Fat': nutrition.Fat,
            'Saturated Fat': nutrition.SaturatedFat
        },
        proteins_and_aminos: {
            'Total Protein': nutrition.Protein
        },
        minerals: {
            Sodium: Math.round((nutrition.Salt / 2.5) * 1000)
        }
    });

    if (matched) {
        const baseProtein = matched.proteins_and_aminos['Total Protein'] ?? 0;
        const proteinRatio = baseProtein > 0 ? nutrition.Protein / baseProtein : 1;

        const categories = ['vitamins', 'minerals', 'proteins_and_aminos', 'cellular_bioactives'] as const;
        categories.forEach(cat => {
            for (const [key, baseVal] of Object.entries(matched[cat])) {
                if (newFood[cat][key] === 0 || newFood[cat][key] === undefined) {
                    newFood[cat][key] = parseFloat((baseVal * proteinRatio).toFixed(2));
                }
            }
        });

        newFood.absorption = { ...matched.absorption };
    }

    return {
        foodDef: newFood,
        ingredients,
        nutritionPer100g: nutrition,
        matchedBaseFoodName: matched?.displayName ?? null
    };
}
