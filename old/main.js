import { RDA_TARGETS, UL_TARGETS, NUTRIENT_UNITS } from './schema.js';
import { FOOD_DATABASE } from './foods.js';


// Add to src/main.js (replacing previous import handlers)
import { extractProductFromText } from './groceryParser.js';

const urlModal = document.getElementById('url-import-modal');
const openUrlModalBtn = document.getElementById('open-url-import-btn');
const importUrlInput = document.getElementById('import-url-input');
const fetchUrlBtn = document.getElementById('fetch-url-btn');
const botWarning = document.getElementById('bot-blocked-warning');

const tabImportUrl = document.getElementById('tab-import-url');
const tabImportText = document.getElementById('tab-import-text');
const sectionUrl = document.getElementById('import-url-section');
const sectionText = document.getElementById('import-text-section');
const textInput = document.getElementById('import-text-input');
const parseTextBtn = document.getElementById('parse-text-btn');

const previewBox = document.getElementById('import-preview-box');
const previewTitle = document.getElementById('import-preview-title');
const previewMatchedBadge = document.getElementById('import-matched-badge');
const previewIngredientsWrapper = document.getElementById('preview-ingredients-wrapper');
const previewIngredients = document.getElementById('import-preview-ingredients');
const previewMacros = document.getElementById('import-preview-macros');
const importAmountInput = document.getElementById('import-amount-input');
const confirmImportBtn = document.getElementById('confirm-import-btn');

let parsedImportResult = null;

// Clean Tab Switching
tabImportUrl?.addEventListener('click', () => {
    tabImportUrl.classList.add('active');
    tabImportText.classList.remove('active');
    sectionUrl.classList.remove('hidden');
    sectionText.classList.add('hidden');
});

tabImportText?.addEventListener('click', () => {
    tabImportText.classList.add('active');
    tabImportUrl.classList.remove('active');
    sectionText.classList.remove('hidden');
    sectionUrl.classList.add('hidden');
});

openUrlModalBtn?.addEventListener('click', () => {
    modalBackdrop.classList.remove('hidden');
    urlModal.classList.remove('hidden');
    botWarning.classList.add('hidden');
    previewBox.classList.add('hidden');
    if (confirmImportBtn) confirmImportBtn.disabled = true;
    if (textInput) textInput.value = '';
    if (importUrlInput) importUrlInput.value = '';
});

// Real-time Macro & Ingredient Scaler
function updateScaledPreview() {
    if (!parsedImportResult) return;

    const targetGrams = parseFloat(importAmountInput?.value) || 0;
    const factor = targetGrams / 100; // Package nutrition is per 100g
    const m = parsedImportResult.nutritionPer100g;

    // Scale Macros
    const cals = Math.round(m.Calories * factor);
    const prot = (m.Protein * factor).toFixed(1);
    const carbs = (m.Carbs * factor).toFixed(1);
    const fat = (m.Fat * factor).toFixed(1);
    const fiber = (m.Fiber * factor).toFixed(1);

    if (previewMacros) {
        previewMacros.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 2px;">Total for ${targetGrams}g:</div>
            <div>
                <strong>${cals}</strong> kcal • 
                Protein: <strong>${prot}g</strong> • 
                Carbs: <strong>${carbs}g</strong> • 
                Fat: <strong>${fat}g</strong> • 
                Fiber: <strong>${fiber}g</strong>
            </div>
        `;
    }

    // Scale Sub-Ingredients (if percentages exist)
    if (parsedImportResult.ingredients.length > 0) {
        previewIngredientsWrapper.classList.remove('hidden');
        previewIngredients.innerHTML = '';
        parsedImportResult.ingredients.forEach(ing => {
            const badge = document.createElement('span');
            badge.className = 'ingredient-pill';
            const ingGrams = ing.percent ? Math.round((ing.percent / 100) * targetGrams) : null;
            badge.textContent = `${ing.name}${ing.percent ? ` (${ing.percent}% → ${ingGrams}g)` : ''}`;
            previewIngredients.appendChild(badge);
        });
    } else {
        previewIngredientsWrapper.classList.add('hidden');
    }
}

function displayParsedProduct(result) {
    parsedImportResult = result;
    if (previewTitle) previewTitle.textContent = result.foodDef.displayName;

    if (previewMatchedBadge) {
        if (result.matchedBaseFoodName) {
            previewMatchedBadge.textContent = `⚡ Synced with ${result.matchedBaseFoodName} micros`;
            previewMatchedBadge.classList.remove('hidden');
        } else {
            previewMatchedBadge.classList.add('hidden');
        }
    }

    updateScaledPreview();
    previewBox.classList.remove('hidden');
    if (confirmImportBtn) confirmImportBtn.disabled = false;
}

// Live update when portion weight changes
importAmountInput?.addEventListener('input', updateScaledPreview);

// 1. Text Parse Action
parseTextBtn?.addEventListener('click', () => {
    const raw = textInput?.value.trim();
    if (!raw) return alert('Please paste some text first.');
    const parsed = extractProductFromText(raw, 'Pasted Product');
    displayParsedProduct(parsed);
});

// 2. Fetch URL Action
fetchUrlBtn?.addEventListener('click', async () => {
    const rawUrl = importUrlInput?.value.trim();
    if (!rawUrl) return alert('Please enter a URL.');

    fetchUrlBtn.textContent = 'Fetching...';
    fetchUrlBtn.disabled = true;
    botWarning.classList.add('hidden');

    try {
        const proxyUrl = `/api/proxy-scrape?url=${encodeURIComponent(rawUrl)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const parsed = extractProductFromText(html, rawUrl);
        displayParsedProduct(parsed);
    } catch (err) {
        botWarning.classList.remove('hidden');
    } finally {
        fetchUrlBtn.textContent = 'Fetch';
        fetchUrlBtn.disabled = false;
    }
});

// 3. Confirm and Add
confirmImportBtn?.addEventListener('click', () => {
    if (!parsedImportResult) return;

    const amountGrams = parseFloat(importAmountInput?.value) || 100;
    const foodDef = parsedImportResult.foodDef;

    // Register into active database
    FOOD_DATABASE[foodDef.id] = foodDef;

    const day = getCurrentDayData();
    day.unassigned.push({
        id: Date.now() + Math.random(),
        foodKey: foodDef.id,
        amount: amountGrams,
        displayName: foodDef.displayName
    });

    persistActiveWeek();
    renderDietList();
    renderNutritionPanel();
    closeModal();
    showToast(`Added ${foodDef.displayName} (${amountGrams}g)`);
});
/* ==========================================================================
   1. APPLICATION STATE & CONFIGURATION
   ========================================================================== */

/* ==========================================================================
   1. APPLICATION STATE & CONFIGURATION
   ========================================================================== */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const leftColumnLayout = [
    'general',
    'carbohydrates',
    'lipids',
    'proteins_and_aminos',
    'organic_acids',
    'antinutrients',
    'biogenic_amines'
];

const rightColumnLayout = [
    'vitamins',
    'minerals',
    'cellular_bioactives',
    'antioxidants',
    'myconutrients_and_adaptogens',
    'bioactive_enzymes',
    'nucleic_acids_and_purines'
];

const state = {
    currentDay: 'Mon',
    weekData: {
        Mon: { unassigned: [], meals: [] },
        Tue: { unassigned: [], meals: [] },
        Wed: { unassigned: [], meals: [] },
        Thu: { unassigned: [], meals: [] },
        Fri: { unassigned: [], meals: [] },
        Sat: { unassigned: [], meals: [] },
        Sun: { unassigned: [], meals: [] }
    },
    selectedMealId: null, // Selected meal ID or 'quick_log'
    selectedFoodId: null, // Selected individual food ID
    hoveredMealId: null,
    hoveredFood: null,
    allCollapsed: true,
    collapsedCategories: {},
    expandedNutrient: null,
    mode: 'diet',
    compareSlots: [
        { id: 'slot1', parsed: null, color: '#0072b2', displayName: 'Item A' },
        { id: 'slot2', parsed: null, color: '#e69f00', displayName: 'Item B' }
    ]
};

// Auto-load saved week on startup so refresh never loses data
const autoSavedWeek = localStorage.getItem('open_nutrition_active_week');
if (autoSavedWeek) {
    try {
        state.weekData = JSON.parse(autoSavedWeek);
    } catch (e) {}
}

function persistActiveWeek() {
    try {
        localStorage.setItem('open_nutrition_active_week', JSON.stringify(state.weekData));
    } catch (e) {}
}
// Now safe to initialize because the layout arrays are declared above
[...leftColumnLayout, ...rightColumnLayout].forEach(cat => {
    state.collapsedCategories[cat] = true;
});

// Replace CATEGORY_ICONS with sleek, minimalist SVG icons
const CATEGORY_ICONS = {
    general: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    lipids: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    proteins_and_aminos: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 8.5l7 7"/></svg>`,
    vitamins: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
    minerals: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 18 3 21 9 12 22 3 9 6 3"/></svg>`,
    carbohydrates: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    cellular_bioactives: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    antioxidants: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    antinutrients: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    biogenic_amines: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2v6a2 2 0 0 0 2 2h6"/><path d="M4 12V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"/></svg>`,
    myconutrients_and_adaptogens: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9z"/><path d="M10 12v7a2 2 0 0 0 4 0v-7"/></svg>`,
    bioactive_enzymes: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
    nucleic_acids_and_purines: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M7 7l5 5-5 5M17 7l-5 5 5 5"/></svg>`,
    organic_acids: `<svg class="cat-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`
};

const CATEGORY_NAMES = {
    general: 'General',
    lipids: 'Lipids & Fats',
    proteins_and_aminos: 'Proteins & Amino Acids',
    vitamins: 'Vitamins',
    minerals: 'Minerals',
    carbohydrates: 'Carbohydrates',
    cellular_bioactives: 'Cellular Bioactives',
    antioxidants: 'Antioxidants & Polyphenols',
    antinutrients: 'Antinutrients',
    biogenic_amines: 'Biogenic Amines',
    myconutrients_and_adaptogens: 'Myconutrients & Adaptogens',
    bioactive_enzymes: 'Bioactive Enzymes',
    nucleic_acids_and_purines: 'Nucleic Acids & Purines',
    organic_acids: 'Organic Acids'
};

const UNIT_CONVERSIONS = {
    g: { toGrams: 1, label: 'g', presets: [50, 100, 150, 200, 250, 500, 750, 1000] },
    kg: { toGrams: 1000, label: 'kg', presets: [0.1, 0.2, 0.25, 0.5, 0.75, 1.0] },
    mg: { toGrams: 0.001, label: 'mg', presets: [250, 500, 1000, 2000] },
    oz: { toGrams: 28.3495231, label: 'oz', presets: [2, 4, 6, 8, 10, 12, 16] },
    lbs: { toGrams: 453.59237, label: 'lbs', presets: [0.25, 0.5, 0.75, 1.0, 1.5, 2.0] }
};

/* ==========================================================================
   2. CENTRALIZED NUTRITION ANALYTICS
   ========================================================================== */

const NUTRIENT_ANALYTICS = {
    Calories: {
        description: `Food provides the energy needed for cells to sustain physiological homeostasis. Energy is stored in chemical bonds and released via digestion and cellular respiration.\n\nAverage energy density:\n• Fat: 9 kcal/g (37.7 kJ/g)\n• Carbohydrates: 4 kcal/g (16.7 kJ/g)\n• Protein: 4 kcal/g (16.7 kJ/g)\n• Alcohol: 7 kcal/g (29.3 kJ/g)`,
        sourcesTitleLeft: 'Highest Calories',
        sourcesLeft: [
            { food: 'Olive Oil', amount: '884 kcal' },
            { food: 'Almonds', amount: '579 kcal' },
            { food: 'Peanut Butter', amount: '588 kcal' },
            { food: 'Cheddar Cheese', amount: '403 kcal' },
            { food: 'Ribeye Steak', amount: '291 kcal' },
            { food: 'Wild Salmon', amount: '206 kcal' }
        ],
        sourcesTitleRight: 'Lowest Calories',
        sourcesRight: [
            { food: 'Zucchini', amount: '17 kcal' },
            { food: 'Asparagus', amount: '20 kcal' },
            { food: 'Spinach', amount: '23 kcal' },
            { food: 'Cabbage', amount: '25 kcal' },
            { food: 'Strawberries', amount: '32 kcal' },
            { food: 'Broccoli', amount: '34 kcal' }
        ]
    },
    'Vitamin B1 (Thiamine)': {
        description: `Thiamine is a water-soluble coenzyme essential for pyruvate dehydrogenase, the gateway enzyme linking glycolysis to the Krebs cycle. Critical for ATP production and central nervous system integrity.`,
        sourcesTitleLeft: 'Top Dietary Sources (per 100g)',
        sourcesLeft: [
            { food: 'Nutritional Yeast', amount: '15.00 mg' },
            { food: 'Sunflower Seeds', amount: '2.30 mg' },
            { food: 'Macadamia Nuts', amount: '1.20 mg' },
            { food: 'Pork Chops', amount: '0.90 mg' },
            { food: 'Lentils', amount: '0.35 mg' }
        ]
    },
    'Vitamin B2 (Riboflavin)': {
        description: `Precursor to FAD and FMN, vital coenzymes in the mitochondrial electron transport chain. Integral to glutathione reduction, lipid catabolism, and cellular protection against oxidative stress.`,
        sourcesTitleLeft: 'Top Dietary Sources (per 100g)',
        sourcesLeft: [
            { food: 'Nutritional Yeast', amount: '4.00 mg' },
            { food: 'Beef Liver', amount: '2.70 mg' },
            { food: 'Almonds', amount: '1.10 mg' },
            { food: 'Whole Eggs', amount: '0.45 mg' },
            { food: 'Wild Salmon', amount: '0.35 mg' }
        ]
    },
    'Vitamin B3 (Niacin)': {
        description: `Fundamental precursor to NAD+ and NADP+, the primary electron carriers for metabolic redox reactions, sirtuin longevity enzyme activation, and PARP-mediated DNA damage repair.`,
        sourcesTitleLeft: 'Top Dietary Sources (per 100g)',
        sourcesLeft: [
            { food: 'Nutritional Yeast', amount: '35.00 mg' },
            { food: 'Yellowfin Tuna', amount: '18.00 mg' },
            { food: 'Chicken Breast', amount: '14.80 mg' },
            { food: 'Beef Liver', amount: '13.20 mg' },
            { food: 'Peanuts', amount: '12.00 mg' }
        ]
    },
    'Vitamin B5 (Pantothenic Acid)': {
        description: `The structural core required to synthesize Coenzyme A (CoA) and Acyl Carrier Protein (ACP). Directly regulates fatty acid β-oxidation, cholesterol synthesis, and acetylcholine formation.`,
        sourcesTitleLeft: 'Top Dietary Sources (per 100g)',
        sourcesLeft: [
            { food: 'Shiitake Mushrooms', amount: '7.60 mg' },
            { food: 'Sunflower Seeds', amount: '7.00 mg' },
            { food: 'Beef Liver', amount: '6.30 mg' },
            { food: 'Wild Salmon', amount: '1.70 mg' },
            { food: 'Avocado', amount: '1.40 mg' }
        ]
    },
    'Vitamin B6': {
        description: `Cofactor for more than 100 transaminase and decarboxylase enzymes. Essential for heme synthesis, glycogen breakdown, and the biosyntheses of serotonin, dopamine, and GABA.`,
        sourcesTitleLeft: 'Top Dietary Sources (per 100g)',
        sourcesLeft: [
            { food: 'Sunflower Seeds', amount: '1.30 mg' },
            { food: 'Pistachios', amount: '1.10 mg' },
            { food: 'Wild Salmon', amount: '0.90 mg' },
            { food: 'Grass-Fed Beef', amount: '0.70 mg' },
            { food: 'Yellowfin Tuna', amount: '0.60 mg' }
        ]
    },
    'Vitamin B7 (Biotin)': {
        description: `A prosthetic group for 5 carboxylases regulating gluconeogenesis, fatty acid elongation, and branched-chain amino acid metabolism. Important for keratin and gene transcription.`,
        sourcesTitleLeft: 'Top Dietary Sources (per 100g)',
        sourcesLeft: [
            { food: 'Whole Eggs', amount: '20.00 mcg' },
            { food: 'Nutritional Yeast', amount: '15.00 mcg' },
            { food: 'Beef Liver', amount: '15.00 mcg' },
            { food: 'Peanuts', amount: '10.00 mcg' },
            { food: 'Almonds', amount: '7.00 mcg' }
        ]
    },
    'Vitamin B9 (Folate DFE)': {
        description: `Critical 1-carbon unit donor in the methionine/homocysteine cycle, purine/pyrimidine DNA synthesis, and cellular epigenetic methylation.`,
        sourcesTitleLeft: 'Top Dietary Sources (per 100g)',
        sourcesLeft: [
            { food: 'Beef Liver', amount: '290.00 mcg' },
            { food: 'Spinach', amount: '194.00 mcg' },
            { food: 'Lentils', amount: '181.00 mcg' },
            { food: 'Asparagus', amount: '149.00 mcg' },
            { food: 'Black Beans', amount: '130.00 mcg' }
        ]
    },
    'Vitamin B12': {
        description: `Cobalt-containing corrinoid cofactor essential for methionine synthase and methylmalonyl-CoA mutase. Required for neurological myelin stability and erythrocyte maturation.`,
        sourcesTitleLeft: 'Top Dietary Sources (per 100g)',
        sourcesLeft: [
            { food: 'Clams', amount: '99.00 mcg' },
            { food: 'Beef Liver', amount: '59.00 mcg' },
            { food: 'Sardines', amount: '9.00 mcg' },
            { food: 'Mackerel', amount: '8.00 mcg' },
            { food: 'Wild Salmon', amount: '3.20 mcg' }
        ]
    }
};

/* ==========================================================================
   3. CALCULATIONS, AGGREGATION & MULTI-UNIT FORMATTER
   ========================================================================== */

function getNutrientValue(item, category, nutrient) {
    if (!item || !item.foodKey || !FOOD_DATABASE[item.foodKey]) return 0;
    const baseValue = FOOD_DATABASE[item.foodKey][category]?.[nutrient];
    return baseValue ? baseValue * (item.amount / 100) : 0;
}

function calculateAggregate(dietList) {
    const totals = {};
    for (const [category, compounds] of Object.entries(NUTRIENT_UNITS)) {
        totals[category] = {};
        for (const compound of Object.keys(compounds)) {
            totals[category][compound] = 0;
            totals[category][`${compound}_absorbed`] = 0;
        }
    }

    if (!Array.isArray(dietList)) return totals;

    dietList.forEach(item => {
        if (!item || !item.foodKey) return;
        const foodDef = FOOD_DATABASE[item.foodKey];
        const absorptionMap = foodDef?.absorption || {};

        for (const category of Object.keys(NUTRIENT_UNITS)) {
            for (const compound of Object.keys(NUTRIENT_UNITS[category])) {
                const rawVal = getNutrientValue(item, category, compound);
                const absorptionRate = absorptionMap[compound] !== undefined ? absorptionMap[compound] : 1.0;

                totals[category][compound] += rawVal;
                totals[category][`${compound}_absorbed`] += rawVal * absorptionRate;
            }
        }
    });

    return totals;
}

function getCurrentDayData() {
    return state.weekData[state.currentDay] || { unassigned: [], meals: [] };
}

function getAllCurrentDayItems() {
    const day = getCurrentDayData();
    const mealItems = day.meals.flatMap(m => m.items);
    return [...day.unassigned, ...mealItems];
}

function getActiveContext() {
    const day = getCurrentDayData();
    const allItems = getAllCurrentDayItems();

    // 1. Single food hovered
    if (state.hoveredFood) {
        return { items: [state.hoveredFood], label: `Preview: ${state.hoveredFood.displayName}` };
    }

    // 2. Single food locked (inside any meal or quick log)
    if (state.selectedFoodId) {
        const item = allItems.find(i => i.id === state.selectedFoodId);
        if (item) return { items: [item], label: `Locked: ${item.displayName}` };
    }

    // 3. Meal hovered
    if (state.hoveredMealId) {
        const meal = day.meals.find(m => m.id === state.hoveredMealId);
        if (meal) return { items: meal.items, label: `Preview: ${meal.name}` };
    }

    // 4. Meal or Quick Log locked
    if (state.selectedMealId) {
        if (state.selectedMealId === 'quick_log') {
            return { items: day.unassigned, label: 'Locked: Quick Log' };
        }
        const meal = day.meals.find(m => m.id === state.selectedMealId);
        if (meal) return { items: meal.items, label: `Locked: ${meal.name}` };
    }

    // 5. Total Day Summary
    return {
        items: allItems,
        label: `${state.currentDay} Summary (${allItems.length} foods)`
    };
}

function getCategoryProgress(category, activeData) {
    if (!activeData || activeData.isCompare) return null;

    const nutrients = NUTRIENT_UNITS[category];
    if (!nutrients) return 0;

    let totalTargeted = 0;
    let sumPercentage = 0;

    for (const [nutrientName, meta] of Object.entries(nutrients)) {
        if (meta.isSubheader || meta.noTarget) continue;

        const rdaTarget = RDA_TARGETS[category]?.[nutrientName] || 0;
        if (rdaTarget <= 0) continue;

        const rawVal = activeData[category]?.[nutrientName] || 0;
        const nutrientPercent = Math.min(100, (rawVal / rdaTarget) * 100);

        sumPercentage += nutrientPercent;
        totalTargeted++;
    }

    if (totalTargeted === 0) return null;
    return Math.round(sumPercentage / totalTargeted);
}

function formatMultiUnits(grams) {
    const g = Math.round(grams);
    const oz = (grams / 28.3495231).toFixed(2);
    const lbs = (grams / 453.59237).toFixed(2);
    return `${g}g / ${oz}oz / ${lbs} pounds`;
}

/* ==========================================================================
   4. VISUAL METERS & CALIBRATED SCALES
   ========================================================================== */

function createRdaUlMeter(category, nutrientName, currentValue, rdaTarget, ulTarget, unit) {
    const rda = rdaTarget || 0;
    const ul = ulTarget || rda * 1.5;
    const maxScale = ul * 1.35;

    const rdaPercent = (rda / maxScale) * 100;
    const ulPercent = (ul / maxScale) * 100;
    const markerPercent = Math.min(100, (currentValue / maxScale) * 100);

    const gradientFill = `linear-gradient(to right, #78909c 0%, #78909c ${rdaPercent}%, #2ecc71 ${rdaPercent}%, #2ecc71 ${ulPercent}%, #e67e22 ${ulPercent}%, #e67e22 100%)`;

    return `
        <div class="detailed-meter-container">
            <div class="meter-labels-top">
                ${ulTarget > 0 ? `<span class="ul-label" style="left: ${ulPercent}%">UL: ${ulTarget} ${unit}</span>` : ''}
            </div>
            <div class="meter-bar-wrapper">
                <div class="meter-marker" style="left: ${markerPercent}%">▼</div>
                <div class="meter-bar" style="background: ${gradientFill}">
                    <div class="meter-tick zero" style="left: 0%"></div>
                    ${rda > 0 ? `<div class="meter-tick rda" style="left: ${rdaPercent}%"></div>` : ''}
                    ${ulTarget > 0 ? `<div class="meter-tick ul" style="left: ${ulPercent}%"></div>` : ''}
                </div>
            </div>
            <div class="meter-labels-bottom">
                <span class="zero-label" style="left: 0%">0</span>
                ${rda > 0 ? `<span class="rda-label" style="left: ${rdaPercent}%">RDA: ${rda} ${unit}</span>` : ''}
            </div>
        </div>
    `;
}

function createCompareSlotMeter(label, currentValue, rdaTarget, ulTarget, unit, color) {
    const rda = rdaTarget || 0;
    const ul = ulTarget || rda * 1.5;
    const maxScale = ul * 1.35;

    const rdaPercent = (rda / maxScale) * 100;
    const ulPercent = (ul / maxScale) * 100;
    const markerPercent = Math.min(100, (currentValue / maxScale) * 100);

    const gradientFill = `linear-gradient(to right, #78909c 0%, #78909c ${rdaPercent}%, ${color} ${rdaPercent}%, ${color} ${ulPercent}%, #e67e22 ${ulPercent}%, #e67e22 100%)`;

    return `
        <div class="detailed-meter-container compare-slot-meter">
            <div class="meter-labels-top">
                <span class="compare-slot-label" style="left: 0; transform: none; font-weight: bold; color: ${color};">
                    ${label} (${currentValue % 1 === 0 ? currentValue : currentValue.toFixed(2)} ${unit})
                </span>
                ${ulTarget > 0 ? `<span class="ul-label" style="left: ${ulPercent}%">UL: ${ulTarget} ${unit}</span>` : ''}
            </div>
            <div class="meter-bar-wrapper">
                <div class="meter-marker" style="left: ${markerPercent}%">▼</div>
                <div class="meter-bar" style="background: ${gradientFill}">
                    <div class="meter-tick zero" style="left: 0%"></div>
                    ${rda > 0 ? `<div class="meter-tick rda" style="left: ${rdaPercent}%"></div>` : ''}
                    ${ulTarget > 0 ? `<div class="meter-tick ul" style="left: ${ulPercent}%"></div>` : ''}
                </div>
            </div>
            <div class="meter-labels-bottom">
                <span class="zero-label" style="left: 0%">0</span>
                ${rda > 0 ? `<span class="rda-label" style="left: ${rdaPercent}%">RDA: ${rda} ${unit}</span>` : ''}
            </div>
        </div>
    `;
}

function getNutrientAnalysisHTML(category, nutrientName, currentValue, rdaTarget, ulTarget, unit) {
    const details = NUTRIENT_ANALYTICS[nutrientName] || {
        description: `${nutrientName} is a biochemically active compound vital for enzymatic regulation, cellular transport, and structural integrity.`,
        sourcesTitleLeft: 'Highest Sources',
        sourcesLeft: [
            { food: 'Primary Food Source A', amount: 'High' },
            { food: 'Primary Food Source B', amount: 'Moderate' }
        ]
    };

    const scaleHtml = createRdaUlMeter(category, nutrientName, currentValue, rdaTarget, ulTarget, unit);
    const leftTitle = details.sourcesTitleLeft || 'Highest Sources';
    const rightTitle = details.sourcesTitleRight || '';

    const sourcesHtml = details.sourcesRight
        ? `
            <div class="sources-container">
                <div class="sources-list">
                    <h5>${leftTitle}</h5>
                    ${details.sourcesLeft.map(s => `<div class="source-item"><span>${s.food}</span><span>${s.amount}</span></div>`).join('')}
                </div>
                <div class="sources-list">
                    <h5>${rightTitle}</h5>
                    ${details.sourcesRight.map(s => `<div class="source-item"><span>${s.food}</span><span>${s.amount}</span></div>`).join('')}
                </div>
            </div>
        `
        : `
            <div class="sources-container single-column">
                <div class="sources-list">
                    <h5>${leftTitle}</h5>
                    ${details.sourcesLeft.map(s => `<div class="source-item"><span>${s.food}</span><span>${s.amount}</span></div>`).join('')}
                </div>
            </div>
        `;

    return `
        <div class="nutrient-details-panel">
            <h4>${nutrientName} Analysis</h4>
            ${scaleHtml}
            <p class="detail-description">${details.description}</p>
            ${sourcesHtml}
        </div>
    `;
}

function getNutrientAnalysisCompareHTML(
    category,
    nutrientName,
    val1,
    val2,
    rdaTarget,
    ulTarget,
    unit,
    col1,
    col2,
    label1,
    label2
) {
    const details = NUTRIENT_ANALYTICS[nutrientName] || {
        description: `${nutrientName} comparison across loaded dietary inputs.`,
        sourcesTitleLeft: 'Highest Sources',
        sourcesLeft: [{ food: 'Dietary Source', amount: 'Reference' }]
    };

    const meter1Html = createCompareSlotMeter(label1, val1, rdaTarget, ulTarget, unit, col1);
    const meter2Html = createCompareSlotMeter(label2, val2, rdaTarget, ulTarget, unit, col2);

    return `
        <div class="nutrient-details-panel">
            <h4>${nutrientName} Comparison</h4>
            <div class="compare-meters-wrapper">
                ${meter1Html}
                ${meter2Html}
            </div>
            <p class="detail-description">${details.description}</p>
        </div>
    `;
}

/* ==========================================================================
   5. CATEGORY CARD GENERATION
   ========================================================================== */

function createCategoryCard(category, activeData) {
    const nutrients = NUTRIENT_UNITS[category];
    if (!nutrients) return null;

    const catEl = document.createElement('div');
    const isCollapsed = state.collapsedCategories[category] || false;
    const isLimitCategory = category === 'antinutrients' || category === 'biogenic_amines';
    catEl.className = `nutrient-category ${isLimitCategory ? 'limit-category' : ''} ${isCollapsed ? 'collapsed' : ''}`;

    const displayTitle = CATEGORY_NAMES[category] || category.replace(/_/g, ' ');
    const iconSvg = CATEGORY_ICONS[category] || '';

    let progress1 = null;
    let progress2 = null;
    const col1 = state.compareSlots[0].color;
    const col2 = state.compareSlots[1].color;

    const progressLabel =
        activeData && activeData.isCompare
            ? (() => {
                  progress1 = getCategoryProgress(category, activeData.slot1);
                  progress2 = getCategoryProgress(category, activeData.slot2);
                  const p1Str = progress1 !== null ? `${progress1}%` : '0%';
                  const p2Str = progress2 !== null ? `${progress2}%` : '0%';
                  return `<span style="color: ${col1}; font-size: 11px;">(${p1Str})</span> <span style="font-size: 10px; color: #aaa;">vs</span> <span style="color: ${col2}; font-size: 11px;">(${p2Str})</span>`;
              })()
            : (() => {
                  const progress = getCategoryProgress(category, activeData);
                  return progress !== null ? `(${progress}%)` : '';
              })();

    const headerEl = document.createElement('h3');
    headerEl.innerHTML = `
    <span class="cat-title-left">
        ${iconSvg}
        <span>${displayTitle}</span>
        ${progressLabel ? `<span class="cat-progress-badge">${progressLabel}</span>` : ''}
    </span>
    <span class="toggle-icon">▼</span>
`;
    catEl.appendChild(headerEl);

    const progressContainer = document.createElement('div');
    if (activeData && activeData.isCompare) {
        progressContainer.className = 'category-progress-bar compare-category-bar';
        progressContainer.innerHTML = `
            <div class="category-progress-bar" style="margin: 0; height: 3px;">
                <div class="category-progress-fill" style="width: ${progress1 || 0}%; background-color: ${col1};"></div>
            </div>
            <div class="category-progress-bar" style="margin: 0; height: 3px;">
                <div class="category-progress-fill" style="width: ${progress2 || 0}%; background-color: ${col2};"></div>
            </div>
        `;
    } else {
        progressContainer.className = 'category-progress-bar';
        const progress = getCategoryProgress(category, activeData);
        progressContainer.innerHTML = `<div class="category-progress-fill" style="width: ${progress !== null ? progress : 100}%"></div>`;
    }
    catEl.appendChild(progressContainer);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = `category-content ${isCollapsed ? 'hidden' : ''}`;

    if (!isCollapsed) {
        for (const [nutrientName, meta] of Object.entries(nutrients)) {
            if (meta.isSubheader) {
                const subheaderRow = document.createElement('div');
                subheaderRow.className = 'nutrient-row subheader';
                subheaderRow.innerHTML = `<span>${meta.label}</span>`;
                contentWrapper.appendChild(subheaderRow);
                continue;
            }

            const unit = meta.unit;
            const rdaTarget = RDA_TARGETS[category]?.[nutrientName] || 0;
            const ulTarget = UL_TARGETS[category]?.[nutrientName] || 0;

            const row = document.createElement('div');
            const indentClass = meta.indent ? `indent-${meta.indent}` : '';
            row.className = `nutrient-row clickable-row ${indentClass}`;

            if (activeData && activeData.isCompare) {
                const rawVal1 = activeData.slot1[category]?.[nutrientName] || 0;
                const rawVal2 = activeData.slot2[category]?.[nutrientName] || 0;
                const rawAbs1 = activeData.slot1[category]?.[`${nutrientName}_absorbed`] || 0;
                const rawAbs2 = activeData.slot2[category]?.[`${nutrientName}_absorbed`] || 0;

                const displayAbs1 = rawAbs1 % 1 === 0 ? rawAbs1 : rawAbs1.toFixed(2);
                const displayAbs2 = rawAbs2 % 1 === 0 ? rawAbs2 : rawAbs2.toFixed(2);
                const displayVal1 = rawVal1 % 1 === 0 ? rawVal1 : rawVal1.toFixed(2);
                const displayVal2 = rawVal2 % 1 === 0 ? rawVal2 : rawVal2.toFixed(2);

                const percent1 = Math.min(100, rdaTarget > 0 ? (rawVal1 / rdaTarget) * 100 : 0);
                const percent2 = Math.min(100, rdaTarget > 0 ? (rawVal2 / rdaTarget) * 100 : 0);
                const absPct1 = Math.min(100, rdaTarget > 0 ? (rawAbs1 / rdaTarget) * 100 : 0);
                const absPct2 = Math.min(100, rdaTarget > 0 ? (rawAbs2 / rdaTarget) * 100 : 0);

                const unabsPct1 = Math.max(0, percent1 - absPct1);
                const unabsPct2 = Math.max(0, percent2 - absPct2);

                if (meta.noTarget) {
                    row.innerHTML = `
                        <div class="nutrient-info compare-info">
                            <span>${nutrientName}</span>
                            <span class="compare-vals">
                                <span style="color: ${col1}; font-weight: bold;">${displayAbs1} (${displayVal1}) ${unit}</span> 
                                <span class="vs-divider">vs</span> 
                                <span style="color: ${col2}; font-weight: bold;">${displayAbs2} (${displayVal2}) ${unit}</span>
                            </span>
                        </div>
                        <div class="rda-container compare-container no-target-layout">
                            <div class="rda-dots">••••••</div>
                            <span class="nt-badge">N/T</span>
                        </div>
                    `;
                } else {
                    row.innerHTML = `
                        <div class="nutrient-info compare-info">
                            <span>${nutrientName}</span>
                            <span class="compare-vals">
                                <span style="color: ${col1}; font-weight: bold;">${displayAbs1} (${displayVal1}) ${unit}</span> 
                                <span class="vs-divider">vs</span> 
                                <span style="color: ${col2}; font-weight: bold;">${displayAbs2} (${displayVal2}) ${unit}</span> 
                                <span class="target-val">/ ${rdaTarget} ${unit}</span>
                            </span>
                        </div>
                        <div class="rda-container compare-container">
                            <div class="compare-bars-wrapper">
                                <div class="rda-bar-wrapper" style="display: flex; width: 100%; height: 5px; background: #e9ecef; border-radius: 2px; overflow: hidden;">
                                    <div class="rda-bar compare-bar" style="width: ${absPct1}%; background-color: ${col1};"></div>
                                    <div class="rda-bar compare-bar unabsorbed" style="width: ${unabsPct1}%; background-color: ${col1};"></div>
                                </div>
                                <div class="rda-bar-wrapper" style="display: flex; width: 100%; height: 5px; background: #e9ecef; border-radius: 2px; overflow: hidden;">
                                    <div class="rda-bar compare-bar" style="width: ${absPct2}%; background-color: ${col2};"></div>
                                    <div class="rda-bar compare-bar unabsorbed" style="width: ${unabsPct2}%; background-color: ${col2};"></div>
                                </div>
                            </div>
                            <div class="compare-percentages">
                                <span class="compare-pct" style="color: ${col1};">${Math.round((rawAbs1 / (rdaTarget || 1)) * 100)}%</span>
                                <span class="compare-pct" style="color: ${col2};">${Math.round((rawAbs2 / (rdaTarget || 1)) * 100)}%</span>
                            </div>
                        </div>
                    `;
                }
            } else {
                const rawVal = activeData?.[category]?.[nutrientName] || 0;
                const rawAbs = activeData?.[category]?.[`${nutrientName}_absorbed`] || 0;

                const displayVal = rawVal % 1 === 0 ? rawVal : rawVal.toFixed(2);
                const displayAbs = rawAbs % 1 === 0 ? rawAbs : rawAbs.toFixed(2);

                const actualPercent = rdaTarget > 0 ? (rawVal / rdaTarget) * 100 : 0;
                const percent = Math.min(100, actualPercent);

                const actualAbsPercent = rdaTarget > 0 ? (rawAbs / rdaTarget) * 100 : 0;
                const absPercent = Math.min(100, actualAbsPercent);
                const unabsPercent = Math.max(0, percent - absPercent);

                let barClass = '';
                let textClass = '';

                if (isLimitCategory) {
                    const isOver = rdaTarget > 0 && rawVal > rdaTarget;
                    barClass = isOver ? 'limit-over' : 'limit-under';
                } else {
                    if (ulTarget > 0 && rawVal > ulTarget) {
                        barClass = 'over-limit';
                        textClass = 'over-limit-text';
                    } else if (rdaTarget > 0 && rawVal > rdaTarget) {
                        barClass = 'exceeded';
                    }
                }

                if (meta.noTarget) {
                    row.innerHTML = `
                        <div class="nutrient-info">
                            <span>${nutrientName}</span>
                            <span class="no-target-val">${displayAbs} net (${displayVal} gross) ${unit}</span>
                        </div>
                        <div class="rda-container no-target-layout">
                            <div class="rda-dots">••••••</div>
                            <span class="nt-badge">N/T</span>
                        </div>
                    `;
                } else {
                    row.innerHTML = `
                        <div class="nutrient-info">
                            <span>${nutrientName}</span>
                            <span>${displayAbs} net (${displayVal} gross) ${unit} / ${rdaTarget} ${unit}</span>
                        </div>
                        <div class="rda-container">
                            <div class="rda-bar-wrapper" style="display: flex; flex: 1; height: 100%; background-color: #e9ecef; border-radius: 3px; overflow: hidden;">
                                <div class="rda-bar ${barClass}" style="width: ${absPercent}%;"></div>
                                <div class="rda-bar unabsorbed" style="width: ${unabsPercent}%; background-color: var(--primary-color);"></div>
                            </div>
                            <span class="percentage-label ${textClass}">${Math.round(actualAbsPercent)}% (${Math.round(actualPercent)}%)</span>
                        </div>
                    `;
                }
            }

            const uniqueKey = `${category}_${nutrientName}`;
            row.addEventListener('click', e => {
                if (e.target.closest('.rda-container')) return;
                e.stopPropagation();
                state.expandedNutrient = state.expandedNutrient === uniqueKey ? null : uniqueKey;
                renderNutritionPanel();
            });

            contentWrapper.appendChild(row);

            if (state.expandedNutrient === uniqueKey) {
                const detailPanel = document.createElement('div');
                if (activeData && activeData.isCompare) {
                    const rawAbs1 = activeData.slot1[category]?.[`${nutrientName}_absorbed`] || 0;
                    const rawAbs2 = activeData.slot2[category]?.[`${nutrientName}_absorbed`] || 0;
                    const label1 = state.compareSlots[0].parsed?.displayName || 'Item A';
                    const label2 = state.compareSlots[1].parsed?.displayName || 'Item B';

                    detailPanel.innerHTML = getNutrientAnalysisCompareHTML(
                        category,
                        nutrientName,
                        rawAbs1,
                        rawAbs2,
                        rdaTarget,
                        ulTarget,
                        unit,
                        col1,
                        col2,
                        label1,
                        label2
                    );
                } else {
                    const rawAbs = activeData?.[category]?.[`${nutrientName}_absorbed`] || 0;
                    detailPanel.innerHTML = getNutrientAnalysisHTML(
                        category,
                        nutrientName,
                        rawAbs,
                        rdaTarget,
                        ulTarget,
                        unit
                    );
                }
                contentWrapper.appendChild(detailPanel.firstElementChild);
            }
        }
    }

    catEl.appendChild(contentWrapper);

    catEl.addEventListener('click', e => {
        if (e.target.closest('.category-content')) return;
        state.collapsedCategories[category] = !isCollapsed;

        const allCategories = [...leftColumnLayout, ...rightColumnLayout];
        state.allCollapsed = allCategories.every(cat => state.collapsedCategories[cat] === true);
        renderNutritionPanel();
    });

    return catEl;
}

let waterGlassesCount = 0; // Each glass = 0.25L (8.45 fl oz)

function renderSummaryDashboard(activeData) {
    // 1. Gather Macronutrients
    const consumedCalories = Math.round(activeData?.general?.Calories || 0);
    const targetCalories = RDA_TARGETS.general.Calories || 2000;
    const remainingCalories = Math.max(0, targetCalories - consumedCalories);

    const consumedProtein = activeData?.proteins_and_aminos?.['Total Protein'] || 0;
    const targetProtein = RDA_TARGETS.proteins_and_aminos['Total Protein'] || 56;

    const consumedCarbs = activeData?.carbohydrates?.['Total Carbohydrates'] || 0;
    const targetCarbs = RDA_TARGETS.carbohydrates['Total Carbohydrates'] || 275;

    const consumedFat = activeData?.lipids?.['Total Fat'] || 0;
    const targetFat = RDA_TARGETS.lipids['Total Fat'] || 78;

    // 2. Pure Positive Micronutrient Target Score (% of beneficial RDAs met)
    let totalRdasTargeted = 0;
    let sumPercentage = 0;
    const targetCategories = ['vitamins', 'minerals', 'proteins_and_aminos', 'lipids'];

    targetCategories.forEach(cat => {
        const compounds = NUTRIENT_UNITS[cat] || {};
        for (const [name, meta] of Object.entries(compounds)) {
            if (meta.isSubheader || meta.noTarget) continue;
            const rda = RDA_TARGETS[cat]?.[name] || 0;
            if (rda > 0) {
                const consumed = activeData?.[cat]?.[name] || 0;
                sumPercentage += Math.min(100, (consumed / rda) * 100);
                totalRdasTargeted++;
            }
        }
    });

    const targetScorePct = totalRdasTargeted > 0 ? Math.round(sumPercentage / totalRdasTargeted) : 0;

    // 3. Update Rings
    const energyPct = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));
    const remainingPct = Math.min(100, Math.round((remainingCalories / targetCalories) * 100));

    const ringEnergyFill = document.getElementById('ring-energy-fill');
    const ringTargetFill = document.getElementById('ring-target-fill');
    const ringRemainingFill = document.getElementById('ring-remaining-fill');

    if (ringEnergyFill) ringEnergyFill.setAttribute('stroke-dasharray', `${energyPct}, 100`);
    if (ringTargetFill) ringTargetFill.setAttribute('stroke-dasharray', `${targetScorePct}, 100`);
    if (ringRemainingFill) ringRemainingFill.setAttribute('stroke-dasharray', `${remainingPct}, 100`);

    const ringEnergyVal = document.getElementById('ring-energy-val');
    const ringTargetVal = document.getElementById('ring-target-pct');
    const ringRemainingVal = document.getElementById('ring-remaining-val');

    if (ringEnergyVal) ringEnergyVal.textContent = consumedCalories;
    if (ringTargetVal) ringTargetVal.textContent = `${targetScorePct}%`;
    if (ringRemainingVal) ringRemainingVal.textContent = remainingCalories;

    // 4. Update Water (Food water + Manual glasses)
    const foodWaterGrams = activeData?.general?.Water || 0; // 1g water = 1ml
    const totalWaterMl = foodWaterGrams + waterGlassesCount * 250;
    const totalWaterLitres = (totalWaterMl / 1000).toFixed(2);
    const totalWaterFlOz = (totalWaterMl * 0.033814).toFixed(1);
    const waterTargetMl = 2500; // 2.5L base RDA

    const waterVolText = document.getElementById('water-vol-text');
    const waterBar = document.getElementById('water-progress-bar');
    if (waterVolText) waterVolText.textContent = `${totalWaterLitres} L / ${totalWaterFlOz} fl oz`;
    if (waterBar) waterBar.style.width = `${Math.min(100, Math.round((totalWaterMl / waterTargetMl) * 100))}%`;

    // 5. Update Macro Bars (Exact tabular spacing - no line wraps!)
    const updateBar = (name, consumed, target, unit) => {
        const textEl = document.getElementById(`macro-${name}-text`);
        const barEl = document.getElementById(`macro-${name}-bar`);
        const pctEl = document.getElementById(`macro-${name}-pct`);
        const rawPct = Math.round((consumed / target) * 100);

        if (textEl) textEl.textContent = `${consumed.toFixed(1)} / ${target.toFixed(1)} ${unit}`;
        if (barEl) barEl.style.width = `${Math.min(100, rawPct)}%`;
        if (pctEl) pctEl.textContent = `${rawPct}%`;
    };

    updateBar('energy', consumedCalories, targetCalories, 'kcal');
    updateBar('protein', consumedProtein, targetProtein, 'g');
    updateBar('carbs', consumedCarbs, targetCarbs, 'g');
    updateBar('fat', consumedFat, targetFat, 'g');

    // 6. Glycine-to-Methionine Balancing Ratio
    const glycine = activeData?.proteins_and_aminos?.['Glycine'] || 0;
    const methionine = activeData?.proteins_and_aminos?.['Methionine'] || 0;
    const ratio = methionine > 0 ? (glycine / methionine).toFixed(2) : '0.00';
    const ratioValEl = document.getElementById('glycine-ratio-val');
    const glycineBar = document.getElementById('glycine-bar');

    if (ratioValEl) ratioValEl.textContent = `${ratio} : 1.0 (Target ≥ 1.0)`;
    if (glycineBar) {
        const fillPct = Math.min(100, Math.round((parseFloat(ratio) / 1.5) * 100));
        glycineBar.style.width = `${fillPct}%`;
    }
}

// Interactive Water Glasses Controller
document.getElementById('water-plus-btn')?.addEventListener('click', () => {
    if (waterGlassesCount < 8) {
        waterGlassesCount++;
        syncWaterGlassesUI();
    }
});

document.getElementById('water-minus-btn')?.addEventListener('click', () => {
    if (waterGlassesCount > 0) {
        waterGlassesCount--;
        syncWaterGlassesUI();
    }
});

document.querySelectorAll('.glass-btn').forEach(glass => {
    glass.addEventListener('click', () => {
        const idx = parseInt(glass.getAttribute('data-idx'), 10);
        waterGlassesCount = idx + 1 === waterGlassesCount ? idx : idx + 1;
        syncWaterGlassesUI();
    });
});

function syncWaterGlassesUI() {
    document.querySelectorAll('.glass-btn').forEach((g, idx) => {
        g.classList.toggle('active', idx < waterGlassesCount);
    });
    renderNutritionPanel();
}

function renderNutritionPanel() {
    const leftColumnEl = document.getElementById('column-left');
    const rightColumnEl = document.getElementById('column-right');
    const indicatorEl = document.getElementById('nutrition-view-indicator');
    const toggleAllBtn = document.getElementById('toggle-all-btn');

    if (!leftColumnEl || !rightColumnEl) return;

    leftColumnEl.innerHTML = '';
    rightColumnEl.innerHTML = '';

    let activeData;

    if (state.mode === 'compare') {
        if (indicatorEl) indicatorEl.textContent = 'Showing: Comparison Mode';
        activeData = {
            isCompare: true,
            slot1: calculateAggregate(state.compareSlots[0].parsed ? [state.compareSlots[0].parsed] : []),
            slot2: calculateAggregate(state.compareSlots[1].parsed ? [state.compareSlots[1].parsed] : [])
        };
    } else {
        const context = getActiveContext();
        if (indicatorEl) indicatorEl.textContent = context.label;
        activeData = calculateAggregate(context.items);
    }

    // Render the Top Cronometer-style Dashboard
    renderSummaryDashboard(activeData);

    if (toggleAllBtn) {
        toggleAllBtn.textContent = state.allCollapsed ? 'Expand All' : 'Collapse All';
    }

    leftColumnLayout.forEach(category => {
        const card = createCategoryCard(category, activeData);
        if (card) leftColumnEl.appendChild(card);
    });

    rightColumnLayout.forEach(category => {
        const card = createCategoryCard(category, activeData);
        if (card) rightColumnEl.appendChild(card);
    });
}

function updateMealTargetDropdown() {
    const select = document.getElementById('food-meal-target');
    if (!select) return;
    const day = getCurrentDayData();
    select.innerHTML = '<option value="unassigned">Quick Log</option>';
    day.meals.forEach(meal => {
        const opt = document.createElement('option');
        opt.value = meal.id;
        opt.textContent = meal.name;
        select.appendChild(opt);
    });
}

function renderDietList() {
    const mealsContainer = document.getElementById('tracker-meals-container');
    const listEl = document.getElementById('diet-list');
    const badge = document.getElementById('active-day-badge');
    const confirmBtn = document.getElementById('confirm-add-food-btn');

    if (badge) badge.textContent = state.currentDay;

    const day = getCurrentDayData();

    if (!mealsContainer || !listEl) return;
    mealsContainer.innerHTML = '';
    listEl.innerHTML = '';

    // Helper to create individual food item with insight-click & preview
    const createFoodItemElement = (item, onRemove) => {
        const li = document.createElement('li');
        const isSelected = state.selectedFoodId === item.id;
        li.className = `diet-item ${isSelected ? 'selected' : ''}`;
        li.innerHTML = `
            <div class="diet-item-info">
                <span class="diet-food-title">${item.displayName}</span>
                <span class="diet-unit-breakdown">(${formatMultiUnits(item.amount)})</span>
            </div>
            <button class="remove-btn" type="button" title="Remove">&times;</button>
        `;

        // Click food item -> Show Insight & isolate nutrient analysis
        li.addEventListener('click', e => {
            e.stopPropagation(); // Do not trigger parent meal card selection
            if (state.selectedFoodId === item.id) {
                state.selectedFoodId = null;
                hideFoodInsight();
            } else {
                state.selectedFoodId = item.id;
                state.selectedMealId = null; // Unselect meal so single food is focused
                showFoodInsight(item.foodKey);
            }
            renderDietList();
            renderNutritionPanel();
        });

        li.addEventListener('mouseenter', () => {
            if (!state.selectedFoodId) {
                state.hoveredFood = item;
                renderNutritionPanel();
            }
        });

        li.addEventListener('mouseleave', () => {
            if (!state.selectedFoodId) {
                state.hoveredFood = null;
                renderNutritionPanel();
            }
        });

        li.querySelector('.remove-btn').addEventListener('click', e => {
            e.stopPropagation();
            if (state.selectedFoodId === item.id) {
                state.selectedFoodId = null;
                hideFoodInsight();
            }
            onRemove();
            persistActiveWeek();
            renderDietList();
            renderNutritionPanel();
        });

        return li;
    };

    // 1. Render Meals (Clicking anywhere on card activates it)
    day.meals.forEach(meal => {
        const isMealSelected = state.selectedMealId === meal.id;
        const mealCard = document.createElement('div');
        mealCard.className = `meal-group-card ${isMealSelected ? 'selected' : ''}`;

        const mealCals = Math.round(
            meal.items.reduce((acc, item) => acc + getNutrientValue(item, 'general', 'Calories'), 0)
        );

        mealCard.innerHTML = `
            <div class="meal-group-header">
                <span class="meal-header-left">
                    <span>${meal.name}</span>
                    <span class="meal-cals-badge">${mealCals} kcal</span>
                </span>
                <span class="meal-header-right">
                    <button type="button" class="meal-delete-btn" title="Delete meal">&times;</button>
                </span>
            </div>
            <ul class="diet-list meal-items-list"></ul>
        `;

        // Click the whole meal card to select/deselect
        mealCard.addEventListener('click', e => {
            if (e.target.closest('.diet-item') || e.target.closest('.meal-delete-btn')) return;
            state.selectedMealId = state.selectedMealId === meal.id ? null : meal.id;
            state.selectedFoodId = null;
            hideFoodInsight();
            renderDietList();
            renderNutritionPanel();
        });

        mealCard.querySelector('.meal-delete-btn').addEventListener('click', e => {
            e.stopPropagation();
            day.meals = day.meals.filter(m => m.id !== meal.id);
            if (state.selectedMealId === meal.id) state.selectedMealId = null;
            persistActiveWeek();
            renderDietList();
            renderNutritionPanel();
        });

        const mealUl = mealCard.querySelector('.meal-items-list');
        meal.items.forEach((item, idx) => {
            mealUl.appendChild(createFoodItemElement(item, () => meal.items.splice(idx, 1)));
        });

        mealsContainer.appendChild(mealCard);
    });

    // 2. Render Quick Log ONLY if it has items
    if (day.unassigned.length > 0) {
        const quickLogCals = Math.round(
            day.unassigned.reduce((acc, item) => acc + getNutrientValue(item, 'general', 'Calories'), 0)
        );
        const isQuickLogSelected = state.selectedMealId === 'quick_log';

        const quickLogCard = document.createElement('div');
        quickLogCard.className = `quick-log-card ${isQuickLogSelected ? 'selected' : ''}`;
        quickLogCard.innerHTML = `
            <div class="quick-log-header">
                <span class="quick-log-title">⚡ Quick Log</span>
                <span class="quick-log-cals">${quickLogCals} kcal</span>
            </div>
            <ul class="diet-list quick-items-list" style="padding: 4px;"></ul>
        `;

        // Click whole quick log card to select/deselect
        quickLogCard.addEventListener('click', e => {
            if (e.target.closest('.diet-item')) return;
            state.selectedMealId = state.selectedMealId === 'quick_log' ? null : 'quick_log';
            state.selectedFoodId = null;
            hideFoodInsight();
            renderDietList();
            renderNutritionPanel();
        });

        const quickUl = quickLogCard.querySelector('.quick-items-list');
        day.unassigned.forEach((item, idx) => {
            quickUl.appendChild(createFoodItemElement(item, () => day.unassigned.splice(idx, 1)));
        });

        listEl.appendChild(quickLogCard);
    }
}

function removeFood(index) {
    state.diet.splice(index, 1);
    if (state.selectedIndex === index) state.selectedIndex = null;
    if (state.hoveredIndex === index) state.hoveredIndex = null;
    renderDietList();
    renderNutritionPanel();
}

/* ==========================================================================
   6. INTERACTIVE TWO-STEP FOOD SELECTOR & UNIT ENGINE
   ========================================================================== */

let selectedFoodKey = null;
let currentUnit = 'g';
let highlightedFoodIndex = -1;
let highlightedAmountIndex = -1;

const searchStepEl = document.getElementById('food-step-search');
const quantityStepEl = document.getElementById('food-step-quantity');
const searchInput = document.getElementById('food-search-input');
const dropdownEl = document.getElementById('food-dropdown');
const dropdownList = document.getElementById('food-dropdown-list');
const selectedFoodName = document.getElementById('selected-food-name');
const amountInput = document.getElementById('food-amount-input');
const amountDropdown = document.getElementById('amount-dropdown');
const amountDropdownList = document.getElementById('amount-dropdown-list');
const cancelFoodBtn = document.getElementById('cancel-food-selection');
const confirmAddBtn = document.getElementById('confirm-add-food-btn');
const tutorialHint = document.getElementById('first-time-hint');
const compareTutorialHint = document.getElementById('compare-first-time-hint');
let hasInteractedWithCompare = false;

function updateCompareTutorialHint() {
    if (!compareTutorialHint) return;
    if (hasInteractedWithCompare || state.compareSlots[0].parsed !== null) {
        compareTutorialHint.style.display = 'none';
    } else {
        compareTutorialHint.style.display = 'flex';
    }
}

function dismissCompareTutorial() {
    hasInteractedWithCompare = true;
    if (compareTutorialHint) {
        compareTutorialHint.style.display = 'none';
    }
}

const unitTriggerBtn = document.getElementById('unit-trigger-btn');
const unitMenu = document.getElementById('unit-menu');
const currentUnitLabel = document.getElementById('current-unit-label');

let hasInteractedWithSearch = false;

function updateTutorialHint() {
    if (!tutorialHint) return;
    if (hasInteractedWithSearch || state.diet.length > 0) {
        tutorialHint.style.display = 'none';
    } else {
        tutorialHint.style.display = 'flex';
    }
}

function dismissTutorial() {
    hasInteractedWithSearch = true;
    if (tutorialHint) {
        tutorialHint.style.display = 'none';
    }
}

// =========================================================================
// BIOLOGICAL INSIGHT CARD (FIELD NOTE) CONTROLLER
// =========================================================================

const insightCard = document.getElementById('food-insight-card');
const insightTitle = document.getElementById('insight-food-title');
const insightFamily = document.getElementById('insight-family');
const insightTags = document.getElementById('insight-tags');
const insightSuperpower = document.getElementById('insight-superpower');
const insightNuance = document.getElementById('insight-nuance');
const insightPrep = document.getElementById('insight-prep');
const closeInsightBtn = document.getElementById('close-insight-btn');

function showFoodInsight(foodKey) {
    if (!insightCard || !foodKey || !FOOD_DATABASE[foodKey]) return;
    const food = FOOD_DATABASE[foodKey];
    const info = food.insights;
    if (!info) return;

    insightTitle.textContent = food.displayName;
    insightFamily.textContent = info.family || '';
    insightSuperpower.textContent = info.superpower || '';
    insightNuance.textContent = info.nuance || '';
    insightPrep.textContent = info.prepTip || '';

    insightTags.innerHTML = '';
    (info.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'insight-tag';
        span.textContent = tag;
        insightTags.appendChild(span);
    });

    insightCard.classList.remove('hidden');
}

function hideFoodInsight() {
    insightCard?.classList.add('hidden');
}

closeInsightBtn?.addEventListener('click', () => {
    hideFoodInsight();
    state.selectedIndex = null;
    renderDietList();
    renderNutritionPanel();
});

// 1. Food Dropdown Autocomplete
function getSortedFoods() {
    return Object.keys(FOOD_DATABASE)
        .map(key => ({ key, ...FOOD_DATABASE[key] }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function renderFoodDropdown(filterQuery = '') {
    if (!dropdownList) return;
    dropdownList.innerHTML = '';
    const query = filterQuery.trim().toLowerCase();
    const foods = getSortedFoods();

    const filtered = foods
        .filter(food => {
            if (!query) return true;
            const matchesName = food.displayName.toLowerCase().includes(query);
            const matchesAlias = food.aliases?.some(a => a.toLowerCase().includes(query));
            return matchesName || matchesAlias;
        })
        .slice(0, 10);

    if (filtered.length === 0) {
        dropdownList.innerHTML = `
            <li style="padding: 10px; font-size: 12px; color: var(--text-muted); text-align: center;">
                No matching foods found
            </li>
        `;
        return;
    }

    filtered.forEach((food, index) => {
        const li = document.createElement('li');
        li.className = 'food-dropdown-item';
        if (query) li.classList.add('is-matched');
        if (index === highlightedFoodIndex) {
            li.classList.add('is-selected');
        }

        const calories = food.general?.Calories ?? 0;
        li.innerHTML = `
            <span>${food.displayName}</span>
            <span class="item-calories">${calories} kcal/100g</span>
        `;

        li.addEventListener('mousedown', e => {
            e.preventDefault();
            selectFood(food.key);
        });

        dropdownList.appendChild(li);
        const activeFood = dropdownList.querySelector('.food-dropdown-item.is-selected');
        activeFood?.scrollIntoView({ block: 'nearest' });
    });
}

function openFoodDropdown() {
    dropdownEl?.classList.remove('hidden');
    highlightedFoodIndex = -1;
    renderFoodDropdown(searchInput?.value || '');
}

function closeFoodDropdown() {
    dropdownEl?.classList.add('hidden');
    highlightedFoodIndex = -1;
}

function selectFood(foodKey) {
    selectedFoodKey = foodKey;
    const food = FOOD_DATABASE[foodKey];
    if (!food) return;

    if (selectedFoodName) selectedFoodName.textContent = food.displayName;
    closeFoodDropdown();

    searchStepEl?.classList.add('hidden');
    quantityStepEl?.classList.remove('hidden');

    if (amountInput) {
        amountInput.value = '';
        amountInput.focus();
    }

    dismissTutorial();
}

function resetToSearch() {
    selectedFoodKey = null;
    closeAmountDropdown();
    closeFoodDropdown();
    unitMenu?.classList.add('hidden');

    quantityStepEl?.classList.add('hidden');
    searchStepEl?.classList.remove('hidden');

    if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
    }
}

// 2. Amount Presets Dropdown
function renderAmountPresets() {
    if (!amountDropdownList) return;
    amountDropdownList.innerHTML = '';
    const presets = UNIT_CONVERSIONS[currentUnit].presets;

    presets.forEach((val, idx) => {
        const li = document.createElement('li');
        li.className = 'amount-preset-item';
        if (idx === highlightedAmountIndex) {
            li.classList.add('is-selected');
        }
        li.innerHTML = `<span>${val} ${currentUnit}</span>`;

        li.addEventListener('mousedown', e => {
            e.preventDefault();
            amountInput.value = val;
            closeAmountDropdown();
            amountInput.focus();
        });

        amountDropdownList.appendChild(li);
    });

    const activeItem = amountDropdownList.querySelector('.amount-preset-item.is-selected');
    activeItem?.scrollIntoView({ block: 'nearest' });
}

function openAmountDropdown() {
    amountDropdown?.classList.remove('hidden');
    renderAmountPresets();
}

function closeAmountDropdown() {
    amountDropdown?.classList.add('hidden');
    highlightedAmountIndex = -1;
}

// 3. Commit Add Food
function commitAddFood() {
    if (!selectedFoodKey) return;

    const rawAmount = parseFloat(amountInput?.value);
    if (!rawAmount || isNaN(rawAmount) || rawAmount <= 0) return;

    const grams = rawAmount * UNIT_CONVERSIONS[currentUnit].toGrams;
    const day = getCurrentDayData();

    const newItem = {
        id: Date.now() + Math.random(),
        foodKey: selectedFoodKey,
        amount: Math.round(grams),
        displayName: FOOD_DATABASE[selectedFoodKey].displayName
    };

    if (state.selectedMealId && state.selectedMealId !== 'quick_log') {
        const meal = day.meals.find(m => m.id === state.selectedMealId);
        if (meal) meal.items.push(newItem);
        else day.unassigned.push(newItem);
    } else {
        day.unassigned.push(newItem);
    }

    persistActiveWeek(); // Auto-save on every add
    renderDietList();
    renderNutritionPanel();
    resetToSearch();
}

// 4. Unit Conversion Engine
function switchUnit(newUnit) {
    if (!UNIT_CONVERSIONS[newUnit]) return;

    if (newUnit === currentUnit) {
        unitMenu?.classList.add('hidden');
        return;
    }

    const currentVal = parseFloat(amountInput.value);
    if (!isNaN(currentVal) && currentVal > 0) {
        const grams = currentVal * UNIT_CONVERSIONS[currentUnit].toGrams;
        const converted = grams / UNIT_CONVERSIONS[newUnit].toGrams;
        amountInput.value = converted % 1 === 0 ? converted : parseFloat(converted.toFixed(2));
    }

    currentUnit = newUnit;
    if (currentUnitLabel) currentUnitLabel.textContent = newUnit;

    document.querySelectorAll('.unit-opt').forEach(o => {
        o.classList.toggle('active', o.getAttribute('data-unit') === newUnit);
    });

    unitMenu?.classList.add('hidden');
    renderAmountPresets();
}

unitTriggerBtn?.addEventListener('click', e => {
    e.stopPropagation();
    unitMenu?.classList.toggle('hidden');
});

document.addEventListener('click', e => {
    if (!e.target.closest('.unit-dropdown-container')) {
        unitMenu?.classList.add('hidden');
    }
});

const UNIT_KEYS = Object.keys(UNIT_CONVERSIONS);

unitTriggerBtn?.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = UNIT_KEYS.indexOf(currentUnit);
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = (currentIndex + delta + UNIT_KEYS.length) % UNIT_KEYS.length;
        switchUnit(UNIT_KEYS[nextIndex]);
    }
});

document.querySelectorAll('.unit-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        switchUnit(opt.getAttribute('data-unit'));
    });
});

// Event Bindings for Step 2
cancelFoodBtn?.addEventListener('click', resetToSearch);
confirmAddBtn?.addEventListener('click', commitAddFood);

amountInput?.addEventListener('focus', openAmountDropdown);
amountInput?.addEventListener('blur', () => setTimeout(closeAmountDropdown, 150));

amountInput?.addEventListener('keydown', e => {
    const presets = UNIT_CONVERSIONS[currentUnit].presets;
    if (presets.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (amountDropdown?.classList.contains('hidden')) {
            openAmountDropdown();
            highlightedAmountIndex = 0;
        } else {
            highlightedAmountIndex = (highlightedAmountIndex + 1) % presets.length;
        }
        renderAmountPresets();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (amountDropdown?.classList.contains('hidden')) {
            openAmountDropdown();
            highlightedAmountIndex = presets.length - 1;
        } else {
            highlightedAmountIndex = (highlightedAmountIndex - 1 + presets.length) % presets.length;
        }
        renderAmountPresets();
    } else if (e.key === 'Enter') {
        if (!amountDropdown?.classList.contains('hidden') && highlightedAmountIndex >= 0) {
            e.preventDefault();
            amountInput.value = presets[highlightedAmountIndex];
            closeAmountDropdown();
        } else {
            commitAddFood();
        }
    } else if (e.key === 'Escape') {
        closeAmountDropdown();
    }
});

// Event Bindings for Step 1
searchInput?.addEventListener('focus', () => {
    dismissTutorial();
    openFoodDropdown();
});
searchInput?.addEventListener('input', () => {
    openFoodDropdown();
    renderFoodDropdown(searchInput.value);
});
searchInput?.addEventListener('blur', () => {
    setTimeout(closeFoodDropdown, 150);
});

searchInput?.addEventListener('keydown', e => {
    const items = dropdownList?.querySelectorAll('.food-dropdown-item') || [];
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedFoodIndex = (highlightedFoodIndex + 1) % items.length;
        renderFoodDropdown(searchInput.value);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedFoodIndex = (highlightedFoodIndex - 1 + items.length) % items.length;
        renderFoodDropdown(searchInput.value);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const filtered = getSortedFoods().filter(food => {
            const q = searchInput.value.trim().toLowerCase();
            if (!q) return true;
            return food.displayName.toLowerCase().includes(q) || food.aliases?.some(a => a.toLowerCase().includes(q));
        });

        if (highlightedFoodIndex >= 0 && filtered[highlightedFoodIndex]) {
            selectFood(filtered[highlightedFoodIndex].key);
        } else if (filtered.length > 0) {
            selectFood(filtered[0].key);
        }
    } else if (e.key === 'Escape') {
        closeFoodDropdown();
    }
});

/* ==========================================================================
   7. COMPARISON SLOTS CONTROLLER
   ========================================================================== */

function setupComparisonSlot(slotIndex) {
    const num = slotIndex + 1;
    let slotFoodKey = null;
    let slotUnit = 'g';
    let highlightedIndex = -1;
    let highlightedAmount = -1;

    const searchStep = document.getElementById(`slot-${num}-step-search`);
    const qtyStep = document.getElementById(`slot-${num}-step-quantity`);
    const searchInput = document.getElementById(`slot-${num}-search-input`);
    const dropdown = document.getElementById(`slot-${num}-dropdown`);
    const dropdownList = document.getElementById(`slot-${num}-dropdown-list`);
    const selectedName = document.getElementById(`slot-${num}-selected-name`);
    const amountInput = document.getElementById(`slot-${num}-amount-input`);
    const amountDropdown = document.getElementById(`slot-${num}-amount-dropdown`);
    const amountDropdownList = document.getElementById(`slot-${num}-amount-dropdown-list`);
    const cancelBtn = document.getElementById(`slot-${num}-cancel-selection`);
    const confirmBtn = document.getElementById(`slot-${num}-confirm-btn`);
    const unitBtn = document.getElementById(`slot-${num}-unit-btn`);
    const unitMenu = document.getElementById(`slot-${num}-unit-menu`);
    const unitLabel = document.getElementById(`slot-${num}-unit-label`);
    const clearBtn = document.getElementById(`clear-slot-${num}-btn`);

    function renderSlotFoods(q = '') {
        if (!dropdownList) return;
        dropdownList.innerHTML = '';
        const query = q.trim().toLowerCase();
        const filtered = getSortedFoods()
            .filter(
                f =>
                    !query ||
                    f.displayName.toLowerCase().includes(query) ||
                    f.aliases?.some(a => a.toLowerCase().includes(query))
            )
            .slice(0, 10);

        filtered.forEach((food, idx) => {
            const li = document.createElement('li');
            li.className = 'food-dropdown-item';
            if (idx === highlightedIndex) li.classList.add('is-selected');
            li.innerHTML = `<span>${food.displayName}</span><span class="item-calories">${food.general?.Calories ?? 0} kcal/100g</span>`;
            li.addEventListener('mousedown', e => {
                e.preventDefault();
                slotFoodKey = food.key;
                if (selectedName) selectedName.textContent = food.displayName;
                dropdown?.classList.add('hidden');
                searchStep?.classList.add('hidden');
                qtyStep?.classList.remove('hidden');
                amountInput.value = '';
                amountInput?.focus();
            });
            dropdownList.appendChild(li);
        });
        const active = dropdownList.querySelector('.is-selected');
        active?.scrollIntoView({ block: 'nearest' });
    }

    searchInput?.addEventListener('focus', () => {
        if (slotIndex === 0) dismissCompareTutorial();
        dropdown?.classList.remove('hidden');
        renderSlotFoods(searchInput.value);
    });
    searchInput?.addEventListener('input', () => {
        dropdown?.classList.remove('hidden');
        renderSlotFoods(searchInput.value);
    });
    searchInput?.addEventListener('blur', () => setTimeout(() => dropdown?.classList.add('hidden'), 150));

    searchInput?.addEventListener('keydown', e => {
        const items = dropdownList?.querySelectorAll('.food-dropdown-item') || [];
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex + 1) % items.length;
            renderSlotFoods(searchInput.value);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
            renderSlotFoods(searchInput.value);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const filtered = getSortedFoods().filter(food => {
                const q = searchInput.value.trim().toLowerCase();
                if (!q) return true;
                return (
                    food.displayName.toLowerCase().includes(q) || food.aliases?.some(a => a.toLowerCase().includes(q))
                );
            });
            if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
                slotFoodKey = filtered[highlightedIndex].key;
                if (selectedName) selectedName.textContent = filtered[highlightedIndex].displayName;
                dropdown?.classList.add('hidden');
                searchStep?.classList.add('hidden');
                qtyStep?.classList.remove('hidden');
                amountInput.value = '';
                amountInput?.focus();
            }
        }
    });

    function renderPresets() {
        if (!amountDropdownList) return;
        amountDropdownList.innerHTML = '';
        UNIT_CONVERSIONS[slotUnit].presets.forEach((val, idx) => {
            const li = document.createElement('li');
            li.className = 'amount-preset-item';
            if (idx === highlightedAmount) li.classList.add('is-selected');
            li.innerHTML = `<span>${val} ${slotUnit}</span>`;
            li.addEventListener('mousedown', e => {
                e.preventDefault();
                amountInput.value = val;
                amountDropdown?.classList.add('hidden');
                amountInput.focus();
            });
            amountDropdownList.appendChild(li);
        });
        const active = amountDropdownList.querySelector('.is-selected');
        active?.scrollIntoView({ block: 'nearest' });
    }

    amountInput?.addEventListener('focus', () => {
        amountDropdown?.classList.remove('hidden');
        renderPresets();
    });
    amountInput?.addEventListener('blur', () => setTimeout(() => amountDropdown?.classList.add('hidden'), 150));

    amountInput?.addEventListener('keydown', e => {
        const presets = UNIT_CONVERSIONS[slotUnit].presets;
        if (presets.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedAmount = (highlightedAmount + 1) % presets.length;
            renderPresets();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedAmount = (highlightedAmount - 1 + presets.length) % presets.length;
            renderPresets();
        } else if (e.key === 'Enter') {
            if (!amountDropdown?.classList.contains('hidden') && highlightedAmount >= 0) {
                e.preventDefault();
                amountInput.value = presets[highlightedAmount];
                amountDropdown?.classList.add('hidden');
            } else {
                commitSlot();
            }
        }
    });

    unitBtn?.addEventListener('click', e => {
        e.stopPropagation();
        unitMenu?.classList.toggle('hidden');
    });
    unitMenu?.querySelectorAll('.unit-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            const newUnit = opt.getAttribute('data-unit');
            const val = parseFloat(amountInput.value);
            if (!isNaN(val) && val > 0) {
                const g = val * UNIT_CONVERSIONS[slotUnit].toGrams;
                amountInput.value = parseFloat((g / UNIT_CONVERSIONS[newUnit].toGrams).toFixed(2));
            }
            slotUnit = newUnit;
            if (unitLabel) unitLabel.textContent = newUnit;
            unitMenu.querySelectorAll('.unit-opt').forEach(o => o.classList.toggle('active', o === opt));
            unitMenu.classList.add('hidden');
            renderPresets();
        });
    });

    function resetSlotSearch() {
        slotFoodKey = null;
        qtyStep?.classList.add('hidden');
        searchStep?.classList.remove('hidden');
        if (searchInput) searchInput.value = '';
    }
    cancelBtn?.addEventListener('click', resetSlotSearch);

    function commitSlot() {
        if (!slotFoodKey) return;
        const amt = parseFloat(amountInput.value);
        if (!amt || isNaN(amt) || amt <= 0) return;
        const grams = amt * UNIT_CONVERSIONS[slotUnit].toGrams;

        state.compareSlots[slotIndex].parsed = {
            amount: Math.round(grams),
            foodKey: slotFoodKey,
            displayName: FOOD_DATABASE[slotFoodKey].displayName
        };
        updateSlotUI(slotIndex);
        renderNutritionPanel();
        resetSlotSearch();
    }
    confirmBtn?.addEventListener('click', commitSlot);

    clearBtn?.addEventListener('click', () => {
        state.compareSlots[slotIndex].parsed = null;
        updateSlotUI(slotIndex);
        renderNutritionPanel();
        resetSlotSearch();
    });
}

setupComparisonSlot(0);
setupComparisonSlot(1);

function updateSlotUI(slotIndex) {
    const slot = state.compareSlots[slotIndex];
    const cardEl = document.getElementById(`slot-${slotIndex + 1}-card`);
    const statusEl = document.getElementById(`slot-${slotIndex + 1}-status`);
    const badgeEl = cardEl?.querySelector('.slot-badge');

    if (badgeEl) badgeEl.style.backgroundColor = slot.color;

    if (statusEl) {
        if (slot.parsed) {
            statusEl.innerHTML = `Loaded: <strong>${slot.parsed.amount}g</strong> ${slot.parsed.displayName}`;
            statusEl.classList.add('active');
        } else {
            statusEl.textContent = 'No food loaded';
            statusEl.classList.remove('active');
        }
    }
}

document.querySelectorAll('.color-options').forEach(optionsContainer => {
    const slotIndex = parseInt(optionsContainer.getAttribute('data-slot'), 10) - 1;
    optionsContainer.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            optionsContainer.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            state.compareSlots[slotIndex].color = dot.getAttribute('data-color');
            updateSlotUI(slotIndex);
            renderNutritionPanel();
        });
    });
});

/* ==========================================================================
   8. GLOBAL CONTROLS & BOOTSTRAPPING
   ========================================================================== */

const tabDietBtn = document.getElementById('tab-diet');
const tabCompareBtn = document.getElementById('tab-compare');
const dietModeViews = document.getElementById('diet-mode-views');
const compareModeViews = document.getElementById('compare-mode-views');
const toggleAllBtn = document.getElementById('toggle-all-btn');

tabDietBtn?.addEventListener('click', () => {
    state.mode = 'diet';
    tabDietBtn.classList.add('active');
    tabCompareBtn?.classList.remove('active');
    dietModeViews?.classList.remove('hidden');
    compareModeViews?.classList.add('hidden');
    renderNutritionPanel();
});

tabCompareBtn?.addEventListener('click', () => {
    state.mode = 'compare';
    tabCompareBtn.classList.add('active');
    tabDietBtn?.classList.remove('active');
    dietModeViews?.classList.add('hidden');
    compareModeViews?.classList.remove('hidden');
    renderNutritionPanel();
    updateCompareTutorialHint();
});

toggleAllBtn?.addEventListener('click', () => {
    const allCategories = [...leftColumnLayout, ...rightColumnLayout];
    const shouldCollapse = !state.allCollapsed;
    allCategories.forEach(cat => {
        state.collapsedCategories[cat] = shouldCollapse;
    });
    state.allCollapsed = shouldCollapse;
    renderNutritionPanel();
});

/* ==========================================================================
   9. MINIMAL INLINE MENU & FOOTER CONTROLLERS
   ========================================================================== */

const navToggleBtn = document.getElementById('nav-toggle-btn');
const navDropdown = document.getElementById('nav-dropdown');

function closeNav() {
    navToggleBtn?.classList.remove('is-active');
    navToggleBtn?.setAttribute('aria-expanded', 'false');
    navDropdown?.classList.add('hidden');
}

navToggleBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = navToggleBtn.classList.toggle('is-active');
    navToggleBtn.setAttribute('aria-expanded', String(isOpen));
    navDropdown?.classList.toggle('hidden', !isOpen);
});

document.addEventListener('click', e => {
    if (!e.target.closest('.corner-nav-wrapper')) closeNav();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
});

// "Clear Diet" button in menu
document.getElementById('menu-btn-clear')?.addEventListener('click', () => {
    if (state.diet.length === 0) return closeNav();
    state.diet = [];
    state.selectedIndex = null;
    state.hoveredIndex = null;
    hideFoodInsight();
    renderDietList();
    renderNutritionPanel();
    closeNav();
});

// "Targets & BMI" placeholder in menu
document.getElementById('menu-btn-profile')?.addEventListener('click', () => {
    alert('Calorie & DRI Profile customizer coming in next module!');
    closeNav();
});

// Footer Back-to-Top
document.getElementById('footer-scroll-top')?.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Dynamic year in footer
const footerYear = document.getElementById('footer-year');
if (footerYear) footerYear.textContent = new Date().getFullYear();

// Day Tabs
document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentDay = btn.getAttribute('data-day');
        state.selectedMealId = null;
        state.selectedIndex = null;
        renderDietList();
        renderNutritionPanel();
    });
});

// Add Meal
document.getElementById('add-meal-btn')?.addEventListener('click', () => {
    const day = getCurrentDayData();
    const mealNum = day.meals.length + 1;
    day.meals.push({
        id: `meal_${Date.now()}`,
        name: `Meal ${mealNum}`,
        items: []
    });
    renderDietList();
});

// Copy Previous Day
document.getElementById('copy-prev-day-btn')?.addEventListener('click', () => {
    const currentIdx = DAYS.indexOf(state.currentDay);
    if (currentIdx === 0) return alert('No previous day for Monday!');
    const prevDayName = DAYS[currentIdx - 1];
    const prevDay = state.weekData[prevDayName];

    if (!prevDay || (prevDay.unassigned.length === 0 && prevDay.meals.length === 0)) {
        return alert(`No meals found on ${prevDayName} to copy.`);
    }

    // Deep copy into current day
    state.weekData[state.currentDay] = JSON.parse(JSON.stringify(prevDay));
    persistActiveWeek();
    renderDietList();
    renderNutritionPanel();
});

/* ==========================================================================
   NAMED WEEK PLANS (SAVE, LOAD, CLEAR) & TOASTS
   ========================================================================== */

function showToast(message) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
}

const modalBackdrop = document.getElementById('app-modal-backdrop');
const savePlanModal = document.getElementById('save-plan-modal');
const loadPlanModal = document.getElementById('load-plan-modal');
const planNameInput = document.getElementById('plan-name-input');

function closeModal() {
    modalBackdrop?.classList.add('hidden');
    savePlanModal?.classList.add('hidden');
    loadPlanModal?.classList.add('hidden');
}

document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeModal));
modalBackdrop?.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
});

// 1. Save Plan
document.getElementById('save-week-btn')?.addEventListener('click', () => {
    modalBackdrop.classList.remove('hidden');
    savePlanModal.classList.remove('hidden');
    if (planNameInput) {
        planNameInput.value = `Week Plan (${new Date().toLocaleDateString()})`;
        planNameInput.focus();
    }
});

document.getElementById('confirm-save-plan-btn')?.addEventListener('click', () => {
    const name = planNameInput.value.trim() || `Plan ${Date.now()}`;
    const allPlans = JSON.parse(localStorage.getItem('open_nutrition_saved_weeks') || '{}');

    allPlans[name] = {
        name,
        date: new Date().toLocaleDateString(),
        data: JSON.parse(JSON.stringify(state.weekData))
    };

    localStorage.setItem('open_nutrition_saved_weeks', JSON.stringify(allPlans));
    closeModal();
    showToast(`Saved plan "${name}"`);
});

// 2. Load Plan
function renderSavedPlansList() {
    const listEl = document.getElementById('saved-plans-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const allPlans = JSON.parse(localStorage.getItem('open_nutrition_saved_weeks') || '{}');
    const names = Object.keys(allPlans);

    if (names.length === 0) {
        listEl.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px;">No saved week plans yet.</div>`;
        return;
    }

    names.forEach(name => {
        const item = allPlans[name];
        const row = document.createElement('div');
        row.className = 'saved-plan-item';
        row.innerHTML = `
            <div>
                <div class="saved-plan-name">${item.name}</div>
                <div class="saved-plan-date">Saved on ${item.date}</div>
            </div>
            <div class="plan-item-actions">
                <button type="button" class="plan-load-btn">Load</button>
                <button type="button" class="plan-del-btn" title="Delete plan">&times;</button>
            </div>
        `;

        row.querySelector('.plan-load-btn').addEventListener('click', () => {
            state.weekData = JSON.parse(JSON.stringify(item.data));
            state.selectedMealId = null;
            state.selectedIndex = null;
            renderDietList();
            renderNutritionPanel();
            closeModal();
            showToast(`Loaded "${item.name}"`);
        });

        row.querySelector('.plan-del-btn').addEventListener('click', () => {
            delete allPlans[name];
            localStorage.setItem('open_nutrition_saved_weeks', JSON.stringify(allPlans));
            renderSavedPlansList();
            showToast(`Deleted "${name}"`);
        });

        listEl.appendChild(row);
    });
}

document.getElementById('load-week-btn')?.addEventListener('click', () => {
    modalBackdrop.classList.remove('hidden');
    loadPlanModal.classList.remove('hidden');
    renderSavedPlansList();
});

// 3. Clear Week (Full Reset)
document.getElementById('clear-week-btn')?.addEventListener('click', () => {
    DAYS.forEach(day => {
        state.weekData[day] = { unassigned: [], meals: [] };
    });
    state.selectedMealId = null;
    state.selectedFoodId = null;
    persistActiveWeek();
    renderDietList();
    renderNutritionPanel();
});

// Click anywhere outside the tracker cards to unselect
document.addEventListener('click', e => {
    const isInsideTracker =
        e.target.closest('.meal-group-card') ||
        e.target.closest('.quick-log-card') ||
        e.target.closest('#food-insight-card') ||
        e.target.closest('.input-card');

    if (!isInsideTracker) {
        if (state.selectedMealId !== null || state.selectedFoodId !== null) {
            state.selectedMealId = null;
            state.selectedFoodId = null;
            hideFoodInsight();
            renderDietList();
            renderNutritionPanel();
        }
    }
});

renderDietList();
updateSlotUI(0);
updateSlotUI(1);
renderNutritionPanel();
updateTutorialHint();
updateCompareTutorialHint();
