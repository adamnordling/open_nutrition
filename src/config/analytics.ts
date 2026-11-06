// src/config/analytics.ts

export interface NutrientSourceItem {
    food: string;
    amount: string;
}

export interface NutrientDetailInfo {
    description: string;
    sourcesTitleLeft?: string;
    sourcesLeft: NutrientSourceItem[];
    sourcesTitleRight?: string;
    sourcesRight?: NutrientSourceItem[];
}

export const NUTRIENT_ANALYTICS: Record<string, NutrientDetailInfo> = {
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