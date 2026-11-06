// src/groceryParser.js
import { createFood } from './schema.js';
import { FOOD_DATABASE } from './foods.js';

function parseSwedishFloat(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = val.toString().replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Extracts clean ingredients by discarding noise (temperatures, storage, origins)
 */
export function parseIngredients(rawText) {
    if (!rawText) return [];

    // Find the ingredient section and stop at metadata keywords
    const ingBlockMatch = rawText.match(
        /(?:Ingredienser|Innehåll)[:\s]*([\s\S]*?)(?=(?:\r?\n\s*(?:Förvaring|Ursprung|Lägsta|Högsta|Tillverkningsland|Näringsvärde|Näringsdeklaration|Hållbarhet|Bäst före|Serveringsförslag)|$))/i
    );

    const targetText = ingBlockMatch ? ingBlockMatch[1] : rawText;

    // Remove any trailing period and split into distinct ingredient parts
    const cleanText = targetText.replace(/\.\s*$/, '').trim();
    const parts = cleanText.split(/[,•;]/);
    const results = [];
    const percentRegex = /([a-zA-ZåäöÅÄÖ\s\(\)\-]+?)\s*(\d+(?:[.,]\d+)?)\s*%/;

    for (const part of parts) {
        const trimmed = part.trim();
        // Ignore noise lines that got caught
        if (!trimmed || /^(förvaring|kylskåp|frys|ursprung|lägsta|högsta)/i.test(trimmed)) continue;

        const match = trimmed.match(percentRegex);
        if (match) {
            results.push({
                name: match[1].trim(),
                percent: parseSwedishFloat(match[2])
            });
        } else if (trimmed.length > 1) {
            results.push({
                name: trimmed,
                percent: null
            });
        }
    }
    return results;
}

/**
 * Robust nutrition parser that handles both line-breaks and tab-separated table copies
 */
export function parseNutritionDeclaration(text) {
    const raw = text.replace(/&nbsp;/g, ' ');

    const findMatch = (regex) => {
        const m = raw.match(regex);
        return m ? parseSwedishFloat(m[1]) : 0;
    };

    return {
        Calories: findMatch(/Energi\s*(?:\(kcal\))?[:\s\t]+(\d+(?:[.,]\d+)?)\s*kcal/i) ||
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

/**
 * Searches the local database for an existing base food to borrow rich micronutrients
 */
function findMatchingBaseFood(title, ingredients) {
    const searchTokens = [
        title.toLowerCase(),
        ...ingredients.map(i => i.name.toLowerCase())
    ];

    for (const [key, food] of Object.entries(FOOD_DATABASE)) {
        const foodAliases = [key.toLowerCase(), food.displayName.toLowerCase(), ...(food.aliases || [])];

        for (const token of searchTokens) {
            if (foodAliases.some(alias => token.includes(alias) || alias.includes(token))) {
                return food;
            }
        }
    }
    return null;
}

/**
 * Extracts title, ingredients, and nutrition, and dynamically synthesizes the food profile
 */
export function extractProductFromText(rawInput, sourceHint = '') {
    // 1. Dynamic Title Extraction
    let lines = rawInput.split('\n').map(l => l.trim()).filter(Boolean);
    let title = '';

    // If first line isn't a known label like "Ingredienser", it's the product title
    if (lines.length > 0 && !/^(ingredienser|näringsvärde|näringsdeklaration)/i.test(lines[0])) {
        title = lines[0];
    } else {
        title = sourceHint.replace(/^https?:\/\/[^\/]+\//, '').split('/')[0] || 'Imported Food';
    }

    const ingredients = parseIngredients(rawInput);
    const nutrition = parseNutritionDeclaration(rawInput);

    // 2. Check for base food match (e.g. "Kyckling" -> matches "chicken")
    const matchedBaseFood = findMatchingBaseFood(title, ingredients);

    // 3. Build a fully populated profile
    const foodId = 'prod_' + Math.random().toString(36).substring(2, 9);

    // Start with empty schema
    const newFood = createFood({
        id: foodId,
        displayName: title,
        aliases: [title.toLowerCase()],
        insights: {
            family: matchedBaseFood ? `${matchedBaseFood.insights?.family || 'Matched Food'} (Calibrated)` : 'Imported Food',
            tags: matchedBaseFood ? [...(matchedBaseFood.insights?.tags || []), 'Label Verified'] : ['Package Verified'],
            superpower: matchedBaseFood
                ? `Micronutrients mapped from ${matchedBaseFood.displayName}. Package macros verified.`
                : 'Custom verified package macronutrient declaration.',
            nuance: 'Official declared values per 100g.',
            prepTip: 'Scaled dynamically to target weight.'
        },
        general: {
            Calories: nutrition.Calories,
            Water: Math.max(0, 100 - (nutrition.Protein + nutrition.Fat + nutrition.Carbs + nutrition.Fiber + nutrition.Salt))
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

    // 4. If base food matched, synthesize micronutrients scaled by the package macro ratio
    if (matchedBaseFood) {
        const proteinRatio = matchedBaseFood.proteins_and_aminos['Total Protein'] > 0
            ? nutrition.Protein / matchedBaseFood.proteins_and_aminos['Total Protein']
            : 1;

        // Carry over vitamins, minerals, aminos scaled to real package protein
        ['vitamins', 'minerals', 'proteins_and_aminos', 'cellular_bioactives'].forEach(cat => {
            if (matchedBaseFood[cat]) {
                for (const [key, baseVal] of Object.entries(matchedBaseFood[cat])) {
                    if (newFood[cat][key] === 0 || newFood[cat][key] === undefined) {
                        newFood[cat][key] = parseFloat((baseVal * proteinRatio).toFixed(2));
                    }
                }
            }
        });

        // Copy absorption data
        if (matchedBaseFood.absorption) {
            newFood.absorption = { ...matchedBaseFood.absorption };
        }
    }

    return {
        foodDef: newFood,
        ingredients,
        nutritionPer100g: nutrition,
        matchedBaseFoodName: matchedBaseFood?.displayName || null
    };
}