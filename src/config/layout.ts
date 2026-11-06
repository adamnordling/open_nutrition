import type { CategoryKey } from '../types/nutrient.types.js';

export const leftColumnLayout: CategoryKey[] = [
    'general',
    'carbohydrates',
    'lipids',
    'proteins_and_aminos',
    'organic_acids',
    'antinutrients',
    'biogenic_amines'
];

export const rightColumnLayout: CategoryKey[] = [
    'vitamins',
    'minerals',
    'cellular_bioactives',
    'antioxidants',
    'myconutrients_and_adaptogens',
    'bioactive_enzymes',
    'nucleic_acids_and_purines'
];

export const CATEGORY_NAMES: Record<CategoryKey, string> = {
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

export const CATEGORY_ICONS: Record<CategoryKey, string> = {
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
